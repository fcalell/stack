import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import { expect, waitFor } from "storybook/test";
import { click, hover } from "./mouse.ts";

// Text the frame cuts names itself: a pointer resting on a cut line, or the
// keyboard reaching it, shows the whole text in one tooltip; uncut text shows
// none; Escape, a press or a scroll hides it; touch draws none; an element
// with its own `title` keeps that one.
const LINE = "A long deploy note that runs well past the width of its column";
const CLAMP =
	"A second note that wraps onto several lines before the clamp ends it";
const OWN = "A third note whose element names itself with a title attribute";
const FIT = "Fits";
// A title long enough to run past even the full measure.
const LONG = `${"A long deploy title that goes on and on ".repeat(8)}ends here`;
const KEY = "A fourth note reached by the keyboard and cut at the column";
const ONE: CSSProperties = {
	width: 160,
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
};
const CLAMPED: CSSProperties = {
	width: 160,
	overflow: "hidden",
	display: "-webkit-box",
	WebkitLineClamp: 2,
	WebkitBoxOrient: "vertical",
};

function Notes() {
	return (
		<Gate title="Notes">
			<div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
				<button type="button" style={ONE} data-note="key">
					{KEY}
				</button>
				<div style={ONE} data-note="line">
					{LINE}
				</div>
				<div style={ONE} data-note="long">
					{LONG}
				</div>
				<div style={ONE} data-note="fit">
					{FIT}
				</div>
				<div style={CLAMPED} data-note="clamp">
					{CLAMP}
				</div>
				<div style={ONE} data-note="own" title="Its own name">
					{OWN}
				</div>
				<div style={{ height: 60, overflow: "auto" }} data-note="scroller">
					<button type="button" style={{ height: 300 }}>
						Scrolls
					</button>
				</div>
			</div>
		</Gate>
	);
}

export default {
	title: "Behaviour/Cut text",
	render: () => <Notes />,
} satisfies Meta;

const note = (name: string) => {
	const found = document.querySelector<HTMLElement>(`[data-note="${name}"]`);
	if (!found) throw new Error(`no ${name} note`);
	return found;
};

const centre = (element: Element) => {
	const box = element.getBoundingClientRect();
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

// The tooltip's popup: a leaf outside the story's canvas holding the text.
const popup = (text: string) =>
	[...document.body.querySelectorAll("*")].find(
		(found) =>
			found.children.length === 0 &&
			found.textContent === text &&
			!found.closest("[data-note]"),
	) ?? null;

const REST = 3000;
const shown = (text: string) =>
	waitFor(() => expect(popup(text)).not.toBeNull(), { timeout: REST });
const gone = (text: string) => waitFor(() => expect(popup(text)).toBeNull());

export const CutLineShowsItsFullTextAfterARest: StoryObj = {
	play: async () => {
		await hover(centre(note("line")));
		await expect(popup(LINE)).toBeNull();
		await shown(LINE);
		await expect(popup(LINE)).toBeVisible();
	},
};

// The tooltip of cut text is a sentence, not an icon's name: it grows past the
// short measure, up to the full one.
export const ALongCutTitleGrowsPastTheShortMeasure: StoryObj = {
	play: async () => {
		await hover(centre(note("long")));
		await shown(LONG);
		const width = (name: string) => {
			const probe = document.createElement("div");
			probe.style.width = `var(--container-${name})`;
			document.body.append(probe);
			const found = probe.getBoundingClientRect().width;
			probe.remove();
			return found;
		};
		// The layout width: the popup scales in, which the rect would follow.
		const wide = () => {
			const found = popup(LONG);
			return found instanceof HTMLElement ? found.offsetWidth : 0;
		};
		await waitFor(() =>
			expect(wide()).toBeGreaterThan(width("measure-short") + 1),
		);
		await expect(wide()).toBeLessThanOrEqual(width("measure") + 1);
	},
};

export const UncutTextShowsNothing: StoryObj = {
	play: async () => {
		await hover(centre(note("fit")));
		await new Promise((done) => setTimeout(done, 900));
		await expect(popup(FIT)).toBeNull();
	},
};

export const ALineClampShows: StoryObj = {
	play: async () => {
		await hover(centre(note("clamp")));
		await shown(CLAMP);
	},
};

export const EscapeHides: StoryObj = {
	play: async ({ userEvent }) => {
		await hover(centre(note("line")));
		await shown(LINE);
		await userEvent.keyboard("{Escape}");
		await gone(LINE);
	},
};

export const APressHides: StoryObj = {
	play: async () => {
		await hover(centre(note("line")));
		await shown(LINE);
		await click(centre(note("line")));
		await gone(LINE);
	},
};

export const AScrollHides: StoryObj = {
	play: async () => {
		await hover(centre(note("line")));
		await shown(LINE);
		note("scroller").scrollTop = 40;
		await gone(LINE);
	},
};

export const TheKeyboardShowsIt: StoryObj = {
	play: async ({ userEvent }) => {
		await userEvent.tab();
		await expect(note("key")).toHaveFocus();
		await shown(KEY);
	},
};

export const AnElementWithItsOwnTitleGetsOnlyThat: StoryObj = {
	play: async () => {
		await hover(centre(note("own")));
		await new Promise((done) => setTimeout(done, 900));
		await expect(popup(OWN)).toBeNull();
	},
};

export const TouchDrawsNone: StoryObj = {
	tags: ["touch"],
	globals: { density: "touch" },
	play: async () => {
		await hover(centre(note("line")));
		await new Promise((done) => setTimeout(done, 900));
		await expect(popup(LINE)).toBeNull();
	},
};
