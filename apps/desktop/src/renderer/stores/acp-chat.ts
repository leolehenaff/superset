import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

/** Null until the person sets it, and null means on. Read it through `useAcpChatEnabled`. */
interface AcpChatState {
	enabled: boolean | null;
	setEnabled: (enabled: boolean) => void;
}

export const useAcpChatStore = create<AcpChatState>()(
	devtools(
		persist(
			(set) => ({
				enabled: null,
				setEnabled: (enabled) => set({ enabled }),
			}),
			{ name: "acp-chat" },
		),
		{ name: "AcpChatStore" },
	),
);
