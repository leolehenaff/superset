import { cn } from "@superset/ui/utils";
import { LuBot, LuClock, LuFolderGit2 } from "react-icons/lu";
import { useFailedAutomations } from "renderer/routes/_authenticated/_dashboard/hooks/useFailedAutomations";
import {
	useWorkspaceSidebarStore,
	type WorkspaceSidebarMode,
} from "renderer/stores/workspace-sidebar-state";

const MODES = [
	{ mode: "agents", label: "Agents", icon: LuBot },
	{ mode: "workspaces", label: "Workspaces", icon: LuFolderGit2 },
	{ mode: "automations", label: "Automatisations", icon: LuClock },
] as const satisfies ReadonlyArray<{
	mode: WorkspaceSidebarMode;
	label: string;
	icon: unknown;
}>;

export function SidebarModeSwitch() {
	const current = useWorkspaceSidebarStore((s) => s.mode);
	const setMode = useWorkspaceSidebarStore((s) => s.setMode);
	const { myFailedCount } = useFailedAutomations();

	return (
		<fieldset
			aria-label="Contenu du panneau"
			className="flex h-8 min-w-0 flex-1 items-center gap-0.5 rounded-md bg-foreground/[0.06] p-0.5"
		>
			{MODES.map(({ mode, label, icon: Icon }) => {
				const isActive = current === mode;
				const failedCount = mode === "automations" ? myFailedCount : 0;
				return (
					<button
						key={mode}
						type="button"
						title={label}
						aria-label={label}
						aria-pressed={isActive}
						onClick={() => setMode(mode)}
						className={cn(
							"relative flex h-7 items-center justify-center gap-1.5 rounded-sm text-xs font-medium transition-colors",
							isActive
								? "min-w-0 flex-1 bg-background px-2 text-foreground shadow-sm"
								: "w-8 shrink-0 text-muted-foreground hover:text-foreground",
						)}
					>
						<Icon className="size-3.5 shrink-0" strokeWidth={1.5} />
						{isActive ? <span className="truncate">{label}</span> : null}
						{failedCount > 0 ? (
							<span
								title="En échec"
								className={cn(
									"flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-red-500/15 px-1 text-[10px] tabular-nums text-red-600 dark:text-red-400",
									!isActive &&
										"absolute -top-1 -right-1 h-3.5 min-w-3.5 bg-red-500 text-white dark:text-white",
								)}
							>
								{failedCount > 9 ? "9+" : failedCount}
							</span>
						) : null}
					</button>
				);
			})}
		</fieldset>
	);
}
