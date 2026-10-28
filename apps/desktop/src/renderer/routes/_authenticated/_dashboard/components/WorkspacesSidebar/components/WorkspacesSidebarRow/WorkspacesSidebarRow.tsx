import { cn } from "@superset/ui/utils";
import { memo } from "react";
import { LuGitBranch, LuSquareTerminal } from "react-icons/lu";
import { projectStripeColor } from "renderer/routes/_authenticated/_dashboard/agents/utils/sessionVisuals";
import { V2WorkspaceContextMenu } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/components/V2WorkspaceContextMenu";
import { V2WorkspaceProjectIcon } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/components/V2WorkspaceProjectIcon";
import { WorkspaceResourceMeters } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/components/WorkspaceResourceMeters";
import type { AccessibleV2Workspace } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/hooks/useAccessibleV2Workspaces";
import { workspaceActivityAt } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/utils/sortWorkspaces";
import { getRelativeTime } from "renderer/screens/main/components/WorkspacesListView/utils";

interface WorkspacesSidebarRowProps {
	workspace: AccessibleV2Workspace;
	isActive: boolean;
}

export const WorkspacesSidebarRow = memo(function WorkspacesSidebarRow({
	workspace,
	isActive,
}: WorkspacesSidebarRowProps) {
	const isArchived = workspace.archivedAt != null;
	const diff = workspace.diffStats;
	const hasDiff = !!diff && (diff.additions > 0 || diff.deletions > 0);

	return (
		<V2WorkspaceContextMenu workspace={workspace} isCurrentRoute={isActive}>
			{(actions) => (
				<button
					type="button"
					onClick={actions.open}
					disabled={isArchived}
					aria-current={isActive ? "page" : undefined}
					className={cn(
						"group relative flex w-full flex-col gap-1 rounded-lg py-2 pr-2.5 pl-3.5 text-left ring-inset transition-colors disabled:opacity-60",
						isActive
							? "bg-background shadow-sm ring-1 ring-border"
							: "hover:bg-fill-hover",
					)}
				>
					{workspace.projectId ? (
						<span
							aria-hidden
							className={cn(
								"absolute top-2 bottom-2 left-1 w-[3px] rounded-full transition-opacity",
								isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100",
							)}
							style={{
								backgroundColor: projectStripeColor(workspace.projectId),
							}}
						/>
					) : null}
					<div className="flex min-w-0 items-center gap-2">
						<V2WorkspaceProjectIcon
							projectName={workspace.projectName ?? workspace.name}
							iconUrl={workspace.projectIconUrl}
							size="sm"
							className="size-4 shrink-0 rounded-[4px] text-[9px]"
						/>
						<span
							className={cn(
								"min-w-0 flex-1 truncate text-[13px] leading-5",
								isActive ? "font-medium text-foreground" : "text-foreground/90",
							)}
						>
							{workspace.name}
						</span>
						<span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
							{getRelativeTime(workspaceActivityAt(workspace), {
								format: "compact",
							})}
						</span>
					</div>
					<div className="flex min-w-0 items-center gap-1 pl-6 text-[11px] text-muted-foreground">
						{workspace.projectName ? (
							<>
								<span className="max-w-[45%] shrink-0 truncate">
									{workspace.projectName}
								</span>
								<span className="text-muted-foreground/40">/</span>
							</>
						) : null}
						<LuGitBranch className="size-3 shrink-0 opacity-70" />
						<span className="min-w-0 flex-1 truncate">{workspace.branch}</span>
						{hasDiff ? (
							<span className="shrink-0 font-mono text-[10px] tabular-nums">
								<span className="text-emerald-600/80 dark:text-emerald-400/70">
									+{diff.additions}
								</span>{" "}
								<span className="text-red-600/80 dark:text-red-400/70">
									−{diff.deletions}
								</span>
							</span>
						) : null}
						{workspace.terminalTitles.length > 0 ? (
							<span className="flex shrink-0 items-center gap-0.5 tabular-nums">
								<LuSquareTerminal className="size-3" />
								{workspace.terminalTitles.length}
							</span>
						) : null}
					</div>
					{workspace.resources ? (
						<div className="pl-6">
							<WorkspaceResourceMeters
								resources={workspace.resources}
								compact
							/>
						</div>
					) : null}
				</button>
			)}
		</V2WorkspaceContextMenu>
	);
});
