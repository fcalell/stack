// Private test support for the packages whose tests sign in (plugin-auth's
// passkey test, plugin-node's end-to-end worker test): a software WebAuthn
// authenticator, a cookie jar, session minting, and table creation from
// drizzle schema modules. Never published.
import { createHash, webcrypto } from "node:crypto";
import { sql } from "@fcalell/plugin-db/orm";
import { makeSignature } from "better-auth/crypto";
import {
	generateSQLiteDrizzleJson,
	generateSQLiteMigration,
} from "drizzle-kit/api";

// ── Tables ──────────────────────────────────────────────────────────

// Creates every table the schema modules declare, with the DDL drizzle-kit
// generates for them against an empty database.
export async function createTables(
	db: { run(query: ReturnType<typeof sql.raw>): unknown },
	schema: Record<string, unknown>,
): Promise<void> {
	const statements = await generateSQLiteMigration(
		await generateSQLiteDrizzleJson({}),
		await generateSQLiteDrizzleJson(schema),
	);
	for (const statement of statements) db.run(sql.raw(statement));
}

// ── Sessions and cookies ────────────────────────────────────────────

interface AuthContext {
	secret: string;
	authCookies: { sessionToken: { name: string } };
	internalAdapter: {
		createSession(userId: string): Promise<{ token: string }>;
	};
}

// A session for `userId`, minted the way better-auth's own test utilities
// do: the token cookie under better-auth's session cookie name, signed with
// the auth secret.
export async function mintSessionCookie(
	auth: unknown,
	userId: string,
): Promise<[string, string]> {
	const ctx = await (auth as { $context: Promise<AuthContext> }).$context;
	const { token } = await ctx.internalAdapter.createSession(userId);
	return [
		ctx.authCookies.sessionToken.name,
		`${token}.${await makeSignature(token, ctx.secret)}`,
	];
}

export class CookieJar {
	readonly cookies = new Map<string, string>();

	store(response: Response): void {
		for (const cookie of response.headers.getSetCookie()) {
			const pair = cookie.slice(0, cookie.indexOf(";"));
			const eq = pair.indexOf("=");
			this.cookies.set(pair.slice(0, eq), pair.slice(eq + 1));
		}
	}

	header(): string {
		return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
	}
}

// ── Software authenticator ──────────────────────────────────────────

const b64url = (bytes: Uint8Array): string =>
	Buffer.from(bytes).toString("base64url");
const sha256 = (data: Uint8Array): Uint8Array =>
	new Uint8Array(createHash("sha256").update(data).digest());
const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text);

type Cbor = number | string | Uint8Array | Map<Cbor, Cbor>;

// Minimal-length heads, as the verifier's re-encoding of the COSE key
// expects: it measures the key by encoding what it decoded.
function cborHead(major: number, n: number): number[] {
	if (n < 24) return [(major << 5) | n];
	if (n < 0x100) return [(major << 5) | 24, n];
	if (n < 0x10000) return [(major << 5) | 25, n >> 8, n & 0xff];
	throw new Error(`cbor: ${n} too large`);
}

function cbor(value: Cbor): number[] {
	if (typeof value === "number") {
		return value >= 0 ? cborHead(0, value) : cborHead(1, -1 - value);
	}
	if (typeof value === "string") {
		const bytes = utf8(value);
		return [...cborHead(3, bytes.length), ...bytes];
	}
	if (value instanceof Uint8Array) {
		return [...cborHead(2, value.length), ...value];
	}
	const out = cborHead(5, value.size);
	for (const [k, v] of value) out.push(...cbor(k), ...cbor(v));
	return out;
}

// WebCrypto signs ECDSA as raw r||s; WebAuthn carries ASN.1 DER.
function derSignature(raw: Uint8Array): Uint8Array {
	const integer = (bytes: Uint8Array): number[] => {
		let i = 0;
		while (i < bytes.length - 1 && bytes[i] === 0) i++;
		const trimmed = [...bytes.subarray(i)];
		if ((trimmed[0] ?? 0) & 0x80) trimmed.unshift(0);
		return [0x02, trimmed.length, ...trimmed];
	};
	const body = [...integer(raw.subarray(0, 32)), ...integer(raw.subarray(32))];
	return new Uint8Array([0x30, body.length, ...body]);
}

const FLAG_UP = 0x01;
const FLAG_UV = 0x04;
const FLAG_AT = 0x40;

// A platform authenticator holding one P-256 credential, answering
// `none`-attestation registrations and assertions for one rpID and origin.
export class SoftwareAuthenticator {
	private signCount = 0;
	private readonly credentialId = webcrypto.getRandomValues(new Uint8Array(16));
	readonly id = b64url(this.credentialId);
	private readonly keys: webcrypto.CryptoKeyPair;
	private readonly rpID: string;
	private readonly origin: string;

