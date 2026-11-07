// The controls of a served app, under `/fixture/*`, as a wrapper over its
// worker. This module runs inside the worker (Node or workerd): web APIs only.

export interface ServeWorker {
	fetch(request: Request, env: never, ctx: never): Response | Promise<Response>;
}

// The path every control lives under.
export const FIXTURE_PREFIX = "/fixture";

// A plugin's or an app's own controls: asked first of every `/fixture/*`
// request, in the order given, so one can answer a generic path (plugin-auth's
// `link`); undefined passes to the next, then to the generic controls.
export type ExtraControls = (
	request: Request,
	context: {
		env: unknown;
		ctx: unknown;
		// Asks the app's own worker, past the controls: how a control makes the
		// requests of a real flow.
		app(request: Request): Promise<Response>;
	},
) => Response | undefined | Promise<Response | undefined>;

function number(url: URL, name: string): number | null {
	const given = url.searchParams.get(name);
	const value = Number(given);
	return given !== null && Number.isInteger(value) && value >= 0 ? value : null;
}

function matcher(pattern: string): RegExp {
	const source = pattern
		.split("*")
		.map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
		.join(".*");
	return new RegExp(source);
}

// Answers a worker's requests as the app does, and the `/fixture/*` paths:
//
//   delay?match=<pattern>&ms=<n>     slow each request whose path matches; ms=0 clears
//   fail?match=<pattern>&status=<n>  answer each one with status n; status=0 clears
//   link[?to=/path]                  sign the browser in as the fixture member:
//                                    a control extra answers (plugin-auth's), 404 when none does
//
// A pattern is a part of the path, `*` standing for any run. The rules live in
// the worker instance. `socket` is the node server's: it owns the sockets.
export function fixtureControls<W extends ServeWorker>(
	worker: W,
	...extra: ExtraControls[]
): W {
	const delays = new Map<string, number>();
	const fails = new Map<string, number>();

	async function control(
		request: Request,
		url: URL,
		env: never,
		ctx: never,
	): Promise<Response> {
		for (const ask of extra) {
			const own = await ask(request, {
				env,
				ctx,
				app: async (inner) => worker.fetch(inner, env, ctx),
			});
			if (own) return own;
		}
		const name = url.pathname.slice(FIXTURE_PREFIX.length + 1);
		const match = url.searchParams.get("match");
		if (name === "delay" || name === "fail") {
			const value = number(url, name === "delay" ? "ms" : "status");
			if (match === null || value === null)
				return new Response(
					`fixture ${name}: give match and ${name === "delay" ? "ms" : "status"}`,
					{ status: 400 },
				);
			const rules = name === "delay" ? delays : fails;
			if (value === 0) rules.delete(match);
			else rules.set(match, value);
			return new Response(`${name} ${match} ${value}`);
		}
		if (name === "link")
			return new Response("fixture link: no plugin signs a fixture member in", {
				status: 404,
			});
		return new Response(`fixture: no control ${name}`, { status: 404 });
	}

	return {
		...worker,
		async fetch(request: Request, env: never, ctx: never) {
			const url = new URL(request.url);
			if (url.pathname.startsWith(`${FIXTURE_PREFIX}/`))
				return control(request, url, env, ctx);
			for (const [match, ms] of delays)
				if (matcher(match).test(url.pathname))
					await new Promise((resolve) => setTimeout(resolve, ms));
			for (const [match, status] of fails)
				if (matcher(match).test(url.pathname))
					return Response.json(
						{ code: "FIXTURE_FAILURE", status, message: "fixture failure" },
						{ status },
					);
			return worker.fetch(request, env, ctx);
		},
	} as W;
}
