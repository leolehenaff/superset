import { describe, expect, test } from "bun:test";
import type { AccessibleV2Workspace } from "renderer/routes/_authenticated/_dashboard/v2-workspaces/hooks/useAccessibleV2Workspaces";
import { compareWorkspacesBy } from "./sortWorkspaces";

function make(
	overrides: Partial<
		Pick<
			AccessibleV2Workspace,
			"name" | "createdAt" | "lastAgentEventAt" | "resources"
		>
	>,
): AccessibleV2Workspace {
	return {
		name: "ws",
		createdAt: new Date(0),
		lastAgentEventAt: null,
		diffStats: null,
		resources: null,
		...overrides,
	} as AccessibleV2Workspace;
}

describe("compareWorkspacesBy", () => {
	test("activity: newest agent event first, creation as the fallback", () => {
		const rows = [
			make({ name: "old", createdAt: new Date(1_000) }),
			make({ name: "busy", createdAt: new Date(500), lastAgentEventAt: 9_000 }),
			make({ name: "new", createdAt: new Date(5_000) }),
		].sort(compareWorkspacesBy("activity"));
		expect(rows.map((row) => row.name)).toEqual(["busy", "new", "old"]);
	});

	test("created: newest first regardless of agent activity", () => {
		const rows = [
			make({ name: "a", createdAt: new Date(1), lastAgentEventAt: 9_000 }),
			make({ name: "b", createdAt: new Date(2) }),
		].sort(compareWorkspacesBy("created"));
		expect(rows.map((row) => row.name)).toEqual(["b", "a"]);
	});

	test("name: case-insensitive, ties broken by activity", () => {
		const rows = [
			make({ name: "bravo" }),
			make({ name: "Alpha", lastAgentEventAt: 1 }),
			make({ name: "alpha", lastAgentEventAt: 2 }),
		].sort(compareWorkspacesBy("name"));
		expect(rows.map((row) => row.name)).toEqual(["alpha", "Alpha", "bravo"]);
	});

	test("resources: heaviest first, idle rows last by activity", () => {
		const rows = [
			make({ name: "idle-old", createdAt: new Date(1) }),
			make({
				name: "light",
				createdAt: new Date(3),
				resources: { cpu: 50, memory: 100 },
			}),
			make({ name: "idle-new", createdAt: new Date(2) }),
			make({
				name: "heavy",
				createdAt: new Date(0),
				resources: { cpu: 1, memory: 900 },
			}),
		].sort(compareWorkspacesBy("resources"));
		expect(rows.map((row) => row.name)).toEqual([
			"heavy",
			"light",
			"idle-new",
			"idle-old",
		]);
	});
});
