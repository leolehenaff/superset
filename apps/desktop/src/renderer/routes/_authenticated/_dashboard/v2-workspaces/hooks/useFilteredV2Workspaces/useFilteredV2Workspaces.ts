import { useDeferredValue, useMemo } from "react";
import { useResourceSnapshot } from "renderer/routes/_authenticated/_dashboard/components/TopBar/components/ResourceConsumption/hooks/useResourceSnapshot";
import { useV2WorkspacesFilterStore } from "../../stores/v2WorkspacesFilterStore";
import { useAccessibleV2Workspaces } from "../useAccessibleV2Workspaces";

export function useFilteredV2Workspaces() {
	const searchQuery = useV2WorkspacesFilterStore((state) => state.searchQuery);
	const whereFilter = useV2WorkspacesFilterStore((state) => state.whereFilter);
	const projectFilters = useV2WorkspacesFilterStore(
		(state) => state.projectFilters,
	);
	const creatorFilters = useV2WorkspacesFilterStore(
		(state) => state.creatorFilters,
	);
	const showArchived = useV2WorkspacesFilterStore(
		(state) => state.showArchived,
	);

	// Deferred so per-keystroke filtering leaves the input's critical path:
	// the sync render reuses the previous results and the recompute follows
	// at background priority.
	const deferredSearchQuery = useDeferredValue(searchQuery);

	const accessible = useAccessibleV2Workspaces({
		searchQuery: deferredSearchQuery,
		whereFilter,
		projectFilters,
		creatorFilters,
		includeArchived: showArchived,
	});
	const { all, isReady } = accessible;

	// Re-rendering hundreds of rows takes hundreds of ms; deferring keeps
	// filter menus and checkboxes painting instantly while the list catches
	// up at background priority. isReady must lag with the rows — both
	// deferred values flip in the same background render, whereas a sync
	// isReady=true against still-empty deferred rows would flash the empty
	// state while the first rows are being rendered.
	const { snapshot } = useResourceSnapshot("v2");
	const withResources = useMemo(() => {
		const byId = new Map(
			(snapshot?.workspaces ?? []).map((metrics) => [
				metrics.workspaceId,
				metrics,
			]),
		);
		return all.map((workspace) => {
			const metrics = byId.get(workspace.id);
			return metrics
				? {
						...workspace,
						resources: { cpu: metrics.cpu, memory: metrics.memory },
					}
				: workspace;
		});
	}, [all, snapshot]);

	return {
		...accessible,
		workspaces: useDeferredValue(withResources),
		isReady: useDeferredValue(isReady),
	};
}
