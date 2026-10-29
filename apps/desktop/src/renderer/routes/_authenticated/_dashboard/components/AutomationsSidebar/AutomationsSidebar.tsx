import type { RouterOutputs } from "@superset/trpc";
import { Button } from "@superset/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import { cn } from "@superset/ui/utils";
import { useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
	LuArrowUpRight,
	LuBot,
	LuClock,
	LuLayoutGrid,
	LuPencil,
	LuPlus,
	LuRotateCw,
} from "react-icons/lu";
import { useRecentProjects } from "renderer/hooks/host-projects/useRecentProjects";
import { useNow } from "renderer/hooks/useNow";
import { authClient } from "renderer/lib/auth-client";
import { cloudTrpc } from "renderer/lib/cloud-trpc";
import { useCreateAutomation } from "renderer/routes/_authenticated/_dashboard/automations/hooks/useCreateAutomation";
import { APP_CHASSIS_BG_CLASS } from "renderer/routes/_authenticated/_dashboard/components/WorkspaceSidebarPanel";
import { useFailedAutomations } from "renderer/routes/_authenticated/_dashboard/hooks/useFailedAutomations";
import { SidebarModeSwitch } from "../SidebarModeSwitch";
import { WorkItemsSearch } from "../WorkItemsSearch";
import { AutomationsSidebarRow } from "./components/AutomationsSidebarRow";
import { AutomationsSidebarSection } from "./components/AutomationsSidebarSection";

const ICON_BUTTON_CLASS =
	"flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-fill-hover hover:text-foreground";
const FOOTER_LINK_CLASS =
	"flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors";

type AutomationListItem = RouterOutputs["automation"]["list"][number];

function nextRunTime(automation: AutomationListItem): number {
	if (!automation.enabled || !automation.nextRunAt) return Infinity;
	return new Date(automation.nextRunAt).getTime() || Infinity;
}

