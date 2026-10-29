import type { WorkspaceStore } from "@superset/panes";
import { useEffect, useRef } from "react";
import { useTerminalAgentBindings } from "renderer/hooks/host-service/useTerminalAgentBindings";
import { useV2PaneNotificationStatus } from "renderer/hooks/host-service/useV2NotificationStatus";
import { useWorkspace } from "renderer/routes/_authenticated/_dashboard/v2-workspace/providers/WorkspaceProvider";
import {
	getV2NotificationSourcesForPane,
	useV2NotificationStore,
} from "renderer/stores/v2-notifications";
import { useStore } from "zustand";
import type { StoreApi } from "zustand/vanilla";
import type { PaneViewerData } from "../../types";

export function useClearActivePaneAttention({
	store,
}: {
	store: StoreApi<WorkspaceStore<PaneViewerData>>;
}): void {
	const { workspace } = useWorkspace();
	const activePane = useStore(store, (state) => {
		const tab = state.tabs.find(
			(candidate) => candidate.id === state.activeTabId,
		);
		return tab?.activePaneId ? tab.panes[tab.activePaneId] : undefined;
	});
	const activePaneStatus = useV2PaneNotificationStatus(
		workspace.id,
		activePane,
	);
	const markTerminalSeen = useV2NotificationStore(
		(state) => state.markTerminalSeen,
	);
	const bindings = useTerminalAgentBindings(workspace.id);
	// Each event in view is handled once per activation, so "mark for
	// review" on the pane in view is not undone at once.
	const handled = useRef({
		paneId: activePane?.id,
		events: new Set<string>(),
	});

	useEffect(() => {
		if (handled.current.paneId !== activePane?.id) {
			handled.current = { paneId: activePane?.id, events: new Set() };
		}
		if (activePaneStatus != null && activePaneStatus !== "review") return;
		for (const source of getV2NotificationSourcesForPane(activePane)) {
			if (source.type !== "terminal") continue;
			// Seen marks are host-clock only: mark "seen through the binding's
			// last event". Mixing in the renderer clock would poison the
			// monotonic comparison whenever the clocks drift.
			const binding = bindings.get(source.id);
			if (!binding) continue;
			const event = `${source.id}:${binding.lastEventAt}`;
			if (handled.current.events.has(event)) continue;
			handled.current.events.add(event);
			if (activePaneStatus === "review") {
				markTerminalSeen(source.id, binding.lastEventAt);
			}
		}
	}, [activePane, activePaneStatus, bindings, markTerminalSeen]);
}
