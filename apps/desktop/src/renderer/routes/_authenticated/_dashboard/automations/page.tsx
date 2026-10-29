import { Trans, useLingui } from "@lingui/react/macro";
import { COMPANY } from "@superset/shared/constants";
import { Button } from "@superset/ui/button";
import { Skeleton } from "@superset/ui/skeleton";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LuTerminal, LuX } from "react-icons/lu";
import { cloudTrpc } from "renderer/lib/cloud-trpc";
import { FeatureHeader } from "renderer/routes/_authenticated/_dashboard/components/FeatureHeader";
import { PageHeader } from "renderer/routes/_authenticated/_dashboard/components/PageHeader";
import { AutomationStatCards } from "./components/AutomationStatCards";
import { AutomationsEmptyState } from "./components/AutomationsEmptyState";
import { useCreateAutomation } from "./hooks/useCreateAutomation";

export const Route = createFileRoute("/_authenticated/_dashboard/automations/")(
	{
		component: AutomationsPage,
	},
);

function AutomationsPage() {
	const { t } = useLingui();
	const navigate = useNavigate();
	const [cliHintDismissed, setCliHintDismissed] = useState(false);
	const {
		createFromTemplate,
		createManually,
		createWithAgent,
		isCreatingManually,
		isCreatingWithAgent,
		showProBadge,
	} = useCreateAutomation();

	const { data: automations = [], isPending: automationsPending } =
		cloudTrpc.automation.list.useQuery(undefined, {
			refetchInterval: 60_000,
		});
	// Org-wide on purpose: the cards describe the org's automation health and
	// link into the org-wide All runs views.
	const { data: orgRunStats } = cloudTrpc.automation.orgRunStats.useQuery(
		undefined,
		{ staleTime: 30_000 },
	);
	const orgEmpty = !automationsPending && automations.length === 0;

	return (
		<div className="flex h-full w-full flex-1 flex-col overflow-hidden">
			<PageHeader />

			<div className="min-h-0 flex-1 overflow-y-auto">
				<div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-8 pt-4 pb-12">
					<FeatureHeader
						title={<Trans>Automations</Trans>}
						docsUrl={`${COMPANY.DOCS_URL}/automations`}
						onCreate={createWithAgent}
						isCreating={isCreatingWithAgent}
						showCreate={false}
					/>

					{!orgEmpty && (
						<div className="mt-5">
							{automationsPending ? (
								<div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
									{["a", "b", "c", "d", "e"].map((key) => (
										<Skeleton key={key} className="h-[70px] w-full" />
									))}
								</div>
							) : (
								<AutomationStatCards
									totalAutomations={automations.length}
									succeeded7d={orgRunStats?.succeeded ?? 0}
									failed7d={orgRunStats?.failed ?? 0}
									missed7d={orgRunStats?.missed ?? 0}
									buckets={orgRunStats?.buckets ?? []}
									onShowFailed={() =>
										navigate({
											to: "/automations/runs",
											search: { status: "failed", scope: "all" },
										})
									}
									onShowMissed={() =>
										navigate({
											to: "/automations/runs",
											search: { status: "missed", scope: "all" },
										})
									}
									onShowHistory={() =>
										navigate({
											to: "/automations/runs",
											search: { scope: "all" },
										})
									}
								/>
							)}
						</div>
					)}

					<div className="flex flex-1 flex-col py-6">
						<AutomationsEmptyState
							onSelectTemplate={createFromTemplate}
							onCreateWithAgent={createWithAgent}
							isCreating={isCreatingWithAgent}
							onCreateManually={createManually}
							isCreatingManually={isCreatingManually}
							showProBadge={showProBadge}
						/>
					</div>

					{!cliHintDismissed && !orgEmpty && (
						<div className="relative mt-4 flex items-center gap-2.5 rounded-lg border border-border/60 px-3 py-2 pr-9">
							<LuTerminal className="size-3.5 shrink-0 text-muted-foreground" />
							<p className="min-w-0 truncate text-xs text-muted-foreground">
								<Trans>
									Tell any agent to use the{" "}
									<code className="select-text cursor-text rounded bg-accent/60 px-1 py-0.5 font-mono text-[11px] text-foreground">
										superset
									</code>{" "}
									CLI to spin up workspaces, run tasks, or manage automations.
								</Trans>{" "}
								<a
									href={`${COMPANY.DOCS_URL}/cli/getting-started`}
									target="_blank"
									rel="noreferrer"
									className="font-medium text-foreground underline underline-offset-2 hover:text-foreground/80"
								>
									<Trans>CLI docs</Trans>
								</a>
							</p>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								onClick={() => setCliHintDismissed(true)}
								aria-label={t({
									message: "Dismiss",
								})}
								className="absolute right-1.5 top-1/2 size-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
							>
								<LuX className="size-3.5" />
							</Button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
