import { useCallback } from "react";
import { useAcpChatStore } from "renderer/stores/acp-chat";

export function useAcpChatEnabled(): boolean {
	return useAcpChatStore((state) => state.enabled) !== false;
}

export function useResolveAcpChatEnabled(): () => Promise<boolean> {
	return useCallback(
		() => Promise.resolve(useAcpChatStore.getState().enabled !== false),
		[],
	);
}
