import {
	type ExtraControls,
	FIXTURE_PREFIX,
} from "@fcalell/plugin-screens/serve";
import { AUTH_PREFIX } from "./types.ts";

// The served app's `/fixture/link`, for `stack screens serve`: signs the
// browser in as the fixture member through the email-code routes, with the
// address and fixed code plugin-auth's `serveEnv` gives the run
// (`STACK_SERVE_EMAIL`, `STACK_SERVE_CODE`), and redirects with the session
// cookie. Runs inside the worker (Node or workerd): web APIs only. A control
// of `fixtureControls` in `@fcalell/plugin-screens/serve`; a hand-written serve
// entry passes it in: `fixtureControls(worker, link)`.
export default async function link(
	request: Request,
	context: Parameters<ExtraControls>[1],
): Promise<Response | undefined> {
	const url = new URL(request.url);
	if (url.pathname !== `${FIXTURE_PREFIX}/link`) return undefined;
	const vars = context.env as Record<string, unknown>;
	const email = vars.STACK_SERVE_EMAIL;
	const code = vars.STACK_SERVE_CODE;
	if (typeof email !== "string" || typeof code !== "string")
		return new Response("fixture link: the app has no fixture member", {
			status: 404,
		});
	const post = (path: string, body: unknown) =>
		context.app(
			new Request(`${url.origin}${AUTH_PREFIX}${path}`, {
				method: "POST",
				headers: { "content-type": "application/json", origin: url.origin },
				body: JSON.stringify(body),
			}),
		);
	const sent = await post("/email-otp/send-verification-otp", {
		email,
		type: "sign-in",
	});
	if (!sent.ok)
		return new Response(`fixture link: the code was refused: ${sent.status}`, {
			status: 502,
		});
	const signed = await post("/sign-in/email-otp", { email, otp: code });
	if (!signed.ok)
		return new Response(`fixture link: sign-in was refused: ${signed.status}`, {
			status: 502,
		});
	const to = url.searchParams.get("to") ?? "/";
	const headers = new Headers({
		location: to.startsWith("/") && !to.startsWith("//") ? to : "/",
	});
	for (const cookie of signed.headers.getSetCookie())
		headers.append("set-cookie", cookie);
	return new Response(null, { status: 302, headers });
}
