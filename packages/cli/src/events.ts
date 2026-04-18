import type {
	HtmlInjection,
	MiddlewareSpec,
	ProviderSpec,
	ScaffoldSpec,
	TsExpression,
	TsImportSpec,
	TsTypeRef,
} from "#ast";
import { defineEvent } from "#lib/event-bus";

export {
	createEventBus,
	defineEvent,
	type Event,
	type EventBus,
} from "#lib/event-bus";

// ── Shared types ────────────────────────────────────────────────────

export interface GeneratedFile {
	path: string;
	content: string;
}

export interface ProcessSpec {
	name: string;
	command: string;
	args: string[];
	defaultPort?: number;
	readyPattern?: RegExp;
	color?: string;
}

export interface WatcherSpec {
	name: string;
	paths: string;
	ignore?: string[];
	debounce?: number;
	handler: (
		path: string,
		type: "add" | "unlink" | "change",
	) => void | Promise<void>;
}

export type BuildStep =
	| {
			name: string;
			phase: "pre" | "main" | "post";
			exec: { command: string; args: string[]; cwd?: string };
	  }
	| { name: string; phase: "pre" | "main" | "post"; run: () => Promise<void> };

export type DeployStep =
	| {
			name: string;
			phase: "pre" | "main" | "post";
			exec: { command: string; args: string[]; cwd?: string };
	  }
	| { name: string; phase: "pre" | "main" | "post"; run: () => Promise<void> };

export interface DeployCheck {
	plugin: string;
	description: string;
	items: { label: string; detail?: string }[];
	action: () => Promise<void>;
}

// ── Core payload types ──────────────────────────────────────────────

export interface InitPromptPayload {
	configOptions: Record<string, Record<string, unknown>>;
}

export interface InitScaffoldPayload {
	files: ScaffoldSpec[];
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
	gitignore: string[];
}

// Generate no longer carries raw bindings — plugins push typed specs into
// Codegen.Wrangler and Codegen.Env directly. Plugins still use Generate to
// emit plain files (e.g. api's route barrel).
export interface GeneratePayload {
	files: GeneratedFile[];
}

export interface RemovePayload {
	files: string[];
	dependencies: string[];
}

export interface DevStartPayload {
	processes: ProcessSpec[];
	watchers: WatcherSpec[];
}

export interface DevReadyPayload {
	url: string;
	port: number;
	setup: Array<{ name: string; run: () => Promise<void> }>;
	watchers: WatcherSpec[];
}

export interface BuildStartPayload {
	steps: BuildStep[];
}

export interface DeployPlanPayload {
	checks: DeployCheck[];
}

export interface DeployExecutePayload {
	steps: DeployStep[];
}

// ── Codegen payload types ───────────────────────────────────────────

// CodegenWorkerPayload models the .stack/worker.ts builder chain.
//
// Deviation from CODEGEN.md: we add a `base: TsExpression | null` field so
// plugin-api can claim the root factory call (`createWorker({...})`) without
// repurposing `middlewareChain[0]`. `middlewareChain` stays purely a list of
// `.use(arg)` arguments. The tail (`export type AppRouter...`, `export default
// worker;`) is fixed in the aggregator — no payload field needed.
export interface CodegenWorkerPayload {
	imports: TsImportSpec[];
	base: TsExpression | null;
	middlewareChain: TsExpression[];
	handler: { identifier: string } | null;
	domain: string;
	cors: string[];
}

// WranglerBindingSpec is the structured representation of a wrangler.toml
// binding declaration. Deviation from CODEGEN.md: `rate_limiter` omits the
// `namespace` field because the current emitted config uses `type = "ratelimit"`
// under `[[unsafe.bindings]]` with no namespace — preserving observed behavior
// over speculative spec fields.
export type WranglerBindingSpec =
	| {
			kind: "d1";
			binding: string;
			databaseName: string;
			databaseId: string;
			migrationsDir?: string;
	  }
	| { kind: "kv"; binding: string; id: string }
	| { kind: "r2"; binding: string; bucketName: string }
	| {
			kind: "rate_limiter";
			binding: string;
			simple: { limit: number; period: number };
	  }
	| { kind: "var"; name: string; value: string };

