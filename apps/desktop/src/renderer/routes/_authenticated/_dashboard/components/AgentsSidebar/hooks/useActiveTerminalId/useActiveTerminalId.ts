import type { WorkspaceStore } from "@superset/panes";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { PaneViewerData } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/types";
import {
	getV2PaneLayoutStore,
	subscribeV2PaneLayoutStores,
} from "renderer/stores/v2-pane-layout-stores";

function activeTerminalIdOf(
	state: WorkspaceStore<PaneViewerData>,
): string | null {
	const tab = state.tabs.find(
		(candidate) => candidate.id === state.activeTabId,
	);
	const pane = tab?.activePaneId ? tab.panes[tab.activePaneId] : undefined;
	if (pane?.kind !== "terminal" && pane?.kind !== "chat-v3") return null;
	return (pane.data as { terminalId?: string }).terminalId ?? null;
}

/** Terminal of the focused pane in the mounted workspace, if any. */
export function useActiveTerminalId(workspaceId: string | null): string | null {
	const store = useSyncExternalStore(subscribeV2PaneLayoutStores, () =>
		workspaceId ? getV2PaneLayoutStore(workspaceId) : undefined,
	);
	const [terminalId, setTerminalId] = useState<string | null>(null);

	useEffect(() => {
		if (!store) {
			setTerminalId(null);
			return;
		}
		setTerminalId(activeTerminalIdOf(store.getState()));
		return store.subscribe((state) => setTerminalId(activeTerminalIdOf(state)));
	}, [store]);

	return terminalId;
}
