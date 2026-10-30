import { cn } from "@superset/ui/utils";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
	LuArrowDownRight,
	LuArrowUpRight,
	LuCoins,
	LuCpu,
	LuDatabaseZap,
} from "react-icons/lu";
import {
	getPresetIcon,
	useIsDarkTheme,
} from "renderer/assets/app-icons/preset-icons";
import {
	type UsageAccount,
	useHostUsageQuota,
} from "renderer/hooks/host-service/useHostUsageQuota";
import { useNow } from "renderer/hooks/useNow";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";
import { formatTokens } from "renderer/routes/_authenticated/settings/usage/components/UsageHistorySection/utils/formatUsage";
import { hostUsageHistoryOptions } from "renderer/routes/_authenticated/settings/usage/hooks/useHostUsageHistory";
import { formatResetIn } from "renderer/utils/usage/formatResetIn";

const USAGE_RANGES = [7, 30] as const;
// Each fetch scans GBs of transcript logs on the host: refresh rarely, never on focus.
const SIDEBAR_HISTORY_STALE_MS = 15 * 60 * 1000;

const SESSION_WINDOWS = [
	{ agent: "claude", label: "Claude · 5h", windowId: "five_hour" },
	{ agent: "claude", label: "Claude · semaine", windowId: "seven_day" },
	{ agent: "codex", label: "Codex · 5h", windowId: "primary" },
] as const;

function pickAccount(
	accounts: UsageAccount[],
	agent: UsageAccount["agent"],
): UsageAccount | null {
	const ofAgent = accounts.filter((account) => account.agent === agent);
	return ofAgent.find((account) => account.isDefault) ?? ofAgent[0] ?? null;
}

type PeriodChange = { tokens: number | null; usd: number | null };

/** Change of the last `days` buckets against the `days` before them. */
function periodChangeOf(
	buckets: { tokens: number; usd: number }[],
	days: number,
): PeriodChange {
	const sum = (slice: typeof buckets, key: "tokens" | "usd") =>
		slice.reduce((total, bucket) => total + bucket[key], 0);
	const previous = buckets.slice(0, -days);
	const current = buckets.slice(-days);
	const change = (key: "tokens" | "usd") => {
		const before = sum(previous, key);
		return before > 0 ? sum(current, key) / before - 1 : null;
	};
	return { tokens: change("tokens"), usd: change("usd") };
}

/** Tiles for the range; `null` totals give loading tiles with no value. */
function rangeStatsOf(
	totals: {
		tokens: number;
		usd: number;
		uncachedInput: number;
		cachedInput: number;
		cacheWrite: number;
	} | null,
	change: PeriodChange | null,
) {
	const observedInput = totals
		? totals.uncachedInput + totals.cachedInput + totals.cacheWrite
		: 0;
	const cachedShare =
		totals && observedInput > 0 ? totals.cachedInput / observedInput : 0;
	return [
		{
			label: "Tokens",
			icon: LuCpu,
			value: totals ? formatTokens(totals.tokens) : null,
			change: change?.tokens ?? null,
		},
		{
			label: "Cache",
			icon: LuDatabaseZap,
			value: totals ? `${Math.round(cachedShare * 100)} %` : null,
			ratio: totals ? cachedShare : undefined,
			change: null,
		},
		{
			label: "Coût",
			icon: LuCoins,
			value: totals
				? `${totals.usd >= 100 ? Math.round(totals.usd) : totals.usd.toFixed(2)} $`
				: null,
			change: change?.usd ?? null,
		},
	];
}

function barColor(usedPercent: number): string {
	if (usedPercent >= 90) return "bg-red-500";
	if (usedPercent >= 70) return "bg-amber-500";
	return "bg-emerald-500";
}

