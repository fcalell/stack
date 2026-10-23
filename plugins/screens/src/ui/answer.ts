import { ORG_RULES_PATH, SCOPE_ROUTES_PATH } from "@fcalell/plugin-api/wire";
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

// The routes the api and auth plugins serve for the frame: the scope lookup of the
// organization or project the URL names and the caller's rules in it. A story
// forces the state of the screen's reads; the scope is always found (a missing one
// is the `$org` route's own story), whoever supplies the fixture.
function isFrameRoute(path: readonly string[]): boolean {
	const under = (route: readonly string[]) =>
		route.every((key, at) => path[at] === key);
	return under(SCOPE_ROUTES_PATH) || under(ORG_RULES_PATH);
}

function isFixture(value: unknown): value is Fixture {
	return typeof value === "function";
}

// The fixture of a procedure by its path under the router (`projects.list`),
// from the app's tree, then from each plugin's, so the app overrides a plugin's
// answer per procedure. `plugin` tells whose it is.
export function findFixture(
	app: unknown,
	plugins: readonly unknown[],
	path: readonly string[],
): { fixture: Fixture; plugin: boolean } | undefined {
	const trees = [app, ...plugins];
	for (const [index, tree] of trees.entries()) {
		let node = tree;
		for (const key of path) {
			if (typeof node !== "object" || node === null) {
				node = undefined;
				break;
			}
			node = (node as Record<string, unknown>)[key];
		}
		if (isFixture(node)) return { fixture: node, plugin: index > 0 };
	}
	return undefined;
}

// The same answer with no items, from the value alone: the browser holds the
// router's type and no schema. A collection answers `[]`, a page of
// `{ data, nextCursor }` its envelope with no rows, and any other object is
// walked (never into arrays): every array in it becomes `[]`, and a JSON Schema
// object schema (`type: "object"` and an object `properties`) has its
// `properties`, the keyed collection of its fields, emptied to `{}`. The rest is kept.
// A plain object has `Object.prototype` or none; a `Date`, a `Map` or a class
// instance is a value and stays as it is.
const isPlain = (value: unknown): value is Record<string, unknown> => {
	if (typeof value !== "object" || value === null) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
};

