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
import { Popover, PopoverContent, PopoverTrigger } from "@superset/ui/popover";
import { toast } from "@superset/ui/sonner";
import { cn } from "@superset/ui/utils";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
	LuBot,
	LuCheck,
	LuChevronsUpDown,
	LuFolderGit2,
	LuFolderX,
	LuGitBranch,
	LuLoaderCircle,
	LuPlay,
} from "react-icons/lu";
import {
	getPresetIcon,
	useIsDarkTheme,
} from "renderer/assets/app-icons/preset-icons";
import { resolveProjectIconUrl } from "renderer/hooks/host-projects/resolveProjectIconUrl";
import { useHostProjects } from "renderer/hooks/host-projects/useHostProjects";
import { useV2AgentChoices } from "renderer/hooks/useV2AgentChoices";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { projectStripeColor } from "renderer/routes/_authenticated/_dashboard/agents/utils/sessionVisuals";
import { navigateToV2Workspace } from "renderer/routes/_authenticated/_dashboard/utils/workspace-navigation";
import { ProjectThumbnail } from "renderer/routes/_authenticated/components/ProjectThumbnail";
import { useHostWorkspaces } from "renderer/routes/_authenticated/providers/HostWorkspacesProvider";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";
import { useWorkspaceCreates } from "renderer/stores/workspace-creates";

const NO_PROJECT = "__none__";
const QUICK_PROJECT_NAMES = ["master flech", "backoffice"];
const SECTION_LABEL_CLASS =
	"px-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground";
