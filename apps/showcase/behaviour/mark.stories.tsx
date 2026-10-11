import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import { type AppMark, MarkProvider } from "@fcalell/plugin-react-ui/lib/mark";
import type { PlaceSpec } from "@fcalell/ui-core/descriptors";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";

const PLACES: PlaceSpec[] = [
	{ route: "/overview", label: "Overview", icon: "House" },
	{ route: "/members", label: "Members", icon: "Users" },
];

const logo = (ground: string) =>
	`data:image/svg+xml,${encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="14" fill="${ground}"/></svg>`,
	)}`;
const PAIR: AppMark = {
	src: logo("#2f3a45"),
	dark: logo("#9fb7c9"),
	name: "Acme",
};
const SINGLE: AppMark = { src: logo("#2f3a45"), name: "Acme" };
const BROKEN: AppMark = { src: "data:image/svg+xml,<", name: "Acme" };
// A drawn lockup: the symbol and the name as letters, wider than it is tall.
const drawn = (ground: string) =>
	`data:image/svg+xml,${encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 32" width="160" height="32"><rect width="160" height="32" fill="${ground}"/></svg>`,
	)}`;
const LOGO: AppMark = {
	...SINGLE,
	logo: drawn("#2f3a45"),
	logoDark: drawn("#9fb7c9"),
};
// The lockup fails to load; the icon and the name stand instead.
const LOGO_BROKEN: AppMark = { ...SINGLE, logo: "data:image/svg+xml,<" };

export default {
	title: "Behaviour/Mark",
	parameters: { layout: "fullscreen" },
} satisfies Meta;

function Framed(props: { mark?: AppMark }) {
	const shell = (
		<Shell places={PLACES}>
			<Place title="Overview" />
		</Shell>
	);
	// No mark is a scope of its own: the app's providers mount the showcase's icon.
	return <MarkProvider mark={props.mark ?? null}>{shell}</MarkProvider>;
}

function sidebar(canvasElement: HTMLElement): HTMLElement {
	const nav = canvasElement.querySelector<HTMLElement>("nav");
	if (!nav) throw new Error("the sidebar is not drawn");
	return nav;
}

// On the desktop the sidebar heads with the app's lockup: the logo at the
// avatar's size and the name beside it, no link, the logo at the places' inset
// (its start edge on their glyphs') and above the first place.
export const SidebarHeadsWithTheMark: StoryObj = {
	render: () => <Framed mark={SINGLE} />,
	play: async ({ canvasElement }) => {
		const nav = sidebar(canvasElement);
		const img = nav.querySelector("img");
		if (!img) throw new Error("the sidebar draws no logo");
		const name = Array.from(nav.querySelectorAll("span")).find(
			(el) => el.textContent === "Acme",
		);
		if (!name) throw new Error("the sidebar draws no name");
		const box = img.getBoundingClientRect();
		await expect(box.width).toBe(box.height);
		await expect(box.height).toBe(24);
		await expect(name.getBoundingClientRect().left).toBeGreaterThanOrEqual(
			box.right,
		);
		await expect(name.closest("a")).toBeNull();
		const place = nav.querySelector("a");
		const glyph = place?.querySelector("svg");
		if (!place || !glyph) throw new Error("the first place is not drawn");
		await expect(box.left).toBe(glyph.getBoundingClientRect().left);
		await expect(box.bottom).toBeLessThanOrEqual(
			place.getBoundingClientRect().top,
		);
	},
};

// An app with no icon mounts no mark: the sidebar opens on its places.
export const SidebarWithoutAMarkIsUnchanged: StoryObj = {
	render: () => <Framed />,
	play: async ({ canvasElement }) => {
		const nav = sidebar(canvasElement);
		await expect(nav.querySelector("img")).toBeNull();
		await expect(nav.querySelector("a")).not.toBeNull();
		await expect(nav.firstElementChild?.querySelector("a")).not.toBeNull();
	},
};

// Touch keeps its tab bar and top bars: no lockup is drawn.
export const TouchDrawsNoLockup: StoryObj = {
	render: () => <Framed mark={SINGLE} />,
	tags: ["touch"],
	globals: { density: "touch" },
	play: async ({ canvasElement }) => {
		await waitFor(() =>
			expect(canvasElement.querySelector("nav")).not.toBeNull(),
		);
		await expect(canvasElement.querySelector("img")).toBeNull();
	},
};

function Step(props: { mark?: AppMark }) {
	const gate = <Gate title="Sign in" />;
	return <MarkProvider mark={props.mark ?? null}>{gate}</MarkProvider>;
}

// The Gate leads with the lockup when it has a title: the logo and the name
// stand above the title.
export const GateLeadsWithTheMark: StoryObj = {
	render: () => <Step mark={SINGLE} />,
	play: async ({ canvas, canvasElement }) => {
		const img = canvasElement.querySelector("img");
		if (!img) throw new Error("the gate draws no logo");
		const title = canvas.getByRole("heading", { name: "Sign in" });
		await expect(img.getBoundingClientRect().bottom).toBeLessThanOrEqual(
			title.getBoundingClientRect().top,
		);
		await expect(canvas.getByText("Acme")).toBeVisible();
	},
};

// A logo that fails to load leaves the name.
export const GateKeepsTheNameWhenTheLogoFails: StoryObj = {
	render: () => <Step mark={BROKEN} />,
	play: async ({ canvas, canvasElement }) => {
		await waitFor(() => expect(canvasElement.querySelector("img")).toBeNull());
		await expect(canvas.getByText("Acme")).toBeVisible();
	},
};

// An app with no icon: no mark.
export const GateWithoutAMarkDrawsNone: StoryObj = {
	render: () => <Step />,
	play: async ({ canvas, canvasElement }) => {
		await expect(canvasElement.querySelector("img")).toBeNull();
		await expect(canvas.queryByText("Acme")).toBeNull();
	},
};

function Dark(props: { dark: boolean }) {
	return (
		<div className={props.dark ? "dark" : "light"}>
			<MarkProvider mark={PAIR}>
				<Gate title="Sign in" />
			</MarkProvider>
		</div>
	);
}

// A mark with a dark form draws the light logo in the light mode and the dark
// one under the theme's `.dark` scope.
export const DarkFormFollowsTheMode: StoryObj = {
	render: () => <Dark dark={false} />,
	play: async ({ canvasElement }) => {
		const shown = (host: Element) =>
			Array.from(host.querySelectorAll("img"))
				.filter((img) => getComputedStyle(img).display !== "none")
				.map((img) => img.getAttribute("src"));
		await expect(shown(canvasElement)).toEqual([PAIR.src]);
		canvasElement.firstElementChild?.setAttribute("class", "dark");
		await expect(shown(canvasElement)).toEqual([PAIR.dark]);
	},
};

// An app with a drawn lockup draws that image alone: the app's name is its alt
// and no name text stands beside it; it stands 40 px tall at every density,
// left on the column's edge, and its width follows its own proportion.
export const GateDrawsTheLogoAlone: StoryObj = {
	render: () => <Step mark={{ ...SINGLE, logo: LOGO.logo }} />,
	play: async ({ canvas, canvasElement }) => {
		const images = canvasElement.querySelectorAll("img");
		await expect(images).toHaveLength(1);
		const img = canvas.getByRole("img", { name: "Acme" });
		await waitFor(() =>
			expect(img.getBoundingClientRect().width).toBeGreaterThan(0),
		);
		const box = img.getBoundingClientRect();
		await expect(box.height).toBe(40);
		await expect(box.width / box.height).toBeCloseTo(5, 0);
		const title = canvas.getByRole("heading", { name: "Sign in" });
		await expect(box.left).toBe(title.getBoundingClientRect().left);
		await expect(
			Array.from(canvasElement.querySelectorAll("span")).find(
				(el) => el.textContent === "Acme",
			),
		).toBeUndefined();
	},
};

// On touch the drawn lockup in the Gate is still 40 px tall; the sidebar's
// avatar height grows with the density, the Gate's does not.
export const GateLogoIsTheSameHeightOnTouch: StoryObj = {
	render: () => <Step mark={{ ...SINGLE, logo: LOGO.logo }} />,
	globals: { density: "touch" },
	play: async ({ canvas }) => {
		const img = canvas.getByRole("img", { name: "Acme" });
		await waitFor(() =>
			expect(img.getBoundingClientRect().width).toBeGreaterThan(0),
		);
		await expect(img.getBoundingClientRect().height).toBe(40);
	},
};

// A Gate with a title stands its parts one gap apart: the lockup, the step
// count, the title, the description and the body, each the `fields` gap
// from the next (16 px on the desktop).
export const GateStandsItsPartsAnEvenGapApart: StoryObj = {
	render: () => (
		<MarkProvider mark={{ ...SINGLE, logo: LOGO.logo }}>
			<Gate
				title="Sign in"
				description={["Welcome back to Acme."]}
				step={{ at: 1, of: 3 }}
			>
				<p>Body</p>
			</Gate>
		</MarkProvider>
	),
	play: async ({ canvas }) => {
		const img = canvas.getByRole("img", { name: "Acme" });
		await waitFor(() =>
			expect(img.getBoundingClientRect().width).toBeGreaterThan(0),
		);
		const stack = canvas.getByRole("heading", {
			name: "Sign in",
		}).parentElement;
		if (!stack) throw new Error("the step is not drawn");
		const gap = Number.parseFloat(getComputedStyle(stack).rowGap);
		await expect(gap).toBe(16);
		const rects = Array.from(stack.children, (part) =>
			part.getBoundingClientRect(),
		);
		// The lockup, the count, the title, the description and the body.
		await expect(rects).toHaveLength(5);
		const gaps = rects.slice(1).map((rect, i) => {
			const above = rects[i];
			if (!above) throw new Error("a part is not drawn");
			return rect.top - above.bottom;
		});
		await expect(gaps).toEqual([gap, gap, gap, gap]);
	},
};

// In the sidebar the lockup keeps the row's inset and rhythm, and never
// outgrows the sidebar: a logo wider than the row is held to it.
export const SidebarLogoIsHeldToTheRow: StoryObj = {
	render: () => (
		<Framed
			mark={{
				...SINGLE,
				logo: `data:image/svg+xml,${encodeURIComponent(
					'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 32" width="2000" height="32"><rect width="2000" height="32" fill="#2f3a45"/></svg>',
				)}`,
			}}
		/>
	),
	play: async ({ canvasElement }) => {
		const nav = sidebar(canvasElement);
		const img = nav.querySelector("img");
		if (!img) throw new Error("the sidebar draws no logo");
		await waitFor(() =>
			expect(img.getBoundingClientRect().width).toBeGreaterThan(0),
		);
		const box = img.getBoundingClientRect();
		const navBox = nav.getBoundingClientRect();
		await expect(box.right).toBeLessThanOrEqual(navBox.right);
		await expect(box.left).toBeGreaterThanOrEqual(navBox.left);
		const glyph = nav.querySelector("a svg");
		if (!glyph) throw new Error("the first place is not drawn");
		await expect(box.left).toBe(glyph.getBoundingClientRect().left);
	},
};

function DarkLogo(props: { dark: boolean }) {
	return (
		<div className={props.dark ? "dark" : "light"}>
			<MarkProvider mark={LOGO}>
				<Gate title="Sign in" />
			</MarkProvider>
		</div>
	);
}

// A drawn lockup with a dark form draws the light image in the light mode and
// the dark one under the theme's `.dark` scope.
export const LogoDarkFormFollowsTheMode: StoryObj = {
	render: () => <DarkLogo dark={false} />,
	play: async ({ canvasElement }) => {
		const shown = (host: Element) =>
			Array.from(host.querySelectorAll("img"))
				.filter((img) => getComputedStyle(img).display !== "none")
				.map((img) => img.getAttribute("src"));
		await expect(shown(canvasElement)).toEqual([LOGO.logo]);
		canvasElement.firstElementChild?.setAttribute("class", "dark");
		await expect(shown(canvasElement)).toEqual([LOGO.logoDark]);
	},
};

// A lockup that fails to load leaves the icon and the name.
export const FailedLogoFallsBackToIconAndName: StoryObj = {
	render: () => <Step mark={LOGO_BROKEN} />,
	play: async ({ canvas, canvasElement }) => {
		await waitFor(() =>
			expect(canvasElement.querySelector("img")?.getAttribute("src")).toBe(
				SINGLE.src,
			),
		);
		await expect(canvas.getByText("Acme")).toBeVisible();
	},
};
