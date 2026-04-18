import type { BindingDeclaration } from "#config";
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

// ── Payload types ───────────────────────────────────────────────────

export interface InitPromptPayload {
	configOptions: Record<string, Record<string, unknown>>;
}

export interface InitScaffoldPayload {
	files: { path: string; content: string }[];
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
	gitignore: string[];
}

export interface GeneratePayload {
	files: GeneratedFile[];
	bindings: BindingDeclaration[];
}

export interface RemovePayload {
	files: string[];
	dependencies: string[];
}

// Structured import declaration for the generated .stack/vite.config.ts.
// Supports default, named, or combined imports without forcing plugins to
// handcraft `import ... from "..."` strings.
export interface ViteImportSpec {
	from: string;
	default?: string;
	named?: string[];
}

// Structured plugin-call spec for the vite plugins array. `options` is
// serialized as a JSON literal — no identifier injection is supported here
// (plugins don't need it today).
export interface VitePluginCallSpec {
	name: string;
	options?: Record<string, unknown>;
}

export interface DevConfigurePayload {
	vitePlugins: unknown[];
	viteImports: ViteImportSpec[];
	vitePluginCalls: VitePluginCallSpec[];
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

export interface BuildConfigurePayload {
	vitePlugins: unknown[];
	viteImports: ViteImportSpec[];
	vitePluginCalls: VitePluginCallSpec[];
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

// Codegen.Frontend is emitted before Codegen.Worker so frontend plugins
// (e.g. solid) can announce their port/domain. Worker plugins read the
// populated payload off the bus history when building the virtual worker.
export interface CodegenFrontendPayload {
	port?: number;
	domain?: string;
}

// A `.use(...)` contribution to the worker builder chain.
// `factory` renders as `.use(factoryName(<options>))`; `identifier` as
// `.use(identifierName)`. Options split into JSON-serializable data and
// bare identifier fields so the renderer can keep identifiers unquoted.
export type WorkerUseSpec =
	| {
			kind: "factory";
			factoryName: string;
			options?: Record<string, unknown>;
			identifierFields?: Record<string, string>;
	  }
	| {
			kind: "identifier";
			identifier: string;
	  };

// The root worker factory call — `const worker = factoryName(<options>)`.
// Only one plugin claims this per pipeline.
export interface WorkerRootSpec {
	factoryName: string;
	options?: Record<string, unknown>;
	identifierFields?: Record<string, string>;
}

// Codegen.Worker is the pipeline that builds .stack/worker.ts. Each runtime
// plugin mutates this payload; exactly one plugin must claim `root`.
export interface CodegenWorkerPayload {
	imports: string[];
	root: null | WorkerRootSpec;
	uses: WorkerUseSpec[];
	handlerArg: string;
	tailLines: string[];
	frontend?: CodegenFrontendPayload;
}

// ── Core lifecycle events ───────────────────────────────────────────

export const Init = {
	Prompt: defineEvent<InitPromptPayload>("core", "init.prompt"),
	Scaffold: defineEvent<InitScaffoldPayload>("core", "init.scaffold"),
};

export const Generate = defineEvent<GeneratePayload>("core", "generate");

export const Dev = {
	Configure: defineEvent<DevConfigurePayload>("core", "dev.configure"),
	ConfigureReady: defineEvent<DevConfigurePayload>(
		"core",
		"dev.configure.ready",
	),
	Start: defineEvent<DevStartPayload>("core", "dev.start"),
	Ready: defineEvent<DevReadyPayload>("core", "dev.ready"),
};

export const Build = {
	Configure: defineEvent<BuildConfigurePayload>("core", "build.configure"),
	ConfigureReady: defineEvent<BuildConfigurePayload>(
		"core",
		"build.configure.ready",
	),
	Start: defineEvent<BuildStartPayload>("core", "build.start"),
};

export const Deploy = {
	Plan: defineEvent<DeployPlanPayload>("core", "deploy.plan"),
	Execute: defineEvent<DeployExecutePayload>("core", "deploy.execute"),
	Complete: defineEvent<void>("core", "deploy.complete"),
};

export const Remove = defineEvent<RemovePayload>("core", "remove");

export const Codegen = {
	Frontend: defineEvent<CodegenFrontendPayload>("core", "codegen.frontend"),
	Worker: defineEvent<CodegenWorkerPayload>("core", "codegen.worker"),
};
