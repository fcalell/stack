// A value held outside React, which `useSyncExternalStore` reads through
// `subscribe` and `get`. `set` replaces the value and tells the subscribers;
// `emit` tells them of a change made in place.
export interface Store<T> {
	get(): T;
	set(next: T): void;
	emit(): void;
	subscribe(listener: () => void): () => void;
}

export function createStore<T>(initial: T): Store<T> {
	let value = initial;
	const listeners = new Set<() => void>();
	const emit = () => {
		for (const listener of listeners) listener();
	};
	return {
		get: () => value,
		set(next) {
			value = next;
			emit();
		},
		emit,
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}
