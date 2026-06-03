import { log } from "@clack/prompts";
import { parse as parseToml } from "smol-toml";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	aggregateDevVars,
	aggregateWrangler,
	escapeDevVarValue,
} from "./codegen";

vi.mock("@clack/prompts", () => ({
	log: {
		info: vi.fn(),
		warn: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
	},
}));

describe("aggregateWrangler", () => {
	beforeEach(() => {
		vi.mocked(log.warn).mockClear();
	});

	const emptyPayload = {
		bindings: [],
		routes: [],
		vars: {},
		secrets: [],
		compatibilityDate: "2025-01-01",
	};

	it("sets main to worker.ts in a freshly generated config", () => {
		const result = aggregateWrangler({
			consumerWrangler: null,
			payload: emptyPayload,
		});
		const parsed = parseToml(result) as { main?: string };
		expect(parsed.main).toBe("worker.ts");
	});

	it("inserts main line when consumer wrangler.toml has none", () => {
		const consumer = 'name = "my-app"\ncompatibility_date = "2024-01-01"';
		const result = aggregateWrangler({
			consumerWrangler: consumer,
			payload: emptyPayload,
		});

		const parsed = parseToml(result) as { main?: string; name?: string };
		expect(parsed.main).toBe("worker.ts");
		expect(parsed.name).toBe("my-app");
		expect(log.warn).not.toHaveBeenCalled();
	});

	it("leaves main untouched and does not warn when it targets .stack/worker.ts", () => {
		const consumer = 'name = "my-app"\nmain = ".stack/worker.ts"';
		const result = aggregateWrangler({
			consumerWrangler: consumer,
			payload: emptyPayload,
		});

		const parsed = parseToml(result) as { main?: string };
		expect(parsed.main).toBe(".stack/worker.ts");
		expect(log.warn).not.toHaveBeenCalled();
	});

	it("warns when the consumer overrides main with a non-generated path", () => {
		const consumer =
			'name = "my-app"\nmain = "src/other.ts"\ncompatibility_date = "2024-01-01"';
		const result = aggregateWrangler({
			consumerWrangler: consumer,
			payload: emptyPayload,
		});

		const parsed = parseToml(result) as { main?: string };
		expect(parsed.main).toBe("src/other.ts");
		expect(log.warn).toHaveBeenCalledTimes(1);
	});

	it("emits [[d1_databases]] with binding + database_id + database_name", () => {
		const result = aggregateWrangler({
			consumerWrangler: null,
			payload: {
				...emptyPayload,
				bindings: [
					{
						kind: "d1",
						binding: "DB_MAIN",
						databaseId: "abc-123",
						databaseName: "my-db",
					},
				],
			},
		});

		const parsed = parseToml(result) as Record<string, unknown>;
		// databaseName is required (tightened type), so it always renders.
		expect(parsed.d1_databases).toEqual([
			{
				binding: "DB_MAIN",
				database_id: "abc-123",
				database_name: "my-db",
			},
		]);
	});

	it("emits [[unsafe.bindings]] for rate_limiter", () => {
		const result = aggregateWrangler({
			consumerWrangler: null,
			payload: {
				...emptyPayload,
				bindings: [
					{
						kind: "rate_limiter",
						binding: "RATE_LIMITER_IP",
						simple: { limit: 100, period: 60 },
					},
				],
			},
		});

		const parsed = parseToml(result) as {
			unsafe?: { bindings?: unknown[] };
		};
		expect(parsed.unsafe?.bindings).toEqual([
			{
				name: "RATE_LIMITER_IP",
				type: "ratelimit",
				limit: 100,
				period: 60,
			},
		]);
	});

	it("rejects rate_limiter with non-positive limit/period", () => {
		expect(() =>
			aggregateWrangler({
				consumerWrangler: null,
				payload: {
					...emptyPayload,
					bindings: [
						{
							kind: "rate_limiter",
							binding: "RATE_LIMITER_IP",
							simple: { limit: 0, period: 60 },
						},
					],
				},
			}),
		).toThrow(/limit and period must be positive integers/);

		expect(() =>
			aggregateWrangler({
				consumerWrangler: null,
				payload: {
					...emptyPayload,
					bindings: [
						{
							kind: "rate_limiter",
							binding: "RATE_LIMITER_IP",
							simple: { limit: 100, period: -1 },
						},
					],
				},
			}),
		).toThrow(/limit and period must be positive integers/);
	});

	it("rejects a route with no pattern", () => {
		expect(() =>
			aggregateWrangler({
				consumerWrangler: null,
				payload: {
					...emptyPayload,
					routes: [{ pattern: "" }],
				},
			}),
		).toThrow(/pattern is required/);
	});

	it("emits [vars] for secrets (empty values) and var-bindings", () => {
		const result = aggregateWrangler({
			consumerWrangler: null,
			payload: {
				...emptyPayload,
				bindings: [{ kind: "var", name: "MY_VAR", value: "hello" }],
				secrets: [{ name: "AUTH_SECRET", devDefault: "dev" }],
			},
		});

		const parsed = parseToml(result) as {
			vars?: Record<string, string>;
		};
		// Secrets must land as empty strings (wrangler treats [vars] entries as
		// public config; real secret values go in .dev.vars / `wrangler secret put`).
		expect(parsed.vars).toEqual({
			MY_VAR: "hello",
			AUTH_SECRET: "",
		});
	});

	it("emits [[kv_namespaces]] and [[r2_buckets]]", () => {
		const result = aggregateWrangler({
			consumerWrangler: null,
			payload: {
				...emptyPayload,
				bindings: [
					{ kind: "kv", binding: "MY_KV", id: "kv-id" },
					{ kind: "r2", binding: "MY_BUCKET", bucketName: "assets" },
				],
			},
		});

		const parsed = parseToml(result) as Record<string, unknown>;
		expect(parsed.kv_namespaces).toEqual([{ binding: "MY_KV", id: "kv-id" }]);
		expect(parsed.r2_buckets).toEqual([
			{ binding: "MY_BUCKET", bucket_name: "assets" },
		]);
	});

	// ── Unified namespace-collision checks ────────────────────────────
	//
	// Every identifier that lands at the top of env.* (bindings + [vars] keys
	// + secrets) shares one namespace. Collision across any two kinds is a
	// fail-fast situation with a message that names both shapes.

	describe("namespace collisions", () => {
		it("throws when two bindings of the same kind share an identifier", () => {
			expect(() =>
				aggregateWrangler({
					consumerWrangler: null,
					payload: {
						...emptyPayload,
						bindings: [
							{
								kind: "d1",
								binding: "DB_MAIN",
								databaseId: "abc",
								databaseName: "db",
							},
							{
								kind: "d1",
								binding: "DB_MAIN",
								databaseId: "def",
								databaseName: "db",
							},
						],
					},
				}),
			).toThrow(/"DB_MAIN".*d1 binding, d1 binding/s);
		});

		it("throws when two bindings of different kinds share an identifier", () => {
			expect(() =>
				aggregateWrangler({
					consumerWrangler: null,
					payload: {
						...emptyPayload,
						bindings: [
							{
								kind: "d1",
								binding: "DB",
								databaseId: "abc",
								databaseName: "db",
							},
							{ kind: "kv", binding: "DB", id: "kv-id" },
						],
					},
				}),
			).toThrow(/"DB".*d1 binding, kv namespace/s);
		});

		it("throws when a var and another binding share an identifier", () => {
			expect(() =>
				aggregateWrangler({
					consumerWrangler: null,
					payload: {
						...emptyPayload,
						bindings: [
							{ kind: "kv", binding: "SHARED", id: "kv-id" },
							{ kind: "var", name: "SHARED", value: "v" },
						],
					},
				}),
			).toThrow(/"SHARED".*kv namespace, var/s);
		});

		it("throws when a secret collides with a binding", () => {
			expect(() =>
				aggregateWrangler({
					consumerWrangler: null,
					payload: {
						...emptyPayload,
						bindings: [{ kind: "kv", binding: "TOKEN", id: "kv-id" }],
						secrets: [{ name: "TOKEN", devDefault: "dev" }],
					},
				}),
			).toThrow(/"TOKEN".*kv namespace, secret/s);
		});

		it("throws when a secret collides with a var binding", () => {
			expect(() =>
				aggregateWrangler({
					consumerWrangler: null,
					payload: {
						...emptyPayload,
						bindings: [{ kind: "var", name: "APP_URL", value: "prod" }],
						secrets: [{ name: "APP_URL", devDefault: "dev" }],
					},
				}),
			).toThrow(/"APP_URL".*var, secret/s);
		});

		it("throws when a secret collides with an extraVars entry", () => {
			expect(() =>
				aggregateWrangler({
					consumerWrangler: null,
					payload: {
						...emptyPayload,
						vars: { NODE_ENV: "prod" },
						secrets: [{ name: "NODE_ENV", devDefault: "dev" }],
					},
				}),
			).toThrow(/"NODE_ENV".*secret, extra var/s);
		});

		it("throws when two secrets share a name", () => {
			expect(() =>
				aggregateWrangler({
					consumerWrangler: null,
					payload: {
						...emptyPayload,
						secrets: [
							{ name: "AUTH_SECRET", devDefault: "a" },
							{ name: "AUTH_SECRET", devDefault: "b" },
						],
					},
				}),
			).toThrow(/"AUTH_SECRET".*secret, secret/s);
		});

		it("throws when an extraVars key collides with a binding", () => {
			expect(() =>
				aggregateWrangler({
					consumerWrangler: null,
					payload: {
						...emptyPayload,
						bindings: [{ kind: "kv", binding: "FEATURE_FLAG", id: "kv-id" }],
						vars: { FEATURE_FLAG: "on" },
					},
				}),
			).toThrow(/"FEATURE_FLAG".*kv namespace, extra var/s);
		});

		it("reports every distinct conflict in one error", () => {
			let caught: Error | null = null;
			try {
				aggregateWrangler({
					consumerWrangler: null,
					payload: {
						...emptyPayload,
						bindings: [
							{ kind: "kv", binding: "A", id: "a" },
							{
								kind: "d1",
								binding: "A",
								databaseId: "a",
								databaseName: "a",
							},
							{ kind: "r2", binding: "B", bucketName: "b" },
						],
						secrets: [{ name: "B", devDefault: "dev" }],
					},
				});
			} catch (err) {
				caught = err as Error;
			}
			expect(caught).not.toBeNull();
			expect(caught?.message).toMatch(/"A"/);
			expect(caught?.message).toMatch(/"B"/);
		});
	});

	it("generates default name + compatibility_date when no consumer file exists", () => {
		const result = aggregateWrangler({
			consumerWrangler: null,
			payload: emptyPayload,
			name: "test-app",
		});

		const parsed = parseToml(result) as {
			name?: string;
			compatibility_date?: string;
		};
		expect(parsed.name).toBe("test-app");
		expect(parsed.compatibility_date).toBe("2025-01-01");
	});

	// ── Merge contract ─────────────────────────────────────────────────
	//
	// Three categories, encoded explicitly in code:
	//   (1) framework-managed lists — consumer cannot specify; throws
	//   (2) framework-defaulted scalars — consumer wins, else default
	//   (3) consumer-only fields — pass-through verbatim
	// `[vars]` is a hybrid: consumer keys pass through, framework keys
	// overlay, collisions throw.

	describe("merge contract: framework-defaulted scalars", () => {
		it("fills compatibility_date when consumer wrangler.toml omits it (regression)", () => {
			// Bug class: prior implementation only seeded compat_date in the
			// no-consumer-file branch. A consumer file without it dropped the
			// framework default and let wrangler silently fall back internally.
			const consumer = 'name = "my-app"\n';
			const result = aggregateWrangler({
				consumerWrangler: consumer,
				payload: emptyPayload,
				name: "fallback",
			});

			const parsed = parseToml(result) as { compatibility_date?: string };
			expect(parsed.compatibility_date).toBe("2025-01-01");
		});

		it("fills name when consumer wrangler.toml omits it", () => {
			const consumer = 'compatibility_date = "2024-12-12"\n';
			const result = aggregateWrangler({
				consumerWrangler: consumer,
				payload: emptyPayload,
				name: "my-app",
			});

			const parsed = parseToml(result) as { name?: string };
			expect(parsed.name).toBe("my-app");
		});

		it("preserves consumer-supplied name verbatim", () => {
			const consumer = 'name = "consumer-wins"\n';
			const result = aggregateWrangler({
				consumerWrangler: consumer,
				payload: emptyPayload,
				name: "different-fallback",
			});

			const parsed = parseToml(result) as { name?: string };
			expect(parsed.name).toBe("consumer-wins");
		});

		it("preserves consumer-supplied compatibility_date verbatim", () => {
			const consumer = 'compatibility_date = "2024-06-15"\n';
			const result = aggregateWrangler({
				consumerWrangler: consumer,
				payload: emptyPayload,
			});

			const parsed = parseToml(result) as { compatibility_date?: string };
			expect(parsed.compatibility_date).toBe("2024-06-15");
		});

		it("rejects an invalid framework default compatibility_date", () => {
			expect(() =>
				aggregateWrangler({
					consumerWrangler: null,
					payload: { ...emptyPayload, compatibilityDate: "yesterday" },
				}),
			).toThrow(/must be YYYY-MM-DD/);
		});

		it("rejects a consumer-supplied invalid compatibility_date", () => {
			expect(() =>
				aggregateWrangler({
					consumerWrangler: 'compatibility_date = "2024/06/15"\n',
					payload: emptyPayload,
				}),
			).toThrow(/must be YYYY-MM-DD/);
		});

		it("rejects a non-string consumer-supplied name", () => {
			expect(() =>
				aggregateWrangler({
					consumerWrangler: "name = 42\n",
					payload: emptyPayload,
				}),
			).toThrow(/`name` must be a string/);
		});
	});

	describe("merge contract: consumer pass-through", () => {
		it("preserves arbitrary consumer-only fields like account_id", () => {
			const consumer = 'account_id = "abc-123"\nworkers_dev = false\n';
			const result = aggregateWrangler({
				consumerWrangler: consumer,
				payload: emptyPayload,
				name: "my-app",
			});

			const parsed = parseToml(result) as {
				account_id?: string;
				workers_dev?: boolean;
			};
			expect(parsed.account_id).toBe("abc-123");
			expect(parsed.workers_dev).toBe(false);
		});

		it("preserves consumer [build] / [dev] tables verbatim", () => {
			const consumer = `[dev]
ip = "127.0.0.1"
port = 8787
`;
			const result = aggregateWrangler({
				consumerWrangler: consumer,
				payload: emptyPayload,
				name: "my-app",
			});

			const parsed = parseToml(result) as {
				dev?: { ip?: string; port?: number };
			};
			expect(parsed.dev).toEqual({ ip: "127.0.0.1", port: 8787 });
		});
	});

	describe("merge contract: framework-managed sections", () => {
		it("rejects consumer wrangler.toml that defines [[d1_databases]]", () => {
			const consumer = `name = "my-app"
[[d1_databases]]
binding = "DB"
database_id = "abc"
database_name = "x"
`;
			expect(() =>
				aggregateWrangler({
					consumerWrangler: consumer,
					payload: emptyPayload,
				}),
			).toThrow(/framework-managed section.*\[\[d1_databases\]\]/s);
		});

		it("rejects consumer wrangler.toml that defines [[kv_namespaces]]", () => {
			const consumer = `[[kv_namespaces]]
binding = "MY_KV"
id = "kv-id"
`;
			expect(() =>
				aggregateWrangler({
					consumerWrangler: consumer,
					payload: emptyPayload,
				}),
			).toThrow(/\[\[kv_namespaces\]\]/);
		});

		it("rejects consumer wrangler.toml that defines [[r2_buckets]]", () => {
			const consumer = `[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "assets"
`;
			expect(() =>
				aggregateWrangler({
					consumerWrangler: consumer,
					payload: emptyPayload,
				}),
			).toThrow(/\[\[r2_buckets\]\]/);
		});

		it("rejects consumer wrangler.toml that defines [[unsafe.bindings]]", () => {
			const consumer = `[[unsafe.bindings]]
name = "RL"
type = "ratelimit"
`;
			expect(() =>
				aggregateWrangler({
					consumerWrangler: consumer,
					payload: emptyPayload,
				}),
			).toThrow(/unsafe\.bindings/);
		});

		it("rejects consumer wrangler.toml that defines [[routes]]", () => {
			const consumer = `[[routes]]
pattern = "example.com/*"
`;
			expect(() =>
				aggregateWrangler({
					consumerWrangler: consumer,
					payload: emptyPayload,
				}),
			).toThrow(/\[\[routes\]\]/);
		});

		it("emits framework-managed lists driven entirely by plugin contributions", () => {
			const consumer = `name = "my-app"
account_id = "abc-123"
`;
			const result = aggregateWrangler({
				consumerWrangler: consumer,
				payload: {
					...emptyPayload,
					bindings: [
						{
							kind: "d1",
							binding: "DB_MAIN",
							databaseId: "abc",
							databaseName: "x",
						},
					],
				},
			});

			const parsed = parseToml(result) as {
				name?: string;
				account_id?: string;
				d1_databases?: unknown[];
				compatibility_date?: string;
			};
			expect(parsed.name).toBe("my-app");
			expect(parsed.account_id).toBe("abc-123");
			expect(parsed.compatibility_date).toBe("2025-01-01");
			expect(parsed.d1_databases).toEqual([
				{ binding: "DB_MAIN", database_id: "abc", database_name: "x" },
			]);
		});
	});

	describe("merge contract: [vars] hybrid overlay", () => {
		it("passes consumer [vars] through verbatim when no framework keys collide", () => {
			const consumer = `[vars]
NODE_ENV = "production"
LOG_LEVEL = "info"
`;
			const result = aggregateWrangler({
				consumerWrangler: consumer,
				payload: emptyPayload,
			});

			const parsed = parseToml(result) as { vars?: Record<string, string> };
			expect(parsed.vars).toEqual({
				NODE_ENV: "production",
				LOG_LEVEL: "info",
			});
		});

		it("merges consumer [vars] with framework var bindings", () => {
			const consumer = `[vars]
NODE_ENV = "production"
`;
			const result = aggregateWrangler({
				consumerWrangler: consumer,
				payload: {
					...emptyPayload,
					bindings: [{ kind: "var", name: "API_PREFIX", value: "/api" }],
				},
			});

			const parsed = parseToml(result) as { vars?: Record<string, string> };
			expect(parsed.vars).toEqual({
				NODE_ENV: "production",
				API_PREFIX: "/api",
			});
		});

		it("rejects a consumer [vars] key that collides with a framework secret", () => {
			const consumer = `[vars]
AUTH_SECRET = "leaked-from-consumer"
`;
			expect(() =>
				aggregateWrangler({
					consumerWrangler: consumer,
					payload: {
						...emptyPayload,
						secrets: [{ name: "AUTH_SECRET", devDefault: "dev" }],
					},
				}),
			).toThrow(/AUTH_SECRET.*consumer wrangler\.toml \[vars\].*secret/s);
		});

		it("rejects a consumer [vars] key that collides with a framework var binding", () => {
			const consumer = `[vars]
API_PREFIX = "/v1"
`;
			expect(() =>
				aggregateWrangler({
					consumerWrangler: consumer,
					payload: {
						...emptyPayload,
						bindings: [{ kind: "var", name: "API_PREFIX", value: "/api" }],
					},
				}),
			).toThrow(
				/API_PREFIX.*consumer wrangler\.toml \[vars\].*var binding/s,
			);
		});

		it("rejects a consumer [vars] key that collides with a plugin-contributed extra var", () => {
			const consumer = `[vars]
FEATURE = "off"
`;
			expect(() =>
				aggregateWrangler({
					consumerWrangler: consumer,
					payload: {
						...emptyPayload,
						vars: { FEATURE: "on" },
					},
				}),
			).toThrow(/FEATURE.*consumer wrangler\.toml \[vars\].*extra var/s);
		});
	});
});

