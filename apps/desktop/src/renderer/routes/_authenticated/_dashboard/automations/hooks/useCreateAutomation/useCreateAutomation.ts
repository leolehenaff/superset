import { useLingui } from "@lingui/react/macro";
import { i18n } from "@superset/i18n";
import { toast } from "@superset/ui/sonner";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { GATED_FEATURES, usePaywall } from "renderer/components/Paywall";
import { useRecentProjects } from "renderer/hooks/host-projects/useRecentProjects";
import { useCreateAgentSession } from "renderer/hooks/useCreateAgentSession";
import { useV2AgentChoices } from "renderer/hooks/useV2AgentChoices";
import { apiTrpcClient } from "renderer/lib/api-trpc-client";
import { cloudTrpc } from "renderer/lib/cloud-trpc";
import { AGENT_STORAGE_KEY } from "renderer/routes/_authenticated/components/DashboardNewWorkspaceModal/components/DashboardNewWorkspaceForm/PromptGroup/types";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";
import type { AutomationTemplate } from "../../templates";
import {
	matchAgentChoice,
	portableAgentValue,
} from "../../utils/agentIdentity";

// Seeds the "Create with AI" agent session. The skill is provisioned as
// superset:automate; mentioning it by name loads it (it isn't in the chat
// slash-command allowlist).
const AUTOMATION_AGENT_PROMPT =
	"Help me create a Superset automation. Use the superset:automate skill if it's available, otherwise the `superset` CLI (start with `superset automations --help`). Ask me what the automation should do and what should fire it — a schedule, or an event like a Slack message, GitHub pull request, or Linear issue. Confirm that, the target project, and the agent, then create the automation and trigger a first run so we can review the result together.";

const DEFAULT_TIMEZONE =
	Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export function useCreateAutomation() {
	const { t } = useLingui();
	const navigate = useNavigate();
	const utils = cloudTrpc.useUtils();
	const recentProjects = useRecentProjects();
	const { machineId, activeHostUrl } = useLocalHostService();
	const { agents: agentChoices } = useV2AgentChoices(activeHostUrl);
	const { createSession, isPending: isCreatingWithAgent } =
		useCreateAgentSession();
	// Automations are Pro. Creating, running, and resuming go through the
	// paywall; the server refuses the same three.
	const { gateFeature, hasAccess, isReady: planReady } = usePaywall();
	const showProBadge = planReady && !hasAccess(GATED_FEATURES.AUTOMATIONS);

	// Cursor-style creation: no dialog. It writes an untitled automation with
	// no triggers and opens its detail page, which is the editor; a template
	// pre-fills name/prompt/schedule the same way.
	const createMutation = useMutation({
		mutationFn: (template: AutomationTemplate | null) => {
			const stored = window.localStorage.getItem(AGENT_STORAGE_KEY);
			// Template preference first (iconId is a legacy fallback, as in the
			// old dialog), then the last-used agent, then the first host agent.
			const choice =
				(template?.agentType
					? (matchAgentChoice(agentChoices, template.agentType) ??
						agentChoices.find((option) => option.iconId === template.agentType))
					: null) ??
				(stored ? matchAgentChoice(agentChoices, stored) : null) ??
				agentChoices[0];
			if (!choice) throw new Error("No agent available yet");
			return apiTrpcClient.automation.create.mutate({
				name: template
					? i18n._(template.name)
					: t({
							message: "Untitled",
						}),
				prompt: template?.prompt ?? "",
				// Preset slug when unambiguous — instance UUIDs die when the host's
				// agent-config table is re-seeded, orphaning the automation.
				agent: portableAgentValue(agentChoices, choice),
				targetHostId: machineId ?? null,
				v2ProjectId: recentProjects.find((p) => p != null)?.id ?? null,
				...(template?.rrule
					? { rrule: template.rrule, timezone: DEFAULT_TIMEZONE }
					: { triggers: [] }),
			});
		},
		onSuccess: (result) => {
			void utils.automation.list.invalidate();
			void navigate({
				to: "/automations/$automationId",
				params: { automationId: result.id },
			});
		},
		onError: (error) => {
			// Raw Postgres errors are multi-line SQL dumps — keep the first line.
			const message =
				error instanceof Error ? error.message.split("\n")[0]?.trim() : null;
			toast.error(
				message ||
					t({
						message: "Failed to create automation",
					}),
			);
		},
	});

	const createFromTemplate = (template: AutomationTemplate) => {
		if (createMutation.isPending) return;
		gateFeature(GATED_FEATURES.AUTOMATIONS, () =>
			createMutation.mutate(template),
		);
	};

	const createManually = () => {
		if (createMutation.isPending) return;
		gateFeature(GATED_FEATURES.AUTOMATIONS, () => createMutation.mutate(null));
	};

	const createWithAgent = () => {
		if (isCreatingWithAgent) return;
		gateFeature(
			GATED_FEATURES.AUTOMATIONS,
			() => void createSession(AUTOMATION_AGENT_PROMPT),
		);
	};

	return {
		createFromTemplate,
		createManually,
		createWithAgent,
		isCreatingManually: createMutation.isPending,
		isCreatingWithAgent,
		showProBadge,
	};
}
