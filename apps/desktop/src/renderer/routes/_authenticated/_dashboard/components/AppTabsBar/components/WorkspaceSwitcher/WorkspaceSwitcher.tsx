import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import { cn } from "@superset/ui/utils";
import { useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { LuCheck, LuChevronDown, LuGitBranch, LuList } from "react-icons/lu";
import { useHostProjects } from "renderer/hooks/host-projects/useHostProjects";
import { navigateToV2Workspace } from "renderer/routes/_authenticated/_dashboard/utils/workspace-navigation";
import { useHostWorkspaces } from "renderer/routes/_authenticated/providers/HostWorkspacesProvider";

export function WorkspaceSwitcher() {
	const navigate = useNavigate();
	const matchRoute = useMatchRoute();
	const match = matchRoute({ to: "/v2-workspace/$workspaceId", fuzzy: true });
	const currentId = match !== false ? match.workspaceId : null;
	const { workspaces } = useHostWorkspaces();
	const { projects } = useHostProjects();

	const current = workspaces.find((workspace) => workspace.id === currentId);
	const projectName =
		projects.find((project) => project.id === current?.projectId)?.name ?? null;
	const siblings = useMemo(
		() =>
			workspaces
				.filter(
					(workspace) =>
						workspace.projectId === current?.projectId &&
						workspace.archivedAt == null,
				)
				.sort((a, b) => (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0)),
		[workspaces, current?.projectId],
	);

	if (!current) return null;
	const workspaceName = current.name || current.branch;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="no-drag ml-2 flex h-7 min-w-0 items-center gap-1.5 rounded-md border-l pl-3 pr-2 text-[13px] transition-colors hover:bg-fill-hover"
				>
					{projectName && (
						<>
							<span className="truncate text-muted-foreground">
								{projectName}
							</span>
							<span className="text-muted-foreground/50">/</span>
						</>
					)}
					<span className="truncate font-medium text-foreground">
						{workspaceName}
					</span>
					{current.branch !== workspaceName && (
						<span className="flex min-w-0 items-center gap-1 text-muted-foreground">
							<LuGitBranch className="size-3.5 shrink-0" strokeWidth={1.5} />
							<span className="truncate">{current.branch}</span>
						</span>
					)}
					<LuChevronDown
						className="size-3.5 shrink-0 text-muted-foreground"
						strokeWidth={1.5}
					/>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				className="max-h-96 w-80 overflow-y-auto"
				onCloseAutoFocus={(event) => event.preventDefault()}
			>
				{projectName && <DropdownMenuLabel>{projectName}</DropdownMenuLabel>}
				{siblings.map((workspace) => {
					const isCurrent = workspace.id === current.id;
					return (
						<DropdownMenuItem
							key={workspace.id}
							onSelect={() => {
								if (!isCurrent)
									void navigateToV2Workspace(workspace.id, navigate);
							}}
							className="flex items-center gap-2"
						>
							<LuCheck
								className={cn("size-4 shrink-0", !isCurrent && "invisible")}
							/>
							<span className="flex min-w-0 flex-col">
								<span className="truncate">
									{workspace.name || workspace.branch}
								</span>
								<span className="truncate text-xs text-muted-foreground">
									{workspace.branch}
								</span>
							</span>
						</DropdownMenuItem>
					);
				})}
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onSelect={() =>
						navigate({ to: "/v2-workspaces", search: { view: "list" } })
					}
				>
					<LuList className="size-4" />
					Tous les workspaces
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
