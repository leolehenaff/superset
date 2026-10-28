import type { AccessibleV2Workspace } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/hooks/useAccessibleV2Workspaces";
import type { V2WorkspacesSortMode } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/stores/v2WorkspacesFilterStore";
import {
	BOARD_COLUMN_ORDER,
	type BoardColumnKey,
	deriveBoardColumn,
} from "../deriveBoardColumn";
import { compareWorkspaces } from "../sortWorkspaces";

export interface StatusSection {
	column: BoardColumnKey;
	workspaces: AccessibleV2Workspace[];
}

/** Board order reads left-to-right along the workflow; a vertical list must
 * lead with what needs the user, so it walks the same buckets urgency-first. */
const LIST_SECTION_ORDER: BoardColumnKey[] = [
	"attention",
	"working",
	"finished",
	"review",
	"idle",
	"merged",
	"deleted",
];

/** Same buckets as the board — the two views must agree on what
 * "needs attention" means. */
export function groupByStatus(
	workspaces: AccessibleV2Workspace[],
	showArchived: boolean,
	sortMode: V2WorkspacesSortMode,
): StatusSection[] {
	const byColumn = new Map<BoardColumnKey, AccessibleV2Workspace[]>(
		BOARD_COLUMN_ORDER.map((column) => [column, []]),
	);
	for (const workspace of workspaces) {
		if (workspace.archivedAt != null && !showArchived) continue;
		byColumn.get(deriveBoardColumn(workspace))?.push(workspace);
	}
	const sections: StatusSection[] = [];
	for (const column of LIST_SECTION_ORDER) {
		const rows = byColumn.get(column) ?? [];
		if (rows.length === 0) continue;
		rows.sort((a, b) => compareWorkspaces(a, b, sortMode));
		sections.push({ column, workspaces: rows });
	}
	return sections;
}
