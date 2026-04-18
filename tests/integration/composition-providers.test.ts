import { aggregateProviders } from "@fcalell/cli/codegen";
import { Composition, createEventBus } from "@fcalell/cli/events";
import { createMockCtx } from "@fcalell/cli/testing";
import { solid } from "@fcalell/plugin-solid";
import { solidUi } from "@fcalell/plugin-solid-ui";
import { describe, expect, it } from "vitest";

describe("Composition.Providers integration (solid + solid-ui)", () => {
	it("plugin-solid-ui contributes MetaProvider + Toaster via Composition.Providers", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx();
		solidUi.cli.register(ctx, bus, {});

		const payload = await bus.emit(Composition.Providers, { providers: [] });
		expect(payload.providers).toHaveLength(1);

		const spec = payload.providers[0];
		expect(spec?.wrap.identifier).toBe("MetaProvider");
		expect(spec?.siblings).toHaveLength(1);
		const sibling = spec?.siblings?.[0];
		expect(sibling?.kind).toBe("jsx");
		if (sibling?.kind === "jsx") {
			expect(sibling.tag).toBe("Toaster");
		}
	});

	it("plugin-solid alone contributes no providers (Providers stub applies)", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx();
		solid.cli.register(ctx, bus, solid.events);

		const payload = await bus.emit(Composition.Providers, { providers: [] });
		expect(payload.providers).toHaveLength(0);

		// aggregateProviders returns null — the Vite plugin then serves the stub.
		expect(aggregateProviders(payload)).toBeNull();
	});

	it("generated virtual-providers.tsx wraps Router children inside MetaProvider with Toaster sibling", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx();
		solidUi.cli.register(ctx, bus, {});

		const payload = await bus.emit(Composition.Providers, { providers: [] });
		const source = aggregateProviders(payload);
		expect(source).not.toBeNull();
		if (!source) return;

		expect(source).toContain('import { MetaProvider } from "@fcalell/ui/meta"');
		expect(source).toContain(
			'import { Toaster } from "@fcalell/ui/components/toast"',
		);
		expect(source).toContain('import type { JSX } from "solid-js"');

		// Toaster is INSIDE MetaProvider (shares its context).
		expect(source).toMatch(
			/<MetaProvider>[\s\S]*\{props\.children\}[\s\S]*<Toaster \/>[\s\S]*<\/MetaProvider>/,
		);
	});

	it("preserves outer-first wrap order across multiple providers", async () => {
		const bus = createEventBus();

		// Simulate a third-party plugin adding an outer wrapper with lower order.
		bus.on(Composition.Providers, (p) => {
			p.providers.push({
				imports: [{ source: "@third/theme", named: ["ThemeProvider"] }],
				wrap: { identifier: "ThemeProvider" },
				order: 50,
			});
		});

		const ctx = createMockCtx();
		solidUi.cli.register(ctx, bus, {});

		const payload = await bus.emit(Composition.Providers, { providers: [] });
		const source = aggregateProviders(payload);
		expect(source).not.toBeNull();
		if (!source) return;

		// ThemeProvider (order 50) is outer; MetaProvider (order 100) is inner.
		expect(source).toMatch(
			/<ThemeProvider>[\s\S]*<MetaProvider>[\s\S]*<\/MetaProvider>[\s\S]*<\/ThemeProvider>/,
		);
	});
});
