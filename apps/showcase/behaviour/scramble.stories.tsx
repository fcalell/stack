import { read } from "@fcalell/plugin-api/tanstack-query";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Stats } from "@fcalell/plugin-react-ui/components/stats";
import {
	type loading,
	setLoading,
	ticker,
	tuned,
} from "@fcalell/ui-core/paint";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor } from "storybook/test";
import { BannerLine, StatusMark } from "./atom-paint.stories.tsx";
import {
	Control,
	Definition,
	Description,
	Figure,
	Heading,
	Row,
} from "./paint.stories.tsx";

// The scramble and the decode (`motion.md` §4.2): where the theme paints a glyph
// slot by the scramble, its waiting form is the pulse's box with generated
// characters over it, one clock for every slot; a figure or id arrives by
// locking its characters in turn with the layout the loaded one from the first
// frame. The stories turn the theme's `loading` on for themselves and put it
// back.
const SCRAMBLING = { text: "scramble", figure: "scramble", id: "scramble" };
const PULSING = { text: "pulse", figure: "pulse", id: "pulse" };
const scrambling = () => setLoading(SCRAMBLING as typeof loading);

export default {
	title: "Behaviour/Scramble",
	loaders: [scrambling],
	afterEach: () => setLoading(PULSING as typeof loading),
} satisfies Meta;

let reads = 0;
// A read that stays waiting until `open` is called, with its Stat's figure.
function gated() {
	let open: () => void = () => {};
	const gate = new Promise<readonly string[]>((resolve) => {
		open = () => resolve([]);
	});
	const one = read({ queryKey: ["scramble", reads++], queryFn: () => gate });
	return { one, open };
}

const never = () =>
	read({
		queryKey: ["scramble", reads++],
		queryFn: () => new Promise<readonly string[]>(() => {}),
	});

const waited = () => new Promise((resolve) => setTimeout(resolve, 0));
const box = (element: Element) => element.getBoundingClientRect();

// The generated characters of the first scrambled slot in `root`.
const glyphs = (root: ParentNode) =>
	root.querySelector<HTMLElement>("[data-scrambling]");

function Waiting() {
	const [read] = useState(never);
	return (
		<Stats
			items={[{ label: "need you", value: read.at(() => 1284), unit: "open" }]}
		/>
	);
}

// A scrambled figure stands in the pulse's box: the filler sizes the slot, the
// generated digits stand over it in the slot's own ink with no fill under them,
// clipped to one line, and they change with the page's tick.
export const Figures: StoryObj = {
	name: "A scrambled figure is generated digits over the filler's box",
	render: () => <Waiting />,
	play: async ({ canvasElement }) => {
		await waitFor(
			() =>
				expect(canvasElement.querySelector("[data-scramble]")).not.toBeNull(),
			{ timeout: 3000 },
		);
		const slot = canvasElement.querySelector("[data-scramble]") as HTMLElement;
		const text = glyphs(canvasElement) as HTMLElement;
		const style = getComputedStyle(slot);
		// The fill is not drawn and the glyphs are in the ink of the place.
		await expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
		await expect(getComputedStyle(text).color).not.toBe("rgba(0, 0, 0, 0)");
		await expect(getComputedStyle(text).overflow).toBe("hidden");
		await expect(text.textContent).toMatch(/^[\d,. ]+$/);
		// It is the filler's length and sits in the filler's box.
		const filler = slot.firstElementChild as HTMLElement;
		await expect(text.textContent?.length).toBe(filler.textContent?.length);
		await expect(box(text).width).toBeCloseTo(box(filler).width, 0);
		await expect(box(text).height).toBeCloseTo(box(filler).height, 0);
		// And it moves with the clock.
		const seen = new Set<string>();
		const until = performance.now() + tuned.tick * 12;
		while (performance.now() < until) {
			seen.add(text.textContent ?? "");
			await waited();
		}
		await expect(seen.size).toBeGreaterThan(3);
	},
};

