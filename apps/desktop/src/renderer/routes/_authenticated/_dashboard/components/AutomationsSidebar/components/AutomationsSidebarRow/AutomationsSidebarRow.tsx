import { formatCompactRelativeTime } from "@superset/i18n/format";
import { CLOUD_HOST_ID } from "@superset/shared/host-routing";
import { describeSchedule } from "@superset/shared/rrule";
import type { RouterOutputs } from "@superset/trpc";
import { cn } from "@superset/ui/utils";
import { useNavigate } from "@tanstack/react-router";
import { memo } from "react";
import { LuCloud } from "react-icons/lu";
import { RUN_STATUS_META } from "renderer/routes/_authenticated/_dashboard/automations/utils/runStatus";
import type { AutomationLastRun } from "renderer/routes/_authenticated/_dashboard/hooks/useFailedAutomations";

type AutomationListItem = RouterOutputs["automation"]["list"][number];

interface AutomationsSidebarRowProps {
	automation: AutomationListItem;
	projectName: string | undefined;
	lastRun: AutomationLastRun | null;
	now: Date;
	isActive: boolean;
}

export const AutomationsSidebarRow = memo(function AutomationsSidebarRow({
	automation,
	projectName,
	lastRun,
	now,
	isActive,
}: AutomationsSidebarRowProps) {
	const navigate = useNavigate();
	const scheduleLabel = automation.rrule
		? describeSchedule(automation.rrule)
		: automation.triggerCount > 0
			? "Sur événement"
			: "Aucun déclencheur";
	const nextRunAt =
		automation.enabled && automation.nextRunAt
			? new Date(automation.nextRunAt).getTime()
			: null;
	const dotClassName = lastRun
		? RUN_STATUS_META[lastRun.status].dot
		: "bg-muted-foreground/30";

	return (
		<button
			type="button"
			onClick={() =>
				navigate({
					to: "/automations/$automationId",
					params: { automationId: automation.id },
				})
			}
			aria-current={isActive ? "page" : undefined}
			className={cn(
				"flex w-full flex-col gap-1 rounded-lg py-2 pr-2.5 pl-3 text-left ring-inset transition-colors",
				isActive
					? "bg-background shadow-sm ring-1 ring-border"
					: "hover:bg-fill-hover",
			)}
		>
			<div className="flex min-w-0 items-center gap-2">
				<span
					aria-hidden
					className={cn("size-1.5 shrink-0 rounded-full", dotClassName)}
				/>
				<span
					className={cn(
						"min-w-0 flex-1 truncate text-[13px] leading-5",
						!automation.enabled
							? "text-muted-foreground"
							: isActive
								? "font-medium text-foreground"
								: "text-foreground/90",
					)}
				>
					{automation.name}
				</span>
				{nextRunAt !== null ? (
					<span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
						{nextRunAt - now.getTime() < 60_000
							? "bientôt"
							: formatCompactRelativeTime(nextRunAt, now)}
					</span>
				) : null}
			</div>
			<div className="flex min-w-0 items-center gap-1 pl-3.5 text-[11px] text-muted-foreground">
				<span className="min-w-0 flex-1 truncate">{scheduleLabel}</span>
				{automation.targetHostId === CLOUD_HOST_ID ? (
					<LuCloud className="size-3 shrink-0 opacity-70" />
				) : projectName ? (
					<span className="max-w-[45%] shrink-0 truncate">{projectName}</span>
				) : null}
			</div>
		</button>
	);
});
