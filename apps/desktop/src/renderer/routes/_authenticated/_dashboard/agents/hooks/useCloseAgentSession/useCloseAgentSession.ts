import { chatTransportFromTrpc } from "@superset/chat/client";
import type { ChatRouter } from "@superset/chat-runtime";
import { toast } from "@superset/ui/sonner";
import { useQueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { getHostServiceHeaders } from "renderer/lib/host-service-auth";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import type { AgentSession } from "renderer/routes/_authenticated/_dashboard/agents/hooks/useAgentSessions";
import { markChatSessionClosed } from "renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/utils/closedChatSessions";
import { closeTerminalPanes } from "renderer/routes/_authenticated/components/GlobalPaneLayoutRequests/hooks/usePaneLayoutRequests";
import { useCollections } from "renderer/routes/_authenticated/providers/CollectionsProvider";

async function closeChatSession(hostUrl: string, sessionId: string) {
	const reopen = markChatSessionClosed(sessionId);
	try {
		const client = createTRPCClient<ChatRouter>({
			links: [
				httpBatchLink({
					url: `${hostUrl}/chat-v3/trpc`,
					headers: () => getHostServiceHeaders(hostUrl),
				}),
			],
		});
		await chatTransportFromTrpc(client).closeSession({ sessionId });
	} catch (error) {
		reopen();
		throw error;
	}
}

export function useCloseAgentSession() {
	const queryClient = useQueryClient();
	const collections = useCollections();

	return async (session: AgentSession) => {
		if (!session.hostUrl) return;
		try {
			if (session.chatSessionId) {
				await closeChatSession(session.hostUrl, session.chatSessionId);
			} else {
				await getHostServiceClientByUrl(
					session.hostUrl,
				).terminal.killSession.mutate({
					terminalId: session.terminalId,
					workspaceId: session.workspaceId,
				});
			}
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
