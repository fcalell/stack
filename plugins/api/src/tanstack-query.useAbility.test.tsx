// @vitest-environment happy-dom
//
// WS6.3 (docs/prd/backend-hardening.md) render-level coverage for the React
// `useAbility` hook (item 10, PRD WS6.3 test bullet) — everything else in
// this plugin exercises the framework-agnostic core (`ability-client.ts`,
// `composeAbility`) directly; this file is the one place that actually
// mounts a React component tree via `@testing-library/react` + happy-dom to
// prove the hook itself (not just its core) behaves: deny-all while the
// org-rules query is in flight, granting once it resolves, and a stable
// ability instance across a re-render with unchanged rules.
import { packRules } from "@casl/ability/extra";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerApiClient } from "./ability-client";
import { createClient } from "./client";
import { createQueryClient, useAbility } from "./tanstack-query";
import type { Procedure } from "./types";

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

beforeEach(() => {
	registerApiClient(undefined);
});

afterEach(() => {
	registerApiClient(undefined);
});

describe("useAbility (React render, WS6.3)", () => {
	it("denies all before the org-rules query resolves, then grants once it resolves", async () => {
		let resolveFetch!: (response: Response) => void;
		const pending = new Promise<Response>((resolve) => {
			resolveFetch = resolve;
		});

		createClient<FakeRouter>({
			url: "https://api.example.com/rpc",
			fetch: (() => pending) as unknown as typeof globalThis.fetch,
		});

		const queryClient = createQueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		const wrapper = ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);

		const { result } = renderHook(() => useAbility(), { wrapper });

		// The org-rules query is still in flight -- deny-all, never a false
		// positive.
		expect(result.current.can("update", "organization")).toBe(false);

		resolveFetch(
			jsonResponse({
				rules: packRules([{ action: "update", subject: "organization" }]),
			}),
		);

		await waitFor(() => {
			expect(result.current.can("update", "organization")).toBe(true);
		});
	});

	it("returns the same ability instance across a re-render when the underlying rules haven't changed", async () => {
		createClient<FakeRouter>({
			url: "https://api.example.com/rpc",
			fetch: (async () =>
				jsonResponse({
					rules: packRules([{ action: "update", subject: "organization" }]),
				})) as unknown as typeof globalThis.fetch,
		});

		const queryClient = createQueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		const wrapper = ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);

		const { result, rerender } = renderHook(() => useAbility(), { wrapper });

		await waitFor(() => {
			expect(result.current.can("update", "organization")).toBe(true);
		});
		const firstAbility = result.current;

		rerender();

		expect(result.current).toBe(firstAbility);
	});
});
