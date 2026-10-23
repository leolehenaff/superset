import { open, stat } from "node:fs/promises";
import type { AgentIdentityId } from "@superset/shared/agent-catalog";
import type { HostDb } from "../db";
import {
	costUsd,
	matchModelRate,
	type TokenCounts,
} from "../trpc/router/usage/history/pricing";
import { terminalHarnessSession } from "./harness-session-ref";
import { toSessionQuery } from "./harness-sessions/query";
import {
	HARNESS_SESSION_FILES,
	reportedSessionFile,
} from "./harness-sessions/transcript";

/** Context fill and conversation length of a terminal's agent session. */
export interface TerminalAgentSessionStats {
	terminalId: string;
	/** The harness's own name for the conversation, when it keeps one. */
	title: string | null;
	/** At API list prices, the same table as the Usage page. */
	costUsd: number;
	messageCount: number;
	contextUsed: number | null;
	contextSize: number | null;
	model: string | null;
	effort: string | null;
	/** When the user sent the prompt of the current turn. */
	turnStartedAt: number | null;
}

export interface Cursor {
	sessionId: string;
	agentId: string;
	path: string;
	offset: number;
	aiTitle: string | null;
	customTitle: string | null;
	costUsd: number;
	/** Claude writes one line per content block, all with the same usage. */
	lastMessageKey: string | null;
	lastMessageCost: number;
	model: string | null;
	effort: string | null;
	turnStartedAt: number | null;
	lastCodexUsage: string | null;
	messageCount: number;
	contextUsed: number | null;
	contextSize: number | null;
}

const CHUNK_BYTES = 4 * 1024 * 1024;
// ponytail: Claude transcripts name the model, not its context window.
// Haiku has 200k, Opus and Sonnet 1M in Claude Code; read the window from
// the transcript if Claude ever records it.
function claudeWindow(model: string | undefined): number {
	return model?.includes("haiku") ? 200_000 : 1_000_000;
}

/** One cursor per terminal: each poll reads only what the agent appended. */
const cursors = new Map<string, Cursor>();

function applyUsageLine(cursor: Cursor, agentId: string, line: string): void {
	try {
		if (agentId === "claude" && line.includes('"type":"user"')) {
			const event = JSON.parse(line);
			if (event?.type === "user") {
				const content = event.message?.content;
				const isPrompt =
					typeof content === "string" ||
					(Array.isArray(content) &&
						content.some((block) => block?.type === "text"));
				const at = Date.parse(event.timestamp);
				if (isPrompt && !event.isSidechain && !event.isMeta && at) {
					cursor.turnStartedAt = at;
				}
				return;
			}
		}
		if (agentId === "claude" && line.includes('"ai-title"')) {
			cursor.aiTitle = JSON.parse(line)?.aiTitle || cursor.aiTitle;
		} else if (agentId === "claude" && line.includes('"custom-title"')) {
			cursor.customTitle = JSON.parse(line)?.customTitle || cursor.customTitle;
		} else if (agentId === "claude" && line.includes('"usage"')) {
			const event = JSON.parse(line);
			const usage = event?.message?.usage;
			const model = event?.message?.model;
			if (!usage || !model || model === "<synthetic>") return;
			const write5m = usage.cache_creation?.ephemeral_5m_input_tokens ?? 0;
			const write1h = usage.cache_creation?.ephemeral_1h_input_tokens ?? 0;
			const tokens: TokenCounts = {
				uncachedInput: usage.input_tokens ?? 0,
				cachedInput: usage.cache_read_input_tokens ?? 0,
				// Older logs lack the 5m/1h split.
				cacheWrite5m:
					write5m + write1h > 0
						? write5m
						: (usage.cache_creation_input_tokens ?? 0),
				cacheWrite1h: write1h,
				output: usage.output_tokens ?? 0,
			};
			const cost = costUsd(
				matchModelRate(
					"claude",
					model,
					tokens.uncachedInput + tokens.cachedInput,
				),
				tokens,
			);
			// ponytail: dedupes consecutive lines only, as Claude writes them.
			const key = `${event.message.id ?? ""}|${event.requestId ?? ""}`;
			if (key !== "|" && key === cursor.lastMessageKey) {
				cursor.costUsd -= cursor.lastMessageCost;
			}
			cursor.costUsd += cost;
			cursor.lastMessageKey = key;
			cursor.lastMessageCost = cost;
			// Subagent turns cost money but run in their own context.
			if (event.isSidechain) return;
			cursor.model = model;
			if (typeof event.effort === "string") cursor.effort = event.effort;
			const used =
				tokens.uncachedInput +
				tokens.cachedInput +
				(usage.cache_creation_input_tokens ?? 0);
			if (used === 0) return;
			cursor.contextUsed = used;
			cursor.contextSize = claudeWindow(model);
		} else if (
			agentId === "codex" &&
			(line.includes('"turn_context"') || line.includes('"session_meta"'))
		) {
			const record = JSON.parse(line);
			const { model, effort } = record?.payload ?? {};
			if (typeof model === "string") cursor.model = model;
			if (typeof effort === "string") cursor.effort = effort;
			const at = Date.parse(record?.timestamp);
			if (record?.type === "turn_context" && at) cursor.turnStartedAt = at;
		} else if (agentId === "codex" && line.includes('"token_count"')) {
			const info = JSON.parse(line)?.payload?.info;
			const usage = info?.last_token_usage;
			if (!usage) return;
			cursor.contextUsed = usage.input_tokens ?? null;
			cursor.contextSize = info.model_context_window ?? null;
			// Codex sometimes re-emits the same token_count back to back.
			const signature = JSON.stringify(usage);
			if (signature === cursor.lastCodexUsage) return;
			cursor.lastCodexUsage = signature;
			const input = usage.input_tokens ?? 0;
			const cached = usage.cached_input_tokens ?? 0;
			cursor.costUsd += costUsd(
				matchModelRate("codex", cursor.model ?? "unknown", input),
				{
					uncachedInput: Math.max(0, input - cached),
					cachedInput: cached,
					cacheWrite5m: usage.cache_write_input_tokens ?? 0,
					cacheWrite1h: 0,
					output: usage.output_tokens ?? 0,
				},
			);
		}
	} catch {}
}

