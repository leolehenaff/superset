import { FEATURE_FLAGS } from "@superset/shared/constants";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import { cn } from "@superset/ui/utils";
import { useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useFeatureFlagEnabled } from "posthog-js/react";
import {
	LuClock,
	LuEllipsis,
	LuGauge,
	LuPlus,
	LuPuzzle,
	LuSearch,
	LuSettings,
} from "react-icons/lu";
import { useFrameStackStore } from "renderer/commandPalette";
import { ZoomStable } from "renderer/components/ZoomStable";
import { env } from "renderer/env.renderer";
import { useOpenNewWorkspace } from "renderer/hooks/useOpenNewWorkspace";
import { useZoomFactor } from "renderer/hooks/useZoomFactor";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { useFailedAutomations } from "renderer/routes/_authenticated/_dashboard/hooks/useFailedAutomations";
import {
	getUsageLastSection,
	usageSectionPath,
} from "renderer/routes/_authenticated/settings/usage/utils/usageLastSection";
import { AppMenuButton } from "../AppMenuButton";
import { NavigationControls } from "../NavigationControls";
import { OfflineBadge } from "../OfflineBadge";
import { PortsDropdown } from "../PortsDropdown";
import { WindowControlsInset } from "../WindowControlsInset";
import { WorkspaceSwitcher } from "./components/WorkspaceSwitcher";

const TAB_CLASS =
	"no-drag relative flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors";
const BADGE_TONE_CLASS = {
	red: "bg-red-500/15 text-red-600 dark:text-red-400",
} as const;
const ICON_BUTTON_CLASS =
	"no-drag flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-fill-hover hover:text-foreground";

export function AppTabsBar() {
	const navigate = useNavigate();
	const matchRoute = useMatchRoute();
	const openNewWorkspace = useOpenNewWorkspace();
	const openCommandPalette = useFrameStackStore((s) => s.setOpen);
	const { myFailedCount } = useFailedAutomations();
	const isPluginsEnabled =
		(useFeatureFlagEnabled(FEATURE_FLAGS.PLUGINS) ?? false) ||
		env.NODE_ENV === "development";
	const { data: platform } = electronTrpc.window.getPlatform.useQuery();
	const isMac = platform === undefined || platform === "darwin";
	const zoomFactor = useZoomFactor();

	const tabs = [
		{
			key: "automations",
			label: "Automatisations",
			icon: LuClock,
			isActive: !!matchRoute({ to: "/automations", fuzzy: true }),
			badges: [{ count: myFailedCount, title: "En échec", tone: "red" }],
			open: () => navigate({ to: "/automations" }),
		},
		{
			key: "usage",
			label: "Usage",
			icon: LuGauge,
			isActive: !!matchRoute({ to: "/settings/usage", fuzzy: true }),
			badges: [],
			open: () => navigate({ to: usageSectionPath(getUsageLastSection()) }),
		},
	] as const;

	return (
		<div
			className="flex h-12 w-full shrink-0 items-center border-b bg-muted/45 dark:bg-muted/35"
			style={isMac ? { height: `${48 / zoomFactor}px` } : undefined}
		>
			{isMac ? (
				<div
					className="drag h-full shrink-0"
					style={{ width: `${80 / zoomFactor}px` }}
				/>
			) : (
				<div className="flex h-full shrink-0 items-center px-2">
					<AppMenuButton />
				</div>
			)}
			<ZoomStable enabled={isMac} className="flex min-w-0 items-center gap-1">
				<NavigationControls />
				<nav className="ml-2 flex items-center gap-1">
					{tabs.map(({ key, label, icon: Icon, isActive, badges, open }) => (
						<button
							key={key}
							type="button"
							onClick={open}
							aria-current={isActive ? "page" : undefined}
							className={cn(
								TAB_CLASS,
								isActive
									? "bg-fill-selected text-foreground"
									: "text-muted-foreground hover:bg-fill-hover hover:text-foreground",
							)}
						>
							<Icon className="size-4" strokeWidth={1.5} />
							{label}
							{badges.map(
								({ count, title, tone }) =>
									count > 0 && (
										<span
											key={title}
											title={title}
											className={cn(
												"flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] tabular-nums",
												BADGE_TONE_CLASS[tone],
											)}
										>
											{count > 9 ? "9+" : count}
										</span>
									),
							)}
						</button>
					))}
				</nav>
				<WorkspaceSwitcher />
			</ZoomStable>
			<div className="drag h-full min-w-0 flex-1" />
			<ZoomStable enabled={isMac} className="flex items-center gap-1 pr-3">
				<PortsDropdown />
				<OfflineBadge />
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							aria-label="Plus"
							className={ICON_BUTTON_CLASS}
						>
							<LuEllipsis className="size-4" strokeWidth={1.5} />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="end"
						onCloseAutoFocus={(event) => event.preventDefault()}
					>
						<DropdownMenuItem onSelect={() => openNewWorkspace()}>
							<LuPlus className="size-4" />
							Nouveau workspace
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={() => openCommandPalette(true)}>
							<LuSearch className="size-4" />
							Recherche
						</DropdownMenuItem>
						{isPluginsEnabled && (
							<DropdownMenuItem onSelect={() => navigate({ to: "/plugins" })}>
								<LuPuzzle className="size-4" />
								Plugins
							</DropdownMenuItem>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
				<button
					type="button"
					aria-label="Paramètres"
					onClick={() => navigate({ to: "/settings/account" })}
					className={ICON_BUTTON_CLASS}
				>
					<LuSettings className="size-4" strokeWidth={1.5} />
				</button>
			</ZoomStable>
			{!isMac && <WindowControlsInset />}
		</div>
	);
}
