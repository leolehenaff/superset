import { Button } from "@superset/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@superset/ui/command";
import { Label } from "@superset/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@superset/ui/popover";
import { toast } from "@superset/ui/sonner";
import { Switch } from "@superset/ui/switch";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDownIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { HiCheck } from "react-icons/hi2";
import { AgentSelect } from "renderer/components/AgentSelect";
import { resolveProjectIconUrl } from "renderer/hooks/host-projects/resolveProjectIconUrl";
import { useHostProjects } from "renderer/hooks/host-projects/useHostProjects";
import { useV2AgentChoices } from "renderer/hooks/useV2AgentChoices";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { navigateToV2Workspace } from "renderer/routes/_authenticated/_dashboard/utils/workspace-navigation";
import { ProjectThumbnail } from "renderer/routes/_authenticated/components/ProjectThumbnail";
import { useHostWorkspaces } from "renderer/routes/_authenticated/providers/HostWorkspacesProvider";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";
import { useWorkspaceCreates } from "renderer/stores/workspace-creates";

const NO_PROJECT = "__none__";
const QUICK_PROJECT_NAMES = ["master flech", "backoffice"];

interface NewAgentFormProps {
	onDone: () => void;
}

/** Starts a bare agent terminal: in a project (worktree or main checkout) or in a project-less session. */
export function NewAgentForm({ onDone }: NewAgentFormProps) {
	const navigate = useNavigate();
	const { machineId, activeHostUrl } = useLocalHostService();
	const { projects } = useHostProjects();
	const { workspaces } = useHostWorkspaces();
	const { agents } = useV2AgentChoices(activeHostUrl);
	const { submit } = useWorkspaceCreates();

	const [projectId, setProjectId] = useState<string | null>(null);
	const [worktree, setWorktree] = useState(false);
	const [agentId, setAgentId] = useState<string | null>(null);
	const [projectPickerOpen, setProjectPickerOpen] = useState(false);

	// Projects on this machine, most recent agent activity first.
	const localProjects = useMemo(() => {
		const lastActivity = new Map<string, number>();
		for (const workspace of workspaces) {
			if (!workspace.projectId) continue;
			lastActivity.set(
				workspace.projectId,
				Math.max(
					lastActivity.get(workspace.projectId) ?? 0,
					workspace.lastActivityAt ?? 0,
				),
			);
		}
		return projects
			.filter((project) => machineId && project.hostIds.includes(machineId))
			.map((project) => ({
				...project,
				// Same fallback as the sidebar: the GitHub owner's avatar.
				iconUrl: resolveProjectIconUrl(project),
			}))
			.sort(
				(a, b) =>
					(lastActivity.get(b.id) || b.updatedAt) -
					(lastActivity.get(a.id) || a.updatedAt),
			);
	}, [projects, workspaces, machineId]);

	const selectedProjectId =
		projectId === null ? (localProjects[0]?.id ?? NO_PROJECT) : projectId;
	const selectedAgentId =
		agentId ??
		agents.find((agent) => agent.presetId === "claude")?.id ??
		agents[0]?.id ??
		null;

	const launch = useMutation({
		mutationFn: async (selectedProjectId: string) => {
			if (!machineId || !activeHostUrl || !selectedAgentId) {
				throw new Error("Aucun agent configuré sur cette machine");
			}
			const inProject = selectedProjectId !== NO_PROJECT;
			// The main checkout: reuse its workspace instead of piling up "local 2".
			const existingLocal =
				inProject && !worktree
					? workspaces.find(
							(workspace) =>
								workspace.type === "local" &&
								workspace.projectId === selectedProjectId &&
								workspace.hostId === machineId &&
								workspace.archivedAt == null,
						)
					: undefined;
			let workspaceId = existingLocal?.id;
			if (!workspaceId) {
				const id = crypto.randomUUID();
				const { completed } = submit({
					hostId: machineId,
					snapshot: !inProject
						? { id, projectId: null }
						: worktree
							? { id, projectId: selectedProjectId }
							: { id, projectId: selectedProjectId, checkout: "local" },
				});
				const outcome = await completed;
				if (!outcome.ok) throw new Error(outcome.error);
				workspaceId = outcome.workspaceId;
			}
			const run = await getHostServiceClientByUrl(
				activeHostUrl,
			).agents.run.mutate({
				workspaceId,
				agent: selectedAgentId,
				prompt: "",
			});
			return { workspaceId, terminalId: run.sessionId };
		},
		onSuccess: ({ workspaceId, terminalId }) => {
			onDone();
			localStorage.setItem("lastViewedWorkspaceId", workspaceId);
			void navigateToV2Workspace(workspaceId, navigate, {
				search: { terminalId, focusRequestId: crypto.randomUUID() },
			});
		},
		onError: (error) => {
			toast.error("Impossible de lancer l’agent", {
				description: error instanceof Error ? error.message : String(error),
			});
		},
	});

	const inProject = selectedProjectId !== NO_PROJECT;
	const selectedProject = localProjects.find(
		(project) => project.id === selectedProjectId,
	);
	const quickProjects = QUICK_PROJECT_NAMES.flatMap((name) =>
		localProjects.filter((project) => project.name.toLowerCase() === name),
	);
	const pickProject = (id: string) => {
		setProjectId(id);
		setProjectPickerOpen(false);
	};

	return (
		<>
			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-2">
					<Label>Projet</Label>
					<Popover open={projectPickerOpen} onOpenChange={setProjectPickerOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								className="w-full justify-between font-normal"
							>
								<span className="flex min-w-0 items-center gap-2">
									{selectedProject ? (
										<>
											<ProjectThumbnail
												projectName={selectedProject.name}
												iconUrl={selectedProject.iconUrl}
												color={selectedProject.color}
												className="size-4"
											/>
											<span className="truncate">{selectedProject.name}</span>
										</>
									) : (
										"Aucun projet"
									)}
								</span>
								<ChevronDownIcon className="size-4 shrink-0 opacity-50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent
							align="start"
							className="w-(--radix-popover-trigger-width) p-0"
						>
							<Command>
								<CommandInput placeholder="Rechercher un projet…" />
								<CommandList>
									<CommandEmpty>Aucun projet trouvé.</CommandEmpty>
									<CommandGroup>
										{localProjects.map((project) => (
											<CommandItem
												key={project.id}
												value={project.id}
												keywords={[project.name]}
												onSelect={() => pickProject(project.id)}
											>
												<ProjectThumbnail
													projectName={project.name}
													iconUrl={project.iconUrl}
													color={project.color}
													className="size-4"
												/>
												<span className="flex-1 truncate">{project.name}</span>
												{project.id === selectedProjectId && (
													<HiCheck className="size-3.5 shrink-0" />
												)}
											</CommandItem>
										))}
									</CommandGroup>
									<CommandSeparator />
									<CommandGroup>
										<CommandItem
											value={NO_PROJECT}
											keywords={["aucun projet", "session"]}
											onSelect={() => pickProject(NO_PROJECT)}
										>
											<span className="flex-1">Aucun projet</span>
											{!inProject && <HiCheck className="size-3.5 shrink-0" />}
										</CommandItem>
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
					{quickProjects.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{quickProjects.map((project) => (
								<Button
									key={project.id}
									type="button"
									size="sm"
									variant={
										project.id === selectedProjectId ? "secondary" : "outline"
									}
									className="h-7 gap-1.5 px-2 font-normal"
									disabled={launch.isPending || !selectedAgentId}
									onClick={() => {
										setProjectId(project.id);
										launch.mutate(project.id);
									}}
								>
									<ProjectThumbnail
										projectName={project.name}
										iconUrl={project.iconUrl}
										color={project.color}
										className="size-3.5"
									/>
									{project.name}
								</Button>
							))}
						</div>
					)}
				</div>

				<div className="flex items-center justify-between gap-4">
					<Label htmlFor="new-agent-worktree">
						Nouveau worktree
						<span className="block text-xs font-normal text-muted-foreground">
							{worktree && inProject
								? "Branche isolée, créée pour cet agent"
								: "Directement dans le dépôt principal"}
						</span>
					</Label>
					<Switch
						id="new-agent-worktree"
						checked={worktree && inProject}
						disabled={!inProject}
						onCheckedChange={setWorktree}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label>Agent</Label>
					<AgentSelect
						agents={agents}
						value={selectedAgentId ?? undefined}
						placeholder="Choisir un agent"
						onValueChange={setAgentId}
						triggerClassName="w-full"
					/>
				</div>
			</div>

			<div className="flex justify-end gap-2">
				<Button variant="ghost" onClick={onDone}>
					Annuler
				</Button>
				<Button
					onClick={() => launch.mutate(selectedProjectId)}
					disabled={launch.isPending || !selectedAgentId}
				>
					{launch.isPending ? "Lancement…" : "Lancer"}
				</Button>
			</div>
		</>
	);
}