const CHECKOUT_OPTIONS = [
	{ worktree: false, label: "Dépôt principal", icon: LuFolderGit2 },
	{ worktree: true, label: "Nouveau worktree", icon: LuGitBranch },
] as const;

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
	const isDark = useIsDarkTheme();

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
		<div className="flex flex-col">
			<header className="flex items-center gap-2 border-b border-border/60 px-3.5 py-2.5">
				<div className="flex size-6 items-center justify-center rounded-md bg-foreground/[0.06]">
					<LuBot className="size-3.5 text-foreground/80" strokeWidth={1.75} />
				</div>
				<p className="text-[13px] font-medium">Nouvel agent</p>
			</header>

			<div className="flex flex-col gap-4 px-3.5 py-3.5">
				<section className="flex flex-col gap-1.5">
					<p className={SECTION_LABEL_CLASS}>Projet</p>
					<Popover open={projectPickerOpen} onOpenChange={setProjectPickerOpen}>
						<PopoverTrigger asChild>
							<button
								type="button"
								className={cn(
									"relative flex h-9 w-full items-center gap-2 rounded-lg bg-foreground/[0.04] pr-2.5 pl-3.5 text-left ring-1 ring-border/60 ring-inset transition-colors hover:bg-fill-hover",
									projectPickerOpen && "bg-fill-hover ring-border",
								)}
							>
								{selectedProject ? (
									<>
										<span
											aria-hidden
											className="absolute top-2 bottom-2 left-1 w-[3px] rounded-full"
											style={{
												backgroundColor: projectStripeColor(selectedProject.id),
											}}
										/>
										<ProjectThumbnail
											projectName={selectedProject.name}
											iconUrl={selectedProject.iconUrl}
											color={selectedProject.color}
											className="size-4 rounded-[4px] text-[9px]"
										/>
										<span className="min-w-0 flex-1 truncate text-[13px]">
											{selectedProject.name}
										</span>
									</>
								) : (
									<>
										<LuFolderX className="size-4 shrink-0 text-muted-foreground" />
										<span className="flex-1 text-[13px] text-muted-foreground">
											Aucun projet
										</span>
									</>
								)}
								<LuChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
							</button>
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
													className="size-4 rounded-[4px] text-[9px]"
												/>
												<span className="flex-1 truncate">{project.name}</span>
												{project.id === selectedProjectId && (
													<LuCheck className="size-3.5 shrink-0" />
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
											<LuFolderX className="size-4 text-muted-foreground" />
											<span className="flex-1">Aucun projet</span>
											{!inProject && <LuCheck className="size-3.5 shrink-0" />}
										</CommandItem>
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
					{quickProjects.length > 0 && (
						<div className="flex flex-wrap gap-1.5 pt-0.5">
							{quickProjects.map((project) => (
								<button
									key={project.id}
									type="button"
									title={`Lancer directement dans ${project.name}`}
									disabled={launch.isPending || !selectedAgentId}
									onClick={() => {
										setProjectId(project.id);
										launch.mutate(project.id);
									}}
									className="group flex h-6 items-center gap-1.5 rounded-md bg-foreground/[0.05] pr-2 pl-1.5 text-[11px] text-foreground/80 transition-colors hover:bg-fill-hover hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
								>
									<ProjectThumbnail
										projectName={project.name}
										iconUrl={project.iconUrl}
										color={project.color}
										className="size-3.5 rounded-[3px] text-[8px]"
									/>
									{project.name}
									<LuPlay className="size-2.5 fill-current text-muted-foreground transition-colors group-hover:text-foreground" />
								</button>
							))}
						</div>
					)}
				</section>

				<section className="flex flex-col gap-1.5">
					<p className={SECTION_LABEL_CLASS}>Emplacement</p>
					<div
						className={cn(
							"grid grid-cols-2 gap-1 rounded-lg bg-foreground/[0.04] p-1 ring-1 ring-border/60 ring-inset",
							!inProject && "opacity-50",
						)}
					>
						{CHECKOUT_OPTIONS.map((option) => {
							const isSelected = (worktree && inProject) === option.worktree;
							return (
								<button
									key={option.label}
									type="button"
									aria-pressed={isSelected}
									disabled={!inProject}
									onClick={() => setWorktree(option.worktree)}
									className={cn(
										"flex h-7 items-center justify-center gap-1.5 rounded-md text-[12px] transition-colors disabled:pointer-events-none",
										isSelected
											? "bg-background font-medium text-foreground shadow-sm ring-1 ring-border"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									<option.icon className="size-3.5" />
									{option.label}
								</button>
							);
						})}
					</div>
					<p className="px-0.5 text-[11px] text-muted-foreground">
						{!inProject
							? "Session libre, hors de tout dépôt"
							: worktree
								? "Branche isolée, créée pour cet agent"
								: "Directement dans le dépôt principal"}
					</p>
				</section>

				<section className="flex flex-col gap-1.5">
					<div className="flex items-center justify-between">
						<p className={SECTION_LABEL_CLASS}>Agent</p>
						<button
							type="button"
							onClick={() => {
								onDone();
								void navigate({ to: "/settings/agents" });
							}}
							className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
						>
							Configurer
						</button>
					</div>
					{agents.length === 0 ? (
						<p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-[11px] text-muted-foreground">
							Aucun agent configuré sur cette machine.
						</p>
					) : (
						<div className="flex flex-wrap gap-1.5">
							{agents.map((agent) => {
								const icon = getPresetIcon(agent.iconId ?? agent.id, isDark);
								const isSelected = agent.id === selectedAgentId;
								return (
									<button
										key={agent.id}
										type="button"
										aria-pressed={isSelected}
										onClick={() => setAgentId(agent.id)}
										className={cn(
											"flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] ring-inset transition-colors",
											isSelected
												? "bg-background font-medium text-foreground shadow-sm ring-1 ring-border"
												: "bg-foreground/[0.04] text-foreground/75 hover:bg-fill-hover hover:text-foreground",
										)}
									>
										{icon ? (
											<img
												src={icon}
												alt=""
												className="size-3.5 object-contain"
											/>
										) : null}
										{agent.label}
									</button>
								);
							})}
						</div>
					)}
				</section>
			</div>

			<footer className="flex items-center justify-end gap-1.5 border-t border-border/60 bg-foreground/[0.02] px-3.5 py-2.5">
				<Button
					size="sm"
					variant="ghost"
					className="h-7 text-[12px]"
					onClick={onDone}
				>
					Annuler
				</Button>
				<Button
					size="sm"
					className="h-7 gap-1.5 px-3 text-[12px]"
					onClick={() => launch.mutate(selectedProjectId)}
					disabled={launch.isPending || !selectedAgentId}
				>
					{launch.isPending ? (
						<LuLoaderCircle className="size-3.5 animate-spin" />
					) : (
						<LuPlay className="size-3 fill-current" />
					)}
					{launch.isPending ? "Lancement…" : "Lancer"}
				</Button>
			</footer>
		</div>
	);
}
