import type { AccessibleV2Workspace } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/hooks/useAccessibleV2Workspaces";
import type { V2WorkspacesOrderBy } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/stores/v2WorkspacesFilterStore";

/** Best-known activity timestamp: last agent event, else creation. */
export function workspaceActivityAt(workspace: AccessibleV2Workspace): number {
	return Math.max(
		workspace.lastAgentEventAt ?? 0,
		workspace.createdAt.getTime(),
	);
}

function workspaceChurn(workspace: AccessibleV2Workspace): number {
	if (!workspace.diffStats) return -1;
	return workspace.diffStats.additions + workspace.diffStats.deletions;
}

function workspaceResources(
	a: AccessibleV2Workspace,
	b: AccessibleV2Workspace,
): number {
	return (
		(b.resources?.memory ?? -1) - (a.resources?.memory ?? -1) ||
		(b.resources?.cpu ?? -1) - (a.resources?.cpu ?? -1)
	);
}

/** Newest activity first. Shared by the list sections and board columns so
 * both views order rows identically. */
export function compareWorkspaces(
	a: AccessibleV2Workspace,
	b: AccessibleV2Workspace,
): number {
	return workspaceActivityAt(b) - workspaceActivityAt(a);
}

export function compareWorkspacesBy(
	orderBy: V2WorkspacesOrderBy,
): (a: AccessibleV2Workspace, b: AccessibleV2Workspace) => number {
	switch (orderBy) {
		case "created":
			return (a, b) => b.createdAt.getTime() - a.createdAt.getTime();
		case "churn":
			return (a, b) =>
				workspaceChurn(b) - workspaceChurn(a) || compareWorkspaces(a, b);
		case "resources":
			return (a, b) => workspaceResources(a, b) || compareWorkspaces(a, b);
		case "name":
			return (a, b) =>
				a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) ||
				compareWorkspaces(a, b);
		default:
			return compareWorkspaces;
	}
}
