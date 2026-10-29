import { toast } from "@superset/ui/sonner";
import { cn } from "@superset/ui/utils";
import type { ReactNode } from "react";
import { LuGitBranch, LuGitPullRequest } from "react-icons/lu";
import { useCopyToClipboard } from "renderer/hooks/useCopyToClipboard";
import {
	type OpenPullRequestPane,
	openPullRequestLink,
} from "renderer/lib/github/openPullRequestLink";
import { projectStripeColor } from "renderer/routes/_authenticated/_dashboard/agents/utils/sessionVisuals";
import { WindowChrome } from "renderer/routes/_authenticated/_dashboard/components/WindowChrome";
import { V2WorkspaceProjectIcon } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/components/V2WorkspaceProjectIcon";
import {
	useAccessibleV2Workspaces,
	type V2WorkspacePrState,
} from "renderer/routes/_authenticated/_dashboard/v2-workspaces/hooks/useAccessibleV2Workspaces";
import { useWorkspace } from "../../../providers/WorkspaceProvider";
import { WorkspaceHeaderAgents } from "./components/WorkspaceHeaderAgents";
import { WorkspaceHeaderPorts } from "./components/WorkspaceHeaderPorts";

const PR_STATE_CLASS: Record<V2WorkspacePrState, string> = {
	open: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
	draft: "text-muted-foreground bg-foreground/[0.06]",
	queued: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
	merged: "text-violet-600 dark:text-violet-400 bg-violet-500/10",
	closed: "text-red-600 dark:text-red-400 bg-red-500/10",
};

const CHIP_CLASS =
	"no-drag flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-[11px] transition-colors";

interface WorkspaceHeaderProps {
	onOpenPullRequest: OpenPullRequestPane;
	actions: ReactNode;
}

export function WorkspaceHeader({
	onOpenPullRequest,
	actions,
}: WorkspaceHeaderProps) {
	const { workspace } = useWorkspace();
	const { all } = useAccessibleV2Workspaces();
	const row = all.find((candidate) => candidate.id === workspace.id);
	const { copyToClipboard } = useCopyToClipboard();

	const name = row?.name || workspace.name || workspace.branch;
	const branch = row?.branch ?? workspace.branch;
	const projectId = row?.projectId ?? workspace.projectId;
	const accent = projectId ? projectStripeColor(projectId) : null;
	const pr = row?.pr ?? null;
	const diff = row?.diffStats;
	const hasDiff = !!diff && (diff.additions > 0 || diff.deletions > 0);

	const copyBranch = async () => {
		try {
			await copyToClipboard(branch);
			toast.success(`Branche copiée : ${branch}`);
		} catch {
			toast.error("Impossible de copier la branche");
		}
	};

	return (
		<header
			className="drag relative flex h-12 shrink-0 items-center gap-2.5 pr-3 shadow-[inset_0_-1px_0_var(--border)]"
			style={
				accent
					? {
							backgroundImage: `linear-gradient(to right, color-mix(in srgb, ${accent} 14%, transparent), transparent 55%)`,
						}
					: undefined
			}
		>
			<WindowChrome />
			{accent ? (
				<span
					aria-hidden
					className="absolute top-0 bottom-0 left-0 w-[3px]"
					style={{ backgroundColor: accent }}
				/>
			) : null}
			<div className="flex min-w-0 items-center gap-2.5 pl-3">
				<V2WorkspaceProjectIcon
					projectName={row?.projectName ?? name}
					iconUrl={row?.projectIconUrl ?? null}
					size="md"
					className="shrink-0 rounded-md"
				/>
				<div className="flex min-w-0 flex-col leading-tight">
					<span className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
						{row?.projectName ?? "Workspace"}
					</span>
					<span className="truncate text-sm font-semibold text-foreground">
						{name}
					</span>
				</div>
			</div>
			<button
				type="button"
				onClick={copyBranch}
				title="Copier le nom de la branche"
				className={cn(
					CHIP_CLASS,
					"min-w-0 bg-foreground/[0.06] font-mono text-muted-foreground hover:bg-fill-hover hover:text-foreground",
				)}
			>
				<LuGitBranch className="size-3 shrink-0" />
				<span className="max-w-56 truncate">{branch}</span>
			</button>
			{pr ? (
				<button
					type="button"
					onClick={() => openPullRequestLink(pr.url, null, onOpenPullRequest)}
					title={pr.title}
					className={cn(
						CHIP_CLASS,
						"font-medium hover:opacity-80",
						PR_STATE_CLASS[pr.state],
					)}
				>
					<LuGitPullRequest className="size-3 shrink-0" />#{pr.prNumber}
				</button>
			) : null}
			{hasDiff ? (
				<span
					className="shrink-0 font-mono text-[11px] tabular-nums"
					title={`${diff.fileCount} fichiers modifiés`}
				>
					<span className="text-emerald-600/80 dark:text-emerald-400/70">
						+{diff.additions}
					</span>{" "}
					<span className="text-red-600/80 dark:text-red-400/70">
						−{diff.deletions}
					</span>
				</span>
			) : null}
			<div className="min-w-4 flex-1" />
			<WorkspaceHeaderAgents workspaceId={workspace.id} />
			<WorkspaceHeaderPorts workspaceId={workspace.id} />
			<div className="no-drag shrink-0">{actions}</div>
		</header>
	);
}
