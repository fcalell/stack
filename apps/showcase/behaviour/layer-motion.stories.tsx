import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { Image } from "@fcalell/plugin-react-ui/components/image";
import { Picker } from "@fcalell/plugin-react-ui/components/picker";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import { toast } from "@fcalell/plugin-react-ui/lib/toast";
import { tuned } from "@fcalell/ui-core/paint";
import { DURATIONS, EASING } from "@fcalell/ui-core/tokens";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, screen, waitFor } from "storybook/test";
import { hover } from "./mouse.ts";

// A layer enters on the base rung from where it belongs and leaves on the same
// rung the way it came (`motion.md` §3, layer): a popover drops a float from its
// anchor, a tooltip fades after its rest and leaves at once, a centred sheet or
// a full view rises a pair, a bottom sheet slides from its edge, a toast rises
// a pair. A
// test cannot catch a transition's first frame, so it reads the cell's
// declared starting and ending look: the popup carries Base UI's
// `data-starting-style` or `data-ending-style` by hand, with its transition
// held off so the computed style is the target and not a frame on the way.
export default {
	title: "Behaviour/Layer motion",
} satisfies Meta;

// A popup mounts with its transition held off for the first frame (Base UI's
// own), so a layer is read once it has been let go.
async function opened(node: Element): Promise<HTMLElement> {
	return waitFor(() => layerOf(node));
}

const seconds = (ms: number) => `${ms / 1000}s`;
const curve = (name: keyof typeof EASING) =>
	`cubic-bezier(${EASING[name].join(", ")})`;

// The nearest element from `node` up that carries a transition: the popup the
// layer's cell sits on, whatever Base UI wrapped it in.
function layerOf(node: Element): HTMLElement {
	for (let up: Element | null = node; up; up = up.parentElement) {
		// A cell names its properties; `all` is the browser's default.
		if (
			up instanceof HTMLElement &&
			!["all", "none"].includes(getComputedStyle(up).transitionProperty)
		)
			return up;
	}
	throw new Error("no layer above the node");
}

// What the layer declares for one look: the computed values of `props` with
// its transition held off, the look's attributes set for the read.
function declared(
	layer: HTMLElement,
	attributes: Record<string, string>,
	props: string[],
): Record<string, string> {
	const held = layer.style.transition;
	layer.style.transition = "none";
	const was = Object.fromEntries(
		Object.keys(attributes).map((name) => [name, layer.getAttribute(name)]),
	);
	for (const [name, value] of Object.entries(attributes))
		layer.setAttribute(name, value);
	const style = getComputedStyle(layer);
	const found = Object.fromEntries(
		props.map((prop) => [prop, style.getPropertyValue(prop)]),
	);
	for (const [name, value] of Object.entries(was)) {
		if (value === null) layer.removeAttribute(name);
		else layer.setAttribute(name, value);
	}
	layer.style.transition = held;
	return found;
}

// A translate's vertical part, in px or as the percentage it is.
const rise = (translate: string | undefined): string =>
	translate?.split(" ")[1] ?? "0px";

// The look entering and leaving: the rung each takes and its curve.
function timings(layer: HTMLElement, leave: Record<string, string>) {
	const open = getComputedStyle(layer);
	const was = layer.getAttribute("data-ending-style");
	for (const [name, value] of Object.entries(leave))
		layer.setAttribute(name, value);
	const out = getComputedStyle(layer);
	const leaving = {
		duration: out.transitionDuration,
		easing: out.transitionTimingFunction,
	};
	for (const name of Object.keys(leave)) layer.removeAttribute(name);
	if (was !== null) layer.setAttribute("data-ending-style", was);
	return {
		entering: {
			property: open.transitionProperty,
			duration: open.transitionDuration,
			easing: open.transitionTimingFunction,
		},
		leaving,
	};
}

const ENDING = { "data-ending-style": "" };
const STARTING = { "data-starting-style": "" };
const act = () => {};

function Popover() {
	return (
		<Section
			title="Team"
			more={[
				{ label: "Duplicate", onAct: act },
				{ label: "Rename", onAct: act },
			]}
		/>
	);
}

