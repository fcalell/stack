import { Button } from "@fcalell/plugin-react-ui/components/button";
import { IconButton } from "@fcalell/plugin-react-ui/components/icon-button";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import type { PlaceSpec } from "@fcalell/ui-core/descriptors";
import { ACT_DELAY } from "@fcalell/ui-core/paint";
import { ORPCError } from "@orpc/client";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, fn, screen, waitFor } from "storybook/test";

// An act holds its own run: inert and busy at the press, its pending look
// (the pending fill and the spinner over a hidden label) drawn only once the
// act delay has run, ready the moment its promise settles. A refusal reads as
// a failed toast whose Retry runs the act again; the Button standing alone
// draws it under itself instead.
const PLACES: PlaceSpec[] = [
	{ route: "/overview", label: "Overview", icon: "House" },
];

function Page(props: { children: ReactNode }) {
	return (
		<Shell places={PLACES}>
			<Place>
				<Pane title="Deploys">{props.children}</Pane>
			</Place>
		</Shell>
	);
}

export default {
	title: "Behaviour/Act",
	parameters: { layout: "fullscreen" },
} satisfies Meta;

// A failed toast is high priority: Base UI announces it at once and hides it
// from the tree (`aria-hidden`) until the viewer focuses it, its acts included,
// so axe's `aria-hidden-focus` flags the Retry and the dismiss act of every one.
const TOASTING = {
	a11y: {
		config: { rules: [{ id: "aria-hidden-focus", enabled: false }] },
	},
};

// The spinner layer is in the tree from the press and fades in after the
// delay; what a viewer sees is its opacity.
const layerOf = (button: HTMLElement) =>
	button.querySelector<HTMLElement>(".animate-act-in");
const opacity = (element: Element | null | undefined) =>
	element ? Number(getComputedStyle(element).opacity) : undefined;

// The toast also reads its sentence to a screen reader, so the sentence is in
// the page twice.
const drawn = (sentence: string) => screen.findAllByText(sentence);

const quick = fn(() => Promise.resolve());

// An act the server answers at once is inert for that moment and never shows
// a spinner.
export const FastActShowsNoSpinner: StoryObj = {
	render: () => (
		<Page>
			<Button label="Save" onAct={quick} />
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		quick.mockClear();
		const save = canvas.getByRole("button", { name: "Save" });
		await userEvent.click(save);
		await expect(quick).toHaveBeenCalledTimes(1);
		await waitFor(() => expect(save).not.toHaveAttribute("aria-busy"));
		await expect(layerOf(save)).toBeNull();
		await expect(opacity(save.querySelector("span"))).toBe(1);
	},
};

let release: () => void = () => {};
const slow = () =>
	new Promise<void>((resolve) => {
		release = resolve;
	});

// A slow act is inert at the press with its label still drawn; after the act
// delay its spinner and fill are in and its label is gone, and it is ready
// again the moment it settles.
export const SlowActShowsTheSpinnerAfterTheDelay: StoryObj = {
	render: () => (
		<Page>
			<Button label="Deploy" onAct={slow} />
			<IconButton icon="RefreshCw" label="Refresh" onAct={slow} />
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		const deploy = canvas.getByRole("button", { name: "Deploy" });
		await userEvent.click(deploy);
		await expect(deploy).toHaveAttribute("aria-busy", "true");
		await expect(deploy).toHaveAttribute("aria-disabled", "true");
		const label = deploy.querySelector("span") as HTMLElement;
		await expect(opacity(label)).toBe(1);
		await expect(opacity(layerOf(deploy))).toBe(0);
		await waitFor(
			() => {
				expect(opacity(layerOf(deploy))).toBe(1);
				expect(opacity(label)).toBe(0);
			},
			{ timeout: ACT_DELAY + 1500 },
		);
		release();
		await waitFor(() => expect(deploy).not.toHaveAttribute("aria-busy"));
		await expect(layerOf(deploy)).toBeNull();
		await expect(opacity(label)).toBe(1);
		const refresh = canvas.getByRole("button", { name: "Refresh" });
		await userEvent.click(refresh);
		await expect(refresh).toHaveAttribute("aria-busy", "true");
		await waitFor(() => expect(opacity(layerOf(refresh))).toBe(1), {
			timeout: ACT_DELAY + 1500,
		});
		release();
		await waitFor(() => expect(refresh).not.toHaveAttribute("aria-busy"));
	},
};

// Storybook resets a mock's implementation before each story, so the act
// counts its own runs: refused the first time, taken the second.
let runs = 0;
const refused = () =>
	++runs === 1
		? Promise.reject(
				new ORPCError("BAD_REQUEST", { message: "the name is taken" }),
			)
		: Promise.resolve();

// An act the server refused toasts the server's sentence with Retry, and Retry
// runs the act again.
export const ARefusalToastsItsSentenceWithRetry: StoryObj = {
	parameters: TOASTING,
	render: () => (
		<Page>
			<IconButton icon="RefreshCw" label="Rename" onAct={refused} />
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		runs = 0;
		await userEvent.click(canvas.getByRole("button", { name: "Rename" }));
		await drawn("The name is taken.");
		await userEvent.click(
			await screen.findByRole("button", { name: "Retry", hidden: true }),
		);
		await waitFor(() => expect(runs).toBe(2));
	},
};

const failing = () => Promise.reject(new Error("socket hang up"));

// With no refusal of the server's, the act's own sentence, else the generic one.
export const AnActsOwnSentenceStandsInForAnUnwordedFailure: StoryObj = {
	parameters: TOASTING,
	render: () => (
		<Page>
			<IconButton
				icon="RefreshCw"
				label="Stop"
				onAct={failing}
				failed="The job could not be stopped."
			/>
			<IconButton icon="RefreshCw" label="Start" onAct={failing} />
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Stop" }));
		await drawn("The job could not be stopped.");
		await userEvent.click(screen.getByLabelText("Dismiss"));
		await waitFor(() =>
			expect(screen.queryByText("The job could not be stopped.")).toBeNull(),
		);
		await userEvent.click(canvas.getByRole("button", { name: "Start" }));
		await drawn("That didn't go through.");
	},
};

// The Button standing alone draws its failure in its reason line under itself,
// and a press clears it.
export const AStandaloneButtonDrawsItsFailureUnderItself: StoryObj = {
	render: () => (
		<Page>
			<Button
				label="Publish"
				onAct={() =>
					Promise.reject(
						new ORPCError("CONFLICT", { message: "a deploy is running" }),
					)
				}
			/>
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		const publish = canvas.getByRole("button", { name: "Publish" });
		await userEvent.click(publish);
		const line = await canvas.findByRole("alert");
		await expect(line).toHaveTextContent("A deploy is running.");
		await expect(
			publish.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	},
};
