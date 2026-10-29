import { cn } from "@superset/ui/utils";
import { type ReactNode, useState } from "react";
import { LuChevronRight } from "react-icons/lu";

interface AutomationsSidebarSectionProps {
	title: string;
	count: number;
	dotClassName: string;
	defaultCollapsed?: boolean;
	children: ReactNode;
}

export function AutomationsSidebarSection({
	title,
	count,
	dotClassName,
	defaultCollapsed = false,
	children,
}: AutomationsSidebarSectionProps) {
	const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

	return (
		<section className="rounded-lg p-1">
			<button
				type="button"
				onClick={() => setIsCollapsed((collapsed) => !collapsed)}
				aria-expanded={!isCollapsed}
				className="group flex w-full items-center gap-2 rounded-md px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
			>
				<span className={cn("size-1.5 shrink-0 rounded-full", dotClassName)} />
				{title}
				<span className="rounded-full bg-foreground/[0.07] px-1.5 text-[10px] tabular-nums normal-case tracking-normal">
					{count}
				</span>
				<LuChevronRight
					className={cn(
						"ml-auto size-3 opacity-0 transition-all group-hover:opacity-100",
						!isCollapsed && "rotate-90",
					)}
				/>
			</button>
			{isCollapsed ? null : (
				<div className="mt-0.5 flex flex-col gap-0.5">{children}</div>
			)}
		</section>
	);
}
