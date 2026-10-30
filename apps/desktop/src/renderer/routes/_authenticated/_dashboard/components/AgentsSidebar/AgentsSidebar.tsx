import {
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	MouseSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { Popover, PopoverContent, PopoverTrigger } from "@superset/ui/popover";
import { cn } from "@superset/ui/utils";
import { useMemo, useState } from "react";
import { LuPlus } from "react-icons/lu";
import { NewAgentForm } from "renderer/routes/_authenticated/_dashboard/agents/components/NewAgentForm";
import { SessionQuotaBars } from "renderer/routes/_authenticated/_dashboard/agents/components/SessionQuotaBars";
import {
	type AgentSession,
	useAgentSessions,
} from "renderer/routes/_authenticated/_dashboard/agents/hooks/useAgentSessions";
import {
	AGENT_COLUMN_ORDER,
	groupSessionsByColumn,
} from "renderer/routes/_authenticated/_dashboard/agents/utils/agentColumns";
import { APP_CHASSIS_BG_CLASS } from "renderer/routes/_authenticated/_dashboard/components/WorkspaceSidebarPanel";
import { useV2NotificationStore } from "renderer/stores/v2-notifications";
import { SidebarHeader } from "../SidebarHeader";
import { AgentsSidebarRow } from "./components/AgentsSidebarRow";
import { AgentsSidebarSection } from "./components/AgentsSidebarSection";
import { useActiveTerminalId } from "./hooks/useActiveTerminalId";

const ICON_BUTTON_CLASS =
	"flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-fill-hover hover:text-foreground";

interface AgentsSidebarProps {
	activeWorkspaceId: string | null;
}

export function AgentsSidebar({ activeWorkspaceId }: AgentsSidebarProps) {
	const { sessions } = useAgentSessions();
	const activeTerminalId = useActiveTerminalId(activeWorkspaceId);
	const byColumn = useMemo(() => groupSessionsByColumn(sessions), [sessions]);
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

	return (
		<aside className={cn("flex h-full w-full flex-col", APP_CHASSIS_BG_CLASS)}>
			<SidebarHeader
				action={
					<Popover open={isNewAgentOpen} onOpenChange={setIsNewAgentOpen}>
						<PopoverTrigger asChild>
							<button
								type="button"
								title="Nouvel agent"
								className={cn(
									ICON_BUTTON_CLASS,
									"shrink-0",
									isNewAgentOpen && "bg-fill-selected text-foreground",
								)}
							>
								<LuPlus className="size-4" strokeWidth={1.5} />
							</button>
						</PopoverTrigger>
						<PopoverContent
							side="right"
							align="start"
							sideOffset={14}
							className={cn(
								"w-80 overflow-hidden rounded-xl p-0 shadow-xl",
								APP_CHASSIS_BG_CLASS,
							)}
						>
							<NewAgentForm onDone={() => setIsNewAgentOpen(false)} />
						</PopoverContent>
					</Popover>
				}
			/>

			<div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-2">
				<DndContext
					sensors={sensors}
					onDragStart={onDragStart}
					onDragEnd={onDragEnd}
					onDragCancel={() => setDragged(null)}
				>
					<div className="flex flex-col gap-1.5">
						{AGENT_COLUMN_ORDER.map((column) => (
							<AgentsSidebarSection
								key={column}
								column={column}
								sessions={byColumn.get(column) ?? []}
								activeTerminalId={activeTerminalId}
								isDragging={dragged !== null}
							/>
						))}
					</div>
					<DragOverlay>
						{dragged ? (
							<AgentsSidebarRow session={dragged} isActive={false} isOverlay />
						) : null}
					</DragOverlay>
				</DndContext>
			</div>

			<footer className="shrink-0 border-t border-border/60 p-1.5">
				<SessionQuotaBars stacked />
			</footer>
		</aside>
	);
}
