import { cn } from "@superset/ui/utils";
import "./WorkingDots.css";

const COLUMNS = 5;
const ROWS = 3;
const DURATION_S = 1.2;

/** Perimeter cells of the 5x3 grid, clockwise from the top-left corner. */
const RING: number[] = [0, 1, 2, 3, 4, 9, 14, 13, 12, 11, 10, 5];

export function WorkingDots({ className }: { className?: string }) {
	return (
		<span
			aria-hidden
			className={cn("grid shrink-0 gap-px text-amber-500", className)}
			style={{ gridTemplateColumns: `repeat(${COLUMNS}, 2px)` }}
		>
			{Array.from({ length: COLUMNS * ROWS }, (_, cell) => {
				const step = RING.indexOf(cell);
				return (
					<span
						// biome-ignore lint/suspicious/noArrayIndexKey: fixed grid cells
						key={cell}
						className={cn(
							"size-[2px] rounded-full bg-current",
							step === -1 ? "opacity-15" : "working-dots__dot",
						)}
						style={
							step === -1
								? undefined
								: {
										animationDelay: `${(step / RING.length - 1) * DURATION_S}s`,
									}
						}
					/>
				);
			})}
		</span>
	);
}
