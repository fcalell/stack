import { isPublicRoutableHost } from "@better-auth/core/utils/host";

// The fetch transport `@better-auth/cimd` requires for a client's metadata
// document, for a Worker: Better Auth supplies one for Node only. It fetches
// public HTTPS hosts and nothing else, resolving the host over DNS over HTTPS
// and refusing any answer that is not publicly routable.
//
// Better Auth's contract also asks for the connection pinned to the checked
// address, which a Worker cannot do: its `fetch` dials by name, so a rebinding
// between the lookup and the fetch is not closed. A Worker's egress reaches the
// public internet only, never a private network of ours, which is why the
// window is accepted.

const DOH_ENDPOINT = "https://cloudflare-dns.com/dns-query";
const TYPE_A = 1;
const TYPE_AAAA = 28;

// RFC 6761 and RFC 6762 special-use names, and the names no public resolver
// answers: a host equal to one or below it is refused before any lookup.
const SPECIAL_USE_NAMES = [
	"localhost",
	"local",
	"test",
	"invalid",
	"example",
	"internal",
	"onion",
	"home.arpa",
];

// The URL parser reduces every numeric host form (decimal, octal, hex) to
// dotted decimal, and an IPv6 literal keeps its brackets.
function isIpLiteral(hostname: string): boolean {
	return hostname.startsWith("[") || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

function isSpecialUseName(hostname: string): boolean {
	const name = hostname.replace(/\.$/, "");
	return SPECIAL_USE_NAMES.some(
		(special) => name === special || name.endsWith(`.${special}`),
	);
}

interface DohAnswer {
	Status?: number;
	Answer?: { type?: number; data?: string }[];
}

// The A or AAAA addresses one DoH query answers, refusing a failed request and
// any status but NOERROR. Records of other types (a CNAME chain's links) are
// not judged: only the addresses the chain ends in are.
async function resolveAddresses(
	hostname: string,
	type: typeof TYPE_A | typeof TYPE_AAAA,
	signal: AbortSignal | undefined,
): Promise<string[]> {
	const url = new URL(DOH_ENDPOINT);
	url.searchParams.set("name", hostname);
	url.searchParams.set("type", type === TYPE_A ? "A" : "AAAA");
	const response = await globalThis.fetch(url, {
		headers: { accept: "application/dns-json" },
		signal,
	});
	if (!response.ok) {
		throw new TypeError(`DNS lookup of the metadata host failed (${type})`);
	}
	const body = (await response.json()) as DohAnswer;
	if (body.Status !== 0) {
		throw new TypeError(
			`DNS lookup of the metadata host answered status ${body.Status}`,
		);
	}
	return (body.Answer ?? [])
		.filter((record) => record.type === type && typeof record.data === "string")
		.map((record) => record.data as string);
}

export async function fetchClientMetadataResource(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	const request = new Request(input, init);
	const url = new URL(request.url);
	if (url.protocol !== "https:") {
		throw new TypeError("CIMD transport requires an HTTPS URL");
	}
	if (request.method !== "GET" && request.method !== "HEAD") {
		throw new TypeError("CIMD transport supports only GET and HEAD");
	}
	if (isIpLiteral(url.hostname)) {
		throw new TypeError("CIMD transport refuses an IP literal host");
	}
	if (isSpecialUseName(url.hostname)) {
		throw new TypeError("CIMD transport refuses a special-use host name");
	}

	const signal =
		init?.signal ?? (input instanceof Request ? input.signal : undefined);
	const [v4, v6] = await Promise.all([
		resolveAddresses(url.hostname, TYPE_A, signal),
		resolveAddresses(url.hostname, TYPE_AAAA, signal),
	]);
	const addresses = [...v4, ...v6];
	if (addresses.length === 0) {
		throw new TypeError("metadata hostname returned no DNS addresses");
	}
	if (!addresses.every((address) => isPublicRoutableHost(address))) {
		throw new TypeError(
			"metadata hostname must resolve only to public-routable addresses",
		);
	}

	// A redirect comes back as the 302 it is: the caller refuses it.
	return globalThis.fetch(url, {
		method: request.method,
		headers: request.headers,
		redirect: "manual",
		signal,
	});
}
