import type { AgentSession } from "renderer/routes/_authenticated/_dashboard/agents/hooks/useAgentSessions";
import type { PaneStatus } from "shared/tabs-types";

export type AgentColumn = Exclude<PaneStatus, "failed">;

// Plain strings, not Lingui: new catalog entries would mean regenerating
// upstream catalogs on every rebase.
export const AGENT_COLUMN_LABELS: Record<AgentColumn, string> = {
	working: "En cours",
	permission: "Attend ta réponse",
	review: "À relire",
	idle: "Inactif",
};

export const AGENT_COLUMN_ORDER: AgentColumn[] = [
	"working",
	"permission",
	"review",
	"idle",
];

/** No failure column: a failed run is something to read, like a finished one. */
function columnOf(status: PaneStatus): AgentColumn {
	return status === "failed" ? "review" : status;
}

export function groupSessionsByColumn(
	sessions: AgentSession[],
): Map<AgentColumn, AgentSession[]> {
	const map = new Map<AgentColumn, AgentSession[]>(
		AGENT_COLUMN_ORDER.map((column) => [column, []]),
	);
	for (const session of sessions) {
		map.get(columnOf(session.status))?.push(session);
	}
	// Oldest turn first, so a working card stays put for its whole turn.
	map
		.get("working")
		?.sort(
			(a, b) =>
				(a.turnStartedAt ?? a.lastEventAt) - (b.turnStartedAt ?? b.lastEventAt),
		);
	return map;
}
