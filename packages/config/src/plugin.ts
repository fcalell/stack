import type { BindingDeclaration, StackConfig } from "./index";

// ── Generated file ──────────────────────────────────────────────────

export interface GeneratedFile {
	path: string;
	content: string;
}

// ── Removal ─────────────────────────────────────────────────────────

export interface RemovalResult {
	filesToDelete?: string[];
	packagesToRemove?: string[];
	notes?: string[];
}

// ── Worker contribution ─────────────────────────────────────────────

export interface WorkerContribution {
	runtime?: {
		importFrom: string;
		factory: string;
	};
	callbacks?: {
		required: boolean;
		defineHelper: string;
		importFrom: string;
	};
	routes?: true;
	middleware?: true;
	handlers?: ("scheduled" | "queue" | "email" | "tail")[];
}

// ── Dev / Build / Deploy contributions ──────────────────────────────

export interface ProcessSpec {
	name: string;
	command: string;
	args: string[];
	defaultPort?: number;
	readyPattern?: RegExp;
	color?: string;
}

export interface WatcherSpec {
	paths: string[];
	ignore?: string[];
	onChange(event: {
		type: "add" | "change" | "unlink";
		path: string;
	}): Promise<void>;
	debounce?: number;
}

export interface DevContribution {
	setup?: () => Promise<void>;
	processes?: ProcessSpec[];
	watchers?: WatcherSpec[];
	vitePlugins?: unknown[];
	banner?: string[];
}

export interface BuildContribution {
	preBuild?: () => Promise<void>;
	postBuild?: () => Promise<void>;
	vitePlugins?: unknown[];
}

// ── Plugin context ──────────────────────────────────────────────────

export interface PluginContext {
	cwd: string;
	config: StackConfig | null;
	hasPlugin(name: string): boolean;
	getPluginOptions<T>(name: string): T | undefined;

	writeFile(path: string, content: string): Promise<void>;
	writeIfMissing(path: string, content: string): Promise<boolean>;
	ensureDir(path: string): Promise<void>;
	fileExists(path: string): Promise<boolean>;
	readFile(path: string): Promise<string>;

	addDependencies(deps: Record<string, string>): void;
	addDevDependencies(deps: Record<string, string>): void;
	addToGitignore(...entries: string[]): void;

	addPluginToConfig(opts: {
		importSource: string;
		importName: string;
		options: Record<string, unknown>;
	}): Promise<void>;
	removePluginFromConfig(name: string): Promise<void>;

	prompt: {
		text(message: string, opts?: { default?: string }): Promise<string>;
		confirm(message: string): Promise<boolean>;
		select<T>(
			message: string,
			options: { label: string; value: T }[],
		): Promise<T>;
		multiselect<T>(
			message: string,
			options: { label: string; value: T }[],
		): Promise<T[]>;
	};

	log: {
		info(msg: string): void;
		warn(msg: string): void;
		success(msg: string): void;
		error(msg: string): void;
	};
}

export interface DevContext extends PluginContext {
	getPort(name: string): number;
}

export interface BuildContext extends PluginContext {
	outDir: string;
}

export interface DeployContext extends PluginContext {
	env?: string;
	preview?: boolean;
	dryRun?: boolean;
}

// ── CLI plugin interface ────────────────────────────────────────────

export interface CliPlugin<TOptions = unknown> {
	name: string;
	label: string;

	detect(ctx: PluginContext): boolean | Promise<boolean>;
	prompt?(ctx: PluginContext): Promise<Record<string, unknown>>;
	scaffold(
		ctx: PluginContext,
		answers: Record<string, unknown>,
	): Promise<void>;
	remove?(ctx: PluginContext): Promise<RemovalResult>;

	bindings(options: TOptions): BindingDeclaration[];
	generate(ctx: PluginContext): Promise<GeneratedFile[]>;

	worker?: WorkerContribution;

	dev?(ctx: DevContext): Promise<DevContribution>;
	build?(ctx: BuildContext): Promise<BuildContribution>;
	deploy?(ctx: DeployContext): Promise<void>;
}