describe("aggregateDevVars", () => {
	it("returns null for no secrets", () => {
		expect(aggregateDevVars([])).toBeNull();
	});

	it("renders KEY=VALUE lines terminated with a newline", () => {
		const result = aggregateDevVars([
			{ name: "AUTH_SECRET", devDefault: "dev-secret-change-me" },
			{ name: "APP_URL", devDefault: "http://localhost:3000" },
		]);
		expect(result).toBe(
			"AUTH_SECRET=dev-secret-change-me\nAPP_URL=http://localhost:3000\n",
		);
	});

	it("escapes special characters in devDefault values", () => {
		const result = aggregateDevVars([
			{ name: "SECRET", devDefault: 'hello "world"\nbye' },
		]);
		expect(result).toBe('SECRET="hello \\"world\\"\\nbye"\n');
	});

	it("escapes backslashes and carriage returns in devDefault values", () => {
		const result = aggregateDevVars([
			{ name: "SECRET", devDefault: "a\\b\r\nc" },
		]);
		expect(result).toBe('SECRET="a\\\\b\\r\\nc"\n');
	});

	it("quotes values containing equals signs", () => {
		const result = aggregateDevVars([
			{ name: "SECRET", devDefault: "key=value" },
		]);
		expect(result).toBe('SECRET="key=value"\n');
	});
});