function Pulsing() {
	const [scramble, setScramble] = useState(true);
	const [read] = useState(never);
	return (
		<div data-testid={scramble ? "scrambled" : "pulsed"}>
			<button
				type="button"
				onClick={() => {
					setLoading((scramble ? PULSING : SCRAMBLING) as typeof loading);
					setScramble(!scramble);
				}}
			>
				Switch
			</button>
			<div className="w-fit" data-testid="slot" key={String(scramble)}>
				<Stats items={[{ label: "need you", value: read.at(() => 1284) }]} />
			</div>
		</div>
	);
}

// The scrambled box is the pulsing one, so a theme that switches a kind moves
// nothing on any screen.
export const SameBox: StoryObj = {
	name: "A scrambled slot's box equals the pulsing one's",
	render: () => <Pulsing />,
	play: async ({ canvas, canvasElement }) => {
		await waitFor(
			() =>
				expect(canvasElement.querySelector("[data-scramble]")).not.toBeNull(),
			{ timeout: 3000 },
		);
		const slot = canvas.getByTestId("slot");
		const scrambled = box(slot);
		await userEvent.click(canvas.getByRole("button", { name: "Switch" }));
		await waitFor(() =>
			expect(canvasElement.querySelector("[data-scramble]")).toBeNull(),
		);
		await expect(canvasElement.querySelector("[data-painted]")).not.toBeNull();
		const pulsed = box(canvas.getByTestId("slot"));
		await expect(scrambled.width).toBeCloseTo(pulsed.width, 0);
		await expect(scrambled.height).toBeCloseTo(pulsed.height, 0);
	},
};

function Many() {
	const [waiting] = useState(() => Array.from({ length: 12 }, never));
	return (
		<div className="flex flex-col gap-gap">
			{waiting.map((one, at) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: fixed and ordered
				<Stats key={at} items={[{ label: "open", value: one.at(() => at) }]} />
			))}
		</div>
	);
}

// Twenty slots cost one timer: the clock serves every listener from a single
// pending timer and stops with the last.
export const OneTimer: StoryObj = {
	name: "Many scrambled slots share one timer",
	render: () => <Many />,
	play: async ({ canvasElement }) => {
		await waitFor(
			() =>
				expect(canvasElement.querySelectorAll("[data-scrambling]").length).toBe(
					12,
				),
			{ timeout: 3000 },
		);
		await expect(ticker.size).toBe(12);
		const set = window.setTimeout;
		let asked = 0;
		window.setTimeout = ((
			run: TimerHandler,
			ms?: number,
			...rest: unknown[]
		) => {
			if (ms === tuned.tick) asked += 1;
			return set(run, ms, ...(rest as []));
		}) as typeof window.setTimeout;
		try {
			const until = performance.now() + tuned.tick * 10;
			while (performance.now() < until) await waited();
		} finally {
			window.setTimeout = set;
		}
		// One timer a tick, not twelve.
		await expect(asked).toBeLessThan(14);
		await expect(asked).toBeGreaterThan(3);
	},
};

function Arriving() {
	const [one] = useState(gated);
	return (
		<div data-testid="host" className="w-fit">
			<button type="button" onClick={one.open}>
				Land
			</button>
			<Stats
				items={[
					{ label: "need you", value: one.one.at(() => 41284), unit: "open" },
				]}
			/>
		</div>
	);
}

