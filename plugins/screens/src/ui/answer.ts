import { ORPCError } from "@orpc/client";
import {
	StandardRPCJsonSerializer,
	StandardRPCSerializer,
} from "@orpc/client/standard";
import { StandardRPCCodec } from "@orpc/server/standard";
import { toFetchResponse } from "@orpc/standard-server-fetch";
import { http } from "msw";

// What a screen's queries answer: the fixture's value, nothing yet, a failure,
// the collection with no items, or that the thing does not exist.
export type ScreenState = "data" | "loading" | "error" | "empty" | "notFound";

type Fixture = (input: unknown) => unknown;

// oRPC's own server codec, the one `RPCHandler` builds, so the envelope, the
// status and the headers are exactly what the client decodes in production.
const serializer = new StandardRPCSerializer(new StandardRPCJsonSerializer());
const codec = new StandardRPCCodec(serializer);

// `encode` takes the procedure it never reads.
const reply = (output: unknown) =>
	toFetchResponse(codec.encode(output, undefined as never));
const replyError = (error: ORPCError<string, unknown>) =>
	toFetchResponse(codec.encodeError(error));

function isFixture(value: unknown): value is Fixture {
	return typeof value === "function";
}

// The fixture of a procedure by its path under the router (`projects.list`).
export function findFixture(
	tree: unknown,
	path: readonly string[],
): Fixture | undefined {
	let node = tree;
	for (const key of path) {
		if (typeof node !== "object" || node === null) return undefined;
		node = (node as Record<string, unknown>)[key];
	}
	return isFixture(node) ? node : undefined;
}

// The same answer with no items, from the value alone: the browser holds the
// router's type and no schema. A collection answers `[]`, a page of
// `{ data, nextCursor }` its envelope with no rows, and any other value (a
// record) has no empty form and answers as it is.
export function emptyOf(value: unknown): unknown {
	if (Array.isArray(value)) return [];
	if (
		typeof value === "object" &&
		value !== null &&
		Array.isArray((value as { data?: unknown }).data) &&
		"nextCursor" in value
	) {
		return { ...value, data: [], nextCursor: null };
	}
	return value;
}

// A call's input, as oRPC sends it: a POST body, or a GET's `data` parameter.
async function inputOf(request: Request): Promise<unknown> {
	try {
		const raw =
			request.method === "GET"
				? new URL(request.url).searchParams.get("data")
				: await request.text();
		return raw ? serializer.deserialize(JSON.parse(raw)) : undefined;
	} catch {
		// A body that is no JSON (a file upload) reaches the fixture as no input.
		return undefined;
	}
}

// The procedure a request calls, from the path after the prefix.
export function procedurePath(url: string, prefix: string): string[] {
	const { pathname } = new URL(url);
	const at = pathname.indexOf(`${prefix}/`);
	return pathname
		.slice(at + prefix.length + 1)
		.split("/")
		.filter(Boolean)
		.map(decodeURIComponent);
}

// One call to a procedure, answered for the story's state. A state applies to
// a query, which stack's client sends as GET; a mutation (a POST) always
// answers from its fixture, as the story records. Loading never settles.
export async function answer(
	request: Request,
	prefix: string,
	tree: unknown,
	story: ScreenState,
): Promise<Response> {
	const state = request.method === "GET" ? story : "data";
	if (state === "loading") return new Promise<Response>(() => {});
	if (state === "error")
		return replyError(new ORPCError("INTERNAL_SERVER_ERROR"));
	if (state === "notFound") return replyError(new ORPCError("NOT_FOUND"));
	const path = procedurePath(request.url, prefix);
	const fixture = findFixture(tree, path);
	if (!fixture) {
		return replyError(
			new ORPCError("NOT_IMPLEMENTED", {
				message: `no fixture for ${path.join(".")}`,
			}),
		);
	}
	try {
		const output = fixture(await inputOf(request));
		return reply(state === "empty" ? emptyOf(output) : output);
	} catch (error) {
		// A fixture may throw the procedure's own error (`ApiError("NOT_FOUND")`).
		return replyError(
			error instanceof ORPCError
				? error
				: new ORPCError("INTERNAL_SERVER_ERROR", {
						message: error instanceof Error ? error.message : String(error),
					}),
		);
	}
}

// The handlers that answer the worker's prefixes for one story.
export function fixtureHandlers(
	prefixes: readonly string[],
	tree: unknown,
	state: ScreenState,
) {
	return prefixes.map((prefix) =>
		http.all(`*${prefix}/*`, ({ request }) =>
			answer(request, prefix, tree, state),
		),
	);
}

// A request no handler answered that must not reach the network: another
// origin's, or one under a prefix the worker owns. Anything else on the dev
// server's own origin is the host serving its modules.
export function mustBeMocked(
	url: string,
	origin: string,
	prefixes: readonly string[],
): boolean {
	const target = new URL(url);
	if (target.origin !== origin) return true;
	return prefixes.some(
		(prefix) =>
			target.pathname === prefix || target.pathname.startsWith(`${prefix}/`),
	);
}
