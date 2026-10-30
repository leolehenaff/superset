import type { ToolKind } from "@superset/chat/protocol";

const READ =
	"border-sky-400/25 bg-sky-400/[.07] text-sky-600 dark:text-sky-300";
const EDIT =
	"border-violet-400/25 bg-violet-400/[.07] text-violet-600 dark:text-violet-300";
const NEUTRAL = "border-border/70 bg-foreground/[.04] text-foreground/70";

const TONE_BY_KIND: Record<ToolKind, string> = {
	read: READ,
	search: READ,
	edit: EDIT,
	move: EDIT,
	delete: "border-red-400/25 bg-red-400/[.07] text-red-600 dark:text-red-300",
	execute:
		"border-emerald-400/25 bg-emerald-400/[.07] text-emerald-600 dark:text-emerald-300",
	fetch:
		"border-amber-300/25 bg-amber-300/[.07] text-amber-700 dark:text-amber-200",
	think: NEUTRAL,
	other: NEUTRAL,
};

export function toolKindTone(kind: ToolKind): string {
	return TONE_BY_KIND[kind] ?? NEUTRAL;
}
