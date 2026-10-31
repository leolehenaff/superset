import { cn } from "@superset/ui/utils";
import { LuChevronRight, LuRadioTower } from "react-icons/lu";
import { useDashboardSidebarAllPorts } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/providers/DashboardSidebarPortsProvider";
import { PortsGroup } from "renderer/routes/_authenticated/_dashboard/components/PortsDropdown/components/PortsGroup";
import { usePortsStore } from "renderer/stores/ports";

const noop = () => {};

export function SidebarPorts() {
	const { workspacePortGroups, totalPortCount } = useDashboardSidebarAllPorts();
	const isCollapsed = usePortsStore((s) => s.isListCollapsed);
	const toggleCollapsed = usePortsStore((s) => s.toggleListCollapsed);

	if (totalPortCount === 0) return null;

	return (
		<section className="shrink-0 border-t border-border/60 px-1.5 py-1.5">
			<button
				type="button"
				onClick={toggleCollapsed}
				aria-expanded={!isCollapsed}
				className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-fill-hover hover:text-foreground"
			>
				<LuChevronRight
					className={cn(
						"size-3 transition-transform duration-150",
						!isCollapsed && "rotate-90",
					)}
				/>
				<LuRadioTower className="size-3" />
				<span className="font-medium">Ports</span>
				<span className="ml-auto tabular-nums">{totalPortCount}</span>
			</button>
			{!isCollapsed && (
				<div className="max-h-60 overflow-y-auto pt-1">
					{workspacePortGroups.map((group) => (
						<PortsGroup
							key={group.workspaceId}
							group={group}
							onNavigate={noop}
						/>
					))}
				</div>
			)}
		</section>
	);
}
