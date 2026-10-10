import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { MessageInput } from "@fcalell/plugin-react-ui/components/message-input";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import { toast } from "@fcalell/plugin-react-ui/lib/toast";
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

// A tab's count of one and two figures reads as it is, a count past 99 reads
// "99+"; each stands on its glyph's top-right corner, starting at the glyph
// box's edge (a hairline in at most) so it never touches the glyph's ink, on a ring of the bar's
// ground (at least 2 px), and the label stays centred under the glyph. Every
// count ends inside the bar, the last tab's at 320 included.
const TAB_WIDTHS = { 320: "narrow", 390: "phone", 768: "tablet" } as const;

const tabCount = (width: keyof typeof TAB_WIDTHS, mode: "light" | "dark") => {
	const story: StoryObj = {
		render: () => (
			<div
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
				const ring = getComputedStyle(overlay);
				console.log(
					`${width} ${mode} count ${count}: start ${box.left - glyphBox.right} past the glyph's edge, ink gap ${box.left - ink.right}, width ${box.width}, to the bar's end ${bar.right - box.right}, ring ${ring.outlineWidth} ${ring.outlineColor}`,
				);
				// The count stands at the glyph box's edge, a hairline in where the bar's
				// end asks it, and its figures never reach the glyph's ink (the strokes'
				// union, a sub-pixel of antialiasing aside).
				await expect(box.left).toBeGreaterThanOrEqual(ink.right - 0.25);
				await expect(box.left - glyphBox.right).toBeLessThanOrEqual(2);
				await expect(box.left - glyphBox.right).toBeGreaterThanOrEqual(-2);
				await expect(box.right).toBeLessThanOrEqual(bar.right);
				await expect(box.top).toBeGreaterThanOrEqual(glyphBox.top - 2);
				// The ring is the bar's ground, so contact never reads ink on ink.
				await expect(
					Number.parseFloat(ring.outlineWidth),
				).toBeGreaterThanOrEqual(2);
				await expect(ring.outlineColor).toBe(
					getComputedStyle(nav).backgroundColor,
				);
				await expect(ring.backgroundColor).toBe(
					getComputedStyle(nav).backgroundColor,
				);
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
