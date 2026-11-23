import { presetForAcpHarness } from "@superset/chat/core";
import { Sparkles } from "lucide-react";
import { usePresetIcon } from "renderer/assets/app-icons/preset-icons";

export function AgentAvatar({ harness }: { harness: string | undefined }) {
	const icon = usePresetIcon(
		harness ? (presetForAcpHarness(harness) ?? "") : "",
	);
	return (
		<span className="flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-[radial-gradient(circle_at_30%_30%,#f0a283,#d97757_60%,#9e4a33)] shadow-[0_0_0_4px_rgba(217,119,87,.12)]">
			{icon ? (
				<img alt="" className="size-4 brightness-0 invert" src={icon} />
			) : (
				<Sparkles className="size-4 text-white" />
			)}
		</span>
	);
}
