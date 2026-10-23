import { describe, expect, it } from "bun:test";
import { appendFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { advance, type Cursor } from "./session-stats";

const line = (event: unknown) => `${JSON.stringify(event)}\n`;

describe("advance", () => {
	it("counts turns and keeps the last main-thread context, incrementally", async () => {
		const path = join(mkdtempSync(join(tmpdir(), "stats-")), "s.jsonl");
		writeFileSync(
			path,
			line({
				type: "user",
				timestamp: "2026-10-23T10:00:00.000Z",
				message: { role: "user", content: "salut" },
			}) +
				line({
					type: "assistant",
					requestId: "r1",
					effort: "medium",
					message: {
						id: "m1",
						role: "assistant",
						content: [{ type: "text", text: "ok" }],
						model: "claude-opus-5-5",
						usage: { input_tokens: 10, cache_read_input_tokens: 990 },
					},
				}),
		);
		const cursor: Cursor = {
			sessionId: "s",
			agentId: "claude",
			path,
			offset: 0,
			aiTitle: null,
			customTitle: null,
			costUsd: 0,
			lastMessageKey: null,
			lastMessageCost: 0,
			model: null,
			effort: null,
			turnStartedAt: null,
			lastCodexUsage: null,
			messageCount: 0,
			contextUsed: null,
			contextSize: null,
		};
		await advance(cursor);
		expect(cursor.messageCount).toBe(2);
		expect(cursor.contextUsed).toBe(1000);
		expect(cursor.contextSize).toBe(1_000_000);
		// Opus 5.5: 10 input at $4/M + 990 cache reads at $0.2/M.
		expect(cursor.costUsd).toBeCloseTo(0.000238, 9);
		expect(cursor.model).toBe("claude-opus-5-5");
		expect(cursor.effort).toBe("medium");
		expect(cursor.turnStartedAt).toBe(Date.parse("2026-10-23T10:00:00.000Z"));

		appendFileSync(
			path,
			line({
				type: "assistant",
				isSidechain: true,
				message: { usage: { input_tokens: 5 } },
			}) +
				line({ type: "ai-title", aiTitle: "Fork Superset" }) +
				line({
					type: "user",
					timestamp: "2026-10-23T10:05:00.000Z",
					message: { content: [{ type: "tool_result", content: "x" }] },
				}) +
				'{"type":"user","mess',
		);
		await advance(cursor);
		expect(cursor.messageCount).toBe(2);
		expect(cursor.contextUsed).toBe(1000);
		expect(cursor.aiTitle).toBe("Fork Superset");
		expect(cursor.turnStartedAt).toBe(Date.parse("2026-10-23T10:00:00.000Z"));
	});
});