// A menu's popover enters on the base rung and leaves on it by the same float
// and fade reversed; it starts a float toward the side its anchor is on.
export const PopoverMenu: StoryObj = {
	render: () => <Popover />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "More Team" }));
		const layer = await opened(await screen.findByRole("menu"));
		const moves = timings(layer, ENDING);
		await expect(moves.entering).toEqual({
			property: "opacity, translate",
			duration: seconds(tuned.base),
			easing: curve("out"),
		});
		await expect(moves.leaving).toEqual({
			duration: seconds(tuned.base),
			easing: curve("in"),
		});
		const start = declared(layer, STARTING, ["opacity", "translate"]);
		await expect(start.opacity).toBe("0");
		// Below its anchor it starts above its place, flipped above it starts below.
		await expect(Number.parseFloat(rise(start.translate))).toBeLessThan(0);
		const flipped = declared(layer, { ...STARTING, "data-side": "top" }, [
			"translate",
		]);
		await expect(Number.parseFloat(rise(flipped.translate))).toBeGreaterThan(0);
		// A leave reverses its enter: the same float, the same side.
		const gone = declared(layer, ENDING, ["opacity", "translate"]);
		await expect(gone.opacity).toBe("0");
		await expect(gone.translate).toBe(start.translate);
		await expect(
			declared(layer, { ...ENDING, "data-side": "top" }, ["translate"])
				.translate,
		).toBe(flipped.translate);
	},
};

function Roles() {
	const [role, setRole] = useState<"owner" | "member">("member");
	return (
		<Picker
			label="Role"
			options={[
				{ value: "owner", label: "Owner" },
				{ value: "member", label: "Member" },
			]}
			value={role}
			onChange={setRole}
		/>
	);
}

// The picker's popover is the menu's: the same rungs and the same starting
// look.
export const PopoverPicker: StoryObj = {
	render: () => <Roles />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("combobox", { name: /Role/ }));
		const layer = await opened(await screen.findByRole("listbox"));
		const moves = timings(layer, ENDING);
		await expect(moves.entering.property).toBe("opacity, translate");
		await expect(moves.entering.duration).toBe(seconds(tuned.base));
		await expect(moves.leaving.duration).toBe(seconds(tuned.base));
		await expect(declared(layer, STARTING, ["opacity"]).opacity).toBe("0");
	},
};

function Names() {
	return (
		<Gate title="Names">
			<div style={{ display: "flex", gap: 48 }}>
				<Button glyph icon="RefreshCw" label="Run now" onAct={act} />
				<Button glyph icon="Copy" label="Copy link" onAct={act} />
				<div
					data-note="cut"
					style={{
						width: 60,
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
					}}
				>
					A note cut at the column
				</div>
			</div>
		</Gate>
	);
}

const centre = (element: Element) => {
	const box = element.getBoundingClientRect();
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};
const away = { x: 4, y: 4 };
const REST = 3000;
// The tooltip drawing `text`: a leaf outside the page's own notes.
const NEVER = (text: string) =>
	[...document.body.querySelectorAll("*")].find(
		(found) =>
			found.children.length === 0 &&
			found.textContent === text &&
			!found.closest("[data-note]") &&
			!found.closest("button"),
	) ?? null;

// A tooltip fades in on the fast rung after its rest; it leaves at once (no
// ending look holds it), and one opened with no rest shows with no fade.
export const Tooltip: StoryObj = {
	render: () => <Names />,
	play: async ({ canvas }) => {
		await hover(centre(canvas.getByRole("button", { name: "Run now" })));
		const layer = await opened(
			await screen.findByText("Run now", {}, { timeout: REST }),
		);
		const moves = timings(layer, ENDING);
		await expect(moves.entering).toEqual({
			property: "opacity",
			duration: seconds(tuned.fast),
			easing: curve("out"),
		});
		await expect(declared(layer, STARTING, ["opacity"]).opacity).toBe("0");
		// Leaving changes nothing the transition could play.
		await expect(declared(layer, ENDING, ["opacity"]).opacity).toBe("1");
		// With no rest it shows with no fade.
		await expect(
			declared(layer, { "data-instant": "delay" }, ["transition-property"])[
				"transition-property"
			],
		).toBe("none");
		await hover(away);
		await waitFor(() => expect(NEVER("Run now")).toBeNull());
	},
};

