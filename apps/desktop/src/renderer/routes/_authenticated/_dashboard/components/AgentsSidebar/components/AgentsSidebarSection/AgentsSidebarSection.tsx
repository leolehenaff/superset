import { useDroppable } from "@dnd-kit/core";
import { cn } from "@superset/ui/utils";
import { useState } from "react";
import { LuChevronRight } from "react-icons/lu";
import type { AgentSession } from "renderer/routes/_authenticated/_dashboard/agents/hooks/useAgentSessions";
import {
	AGENT_COLUMN_LABELS,
	type AgentColumn,
} from "renderer/routes/_authenticated/_dashboard/agents/utils/agentColumns";
import { AgentsSidebarRow } from "../AgentsSidebarRow";
import { AgentColumnIcon } from "./components/AgentColumnIcon";

interface AgentsSidebarSectionProps {
	column: AgentColumn;
	sessions: AgentSession[];
	activeTerminalId: string | null;
	isDragging: boolean;
}

export function AgentsSidebarSection({
	column,
	sessions,
	activeTerminalId,
	isDragging,
}: AgentsSidebarSectionProps) {
	const isDropTarget = column === "review";
	const { setNodeRef, isOver } = useDroppable({
		id: column,
		disabled: !isDropTarget,
	});

	const [isCollapsed, setIsCollapsed] = useState(false);
	const showsRows = !isCollapsed || (isDropTarget && isDragging);

	if (sessions.length === 0 && !(isDropTarget && isDragging)) return null;

	return (
		<section
			ref={setNodeRef}
			className={cn(
				"rounded-lg p-1 transition-colors",
				isDropTarget &&
					isDragging &&
					"bg-sky-500/5 ring-1 ring-sky-500/30 ring-inset",
				isOver && "bg-sky-500/10 ring-sky-500/60",
			)}
		>
			<button
				type="button"
				onClick={() => setIsCollapsed((collapsed) => !collapsed)}
				aria-expanded={!isCollapsed}
				className="group flex w-full items-center gap-2 rounded-md px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
			>
				<AgentColumnIcon status={column} />
				{AGENT_COLUMN_LABELS[column]}
				<span className="rounded-full bg-foreground/[0.07] px-1.5 text-[10px] tabular-nums normal-case tracking-normal">
					{sessions.length}
				</span>
				<LuChevronRight
					className={cn(
						"ml-auto size-3 opacity-0 transition-all group-hover:opacity-100",
						!isCollapsed && "rotate-90",
					)}
				/>
			</button>
			{!showsRows ? null : sessions.length === 0 ? (
				<div className="m-1 flex h-10 items-center justify-center rounded-md border border-dashed border-sky-500/40 text-[11px] text-sky-600 dark:text-sky-400">
					Déposer ici pour relire
				</div>
			) : (
				<div className="mt-0.5 flex flex-col gap-0.5">
					{sessions.map((session) => (
						<AgentsSidebarRow
							key={session.terminalId}
							session={session}
							isActive={session.terminalId === activeTerminalId}
						/>
					))}
				</div>
			)}
		</section>
	);
}
