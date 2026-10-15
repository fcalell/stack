import { read } from "@fcalell/plugin-api/tanstack-query";
import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import type { PlaceSpec } from "@fcalell/ui-core/descriptors";
import { ACT_DELAY, timings, WAIT_DELAY } from "@fcalell/ui-core/paint";
import { ORPCError } from "@orpc/client";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { onlineManager, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { expect } from "storybook/test";

// The tuning bench for the two delays and the minimum: a read paints after
// `--wait-delay` and an act after `--act-delay`, both set live on the root
// beside `timings`, and a read's first answer waits until the paint has stood
// for the minimum. The page under the
// controls is a Pane with a Section list (painted, then settled) and an
// ActionBar act, with a read time and an act's time and outcome chosen here, so
// the owner feels a number before it goes into `paint.ts`.
export default {
	title: "Behaviour/Timings",
	parameters: { layout: "fullscreen" },
} satisfies Meta;

const PLACES: PlaceSpec[] = [
	{ route: "/overview", label: "Overview", icon: "House" },
];

const OUTCOMES = ["resolve", "refuse", "fail", "offline"] as const;
type Outcome = (typeof OUTCOMES)[number];

const ROWS = ["Ana Ruiz", "Ben Kaya", "Ema Okafor", "Kofi Mensah"];

const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

function Slider(props: {
	label: string;
	value: number;
	max: number;
	step: number;
	onChange: (value: number) => void;
}) {
	return (
		<label style={{ display: "flex", gap: 12, alignItems: "center" }}>
			<span style={{ width: 160 }}>{props.label}</span>
			<input
				type="range"
				min={0}
				max={props.max}
				step={props.step}
				value={props.value}
				onChange={(event) => props.onChange(Number(event.target.value))}
			/>
			<output style={{ width: 72, fontVariantNumeric: "tabular-nums" }}>
				{props.value} ms
			</output>
		</label>
	);
}

// The page under test. A new `run` is a new read, so the painted form plays
// again.
function Bench(props: { readMs: number; actMs: number; outcome: Outcome }) {
	const { readMs, actMs, outcome } = props;
	const [run, setRun] = useState(0);
	const rows = useMemo(
		() =>
			read({
				queryKey: ["timings", run, readMs],
				queryFn: async () => {
					await wait(readMs);
					return ROWS;
				},
				staleTime: Number.POSITIVE_INFINITY,
			}),
		[run, readMs],
	);
	const act = useMutation({
		mutationFn: async () => {
			await wait(actMs);
			if (outcome === "refuse")
				throw new ORPCError("BAD_REQUEST", { message: "the bench refuses" });
			if (outcome === "fail") throw new Error("the bench fails");
		},
	});
	useEffect(() => () => onlineManager.setOnline(true), []);
	const press = () => {
		if (outcome === "offline") {
			onlineManager.setOnline(false);
			setTimeout(() => onlineManager.setOnline(true), actMs);
		}
		return act.mutateAsync();
	};
	return (
		<Shell places={PLACES}>
			<Place>
				<Pane
					title="Timings"
					actions={[
						{
							icon: "RefreshCw",
							label: "Replay read",
							onAct: () => setRun(run + 1),
						},
					]}
				>
					<Section title="People" read={rows} failed="People did not load.">
						<List
							items={rows}
							row={{ key: (name) => name, title: (name) => name }}
						/>
					</Section>
					<ActionBar
						acts={[
							{ label: "Send", failed: "The bench act failed.", onAct: press },
						]}
					/>
				</Pane>
			</Place>
		</Shell>
	);
}

function Timings() {
	const [waitDelay, setWaitDelay] = useState(WAIT_DELAY);
	const [actDelay, setActDelay] = useState(ACT_DELAY);
	const [waitMin, setWaitMin] = useState(timings.waitMin);
	const [readMs, setReadMs] = useState(1200);
	const [actMs, setActMs] = useState(1200);
	const [outcome, setOutcome] = useState<Outcome>("resolve");
	// The root's own values come back when the story leaves.
	useEffect(() => {
		const root = document.documentElement;
		const was = [
			root.style.getPropertyValue("--wait-delay"),
			root.style.getPropertyValue("--act-delay"),
		];
		return () => {
			root.style.setProperty("--wait-delay", was[0]);
			root.style.setProperty("--act-delay", was[1]);
			Object.assign(timings, {
				waitDelay: WAIT_DELAY,
				actDelay: ACT_DELAY,
				waitMin: 0,
			});
		};
	}, []);
	useEffect(() => {
		document.documentElement.style.setProperty(
			"--wait-delay",
			`${waitDelay}ms`,
		);
		document.documentElement.style.setProperty("--act-delay", `${actDelay}ms`);
		Object.assign(timings, { waitDelay, actDelay, waitMin });
	}, [waitDelay, actDelay, waitMin]);
	return (
		<>
			<fieldset
				style={{ display: "grid", gap: 8, padding: 16, border: 0 }}
				aria-label="Timings"
			>
				<Slider
					label="--wait-delay"
					value={waitDelay}
					max={1000}
					step={25}
					onChange={setWaitDelay}
				/>
				<Slider
					label="--act-delay"
					value={actDelay}
					max={1000}
					step={25}
					onChange={setActDelay}
				/>
				<Slider
					label="Minimum"
					value={waitMin}
					max={1000}
					step={25}
					onChange={setWaitMin}
				/>
				<Slider
					label="Read time"
					value={readMs}
					max={5000}
					step={100}
					onChange={setReadMs}
				/>
				<Slider
					label="Act time"
					value={actMs}
					max={5000}
					step={100}
					onChange={setActMs}
				/>
				<label style={{ display: "flex", gap: 12, alignItems: "center" }}>
					<span style={{ width: 160 }}>Act outcome</span>
					<select
						value={outcome}
						onChange={(event) => setOutcome(event.target.value as Outcome)}
					>
						{OUTCOMES.map((each) => (
							<option key={each}>{each}</option>
						))}
					</select>
				</label>
			</fieldset>
			<Bench readMs={readMs} actMs={actMs} outcome={outcome} />
		</>
	);
}

export const Bench_: StoryObj = {
	name: "Bench",
	render: () => <Timings />,
	play: async () => {
		const root = document.documentElement.style;
		await expect(root.getPropertyValue("--wait-delay")).toBe(`${WAIT_DELAY}ms`);
		await expect(root.getPropertyValue("--act-delay")).toBe(`${ACT_DELAY}ms`);
		await expect(timings.waitMin).toBe(0);
	},
};
