import { createEventBus } from "@fcalell/cli/events";
import { createMockCtx } from "@fcalell/cli/testing";
import { solid } from "@fcalell/plugin-solid";
import { aggregateProviders } from "@fcalell/plugin-solid/codegen";
import { solidUi } from "@fcalell/plugin-solid-ui";
import { describe, expect, it } from "vitest";

describe("solid.events.Providers integration (solid + solid-ui)", () => {
	it("plugin-solid-ui contributes MetaProvider + Toaster via solid.events.Providers", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx();
		solidUi.cli.register(ctx, bus, solidUi.events);

		const payload = await bus.emit(solid.events.Providers, { providers: [] });
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

		const payload = await bus.emit(solid.events.Providers, { providers: [] });
		expect(payload.providers).toHaveLength(0);

		// aggregateProviders returns null — the Vite plugin then serves the stub.
		expect(aggregateProviders(payload)).toBeNull();
	});

	it("generated virtual-providers.tsx wraps Router children inside MetaProvider with Toaster sibling", async () => {
		const bus = createEventBus();
		const ctx = createMockCtx();
		solidUi.cli.register(ctx, bus, solidUi.events);

		const payload = await bus.emit(solid.events.Providers, { providers: [] });
		const source = aggregateProviders(payload);
		expect(source).not.toBeNull();
		if (!source) return;

		expect(source).toContain(
			'import { MetaProvider } from "@fcalell/plugin-solid-ui/meta"',
		);
		expect(source).toContain(
			'import { Toaster } from "@fcalell/plugin-solid-ui/components/toast"',
		);
		expect(source).toContain('import type { JSX } from "solid-js"');

		// Toaster is INSIDE MetaProvider (shares its context).
		expect(source).toMatch(
			/<MetaProvider>[\s\S]*\{props\.children\}[\s\S]*<Toaster \/>[\s\S]*<\/MetaProvider>/,
		);
	});

	it("preserves outer-first wrap order across multiple providers", async () => {
		const bus = createEventBus();

		// Simulate a third-party plugin adding an inner wrapper with higher order.
		// MetaProvider ships at order 0 so it stays outermost — this verifies
		// that `order` still orders arbitrary contributions relative to it.
		bus.on(solid.events.Providers, (p) => {
			p.providers.push({
				imports: [{ source: "@third/theme", named: ["ThemeProvider"] }],
				wrap: { identifier: "ThemeProvider" },
				order: 50,
			});
		});

		const ctx = createMockCtx();
		solidUi.cli.register(ctx, bus, solidUi.events);

		const payload = await bus.emit(solid.events.Providers, { providers: [] });
		const source = aggregateProviders(payload);
		expect(source).not.toBeNull();
		if (!source) return;

		// MetaProvider (order 0) is outer; ThemeProvider (order 50) is inner.
		expect(source).toMatch(
			/<MetaProvider>[\s\S]*<ThemeProvider>[\s\S]*<\/ThemeProvider>[\s\S]*<\/MetaProvider>/,
		);
	});
});
