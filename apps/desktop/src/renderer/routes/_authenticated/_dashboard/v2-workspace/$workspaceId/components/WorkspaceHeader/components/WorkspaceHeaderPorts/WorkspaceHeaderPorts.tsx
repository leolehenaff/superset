import { Popover, PopoverContent, PopoverTrigger } from "@superset/ui/popover";
import { useState } from "react";
import { LuRadioTower } from "react-icons/lu";
import { useDashboardSidebarWorkspacePorts } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/providers/DashboardSidebarPortsProvider";
import { PortRow } from "renderer/routes/_authenticated/_dashboard/components/PortsDropdown/components/PortRow";

const MAX_VISIBLE = 3;

export function WorkspaceHeaderPorts({ workspaceId }: { workspaceId: string }) {
	const group = useDashboardSidebarWorkspacePorts(workspaceId);
	const [open, setOpen] = useState(false);
	const ports = group?.ports ?? [];

	if (ports.length === 0) return null;
	const hidden = ports.length - MAX_VISIBLE;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					title="Ports ouverts dans ce workspace"
					className="no-drag flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-border/60 bg-background/60 px-1.5 font-mono text-[11px] text-foreground/80 transition-colors hover:bg-fill-hover hover:text-foreground data-[state=open]:bg-fill-hover"
				>
					<span className="relative flex size-1.5">
						<span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-50" />
						<span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
					</span>
					{ports
						.slice(0, MAX_VISIBLE)
						.map((port) => `:${port.port}`)
						.join(" ")}
					{hidden > 0 ? (
						<span className="text-muted-foreground">+{hidden}</span>
					) : null}
				</button>
			</PopoverTrigger>
			<PopoverContent align="end" sideOffset={6} className="w-80 p-0">
				<div className="flex items-center gap-1.5 border-border border-b px-3 py-2">
					<LuRadioTower className="size-3 text-muted-foreground" />
					<span className="font-medium text-foreground text-xs">
						Ports ouverts
					</span>
				</div>
				<div className="max-h-80 overflow-y-auto p-1">
					{ports.map((port) => (
						<PortRow
							key={`${port.terminalId}:${port.port}`}
							port={port}
							onNavigate={() => setOpen(false)}
						/>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
