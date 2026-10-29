import { useMatchRoute, useNavigate } from "@tanstack/react-router";
import { LuSettings } from "react-icons/lu";
import { OfflineBadge } from "../OfflineBadge";

export function SidebarSettingsBar() {
	const navigate = useNavigate();
	const matchRoute = useMatchRoute();
	const onSettings = matchRoute({ to: "/settings", fuzzy: true }) !== false;

	return (
		<footer className="flex shrink-0 items-center gap-1 border-t border-border/60 p-1.5">
			<button
				type="button"
				onClick={() => navigate({ to: "/settings/account" })}
				aria-current={onSettings ? "page" : undefined}
				className="flex h-7 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-fill-hover hover:text-foreground"
			>
				<LuSettings className="size-3.5 shrink-0" strokeWidth={1.5} />
				Réglages
			</button>
			<OfflineBadge />
		</footer>
	);
}
