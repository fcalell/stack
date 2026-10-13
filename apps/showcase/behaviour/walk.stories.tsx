import {
	densityMark,
	findings,
	focusCovered,
	rootMargins,
} from "@fcalell/plugin-screens/walk";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";
import { expect, waitFor } from "storybook/test";

// The render walk (`@fcalell/plugin-screens/walk`) passes a page when it finds
// nothing, so a walk that never matched would pass every screen. These stories
// hand it markup whose outcome is known: each bad fixture must be found, once,
// by the rule named, and the same markup drawn right, hidden, at no size or
// behind `display: contents` must not be, or must be found through it.
export default { title: "Behaviour/Walk canaries" } satisfies Meta;

// The tokens the page emits, spelled as the fixtures use them.
const PAIR: CSSProperties = { gap: "var(--spacing-pair)" };
const CARD: CSSProperties = { padding: "var(--spacing-card)" };
const BODY: CSSProperties = { fontSize: "var(--text-body)" };

function canary(
	fixture: ReactNode,
	expected: string[],
	after?: () => void | Promise<void>,
): StoryObj {
	return {
		parameters: { a11y: { test: "off" } },
		render: () => <div data-walk>{fixture}</div>,
		play: async ({ canvasElement }) => {
			await document.fonts.ready;
			const root = canvasElement.querySelector<HTMLElement>("[data-walk]");
			if (!root) throw new Error("the fixture did not draw");
			await after?.();
			const found = findings({ roots: [root] }).map((finding) => finding.rule);
			await expect(found.sort()).toEqual([...expected].sort());
		},
	};
}

const thirty = (props: { hidden?: boolean } = {}) => (
	<button type="button" style={{ ...BODY, height: 30 }} {...props}>
		Go
	</button>
);

// The fixtures drawn to the contract: every check passes them.
export const PassesMarkupDrawnToTheTokens = canary(
	<div style={{ display: "flex", ...PAIR, ...CARD }}>
		<button type="button" style={{ ...BODY, height: "var(--spacing-control)" }}>
			Go
		</button>
		<span style={{ ...BODY, fontVariantNumeric: "tabular-nums" }}>1,234</span>
		<div
			style={{
				width: 60,
				overflow: "hidden",
				whiteSpace: "nowrap",
				textOverflow: "ellipsis",
			}}
		>
			Truncated text
		</div>
		<section aria-label="Outer">
			<section aria-label="Inner">words</section>
		</section>
	</div>,
	[],
);

export const CatchesAnOffTokenGap = canary(
	<div style={{ display: "flex", gap: 5 }}>
		<span style={BODY}>a</span>
		<span style={BODY}>b</span>
	</div>,
	["gap"],
);

export const CatchesAnOffTokenInset = canary(
	<div style={{ display: "flex", padding: 13 }}>
		<span style={BODY}>a</span>
	</div>,
	["inset"],
);

export const CatchesAThirtyPixelControl = canary(thirty(), ["control-height"]);

// A control that sets a floor may grow past it when the floor is a token.
export const PassesAControlGrownPastItsFloor = canary(
	<button
		type="button"
		style={{
			...BODY,
			minHeight: "var(--spacing-control)",
			paddingBlock: 40,
			boxSizing: "border-box",
		}}
	>
		Go
	</button>,
	["inset"].slice(0, 0),
);

export const CatchesAControlWhoseFloorIsNoToken = canary(
	<button type="button" style={{ ...BODY, minHeight: 30 }}>
		Go
	</button>,
	["control-height"],
);

export const CatchesAShortRow = canary(
	<table>
		<tbody>
			<tr style={{ ...BODY, height: 20 }}>
				<td style={{ padding: 0 }}>Row</td>
			</tr>
		</tbody>
	</table>,
	["row-height"],
);

export const CatchesAClippedBox = canary(
	<div style={{ ...BODY, width: 40, overflow: "hidden", whiteSpace: "nowrap" }}>
		Clipped without a word
	</div>,
	["clip"],
);

export const CatchesANonTabularNumber = canary(
	<span style={BODY}>1,234</span>,
	["tabular-digits"],
);

export const CatchesATinyText = canary(
	<span style={{ fontSize: 10 }}>tiny</span>,
	["type-size"],
);

