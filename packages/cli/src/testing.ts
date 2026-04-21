import { vi } from "vitest";
import type {
	PluginRuntimeEntry,
	RegisterContext,
	RuntimePayload,
} from "#lib/create-plugin";

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
		plugin: "test",
		discoveredPlugins: [],
		hasPlugin: () => false,
		template: (name: string) => new URL(`file:///tmp/test/templates/${name}`),
		scaffold: (name: string, target: string) => ({
			source: new URL(`file:///tmp/test/templates/${name}`),
			target,
			plugin: "test",
		}),
		readFile: vi.fn(async () => ""),
		fileExists: vi.fn(async () => false),
		// Default mock runtime helper: find-or-create a trivial entry for "test".
		// Real plugins get this stamped by createPlugin; tests that exercise a
		// plugin via `plugin.cli.register(...)` get the plugin-scoped helper
		// automatically. This default is just for direct-ctx tests.
		runtime: (p: RuntimePayload): PluginRuntimeEntry => {
			const existing = p.pluginRuntimes.find((r) => r.plugin === "test");
			if (existing) return existing;
			const entry: PluginRuntimeEntry = {
				plugin: "test",
				import: { source: "test/runtime", default: "testRuntime" },
				identifier: "testRuntime",
				options: {},
			};
			p.pluginRuntimes.push(entry);
			return entry;
		},
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
