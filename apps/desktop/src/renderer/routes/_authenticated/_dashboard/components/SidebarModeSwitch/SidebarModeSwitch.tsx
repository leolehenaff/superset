import { cn } from "@superset/ui/utils";
import { LuBot, LuFolderGit2 } from "react-icons/lu";
import {
	useWorkspaceSidebarStore,
	type WorkspaceSidebarMode,
} from "renderer/stores/workspace-sidebar-state";

const MODES = [
	{ mode: "agents", label: "Agents", icon: LuBot },
	{ mode: "workspaces", label: "Workspaces", icon: LuFolderGit2 },
] as const satisfies ReadonlyArray<{
	mode: WorkspaceSidebarMode;
	label: string;
	icon: unknown;
}>;

export function SidebarModeSwitch() {
	const current = useWorkspaceSidebarStore((s) => s.mode);
	const setMode = useWorkspaceSidebarStore((s) => s.setMode);

	return (
		<fieldset
			aria-label="Contenu du panneau"
			className="flex h-8 min-w-0 flex-1 items-center rounded-md bg-foreground/[0.06] p-0.5"
		>
			{MODES.map(({ mode, label, icon: Icon }) => (
				<button
					key={mode}
					type="button"
					aria-pressed={current === mode}
					onClick={() => setMode(mode)}
					className={cn(
						"flex h-7 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-sm px-2 text-xs font-medium transition-colors",
						current === mode
							? "bg-background text-foreground shadow-sm"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					<Icon className="size-3.5 shrink-0" strokeWidth={1.5} />
					<span className="truncate">{label}</span>
				</button>
			))}
		</fieldset>
	);
}
