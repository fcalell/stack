import { EventHandlerError } from "#lib/errors";

// ── Event type ──────────────────────────────────────────────────────

export type EventValidator<T> = (data: unknown) => T;

export interface EventOptions<T> {
	validate?: EventValidator<T>;
}

export interface Event<T> {
	readonly id: symbol;
	readonly source: string;
	readonly name: string;
	/** Phantom type — never read at runtime */
	readonly _type?: T;
	/** Optional runtime validator — narrows unknown → T (throws on invalid). */
	readonly validate?: EventValidator<T>;
}

export function defineEvent<T = void>(
	source: string,
	name: string,
	options?: EventOptions<T>,
): Event<T> {
	return {
		id: Symbol(`${source}:${name}`),
		source,
		name,
		validate: options?.validate,
	};
}

// ── Phantom-typed event payload marker ─────────────────────────────
//
// Used on the `events` field of `createPlugin` to declare a payload type
// without constructing the Event token yet (createPlugin stamps in the plugin
// `source` when it builds the resolved map). Purely a type carrier — no
// runtime shape beyond the brand.
export interface EventTypeMarker<T> {
	readonly __eventType?: T;
}

export function type<T>(): EventTypeMarker<T> {
	return {};
}

// ── EventBus ────────────────────────────────────────────────────────

type Handler<T> = (data: T) => void | Promise<void>;
type Unsubscribe = () => void;

export interface EventBus {
	emit(event: Event<void>): Promise<void>;
	emit<T>(event: Event<T>, data: T): Promise<T>;
	on<T>(event: Event<T>, handler: Handler<T>): Unsubscribe;
	once<T>(event: Event<T>): Promise<T>;
	history<T>(event: Event<T>): T[];
}

export function createEventBus(): EventBus {
	const handlers = new Map<symbol, Array<Handler<unknown>>>();
	const historyMap = new Map<symbol, unknown[]>();

	async function emitImpl<T>(event: Event<T>, data: T): Promise<T> {
		if (event.validate) {
			try {
				data = event.validate(data);
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				throw new Error(
					`Event ${event.source}:${event.name} payload validation failed: ${msg}`,
				);
			}
		}

		const hist = historyMap.get(event.id) ?? [];
		hist.push(data);
		historyMap.set(event.id, hist);

		const fns = handlers.get(event.id) ?? [];
		for (const fn of fns) {
			try {
				await fn(data);
			} catch (err) {
				throw new EventHandlerError(event.source, event.name, err);
			}
		}

		return data;
	}

	const bus: EventBus = {
		emit: (<T>(event: Event<T>, data?: T): Promise<T> =>
			emitImpl(event, data as T)) as EventBus["emit"],

		on<T>(event: Event<T>, handler: Handler<T>): Unsubscribe {
			const fns = handlers.get(event.id) ?? [];
			// Safe widen: a Handler<T> called with T satisfies Handler<unknown>
			// because unknown is the top type — at emit time data is always of
			// the event's declared T.
			fns.push(handler as Handler<unknown>);
			handlers.set(event.id, fns);

			return () => {
				const idx = fns.indexOf(handler as Handler<unknown>);
				if (idx >= 0) fns.splice(idx, 1);
			};
		},

		once<T>(event: Event<T>): Promise<T> {
			const hist = historyMap.get(event.id);
			if (hist && hist.length > 0) {
				return Promise.resolve(hist[hist.length - 1] as T);
			}

			return new Promise<T>((resolve) => {
				const unsub = bus.on(event, (data) => {
					unsub();
					resolve(data);
				});
			});
		},

		history<T>(event: Event<T>): T[] {
			return [...((historyMap.get(event.id) as T[]) ?? [])];
		},
	};

	return bus;
}
