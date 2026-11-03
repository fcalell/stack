// The controls of a served app, under `/fixture/*`, as a wrapper over its
// worker. This module runs inside the worker (Node or workerd): web APIs only.

export interface ServeWorker {
	fetch(request: Request, env: never, ctx: never): Response | Promise<Response>;
}

// An app's own controls: asked of every `/fixture/*` request no generic
// control answers; undefined passes.
export type ExtraControls = (
	request: Request,
	context: { env: unknown; ctx: unknown },
) => Response | Promise<Response> | undefined;

const AUTH = "/api/auth";

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
//   link[?to=/path]                  sign the browser in as the fixture member
//
// A pattern is a part of the path, `*` standing for any run. The rules live in
// the worker instance. `socket` is the node server's: it owns the sockets.
export function fixtureControls<W extends ServeWorker>(
	worker: W,
	extra?: ExtraControls,
): W {
	const delays = new Map<string, number>();
	const fails = new Map<string, number>();

	async function link(
		request: Request,
		env: never,
		ctx: never,
	): Promise<Response> {
		const vars = env as Record<string, unknown>;
		const email = vars.STACK_SERVE_EMAIL;
		const code = vars.STACK_SERVE_CODE;
		if (typeof email !== "string" || typeof code !== "string")
			return new Response("fixture link: the app has no fixture member", {
				status: 404,
			});
		const url = new URL(request.url);
		const post = (path: string, body: unknown) =>
			worker.fetch(
				new Request(`${url.origin}${AUTH}${path}`, {
					method: "POST",
					headers: { "content-type": "application/json", origin: url.origin },
					body: JSON.stringify(body),
				}),
				env,
				ctx,
			);
		const sent = await post("/email-otp/send-verification-otp", {
			email,
			type: "sign-in",
		});
		if (!sent.ok)
			return new Response(
				`fixture link: the code was refused: ${sent.status}`,
				{
					status: 502,
				},
			);
		const signed = await post("/sign-in/email-otp", { email, otp: code });
		if (!signed.ok)
			return new Response(
				`fixture link: sign-in was refused: ${signed.status}`,
				{ status: 502 },
			);
		const to = url.searchParams.get("to") ?? "/";
		const headers = new Headers({
			location: to.startsWith("/") && !to.startsWith("//") ? to : "/",
		});
		for (const cookie of signed.headers.getSetCookie())
			headers.append("set-cookie", cookie);
		return new Response(null, { status: 302, headers });
	}

	async function control(
		request: Request,
		url: URL,
		env: never,
		ctx: never,
	): Promise<Response> {
		const name = url.pathname.slice("/fixture/".length);
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
		if (name === "link") return link(request, env, ctx);
		return (
			extra?.(request, { env, ctx }) ??
			new Response(`fixture: no control ${name}`, { status: 404 })
		);
	}

	return {
		...worker,
		async fetch(request: Request, env: never, ctx: never) {
			const url = new URL(request.url);
			if (url.pathname.startsWith("/fixture/"))
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
