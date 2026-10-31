import type { ToolKind } from "@superset/chat/protocol";

const READ = "text-sky-600/80 dark:text-sky-300/80";
const EDIT = "text-violet-600/80 dark:text-violet-300/80";
const NEUTRAL = "text-foreground/55";

const TONE_BY_KIND: Record<ToolKind, string> = {
	read: READ,
	search: READ,
	edit: EDIT,
	move: EDIT,
	delete: "text-red-600/80 dark:text-red-300/80",
	execute: "text-emerald-600/80 dark:text-emerald-300/80",
	fetch: "text-amber-700/80 dark:text-amber-200/80",
	think: NEUTRAL,
	other: NEUTRAL,
};

export function toolKindTone(kind: ToolKind): string {
	return TONE_BY_KIND[kind] ?? NEUTRAL;
}
