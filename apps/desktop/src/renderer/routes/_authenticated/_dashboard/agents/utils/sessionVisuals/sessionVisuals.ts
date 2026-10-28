/** Stable hue per project, so cards of one project share a stripe colour. */
export function projectStripeColor(projectId: string): string {
	let hash = 0;
	for (const char of projectId) hash = (hash * 31 + char.charCodeAt(0)) | 0;
	return `hsl(${Math.abs(hash) % 360} 65% 55%)`;
}

export function contextFillClass(ratio: number): string {
	if (ratio > 0.45) return "bg-red-500";
	if (ratio > 0.35) return "bg-orange-500";
	if (ratio > 0.25) return "bg-yellow-400";
	return "bg-emerald-500";
}

/** `claude-opus-5-5-20260101` → `Opus`; other ids stay as they are. */
export function formatModelFamily(model: string): string {
	const family = model.match(/^claude-([a-z]+)-\d/)?.[1];
	return family ? `${family[0]?.toUpperCase()}${family.slice(1)}` : model;
}
