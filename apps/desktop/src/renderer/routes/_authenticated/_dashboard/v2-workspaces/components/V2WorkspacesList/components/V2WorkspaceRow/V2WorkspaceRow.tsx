import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { useFormat } from "@superset/i18n/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { cn } from "@superset/ui/utils";
import { useNavigate } from "@tanstack/react-router";
import { memo, type ReactNode, useEffect, useState } from "react";
import {
	LuArchive,
	LuArchiveRestore,
	LuMonitor,
	LuMonitorOff,
	LuPin,
	LuPinOff,
	LuPlug,
	LuSquareTerminal,
	LuTrash2,
} from "react-icons/lu";
import { pullRequestRefFromUrl } from "renderer/lib/github/pullRequestRef";
import { useDashboardSidebarWorkspacePorts } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/providers/DashboardSidebarPortsProvider";
import type { UsageSeverity } from "renderer/routes/_authenticated/_dashboard/components/TopBar/components/ResourceConsumption/types";
import {
	formatCpu,
	formatMemory,
} from "renderer/routes/_authenticated/_dashboard/components/TopBar/components/ResourceConsumption/utils/formatters";
import { getUsageSeverity } from "renderer/routes/_authenticated/_dashboard/components/TopBar/components/ResourceConsumption/utils/resourceSeverity";
import { navigateToV2Workspace } from "renderer/routes/_authenticated/_dashboard/utils/workspace-navigation";
import {
	type V2WorkspaceActions,
	V2WorkspaceContextMenu,
} from "renderer/routes/_authenticated/_dashboard/v2-workspaces/components/V2WorkspaceContextMenu";
import { V2WorkspaceProjectIcon } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/components/V2WorkspaceProjectIcon";
import { WorkspaceChecksDot } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/components/WorkspaceChecksDot";
import { WorkspaceStateGlyph } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/components/WorkspaceStateGlyph";
import type { AccessibleV2Workspace } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/hooks/useAccessibleV2Workspaces";
import { workspaceActivityAt } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/utils/sortWorkspaces";
import { CloudGlyph } from "renderer/routes/_authenticated/components/CloudGlyph";
import { PRIcon } from "renderer/screens/main/components/PRIcon/PRIcon";
import { getRelativeTime } from "renderer/screens/main/components/WorkspacesListView/utils";
import { usePullRequestPaneIntent } from "renderer/stores/pull-request-pane-intent";

interface V2WorkspaceRowProps {
	workspace: AccessibleV2Workspace;
	isCurrentRoute: boolean;
}

/** 181909 → "181.9k" — keeps outlier churn from blowing out the stats slot. */
function formatCount(count: number): string {
	if (count < 10_000) return String(count);
	return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
}

const MEMORY_METER_MAX = 4 * 1024 ** 3;

const SEVERITY_BAR_CLASS: Record<UsageSeverity, string> = {
	normal: "bg-emerald-500/70",
	elevated: "bg-amber-500",
	high: "bg-red-500",
};

function ResourceMeter({
	label,
	value,
	fraction,
	severity,
}: {
	label: string;
	value: string;
	fraction: number;
	severity: UsageSeverity;
}) {
	return (
		<div className="flex items-center gap-2 text-[11px] tabular-nums">
			<span className="w-7 shrink-0 text-muted-foreground/70">{label}</span>
			<div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
				<div
					className={cn("h-full rounded-full", SEVERITY_BAR_CLASS[severity])}
					style={{ width: `${Math.max(Math.min(fraction, 1) * 100, 2)}%` }}
				/>
			</div>
			<span className="w-14 shrink-0 text-right font-mono text-muted-foreground">
				{value}
			</span>
		</div>
	);
}

const HOVER_ACTION_CLASS =
	"flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-foreground/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