// A figure that arrives after it showed its waiting form decodes: the layout is
// the loaded one from the first frame (nothing after the figure moves), the
// digits lock from the reading start across `slow`, the rest still generated.
export const DecodeOnArrival: StoryObj = {
	name: "A figure that waited decodes as it arrives, moving nothing",
	render: () => <Arriving />,
	play: async ({ canvas, canvasElement }) => {
		await waitFor(
			() =>
				expect(canvasElement.querySelector("[data-scramble]")).not.toBeNull(),
			{ timeout: 3000 },
		);
		// The paint has stood for the delay: the slot showed its waiting form.
		await new Promise((resolve) => setTimeout(resolve, tuned.waitDelay + 150));
		const unit = () => canvas.getByText("open");
		const host = canvas.getByTestId("host");
		// Every write to the host once the figure is the loaded one, however the
		// frames fall under load.
		const seen: string[] = [];
		const lefts = new Set<number>();
		const watch = new MutationObserver(() => {
			const figure = unit().previousElementSibling as HTMLElement;
			if (figure.querySelector("[data-scramble]")) return;
			seen.push(figure.textContent ?? "");
			lefts.add(Math.round(box(unit()).left));
		});
		watch.observe(host, {
			subtree: true,
			childList: true,
			characterData: true,
		});
		await userEvent.click(canvas.getByRole("button", { name: "Land" }));
		try {
			await waitFor(() =>
				expect((unit().previousElementSibling as HTMLElement).textContent).toBe(
					"41,284",
				),
			);
			await waitFor(() => expect(seen.at(-1)).toBe("41,284"));
		} finally {
			watch.disconnect();
		}
		// It plays: the first frame is a decode, not the value.
		await expect(seen.some((text) => text !== "41,284")).toBe(true);
		for (const text of seen) await expect(text).toHaveLength(6);
		// It ends locked on every character.
		await expect(seen.at(-1)).toBe("41,284");
		// Nothing after the figure moved while it played.
		await expect(lefts.size).toBe(1);
	},
};

function Together() {
	const [one] = useState(gated);
	const [other, setOther] = useState(false);
	const [cached] = useState(() =>
		read({
			queryKey: ["scramble", reads++],
			queryFn: () => Promise.resolve<readonly string[]>([]),
			staleTime: Number.POSITIVE_INFINITY,
		}),
	);
	return (
		<div data-testid="host" className="flex flex-col gap-gap w-fit">
			<button
				type="button"
				onClick={() => {
					one.open();
					setOther(true);
				}}
			>
				Land
			</button>
			<Stats items={[{ label: "waited", value: one.one.at(() => 41284) }]} />
			{other ? (
				<Stats items={[{ label: "cached", value: cached.at(() => 7777) }]} />
			) : null}
		</div>
	);
}

// Two regions that land in one commit do not cross-decode: the slot that waited
// decodes, the one that mounts as it lands, never having waited, shows at once.
export const NoCrossDecode: StoryObj = {
	name: "A slot that never waited does not decode when another one lands with it",
	render: () => <Together />,
	play: async ({ canvas, canvasElement }) => {
		await waitFor(
			() =>
				expect(canvasElement.querySelector("[data-scramble]")).not.toBeNull(),
			{ timeout: 3000 },
		);
		await new Promise((resolve) => setTimeout(resolve, tuned.waitDelay + 150));
		const seen = { waited: new Set<string>(), cached: new Set<string>() };
		const watch = new MutationObserver(() => {
			for (const [name, set] of Object.entries(seen)) {
				const label = canvas.queryByText(name);
				const figure = label?.parentElement?.querySelector("p span");
				if (figure && !figure.querySelector("[data-scramble]"))
					set.add(figure.textContent ?? "");
			}
		});
		watch.observe(canvasElement, {
			subtree: true,
			childList: true,
			characterData: true,
		});
		await userEvent.click(canvas.getByRole("button", { name: "Land" }));
		try {
			await waitFor(() => expect(seen.waited.has("41,284")).toBe(true));
			await waitFor(() => expect(seen.cached.has("7,777")).toBe(true));
			await new Promise((resolve) => setTimeout(resolve, tuned.slow + 100));
		} finally {
			watch.disconnect();
		}
		// The one that waited played a decode; the other only ever read its value.
		await expect(seen.waited.size).toBeGreaterThan(1);
		await expect([...seen.cached]).toEqual(["7,777"]);
	},
};

function Cached() {
	const [one] = useState(() =>
		read({
			queryKey: ["scramble", reads++],
			queryFn: () => Promise.resolve<readonly string[]>([]),
			staleTime: Number.POSITIVE_INFINITY,
		}),
	);
	return (
		<Stats
			items={[{ label: "need you", value: one.at(() => 41284), unit: "open" }]}
		/>
	);
}

