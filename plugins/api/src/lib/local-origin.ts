// Local-dev hostnames. An origin matching one is a dev origin wherever it
// appears: the `cors` derivation strips it from the baked production
// allow-list, `devCorsOrigins` picks it up instead, and plugin-auth reads it
// for APP_URL derivation. Matched against `new URL(origin).hostname`; `URL`
// preserves IPv6 brackets on `.hostname` ("[::1]" not "::1"), so the
// bracketed form is listed too.
const LOCAL_HOSTNAMES = new Set([
	"localhost",
	"127.0.0.1",
	"[::1]",
	"::1",
	"0.0.0.0",
]);

export function isLocalOrigin(origin: string): boolean {
	try {
		const { hostname } = new URL(origin);
		if (LOCAL_HOSTNAMES.has(hostname)) return true;
		// Covers `*.localhost` (RFC 6761 reserved), `*.localdomain`
		// (common on Linux /etc/hosts), and `localhost.localdomain`.
		if (hostname.endsWith(".localhost")) return true;
		if (hostname.endsWith(".localdomain")) return true;
		if (hostname === "localhost.localdomain") return true;
		return false;
	} catch {
		return false;
	}
}
