import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { MessageInput } from "@fcalell/plugin-react-ui/components/message-input";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import { toast } from "@fcalell/plugin-react-ui/lib/toast";
import { showcaseFrames } from "@fcalell/plugin-react-ui/showcase/cells";
import { Frame } from "@fcalell/plugin-react-ui/showcase/frame";
import { drawShell } from "@fcalell/plugin-react-ui/showcase/frames/shell";
import type { PlaceSpec } from "@fcalell/ui-core/descriptors";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, screen, waitFor } from "storybook/test";

const noop = () => {};
const PLACES: PlaceSpec[] = [
	{ route: "/overview", label: "Overview", icon: "House" },
	{ route: "/members", label: "Members", icon: "Users" },
];
const FIELDS = Array.from({ length: 12 }, (_, at) => `Field ${at + 1}`);

export default { title: "Behaviour/Shell" } satisfies Meta;

function Field(props: { label: string }) {
	const [value, setValue] = useState("");
	return (
		<FormField label={props.label}>
			<Input value={value} onChange={setValue} />
		</FormField>
	);
}

function Editing() {
	return (
		<Shell places={PLACES}>
			<Place title="Edit page">
				<Form>
					{FIELDS.map((label) => (
						<Field key={label} label={label} />
					))}
					<ActionBar
						acts={[
							{ label: "Discard", onAct: noop },
							{ label: "Save", onAct: noop },
						]}
					/>
				</Form>
			</Place>
		</Shell>
	);
}

// On touch a page whose body scrolls ends above the tab bar: at the end of the
// scroll its last act stands fully above the bar, the page inset under it.
export const BodyEndsAboveTheTabBar: StoryObj = {
	render: () => <Editing />,
	tags: ["touch"],
	globals: {
		density: "touch",
		viewport: { value: "phone", isRotated: false },
	},
	parameters: {
		viewport: {
			options: {
				phone: {
					name: "Phone",
					styles: { width: "375px", height: "812px" },
					type: "mobile",
				},
			},
		},
	},
	play: async ({ canvas, canvasElement }) => {
		const body = canvasElement.querySelector("form")?.parentElement;
		if (!body) throw new Error("the page body is not drawn");
		body.scrollTop = body.scrollHeight;
		await waitFor(() => expect(body.scrollTop).toBeGreaterThan(0));
		const bar = canvas
			.getByRole("navigation", { name: "Places" })
			.getBoundingClientRect();
		const save = canvas
			.getByRole("button", { name: "Save" })
			.getBoundingClientRect();
		await expect(save.bottom).toBeLessThanOrEqual(bar.top);
	},
};

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
				<Place title="Overview">
					<p>The page.</p>
				</Place>
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

function MoreMenu() {
	return (
		<Shell places={PLACES}>
			<Place
				title="Members"
				more={[
					{ label: "Duplicate", onAct: noop },
					{ label: "Delete", onAct: noop, destructive: true },
				]}
			>
				<p>The page.</p>
			</Place>
		</Shell>
	);
}

// A Menu opened in the Shell stands inside the page's landmark, so the axe
// run finds no menu outside a region.
export const MenuStandsInTheLandmark: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => <MoreMenu />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "More" }));
		const menu = await screen.findByRole("menu");
		expect(menu.closest("main")).not.toBeNull();
	},
};

