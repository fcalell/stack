import { packRules } from "@casl/ability/extra";
import { registerApiClient } from "@fcalell/plugin-api/ability-client";
import { createClient } from "@fcalell/plugin-api/client";
import type { Procedure } from "@fcalell/plugin-api/types";
import { QueryClient, QueryClientContext } from "@tanstack/solid-query";
import { createRoot } from "solid-js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useAbility } from "./ability";

// WS6.3 (docs/prd/backend-hardening.md) render-level coverage for the Solid
// `useAbility` primitive (item 10, PRD WS6.3 test bullet). No
// `@solidjs/testing-library` is installed in this repo, and `useAbility`
// itself only needs a real reactive owner + a `QueryClientContext` value to
// run -- `QueryClientContext.Provider` is a plain Solid component (a
// function), so it can be invoked directly (no JSX) inside `createRoot`, with
// `children` passed as a getter so Solid resolves it lazily inside the
// Provider's own reactive scope (the same mechanism `<Context.Provider>`
// JSX desugars to -- see `solid-js`'s `createProvider`).

type FakeRouter = {
	auth: {
		orgRules: Procedure<Record<string, unknown>, { rules: unknown[] }>;
	};
};

function jsonResponse(body: unknown, init?: ResponseInit) {
	return new Response(JSON.stringify({ json: body }), {
		...init,
		headers: { "content-type": "application/json", ...init?.headers },
	});
}

// Runs `fn` inside a real reactive root with `client` provided via
// `QueryClientContext`, the same context `@tanstack/solid-query`'s
// `useQueryClient` reads. Returns the accessor `fn` produced plus a
// disposer -- the reactive graph `useAbility`/`useQuery` build stays alive
// (so its resource keeps updating) until `dispose()` is called.
function renderWithClient<T>(
	client: QueryClient,
	fn: () => T,
): { result: T; dispose: () => void } {
	let result!: T;
	let dispose!: () => void;
	createRoot((d) => {
		dispose = d;
		QueryClientContext.Provider({
			value: () => client,
			get children() {
				result = fn();
				return undefined;
			},
		});
	});
	return { result, dispose };
}

async function flush(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 0));
}

async function waitUntil(
	predicate: () => boolean,
	{ timeoutMs = 1000 }: { timeoutMs?: number } = {},
): Promise<void> {
	const start = Date.now();
	while (!predicate()) {
		if (Date.now() - start > timeoutMs) {
			throw new Error("waitUntil: condition never became true");
		}
		await flush();
	}
}

beforeEach(() => {
	registerApiClient(undefined);
});

afterEach(() => {
	registerApiClient(undefined);
});

describe("useAbility (Solid render, WS6.3)", () => {
	it("denies all before the org-rules query resolves, then grants once it resolves", async () => {
		let resolveFetch!: (response: Response) => void;
		const pending = new Promise<Response>((resolve) => {
			resolveFetch = resolve;
		});

		createClient<FakeRouter>({
			url: "https://api.example.com/rpc",
			fetch: (() => pending) as unknown as typeof globalThis.fetch,
		});

		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		const { result: ability, dispose } = renderWithClient(queryClient, () =>
			useAbility(),
		);

		try {
			expect(ability().can("update", "organization")).toBe(false);

			resolveFetch(
				jsonResponse({
					rules: packRules([{ action: "update", subject: "organization" }]),
				}),
			);

			await waitUntil(() => ability().can("update", "organization"));
		} finally {
			dispose();
		}
	});

	it("returns the same ability instance across separate calls when the underlying rules haven't changed", async () => {
		createClient<FakeRouter>({
			url: "https://api.example.com/rpc",
			fetch: (async () =>
				jsonResponse({
					rules: packRules([{ action: "update", subject: "organization" }]),
				})) as unknown as typeof globalThis.fetch,
		});

		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		const { result: ability, dispose } = renderWithClient(queryClient, () =>
			useAbility(),
		);

		try {
			await waitUntil(() => ability().can("update", "organization"));
			const first = ability();
			const second = ability();
			expect(second).toBe(first);
		} finally {
			dispose();
		}
	});
});
