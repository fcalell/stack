import type { ValidationError } from "#config";

export class StackError extends Error {
	constructor(
		message: string,
		public readonly code: string,
	) {
		super(message);
		this.name = "StackError";
	}
}

export class ConfigLoadError extends StackError {
	constructor(
		message: string,
		public readonly cause?: unknown,
	) {
		super(message, "CONFIG_LOAD");
		this.name = "ConfigLoadError";
	}
}

export class ConfigValidationError extends StackError {
	constructor(public readonly errors: ValidationError[]) {
		super(
			`Config validation failed with ${errors.length} error(s).`,
			"CONFIG_VALIDATION",
		);
		this.name = "ConfigValidationError";
	}
}

export class StepFailedError extends StackError {
	constructor(
		public readonly step: string,
		public readonly exitCode: number | null,
		public readonly command?: string,
	) {
		super(
			`Step "${step}" failed${exitCode !== null ? ` with exit code ${exitCode}` : ""}.`,
			"STEP_FAILED",
		);
		this.name = "StepFailedError";
	}
}

export class MissingPluginError extends StackError {
	constructor(
		public readonly pluginName: string,
		message?: string,
	) {
		super(
			message ?? `Plugin "${pluginName}" is not available.`,
			"MISSING_PLUGIN",
		);
		this.name = "MissingPluginError";
	}
}

export class ScaffoldError extends StackError {
	constructor(
		message: string,
		public readonly path?: string,
	) {
		super(message, "SCAFFOLD");
		this.name = "ScaffoldError";
	}
}

export class EventHandlerError extends StackError {
	constructor(
		public readonly eventSource: string,
		public readonly eventName: string,
		public readonly cause: unknown,
	) {
		const detail = cause instanceof Error ? cause.message : String(cause);
		super(
			`Event ${eventSource}:${eventName} handler failed: ${detail}`,
			"EVENT_HANDLER",
		);
		this.name = "EventHandlerError";
		if (cause instanceof Error && cause.stack) {
			this.stack = cause.stack;
		}
	}
}
