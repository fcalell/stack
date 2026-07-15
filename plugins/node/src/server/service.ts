export interface ServiceLogger {
	info(message: string): void;
	error(message: string): void;
}

export interface ServiceContext {
	log: ServiceLogger;
}

export type ServiceStop = () => void | Promise<void>;

// One lifecycle shape: start() may return a stop handle. Services are plain
// module singletons in the consumer tree (`src/server/services/<name>.ts`
// default-exports a defineService), so code that needs a service imports the
// module directly — no context plumbing.
export interface ServiceSpec {
	name: string;
	// biome-ignore lint/suspicious/noConfusingVoidType: void keeps side-effect-only starts (no return statement) assignable
	start(ctx: ServiceContext): void | ServiceStop | Promise<void | ServiceStop>;
}

export function defineService(spec: ServiceSpec): ServiceSpec {
	return spec;
}
