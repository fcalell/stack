import { vi } from "vitest";
import type { RegisterContext } from "#lib/create-plugin";

// Shared test helper for building a mock RegisterContext. Accepts partial
// overrides plus `options`; callers don't have to rebuild the whole ctx just
// to tweak `cwd`, `hasPlugin`, or stub a prompt.
//
// The generic stubs below use `never` as the resolved value so they satisfy
// any generic caller (`never` is assignable to every type) without using
// `any` or lint suppressions.
export function createMockCtx<T = Record<string, never>>(
	overrides: Partial<RegisterContext<T>> & { options?: T } = {},
): RegisterContext<T> {
	return {
		cwd: "/tmp/test",
		options: {} as T,
		app: {
			name: "test-app",
			domain: "example.com",
		},
		hasPlugin: () => false,
		readFile: vi.fn(async () => ""),
		fileExists: vi.fn(async () => false),
		log: {
			info: vi.fn(),
			warn: vi.fn(),
			success: vi.fn(),
			error: vi.fn(),
		},
		prompt: {
			text: vi.fn(async () => ""),
			confirm: vi.fn(async () => false),
			select: vi.fn(async () => undefined as never),
			multiselect: vi.fn(async () => [] as never[]),
		},
		...overrides,
	};
}