export function SessionQuotaBars({ stacked = false }: { stacked?: boolean }) {
	const navigate = useNavigate();
	const { activeHostUrl } = useLocalHostService();
	const { data: accounts = [] } = useHostUsageQuota(activeHostUrl ?? null);
	const now = useNow(30_000);
	const isDark = useIsDarkTheme();
	const [days, setDays] = useState<(typeof USAGE_RANGES)[number]>(7);
	const historyHostUrl = stacked ? (activeHostUrl ?? null) : null;
	const historyQuery = useQuery({
		...hostUsageHistoryOptions(historyHostUrl, days),
		staleTime: SIDEBAR_HISTORY_STALE_MS,
		refetchOnWindowFocus: false,
	});
	const withPreviousQuery = useQuery({
		...hostUsageHistoryOptions(historyHostUrl, days * 2),
		staleTime: SIDEBAR_HISTORY_STALE_MS,
		refetchOnWindowFocus: false,
	});
	// The shared options keep the previous range's data as placeholder: never show it as this range.
	const history = historyQuery.data?.days === days ? historyQuery.data : null;
	const change =
		withPreviousQuery.data?.days === days * 2
			? periodChangeOf(withPreviousQuery.data.buckets, days)
			: null;
	const rangeStats =
		history || historyQuery.isFetching
			? rangeStatsOf(history?.totals ?? null, change)
			: null;

	const bars = SESSION_WINDOWS.flatMap(({ agent, label, windowId }) => {
		const account = pickAccount(accounts, agent);
		const window = account?.windows.find((w) => w.id === windowId);
		return window ? [{ agent, label, windowId, window }] : [];
	});
	if (bars.length === 0 && !rangeStats) return null;

	return (
		<div className={cn("flex", stacked ? "w-full flex-col gap-1" : "")}>
			{rangeStats ? (
				<div className="flex items-center justify-between px-2 pt-1">
					<span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
						{days} derniers jours
					</span>
					<div className="flex rounded-md bg-foreground/[0.05] p-0.5 ring-1 ring-border/40 ring-inset">
						{USAGE_RANGES.map((range) => (
							<button
								key={range}
								type="button"
								aria-pressed={days === range}
								onClick={() => setDays(range)}
								className={cn(
									"h-5 rounded-[5px] px-2 text-[10px] tabular-nums transition-colors",
									days === range
										? "bg-background font-medium text-foreground shadow-sm ring-1 ring-border"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								{range}j
							</button>
						))}
					</div>
				</div>
			) : null}
			<button
				type="button"
				onClick={() => navigate({ to: "/settings/usage" })}
				className={cn(
					"group flex rounded-lg px-1.5 transition-colors hover:bg-fill-hover",
					stacked ? "w-full flex-col gap-2.5 py-2" : "items-center gap-5 py-1",
				)}
			>
				{rangeStats ? (
					<div className="grid w-full grid-cols-3 gap-1.5 text-left">
						{rangeStats.map(({ label, icon: Icon, value, ratio, change }) => (
							<div
								key={label}
								className="relative flex min-w-0 flex-col gap-0.5 overflow-hidden rounded-lg bg-foreground/[0.04] px-2 py-1.5 ring-1 ring-border/40 ring-inset"
							>
								<span className="flex items-center gap-1 text-[10px] text-muted-foreground">
									<Icon className="size-3 shrink-0" strokeWidth={1.75} />
									<span className="truncate">{label}</span>
									{change !== null ? (
										<span
											title={`vs les ${days} jours précédents`}
											className={cn(
												"ml-auto flex shrink-0 items-center tabular-nums",
												change >= 0
													? "text-amber-500/90"
													: "text-emerald-500/90",
											)}
										>
											{change >= 0 ? (
												<LuArrowUpRight className="size-2.5" />
											) : (
												<LuArrowDownRight className="size-2.5" />
											)}
											{Math.abs(Math.round(change * 100))}%
										</span>
									) : null}
								</span>
								{value === null ? (
									<span className="my-[5px] h-2.5 w-3/4 animate-pulse rounded bg-foreground/[0.08]" />
								) : (
									<span className="truncate text-[13px] font-semibold tabular-nums leading-5">
										{value}
									</span>
								)}
								{ratio !== undefined ? (
									<span
										aria-hidden
										className="absolute bottom-0 left-0 h-0.5 bg-emerald-500/70"
										style={{ width: `${ratio * 100}%` }}
									/>
								) : null}
							</div>
						))}
					</div>
				) : null}
				{bars.length > 0 ? (
					<div
						className={cn(
							"flex text-left",
							stacked ? "w-full flex-col gap-2 px-0.5" : "items-center gap-5",
						)}
					>
						{bars.map(({ agent, label, windowId, window }) => (
							<div
								key={`${agent}:${windowId}`}
								className={cn(
									"flex flex-col gap-1",
									stacked ? "w-full" : "w-44",
								)}
							>
								<div className="flex items-center justify-between gap-2 text-[11px]">
									<span className="flex min-w-0 items-center gap-1.5 text-foreground/80">
										<img
											src={getPresetIcon(agent, isDark)}
											alt=""
											className="size-3 shrink-0 object-contain"
										/>
										<span className="truncate">{label}</span>
									</span>
									<span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
										<span className="font-medium text-foreground/80">
											{window.usedPercent} %
										</span>
										{window.resetsAt
											? ` · ${formatResetIn(new Date(window.resetsAt), now)}`
											: ""}
									</span>
								</div>
								<div className="h-1 overflow-hidden rounded-full bg-foreground/[0.08]">
									<div
										className={cn(
											"h-full rounded-full",
											barColor(window.usedPercent),
										)}
										style={{
											width: `${Math.max(2, Math.min(window.usedPercent, 100))}%`,
										}}
									/>
								</div>
							</div>
						))}
					</div>
				) : null}
			</button>
		</div>
	);
}
