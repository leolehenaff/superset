import { cn } from "@superset/ui/utils";
import { useNavigate } from "@tanstack/react-router";
import {
	type UsageAccount,
	useHostUsageQuota,
} from "renderer/hooks/host-service/useHostUsageQuota";
import { useNow } from "renderer/hooks/useNow";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";
import { formatResetIn } from "renderer/utils/usage/formatResetIn";

const SESSION_WINDOWS = [
	{ agent: "claude", label: "Claude", windowId: "five_hour" },
	{ agent: "codex", label: "Codex", windowId: "primary" },
] as const;

function pickAccount(
	accounts: UsageAccount[],
	agent: UsageAccount["agent"],
): UsageAccount | null {
	const ofAgent = accounts.filter((account) => account.agent === agent);
	return ofAgent.find((account) => account.isDefault) ?? ofAgent[0] ?? null;
}

function barColor(usedPercent: number): string {
	if (usedPercent >= 90) return "bg-red-500";
	if (usedPercent >= 70) return "bg-amber-500";
	return "bg-emerald-500";
}

export function SessionQuotaBars() {
	const navigate = useNavigate();
	const { activeHostUrl } = useLocalHostService();
	const { data: accounts = [] } = useHostUsageQuota(activeHostUrl ?? null);
	const now = useNow(30_000);

	const bars = SESSION_WINDOWS.flatMap(({ agent, label, windowId }) => {
		const account = pickAccount(accounts, agent);
		const window = account?.windows.find((w) => w.id === windowId);
		return window ? [{ agent, label, window }] : [];
	});
	if (bars.length === 0) return null;

	return (
		<button
			type="button"
			onClick={() => navigate({ to: "/settings/usage" })}
			className="flex items-center gap-5 rounded-md px-2 py-1 transition-colors hover:bg-fill-hover"
		>
			{bars.map(({ agent, label, window }) => (
				<div key={agent} className="flex w-44 flex-col gap-1 text-left">
					<div className="flex items-baseline justify-between text-xs">
						<span className="font-medium">{label} · 5h</span>
						<span className="tabular-nums text-muted-foreground">
							{window.usedPercent}%
							{window.resetsAt
								? ` · ${formatResetIn(new Date(window.resetsAt), now)}`
								: ""}
						</span>
					</div>
					<div className="h-1.5 overflow-hidden rounded-full bg-muted">
						<div
							className={cn(
								"h-full rounded-full",
								barColor(window.usedPercent),
							)}
							style={{ width: `${Math.min(window.usedPercent, 100)}%` }}
						/>
					</div>
				</div>
			))}
		</button>
	);
}