function RowHoverAction({
	label,
	onClick,
	disabled = false,
	children,
}: {
	label: string;
	onClick: () => void;
	disabled?: boolean;
	children: ReactNode;
}) {
	return (
		<Tooltip delayDuration={300}>
			<TooltipTrigger asChild>
				<button
					type="button"
					disabled={disabled}
					onClick={(event) => {
						event.stopPropagation();
						onClick();
					}}
					onKeyDown={(event) => {
						if (event.key === "Enter" || event.key === " ") {
							event.stopPropagation();
						}
					}}
					aria-label={label}
					className={HOVER_ACTION_CLASS}
				>
					{children}
				</button>
			</TooltipTrigger>
			<TooltipContent side="top">{label}</TooltipContent>
		</Tooltip>
	);
}

// Memoized: filter/sort changes re-render the whole list, and at hundreds of
// rows (each carrying a context menu, marquee, and tooltips) that costs
// hundreds of ms per menu-checkbox toggle. Workspace object identities are
// stable across those changes, so unchanged rows must skip.
export const V2WorkspaceRow = memo(function V2WorkspaceRow({
	workspace,
	isCurrentRoute,
}: V2WorkspaceRowProps) {
	const { formatDateTime } = useFormat();

	const { t } = useLingui();
	const navigate = useNavigate();
	const isCloud = workspace.hostType === "cloud";
	const isArchived = workspace.archivedAt != null;
	const isDone =
		isArchived ||
		workspace.pr?.state === "merged" ||
		workspace.sandboxStatus === "failed";
	const resourceSeverity = workspace.resources
		? getUsageSeverity(workspace.resources, workspace.resources, {
				includeShare: false,
			})
		: "normal";
	const ports = useDashboardSidebarWorkspacePorts(workspace.id)?.ports ?? [];
	// The local device is the one running this app — it can't be offline from
	// its own point of view, whatever presence says.
	const isDeviceOffline =
		!workspace.hostIsOnline && workspace.hostType === "remote-device";

	// The selected look appears on click, not once the route has changed: a
	// slow route transition otherwise reads as a click that did nothing.
	const [isOpening, setIsOpening] = useState(false);
	useEffect(() => {
		if (!isOpening) return;
		const timeout = setTimeout(() => setIsOpening(false), 2000);
		return () => clearTimeout(timeout);
	}, [isOpening]);

	const creatorLabel = workspace.isCreatedByCurrentUser
		? t({ message: "you" })
		: workspace.createdByName;

	// The visible age tracks activity (matches the sort); creation and
	// last-agent-event details live in the tooltip.
	const timeLabel = getRelativeTime(workspaceActivityAt(workspace), {
		format: "compact",
	});
	const createdAtLabel = formatDateTime(workspace.createdAt, undefined);
	const timeTitle = [
		creatorLabel
			? t({
					message: `Created ${createdAtLabel} by ${creatorLabel}`,
				})
			: t({
					message: `Created ${createdAtLabel}`,
				}),
		workspace.lastAgentEventAt
			? t({
					message: `Last agent activity ${formatDateTime(new Date(workspace.lastAgentEventAt), undefined)}`,
				})
			: null,
	]
		.filter(Boolean)
		.join("\n");

	// The branch stays one hover away rather than taking a slot of its own.
	const rowTitle = [
		workspace.pr
			? t({
					message: `PR #${workspace.pr.prNumber} (${workspace.pr.state})`,
				})
			: null,
		workspace.type !== "session" &&
		workspace.branch.toLowerCase() !== workspace.name.toLowerCase()
			? t({
					message: `Branch: ${workspace.branch}`,
				})
			: null,
	]
		.filter(Boolean)
		.join("\n");

	const whereLabel = isCloud
		? t({ message: "Cloud workspace" })
		: isDeviceOffline
			? t({ message: `${workspace.hostName} — device offline` })
			: workspace.hostName;

	const renderHoverActions = (actions: V2WorkspaceActions) =>
		isArchived ? (
			actions.canRestore ? (
				<RowHoverAction
					label={
						actions.isRestoreBlocked
							? t({ message: `${workspace.hostName} — device offline` })
							: t({ message: "Restore workspace" })
					}
					onClick={actions.restore}
					disabled={actions.isRestoreBlocked}
				>
					<LuArchiveRestore className="size-3.5" />
				</RowHoverAction>
			) : null
		) : (
			<>
				{workspace.isInSidebar ? (
					actions.canRemoveFromSidebar && !isCurrentRoute ? (
						<RowHoverAction
							label={t({ message: "Hide from Sidebar" })}
							onClick={actions.removeFromSidebar}
						>
							<LuPinOff className="size-3.5" />
						</RowHoverAction>
					) : null
				) : (
					<RowHoverAction
						label={t({ message: "Show on Sidebar" })}
						onClick={actions.addToSidebar}
					>
						<LuPin className="size-3.5" />
					</RowHoverAction>
				)}
				<RowHoverAction
					label={
						isCloud
							? t({ message: "Archive workspace" })
							: t({ message: "Delete workspace" })
					}
					onClick={actions.openDeleteDialog}
				>
					{isCloud ? (
						<LuArchive className="size-3.5" />
					) : (
						<LuTrash2 className="size-3.5" />
					)}
				</RowHoverAction>
			</>
		);

	return (
		<V2WorkspaceContextMenu
			workspace={workspace}
			isCurrentRoute={isCurrentRoute}
		>
			{(actions) => (
				// biome-ignore lint/a11y/useSemanticElements: The row contains nested action buttons, so it cannot be a native button.
				<div
					role="button"
					aria-current={isCurrentRoute ? "page" : undefined}
					// An archived row has nothing to open; Restore is its action.
					aria-disabled={isArchived || undefined}
					tabIndex={0}
					onClick={() => {
						if (!isArchived) setIsOpening(true);
						actions.open();
					}}
					onKeyDown={(event) => {
						if (event.target !== event.currentTarget) return;
						if (event.key === "Enter" || event.key === " ") {
							event.preventDefault();
							if (!isArchived) setIsOpening(true);
							actions.open();
						}
					}}
					title={rowTitle || undefined}
					className={cn(
						"group flex items-center gap-3 border-b border-border/40 px-6 py-2.5 text-sm outline-none transition-colors",
						"focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset",
						isArchived ? "cursor-default" : "cursor-pointer",
						isCurrentRoute || isOpening
							? "bg-muted hover:bg-muted focus-visible:bg-muted"
							: "hover:bg-accent/50 focus-visible:bg-accent/50",
					)}
				>
					<WorkspaceStateGlyph workspace={workspace} />

					<V2WorkspaceProjectIcon
						projectName={workspace.projectName ?? workspace.name}
						iconUrl={workspace.projectIconUrl}
						className="size-8 rounded-md text-sm"
					/>

					<div className="flex min-w-0 flex-1 flex-col gap-1">
						<div className="flex min-w-0 items-center gap-2">
							<span
								className={cn(
									"truncate font-medium",
									isDone ? "text-muted-foreground" : "text-foreground",
								)}
							>
								{workspace.projectName ?? workspace.name}
							</span>
							{workspace.projectName ? (
								<span className="max-w-48 shrink-0 truncate rounded bg-muted px-1.5 py-px font-mono text-[11px] text-muted-foreground">
									{workspace.name}
								</span>
							) : null}
							{workspace.pr ? (
								<button
									type="button"
									onClick={(event) => {
										event.stopPropagation();
										if (!workspace.pr) return;
										// Opens the PR pane inside the workspace instead of GitHub;
										// an archived workspace has no pane to open, so GitHub it is.
										const ref = isArchived
											? null
											: pullRequestRefFromUrl(workspace.pr.url);
										if (!ref) {
											window.open(workspace.pr.url, "_blank");
											return;
										}
										usePullRequestPaneIntent.getState().request({
											workspaceId: workspace.id,
											...ref,
										});
										void navigateToV2Workspace(workspace.id, navigate);
									}}
									aria-label={t({
										message: `Pull request #${workspace.pr.prNumber}, ${workspace.pr.state}`,
									})}
									className="flex shrink-0 items-center gap-1 rounded px-1 text-xs text-muted-foreground hover:bg-accent"
								>
									<PRIcon state={workspace.pr.state} className="size-3.5" />#
									{workspace.pr.prNumber}
									<WorkspaceChecksDot
										status={workspace.pr.checksStatus}
										checks={workspace.pr.checks}
									/>
								</button>
							) : null}
						</div>
						<div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
							<span className="whitespace-nowrap" title={timeTitle}>
								{timeLabel}
							</span>
							{workspace.diffStats &&
							(workspace.diffStats.additions > 0 ||
								workspace.diffStats.deletions > 0) ? (
								<>
									<span aria-hidden>·</span>
									<span
										className="flex items-center gap-1 font-mono text-[11px] tabular-nums"
										title={t({
											message: plural(workspace.diffStats.fileCount, {
												one: "# changed file",
												other: "# changed files",
											}),
										})}
									>
										<span className="text-emerald-600/80 dark:text-emerald-400/70">
											+{formatCount(workspace.diffStats.additions)}
										</span>
										<span className="text-red-600/80 dark:text-red-400/70">
											−{formatCount(workspace.diffStats.deletions)}
										</span>
									</span>
								</>
							) : null}
							{workspace.hostType !== "local-device" ? (
								<>
									<span aria-hidden>·</span>
									<span
										className={cn(
											"flex min-w-0 items-center gap-1",
											isDeviceOffline && "opacity-60",
										)}
										title={whereLabel}
									>
										{isCloud ? (
											<CloudGlyph className="size-3 shrink-0" />
										) : isDeviceOffline ? (
											<LuMonitorOff className="size-3 shrink-0" />
										) : (
											<LuMonitor className="size-3 shrink-0" />
										)}
										<span className="truncate">
											{isCloud ? "Cloud" : workspace.hostName}
										</span>
										{isDeviceOffline ? (
											<span className="sr-only">
												<Trans>Offline</Trans>
											</span>
										) : null}
									</span>
								</>
							) : null}
						</div>
					</div>

					<div className="flex w-28 shrink-0 items-center justify-end gap-1.5">
						{ports.length > 0 ? (
							<Tooltip delayDuration={300}>
								<TooltipTrigger asChild>
									<span className="flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-sky-700 dark:text-sky-300">
										<LuPlug className="size-3" />
										{ports.length}
									</span>
								</TooltipTrigger>
								<TooltipContent side="top" className="flex flex-col gap-0.5">
									{ports.map((port) => (
										<span key={port.port} className="flex gap-2">
											<span className="font-mono tabular-nums">
												:{port.port}
											</span>
											<span>{port.label ?? port.processName}</span>
										</span>
									))}
								</TooltipContent>
							</Tooltip>
						) : null}
						{workspace.terminalTitles.length > 0 ? (
							<Tooltip delayDuration={300}>
								<TooltipTrigger asChild>
									<span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
										<LuSquareTerminal className="size-3" />
										{workspace.terminalTitles.length}
									</span>
								</TooltipTrigger>
								<TooltipContent side="top" className="flex flex-col gap-0.5">
									{workspace.terminalTitles.map((title, index) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: titles can repeat and have no id
										<span key={index}>{title ?? "shell"}</span>
									))}
								</TooltipContent>
							</Tooltip>
						) : null}
					</div>

					<div className="w-44 shrink-0 @max-lg:hidden">
						{workspace.resources ? (
							<div className="flex flex-col gap-1.5">
								<ResourceMeter
									label="CPU"
									value={formatCpu(workspace.resources.cpu)}
									fraction={workspace.resources.cpu / 100}
									severity={resourceSeverity}
								/>
								<ResourceMeter
									label="RAM"
									value={formatMemory(workspace.resources.memory)}
									fraction={workspace.resources.memory / MEMORY_METER_MAX}
									severity={resourceSeverity}
								/>
							</div>
						) : (
							<span className="block text-right text-xs text-muted-foreground/50">
								Au repos
							</span>
						)}
					</div>

					<span className="flex w-14 shrink-0 items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
						{renderHoverActions(actions)}
					</span>
				</div>
			)}
		</V2WorkspaceContextMenu>
	);
});
