import { Input } from "@fcalell/plugin-react-ui/components/input";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Picker } from "@fcalell/plugin-react-ui/components/picker";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import { toast } from "@fcalell/plugin-react-ui/lib/toast";
import type { PlaceSpec } from "@fcalell/ui-core/descriptors";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, screen, waitFor, within } from "storybook/test";
import { walked } from "./support.ts";

const PLACES: PlaceSpec[] = [
	{ route: "/overview", label: "Overview", icon: "House" },
	{ route: "/members", label: "Members", icon: "Users" },
];

export default { title: "Behaviour/Shell" } satisfies Meta;

type Rgba = [number, number, number, number];

// A CSS colour in any syntax as sRGB, read back off a canvas pixel.
function rgba(color: string): Rgba {
	const context = document.createElement("canvas").getContext("2d", {
		willReadFrequently: true,
	});
	if (!context) throw new Error("no canvas context");
	context.clearRect(0, 0, 1, 1);
	context.fillStyle = color;
	context.fillRect(0, 0, 1, 1);
	const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(0, 0, 1, 1).data;
	return [r, g, b, a / 255];
}

function over(top: Rgba, under: Rgba): Rgba {
	const alpha = top[3] + under[3] * (1 - top[3]);
	const mix = (at: 0 | 1 | 2) =>
		alpha === 0
			? 0
			: (top[at] * top[3] + under[at] * under[3] * (1 - top[3])) / alpha;
	return [mix(0), mix(1), mix(2), alpha];
}

// The ground an element reads on: every ancestor's background laid over the
// page's, so a translucent wash counts as what it sits on.
function ground(el: Element): Rgba {
	let flat: Rgba = [255, 255, 255, 1];
	const chain: Element[] = [];
	for (let at: Element | null = el; at; at = at.parentElement) chain.push(at);
	for (const node of chain.reverse())
		flat = over(rgba(getComputedStyle(node).backgroundColor), flat);
	return flat;
}

function luminance([r, g, b]: Rgba): number {
	const [lr = 0, lg = 0, lb = 0] = [r, g, b].map((channel) => {
		const c = channel / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrast(el: Element): number {
	const under = ground(el);
	const ink = over(rgba(getComputedStyle(el).color), under);
	const [hi = 0, lo = 0] = [luminance(ink), luminance(under)].sort(
		(a, b) => b - a,
	);
	return (hi + 0.05) / (lo + 0.05);
}

// The sidebar's place labels in dark at the desktop width, the current place
// among them, read on the ground they stand on: 4.5:1 at rest and selected.
export const PlaceLabelsReadInDark: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => (
		<div className="dark" style={{ background: "var(--color-canvas)" }}>
			<Shell
				places={[
					{ route: location.pathname, label: "Overview", icon: "House" },
					{ route: "/members", label: "Members", icon: "Users" },
				]}
			>
				<Pane title="Overview">
					<p>The page.</p>
				</Pane>
			</Shell>
		</div>
	),
	play: async ({ canvas }) => {
		const nav = await canvas.findByRole("navigation", { name: "Places" });
		const links = [...nav.querySelectorAll("a")];
		await expect(links.map((el) => el.textContent?.trim())).toEqual([
			"Overview",
			"Members",
		]);
		for (const link of links) {
			const label = link.querySelector("span:last-child") ?? link;
			const ratio = contrast(label);
			console.log(`${link.textContent} ${ratio.toFixed(2)}`);
			await expect(ratio).toBeGreaterThanOrEqual(4.5);
		}
	},
};

const GRANTS = [
	{ value: "owner", label: "Owner" },
	{ value: "admin", label: "Admin" },
	{ value: "member", label: "Member" },
	{ value: "viewer", label: "Viewer" },
];

function Grants() {
	const [grant, setGrant] = useState("member");
	return (
		<Shell places={PLACES}>
			<Pane title="Members">
				<Picker
					label="Grant"
					options={GRANTS}
					value={grant}
					onChange={setGrant}
				/>
			</Pane>
		</Shell>
	);
}

type Box = { left: number; top: number; width: number; height: number };

function boxOf(element: Element): Box {
	const { left, top, width, height } = element.getBoundingClientRect();
	return { left, top, width, height };
}

// A popup opened in the Shell mounts in `main`, a landmark, at a point on the
// viewport's origin, so its positioner measures against the viewport: its first
// frame stands where it settles (a layer positioned by `main` drew it offset by
// `main`'s origin first), and no scroll container of the Shell moves sideways
// while it opens.
export const PopupMountsInTheMain: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => <Grants />,
	play: async ({ canvas, userEvent }) => {
		const trigger = canvas.getByRole("combobox", { name: /Grant/ });
		const scrolled: Element[] = [];
		for (let at: Element | null = trigger; at; at = at.parentElement)
			scrolled.push(at);
		const farthest = () =>
			Math.max(...scrolled.map((element) => Math.abs(element.scrollLeft)));
		// The first animation frame the popup has a box in: the frame it paints.
		let opening: Box | undefined;
		const watching = () => {
			const positioner =
				document.body.querySelector('[role="listbox"]')?.parentElement
					?.parentElement;
			const box = positioner ? boxOf(positioner) : undefined;
			if (!opening && box && box.width > 0 && box.height > 0) opening = box;
			if (!opening) requestAnimationFrame(watching);
		};
		requestAnimationFrame(watching);
		let sideways = farthest();
		let sampling = true;
		const sample = () => {
			sideways = Math.max(sideways, farthest());
			if (sampling) requestAnimationFrame(sample);
		};
		sample();
		await userEvent.click(trigger);
		const list = await screen.findByRole("listbox");
		// The positioner stands the popup; the popup's own rise (`LAYER_POPOVER`)
		// is a transform on it, which is no place for the layer to be wrong.
		const positioner = list.parentElement?.parentElement as HTMLElement;
		await waitFor(() => expect(opening).toBeDefined());
		await waitFor(() =>
			expect(list).toContainElement(document.activeElement as HTMLElement),
		);
		// Settled: the open motion played and the box held for 30 frames.
		let settled = boxOf(positioner);
		for (let held = 0; held < 30; held++) {
			await new Promise((resolve) => requestAnimationFrame(resolve));
			const now = boxOf(positioner);
			if (JSON.stringify(now) !== JSON.stringify(settled)) held = 0;
			settled = now;
		}
		sampling = false;
		for (const key of ["left", "top", "width", "height"] as const)
			expect(
				Math.abs((opening as Box)[key] - settled[key]),
			).toBeLessThanOrEqual(1);
		expect(sideways).toBe(0);
		expect(list.closest("main")).toBe(canvas.getByRole("main"));
		await expect(await walked()).toEqual([]);
	},
};

// The same picker opened in the Shell at the phone's width, where it opens a
// sheet: the sheet takes focus, and the page with the sheet open keeps the
// rules.
export const PopupInTheShellOnAPhone: StoryObj = {
	parameters: { layout: "fullscreen" },
	globals: { density: "touch" },
	tags: ["touch"],
	render: () => <Grants />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: /Grant/ }));
		const list = await screen.findByRole("listbox", { name: /Grant/ });
		await waitFor(() =>
			expect(list).toContainElement(document.activeElement as HTMLElement),
		);
		await expect(await walked()).toEqual([]);
	},
};

