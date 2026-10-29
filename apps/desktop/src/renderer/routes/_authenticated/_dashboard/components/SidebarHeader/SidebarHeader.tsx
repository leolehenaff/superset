import type { ReactNode } from "react";
import { useZoomFactor } from "renderer/hooks/useZoomFactor";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { AppMenuButton } from "../AppMenuButton";
import { SidebarModeSwitch } from "../SidebarModeSwitch";

const TRAFFIC_LIGHTS_WIDTH = 80;

/** Top row of the left panel; on macOS it keeps the window buttons clear. */
export function SidebarHeader({ action }: { action: ReactNode }) {
	const { data: platform } = electronTrpc.window.getPlatform.useQuery();
	const isMac = platform === undefined || platform === "darwin";
	const zoomFactor = useZoomFactor();

	return (
		<header
			className="flex h-12 shrink-0 items-center gap-2 border-b border-border/60 pr-2"
			style={isMac ? { height: `${48 / zoomFactor}px` } : undefined}
		>
			{isMac ? (
				<div
					className="drag h-full shrink-0"
					style={{ width: `${TRAFFIC_LIGHTS_WIDTH / zoomFactor}px` }}
				/>
			) : (
				<div className="flex h-full shrink-0 items-center pl-2">
					<AppMenuButton />
				</div>
			)}
			<SidebarModeSwitch />
			{action}
		</header>
	);
}
