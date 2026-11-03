import type { ServiceSpec } from "./server/service.ts";

// `/fixture/socket?close=1` of a served app: closes the WebSockets of the
// session the request holds, as a server restart or a revoked session does.
// The other `/fixture` controls are `@fcalell/plugin-screens/serve`'s; the
// sockets are this server's. A `stack screens serve` run starts it; an app's
// own entry lists it in `services`.
export const fixtureSockets: ServiceSpec = {
	name: "fixture-sockets",
	start({ ws, http }) {
		http.mount("/fixture/socket", async (request) => {
			const session = await http.session(request);
			if (session === null)
				return new Response("fixture socket: no session", { status: 401 });
			if (new URL(request.url).searchParams.get("close") !== "1")
				return new Response("fixture socket: give close=1", { status: 400 });
			ws.closeSession(String(session.session.id));
			return new Response("closed");
		});
	},
};