export const CatchesAnOffTokenRadius = canary(
	<div style={{ ...BODY, ...CARD, borderRadius: 5, background: "gray" }}>
		box
	</div>,
	["radius"],
);

// An 8 px box holding a 6 px one at 2 px stands concentric; at 2 px with 8 px
// it does not.
export const CatchesANestedRadiusThatIsNotConcentric = canary(
	<div
		style={{
			borderRadius: "var(--radius-card)",
			background: "gray",
			padding: 2,
		}}
	>
		<div
			style={{
				...BODY,
				borderRadius: "var(--radius-card)",
				background: "white",
			}}
		>
			inner
		</div>
	</div>,
	["nested-radius"],
);

// The named exceptions are the contract's own draws: a code line is not a list
// row, and a control hugging a card keeps its role's radius. Anything else
// standing alike is still found (the short row and the nested box above).
export const LeavesACodeLineOut = canary(
	<table>
		<tbody>
			<tr className="text-code" style={{ height: 20 }}>
				<td style={{ padding: 0 }}>1 const a = 1;</td>
			</tr>
		</tbody>
	</table>,
	[],
);

export const LeavesAControlHuggingACardOut = canary(
	<div
		className="rounded-card"
		style={{ background: "gray", padding: 4, width: 120 }}
	>
		<button
			type="button"
			className="rounded-control"
			style={{ ...BODY, height: "var(--spacing-control)", background: "white" }}
		>
			Send
		</button>
	</div>,
	[],
);

export const CatchesARegionInsideARegionOfItsName = canary(
	<section aria-label="Architecture">
		<section aria-label="Architecture">words</section>
	</section>,
	["region-name"],
);

// A wrapper that draws no box does not hide what is inside it.
export const SeesThroughDisplayContents = canary(
	<div style={{ display: "contents" }}>{thirty()}</div>,
	["control-height"],
);

export const IgnoresAZeroHeightControl = canary(
	<button type="button" style={{ ...BODY, height: 0, padding: 0, border: 0 }}>
		Go
	</button>,
	[],
);

export const IgnoresWhatIsHidden = canary(
	<>
		<button hidden type="button" style={{ height: 30 }}>
			Go
		</button>
		<button type="button" style={{ height: 30, display: "none" }}>
			Go
		</button>
		<button type="button" style={{ height: 30, visibility: "hidden" }}>
			Go
		</button>
		<div aria-hidden="true">{thirty()}</div>
		<div
			style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}
		>
			<span style={{ fontSize: 8 }}>visually hidden</span>
		</div>
	</>,
	[],
);

// A control stretched over its row is sized by the row, not by a token.
export const IgnoresAControlStretchedOverItsBox = canary(
	<div style={{ position: "relative", height: 63 }}>
		<button
			type="button"
			aria-label="Open"
			style={{ position: "absolute", inset: 0 }}
		/>
	</div>,
	[],
);

// Seven sizes on a screen are one too many; the count reads the page, so this
// walk is the page's.
export const CatchesASeventhTypeSize: StoryObj = {
	parameters: { a11y: { test: "off" } },
	render: () => (
		<div data-walk>
			{[12, 13, 14, 16, 18, 22, 28].map((size) => (
				<p key={size} style={{ fontSize: size }}>
					text
				</p>
			))}
		</div>
	),
	play: async () => {
		await expect(findings().map((finding) => finding.rule)).toEqual([
			"type-sizes",
		]);
	},
};

// The margin a component's root carries is read from the frame the roster
// draws: the caption first, then the component.
function frame(root: ReactNode) {
	return (
		<div data-walk data-cell="Canary/rest">
			<p>caption</p>
			{root}
		</div>
	);
}

export const CatchesAMarginOnAComponentRoot: StoryObj = {
	render: () => frame(<div style={{ ...BODY, marginBottom: 8 }}>root</div>),
	play: async ({ canvasElement }) => {
		const cells = [...canvasElement.querySelectorAll("[data-cell]")];
		await expect(rootMargins(cells).map((f) => f.rule)).toEqual([
			"root-margin",
		]);
	},
};

export const PassesARootWithNoMargin: StoryObj = {
	render: () => frame(<div style={BODY}>root</div>),
	play: async ({ canvasElement }) => {
		const cells = [...canvasElement.querySelectorAll("[data-cell]")];
		await expect(rootMargins(cells)).toEqual([]);
	},
};