export async function advance(cursor: Cursor): Promise<void> {
	const { agentId } = cursor;
	const parseTurns =
		HARNESS_SESSION_FILES[agentId as AgentIdentityId]?.parseTurns;
	const { size } = await stat(cursor.path);
	if (size < cursor.offset) {
		// Rewritten in place: start over.
		cursor.offset = 0;
		cursor.aiTitle = null;
		cursor.customTitle = null;
		cursor.costUsd = 0;
		cursor.lastMessageKey = null;
		cursor.lastMessageCost = 0;
		cursor.model = null;
		cursor.effort = null;
		cursor.turnStartedAt = null;
		cursor.lastCodexUsage = null;
		cursor.messageCount = 0;
		cursor.contextUsed = null;
		cursor.contextSize = null;
	}
	if (size === cursor.offset) return;
	const handle = await open(cursor.path, "r");
	try {
		while (cursor.offset < size) {
			const length = Math.min(CHUNK_BYTES, size - cursor.offset);
			const buffer = Buffer.alloc(length);
			const { bytesRead } = await handle.read(buffer, 0, length, cursor.offset);
			const text = buffer.subarray(0, bytesRead).toString("utf8");
			// Only whole lines: the agent may be mid-write on the last one.
			const end = text.lastIndexOf("\n");
			if (end === -1) {
				if (bytesRead < CHUNK_BYTES) return;
				// A single line longer than a chunk: skip it whole.
				cursor.offset += bytesRead;
				continue;
			}
			const complete = text.slice(0, end + 1);
			cursor.offset += Buffer.byteLength(complete, "utf8");
			if (parseTurns) cursor.messageCount += parseTurns(complete).length;
			for (const line of complete.split("\n")) {
				if (line) applyUsageLine(cursor, agentId, line);
			}
		}
	} finally {
		await handle.close();
	}
}

/** Finds the session file again only when the terminal's session changed. */
function cursorFor(db: HostDb, terminalId: string): Cursor | null {
	const bound = terminalHarnessSession(db, terminalId);
	const resolved = bound && toSessionQuery(bound.ref);
	if (!bound || !resolved) return null;
	const existing = cursors.get(terminalId);
	// A /clear or resume binds the terminal to another session id.
	if (existing?.sessionId === resolved.query.sessionId) return existing;
	const files = HARNESS_SESSION_FILES[resolved.agentId as AgentIdentityId];
	const path =
		files &&
		(reportedSessionFile(bound.ref.reportedPath, resolved.query.sessionId) ??
			files.locate(resolved.query));
	if (!path) return null;
	const cursor: Cursor = {
		sessionId: resolved.query.sessionId,
		agentId: resolved.agentId,
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
	cursors.set(terminalId, cursor);
	return cursor;
}

/**
 * Stats for each live terminal agent session whose harness keeps a
 * transcript (Claude, Codex). Others are left out.
 */
export async function readTerminalAgentSessionStats(
	db: HostDb,
	terminalIds: string[],
): Promise<TerminalAgentSessionStats[]> {
	const live = new Set(terminalIds);
	for (const terminalId of cursors.keys()) {
		if (!live.has(terminalId)) cursors.delete(terminalId);
	}
	const results = await Promise.all(
		terminalIds.map(async (terminalId) => {
			try {
				const cursor = cursorFor(db, terminalId);
				if (!cursor) return null;
				await advance(cursor);
				return {
					terminalId,
					title: cursor.customTitle ?? cursor.aiTitle,
					costUsd: cursor.costUsd,
					messageCount: cursor.messageCount,
					contextUsed: cursor.contextUsed,
					contextSize: cursor.contextSize,
					model: cursor.model,
					effort: cursor.effort,
					turnStartedAt: cursor.turnStartedAt,
				};
			} catch {
				cursors.delete(terminalId);
				return null;
			}
		}),
	);
	return results.filter((result) => result !== null);
}
