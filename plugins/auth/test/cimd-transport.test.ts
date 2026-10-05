import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { fetchClientMetadataResource } from "../src/worker/cimd-transport.ts";

afterEach(() => mock.restoreAll());

interface Answer {
	Status?: number;
	Answer?: { name?: string; type: number; data: string }[];
}

interface Network {
	// The DoH answer per record type: a failure, or a JSON body.
	a: Answer | "fail";
	aaaa: Answer | "fail";
	// What the document host answers.
	document?: Response;
}

interface Call {
	url: URL;
	init: RequestInit | undefined;
}

// Stubs `globalThis.fetch`: the DoH endpoint answers by record type, every
// other host is the document host. Answers are recorded in order.
function stubNetwork(network: Network): Call[] {
	const calls: Call[] = [];
	mock.method(
		globalThis,
		"fetch",
		async (input: URL | string, init?: RequestInit) => {
			const url = new URL(String(input));
			calls.push({ url, init });
			if (url.hostname === "cloudflare-dns.com") {
				const answer =
					url.searchParams.get("type") === "A" ? network.a : network.aaaa;
				if (answer === "fail") throw new TypeError("network down");
				return Response.json({ Status: 0, ...answer });
			}
			return network.document ?? new Response("{}", { status: 200 });
		},
	);
	return calls;
}

const pub = (data = "93.184.216.34", type = 1) => ({
	Answer: [{ name: "client.acme-agent.com", type, data }],
});
const URL_OK = "https://client.acme-agent.com/oauth/client.json";

// Refused before the document fetch: nothing but DoH queries went out.
async function refused(url: string, network: Network, init?: RequestInit) {
	const calls = stubNetwork(network);
	await assert.rejects(fetchClientMetadataResource(url, init), TypeError, url);
	assert.equal(
		calls.some((call) => call.url.hostname !== "cloudflare-dns.com"),
		false,
		`${url} reached the document host`,
	);
}

const emptyAnswers: Network = { a: {}, aaaa: {} };

test("the transport fetches public hosts only", async () => {
	// A scheme, a literal, a special-use name and a method it refuses before
	// any lookup.
	for (const url of [
		"http://client.acme-agent.com/c.json",
		"https://93.184.216.34/c.json",
		"https://[2606:4700::6810:84e5]/c.json",
		"https://2130706433/c.json",
		"https://localhost/c.json",
		"https://app.localhost/c.json",
		"https://printer.local/c.json",
		"https://client.test/c.json",
		"https://client.invalid/c.json",
		"https://client.example/c.json",
		"https://client.internal/c.json",
		"https://hidden.onion/c.json",
		"https://router.home.arpa/c.json",
	]) {
		const calls = stubNetwork({ a: pub(), aaaa: {} });
		await assert.rejects(fetchClientMetadataResource(url), TypeError, url);
		assert.equal(calls.length, 0, `${url} was looked up`);
		mock.restoreAll();
	}
	await refused(URL_OK, { a: pub(), aaaa: {} }, { method: "POST" });

	// A lookup that fails, answers nothing, answers an error status on either
	// query, or answers an address that is not public is refused before the
	// document is fetched.
	await refused(URL_OK, { a: "fail", aaaa: {} });
	await refused(URL_OK, { a: pub(), aaaa: "fail" });
	await refused(URL_OK, emptyAnswers);
	await refused(URL_OK, {
		a: { Status: 2 },
		aaaa: pub("2606:4700::6810:84e5", 28),
	});
	await refused(URL_OK, { a: pub(), aaaa: { Status: 3 } });
	await refused(URL_OK, { a: pub("10.0.0.5"), aaaa: {} });
	await refused(URL_OK, { a: pub("127.0.0.1"), aaaa: {} });
	await refused(URL_OK, { a: {}, aaaa: pub("::1", 28) });
	await refused(URL_OK, { a: pub("169.254.169.254"), aaaa: {} });
	// A CNAME chain is not judged, the address it ends in is.
	await refused(URL_OK, {
		a: {
			Answer: [
				{ type: 5, data: "alias.acme-agent.com." },
				{ type: 1, data: "192.168.1.10" },
			],
		},
		aaaa: {},
	});
	// One private address among public ones refuses the host.
	await refused(URL_OK, {
		a: {
			Answer: [
				{ type: 1, data: "93.184.216.34" },
				{ type: 1, data: "10.1.2.3" },
			],
		},
		aaaa: {},
	});
	// Only a CNAME, no address, is no address.
	await refused(URL_OK, {
		a: { Answer: [{ type: 5, data: "alias.acme-agent.com." }] },
		aaaa: {},
	});
});

test("a public answer fetches the document, and a redirect comes back unfollowed", async () => {
	const document = Response.json({ client_id: URL_OK });
	const calls = stubNetwork({ a: pub(), aaaa: {}, document });
	const controller = new AbortController();
	const response = await fetchClientMetadataResource(URL_OK, {
		headers: { accept: "application/json" },
		redirect: "error",
		signal: controller.signal,
	});
	assert.equal(response, document);
	// Both lookups and the document ride the caller's signal; the document is
	// fetched with redirects handed back.
	assert.equal(calls.length, 3);
	for (const call of calls) assert.equal(call.init?.signal, controller.signal);
	const fetched = calls.at(-1);
	assert.equal(fetched?.url.href, URL_OK);
	assert.equal(fetched?.init?.redirect, "manual");
	assert.equal(
		new Headers(fetched?.init?.headers).get("accept"),
		"application/json",
	);
	assert.deepEqual(
		calls.slice(0, 2).map((call) => call.url.searchParams.get("type")),
		["A", "AAAA"],
	);

	// A public A with an empty AAAA, and a public AAAA alone, each fetch.
	mock.restoreAll();
	stubNetwork({ a: {}, aaaa: pub("2606:4700::6810:84e5", 28) });
	assert.equal((await fetchClientMetadataResource(URL_OK)).status, 200);
	mock.restoreAll();

	const redirect = new Response(null, {
		status: 302,
		headers: { location: "https://elsewhere.acme-agent.com/c.json" },
	});
	stubNetwork({ a: pub(), aaaa: {}, document: redirect });
	const followed = await fetchClientMetadataResource(URL_OK);
	assert.equal(followed.status, 302);
	assert.equal(followed.redirected, false);
	mock.restoreAll();

	// HEAD is allowed.
	stubNetwork({ a: pub(), aaaa: {} });
	assert.equal(
		(await fetchClientMetadataResource(URL_OK, { method: "HEAD" })).status,
		200,
	);
});
