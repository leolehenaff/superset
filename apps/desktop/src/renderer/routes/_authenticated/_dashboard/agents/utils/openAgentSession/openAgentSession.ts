import type { useNavigate } from "@tanstack/react-router";
import type { AgentSession } from "renderer/routes/_authenticated/_dashboard/agents/hooks/useAgentSessions";
import { navigateToV2Workspace } from "renderer/routes/_authenticated/_dashboard/utils/workspace-navigation";

export function openAgentSession(
	session: AgentSession,
	navigate: ReturnType<typeof useNavigate>,
) {
	localStorage.setItem("lastViewedWorkspaceId", session.workspaceId);
	void navigateToV2Workspace(session.workspaceId, navigate, {
		search: {
			...(session.chatSessionId
				? { sessionId: session.chatSessionId }
				: { terminalId: session.terminalId }),
			focusRequestId: crypto.randomUUID(),
		},
	});
}