function ToastOverFoot() {
	const [text, setText] = useState("");
	return (
		<Shell places={PLACES}>
			<Pane title="Assistant" foot={<Input value={text} onChange={setText} />}>
				<p>The page.</p>
			</Pane>
		</Shell>
	);
}

// A toast stands above a docked foot, and keeps above it as the foot grows a
// line.
export const ToastStandsAboveTheFoot: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => <ToastOverFoot />,
	play: async ({ canvas, userEvent }) => {
		toast("Saved");
		const sentence = await canvas.findByText("Saved");
		const input = canvas.getByRole("textbox");
		const above = () =>
			expect(sentence.getBoundingClientRect().bottom).toBeLessThanOrEqual(
				input.getBoundingClientRect().top,
			);
		await above();
		await userEvent.type(input, "one{Shift>}{Enter}{/Shift}two");
		await waitFor(above);
	},
};

function SheetInShell() {
	const [open, setOpen] = useState(true);
	return (
		<Shell places={PLACES}>
			<Pane title="Members">
				<p>The page.</p>
			</Pane>
			<Sheet
				open={open}
				onClose={() => setOpen(false)}
				title="Rename"
				submit={{ label: "Save", onAct: () => setOpen(false) }}
			>
				<p>The sheet.</p>
			</Sheet>
		</Shell>
	);
}

// The sheet portals into the body while the toasts' layer stands in `main`: a
// toast raised under an open modal sheet draws over the sheet's scrim and its
// dismiss takes the press, the sheet staying open.
export const ToastStandsOverASheet: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => <SheetInShell />,
	play: async ({ userEvent }) => {
		const dialog = await screen.findByRole("dialog", { name: "Rename" });
		toast("Saved");
		const sentence = await screen.findByText("Saved");
		const at = sentence.getBoundingClientRect();
		const top = document.elementFromPoint(
			at.left + at.width / 2,
			at.top + at.height / 2,
		);
		expect(top).not.toBeNull();
		expect(sentence.contains(top) || top?.contains(sentence)).toBe(true);
		expect(dialog.contains(top)).toBe(false);
		await userEvent.click(screen.getByLabelText("Dismiss"));
		await waitFor(() => expect(screen.queryByText("Saved")).toBeNull());
		expect(screen.getByRole("dialog", { name: "Rename" })).toBeVisible();
	},
};

// On touch the places stand on a layer over the viewport: the menu act that
// leads the bar opens it, its rows are the places, and Escape closes it with
// focus back on the page.
export const MenuOpensThePlacesLayer: StoryObj = {
	parameters: { layout: "fullscreen" },
	globals: { density: "touch" },
	tags: ["touch"],
	render: () => <Grants />,
	play: async ({ canvas, userEvent }) => {
		const menu = canvas.getByRole("button", { name: "Places" });
		await userEvent.click(menu);
		const layer = await screen.findByRole("dialog", { name: "Places" });
		const links = within(layer).getAllByRole("link");
		await expect(links.map((el) => el.textContent?.trim())).toEqual([
			"Overview",
			"Members",
		]);
		await expect(await walked()).toEqual([]);
		await userEvent.keyboard("{Escape}");
		await waitFor(() =>
			expect(screen.queryByRole("dialog", { name: "Places" })).toBeNull(),
		);
	},
};
