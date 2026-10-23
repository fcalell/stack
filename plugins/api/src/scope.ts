// The scope the route supplies to the client. The URL names the scope by slug;
// the boundary that resolves it registers the ids here (`ScopeBoundary` in
// `./tanstack-query.tsx`), and the query utils merge them into the input of
// every call before the query key is built, so the id stays in the key and two
// scopes never share a cache entry. No React and no oRPC import: a client
// bundle holds one copy of this module, reached by package name.

/** The ids a boundary registers: `{ organizationId }`, and under a project `{ organizationId, projectId }`. */
export type ScopeIds = Readonly<Record<string, string>>;

// Ambient: the scope of the innermost boundary rendered, with its depth (the
// boundaries above it). One client, one active route subtree per isolate (the
// same assumption as the registered client in `./ability-client.ts`); an SSR
// target that serves many users from one isolate passes ids explicitly
// (`scoped`).
let registered: { ids: ScopeIds; depth: number } = { ids: {}, depth: 0 };

/** Registers a boundary's ids at its depth. A boundary shallower than the one registered never replaces it: React runs mount effects child first, so without the depth an outer boundary's effect would put its own ids back over the inner's. */
export function registerScope(ids: ScopeIds, depth = 0): void {
	if (depth >= registered.depth) registered = { ids, depth };
}

/** Puts the outer boundary's ids back when a boundary leaves, if its own ids are the ones registered; a boundary that replaced them already (the next route's) keeps its registration. */
export function releaseScope(
	ids: ScopeIds,
	outer: ScopeIds,
	outerDepth: number,
): void {
	if (registered.ids === ids) registered = { ids: outer, depth: outerDepth };
}

export function registeredScope(): ScopeIds {
	return registered.ids;
}

// An input the ids may be merged into: nothing, or a plain object. A
// `skipToken`, a string, an array, a class instance pass through as they are.
function isMergeable(input: unknown): input is object | undefined {
	if (input === undefined) return true;
	if (typeof input !== "object" || input === null) return false;
	const proto = Object.getPrototypeOf(input);
	return proto === Object.prototype || proto === null;
}

/** The part of `.stack/schema.ts` the client reads here: each procedure by dotted path with the input key its scope adds (null when it has none). */
export type ScopeSchema = Readonly<
	Record<string, { readonly scope: string | null } | undefined>
>;

/**
 * The input with the scope `key` of `procedure` set from `ids`: only that key, and
 * an id the input names wins (an input key set to `undefined` does not). Throws,
 * before any request, when neither names it, unless `lenient` (a layer another
 * one answers for). A procedure with no scope key keeps its input as it is.
 */
export function mergeScope(
	ids: ScopeIds,
	input: unknown,
	procedure: string,
	key: string | null,
	lenient = false,
): unknown {
	if (key === null) return input;
	if (typeof input === "function") {
		// An infinite query's input is a function of the page param.
		return (...args: unknown[]) =>
			mergeScope(ids, input(...args), procedure, key, lenient);
	}
	if (!isMergeable(input)) return input;
	if ((input as Record<string, unknown> | undefined)?.[key] !== undefined) {
		return input;
	}
	const id = ids[key];
	if (id === undefined) {
		if (lenient) return input;
		throw new Error(
			`${procedure} is scoped to ${key}: render it under a ScopeBoundary that supplies ${key}, or pass ${key}.`,
		);
	}
	return { ...input, [key]: id };
}

// The utils methods that take the call's input in their options. A key built
// without an input is a prefix (`orpc.projects.list.key()` matches every
// scope's list), so the keys merge only an input they were given; the options
// always do, since a call with no input names its scope by the boundary alone.
const KEYS = new Set([
	"key",
	"queryKey",
	"infiniteKey",
	"experimental_streamedKey",
	"experimental_liveKey",
]);
const OPTIONS = new Set([
	"queryOptions",
	"infiniteOptions",
	"experimental_streamedOptions",
	"experimental_liveOptions",
]);

type Fn = (...args: unknown[]) => unknown;

/**
 * oRPC's query utils with the scope key of each scoped procedure (`schema`) set
 * from `ids()` in the input of every call: `queryOptions`, `infiniteOptions`, the
 * keys, `call`, and the `mutationFn` of `mutationOptions`. The merge precedes the
 * key, which carries the id. A procedure the schema does not name, or names with
 * no scope, is left as it is.
 */
export function withScope(
	// biome-ignore lint/suspicious/noExplicitAny: oRPC's utils proxy is dynamically typed
	target: any,
	ids: () => ScopeIds,
	schema: ScopeSchema,
	// biome-ignore lint/suspicious/noExplicitAny: oRPC's utils proxy is dynamically typed
): any {
	return layer(target, ids, schema, [], false);
}

function layer(
	// biome-ignore lint/suspicious/noExplicitAny: oRPC's utils proxy is dynamically typed
	target: any,
	ids: () => ScopeIds,
	schema: ScopeSchema,
	path: readonly string[],
	lenient: boolean,
	// biome-ignore lint/suspicious/noExplicitAny: oRPC's utils proxy is dynamically typed
): any {
	return new Proxy(target, {
		get(_, key) {
			const value = Reflect.get(target, key);
			if (typeof key !== "string") return value;
			const own = [...path, key];
			if (typeof value === "function") {
				const method = methodOf(key, value as Fn, ids, schema, path, lenient);
				if (method) {
					// A procedure named like a method keeps its utils, as in `withRead`.
					const child = layer(value, ids, schema, own, lenient);
					return new Proxy(method, { get: (_, k) => Reflect.get(child, k) });
				}
			}
			return value !== null &&
				(typeof value === "object" || typeof value === "function")
				? layer(value, ids, schema, own, lenient)
				: value;
		},
	});
}

// `path` is the procedure the method belongs to.
function methodOf(
	key: string,
	value: Fn,
	ids: () => ScopeIds,
	schema: ScopeSchema,
	path: readonly string[],
	lenient: boolean,
): Fn | undefined {
	const procedure = path.join(".");
	const merge = (input: unknown) =>
		mergeScope(
			ids(),
			input,
			procedure,
			schema[procedure]?.scope ?? null,
			lenient,
		);
	if (KEYS.has(key)) {
		return (options, ...rest) =>
			value(
				options && typeof options === "object" && "input" in options
					? { ...options, input: merge(options.input) }
					: options,
				...rest,
			);
	}
	if (OPTIONS.has(key)) {
		return (options, ...rest) =>
			value(
				{
					...(options as object | undefined),
					input: merge((options as { input?: unknown })?.input),
				},
				...rest,
			);
	}
	if (key === "call" || key === "read" || key === "pages") {
		return (input, ...rest) => value(merge(input), ...rest);
	}
	if (key === "mutationOptions") {
		return (...args) => {
			const built = value(...args) as { mutationFn: Fn };
			return {
				...built,
				mutationFn: (input: unknown, ...rest: unknown[]) =>
					built.mutationFn(merge(input), ...rest),
			};
		};
	}
	return undefined;
}

/**
 * The utils with `scope` fixed, for a call made outside any boundary: a route
 * `loader` runs before the boundary renders, so it names the ids it resolved.
 * Nested calls extend (`scoped(scoped(utils, { organizationId }), { projectId })`):
 * a layer sets the keys it holds and leaves the rest to the layers beneath, down
 * to the registered scope, which throws for a key no layer names.
 */
export function scoped<U>(utils: U, scope: ScopeIds, schema: ScopeSchema): U {
	return layer(utils, () => scope, schema, [], true);
}
