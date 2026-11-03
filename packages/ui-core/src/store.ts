// A value held outside React, which `useSyncExternalStore` reads through
// `subscribe` and `get`. `set` replaces the value and tells the subscribers;
// `emit` tells them of a change made in place; `size` is how many listen.
export interface Store<T> {
	get(): T;
	set(next: T): void;
	emit(): void;
	subscribe(listener: () => void): () => void;
	readonly size: number;
}

// A `source` is what feeds the value from outside (a timer, a media query, an
// observer): it runs when the first listener arrives, with `size` already 1,
// and the function it returns runs when the last one leaves.
export function createStore<T>(
	initial: T,
	options?: { source?: (store: Store<T>) => () => void },
): Store<T> {
	let value = initial;
	let stop: (() => void) | undefined;
	const listeners = new Set<() => void>();
	const emit = () => {
		for (const listener of listeners) listener();
	};
	const store: Store<T> = {
		get: () => value,
		set(next) {
			value = next;
			emit();
		},
		emit,
		subscribe(listener) {
			const first = listeners.size === 0;
			listeners.add(listener);
			if (first) stop = options?.source?.(store);
			return () => {
				if (!listeners.delete(listener) || listeners.size > 0) return;
				stop?.();
				stop = undefined;
			};
		},
		get size() {
			return listeners.size;
		},
	};
	return store;
}