// A slot that never showed its waiting form (a read inside the delay) shows its
// value at once.
export const NoDecodeWithoutWaiting: StoryObj = {
	name: "A figure that never waited shows at once",
	render: () => <Cached />,
	play: async ({ canvas, canvasElement }) => {
		await waitFor(() => expect(canvas.getByText("41,284")).toBeTruthy());
		await expect(canvasElement.querySelector("[data-scramble]")).toBeNull();
		await expect(canvas.getByText("41,284").textContent).toBe("41,284");
	},
};

function Strip() {
	const [waiting] = useState(never);
	return (
		<Stats
			items={[
				{ label: "Runs", value: waiting.at(() => 12) },
				{ label: "Fails", value: waiting.at(() => 3) },
			]}
		/>
	);
}

export const StatsScramble: StoryObj = {
	name: "Stats scramble each figure",
	render: () => <Strip />,
	play: async ({ canvasElement }) => {
		await waitFor(
			() =>
				expect(canvasElement.querySelectorAll("[data-scrambling]").length).toBe(
					2,
				),
			{ timeout: 3000 },
		);
	},
};

// Under reduced motion the scramble is the still bar: the glyphs are hidden and
// the fill stands where the pulse's would, with nothing on the clock.
export const ReducedStills: StoryObj = {
	name: "Reduced motion stills the scramble to the bar",
	render: () => <Waiting />,
	play: async ({ canvasElement }) => {
		const { cdp } = await import("vitest/browser");
		await cdp().send("Emulation.setEmulatedMedia", {
			features: [{ name: "prefers-reduced-motion", value: "reduce" }],
		});
		try {
			await waitFor(
				() =>
					expect(canvasElement.querySelector("[data-scramble]")).not.toBeNull(),
				{ timeout: 3000 },
			);
			const slot = canvasElement.querySelector(
				"[data-scramble]",
			) as HTMLElement;
			const text = glyphs(canvasElement) as HTMLElement;
			await expect(getComputedStyle(text).display).toBe("none");
			await expect(getComputedStyle(slot).backgroundColor).not.toBe(
				"rgba(0, 0, 0, 0)",
			);
		} finally {
			await cdp().send("Emulation.setEmulatedMedia", { features: [] });
		}
	},
};

// The busy glyph follows the text kind: three mono glyphs cycling at the tick
// in a box three glyphs wide where text scrambles.
export const BusyGlyphs: StoryObj = {
	name: "The busy glyph is three cycling mono glyphs where text scrambles",
	render: () => (
		<Section
			items={[{ key: "run", title: "Running", leading: { status: "running" } }]}
		/>
	),
	play: async ({ canvasElement }) => {
		const text = await waitFor(() => {
			const found = canvasElement.querySelector<HTMLElement>(
				"[aria-hidden] > [aria-hidden]",
			);
			expect(found).not.toBeNull();
			return found as HTMLElement;
		});
		await expect(text.textContent).toMatch(/^[0-9a-f]{3}$/);
		const outer = text.parentElement as HTMLElement;
		await expect(getComputedStyle(outer).fontFamily).toMatch(/mono/i);
		const seen = new Set<string>();
		const until = performance.now() + tuned.tick * 12;
		while (performance.now() < until) {
			seen.add(text.textContent ?? "");
			await waited();
		}
		await expect(seen.size).toBeGreaterThan(3);
		// Three glyphs wide: the box is as wide as three glyph advances.
		await expect(box(outer).width).toBeCloseTo(3 * (box(outer).width / 3), 0);
		await expect(outer.style.width).toBe("3ch");
	},
};

// Every paint scenario again with the theme scrambling its kinds: the waiting
// form is the loaded form's box either way (structure rule 15).
export const RowScrambled: StoryObj = { ...Row };
export const DefinitionScrambled: StoryObj = { ...Definition };
export const FigureScrambled: StoryObj = { ...Figure };
export const ControlScrambled: StoryObj = { ...Control };
export const HeadingScrambled: StoryObj = { ...Heading };
export const DescriptionScrambled: StoryObj = { ...Description };
export const StatusScrambled: StoryObj = { ...StatusMark };
export const BannerScrambled: StoryObj = { ...BannerLine };
