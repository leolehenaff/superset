import type { WorkspaceStore } from "@superset/panes";
import type { PaneViewerData } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/types";
import type { StoreApi } from "zustand";

type PaneLayoutStore = StoreApi<WorkspaceStore<PaneViewerData>>;

const stores = new Map<string, PaneLayoutStore>();
const listeners = new Set<() => void>();

function notify() {
	for (const listener of listeners) listener();
}

/** Main pane layouts mounted in this renderer, so outside edits apply live. */
export function registerV2PaneLayoutStore(
	workspaceId: string,
	store: PaneLayoutStore,
): () => void {
	stores.set(workspaceId, store);
	notify();
	return () => {
		if (stores.get(workspaceId) !== store) return;
		stores.delete(workspaceId);
		notify();
	};
}

export function getV2PaneLayoutStore(
	workspaceId: string,
): PaneLayoutStore | undefined {
	return stores.get(workspaceId);
}

export function subscribeV2PaneLayoutStores(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
