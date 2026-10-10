import { Screen } from "@fcalell/plugin-react-ui/components/screen";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";

const LINES = Array.from({ length: 40 }, (_, at) => `Line ${at + 1}`);

export default { title: "Behaviour/Screen" } satisfies Meta;

// A Screen whose body scrolls with nothing tabbable inside takes the tab
// stop itself, so a keyboard reaches the text; the back act is the one stop
// before it.
export const BodyTakesTheTabStop: StoryObj = {
	render: () => (
		<div
			style={{
				width: 375,
				height: 300,
				display: "flex",
				flexDirection: "column",
			}}
		>
			<Screen title="Sink" back="/system">
				{LINES.map((line) => (
					<p key={line}>{line}</p>
				))}
			</Screen>
		</div>
	),
	play: async ({ canvasElement, userEvent }) => {
		const stop = () =>
			canvasElement.querySelector<HTMLElement>("div[tabindex='0']");
		await waitFor(() => expect(stop()).not.toBeNull());
		const body = stop();
		// The head's acts take their stops first; the body is the last.
		for (let at = 0; at < 5 && document.activeElement !== body; at++)
			await userEvent.tab();
		await expect(document.activeElement).toBe(body);
	},
};

const noop = () => {};
const TOOLS = [
	{ icon: "ListFilter" as const, label: "Filter", onAct: noop },
	{ icon: "RefreshCw" as const, label: "Refresh", onAct: noop },
	{ icon: "Download" as const, label: "Export", onAct: noop },
	{ icon: "Share2" as const, label: "Share", onAct: noop },
];

function viewport(width: number) {
	return {
		tags: ["touch"],
		globals: {
			density: "touch",
			viewport: { value: `w${width}`, isRotated: false },
		},
		parameters: {
			layout: "fullscreen",
			viewport: {
				options: {
					[`w${width}`]: {
						name: `${width}`,
						styles: { width: `${width}px`, height: "700px" },
						type: "mobile",
					},
				},
			},
		},
	};
}

// A touch Screen is one row: the back act, the title wrapping, then its acts
// as one span at the row's end. The title keeps two fifths of the row; acts
// that do not fit beside it, the back act and the gaps drop whole to a second
// line at the row's end, every target at 44 px.
function row(width: number, count: number, wraps?: boolean): StoryObj {
	return {
		...viewport(width),
		render: () => (
			<Screen
				title="Deploy history"
				back="/system"
				actions={TOOLS.slice(0, count)}
			>
				<p>The first section.</p>
			</Screen>
		),
		play: async ({ canvasElement }) => {
			const head = canvasElement.querySelector("header");
			const title = head?.querySelector("h1");
			const bar = head?.firstElementChild;
			const back = head?.querySelector("[aria-label='Back']");
			const acts = TOOLS.slice(0, count).map((act) =>
				head?.querySelector(`[aria-label='${act.label}']`),
			);
			if (!head || !title || !bar || !back || acts.some((act) => !act))
				throw new Error("the Screen is not drawn");
			const rect = head.getBoundingClientRect();
			const line = bar.getBoundingClientRect();
			const text = title.getBoundingClientRect();
			const first = acts[0]?.getBoundingClientRect();
			const last = acts[acts.length - 1]?.getBoundingClientRect();
			if (!first || !last) throw new Error("the acts are not drawn");
			const wrapped = first.top >= text.bottom - 1;
			console.log(
				`${width} x ${count}: head ${rect.height}, row ${line.width}, title ${text.width}x${text.height}, acts ${first.left} to ${last.right} at ${first.top}, ${wrapped ? "wrapped" : "inline"}`,
			);
			await expect(text.width).toBeGreaterThanOrEqual(line.width * 0.4 - 1);
			for (const act of [back, ...acts]) {
				const box = act?.getBoundingClientRect();
				await expect(box?.width).toBeGreaterThanOrEqual(44);
				await expect(box?.height).toBeGreaterThanOrEqual(44);
				await expect(box?.bottom).toBeLessThanOrEqual(rect.bottom);
			}
			await expect(last.right).toBeLessThanOrEqual(rect.right);
			if (wraps !== undefined) await expect(wrapped).toBe(wraps);
		},
	};
}

export const ActsShareTheTitleRow1At320 = row(320, 1, false);
export const ActsShareTheTitleRow1At390 = row(390, 1, false);
export const ActsShareTheTitleRow3At320 = row(320, 3, true);
export const ActsShareTheTitleRow3At390 = row(390, 3, false);
export const ActsShareTheTitleRow4At320 = row(320, 4, true);
export const ActsShareTheTitleRow4At390 = row(390, 4);

// A touch Screen whose title wraps pads it a step above and below its lines and
// its head a step more; the back act and the acts hang from the first line.
function wrapped(width: number): StoryObj {
	return {
		...viewport(width),
		render: () => (
			<Screen
				title="A deploy history title long enough to wrap onto several lines of the head before any act of the screen"
				back="/system"
				actions={TOOLS.slice(0, 1)}
			>
				<p>The first section.</p>
			</Screen>
		),
		play: async ({ canvasElement }) => {
			const head = canvasElement.querySelector("header");
			const title = head?.querySelector("h1");
			const back = head?.querySelector("[aria-label='Back']");
			const act = head?.querySelector("[aria-label='Filter']");
			if (!head || !title || !back || !act)
				throw new Error("the Screen is not drawn");
			const rect = head.getBoundingClientRect();
			const text = title.getBoundingClientRect();
			const style = getComputedStyle(title);
			const line = Number.parseFloat(style.lineHeight);
			const step = Number.parseFloat(style.paddingTop);
			const lines = Math.round((text.height - 2 * step) / line);
			const first = act.getBoundingClientRect();
			const arrow = back.getBoundingClientRect();
			console.log(
				`${width}: head ${rect.height}, title ${text.height} (${lines} lines), act centre ${first.top + first.height / 2}, back centre ${arrow.top + arrow.height / 2}, first line centre ${text.top + step + line / 2}`,
			);
			await expect(lines).toBeGreaterThanOrEqual(3);
			await expect(step).toBeGreaterThanOrEqual(8);
			await expect(text.height).toBeGreaterThanOrEqual(100);
			await expect(rect.height).toBeGreaterThanOrEqual(text.height + 2 * step);
			await expect(first.top + first.height / 2).toBeCloseTo(
				text.top + step + line / 2,
				0,
			);
			await expect(arrow.top + arrow.height / 2).toBeCloseTo(
				text.top + step + line / 2,
				0,
			);
			await expect(text.width).toBeGreaterThanOrEqual(
				(rect.width - 32) * 0.4 - 1,
			);
		},
	};
}

export const WrappedTitleKeepsItsBlockAt320 = wrapped(320);
export const WrappedTitleKeepsItsBlockAt390 = wrapped(390);
