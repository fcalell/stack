import { Prose } from "@fcalell/plugin-react-ui/components/prose";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

const pressed = fn();

// A Section's head is one line at every width, its title keeping two fifths of
// it. Its act is an icon act, a square that always stands: nothing folds into
// the head's more menu, which stands beside the act when the Section has one.
export default {
	title: "Behaviour/SectionHeadFold",
} satisfies Meta;

const archive = fn();
const TITLE = "Operating principles for the agent";
const ACT = "Add principle";

function Head(props: { width: number; more?: boolean }) {
	return (
		<div style={{ width: props.width }} className="max-w-full">
			<Section
				title={TITLE}
				act={{ icon: "Plus", label: ACT, onAct: archive }}
				more={props.more ? [{ label: "Move up", onAct: pressed }] : undefined}
			>
				<Prose markdown="Prose." />
			</Section>
		</div>
	);
}

// With room the act stands beside the title and the head holds no menu.
export const StandsAt1280: StoryObj = {
	render: () => <Head width={1280} />,
	play: async ({ canvas }) => {
		const title = await canvas.findByText(TITLE);
		const act = canvas.getByRole("button", { name: ACT });
		await expect(act).toBeVisible();
		await expect(canvas.queryByRole("button", { name: /^more/i })).toBeNull();
		await expect(act.getBoundingClientRect().left).toBeGreaterThanOrEqual(
			title.getBoundingClientRect().right - 0.5,
		);
	},
};

// An icon act is a square that always stands.
export const AnIconActAlwaysStands320: StoryObj = {
	render: () => <Head width={320} />,
	play: async ({ canvas }) => {
		await canvas.findByText(TITLE);
		await expect(canvas.getByRole("button", { name: ACT })).toBeVisible();
		await expect(canvas.queryByRole("button", { name: /^more/i })).toBeNull();
	},
};

// A head with a more menu keeps its act at 320: the act and the menu both stand.
export const TheActStandsBesideTheMoreMenuAt320: StoryObj = {
	render: () => <Head width={320} more />,
	play: async ({ canvas }) => {
		await canvas.findByText(TITLE);
		await expect(canvas.getByRole("button", { name: ACT })).toBeVisible();
		await expect(canvas.getByRole("button", { name: /^more/i })).toBeVisible();
	},
};
