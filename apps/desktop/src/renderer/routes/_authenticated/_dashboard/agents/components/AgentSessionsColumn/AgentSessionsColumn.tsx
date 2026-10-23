import { LuCircleX } from "react-icons/lu";
import type { AgentSession } from "renderer/routes/_authenticated/_dashboard/agents/hooks/useAgentSessions";
import { BoardColumnIcon } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/components/BoardColumnIcon";
import type { PaneStatus } from "shared/tabs-types";
import { AgentSessionCard } from "./components/AgentSessionCard";

interface AgentSessionsColumnProps {
	status: PaneStatus;
	label: string;
	sessions: AgentSession[];
}

function ColumnIcon({ status }: { status: PaneStatus }) {
	switch (status) {
		case "permission":
			return <BoardColumnIcon column="attention" />;
		case "failed":
			return <LuCircleX className="size-3.5 text-red-500" />;
		case "working":
		case "review":
			return <BoardColumnIcon column={status} />;
		default:
			return <BoardColumnIcon column="idle" />;
	}
}

export function AgentSessionsColumn({
	status,
	label,
	sessions,
}: AgentSessionsColumnProps) {
	return (
		<div className="flex min-h-0 min-w-0 flex-col rounded-xl border border-border/40 bg-muted/20">
			<div className="flex items-center gap-2 px-3.5 pt-3 pb-2.5">
				<ColumnIcon status={status} />
				<span className="truncate text-[13px] font-medium">{label}</span>
				<span className="ml-auto rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
					{sessions.length}
				</span>
			</div>

			<div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-2.5 pb-2.5">
				{sessions.length === 0 ? (
					<div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border/50 text-xs text-muted-foreground/70">
						Aucune session
					</div>
				) : (
					sessions.map((session) => (
						<AgentSessionCard key={session.terminalId} session={session} />
					))
				)}
			</div>
		</div>
	);
}