// The field act's reach across its box's hairline is the one margin a root
// carries by design; any other negative margin is still found.
export const LeavesTheFieldActReachOut: StoryObj = {
	render: () =>
		frame(
			<button
				type="button"
				className="-my-hairline"
				style={{ ...BODY, marginTop: -1, marginBottom: -1 }}
			>
				More
			</button>,
		),
	play: async ({ canvasElement }) => {
		const cells = [...canvasElement.querySelectorAll("[data-cell]")];
		await expect(rootMargins(cells)).toEqual([]);
	},
};

export const SeesAMarginThroughDisplayContents: StoryObj = {
	render: () =>
		frame(
			<div style={{ display: "contents" }}>
				<div style={{ ...BODY, marginTop: 8 }}>root</div>
			</div>,
		),
	play: async ({ canvasElement }) => {
		const cells = [...canvasElement.querySelectorAll("[data-cell]")];
		await expect(rootMargins(cells).map((f) => f.rule)).toEqual([
			"root-margin",
		]);
	},
};

// A focused field under a sticky bar is hidden, under a plain neighbour it is
// not.
function Scroller(props: { sticky: boolean }) {
	return (
		<div
			data-walk
			style={{ height: 120, overflow: "auto", position: "relative" }}
		>
			<div
				style={{
					position: props.sticky ? "sticky" : "static",
					top: 0,
					zIndex: 1,
					height: 60,
					background: "gray",
				}}
			>
				bar
			</div>
			<input
				aria-label="Name"
				style={{
					...BODY,
					display: "block",
					marginTop: -50,
					position: "relative",
					height: 32,
				}}
			/>
			<div style={{ height: 400 }} />
		</div>
	);
}

export const CatchesFocusHiddenUnderAStickyBar: StoryObj = {
	render: () => <Scroller sticky />,
	play: async ({ canvasElement }) => {
		canvasElement.querySelector("input")?.focus();
		await expect(focusCovered().map((f) => f.rule)).toEqual(["focus-covered"]);
	},
};

export const PassesFocusNotUnderAnything: StoryObj = {
	render: () => (
		<div data-walk>
			<input aria-label="Name" style={{ ...BODY, height: 32 }} />
		</div>
	),
	play: async ({ canvasElement }) => {
		canvasElement.querySelector("input")?.focus();
		await expect(focusCovered()).toEqual([]);
	},
};

// A face is late when it is loading at the screen's first frame and loaded
// after, which a fake `document.fonts` sets up exactly.
export const CatchesAFontThatArrivesAfterTheFirstFrame: StoryObj = {
	parameters: { a11y: { test: "off" } },
	render: () => <div data-walk />,
	play: async () => {
		const { watchFirstPaint } = await import("@fcalell/plugin-screens/walk");
		const face = {
			family: "Walk",
			weight: "400",
			style: "normal",
			status: "loading",
		};
		const real = Object.getOwnPropertyDescriptor(document, "fonts");
		Object.defineProperty(document, "fonts", {
			configurable: true,
			value: { [Symbol.iterator]: () => [face][Symbol.iterator]() },
		});
		try {
			const root = document.createElement("div");
			document.body.append(root);
			watchFirstPaint(root);
			root.append(document.createElement("p"));
			await new Promise((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(resolve)),
			);
			await waitFor(() =>
				expect(findings().map((f) => f.rule)).not.toContain("font-late"),
			);
			face.status = "loaded";
			await expect(findings().map((f) => f.rule)).toContain("font-late");
			root.remove();
		} finally {
			if (real) Object.defineProperty(document, "fonts", real);
			else Reflect.deleteProperty(document, "fonts");
		}
	},
};

// The test run knows the density followed the width by this mark: it differs
// between the touch and the desktop set, and a pin on the root decides it.
export const MarksTheDensityThePageDraws: StoryObj = {
	render: () => <div data-walk />,
	play: async () => {
		const root = document.documentElement;
		const before = root.getAttribute("data-density");
		try {
			root.setAttribute("data-density", "desktop");
			const desktop = densityMark();
			root.setAttribute("data-density", "touch");
			const touch = densityMark();
			await expect(desktop).not.toBe("");
			await expect(touch).not.toBe(desktop);
		} finally {
			if (before === null) root.removeAttribute("data-density");
			else root.setAttribute("data-density", before);
		}
	},
};
