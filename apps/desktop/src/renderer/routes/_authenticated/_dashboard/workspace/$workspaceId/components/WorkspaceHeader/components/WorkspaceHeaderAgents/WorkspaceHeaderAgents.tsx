import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import {
	getPresetIcon,
	useIsDarkTheme,
} from "renderer/assets/app-icons/preset-icons";
import { useAgentSessions } from "renderer/routes/_authenticated/_dashboard/agents/hooks/useAgentSessions";
import { openAgentSession } from "renderer/routes/_authenticated/_dashboard/agents/utils/openAgentSession";
import { StatusGlyph } from "renderer/routes/_authenticated/_dashboard/components/StatusGlyph";

const MAX_VISIBLE = 3;

export function WorkspaceHeaderAgents({
	workspaceId,
}: {
	workspaceId: string;
}) {
	const { sessions } = useAgentSessions();
	const navigate = useNavigate();
	const isDark = useIsDarkTheme();
	const workspaceSessions = useMemo(
		() => sessions.filter((session) => session.workspaceId === workspaceId),
		[sessions, workspaceId],
	);

	if (workspaceSessions.length === 0) return null;
	const hidden = workspaceSessions.length - MAX_VISIBLE;

	return (
		<div className="no-drag flex min-w-0 shrink items-center gap-1">
			{workspaceSessions.slice(0, MAX_VISIBLE).map((session) => {
				const icon = getPresetIcon(session.agentId, isDark);
				return (
					<button
						key={session.terminalId}
						type="button"
						onClick={() => openAgentSession(session, navigate)}
						title={`${session.agentLabel} : ${session.title}`}
						className="flex h-6 min-w-0 max-w-44 items-center gap-1.5 rounded-md border border-border/60 bg-background/60 px-1.5 text-[11px] text-foreground/80 transition-colors hover:bg-fill-hover hover:text-foreground"
					>
						{icon ? (
							<img src={icon} alt="" className="size-3 shrink-0" />
						) : null}
						<span className="truncate">{session.title}</span>
						<StatusGlyph status={session.status} />
					</button>
				);
			})}
			{hidden > 0 ? (
				<span className="shrink-0 px-1 text-[11px] text-muted-foreground">
					+{hidden}
				</span>
			) : null}
		</div>
	);
}