// The keyboard reaching an act shows its name with no fade: a position, not a
// pointer's rest.
export const TooltipFocus: StoryObj = {
	render: () => <Names />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.tab();
		await expect(canvas.getByRole("button", { name: "Run now" })).toHaveFocus();
		const name = await screen.findByText("Run now", {}, { timeout: REST });
		await expect(name.getAttribute("data-instant")).toBe("focus");
	},
};

// A second tooltip within 300 ms of the last's going shows with no rest and no
// fade, the icon acts' and the cut text's alike; after that it rests again.
export const TooltipRecent: StoryObj = {
	render: () => <Names />,
	play: async ({ canvas }) => {
		const run = canvas.getByRole("button", { name: "Run now" });
		const copy = canvas.getByRole("button", { name: "Copy link" });
		await hover(centre(run));
		await screen.findByText("Run now", {}, { timeout: REST });
		await hover(centre(copy));
		const second = await screen.findByText("Copy link", {}, { timeout: 250 });
		await expect(second.getAttribute("data-instant")).not.toBeNull();
		// Onto cut text: the same window.
		await hover(centre(canvas.getByText(/A note cut/)));
		const cut = await screen.findByText(
			"A note cut at the column",
			{ selector: "[data-instant]" },
			{ timeout: 250 },
		);
		await expect(cut.getAttribute("data-instant")).not.toBeNull();
		// Past the window the rest is back.
		await hover(away);
		await waitFor(() => expect(NEVER("A note cut at the column")).toBeNull());
		await new Promise((done) => setTimeout(done, 450));
		await hover(centre(run));
		await new Promise((done) => setTimeout(done, 200));
		await expect(NEVER("Run now")).toBeNull();
		await screen.findByText("Run now", {}, { timeout: REST });
	},
};

function Rename() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button type="button" onClick={() => setOpen(true)}>
				Rename domain
			</button>
			<Sheet
				open={open}
				onClose={() => setOpen(false)}
				title="Rename domain"
				submit={{ label: "Save", onAct: () => setOpen(false) }}
			>
				<p>The sheet.</p>
			</Sheet>
		</>
	);
}

const scrimOf = () => {
	const found = document.querySelector<HTMLElement>(".bg-scrim");
	if (!found) throw new Error("no scrim");
	return found;
};

// A centred sheet rises a pair as it fades in on the base rung and sinks it as
// it fades out on the same rung; its scrim fades on the same rungs.
export const SheetCentred: StoryObj = {
	render: () => <Rename />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(
			canvas.getByRole("button", { name: "Rename domain" }),
		);
		const layer = await opened(await screen.findByRole("dialog"));
		const moves = timings(layer, ENDING);
		await expect(moves.entering).toEqual({
			property: "opacity, translate",
			duration: seconds(tuned.base),
			easing: curve("out"),
		});
		await expect(moves.leaving).toEqual({
			duration: seconds(tuned.base),
			easing: curve("in"),
		});
		const start = declared(layer, STARTING, ["opacity", "translate"]);
		await expect(start.opacity).toBe("0");
		await expect(Number.parseFloat(rise(start.translate))).toBeGreaterThan(0);
		// A leave reverses its enter: the same pair, the same fade.
		await expect(declared(layer, ENDING, ["opacity", "translate"])).toEqual(
			start,
		);
		const scrim = scrimOf();
		const veil = timings(scrim, ENDING);
		await expect(veil.entering).toEqual({
			property: "opacity",
			duration: seconds(tuned.base),
			easing: curve("out"),
		});
		await expect(veil.leaving).toEqual({
			duration: seconds(tuned.base),
			easing: curve("in"),
		});
		await expect(declared(scrim, STARTING, ["opacity"]).opacity).toBe("0");
	},
};