	private constructor(
		keys: webcrypto.CryptoKeyPair,
		rpID: string,
		origin: string,
	) {
		this.keys = keys;
		this.rpID = rpID;
		this.origin = origin;
	}

	static async create(
		rpID: string,
		origin: string,
	): Promise<SoftwareAuthenticator> {
		const keys = await webcrypto.subtle.generateKey(
			{ name: "ECDSA", namedCurve: "P-256" },
			true,
			["sign", "verify"],
		);
		return new SoftwareAuthenticator(keys, rpID, origin);
	}

	private authenticatorData(flags: number, attested: number[] = []) {
		const count = new Uint8Array(4);
		new DataView(count.buffer).setUint32(0, this.signCount);
		return new Uint8Array([
			...sha256(utf8(this.rpID)),
			flags,
			...count,
			...attested,
		]);
	}

	private clientDataJSON(type: string, challenge: string): Uint8Array {
		return utf8(JSON.stringify({ type, challenge, origin: this.origin }));
	}

	// Answers `generate-register-options` with what a browser posts to
	// `verify-registration`.
	async register(options: { challenge: string }) {
		const jwk = await webcrypto.subtle.exportKey("jwk", this.keys.publicKey);
		const coseKey = new Map<Cbor, Cbor>([
			[1, 2],
			[3, -7],
			[-1, 1],
			[-2, Buffer.from(jwk.x ?? "", "base64url")],
			[-3, Buffer.from(jwk.y ?? "", "base64url")],
		]);
		const idLength = [this.credentialId.length >> 8, this.credentialId.length];
		const authData = this.authenticatorData(FLAG_UP | FLAG_UV | FLAG_AT, [
			...new Uint8Array(16),
			...idLength,
			...this.credentialId,
			...cbor(coseKey),
		]);
		const attestationObject = new Uint8Array(
			cbor(
				new Map<Cbor, Cbor>([
					["fmt", "none"],
					["attStmt", new Map()],
					["authData", authData],
				]),
			),
		);
		return {
			id: this.id,
			rawId: this.id,
			type: "public-key",
			authenticatorAttachment: "platform",
			response: {
				clientDataJSON: b64url(
					this.clientDataJSON("webauthn.create", options.challenge),
				),
				attestationObject: b64url(attestationObject),
				transports: ["internal"],
			},
			clientExtensionResults: {},
		};
	}

	// Answers `generate-authenticate-options` with what a browser posts to
	// `verify-authentication`.
	async authenticate(options: { challenge: string }) {
		this.signCount++;
		const authData = this.authenticatorData(FLAG_UP | FLAG_UV);
		const clientData = this.clientDataJSON("webauthn.get", options.challenge);
		const signature = await webcrypto.subtle.sign(
			{ name: "ECDSA", hash: "SHA-256" },
			this.keys.privateKey,
			new Uint8Array([...authData, ...sha256(clientData)]),
		);
		return {
			id: this.id,
			rawId: this.id,
			type: "public-key",
			authenticatorAttachment: "platform",
			response: {
				clientDataJSON: b64url(clientData),
				authenticatorData: b64url(authData),
				signature: b64url(derSignature(new Uint8Array(signature))),
			},
			clientExtensionResults: {},
		};
	}
}

// ── The two ceremonies over HTTP ────────────────────────────────────

export type Send = (path: string, init?: RequestInit) => Promise<Response>;

// A browser at `origin` talking to the auth surface: every request carries
// the origin and the jar's cookies, and every response feeds the jar.
export function browser(fetchPath: Send, origin: string, jar: CookieJar): Send {
	return async (path, init = {}) => {
		const headers = new Headers(init.headers);
		headers.set("origin", origin);
		headers.set("cookie", jar.header());
		if (init.body) headers.set("content-type", "application/json");
		const response = await fetchPath(path, { ...init, headers });
		jar.store(response);
		return response;
	};
}

// Registers the authenticator's credential for the signed-in user.
export async function registerPasskey(
	send: Send,
	authenticator: SoftwareAuthenticator,
): Promise<Response> {
	const options = await send("/api/auth/passkey/generate-register-options");
	if (!options.ok) throw new Error(`register options: ${options.status}`);
	return send("/api/auth/passkey/verify-registration", {
		method: "POST",
		body: JSON.stringify({
			response: await authenticator.register(
				(await options.json()) as { challenge: string },
			),
		}),
	});
}

// Signs in with the authenticator's credential.
export async function signInWithPasskey(
	send: Send,
	authenticator: SoftwareAuthenticator,
): Promise<Response> {
	const options = await send("/api/auth/passkey/generate-authenticate-options");
	if (!options.ok) throw new Error(`authenticate options: ${options.status}`);
	return send("/api/auth/passkey/verify-authentication", {
		method: "POST",
		body: JSON.stringify({
			response: await authenticator.authenticate(
				(await options.json()) as { challenge: string },
			),
		}),
	});
}
