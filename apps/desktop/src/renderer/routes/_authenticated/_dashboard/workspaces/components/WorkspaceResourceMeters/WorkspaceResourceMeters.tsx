import { cn } from "@superset/ui/utils";
import type { UsageSeverity } from "renderer/routes/_authenticated/_dashboard/components/TopBar/components/ResourceConsumption/types";
import {
	formatCpu,
	formatMemory,
} from "renderer/routes/_authenticated/_dashboard/components/TopBar/components/ResourceConsumption/utils/formatters";
import { getUsageSeverity } from "renderer/routes/_authenticated/_dashboard/components/TopBar/components/ResourceConsumption/utils/resourceSeverity";

const MEMORY_METER_MAX = 4 * 1024 ** 3;

const SEVERITY_BAR_CLASS: Record<UsageSeverity, string> = {
	normal: "bg-emerald-500/70",
	elevated: "bg-amber-500",
	high: "bg-red-500",
};

interface WorkspaceResourceMetersProps {
	resources: { cpu: number; memory: number };
	/** Side by side on one line, for narrow panes. */
	compact?: boolean;
}

export function WorkspaceResourceMeters({
	resources,
	compact = false,
}: WorkspaceResourceMetersProps) {
	const severity = getUsageSeverity(resources, resources, {
		includeShare: false,
	});
	const meters = [
		{
			label: "CPU",
			value: formatCpu(resources.cpu),
			fraction: resources.cpu / 100,
		},
		{
			label: "RAM",
			value: formatMemory(resources.memory),
			fraction: resources.memory / MEMORY_METER_MAX,
		},
	];

	return (
		<div
			className={cn(
				"flex",
				compact
					? "items-center gap-3 text-[10px]"
					: "flex-col gap-1.5 text-[11px]",
			)}
		>
			{meters.map(({ label, value, fraction }) => (
				<div
					key={label}
					className="flex min-w-0 flex-1 items-center gap-2 tabular-nums"
				>
					<span
						className={cn(
							"shrink-0 text-muted-foreground/70",
							!compact && "w-7",
						)}
					>
						{label}
					</span>
					<div className="h-1 min-w-4 flex-1 overflow-hidden rounded-full bg-muted">
						<div
							className={cn(
								"h-full rounded-full",
								SEVERITY_BAR_CLASS[severity],
							)}
							style={{ width: `${Math.max(Math.min(fraction, 1) * 100, 2)}%` }}
						/>
					</div>
					<span
						className={cn(
							"shrink-0 text-right font-mono text-muted-foreground",
							!compact && "w-14",
						)}
					>
						{value}
					</span>
				</div>
			))}
		</div>
	);
}
