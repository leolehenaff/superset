import { cn } from "@superset/ui/utils";
import { useMemo } from "react";
import { LuPlus } from "react-icons/lu";
import { useOpenNewWorkspace } from "renderer/hooks/useOpenNewWorkspace";
import { APP_CHASSIS_BG_CLASS } from "renderer/routes/_authenticated/_dashboard/components/WorkspaceSidebarPanel";
import { V2WorkspacesSortMenu } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/components/V2WorkspacesSortMenu";
import { useFilteredV2Workspaces } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/hooks/useFilteredV2Workspaces";
import { useV2WorkspacesFilterStore } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/stores/v2WorkspacesFilterStore";
import { groupByStatus } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/utils/groupByStatus";
import { SidebarHeader } from "../SidebarHeader";
import { WorkItemsSearch } from "../WorkItemsSearch";
import { WorkspacesSidebarSection } from "./components/WorkspacesSidebarSection";

const ICON_BUTTON_CLASS =
	"flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-fill-hover hover:text-foreground";

interface WorkspacesSidebarProps {
	activeWorkspaceId: string | null;
}

export function WorkspacesSidebar({
	activeWorkspaceId,
}: WorkspacesSidebarProps) {
	const { workspaces, isReady } = useFilteredV2Workspaces();
	const searchQuery = useV2WorkspacesFilterStore((state) => state.searchQuery);
	const setSearchQuery = useV2WorkspacesFilterStore(
		(state) => state.setSearchQuery,
	);
	const showArchived = useV2WorkspacesFilterStore(
		(state) => state.showArchived,
	);
	const sortMode = useV2WorkspacesFilterStore((state) => state.sortMode);
	const sections = useMemo(
		() => groupByStatus(workspaces, showArchived, sortMode),
		[workspaces, showArchived, sortMode],
	);
	const openNewWorkspace = useOpenNewWorkspace();

	return (
		<aside className={cn("flex h-full w-full flex-col", APP_CHASSIS_BG_CLASS)}>
			<SidebarHeader
				action={
					<button
						type="button"
						title="Nouveau workspace"
						onClick={() => openNewWorkspace()}
						className={ICON_BUTTON_CLASS}
					>
						<LuPlus className="size-4" strokeWidth={1.5} />
					</button>
				}
			/>
			<div className="flex shrink-0 items-center gap-1 border-b border-border/60 pr-1.5 pl-1">
				<WorkItemsSearch
					value={searchQuery}
					onChange={setSearchQuery}
					placeholder="Rechercher…"
					label="Rechercher un workspace"
					className="bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
				/>
				<V2WorkspacesSortMenu labelClassName="sr-only" />
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-2">
				{sections.length === 0 ? (
					isReady ? (
						<p className="px-4 pt-16 text-center text-xs text-muted-foreground">
							Aucun workspace.
						</p>
					) : null
				) : (
					<div className="flex flex-col gap-1.5">
						{sections.map((section) => (
							<WorkspacesSidebarSection
								key={section.column}
								section={section}
								activeWorkspaceId={activeWorkspaceId}
							/>
						))}
					</div>
				)}
			</div>
		</aside>
	);
}
