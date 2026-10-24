// Where a sign-in link may send the member after it opens. better-auth's own
// `originCheckMiddleware` guards this, but the procedures call the server API
// without a `request`, which skips it; so the procedures check here, against
// the same trusted origins the instance was built with.
//
// Allowed: a path on this app (`/dashboard`, never `//host` or `/\host`), or
// an absolute URL whose origin one trusted origin names. A trusted origin is
// an exact origin (`https://app.example.com`), a host wildcard
// (`https://*.example.com`) or a scheme (`myapp://`, `myapp://*`) for a
// native deep link.

// A control character or backslash lets a browser read a path as another
// host (`/\evil.com`, a tab inside `//`), so none is accepted anywhere.
// biome-ignore lint/suspicious/noControlCharactersInRegex: that is the point.
const UNSAFE = /[\u0000-\u001f\u007f\\]/;

function schemeOf(pattern: string): string | undefined {
	const match = /^([a-z][a-z0-9+.-]*):\/\/\*?$/i.exec(pattern);
	return match ? `${match[1]?.toLowerCase()}:` : undefined;
}

function matchesOrigin(url: URL, pattern: string): boolean {
	const scheme = schemeOf(pattern);
	if (scheme) return url.protocol === scheme;
	if (url.protocol !== "http:" && url.protocol !== "https:") return false;
	if (!pattern.includes("*")) return url.origin === pattern.toLowerCase();
	const source = pattern
		.toLowerCase()
		.split("*")
		.map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
		.join("[^/@?#:]+");
	return new RegExp(`^${source}$`).test(url.origin);
}

export function isSafeCallbackURL(
	value: string,
	trustedOrigins: readonly string[],
): boolean {
	if (UNSAFE.test(value)) return false;
	if (value.startsWith("/")) return !value.startsWith("//");
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return false;
	}
	// A userinfo (`https://app.example.com@evil.com`) is how a lookalike
	// passes a prefix check; the origin of a parsed URL already ignores it,
	// but a link that carries one is never one an app means to send.
	if (url.username || url.password) return false;
	return trustedOrigins.some((pattern) => matchesOrigin(url, pattern));
}

// The fields of an input that carry a redirect, by name; the first one that
// is not safe, so the refusal can name it.
export function unsafeCallbackField<K extends string>(
	input: Partial<Record<K, string | undefined>>,
	fields: readonly K[],
	trustedOrigins: readonly string[],
): K | undefined {
	return fields.find((field) => {
		const value = input[field];
		return value !== undefined && !isSafeCallbackURL(value, trustedOrigins);
	});
}
