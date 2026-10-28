import { toast } from "@superset/ui/sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import type { AgentSession } from "renderer/routes/_authenticated/_dashboard/agents/hooks/useAgentSessions";
import { closeTerminalPanes } from "renderer/routes/_authenticated/components/GlobalPaneLayoutRequests/hooks/usePaneLayoutRequests";
import { useCollections } from "renderer/routes/_authenticated/providers/CollectionsProvider";

export function useCloseAgentSession() {
	const queryClient = useQueryClient();
	const collections = useCollections();

	return async (session: AgentSession) => {
		if (!session.hostUrl) return;
		try {
			await getHostServiceClientByUrl(
				session.hostUrl,
			).terminal.killSession.mutate({
				terminalId: session.terminalId,
				workspaceId: session.workspaceId,
			});
			closeTerminalPanes(collections, session.workspaceId, session.terminalId);
			await queryClient.invalidateQueries({
				queryKey: ["v2-workspaces", "terminal-agents"],
			});
		} catch (error) {
			toast.error("Impossible de fermer l’agent", {
				description: error instanceof Error ? error.message : undefined,
			});
		}
	};
}
