import type { ScaffoldSpec } from "#ast";
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

// Generate carries the file accumulator plus a post-write hook plugins can
// register callbacks on. The CLI writes every `files` entry, then runs the
// `postWrite` list in registration order. Plugins that shell out to tools
// (e.g. cloudflare running `wrangler types` off the freshly written
// `.stack/wrangler.toml`) queue themselves here.
export interface GeneratePayload {
	files: GeneratedFile[];
	postWrite: Array<() => Promise<void>>;
}

export interface RemovePayload {
	files: string[];
	dependencies: string[];
	devDependencies: string[];
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
