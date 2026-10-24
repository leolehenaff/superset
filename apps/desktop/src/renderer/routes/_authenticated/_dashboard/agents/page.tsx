import {
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	MouseSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { Button } from "@superset/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LuPlus } from "react-icons/lu";
import { useV2NotificationStore } from "renderer/stores/v2-notifications";
import type { PaneStatus } from "shared/tabs-types";
import { AgentSessionsColumn } from "./components/AgentSessionsColumn";
import { AgentSessionCard } from "./components/AgentSessionsColumn/components/AgentSessionCard";
import { NewAgentDialog } from "./components/NewAgentDialog";
import { SessionQuotaBars } from "./components/SessionQuotaBars";
import { type AgentSession, useAgentSessions } from "./hooks/useAgentSessions";

export const Route = createFileRoute("/_authenticated/_dashboard/agents/")({
	component: AgentsPage,
});

// Plain strings, not Lingui: new catalog entries would mean regenerating
// upstream catalogs on every rebase.
const COLUMN_LABELS: Record<Column, string> = {
	working: "En cours",
	permission: "Attend ta réponse",
	review: "À relire",
	idle: "Inactif",
};

type Column = Exclude<PaneStatus, "failed">;

const COLUMN_ORDER: Column[] = ["working", "permission", "review", "idle"];

/** No failure column: a failed run is something to read, like a finished one. */
function columnOf(status: PaneStatus): Column {
	return status === "failed" ? "review" : status;
}

function AgentsPage() {
	const { sessions, isReady } = useAgentSessions();
	const [isNewAgentOpen, setIsNewAgentOpen] = useState(false);
	const [dragged, setDragged] = useState<AgentSession | null>(null);
	const pruneTerminalSeen = useV2NotificationStore(
		(state) => state.pruneTerminalSeen,
	);
	// Distance keeps a plain click opening the workspace.
	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
	);

	const onDragStart = ({ active }: DragStartEvent) => {
		setDragged(
			sessions.find((session) => session.terminalId === active.id) ?? null,
		);
	};

	const onDragEnd = ({ active, over }: DragEndEvent) => {
		setDragged(null);
		if (over?.id === "review") pruneTerminalSeen(String(active.id));
	};

	const byStatus = useMemo(() => {
		const map = new Map<Column, AgentSession[]>(
			COLUMN_ORDER.map((column) => [column, []]),
		);
		for (const session of sessions) {
			map.get(columnOf(session.status))?.push(session);
		}
		// Oldest turn first, so a working card stays put for its whole turn.
		map
			.get("working")
			?.sort(
				(a, b) =>
					(a.turnStartedAt ?? a.lastEventAt) -
					(b.turnStartedAt ?? b.lastEventAt),
			);
		return map;
	}, [sessions]);

	return (
		<div className="flex h-full w-full flex-1 flex-col overflow-hidden">
			<div className="flex shrink-0 items-end justify-between gap-4 px-6 pt-6 pb-5">
				<div>
					<h1 className="text-lg font-semibold tracking-tight">Agents</h1>
					<p className="text-xs text-muted-foreground">
						{sessions.length === 0
							? "Aucune session en cours"
							: `${sessions.length} session${sessions.length > 1 ? "s" : ""} en cours`}
					</p>
				</div>
				<div className="flex items-center gap-4">
					<SessionQuotaBars />
					<Button onClick={() => setIsNewAgentOpen(true)}>
						<LuPlus className="size-4" />
						Nouvel agent
					</Button>
				</div>
			</div>
			<NewAgentDialog open={isNewAgentOpen} onOpenChange={setIsNewAgentOpen} />
			{sessions.length === 0 && isReady ? (
				<div className="flex flex-1 flex-col items-center justify-center gap-3 pb-16 text-sm text-muted-foreground">
					Aucune session d’agent en cours.
					<Button variant="outline" onClick={() => setIsNewAgentOpen(true)}>
						<LuPlus className="size-4" />
						Lancer un agent
					</Button>
				</div>
			) : (
				<DndContext
					sensors={sensors}
					onDragStart={onDragStart}
					onDragEnd={onDragEnd}
					onDragCancel={() => setDragged(null)}
				>
					<div className="flex-1 overflow-x-auto overflow-y-hidden">
						<div className="grid h-full min-w-[1000px] grid-cols-4 gap-4 px-6 pb-6">
							{COLUMN_ORDER.map((column) => (
								<AgentSessionsColumn
									key={column}
									status={column}
									label={COLUMN_LABELS[column]}
									sessions={byStatus.get(column) ?? []}
								/>
							))}
						</div>
					</div>
					<DragOverlay>
						{dragged ? <AgentSessionCard session={dragged} isOverlay /> : null}
					</DragOverlay>
				</DndContext>
			)}
		</div>
	);
}
