import type { ValidationError } from "#config";

export class StackError extends Error {
	readonly code: string;
	constructor(message: string, code: string) {
		super(message);
		this.code = code;
		this.name = "StackError";
	}
}

export class ConfigLoadError extends StackError {
	readonly cause?: unknown;
	constructor(message: string, cause?: unknown) {
		super(message, "CONFIG_LOAD");
		this.cause = cause;
		this.name = "ConfigLoadError";
	}
}

export class ConfigValidationError extends StackError {
	readonly errors: ValidationError[];
	constructor(errors: ValidationError[]) {
		super(
			`Config validation failed with ${errors.length} error(s).`,
			"CONFIG_VALIDATION",
		);
		this.errors = errors;
		this.name = "ConfigValidationError";
	}
}

export class StepFailedError extends StackError {
	readonly step: string;
	readonly exitCode: number | null;
	readonly command?: string;
	constructor(step: string, exitCode: number | null, command?: string) {
		super(
			`Step "${step}" failed${exitCode !== null ? ` with exit code ${exitCode}` : ""}.`,
			"STEP_FAILED",
		);
		this.step = step;
		this.exitCode = exitCode;
		this.command = command;
		this.name = "StepFailedError";
	}
}

export class MissingPluginError extends StackError {
	readonly pluginName: string;
	constructor(pluginName: string, message?: string) {
		super(
			message ?? `Plugin "${pluginName}" is not available.`,
			"MISSING_PLUGIN",
		);
		this.pluginName = pluginName;
		this.name = "MissingPluginError";
	}
}

export class ScaffoldError extends StackError {
	readonly path?: string;
	constructor(message: string, path?: string) {
		super(message, "SCAFFOLD");
		this.path = path;
		this.name = "ScaffoldError";
	}
}
