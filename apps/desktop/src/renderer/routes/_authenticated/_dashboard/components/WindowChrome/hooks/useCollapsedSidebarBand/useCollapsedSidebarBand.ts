import { useParadevShell } from "renderer/hooks/useParadevShell";
import { useWorkspaceSidebarStore } from "renderer/stores/workspace-sidebar-state";

/** True while the sidebar is hidden: the page headers then hold the window controls. */
export function useCollapsedSidebarBand(): boolean {
	const isParadevShell = useParadevShell();
	const isSidebarCollapsed = useWorkspaceSidebarStore((s) => s.isCollapsed());
	return !isParadevShell && isSidebarCollapsed;
}
