import { i18n } from "@superset/i18n";
import { cn } from "@superset/ui/utils";
import { useState } from "react";
import { LuChevronRight } from "react-icons/lu";
import { BoardColumnIcon } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/components/BoardColumnIcon";
import { BOARD_COLUMN_LABELS } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/utils/deriveBoardColumn";
import type { StatusSection } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/utils/groupByStatus";
import { WorkspacesSidebarRow } from "../WorkspacesSidebarRow";

interface WorkspacesSidebarSectionProps {
	section: StatusSection;
	activeWorkspaceId: string | null;
}

export function WorkspacesSidebarSection({
	section,
	activeWorkspaceId,
}: WorkspacesSidebarSectionProps) {
	const [isCollapsed, setIsCollapsed] = useState(false);

	return (
		<section className="rounded-lg p-1">
			<button
				type="button"
				onClick={() => setIsCollapsed((collapsed) => !collapsed)}
				aria-expanded={!isCollapsed}
				className="group flex w-full items-center gap-2 rounded-md px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
			>
				<BoardColumnIcon column={section.column} />
				{i18n._(BOARD_COLUMN_LABELS[section.column])}
				<span className="rounded-full bg-foreground/[0.07] px-1.5 text-[10px] tabular-nums normal-case tracking-normal">
					{section.workspaces.length}
				</span>
				<LuChevronRight
					className={cn(
						"ml-auto size-3 opacity-0 transition-all group-hover:opacity-100",
						!isCollapsed && "rotate-90",
					)}
				/>
			</button>
			{isCollapsed ? null : (
				<div className="mt-0.5 flex flex-col gap-0.5">
					{section.workspaces.map((workspace) => (
						<WorkspacesSidebarRow
							key={workspace.id}
							workspace={workspace}
							isActive={workspace.id === activeWorkspaceId}
						/>
					))}
				</div>
			)}
		</section>
	);
}