function ToastOverFoot() {
	const [text, setText] = useState("");
	return (
		<Shell places={PLACES}>
			<Place
				title="Assistant"
				foot={<MessageInput value={text} onChange={setText} onSend={noop} />}
			>
				<p>The page.</p>
			</Place>
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

const COUNTED: PlaceSpec[] = [
	{ route: "/a", label: "Overview", icon: "House", count: 4 },
	{ route: "/b", label: "Members", icon: "Users", count: 44 },
	{ route: "/c", label: "Files", icon: "Folder" },
	{ route: "/d", label: "Deploys", icon: "Rocket" },
	{ route: "/e", label: "Activity", icon: "Activity", count: 444 },
];

// The pixels of an element, as the browser paints them.
async function pixels(element: Element): Promise<ImageData> {
	const { page } = await import("vitest/browser");
	const shot = await page.elementLocator(element).screenshot({
		base64: true,
		save: false,
	});
	const bytes = Uint8Array.from(
		atob(typeof shot === "string" ? shot : shot.base64),
		(c) => c.charCodeAt(0),
	);
	const bitmap = await createImageBitmap(
		new Blob([bytes], { type: "image/png" }),
	);
	const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
	const context = canvas.getContext("2d", { willReadFrequently: true });
	if (!context) throw new Error("no canvas context");
	context.drawImage(bitmap, 0, 0);
	return context.getImageData(0, 0, bitmap.width, bitmap.height);
}

// The pixels that differ between two shots of a box, split into those wholly
// inside the box that the count changed, the edge pixels the box holds only in
// part (a box on a fractional edge: the shot rounds it out, and the pixel it
// half holds belongs to the neighbour as much as to the box), and `noise`:
// raster jitter of at most `NOISE` levels in a channel on a stroke far from
// the count's ink (the browser rasterises a stroke a hair differently once the
// count's text is a layer beside it), which no eye or contrast floor reads.
const NOISE = 4;
function changed(before: ImageData, after: ImageData, box: DOMRect) {
	const x0 = Math.floor(box.left);
	const y0 = Math.floor(box.top);
	let inside = 0;
	let edge = 0;
	let noise = 0;
	for (let y = 0; y < before.height; y++)
		for (let x = 0; x < before.width; x++) {
			const at = (y * before.width + x) * 4;
			const most = Math.max(
				Math.abs((before.data[at] ?? 0) - (after.data[at] ?? 0)),
				Math.abs((before.data[at + 1] ?? 0) - (after.data[at + 1] ?? 0)),
				Math.abs((before.data[at + 2] ?? 0) - (after.data[at + 2] ?? 0)),
				Math.abs((before.data[at + 3] ?? 0) - (after.data[at + 3] ?? 0)),
			);
			if (most === 0) continue;
			const whole =
				x0 + x >= box.left - 1e-6 &&
				x0 + x + 1 <= box.right + 1e-6 &&
				y0 + y >= box.top - 1e-6 &&
				y0 + y + 1 <= box.bottom + 1e-6;
			if (!whole) edge++;
			else if (most <= NOISE) noise++;
			else inside++;
		}
	return { inside, edge, noise };
}

// Where a tab's count paints, read off the pixels (003-180 round 3): the
// page's pixels with the count and with it hidden differ exactly where the count
// paints. None of that may be above the bar's top edge or on its hairline's
// row, and the digit ink starts right of the glyph's own ink.
async function inkOf(root: Element, nav: Element, overlay: HTMLElement) {
	const border = Number.parseFloat(getComputedStyle(nav).borderTopWidth);
	// The screenshot may scroll the page: read the boxes as it was taken.
	const withCount = await pixels(root);
	const rootBox = root.getBoundingClientRect();
	const bar = nav.getBoundingClientRect();
	const own = overlay.getBoundingClientRect();
	overlay.style.visibility = "hidden";
	const without = await pixels(root);
	overlay.style.visibility = "";
	await expect(root.getBoundingClientRect().top).toBe(rootBox.top);
	await expect(without.width).toBe(withCount.width);
	await expect(without.height).toBe(withCount.height);
	const scale = withCount.width / rootBox.width;
	const barTop = Math.round((bar.top - rootBox.top) * scale);
	const barInner = Math.round((bar.top - rootBox.top + border) * scale);
	let above = 0;
	let hairline = 0;
	let top = Number.POSITIVE_INFINITY;
	let left = Number.POSITIVE_INFINITY;
	let bottom = 0;
	let total = 0;
	for (let y = 0; y < withCount.height; y++)
		for (let x = 0; x < withCount.width; x++) {
			const at = (y * withCount.width + x) * 4;
			if (
				withCount.data[at] === without.data[at] &&
				withCount.data[at + 1] === without.data[at + 1] &&
				withCount.data[at + 2] === without.data[at + 2] &&
				withCount.data[at + 3] === without.data[at + 3]
			)
				continue;
			// Only the count's own box holds its ink.
			const px = x / scale + rootBox.left;
			const py = y / scale + rootBox.top;
			if (
				px < own.left - 1 ||
				px > own.right + 1 ||
				py < own.top - 1 ||
				py > own.bottom + 1
			)
				continue;
			total++;
			if (y < barTop) above++;
			else if (y < barInner) hairline++;
			top = Math.min(top, y);
			bottom = Math.max(bottom, y);
			left = Math.min(left, x);
		}
	return {
		total,
		above,
		hairline,
		inkTop: top / scale + rootBox.top,
		inkBottom: (bottom + 1) / scale + rootBox.top,
		inkLeft: left / scale + rootBox.left,
	};
}

// The count's box and ink stand inside the bar, under its hairline, at the
// glyph box's top-right corner: no ink on the hairline's row or above the bar,
// no box over the main area, the ink right of the glyph's own ink.
async function badgeInTheBar(
	root: Element,
	nav: Element,
	figure: HTMLElement,
	glyphInkRight: number,
) {
	const overlay = figure.parentElement;
	const glyph = overlay?.parentElement;
	if (!overlay || !glyph) throw new Error("the tab is not drawn");
	const ink = await inkOf(root, nav, overlay);
	const bar = nav.getBoundingClientRect();
	const border = Number.parseFloat(getComputedStyle(nav).borderTopWidth);
	const box = figure.getBoundingClientRect();
	const glyphBox = glyph.getBoundingClientRect();
	console.log(
		`count ${figure.textContent}: ink ${ink.total} px, ${ink.above} above the bar, ${ink.hairline} on the hairline, ink y ${ink.inkTop}..${ink.inkBottom}, bar top ${bar.top}, box ${box.top}..${box.bottom}, glyph box top ${glyphBox.top}`,
	);
	await expect(ink.total).toBeGreaterThan(0);
	await expect(ink.hairline).toBe(0);
	await expect(ink.above).toBe(0);
	await expect(ink.inkTop).toBeGreaterThanOrEqual(bar.top + border);
	// The count's line box stands inside the bar: none of it over the main area.
	await expect(box.top).toBeGreaterThanOrEqual(bar.top + border - 0.01);
	await expect(box.bottom).toBeLessThanOrEqual(bar.bottom);
	// At the glyph box's top-right corner, clear of the glyph's ink.
	await expect(box.left).toBeGreaterThanOrEqual(glyphBox.right - 2);
	await expect(box.left).toBeLessThanOrEqual(glyphBox.right);
	// (the diff's first column is a whole pixel: it holds the ink's partial cover)
	await expect(ink.inkLeft).toBeGreaterThanOrEqual(glyphInkRight - 1);
}

// A tab's count of one and two figures reads as it is, a count past 99 reads
// "99+"; each stands above the glyph box's top-right corner (its bottom edge at
// the box's top, its start at the box's right edge, a hairline in at most) and
// paints nothing inside the glyph's box, so the glyph's ink is the same with
// and without it, and the label stays centred under the glyph. Every count
// ends inside the bar, the last tab's at 320 included, and no tab grows.
const TAB_WIDTHS = { 320: "narrow", 390: "phone", 768: "tablet" } as const;

const tabCount = (width: keyof typeof TAB_WIDTHS, mode: "light" | "dark") => {
	const story: StoryObj = {
		render: () => (
			<div
				data-story-root=""
				className={mode === "dark" ? "dark" : undefined}
				style={{ background: "var(--color-canvas)" }}
			>
				<Shell places={COUNTED}>
					<Place title="Overview">
						<p>The page.</p>
					</Place>
				</Shell>
			</div>
		),
		tags: ["touch"],
		globals: {
			density: "touch",
			viewport: { value: TAB_WIDTHS[width], isRotated: false },
		},
		parameters: {
			layout: "fullscreen",
			viewport: {
				options: {
					[TAB_WIDTHS[width]]: {
						name: TAB_WIDTHS[width],
						styles: { width: `${width}px`, height: "800px" },
						type: "mobile",
					},
				},
			},
		},
		play: async ({ canvas }) => {
			const nav = canvas.getByRole("navigation", { name: "Places" });
			const bar = nav.getBoundingClientRect();
			await expect(canvas.queryByText("444")).toBeNull();
			for (const count of ["4", "44", "99+"]) {
				const figure = canvas.getByText(count, { exact: true });
				const overlay = figure.parentElement;
				const glyph = overlay?.parentElement;
				const label = overlay?.closest("a")?.lastElementChild;
				if (!overlay || !glyph || !label)
					throw new Error("the tab is not drawn");
				const box = figure.getBoundingClientRect();
				const glyphBox = glyph.getBoundingClientRect();
				const labelBox = label.getBoundingClientRect();
				// The glyph's ink: its strokes' union, a half stroke out.
				const svg = glyph.querySelector("svg");
				if (!svg) throw new Error("the glyph is not drawn");
				const strokes = [...svg.children].map((child) =>
					child.getBoundingClientRect(),
				);
				const half =
					(Number.parseFloat(getComputedStyle(svg).strokeWidth) / 24) *
					svg.getBoundingClientRect().width *
					0.5;
				const ink = {
					right: Math.max(...strokes.map((r) => r.right)) + half,
					top: Math.min(...strokes.map((r) => r.top)) - half,
					bottom: Math.max(...strokes.map((r) => r.bottom)) + half,
				};
				const root = nav.closest("[data-story-root]");
				if (!root) throw new Error("no story root");
				await badgeInTheBar(root, nav, figure, ink.right);
				const ring = getComputedStyle(overlay);
				console.log(
					`${width} ${mode} count ${count}: bottom ${box.bottom - glyphBox.top} from the glyph box's top, start ${box.left - glyphBox.right}, ink gap ${box.left - ink.right}, width ${box.width}, to the bar's end ${bar.right - box.right}`,
				);
				// The count starts at the glyph box's right edge, a hairline in at most
				// (round 3: its line box is inside the bar, not above the glyph box).
				await expect(box.left).toBeGreaterThanOrEqual(glyphBox.right - 2);
				await expect(box.left).toBeLessThanOrEqual(glyphBox.right);
				await expect(box.right).toBeLessThanOrEqual(bar.right);
				// No ring or ground: nothing of the count paints inside the glyph's box.
				await expect(Number.parseFloat(ring.outlineWidth) || 0).toBe(0);
				await expect(ring.backgroundColor).toBe("rgba(0, 0, 0, 0)");
				// The glyph's ink with the count equals the ink without it, pixel for
				// pixel, and hiding the count moves no tab's height.
				const tab = overlay.closest("a");
				if (!tab) throw new Error("the tab is not drawn");
				const height = tab.getBoundingClientRect().height;
				// The tab is 48 px with the count, and hiding it moves no label.
				await expect(height).toBe(48);
				const labelAt = label.getBoundingClientRect();
				const withCount = await pixels(glyph);
				overlay.style.visibility = "hidden";
				const without = await pixels(glyph);
				await expect(tab.getBoundingClientRect().height).toBe(height);
				await expect(label.getBoundingClientRect().top).toBe(labelAt.top);
				await expect(label.getBoundingClientRect().left).toBe(labelAt.left);
				overlay.style.visibility = "";
				await expect(without.width).toBe(withCount.width);
				await expect(without.height).toBe(withCount.height);
				const { inside, edge, noise } = changed(withCount, without, glyphBox);
				const differ = inside;
				console.log(
					`${width} ${mode} count ${count}: glyph pixels changed ${inside} (${edge} on the edge pixels the box only half holds, ${noise} of at most ${NOISE} levels)`,
				);
				await expect(differ).toBe(0);
				await expect(labelBox.left + labelBox.width / 2).toBeCloseTo(
					glyphBox.left + glyphBox.width / 2,
					1,
				);
			}
		},
	};
	return story;
};

export const TabCountClearsItsGlyph = tabCount(320, "light");
export const TabCountClearsItsGlyphDark = tabCount(320, "dark");
export const TabCountClearsItsGlyph390 = tabCount(390, "light");
export const TabCountClearsItsGlyph390Dark = tabCount(390, "dark");
export const TabCountClearsItsGlyph768 = tabCount(768, "light");
export const TabCountClearsItsGlyph768Dark = tabCount(768, "dark");

// The showcase's own Shell frame (touch, the tab bar's idle tab) holds Activity
// with a two-figure count (44): measured as the critique measures it, at the
// phone width, in both modes: the count is inside the bar under its hairline,
// 0 px of ink on the hairline's row or above the bar, and the glyph's pixels do
// not change.
const shellFrame = (mode: "light" | "dark"): StoryObj => ({
	tags: ["touch"],
	globals: { density: "touch", viewport: { value: "phone", isRotated: false } },
	parameters: {
		mode,
		layout: "fullscreen",
		viewport: {
			options: {
				phone: {
					name: "phone",
					styles: { width: "390px", height: "800px" },
					type: "mobile",
				},
			},
		},
	},
	render: () => {
		const frame = showcaseFrames().find(
			(each) =>
				each.component === "Shell" &&
				each.cell.name === "PLACE_TAB.state.idle" &&
				each.state === "rest" &&
				each.mode === mode &&
				each.density === "touch",
		);
		if (!frame) throw new Error("no Shell tab frame");
		return (
			<div data-story-root="">
				<Frame frame={frame} draw={drawShell} />
			</div>
		);
	},
	play: async ({ canvas }) => {
		const nav = await canvas.findByRole("navigation", { name: "Places" });
		const root = nav.closest("[data-story-root]");
		if (!root) throw new Error("no story root");
		const figure = canvas.getByText("44", { exact: true });
		const glyph = figure.parentElement?.parentElement;
		const svg = glyph?.querySelector("svg");
		if (!glyph || !svg) throw new Error("the tab is not drawn");
		const half =
			(Number.parseFloat(getComputedStyle(svg).strokeWidth) / 24) *
			svg.getBoundingClientRect().width *
			0.5;
		const inkRight =
			Math.max(
				...[...svg.children].map(
					(child) => child.getBoundingClientRect().right,
				),
			) + half;
		await badgeInTheBar(root, nav, figure, inkRight);
		const before = await pixels(glyph);
		const overlay = figure.parentElement as HTMLElement;
		overlay.style.visibility = "hidden";
		const after = await pixels(glyph);
		overlay.style.visibility = "";
		const { inside } = changed(before, after, glyph.getBoundingClientRect());
		const differ = inside;
		await expect(differ).toBe(0);
	},
});
export const ShellFrameTabCount = shellFrame("light");
export const ShellFrameTabCountDark = shellFrame("dark");
