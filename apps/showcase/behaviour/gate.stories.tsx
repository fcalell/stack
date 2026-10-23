import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, waitFor, within } from "storybook/test";
import { orpc } from "../src/app/lib/api.ts";
import { through } from "./support.ts";

const pressed = fn();
const declined = fn();
const accepting = fn();

function Step() {
	return (
		<Gate
			title="Sign in"
			form={{
				act: orpc.auth.signIn.sendOtp,
				fields: { email: { label: "Email" } },
			}}
		/>
	);
}

function FirstRun() {
	return (
		<Gate
			title="Deploy your first app"
			description={[
				"Connect a repository and Acme builds and deploys every push to main.",
			]}
			acts={
				<>
					<Button label="Connect a repository" onAct={pressed} />
					<Button
						act="secondary"
						label="Start from a template"
						onAct={pressed}
					/>
				</>
			}
		/>
	);
}

export default {
	title: "Behaviour/Gate",
	parameters: { layout: "fullscreen" },
	render: () => <Step />,
} satisfies Meta;

// A step that opens hands focus to its first field.
export const FirstField: StoryObj = {
	play: async ({ canvas }) => {
		await waitFor(() =>
			expect(canvas.getByRole("textbox", { name: "Email" })).toHaveFocus(),
		);
	},
};

// A first run is a titled Gate: its title is the page's one h1 and its
// buttons are the body. The column stands centred across and down the
// viewport while it fits, and at the top on touch, as every step does.
async function expectColumn(canvasElement: HTMLElement, width: number) {
	const { page } = await import("vitest/browser");
	await page.viewport(width, 844);
	await waitFor(() => expect(window.innerWidth).toBe(width));
	const titles = canvasElement.querySelectorAll("h1");
	await expect(titles).toHaveLength(1);
	await expect(titles[0]).toHaveTextContent("Deploy your first app");
	const column = titles[0]?.parentElement?.parentElement;
	if (!column) throw new Error("the first run's column is not drawn");
	return column;
}

export const FirstRunCentred: StoryObj = {
	render: () => <FirstRun />,
	play: async ({ canvasElement }) => {
		const column = await expectColumn(canvasElement, 1440);
		await waitFor(() => {
			const box = column.getBoundingClientRect();
			const centre = {
				x: box.left + box.width / 2,
				y: box.top + box.height / 2,
			};
			expect(Math.abs(centre.x - window.innerWidth / 2)).toBeLessThan(1);
			expect(Math.abs(centre.y - window.innerHeight / 2)).toBeLessThan(1);
		});
	},
};

// On touch the column stands at the top of the page, for the keyboard.
export const FirstRunAtTopOnTouch: StoryObj = {
	render: () => <FirstRun />,
	globals: { density: "touch" },
	play: async ({ canvasElement }) => {
		const column = await expectColumn(canvasElement, 390);
		await waitFor(() => {
			const box = column.getBoundingClientRect();
			expect(
				Math.abs(box.left + box.width / 2 - window.innerWidth / 2),
			).toBeLessThan(1);
			expect(box.top).toBeLessThan(window.innerHeight / 4);
		});
	},
};

// A verdict stands with the content it is about: the banner is in the step
// under the title and description and before the body, not above the mark, so
// an act in the form lands it beside the act.
export const BannerBesideTheBody: StoryObj = {
	render: () => (
		<Gate
			title="Choose a workspace"
			description={["Signed in as ", { strong: "ana@acme.dev" }]}
			banner={<Banner tone="attention" sentence="This request has expired." />}
		>
			<Button label="Continue" onAct={pressed} />
		</Gate>
	),
	play: async ({ canvas }) => {
		const title = canvas.getByRole("heading", { level: 1 });
		const banner = await canvas.findByRole("status");
		const body = canvas.getByRole("button", { name: "Continue" });
		const top = (element: Element) => element.getBoundingClientRect().top;
		await expect(top(banner)).toBeGreaterThan(
			title.getBoundingClientRect().bottom,
		);
		await expect(top(banner)).toBeLessThan(top(body));
		// The banner and the body are one step.
		const step = title.parentElement as HTMLElement;
		await expect(step).toContainElement(banner);
		await expect(step).toContainElement(body);
	},
};

const accepted = through(orpc.forms.rename, async (input) => {
	accepting(input);
	return { id: "workspace-1" };
});

// A step that submits one act and declines with another: the form's `acts`
// stand in the bar before the filled submit, across the column, and a
// destructive one asks first.
export const ADeclineStandsBesideTheSubmit: StoryObj = {
	render: () => (
		<Gate
			title="Join Acme"
			form={{
				act: accepted,
				given: { workspaceId: "acme" },
				fields: { name: { label: "Your name" } },
				submit: { label: "Accept" },
				acts: [
					{
						label: "Decline",
						destructive: true,
						confirm: {
							title: "Decline the invitation?",
							sentence: "The invitation is cancelled.",
						},
						onAct: declined,
					},
				],
			}}
		/>
	),
	play: async ({ canvas, userEvent }) => {
		declined.mockClear();
		accepting.mockClear();
		const names = (await canvas.findAllByRole("button")).map(
			(one) => one.textContent,
		);
		await expect(names).toEqual(["Decline", "Accept"]);
		await userEvent.click(canvas.getByRole("button", { name: "Decline" }));
		const asked = within(await screen.findByRole("alertdialog"));
		await expect(declined).not.toHaveBeenCalled();
		await userEvent.click(asked.getByRole("button", { name: "Decline" }));
		await waitFor(() => expect(declined).toHaveBeenCalledTimes(1));
		await userEvent.type(
			canvas.getByRole("textbox", { name: "Your name" }),
			"Ana",
		);
		await userEvent.click(canvas.getByRole("button", { name: "Accept" }));
		await waitFor(() =>
			expect(accepting).toHaveBeenCalledWith({
				workspaceId: "acme",
				name: "Ana",
			}),
		);
	},
};
