import { describe, expect, it } from "vitest";
import {
	Build,
	Codegen,
	Deploy,
	Dev,
	defineEvent,
	Generate,
	Init,
	Remove,
} from "#events";

describe("core lifecycle events", () => {
	it("Init namespace has Prompt and Scaffold events", () => {
		expect(Init.Prompt.source).toBe("core");
		expect(Init.Prompt.name).toBe("init.prompt");
		expect(Init.Scaffold.source).toBe("core");
		expect(Init.Scaffold.name).toBe("init.scaffold");
	});

	it("Generate is a standalone event", () => {
		expect(Generate.source).toBe("core");
		expect(Generate.name).toBe("generate");
	});

	it("Dev namespace has Start, Ready events", () => {
		expect(Dev.Start.source).toBe("core");
		expect(Dev.Start.name).toBe("dev.start");
		expect(Dev.Ready.source).toBe("core");
		expect(Dev.Ready.name).toBe("dev.ready");
	});

	it("Build namespace has Start event", () => {
		expect(Build.Start.source).toBe("core");
		expect(Build.Start.name).toBe("build.start");
	});

	it("Deploy namespace has Plan, Execute, Complete events", () => {
		expect(Deploy.Plan.source).toBe("core");
		expect(Deploy.Plan.name).toBe("deploy.plan");
		expect(Deploy.Execute.source).toBe("core");
		expect(Deploy.Execute.name).toBe("deploy.execute");
		expect(Deploy.Complete.source).toBe("core");
		expect(Deploy.Complete.name).toBe("deploy.complete");
	});

	it("Remove is a standalone event", () => {
		expect(Remove.source).toBe("core");
		expect(Remove.name).toBe("remove");
	});

	it("Codegen namespace has Worker, Wrangler, Env, ViteConfig, Entry, Html, AppCss, RoutesDts", () => {
		expect(Codegen.Worker.source).toBe("core");
		expect(Codegen.Worker.name).toBe("codegen.worker");
		expect(Codegen.Wrangler.source).toBe("core");
		expect(Codegen.Wrangler.name).toBe("codegen.wrangler");
		expect(Codegen.Env.source).toBe("core");
		expect(Codegen.Env.name).toBe("codegen.env");
		expect(Codegen.ViteConfig.source).toBe("core");
		expect(Codegen.ViteConfig.name).toBe("codegen.vite-config");
		expect(Codegen.Entry.source).toBe("core");
		expect(Codegen.Entry.name).toBe("codegen.entry");
		expect(Codegen.Html.source).toBe("core");
		expect(Codegen.Html.name).toBe("codegen.html");
		expect(Codegen.AppCss.source).toBe("core");
		expect(Codegen.AppCss.name).toBe("codegen.app-css");
		expect(Codegen.RoutesDts.source).toBe("core");
		expect(Codegen.RoutesDts.name).toBe("codegen.routes-dts");
	});

	it("all events have unique symbol ids", () => {
		const allEvents = [
			Init.Prompt,
			Init.Scaffold,
			Generate,
			Dev.Start,
			Dev.Ready,
			Build.Start,
			Deploy.Plan,
			Deploy.Execute,
			Deploy.Complete,
			Remove,
			Codegen.Worker,
			Codegen.Wrangler,
			Codegen.Env,
			Codegen.ViteConfig,
			Codegen.Entry,
			Codegen.Html,
			Codegen.AppCss,
			Codegen.RoutesDts,
		];
		const ids = allEvents.map((e) => e.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("defineEvent is re-exported for plugin authors", () => {
		const custom = defineEvent<void>("my-plugin", "custom.event");
		expect(custom.source).toBe("my-plugin");
		expect(custom.name).toBe("custom.event");
	});
});