export function AutomationsSidebar() {
	const navigate = useNavigate();
	const matchRoute = useMatchRoute();
	const [search, setSearch] = useState("");
	const { data: session } = authClient.useSession();
	const currentUserId = session?.user?.id;
	const { lastRunById, failedIds } = useFailedAutomations();
	const now = useNow(30_000);
	const recentProjects = useRecentProjects();
	const { createManually, createWithAgent, isCreatingManually } =
		useCreateAutomation();
	const {
		data: automations = [],
		isPending,
		isError,
		refetch,
	} = cloudTrpc.automation.list.useQuery(undefined, {
		refetchInterval: 60_000,
	});

	const detailMatch = matchRoute({ to: "/automations/$automationId" });
	const activeAutomationId =
		detailMatch !== false ? detailMatch.automationId : null;
	const onOverview = matchRoute({ to: "/automations" }) !== false;
	const onRuns = matchRoute({ to: "/automations/runs" }) !== false;

	const projectNameById = useMemo(
		() =>
			new Map(
				recentProjects.filter((p) => p != null).map((p) => [p.id, p.name]),
			),
		[recentProjects],
	);

	const sections = useMemo(() => {
		const query = search.trim().toLowerCase();
		const matching = [...automations]
			.filter((a) => !query || a.name.toLowerCase().includes(query))
			.sort(
				(a, b) =>
					nextRunTime(a) - nextRunTime(b) || a.name.localeCompare(b.name),
			);
		const mine = matching.filter(
			(a) => !currentUserId || a.ownerUserId === currentUserId,
		);
		return [
			{
				key: "failed",
				title: "En échec",
				dotClassName: "bg-red-500",
				items: mine.filter((a) => failedIds.has(a.id)),
			},
			{
				key: "active",
				title: "Actives",
				dotClassName: "bg-emerald-500",
				items: mine.filter((a) => a.enabled && !failedIds.has(a.id)),
			},
			{
				key: "paused",
				title: "En pause",
				dotClassName: "bg-muted-foreground/40",
				items: mine.filter((a) => !a.enabled && !failedIds.has(a.id)),
			},
			{
				key: "team",
				title: "Équipe",
				dotClassName: "bg-sky-500",
				defaultCollapsed: true,
				items: currentUserId
					? matching.filter((a) => a.ownerUserId !== currentUserId)
					: [],
			},
		].filter((section) => section.items.length > 0);
	}, [automations, search, currentUserId, failedIds]);

	return (
		<aside className={cn("flex h-full w-full flex-col", APP_CHASSIS_BG_CLASS)}>
			<header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/60 pr-2 pl-3">
				<SidebarModeSwitch />
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							title="Nouvelle automatisation"
							className={cn(
								ICON_BUTTON_CLASS,
								"data-[state=open]:bg-fill-selected data-[state=open]:text-foreground",
							)}
						>
							<LuPlus className="size-4" strokeWidth={1.5} />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="start"
						side="right"
						onCloseAutoFocus={(event) => event.preventDefault()}
					>
						<DropdownMenuItem onSelect={createWithAgent}>
							<LuBot className="size-4" />
							Créer avec un agent
						</DropdownMenuItem>
						<DropdownMenuItem
							onSelect={createManually}
							disabled={isCreatingManually}
						>
							<LuPencil className="size-4" />
							Créer manuellement
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</header>
			<div className="flex shrink-0 items-center border-b border-border/60 pr-1.5 pl-1">
				<WorkItemsSearch
					value={search}
					onChange={setSearch}
					placeholder="Rechercher…"
					label="Rechercher une automatisation"
					className="bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
				/>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-2">
				{isError && automations.length === 0 ? (
					<div className="flex flex-col items-center gap-3 px-4 pt-16 text-center">
						<p className="text-xs text-muted-foreground">
							Impossible de charger les automatisations.
						</p>
						<Button size="sm" variant="outline" onClick={() => refetch()}>
							<LuRotateCw className="size-3.5" />
							Réessayer
						</Button>
					</div>
				) : sections.length === 0 ? (
					isPending ? null : (
						<div className="flex flex-col items-center gap-3 px-4 pt-16 text-center">
							<div className="flex size-10 items-center justify-center rounded-full bg-foreground/[0.06]">
								<LuClock
									className="size-5 text-muted-foreground"
									strokeWidth={1.5}
								/>
							</div>
							<p className="text-xs text-muted-foreground">
								{search ? "Aucun résultat." : "Aucune automatisation."}
							</p>
						</div>
					)
				) : (
					<div className="flex flex-col gap-1.5">
						{sections.map((section) => (
							<AutomationsSidebarSection
								key={section.key}
								title={section.title}
								count={section.items.length}
								dotClassName={section.dotClassName}
								defaultCollapsed={section.defaultCollapsed}
							>
								{section.items.map((automation) => (
									<AutomationsSidebarRow
										key={automation.id}
										automation={automation}
										projectName={
											automation.v2ProjectId
												? projectNameById.get(automation.v2ProjectId)
												: undefined
										}
										lastRun={lastRunById.get(automation.id) ?? null}
										now={now}
										isActive={automation.id === activeAutomationId}
									/>
								))}
							</AutomationsSidebarSection>
						))}
					</div>
				)}
			</div>

			<footer className="flex shrink-0 items-center gap-1 border-t border-border/60 p-1.5">
				<button
					type="button"
					onClick={() => navigate({ to: "/automations" })}
					aria-current={onOverview ? "page" : undefined}
					className={cn(
						FOOTER_LINK_CLASS,
						onOverview
							? "bg-fill-selected text-foreground"
							: "text-muted-foreground hover:bg-fill-hover hover:text-foreground",
					)}
				>
					<LuLayoutGrid className="size-3.5" strokeWidth={1.5} />
					Vue d'ensemble
				</button>
				<button
					type="button"
					onClick={() =>
						navigate({ to: "/automations/runs", search: { scope: "mine" } })
					}
					aria-current={onRuns ? "page" : undefined}
					className={cn(
						FOOTER_LINK_CLASS,
						onRuns
							? "bg-fill-selected text-foreground"
							: "text-muted-foreground hover:bg-fill-hover hover:text-foreground",
					)}
				>
					Tous les runs
					<LuArrowUpRight className="size-3.5" strokeWidth={1.5} />
				</button>
			</footer>
		</aside>
	);
}
