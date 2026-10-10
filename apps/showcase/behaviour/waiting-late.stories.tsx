import { Group } from "@fcalell/plugin-react-ui/components/group";
import { QueryBoundary } from "@fcalell/plugin-react-ui/components/query-boundary";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { expect, waitFor } from "storybook/test";

// A waiting form shows only for a read that lasts: nothing is drawn until the
// read has run about 200 ms, and once drawn it stays about 500 ms.
function Read(props: { ms: number }) {
	const [pending, setPending] = useState(true);
	useEffect(() => {
		const timer = setTimeout(() => setPending(false), props.ms);
		return () => clearTimeout(timer);
	}, [props.ms]);
	return (
		<QueryBoundary
			query={{
				data: pending ? undefined : "Loaded",
				isPending: pending,
				isError: false,
				refetch: () => {},
			}}
			sentence="Could not load"
			loading={<div data-testid="waiting">Waiting</div>}
		>
			{(data) => <div data-testid="loaded">{data}</div>}
		</QueryBoundary>
	);
}

const drawn = (element: HTMLElement) =>
	getComputedStyle(element).visibility !== "hidden";

export default {
	title: "Behaviour/Waiting late",
} satisfies Meta;

// A read that settles at 50 ms never draws its waiting form.
export const Fast: StoryObj = {
	render: () => <Read ms={50} />,
	play: async ({ canvas }) => {
		const seen: boolean[] = [];
		const watch = setInterval(() => {
			const form = canvas.queryByTestId("waiting");
			seen.push(form !== null && drawn(form));
		}, 10);
		await canvas.findByTestId("loaded");
		await new Promise((done) => setTimeout(done, 700));
		clearInterval(watch);
		await expect(seen.some(Boolean)).toBe(false);
	},
};

// A read of 1 s draws its waiting form after the delay, not before.
export const Slow: StoryObj = {
	render: () => <Read ms={1000} />,
	play: async ({ canvas }) => {
		const form = await canvas.findByTestId("waiting");
		await expect(drawn(form)).toBe(false);
		await waitFor(() => expect(drawn(form)).toBe(true), { timeout: 600 });
		await canvas.findByTestId("loaded", {}, { timeout: 3000 });
	},
};

// A read that settles just after the delay holds its form for the minimum, so
// it never blinks.
export const Held: StoryObj = {
	render: () => <Read ms={260} />,
	play: async ({ canvas }) => {
		const form = await canvas.findByTestId("waiting");
		await waitFor(() => expect(drawn(form)).toBe(true), { timeout: 600 });
		const shown = performance.now();
		await canvas.findByTestId("loaded", {}, { timeout: 3000 });
		await expect(performance.now() - shown).toBeGreaterThan(400);
	},
};

function Own(props: { ms: number }) {
	const [pending, setPending] = useState(true);
	useEffect(() => {
		const timer = setTimeout(() => setPending(false), props.ms);
		return () => clearTimeout(timer);
	}, [props.ms]);
	return (
		<Section title="Plan" loading={pending}>
			<Group loading={pending}>
				<div data-testid="row">Row</div>
			</Group>
		</Section>
	);
}

// A Section's and a Group's own `loading` follows the same rule: a read that
// settles at 50 ms leaves their waiting forms undrawn throughout.
export const Own50: StoryObj = {
	render: () => <Own ms={50} />,
	play: async ({ canvas }) => {
		const section = canvas
			.getByRole("heading", { name: "Plan" })
			.closest("section");
		await expect(section).not.toBeNull();
		const drawnWhileBusy: boolean[] = [];
		const watch = setInterval(() => {
			const group = section?.querySelector("[aria-busy=true]");
			if (group instanceof HTMLElement) drawnWhileBusy.push(drawn(group));
		}, 10);
		await new Promise((done) => setTimeout(done, 800));
		clearInterval(watch);
		await expect(drawnWhileBusy.some(Boolean)).toBe(false);
	},
};
