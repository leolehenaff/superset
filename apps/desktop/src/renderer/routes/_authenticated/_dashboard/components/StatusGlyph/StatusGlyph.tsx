import type { PaneStatus } from "shared/tabs-types";
import { WorkingDots } from "./components/WorkingDots";

export function StatusGlyph({ status }: { status: PaneStatus }) {
	switch (status) {
		case "working":
			return <WorkingDots />;
		case "permission":
			return (
				<span aria-hidden className="relative flex size-2 shrink-0">
					<span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-60" />
					<span className="relative inline-flex size-2 rounded-full bg-red-500" />
				</span>
			);
		case "review":
		case "failed":
			return (
				<span aria-hidden className="size-2 shrink-0 rounded-full bg-sky-500" />
			);
		default:
			return null;
	}
}
