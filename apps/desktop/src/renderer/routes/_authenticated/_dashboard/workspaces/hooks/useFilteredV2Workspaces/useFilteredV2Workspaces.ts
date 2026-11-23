import { useDeferredValue, useMemo } from "react";
import { useResourceSnapshot } from "renderer/routes/_authenticated/_dashboard/components/TopBar/components/ResourceConsumption/hooks/useResourceSnapshot";
import { useWorkspacesFilterStore } from "../../stores/workspacesFilterStore";
import { deriveBoardColumn } from "../../utils/deriveBoardColumn";
import { useAccessibleWorkspaces } from "../useAccessibleWorkspaces";

export function useFilteredV2Workspaces() {
	const searchQuery = useWorkspacesFilterStore((state) => state.searchQuery);
	const whereFilter = useWorkspacesFilterStore((state) => state.whereFilter);
	const projectFilters = useWorkspacesFilterStore(
		(state) => state.projectFilters,
	);
	const creatorFilters = useWorkspacesFilterStore(
		(state) => state.creatorFilters,
	);
	const statusFilters = useWorkspacesFilterStore(
		(state) => state.statusFilters,
	);
	const showArchived = useWorkspacesFilterStore((state) => state.showArchived);

	// Deferred so per-keystroke filtering leaves the input's critical path:
	// the sync render reuses the previous results and the recompute follows
	// at background priority.
	const deferredSearchQuery = useDeferredValue(searchQuery);

	const accessible = useAccessibleWorkspaces({
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
	const { snapshot } = useResourceSnapshot();
	const withResources = useMemo(() => {
		const byId = new Map(
			(snapshot?.workspaces ?? []).map((metrics) => [
				metrics.workspaceId,
				metrics,
			]),
		);
		const byStatus =
			statusFilters.length === 0
				? all
				: all.filter((workspace) =>
						statusFilters.includes(deriveBoardColumn(workspace)),
					);
		return byStatus.map((workspace) => {
			const metrics = byId.get(workspace.id);
			return metrics
				? {
						...workspace,
						resources: { cpu: metrics.cpu, memory: metrics.memory },
					}
				: workspace;
		});
	}, [all, snapshot, statusFilters]);

	return {
		...accessible,
		workspaces: useDeferredValue(withResources),
		isReady: useDeferredValue(isReady),
	};
}
