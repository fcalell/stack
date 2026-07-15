import { beforeEach, describe, expect, it, vi } from "vitest";

// `expo-application` and `react-native` are native modules; mocking THEM is
// the legitimate seam per `.claude/playbooks/testing.md`, and the
// fetch-wrapper logic under test stays real. Both mocks read a mutable
// module-level value so each test can flip build/platform without
// re-mocking.
const nativeState = { buildVersion: "42" as string | null, platformOs: "ios" };

vi.mock("expo-application", () => ({
	get nativeBuildVersion() {
		return nativeState.buildVersion;
	},
}));

vi.mock("react-native", () => ({
	Platform: {
		get OS() {
			return nativeState.platformOs;
		},
	},
}));

import {
	CLIENT_BUILD_HEADER,
	CLIENT_PLATFORM_HEADER,
} from "../version-gate-shared";
import {
	createVersionGatedFetch,
	onUpdateRequired,
	versionHeaders,
} from "./index";

// The production signature is `typeof fetch` (required so the wrapper is
// assignable to `ClientConfig.fetch`), but the ambient `Request`/`fetch`
// globals resolve differently depending on whether "dom" or Node's own
// (undici-derived) lib types win in a given program: a well-known
// TypeScript ecosystem clash, unrelated to the runtime behavior under test.
// A loose structural type sidesteps it here without weakening the real
// module's exported type.
type FetchLike = (input: unknown, init?: unknown) => Promise<Response>;

beforeEach(() => {
	nativeState.buildVersion = "42";
	nativeState.platformOs = "ios";
});

describe("versionHeaders", () => {
	it("stamps both headers when build + platform are resolvable", () => {
		expect(versionHeaders()).toEqual({
			[CLIENT_BUILD_HEADER]: "42",
			[CLIENT_PLATFORM_HEADER]: "ios",
		});
	});

	it("returns {} when the build number is undetectable", () => {
		nativeState.buildVersion = null;
		expect(versionHeaders()).toEqual({});
	});

	it("returns {} on an unrecognised platform (e.g. web)", () => {
		nativeState.platformOs = "web";
		expect(versionHeaders()).toEqual({});
	});
});

function fakeBase(status: number, body: string | null = null) {
	return vi.fn(
		async (_input: unknown, _init?: unknown) => new Response(body, { status }),
	);
}

function gatedFetch(base: ReturnType<typeof fakeBase>): FetchLike {
	return createVersionGatedFetch(base as never) as unknown as FetchLike;
}

describe("createVersionGatedFetch", () => {
	it("stamps the version headers onto every outgoing request", async () => {
		const base = fakeBase(200);
		const fetch = gatedFetch(base);

		await fetch("https://api.example.com/rpc/todos");

		expect(base).toHaveBeenCalledTimes(1);
		const init = base.mock.calls[0]?.[1];
		const headers = new Headers((init as RequestInit | undefined)?.headers);
		expect(headers.get(CLIENT_BUILD_HEADER)).toBe("42");
		expect(headers.get(CLIENT_PLATFORM_HEADER)).toBe("ios");
	});

	it("preserves headers already present on a Request input", async () => {
		const base = fakeBase(200);
		const fetch = gatedFetch(base);
		const request = new Request("https://api.example.com/rpc/todos", {
			headers: { "content-type": "application/json" },
		});

		await fetch(request);

		const init = base.mock.calls[0]?.[1];
		const headers = new Headers((init as RequestInit | undefined)?.headers);
		expect(headers.get("content-type")).toBe("application/json");
		expect(headers.get(CLIENT_BUILD_HEADER)).toBe("42");
	});

	it("stamps no version headers when the build is undetectable", async () => {
		nativeState.buildVersion = null;
		const base = fakeBase(200);
		const fetch = gatedFetch(base);

		await fetch("https://api.example.com/rpc/todos");

		const init = base.mock.calls[0]?.[1];
		const headers = new Headers((init as RequestInit | undefined)?.headers);
		expect(headers.has(CLIENT_BUILD_HEADER)).toBe(false);
	});

	it("still returns the response when the build is undetectable", async () => {
		nativeState.buildVersion = null;
		const base = fakeBase(200, "ok");
		const fetch = gatedFetch(base);

		const response = await fetch("https://api.example.com/rpc/todos");
		expect(await response.text()).toBe("ok");
	});

	it("fires onUpdateRequired subscribers exactly once on a 426 response", async () => {
		const base = fakeBase(426);
		const fetch = gatedFetch(base);
		const cb = vi.fn();
		const unsubscribe = onUpdateRequired(cb);

		const response = await fetch("https://api.example.com/rpc/todos");

		expect(cb).toHaveBeenCalledTimes(1);
		expect(response.status).toBe(426);
		unsubscribe();
	});

	it("does not fire onUpdateRequired subscribers on a non-426 response", async () => {
		const base = fakeBase(200);
		const fetch = gatedFetch(base);
		const cb = vi.fn();
		const unsubscribe = onUpdateRequired(cb);

		await fetch("https://api.example.com/rpc/todos");

		expect(cb).not.toHaveBeenCalled();
		unsubscribe();
	});

	it("unsubscribe stops further notifications", async () => {
		const base = fakeBase(426);
		const fetch = gatedFetch(base);
		const cb = vi.fn();
		const unsubscribe = onUpdateRequired(cb);
		unsubscribe();

		await fetch("https://api.example.com/rpc/todos");

		expect(cb).not.toHaveBeenCalled();
	});
});
