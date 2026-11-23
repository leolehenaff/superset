import { Spinner } from "@superset/ui/spinner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useHostWorkspaces } from "renderer/routes/_authenticated/providers/HostWorkspacesProvider";

export const Route = createFileRoute("/_authenticated/_dashboard/workspace/")({
	component: WorkspaceIndexPage,
});

function WorkspaceIndexPage() {
	const navigate = useNavigate();
	const { workspaces, isReady } = useHostWorkspaces();

	useEffect(() => {
		const lastViewedId = localStorage.getItem("lastViewedWorkspaceId");
		const lastViewed = workspaces.find(
			(workspace) => workspace.id === lastViewedId,
		);
		if (!lastViewed && !isReady) return;
		const target =
			lastViewed ??
			workspaces.reduce<(typeof workspaces)[number] | undefined>(
				(latest, workspace) =>
					(workspace.lastActivityAt ?? 0) > (latest?.lastActivityAt ?? -1)
						? workspace
						: latest,
				undefined,
			);
		if (target) {
			navigate({
				to: "/workspace/$workspaceId",
				params: { workspaceId: target.id },
				replace: true,
			});
		} else {
			navigate({ to: "/new-workspace", replace: true });
		}
	}, [workspaces, isReady, navigate]);

	return (
		<div className="flex h-full w-full items-center justify-center">
			<Spinner className="size-5" />
		</div>
	);
}
