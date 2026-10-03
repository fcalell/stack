// Compile-time assertions shared by the tests and the fixture routes, so a
// widened or narrowed type fails `check-types`.
export type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;

// Flattens an intersection into one object type, which `Equal` tells apart
// from the intersection itself.
export type Flat<T> = { [K in keyof T]: T[K] };

export function assertType<T extends true>(_: T): void {}