// At touch density the sheet slides from its bottom edge on the same rungs.
export const SheetBottom: StoryObj = {
	...SheetCentred,
	tags: ["touch"],
	globals: { density: "touch" },
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(
			canvas.getByRole("button", { name: "Rename domain" }),
		);
		const layer = await opened(await screen.findByRole("dialog"));
		const moves = timings(layer, ENDING);
		await expect(moves.entering.duration).toBe(seconds(tuned.base));
		await expect(moves.entering.easing).toBe(curve("out"));
		await expect(moves.leaving).toEqual({
			duration: seconds(tuned.base),
			easing: curve("in"),
		});
		await expect(moves.entering.property).toContain("translate");
		await expect(declared(layer, STARTING, ["translate"]).translate).toContain(
			"100%",
		);
		await expect(declared(layer, ENDING, ["translate"]).translate).toContain(
			"100%",
		);
		await expect(declared(scrimOf(), STARTING, ["opacity"]).opacity).toBe("0");
	},
};

const PICTURE =
	"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' fill='gray'/></svg>";

// The full view of an image rises and fades as a centred sheet does, and sinks
// as it leaves: it does not travel from its thumbnail.
export const ImageView: StoryObj = {
	render: () => <Image src={PICTURE} alt="A grey square" fit="thumb" />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(
			await canvas.findByRole("button", { name: "A grey square" }),
		);
		const layer = await opened(
			await screen.findByRole("dialog", { name: "A grey square" }),
		);
		const moves = timings(layer, ENDING);
		await expect(moves.entering).toEqual({
			property: "opacity, translate",
			duration: seconds(tuned.base),
			easing: curve("out"),
		});
		await expect(moves.leaving).toEqual({
			duration: seconds(tuned.base),
			easing: curve("in"),
		});
		const start = declared(layer, STARTING, ["opacity", "translate"]);
		await expect(start.opacity).toBe("0");
		await expect(Number.parseFloat(rise(start.translate))).toBeGreaterThan(0);
		await expect(declared(layer, ENDING, ["opacity", "translate"])).toEqual(
			start,
		);
	},
};

// A toast rises a pair as it fades in on the base rung and sinks it as it
// fades out on the same rung; the stack closes up on `translate` with its own
// curve.
export const ToastRises: StoryObj = {
	render: () => (
		<Gate title="Toast">
			<p>The page.</p>
		</Gate>
	),
	play: async () => {
		toast("Saved");
		const layer = await opened(await screen.findByText("Saved"));
		const open = getComputedStyle(layer);
		await expect(open.transitionProperty).toBe("translate, transform, opacity");
		await expect(open.transitionDuration).toBe(seconds(tuned.base));
		await expect(open.transitionTimingFunction).toBe(
			`${curve("in-out")}, ${curve("out")}, ${curve("out")}`,
		);
		const start = declared(layer, STARTING, ["opacity", "transform"]);
		await expect(start.opacity).toBe("0");
		await expect(start.transform).not.toBe("none");
		const gone = timings(layer, ENDING).leaving;
		await expect(gone.duration).toBe(seconds(tuned.base));
		await expect(gone.easing).toBe(
			`${curve("in-out")}, ${curve("in")}, ${curve("in")}`,
		);
		await expect(declared(layer, ENDING, ["opacity", "transform"])).toEqual(
			start,
		);
	},
};

// Reduced motion zeroes every rung, so no layer plays a transition.
export const ReducedMotionStillsEveryLayer: StoryObj = {
	render: () => <Popover />,
	play: async ({ canvas, userEvent }) => {
		const root = document.documentElement.style;
		for (const rung of DURATIONS)
			root.setProperty(`--transition-duration-${rung}`, "0ms");
		try {
			await userEvent.click(canvas.getByRole("button", { name: "More Team" }));
			const layer = await opened(await screen.findByRole("menu"));
			await expect(getComputedStyle(layer).transitionDuration).toBe("0s");
			const moves = timings(layer, ENDING);
			await expect(moves.leaving.duration).toBe("0s");
		} catch (error) {
			for (const rung of DURATIONS)
				root.removeProperty(`--transition-duration-${rung}`);
			throw error;
		}
		for (const rung of DURATIONS)
			root.removeProperty(`--transition-duration-${rung}`);
	},
};
