import { AGENT_IDENTITY_LABELS } from "@superset/shared/agent-catalog";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { deriveTerminalAgentStatus } from "renderer/hooks/host-service/useTerminalAgentStatuses";
import { useKnownHosts } from "renderer/hooks/known-hosts/useKnownHosts";
import { useRelayUrl } from "renderer/hooks/useRelayUrl";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { derivePullRequestQueryTargets } from "renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/hooks/useDashboardSidebarData/derivePullRequestQueryTargets";
import { useAccessibleV2Workspaces } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/hooks/useAccessibleV2Workspaces";
import { DEVICE_FILTER_ALL_DEVICES } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/stores/v2WorkspacesFilterStore";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";
import { useV2NotificationStore } from "renderer/stores/v2-notifications";
import type { PaneStatus } from "shared/tabs-types";

export interface AgentSession {
	terminalId: string;
	workspaceId: string;
	workspaceName: string;
	branch: string;
	/** The title the agent gave its terminal, else the workspace name. */
	title: string;
	messageCount: number | null;
	/** At API list prices. */
	costUsd: number | null;
	contextUsed: number | null;
	contextSize: number | null;
	model: string | null;
	effort: string | null;
	turnStartedAt: number | null;
	projectName: string | null;
	projectIconUrl: string | null;
	hostName: string;
	/** Null while the host has no reachable URL. */
	hostUrl: string | null;
	isRemoteHost: boolean;
	agentId: string;
	agentLabel: string;
	status: PaneStatus;
	lastEventAt: number;
	subagentCount: number;
}

/**
 * Every live terminal agent session (Claude, Codex, ...) across all of the
 * user's hosts, one entry per terminal. Same host-wide query as the
 * workspaces board (shared cache key), polled faster since this view is
 * about live state.
 */
export function useAgentSessions(): {
	sessions: AgentSession[];
	isReady: boolean;
} {
	const { all: workspaces, isReady } = useAccessibleV2Workspaces({
		deviceFilter: DEVICE_FILTER_ALL_DEVICES,
	});
	const { machineId, activeHostUrl } = useLocalHostService();
	const relayUrl = useRelayUrl();
	const { hosts } = useKnownHosts();

	const liveWorkspaces = useMemo(
		() => workspaces.filter((workspace) => workspace.archivedAt == null),
		[workspaces],
	);

	const targets = useMemo(
		() =>
			derivePullRequestQueryTargets({
				activeHostUrl,
				hosts,
				machineId,
				relayUrl,
				workspaces: liveWorkspaces,
			}),
		[activeHostUrl, hosts, machineId, relayUrl, liveWorkspaces],
	);

	const queries = useQueries({
		queries: targets.map((target) => ({
			queryKey: [
				"v2-workspaces",
				"terminal-agents",
				target.organizationId,
				target.machineId,
			] as const,
			refetchInterval: 3_000,
			enabled: target.hostUrl !== null,
			queryFn: async () => {
				if (!target.hostUrl) return [];
				const client = getHostServiceClientByUrl(target.hostUrl);
				return client.terminalAgents.list.query();
			},
		})),
	});

	// Separate key: the board shares the bindings cache above. A remote host
	// on upstream Superset has no sessionStats, so it degrades to titles only.
	const detailQueries = useQueries({
		queries: targets.map((target) => ({
			queryKey: [
				"agents-view",
				"details",
				target.organizationId,
				target.machineId,
			] as const,
			refetchInterval: 3_000,
			enabled: target.hostUrl !== null,
			queryFn: async () => {
				if (!target.hostUrl) return { titles: [], stats: [] };
				const client = getHostServiceClientByUrl(target.hostUrl);
				const [titles, stats] = await Promise.all([
					client.terminal.list
						.query({})
						.then((result) => result.sessions)
						.catch(() => []),
					client.terminalAgents.sessionStats.query().catch(() => []),
				]);
				return { titles, stats };
			},
		})),
	});

	const terminalSeenAt = useV2NotificationStore(
		(state) => state.terminalSeenAt,
	);

	const sessions = useMemo(() => {
		const workspacesById = new Map(
			liveWorkspaces.map((workspace) => [workspace.id, workspace]),
		);
		const titles = new Map<string, string>();
		const stats = new Map<
			string,
			{
				title?: string | null;
				costUsd?: number;
				messageCount: number;
				contextUsed: number | null;
				contextSize: number | null;
				model?: string | null;
				effort?: string | null;
				turnStartedAt?: number | null;
			}
		>();
		for (const query of detailQueries) {
			for (const session of query.data?.titles ?? []) {
				// Claude prefixes its title with a status glyph (✳, spinner).
				const title = session.title?.replace(/^[^\p{L}\p{N}]+/u, "").trim();
				if (title) titles.set(session.terminalId, title);
			}
			for (const stat of query.data?.stats ?? []) {
				stats.set(stat.terminalId, stat);
			}
		}
		const result: AgentSession[] = [];
		for (const [index, query] of queries.entries()) {
			const hostUrl = targets[index]?.hostUrl ?? null;
			for (const binding of query.data ?? []) {
				// Ended sessions and ACP chat sessions are out of scope.
				if (binding.endedAt != null || binding.chatSessionId) continue;
				const workspace = workspacesById.get(binding.workspaceId);
				if (!workspace) continue;
				const stat = stats.get(binding.terminalId);
				result.push({
					terminalId: binding.terminalId,
					workspaceId: workspace.id,
					workspaceName: workspace.name || workspace.branch,
					branch: workspace.branch,
					title:
						stat?.title ??
						titles.get(binding.terminalId) ??
						(workspace.name || workspace.branch),
					messageCount: stat?.messageCount ?? null,
					costUsd: stat?.costUsd ?? null,
					contextUsed: stat?.contextUsed ?? null,
					contextSize: stat?.contextSize ?? null,
					model: stat?.model ?? null,
					effort: stat?.effort ?? null,
					turnStartedAt: stat?.turnStartedAt ?? null,
					projectName: workspace.projectName,
					projectIconUrl: workspace.projectIconUrl,
					hostName: workspace.hostName,
					hostUrl,
					isRemoteHost: workspace.hostType !== "local-device",
					agentId: binding.agentId,
					agentLabel:
						AGENT_IDENTITY_LABELS[
							binding.agentId as keyof typeof AGENT_IDENTITY_LABELS
						] ?? binding.agentId,
					status: deriveTerminalAgentStatus({
						lastEventType: binding.lastEventType,
						lastEventAt: binding.lastEventAt,
						lastSeenAt: terminalSeenAt[binding.terminalId],
					}),
					lastEventAt: binding.lastEventAt,
					subagentCount: binding.subagents?.length ?? 0,
				});
			}
		}
		return result.sort((a, b) => b.lastEventAt - a.lastEventAt);
	}, [queries, detailQueries, liveWorkspaces, terminalSeenAt, targets]);

	return { sessions, isReady };
}
