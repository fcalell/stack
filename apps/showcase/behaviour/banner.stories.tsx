import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, waitFor } from "storybook/test";

const pressed = fn();

const act = { label: "Reconnect", onAct: pressed };

function Step(props: {
	tone: "active" | "failed";
	sentence: string;
	withAct?: boolean;
}) {
	return (
		<Gate title="Sign in">
			<Banner
				tone={props.tone}
				sentence={props.sentence}
				act={props.withAct === false ? undefined : act}
			/>
		</Gate>
	);
}

export default {
	title: "Behaviour/Banner",
	parameters: { layout: "fullscreen" },
} satisfies Meta;

async function viewport(width: number) {
	const { page } = await import("vitest/browser");
	await page.viewport(width, 844);
	await waitFor(() => expect(window.innerWidth).toBe(width));
}

// What a banner measures: its box, its sentence's and its act's.
function measure(canvasElement: HTMLElement) {
	const banner = canvasElement.querySelector<HTMLElement>(
		"[role=status], [role=alert]",
	);
	const button = banner?.querySelector("button");
	const sentence = banner?.querySelector("p");
	if (!banner || !button || !sentence)
		throw new Error("the banner is not drawn");
	const box = banner.getBoundingClientRect();
	return {
		height: box.height,
		act: button.getBoundingClientRect(),
		sentence: sentence.getBoundingClientRect(),
	};
}

const SHORT = "Sign-in is paused for this organization.";
const LONG =
	"Sign-in is paused for this organization until an owner reconnects the identity provider, and nobody can enter before then.";

// An act that fits beside the sentence stands there, on a phone's width and a
// desktop's: the banner is one act tall, not a line and an act.
async function expectBeside(canvasElement: HTMLElement, width: number) {
	await viewport(width);
	await waitFor(() => {
		const { height, act, sentence } = measure(canvasElement);
		expect(act.top).toBeLessThan(sentence.bottom);
		// Not a line and an act stacked.
		expect(height).toBeLessThan(sentence.height + act.height);
	});
}

export const ActBesideTheSentence: StoryObj = {
	render: () => <Step tone="active" sentence={SHORT} />,
	globals: { density: "touch" },
	play: ({ canvasElement }) => expectBeside(canvasElement, 420),
};

export const DangerActBeside: StoryObj = {
	...ActBesideTheSentence,
	render: () => <Step tone="failed" sentence={SHORT} />,
};

export const LongSentenceActBeside: StoryObj = {
	...ActBesideTheSentence,
	render: () => <Step tone="failed" sentence={LONG} />,
};

export const ActBesideOnDesktop: StoryObj = {
	render: () => <Step tone="active" sentence={SHORT} />,
	play: ({ canvasElement }) => expectBeside(canvasElement, 1440),
};

// With no room beside the sentence's floor the act wraps under it.
export const ActUnderWhenItDoesNotFit: StoryObj = {
	render: () => (
		<Gate title="Sign in">
			<Banner
				sentence={SHORT}
				act={{ label: "Reconnect the identity provider now", onAct: pressed }}
			/>
		</Gate>
	),
	globals: { density: "touch" },
	play: async ({ canvasElement }) => {
		await viewport(320);
		await waitFor(() => {
			const { act, sentence } = measure(canvasElement);
			expect(act.top).toBeGreaterThanOrEqual(sentence.bottom);
		});
	},
};

const USAGE =
	"Usage is at 96% of the plan; new runs may wait until the period ends.";
const OPEN_USAGE = { label: "Open Usage", onAct: pressed };

// A sentence that an act beside it would squeeze below two thirds of the
// banner gives the act its own line, so it never wraps down a narrow column.
export const ActUnderWhereBesideSqueezes: StoryObj = {
	tags: ["touch"],
	render: () => (
		<Gate title="Sign in">
			<Banner sentence={USAGE} act={OPEN_USAGE} />
		</Gate>
	),
	globals: { density: "touch" },
	play: async ({ canvasElement }) => {
		await viewport(320);
		await waitFor(() => {
			const { act, sentence } = measure(canvasElement);
			expect(act.top).toBeGreaterThanOrEqual(sentence.bottom);
		});
	},
};

export const ActBesideWhereItFitsOnDesktop: StoryObj = {
	render: () => (
		<Gate title="Sign in">
			<Banner sentence={USAGE} act={OPEN_USAGE} />
		</Gate>
	),
	play: ({ canvasElement }) => expectBeside(canvasElement, 1280),
};