describe("escapeDevVarValue", () => {
	it("leaves simple safe values unquoted", () => {
		expect(escapeDevVarValue("simple")).toBe("simple");
		expect(escapeDevVarValue("http://localhost:3000")).toBe(
			"http://localhost:3000",
		);
		expect(escapeDevVarValue("a.b-c_d+e@f/g")).toBe("a.b-c_d+e@f/g");
	});

	it("quotes the empty string so dotenv doesn't treat it as undefined", () => {
		expect(escapeDevVarValue("")).toBe('""');
	});

	it("quotes values with leading or trailing whitespace", () => {
		expect(escapeDevVarValue(" leading")).toBe('" leading"');
		expect(escapeDevVarValue("trailing ")).toBe('"trailing "');
		expect(escapeDevVarValue("\t")).toBe('"\\t"');
	});

	it("encodes tabs as \\t", () => {
		expect(escapeDevVarValue("a\tb")).toBe('"a\\tb"');
	});

	it("encodes form-feed and vertical-tab as \\f and \\v", () => {
		// Defensive: dotenv-flavour parsers handle a literal \f or \v inside a
		// double-quoted string inconsistently. Always emit the two-char escape.
		expect(escapeDevVarValue("a\fb")).toBe('"a\\fb"');
		expect(escapeDevVarValue("a\vb")).toBe('"a\\vb"');
	});

	it("encodes newlines and carriage returns", () => {
		expect(escapeDevVarValue("a\nb")).toBe('"a\\nb"');
		expect(escapeDevVarValue("a\rb")).toBe('"a\\rb"');
		expect(escapeDevVarValue("a\r\nb")).toBe('"a\\r\\nb"');
	});

	it("escapes double quotes and backslashes", () => {
		expect(escapeDevVarValue('say "hi"')).toBe('"say \\"hi\\""');
		expect(escapeDevVarValue("C:\\path")).toBe('"C:\\\\path"');
	});

	it("quotes values containing =, #, $, or a space", () => {
		expect(escapeDevVarValue("key=value")).toBe('"key=value"');
		expect(escapeDevVarValue("with #comment")).toBe('"with #comment"');
		expect(escapeDevVarValue("hello world")).toBe('"hello world"');
		expect(escapeDevVarValue("$var")).toBe('"$var"');
	});

	it("round-trips every tricky value through a dotenv parser", () => {
		// Cheap local dotenv parser that handles the output shape we produce.
		// Single-pass escape decoder so two-char sequences are interpreted
		// independently — naively chaining `.replace`s would expand `\\\\n`
		// (literal `\n`) into a newline, which is wrong. The single-pass form
		// also preserves the order-independence the encoder relies on.
		const parse = (line: string): string => {
			const eq = line.indexOf("=");
			const raw = line.slice(eq + 1);
			if (raw.startsWith('"') && raw.endsWith('"')) {
				const inner = raw.slice(1, -1);
				let out = "";
				for (let i = 0; i < inner.length; i++) {
					const ch = inner[i];
					if (ch === "\\" && i + 1 < inner.length) {
						const next = inner[i + 1];
						i++;
						switch (next) {
							case "n":
								out += "\n";
								break;
							case "r":
								out += "\r";
								break;
							case "t":
								out += "\t";
								break;
							case "f":
								out += "\f";
								break;
							case "v":
								out += "\v";
								break;
							case '"':
								out += '"';
								break;
							case "\\":
								out += "\\";
								break;
							default:
								out += next;
								break;
						}
					} else {
						out += ch;
					}
				}
				return out;
			}
			return raw;
		};

		const cases = [
			"simple",
			"",
			" leading",
			"trailing ",
			"\t",
			"a\tb",
			"a\fb",
			"a\vb",
			"a\nb",
			"a\rb",
			"a\r\nb",
			'say "hi"',
			"C:\\path",
			"key=value",
			"with #comment",
			"$var",
			"hello world",
		];

		for (const value of cases) {
			const encoded = escapeDevVarValue(value);
			const line = `KEY=${encoded}`;
			expect(parse(line)).toBe(value);
		}
	});
});
