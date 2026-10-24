import { useDraggable } from "@dnd-kit/core";
import { Trans } from "@lingui/react/macro";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@superset/ui/context-menu";
import { toast } from "@superset/ui/sonner";
import { cn } from "@superset/ui/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { memo, useEffect, useState } from "react";
import {
	LuGitBranch,
	LuMonitor,
	LuNetwork,
	LuTimer,
	LuX,
} from "react-icons/lu";
import {
	getPresetIcon,
	useIsDarkTheme,
} from "renderer/assets/app-icons/preset-icons";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import type { AgentSession } from "renderer/routes/_authenticated/_dashboard/agents/hooks/useAgentSessions";
import { navigateToV2Workspace } from "renderer/routes/_authenticated/_dashboard/utils/workspace-navigation";
import { V2WorkspaceProjectIcon } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/components/V2WorkspaceProjectIcon";
import { getRelativeTime } from "renderer/screens/main/components/WorkspacesListView/utils";

function formatTokens(tokens: number): string {
	return tokens >= 1_000_000
		? `${(tokens / 1_000_000).toFixed(1)}M`
		: `${Math.round(tokens / 1_000)}k`;
}

const EFFORT_LABELS: Record<string, string> = { medium: "med" };

/** `claude-opus-5-5-20260101` → `Opus 5.5`; other ids stay as they are. */
function formatModel(model: string, effort: string | null): string {
	const claude = model.match(
		/^claude-([a-z]+)-(\d+)(?:-(\d{1,2})(?!\d))?(?:-\d{8})?/,
	);
	const name = claude
		? `${claude[1]?.[0]?.toUpperCase()}${claude[1]?.slice(1)} ${claude[2]}${claude[3] ? `.${claude[3]}` : ""}`
		: model;
	return effort ? `${name} ${EFFORT_LABELS[effort] ?? effort}` : name;
}

function formatElapsed(ms: number): string {
	const seconds = Math.max(0, Math.floor(ms / 1000));
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60)
		return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
	return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

function Elapsed({ since }: { since: number }) {
	const [now, setNow] = useState(Date.now);
	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, []);
	return (
		<span className="ml-auto flex items-center gap-1 whitespace-nowrap tabular-nums text-foreground/80">
			<LuTimer className="size-3" />
			{formatElapsed(now - since)}
		</span>
	);
}

function ContextBar({ used, size }: { used: number; size: number }) {
	const ratio = Math.min(1, used / size);
	const fill =
		ratio > 0.8
			? "bg-red-500"
			: ratio > 0.5
				? "bg-amber-500"
				: "bg-emerald-500";
	return (
		<div className="mt-3 border-t border-border/50 pt-2.5">
			<div className="mb-1 flex items-center justify-between text-[10px] tabular-nums text-muted-foreground">
				<span>Contexte</span>
				<span>
					{formatTokens(used)} / {formatTokens(size)} ·{" "}
					{Math.round(ratio * 100)} %
				</span>
			</div>
			<div className="h-1.5 overflow-hidden rounded-full bg-foreground/10 ring-1 ring-inset ring-foreground/10">
				<div
					className={`h-full rounded-full ${fill}`}
					style={{ width: `${Math.max(2, ratio * 100)}%` }}
				/>
			</div>
		</div>
	);
}

interface AgentSessionCardProps {
	session: AgentSession;
	isOverlay?: boolean;
}

export const AgentSessionCard = memo(function AgentSessionCard({
	session,
	isOverlay = false,
}: AgentSessionCardProps) {
	const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
		id: session.terminalId,
		disabled: isOverlay || session.status !== "idle" || !session.canMarkUnread,
	});
	const navigate = useNavigate();
	const isDark = useIsDarkTheme();
	const agentIcon = getPresetIcon(session.agentId, isDark);

	const open = () => {
		localStorage.setItem("lastViewedWorkspaceId", session.workspaceId);
		void navigateToV2Workspace(session.workspaceId, navigate, {
			search: {
				terminalId: session.terminalId,
				focusRequestId: crypto.randomUUID(),
			},
		});
	};

	const queryClient = useQueryClient();
	const close = async () => {
		if (!session.hostUrl) return;
		try {
			await getHostServiceClientByUrl(
				session.hostUrl,
			).terminal.killSession.mutate({
				terminalId: session.terminalId,
				workspaceId: session.workspaceId,
			});
			await queryClient.invalidateQueries({
				queryKey: ["v2-workspaces", "terminal-agents"],
			});
		} catch (error) {
			toast.error("Impossible de fermer l’agent", {
				description: error instanceof Error ? error.message : undefined,
			});
		}
	};

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<button
					ref={setNodeRef}
					{...attributes}
					{...listeners}
					type="button"
					onClick={open}
					className={cn(
						"w-full cursor-pointer rounded-lg border border-border/60 bg-card p-3 text-left shadow-sm transition-all hover:-translate-y-px hover:border-foreground/20 hover:shadow-md",
						isDragging && "opacity-40",
						isOverlay && "cursor-grabbing shadow-lg",
					)}
				>
					<div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
						<V2WorkspaceProjectIcon
							projectName={session.projectName ?? "Session"}
							iconUrl={session.projectIconUrl}
							size="sm"
							className="size-4 rounded-sm text-[9px]"
						/>
						<span className="min-w-0 truncate">
							{session.projectName ?? <Trans>Session</Trans>}
						</span>
						{session.isRemoteHost ? (
							<span className="flex min-w-0 shrink items-center gap-1">
								<LuMonitor className="size-3 shrink-0" />
								<span className="truncate">{session.hostName}</span>
							</span>
						) : null}
						{session.status === "working" && session.turnStartedAt ? (
							<Elapsed since={session.turnStartedAt} />
						) : (
							<span className="ml-auto whitespace-nowrap tabular-nums">
								{getRelativeTime(session.lastEventAt, { format: "compact" })}
							</span>
						)}
					</div>

					<p className="line-clamp-2 min-w-0 text-sm font-medium leading-5 text-foreground">
						{session.title}
					</p>

					<div className="mt-1 flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
						<LuGitBranch className="size-3 shrink-0" />
						<span className="truncate">{session.branch}</span>
					</div>

					<div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
						{agentIcon ? (
							<img src={agentIcon} alt="" className="size-3.5 shrink-0" />
						) : null}
						<span className="truncate">
							{session.agentLabel}
							{session.model
								? ` · ${formatModel(session.model, session.effort)}`
								: null}
						</span>
						{session.subagentCount > 0 ? (
							<span className="flex shrink-0 items-center gap-1 rounded-full bg-foreground/10 px-1.5 py-px tabular-nums text-foreground/80">
								<LuNetwork className="size-3" />
								{session.subagentCount} sous-agent
								{session.subagentCount > 1 ? "s" : null}
							</span>
						) : null}
						{session.messageCount !== null ? (
							<span className="ml-auto whitespace-nowrap tabular-nums">
								{session.messageCount} messages
								{session.costUsd ? ` · ${session.costUsd.toFixed(2)} $` : null}
							</span>
						) : null}
					</div>

					{session.contextUsed !== null && session.contextSize ? (
						<ContextBar used={session.contextUsed} size={session.contextSize} />
					) : null}
				</button>
			</ContextMenuTrigger>
			<ContextMenuContent onCloseAutoFocus={(event) => event.preventDefault()}>
				<ContextMenuItem
					onSelect={() => void close()}
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
