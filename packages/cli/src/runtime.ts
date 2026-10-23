// Canonical RuntimePlugin protocol shared by all plugins that ship a worker runtime.
// Each runtime plugin contributes typed context to the request chain and may
// optionally register oRPC routes or intercept HTTP requests.
//
// The `procedure` argument of `routes()` is framework-agnostic (`unknown`) here;
// plugin-api narrows it to its own procedure builder at the call site. The
// `TRoutes` generic carries the shape `routes()` returns into the worker's
// router type, so the app's typed client reaches the plugin's procedures.

export interface RuntimePlugin<
	TName extends string = string,
	TDeps = object,
	TProvides = object,
	TRoutes extends Record<string, unknown> = Record<never, never>,
> {
	name: TName;
	// Names of other runtime plugins whose provided context this plugin reads
	// in `context()`. `createWorker` topologically sorts `.use()` entries by
	// this before building the request context, so declaring it replaces
	// caring about registration order. A name that isn't registered is
	// ignored — presence is validated at config level by `requires`.
	dependsOn?: readonly string[];
	validateEnv?(env: unknown): void;
	context(env: unknown, upstream: TDeps): TProvides | Promise<TProvides>;
	routes?(procedure: unknown): TRoutes;
	// Return a Response to claim the request; return null/undefined to pass.
	// Tried in registration order before the RPC handler runs, so a plugin
	// that owns a URL prefix (e.g. /api/auth) can intercept first.
	fetch?(
		request: Request,
		env: unknown,
		upstream: TDeps & TProvides,
	): Response | null | undefined | Promise<Response | null | undefined>;
}
