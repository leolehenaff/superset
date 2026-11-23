import { LuSquareTerminal } from "react-icons/lu";
import type { TerminalPresetRow } from "renderer/routes/_authenticated/providers/CollectionsProvider/dashboardSidebarLocal";
import { PresetsBar } from "../PresetsBar";

interface AgentEmptyStateProps {
	matchedPresets: TerminalPresetRow[];
	executePreset: (preset: TerminalPresetRow) => void | Promise<void>;
	onOpenTerminal: () => void;
}

export function AgentEmptyState({
	matchedPresets,
	executePreset,
	onOpenTerminal,
}: AgentEmptyStateProps) {
	return (
		<div className="flex flex-col items-center gap-4 text-center">
			<div className="flex flex-col gap-1">
				<p className="font-medium text-foreground text-sm">
					Aucun agent dans ce workspace
				</p>
				<p className="text-muted-foreground text-xs">
					Lance un agent pour démarrer une conversation.
				</p>
			</div>
			<div className="rounded-lg border border-border/60">
				<PresetsBar
					matchedPresets={matchedPresets}
					executePreset={executePreset}
					showPresetsBar
					onToggleShowPresetsBar={() => {}}
				/>
			</div>
			<button
				type="button"
				onClick={onOpenTerminal}
				className="flex items-center gap-1.5 text-muted-foreground text-xs transition-colors hover:text-foreground"
			>
				<LuSquareTerminal className="size-3.5" />
				Ouvrir un terminal
			</button>
		</div>
	);
}
