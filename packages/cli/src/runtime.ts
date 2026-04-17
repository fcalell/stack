// Canonical RuntimePlugin protocol shared by all plugins that ship a worker runtime.
// Each runtime plugin contributes typed context to the request chain and may
// optionally register oRPC routes, HTTP routes, or Cloudflare Workers event handlers.
//
// The `procedure` argument of `routes()` is framework-agnostic (`unknown`) here;
// plugin-api narrows it to its own procedure builder at the call site.

export interface RuntimePluginEventHandlers {
	scheduled?(controller: unknown, env: unknown, ctx: unknown): Promise<void>;
	queue?(batch: unknown, env: unknown, ctx: unknown): Promise<void>;
	email?(message: unknown, env: unknown, ctx: unknown): Promise<void>;
}

export interface RuntimePlugin<
	TName extends string = string,
	TDeps = object,
	TProvides = object,
> {
	name: TName;
	validateEnv?(env: unknown): void;
	context(env: unknown, upstream: TDeps): TProvides | Promise<TProvides>;
	routes?(procedure: unknown): Record<string, unknown>;
	handlers?(): RuntimePluginEventHandlers;
	// Return a Response to claim the request; return null/undefined to pass.
	// Tried in registration order before the RPC handler runs, so a plugin
	// that owns a URL prefix (e.g. /api/auth) can intercept first.
	fetch?(
		request: Request,
		env: unknown,
		upstream: TDeps & TProvides,
	): Response | null | undefined | Promise<Response | null | undefined>;
}
