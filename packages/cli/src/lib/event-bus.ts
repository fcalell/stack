// ── Event type ──────────────────────────────────────────────────────

export interface Event<T> {
	readonly id: symbol;
	readonly source: string;
	readonly name: string;
	/** Phantom type — never read at runtime */
	readonly _type?: T;
}

export function defineEvent<T = void>(source: string, name: string): Event<T> {
	return { id: Symbol(`${source}:${name}`), source, name };
}

// ── EventBus ────────────────────────────────────────────────────────

type Handler<T> = (data: T) => void | Promise<void>;
type Unsubscribe = () => void;

export interface EventBus {
	emit<T>(event: Event<T>, data: T): Promise<T>;
	on<T>(event: Event<T>, handler: Handler<T>): Unsubscribe;
	once<T>(event: Event<T>): Promise<T>;
	history<T>(event: Event<T>): T[];
}

export function createEventBus(): EventBus {
	const handlers = new Map<symbol, Array<Handler<any>>>();
	const historyMap = new Map<symbol, unknown[]>();

	const bus: EventBus = {
		async emit<T>(event: Event<T>, data: T): Promise<T> {
			const hist = historyMap.get(event.id) ?? [];
			hist.push(data);
			historyMap.set(event.id, hist);

			const fns = handlers.get(event.id) ?? [];
			for (const fn of fns) {
				await fn(data);
			}

			return data;
		},

		on<T>(event: Event<T>, handler: Handler<T>): Unsubscribe {
			const fns = handlers.get(event.id) ?? [];
			fns.push(handler);
			handlers.set(event.id, fns);

			return () => {
				const idx = fns.indexOf(handler);
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
