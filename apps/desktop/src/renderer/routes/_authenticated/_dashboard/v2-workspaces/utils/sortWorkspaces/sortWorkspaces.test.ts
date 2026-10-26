import { describe, expect, test } from "bun:test";
import type { AccessibleV2Workspace } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/hooks/useAccessibleV2Workspaces";
import { compareWorkspaces } from "./sortWorkspaces";

function workspace(
	name: string,
	createdAt: number,
	resources: AccessibleV2Workspace["resources"],
): AccessibleV2Workspace {
	return {
		name,
		createdAt: new Date(createdAt),
		lastAgentEventAt: null,
		diffStats: null,
		resources,
	} as AccessibleV2Workspace;
}

describe("compareWorkspaces", () => {
	test("resources puts the heaviest first and idle rows last, by activity", () => {
		const idleOld = workspace("idle-old", 1, null);
		const idleNew = workspace("idle-new", 2, null);
		const light = workspace("light", 3, { cpu: 50, memory: 100 });
		const heavy = workspace("heavy", 0, { cpu: 1, memory: 900 });
		const sorted = [idleOld, light, idleNew, heavy].sort((a, b) =>
			compareWorkspaces(a, b, "resources"),
		);
		expect(sorted.map((w) => w.name)).toEqual([
			"heavy",
			"light",
			"idle-new",
			"idle-old",
		]);
	});
});
