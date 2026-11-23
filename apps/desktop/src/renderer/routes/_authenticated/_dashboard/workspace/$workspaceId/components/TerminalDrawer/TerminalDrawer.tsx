import {
	type PaneRegistry,
	Workspace,
	type WorkspaceProps,
	type WorkspaceStore,
} from "@superset/panes";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@superset/ui/context-menu";
import { cn } from "@superset/ui/utils";
import { type PointerEvent, useState } from "react";
import { LuChevronDown, LuPlus, LuSquareTerminal, LuX } from "react-icons/lu";
import { useStore } from "zustand";
import type { StoreApi } from "zustand/vanilla";
import type { PaneViewerData } from "../../types";

const MIN_HEIGHT = 120;
const DEFAULT_HEIGHT = 320;
const MAX_HEIGHT_RATIO = 0.75;

type DrawerWorkspaceProps = Pick<
	WorkspaceProps<PaneViewerData>,
	| "paneActions"
	| "contextMenuActions"
	| "onBeforeCloseTab"
	| "onInteractionStateChange"
	| "onPaneError"
>;

interface TerminalDrawerProps extends DrawerWorkspaceProps {
	store: StoreApi<WorkspaceStore<PaneViewerData>>;
	registry: PaneRegistry<PaneViewerData>;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onAddShell: () => void;
}

export function TerminalDrawer({
	store,
	registry,
	isOpen,
	onOpenChange,
	onAddShell,
	...workspaceProps
}: TerminalDrawerProps) {
	const [height, setHeight] = useState(DEFAULT_HEIGHT);
	const tabs = useStore(store, (state) => state.tabs);
	const activeTabId = useStore(store, (state) => state.activeTabId);

	const toggleShell = (tabId: string) => {
		if (isOpen && tabId === activeTabId) {
			onOpenChange(false);
			return;
		}
		store.getState().setActiveTab(tabId);
		onOpenChange(true);
	};

	const closeShell = async (tabId: string) => {
		const tab = store.getState().getTab(tabId);
		if (!tab) return;
		if (workspaceProps.onBeforeCloseTab) {
			const allowed = await workspaceProps.onBeforeCloseTab(tab);
			if (!allowed) return;
		}
		store.getState().removeTab(tabId);
	};

	const startResize = (event: PointerEvent<HTMLDivElement>) => {
		event.preventDefault();
		const startY = event.clientY;
		const startHeight = height;
		const maxHeight = window.innerHeight * MAX_HEIGHT_RATIO;
		const onMove = (move: globalThis.PointerEvent) => {
			const next = startHeight + startY - move.clientY;
			setHeight(Math.min(maxHeight, Math.max(MIN_HEIGHT, next)));
		};
		const onUp = () => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
		};
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
	};

	return (
		<div data-pane-area="bottom" className="contents">
			{tabs.length > 0 ? (
				<div
					aria-hidden={!isOpen}
					className={cn(
						"absolute inset-x-0 bottom-8 z-20 flex flex-col border-border border-t bg-background shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.5)] transition-[transform,opacity] duration-150 ease-out",
						isOpen
							? "translate-y-0 opacity-100"
							: "pointer-events-none invisible translate-y-3 opacity-0",
					)}
					style={{ height }}
				>
					<div
						aria-hidden
						onPointerDown={startResize}
						onDoubleClick={() => setHeight(DEFAULT_HEIGHT)}
						className="absolute inset-x-0 -top-1 z-10 h-2 cursor-row-resize transition-colors hover:bg-border"
					/>
					<Workspace<PaneViewerData>
						store={store}
						registry={registry}
						hideTabBar
						{...workspaceProps}
					/>
				</div>
			) : null}
			<div className="flex h-8 shrink-0 items-center gap-1 border-border border-t px-2">
				{tabs.map((tab, index) => {
					const isActive = isOpen && tab.id === activeTabId;
					return (
						<ContextMenu key={tab.id}>
							<ContextMenuTrigger asChild>
								<button
									type="button"
									onClick={() => toggleShell(tab.id)}
									aria-pressed={isActive}
									className={cn(
										"flex h-6 items-center gap-1.5 rounded-md px-2 font-mono text-[11px] transition-colors",
										isActive
											? "bg-fill-selected text-foreground"
											: "text-muted-foreground hover:bg-fill-hover hover:text-foreground",
									)}
								>
									<LuSquareTerminal className="size-3" />
									{tab.titleOverride || `zsh ${index + 1}`}
								</button>
							</ContextMenuTrigger>
							<ContextMenuContent>
								<ContextMenuItem
									onSelect={() => void closeShell(tab.id)}
									className="text-destructive focus:text-destructive"
								>
									<LuX className="size-4" />
									Fermer le terminal
								</ContextMenuItem>
							</ContextMenuContent>
						</ContextMenu>
					);
				})}
				<button
					type="button"
					onClick={onAddShell}
					title="Nouveau terminal (⌘T)"
					className="group flex h-6 items-center gap-1.5 rounded-md border border-border/70 bg-foreground/[0.04] pr-1 pl-1.5 text-[11px] text-foreground/80 shadow-xs transition-colors hover:border-border hover:bg-fill-hover hover:text-foreground"
				>
					<span className="relative flex size-3.5 items-center justify-center">
						<LuSquareTerminal className="size-3.5" />
						<LuPlus className="absolute -right-1 -bottom-1 size-2.5 rounded-full bg-background text-emerald-500" />
					</span>
					<span className="font-medium">Terminal</span>
					<kbd className="rounded bg-foreground/[0.07] px-1 font-sans text-[10px] text-muted-foreground group-hover:text-foreground/70">
						⌘T
					</kbd>
				</button>
				{isOpen ? (
					<button
						type="button"
						onClick={() => onOpenChange(false)}
						title="Masquer le terminal"
						className="ml-auto flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-fill-hover hover:text-foreground"
					>
						<LuChevronDown className="size-3.5" />
					</button>
				) : null}
			</div>
		</div>
	);
}
