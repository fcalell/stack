import { vi } from "vitest";
import { generateFromConfig } from "#commands/generate";
import type { AppConfig, StackConfig } from "#config";
import {
	buildGraphFromConfig,
	buildGraphFromDiscovered,
	type CollectedPlugin,
} from "#lib/build-graph";
import type { PluginFactory } from "#lib/create-plugin";
import type { DiscoveredPlugin } from "#lib/discovery";
import { StackError } from "#lib/errors";
import type { Graph } from "#lib/graph";
import type { ContributionCtx, Slot } from "#lib/slots";

// Shared test helper for building a mock ContributionCtx. Accepts partial
// overrides plus `options`; callers don't have to rebuild the whole ctx
// just to tweak `cwd` or stub a file lookup.
export function createMockCtx<T = Record<string, never>>(
	overrides: Partial<ContributionCtx> & { options?: T } = {},
): ContributionCtx {
	return {
		cwd: "/tmp/test",
		options: (overrides.options ?? ({} as T)) as unknown,
		app: {
			name: "test-app",
			domain: "example.com",
		},
		template: (name: string) => new URL(`file:///tmp/test/templates/${name}`),
		scaffold: (name: string, target: string) => ({
			source: new URL(`file:///tmp/test/templates/${name}`),
			target,
			plugin: "test",
		}),
		readFile: vi.fn(async () => ""),
		fileExists: vi.fn(async () => false),
		resolve: <U>(_slot: Slot<U>): Promise<U> => {
			throw new StackError(
				"ctx.resolve() called on a createMockCtx() ContributionCtx. " +
					"Build a real graph with buildGraph(...) or pass a `resolve` override.",
				"CONTRIBUTION_CTX_NO_RESOLVE",
			);
		},
		log: {
			info: vi.fn(),
			warn: vi.fn(),
			success: vi.fn(),
			error: vi.fn(),
		},
		...overrides,
	};
}

export interface GenerateResult {
	files: Array<{ path: string; content: string }>;
	postWrite: Array<() => Promise<void>>;
	sorted: Array<{ name: string }>;
}

// Drives the real `generateFromConfig` path — any test that asserts on
// generated artifacts should route through here. `writeToDisk` defaults to
// false so tests stay hermetic; flip it when you want a real on-disk check.
export async function runStackGenerate(opts: {
	config: StackConfig;
	cwd?: string;
	writeToDisk?: boolean;
	nonInteractive?: boolean;
}): Promise<GenerateResult> {
	const cwd = opts.cwd ?? process.cwd();
	return generateFromConfig(opts.config, cwd, {
		writeToDisk: opts.writeToDisk ?? false,
	});
}

// Build a slot graph against a consumer-shaped StackConfig and return both
// the graph handle and the collected plugin info. Tests that want to inspect
// a specific slot value use `graph.resolve(slot)` rather than asserting on
// generated file strings.
export async function buildTestGraph(opts: {
	config: StackConfig;
	cwd?: string;
	nonInteractive?: boolean;
}): Promise<{ graph: Graph; collected: CollectedPlugin[] }> {
	const cwd = opts.cwd ?? process.cwd();
	const result = await buildGraphFromConfig({ config: opts.config, cwd });
	return { graph: result.graph, collected: result.collected };
}

// Back-compat alias. Same behaviour as `buildTestGraph`; kept so existing
// integration-test imports (`registerStackConfig`) continue to resolve.
export const registerStackConfig = buildTestGraph;

// Build a graph directly from plugin factories + their options. Skips the
// `discoverPlugins` dynamic-import path, so tests can assemble a graph from
// an in-process `plugin(...)` instance without publishing it as a package.
// Mirrors consumer wiring otherwise: each factory's `.cli.collect()` runs
// against the supplied options.
//
// biome-ignore lint/suspicious/noExplicitAny: PluginFactory carries deep generics (TName, TOptions, TSlots, TCallbacks) plus a conditional `defineCallbacks` intersection — tests want to pass any factory.
type AnyPluginFactory = PluginFactory<string, any, any, any>;

export function buildTestGraphFromPlugins(opts: {
	plugins: Array<{
		factory: AnyPluginFactory | { cli: AnyPluginFactory["cli"] };
		options?: unknown;
	}>;
	app?: AppConfig;
	cwd?: string;
}): { graph: Graph; collected: CollectedPlugin[] } {
	const app = opts.app ?? { name: "test-app", domain: "example.com" };
	const cwd = opts.cwd ?? process.cwd();
	const discovered: DiscoveredPlugin[] = opts.plugins.map((p) => ({
		name: p.factory.cli.name,
		cli: p.factory.cli as DiscoveredPlugin["cli"],
		factory: p.factory as unknown as DiscoveredPlugin["factory"],
		options: p.options ?? {},
	}));
	const { graph, collected } = buildGraphFromDiscovered({
		discovered,
		app,
		cwd,
	});
	return { graph, collected };
}