export type WranglerRouteSpec = {
	pattern: string;
	zone?: string;
	customDomain?: boolean;
};

// Deviation from CODEGEN.md: we add a `secrets` array so `.dev.vars` generation
// can continue to emit dev defaults for secret-typed vars. Secrets aren't a
// wrangler binding kind — they're worker-env vars that get a dev-only value.
export interface CodegenWranglerPayload {
	bindings: WranglerBindingSpec[];
	routes: WranglerRouteSpec[];
	vars: Record<string, string>;
	secrets: Array<{ name: string; devDefault: string }>;
	compatibilityDate: string;
}

export interface CodegenEnvPayload {
	fields: Array<{
		name: string;
		type: TsTypeRef;
		from?: TsImportSpec;
	}>;
}

export interface CodegenViteConfigPayload {
	imports: TsImportSpec[];
	pluginCalls: TsExpression[];
	resolveAliases: Array<{ find: string; replacement: string }>;
	devServerPort: number;
}

export interface CodegenEntryPayload {
	imports: TsImportSpec[];
	mountExpression: TsExpression | null;
}

export interface CodegenHtmlPayload {
	shell: URL | null;
	head: HtmlInjection[];
	bodyEnd: HtmlInjection[];
}

export interface CodegenAppCssPayload {
	imports: string[];
	layers: Array<{ name: string; content: string }>;
}

export interface CodegenRoutesDtsPayload {
	// Placeholder shape — plugin-solid continues to write routes.d.ts directly.
	// Phase 5 wires a proper writer driven by this payload.
	pagesDir: string | null;
}

// ── Composition payload types ───────────────────────────────────────

// Composition.Providers collects JSX wrappers + sibling elements that land
// in .stack/virtual-providers.tsx. Consumers (and plugin-solid's entry) import
// that module via `virtual:stack-providers`.
export interface CompositionProvidersPayload {
	providers: ProviderSpec[];
}

// Composition.Middleware collects ordered middleware call expressions plus the
// imports they need. The aggregator sorts entries by phase then `order` and
// feeds the result into Codegen.Worker's middlewareChain.
export interface CompositionMiddlewarePayload {
	entries: MiddlewareSpec[];
}

// ── Core lifecycle events ───────────────────────────────────────────

export const Init = {
	Prompt: defineEvent<InitPromptPayload>("core", "init.prompt"),
	Scaffold: defineEvent<InitScaffoldPayload>("core", "init.scaffold"),
};

export const Generate = defineEvent<GeneratePayload>("core", "generate");

export const Dev = {
	Start: defineEvent<DevStartPayload>("core", "dev.start"),
	Ready: defineEvent<DevReadyPayload>("core", "dev.ready"),
};

export const Build = {
	Start: defineEvent<BuildStartPayload>("core", "build.start"),
};

export const Deploy = {
	Plan: defineEvent<DeployPlanPayload>("core", "deploy.plan"),
	Execute: defineEvent<DeployExecutePayload>("core", "deploy.execute"),
	Complete: defineEvent<void>("core", "deploy.complete"),
};

export const Remove = defineEvent<RemovePayload>("core", "remove");

export const Codegen = {
	Worker: defineEvent<CodegenWorkerPayload>("core", "codegen.worker"),
	Wrangler: defineEvent<CodegenWranglerPayload>("core", "codegen.wrangler"),
	Env: defineEvent<CodegenEnvPayload>("core", "codegen.env"),
	ViteConfig: defineEvent<CodegenViteConfigPayload>(
		"core",
		"codegen.vite-config",
	),
	Entry: defineEvent<CodegenEntryPayload>("core", "codegen.entry"),
	Html: defineEvent<CodegenHtmlPayload>("core", "codegen.html"),
	AppCss: defineEvent<CodegenAppCssPayload>("core", "codegen.app-css"),
	RoutesDts: defineEvent<CodegenRoutesDtsPayload>("core", "codegen.routes-dts"),
};

export const Composition = {
	Providers: defineEvent<CompositionProvidersPayload>(
		"core",
		"composition.providers",
	),
	Middleware: defineEvent<CompositionMiddlewarePayload>(
		"core",
		"composition.middleware",
	),
};