export function emptyOf(value: unknown): unknown {
	if (Array.isArray(value)) return [];
	if (!isPlain(value)) return value;
	if (Array.isArray(value.data) && "nextCursor" in value)
		return { ...value, data: [], nextCursor: null };
	const schema = value.type === "object" && isPlain(value.properties);
	return Object.fromEntries(
		Object.entries(value).map(([key, item]) => [
			key,
			schema && key === "properties" ? {} : emptyOf(item),
		]),
	);
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

// The procedures a story's queries call, in the order they first did, since
// the last `holdCalls`. The run finds a screen's reads by watching: nothing
// declares them, and a dependent or ambient read shows up like any other.
const seen = new Map<string, readonly string[]>();

export function called(): readonly (readonly string[])[] {
	return [...seen.values()];
}

// The one procedure whose queries fail in a "data" story, every other still
// answering its fixture: the run's way to draw a screen with a single read
// failed. `holdCalls` takes it off.
let failed: string | undefined;

export function failing(path: readonly string[] | undefined): void {
	failed = path?.join(".");
}

// What the fixtures could not answer since the last `holdCalls`: a procedure
// with no fixture, or a fixture that threw other than the procedure's own
// error. The screen draws either as a failed read, so the test run fails the
// story on it rather than judge an error form as the state asked for.
const gaps = new Set<string>();

export function fixtureGaps(): readonly string[] {
	return [...gaps];
}

// The loading state holds its calls on this promise. Nothing releases it in the
// workbench, so a Loading story stays waiting; the test run releases it to
// measure the loaded form of the same screen, and holds again before the next
// story. A release stays open, so the reads that follow the first ones (a
// query that waits on another's answer) are answered too.
let hold = Promise.resolve();
let open = () => {};

export function holdCalls(): void {
	hold = new Promise<void>((resolve) => {
		open = resolve;
	});
	seen.clear();
	gaps.clear();
	failed = undefined;
}

holdCalls();

// Answers the calls held, and the ones after, as data.
export function release(): void {
	open();
}

// One call to a procedure, answered for the story's state. A state applies to
// a query, which stack's client sends as GET; a mutation (a POST), a
// frame route (`isFrameRoute`) and a procedure a plugin's fixture module answers (the frame's precondition, such
// as the session, not the screen's read) always answer from their fixture, as
// the story records. Loading holds a query until `release`, then answers it as
// data.
export async function answer(
	request: Request,
	prefix: string,
	app: unknown,
	plugins: readonly unknown[],
	story: ScreenState,
): Promise<Response> {
	const path = procedurePath(request.url, prefix);
	const found = findFixture(app, plugins, path);
	const owned = found?.plugin || isFrameRoute(path);
	let state =
		request.method === "GET" && !owned ? story : ("data" as ScreenState);
	if (request.method === "GET") {
		seen.set(path.join("."), path);
		if (state === "data" && !owned && failed === path.join("."))
			state = "error";
	}
	if (state === "loading") {
		await hold;
		state = "data";
	}
	if (state === "error")
		return replyError(new ORPCError("INTERNAL_SERVER_ERROR"));
	if (state === "notFound") return replyError(new ORPCError("NOT_FOUND"));
	if (!found) {
		const message = `no fixture for ${path.join(".")}`;
		gaps.add(message);
		return replyError(new ORPCError("NOT_IMPLEMENTED", { message }));
	}
	try {
		const output = found.fixture(await inputOf(request));
		return reply(state === "empty" ? emptyOf(output) : output);
	} catch (error) {
		// A fixture may throw the procedure's own error (`ApiError("NOT_FOUND")`).
		if (error instanceof ORPCError) return replyError(error);
		const message = error instanceof Error ? error.message : String(error);
		gaps.add(`the fixture for ${path.join(".")} threw: ${message}`);
		return replyError(new ORPCError("INTERNAL_SERVER_ERROR", { message }));
	}
}

// A channel's fixture, by the channel's name: it takes the route params of the
// fixtures, since the `sub` frame carries none.
export type ChannelFixture = (params: Record<string, string>) => unknown;

// The frame plugin-node's server sends and its client decodes (`ServerFrame`,
// `serverFrameSchema`). A channel has no frame of its own for its opening: it
// is one of its server messages, "snapshot" by the `channelRead` convention.
export interface ChannelFrame {
	t: "msg";
	ch: string;
	type: string;
	payload: unknown;
}

// A fixture names the opening message with `{ type, payload }` (exactly those
// two keys, a string type); any other value is the payload of "snapshot".
function opening(value: unknown): { type: string; payload: unknown } {
	if (isPlain(value)) {
		const keys = Object.keys(value);
		if (
			keys.length === 2 &&
			keys.includes("type") &&
			keys.includes("payload") &&
			typeof value.type === "string"
		)
			return { type: value.type, payload: value.payload };
	}
	return { type: "snapshot", payload: value };
}

// What the socket does on a subscribe: sends the opening frame, closes (the
// error state), or sends nothing (a gap). The protocol has no error frame and
// no not-found frame: a channel read fails only when its fold throws on a
// message type the app defines, which no fixture can name, or when the socket
// is down. So error closes the socket, which the client backs off from and,
// after `PAUSE_AFTER`, pauses the channel's read for; not found answers the
// snapshot as data.
export type ChannelAnswer =
	| { send: ChannelFrame; close?: undefined }
	| { send?: undefined; close: boolean };

// One subscribe, answered for the story's state. Loading holds the frame until
// `release`, as it holds a query.
export async function channelAnswer(
	channel: string,
	channels: Record<string, ChannelFixture> | undefined,
	params: Record<string, string>,
	state: ScreenState,
): Promise<ChannelAnswer> {
	if (state === "error") return { close: true };
	const fixture = channels?.[channel];
	if (!fixture) return gap(`no fixture for channel ${channel}`);
	if (state === "loading") await hold;
	try {
		const { type, payload } = opening(fixture(params));
		return {
			send: {
				t: "msg",
				ch: channel,
				type,
				payload: state === "empty" ? emptyOf(payload) : payload,
			},
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return gap(`the fixture for channel ${channel} threw: ${message}`);
	}
}

// A subscribe left unanswered: one gap, one console error (the floors fail the
// story on either).
function gap(message: string): ChannelAnswer {
	if (!gaps.has(message)) {
		gaps.add(message);
		console.error(message);
	}
	return { close: false };
}

// The story on screen, for the socket's one handler: a handler module is
// static and a socket belongs to the story that opened it. A story sets it as
// it renders.
interface Story {
	channels: Record<string, ChannelFixture> | undefined;
	params: Record<string, string>;
	state: ScreenState;
}

let story: Story = { channels: undefined, params: {}, state: "data" };

export function setStory(next: Story): void {
	story = next;
}

export function currentStory(): Story {
	return story;
}

// The handlers that answer the worker's prefixes for one story.
export function fixtureHandlers(
	prefixes: readonly string[],
	app: unknown,
	plugins: readonly unknown[],
	state: ScreenState,
) {
	return prefixes.map((prefix) =>
		http.all(`*${prefix}/*`, ({ request }) =>
			answer(request, prefix, app, plugins, state),
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
