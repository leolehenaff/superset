import { useDraggable } from "@dnd-kit/core";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@superset/ui/context-menu";
import { cn } from "@superset/ui/utils";
import { useNavigate } from "@tanstack/react-router";
import { memo } from "react";
import { LuEye, LuGitBranch, LuX } from "react-icons/lu";
import {
	getPresetIcon,
	useIsDarkTheme,
} from "renderer/assets/app-icons/preset-icons";
import type { AgentSession } from "renderer/routes/_authenticated/_dashboard/agents/hooks/useAgentSessions";
import { useCloseAgentSession } from "renderer/routes/_authenticated/_dashboard/agents/hooks/useCloseAgentSession";
import { openAgentSession } from "renderer/routes/_authenticated/_dashboard/agents/utils/openAgentSession";
import {
	contextFillClass,
	formatModelFamily,
	projectStripeColor,
} from "renderer/routes/_authenticated/_dashboard/agents/utils/sessionVisuals";
import { V2WorkspaceProjectIcon } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/components/V2WorkspaceProjectIcon";
import { getRelativeTime } from "renderer/screens/main/components/WorkspacesListView/utils";
import { useV2NotificationStore } from "renderer/stores/v2-notifications";
import { StatusGlyph } from "./components/StatusGlyph";

interface AgentsSidebarRowProps {
	session: AgentSession;
	isActive: boolean;
	isOverlay?: boolean;
}

export const AgentsSidebarRow = memo(function AgentsSidebarRow({
	session,
	isActive,
	isOverlay = false,
}: AgentsSidebarRowProps) {
	const canMarkForReview = session.status === "idle" && session.canMarkUnread;
	const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
		id: session.terminalId,
		disabled: isOverlay || !canMarkForReview,
	});
	const pruneTerminalSeen = useV2NotificationStore(
		(state) => state.pruneTerminalSeen,
	);
	const navigate = useNavigate();
	const closeSession = useCloseAgentSession();
	const agentIcon = getPresetIcon(session.agentId, useIsDarkTheme());
	const since =
		session.status === "working" && session.turnStartedAt
			? session.turnStartedAt
			: session.lastEventAt;
	const contextRatio =
		session.contextUsed !== null && session.contextSize
			? Math.min(1, session.contextUsed / session.contextSize)
			: null;

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<button
					ref={setNodeRef}
					{...attributes}
					{...listeners}
					type="button"
					onClick={() => openAgentSession(session, navigate)}
					aria-current={isActive ? "page" : undefined}
					className={cn(
						"group relative flex w-full flex-col gap-1 rounded-lg py-2 pr-2.5 pl-3.5 text-left ring-inset transition-colors",
						isActive
							? "bg-background shadow-sm ring-1 ring-border"
							: "hover:bg-fill-hover",
						isDragging && "opacity-40",
						isOverlay &&
							"cursor-grabbing bg-background shadow-lg ring-1 ring-border",
					)}
				>
					{session.projectId ? (
						<span
							aria-hidden
							className={cn(
								"absolute top-2 bottom-2 left-1 w-[3px] rounded-full transition-opacity",
								isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100",
							)}
							style={{ backgroundColor: projectStripeColor(session.projectId) }}
						/>
					) : null}
					<div className="flex min-w-0 items-center gap-2">
						<V2WorkspaceProjectIcon
							projectName={session.projectName ?? "Session"}
							iconUrl={session.projectIconUrl}
							size="sm"
							className="size-4 shrink-0 rounded-[4px] text-[9px]"
						/>
						<span
							className={cn(
								"min-w-0 flex-1 truncate text-[13px] leading-5",
								isActive ? "font-medium text-foreground" : "text-foreground/90",
							)}
						>
							{session.title}
						</span>
						<StatusGlyph status={session.status} />
						<span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
							{getRelativeTime(since, { format: "compact" })}
						</span>
					</div>
					<div className="flex min-w-0 items-center gap-1 pl-6 text-[11px] text-muted-foreground">
						<span className="max-w-[45%] shrink-0 truncate">
							{session.projectName}
						</span>
						<span className="text-muted-foreground/40">/</span>
						<LuGitBranch className="size-3 shrink-0 opacity-70" />
						<span className="truncate">{session.branch}</span>
					</div>
					{session.model || contextRatio !== null || session.costUsd ? (
						<div className="flex min-w-0 items-center gap-2 pl-6 text-[10px] tabular-nums text-muted-foreground">
							{session.model ? (
								<span
									title={session.model}
									className="flex max-w-[35%] shrink-0 items-center gap-1 text-foreground/70"
								>
									{agentIcon ? (
										<img src={agentIcon} alt="" className="size-3 shrink-0" />
									) : null}
									<span className="truncate">
										{formatModelFamily(session.model)}
									</span>
								</span>
							) : null}
							{contextRatio !== null ? (
								<>
									<div className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/[0.08]">
										<div
											className={cn(
												"h-full rounded-full",
												contextFillClass(contextRatio),
											)}
											style={{ width: `${Math.max(2, contextRatio * 100)}%` }}
										/>
									</div>
									<span className="w-8 text-right">
										{Math.round(contextRatio * 100)} %
									</span>
								</>
							) : null}
							{session.costUsd ? (
								<span className="ml-auto rounded bg-foreground/[0.06] px-1 py-px text-foreground/70">
									{session.costUsd.toFixed(2)} $
								</span>
							) : null}
						</div>
					) : null}
				</button>
			</ContextMenuTrigger>
			<ContextMenuContent onCloseAutoFocus={(event) => event.preventDefault()}>
				<ContextMenuItem
					onSelect={() => pruneTerminalSeen(session.terminalId)}
					disabled={!canMarkForReview}
				>
					<LuEye className="size-4" />
					Marquer à relire
				</ContextMenuItem>
				<ContextMenuItem
					onSelect={() => void closeSession(session)}
					disabled={!session.hostUrl}
					className="text-destructive focus:text-destructive"
				>
					<LuX className="size-4 text-destructive" />
					Fermer l’agent
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
});
