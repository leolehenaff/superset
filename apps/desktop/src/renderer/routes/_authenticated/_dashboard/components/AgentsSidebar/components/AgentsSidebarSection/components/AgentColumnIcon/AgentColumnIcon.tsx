import { LuCircleX } from "react-icons/lu";
import { BoardColumnIcon } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/components/BoardColumnIcon";
import type { PaneStatus } from "shared/tabs-types";

export function AgentColumnIcon({ status }: { status: PaneStatus }) {
	switch (status) {
		case "permission":
			return <BoardColumnIcon column="attention" />;
		case "failed":
			return <LuCircleX className="size-3.5 text-red-500" />;
		case "working":
		case "review":
			return <BoardColumnIcon column={status} />;
		default:
			return <BoardColumnIcon column="idle" />;
	}
}
