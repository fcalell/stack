import { read } from "@fcalell/plugin-api/tanstack-query";
import { BarChart } from "@fcalell/plugin-react-ui/components/bar-chart";
import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Canvas } from "@fcalell/plugin-react-ui/components/canvas";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { Image } from "@fcalell/plugin-react-ui/components/image";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Picker } from "@fcalell/plugin-react-ui/components/picker";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import { Stats } from "@fcalell/plugin-react-ui/components/stats";
import { Switch } from "@fcalell/plugin-react-ui/components/switch";
import { Text } from "@fcalell/plugin-react-ui/components/text";
import { Thread } from "@fcalell/plugin-react-ui/components/thread";
import { Toolbar } from "@fcalell/plugin-react-ui/components/toolbar";
import { toast } from "@fcalell/plugin-react-ui/lib/toast";
import { WORKFLOW } from "@fcalell/plugin-react-ui/showcase/frames/canvas";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import type { PlaceSpec } from "@fcalell/ui-core/descriptors";
import { loading, setLoading, tune, tuned } from "@fcalell/ui-core/paint";
import {
	DURATIONS,
	LOADING_PAINTS,
	LOADING_SLOTS,
	type LoadingPaint,
	type LoadingSlot,
	MOTION_KNOBS,
	type MotionKnob,
} from "@fcalell/ui-core/tokens";
import { ORPCError } from "@orpc/client";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { onlineManager, useMutation } from "@tanstack/react-query";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { expect, fireEvent, fn, userEvent, within } from "storybook/test";
import { orpc } from "../src/app/lib/api.ts";

const pressed = fn();

// The options an option list reads its value's type from: the value is text.
const _FIRST_SECOND: { value: string; label: string }[] = [
	{ value: "a", label: "First" },
	{ value: "b", label: "Second" },
];

// The motion tuning page: one slider per knob of `MOTION_KNOBS`, grouped, each
// written to its CSS variable on the root and to `tuned` (the phone's record)
// so the next animation played takes it. The owner tunes every timing here in
// one pass and copies the changed knobs as JSON for the write-back: save it
// and run `pnpm --filter @fcalell/ui-core motion:apply values.json` (or pipe
// it in), which checks it against the knobs' bounds, rewrites the defaults in
// ui-core's `tokens.ts` and regenerates DESIGN.md. Under the
// sliders sit the read-time/act-time/outcome controls with their Bench (a
// Pane with a painted Section list and a Button act), and the Motion
// bench, where each motion unit appends a sample row to play.
export default {
	title: "Behaviour/Motion tuning",
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
	knob: Pick<MotionKnob, "min" | "max" | "step" | "unit">;
	onChange: (value: number) => void;
}) {
	const { knob } = props;
	return (
		<label style={{ display: "flex", gap: 12, alignItems: "center" }}>
			<span style={{ width: 240 }}>{props.label}</span>
			<input
				type="range"
				min={knob.min}
				max={knob.max}
				step={knob.step}
				value={props.value}
				aria-label={props.label}
				onChange={(event) => props.onChange(Number(event.target.value))}
			/>
			<output style={{ width: 88, fontVariantNumeric: "tabular-nums" }}>
				{props.value}
				{knob.unit}
			</output>
		</label>
	);
}

// The knobs by what they move, in the order the page shows them.
const GROUPS: { title: string; names: MotionKnob["name"][] }[] = [
	{ title: "Rungs", names: ["instant", "fast", "base", "slow"] },
	{ title: "Loop and pulse", names: ["loop", "pulse"] },
	{ title: "Tick", names: ["tick"] },
	{ title: "Scales", names: ["press", "lift"] },
	{ title: "Follow", names: ["fling", "reach"] },
	{ title: "Waits", names: ["waitDelay", "actDelay", "waitMin"] },
];

type Values = Record<MotionKnob["name"], number>;

const DEFAULTS = Object.fromEntries(
	MOTION_KNOBS.map((knob) => [knob.name, knob.default]),
) as Values;

// A row whose leading is the spinner, a status that is `running`.
const RUNNING = {
	key: "run",
	title: "Running",
	leading: { status: "running" },
} as const;

// The wait: a painted figure (the appear fade after the wait delay, then the
// breath) beside the spinner (its fade, then the loop). Replay mounts them
// again, so the delay and the fade play from the start.
function WaitSample() {
	const [run, setRun] = useState(0);
	const waiting = useMemo(
		() =>
			read({
				queryKey: ["motion-bench", "wait", run],
				queryFn: () => new Promise<number>(() => {}),
			}),
		[run],
	);
	return (
		<>
			<Stats items={[{ label: "Waiting", value: waiting }]} />
			<Section key={run} items={[RUNNING]} />
			<button type="button" onClick={() => setRun(run + 1)}>
				Replay
			</button>
		</>
	);
}

// A control that holds its own value, so a sample can be pressed and watched.
function Held<T>(props: {
	initial: T;
	children: (state: [T, (next: T) => void]) => ReactNode;
}) {
	const state = useState(props.initial);
	return props.children(state);
}

const noop = () => {};

// The layers: each opens the real component, so its enter and leave play on
// the rungs as tuned (the sheet is the desktop card here, the bottom sheet at
// touch density; the tooltip shows on a rest over its act).
function LayerSample() {
	const [sheet, setSheet] = useState(false);
	const [role, setRole] = useState<"owner" | "member">("member");
	return (
		<>
			<button type="button" onClick={() => setSheet(true)}>
				Sheet
			</button>
			<Sheet
				open={sheet}
				onClose={() => setSheet(false)}
				title="Rename domain"
				submit={{ label: "Save", onAct: () => setSheet(false) }}
			>
				<p>The sheet.</p>
			</Sheet>
			<Section
				title="Team"
				more={[
					{ label: "Duplicate", onAct: noop },
					{ label: "Rename", onAct: noop },
				]}
			/>
			<Picker
				label="Role"
				options={[
					{ value: "owner", label: "Owner" },
					{ value: "member", label: "Member" },
				]}
				value={role}
				onChange={setRole}
			/>
			<Button glyph icon="RefreshCw" label="Tooltip" onAct={noop} />
			<button type="button" onClick={() => toast("Saved")}>
				Toast
			</button>
			<Image
				fit="thumb"
				alt="Image view"
				src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' fill='gray'/></svg>"
			/>
		</>
	);
}

// A line: a blocked act's reason appears on a press, and a field's issue line
// appears when the name is emptied and saved; each fades in on `fast` and
// pushes what follows at once.
function LineSample() {
	return (
		<div style={{ display: "grid", gap: 12, width: 320 }}>
			<Button label="Publish" blocked="Add a title first" onAct={noop} />
			<Place>
				<Pane title="Rename">
					<Form
						act={orpc.forms.rename}
						given={{ workspaceId: "acme" }}
						values={{ name: "Ana" }}
						fields={{ name: { label: "Name" } }}
					/>
				</Pane>
			</Place>
		</div>
	);
}

// A block: the fold, a removed chip, a row added and one removed each land at
// once; a row that arrives on its own fades in (`BLOCK_IN`).
// A canvas whose zoom stack travels the viewport and whose nodes lift under a
// long press on touch, and a toast to swipe toward the inline end.
function FollowSample() {
	const [nodes, setNodes] = useState(WORKFLOW.nodes);
	return (
		<div style={{ display: "grid", gap: 12 }}>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					height: 320,
					width: 560,
				}}
			>
				<Canvas
					label="Follow sample"
					nodes={nodes}
					edges={WORKFLOW.edges}
					groups={WORKFLOW.groups}
					onMove={(id, position) =>
						setNodes((now) =>
							now.map((node) =>
								node.id === id ? { ...node, position } : node,
							),
						)
					}
				/>
			</div>
			<button type="button" onClick={() => toast("Swipe me toward the end")}>
				Raise a toast to swipe
			</button>
		</div>
	);
}

function BlockSample() {
	const [chips, setChips] = useState(["Open", "Mine"]);
	const [rows, setRows] = useState(["Ana Ruiz", "Ben Kaya"]);
	return (
		<div style={{ display: "grid", gap: 12, width: 360 }}>
			<Toolbar
				chips={chips.map((label) => ({
					family: "neutral" as const,
					label,
					onRemove: () => setChips((now) => now.filter((one) => one !== label)),
				}))}
			/>
			<Section
				title="People"
				folded={false}
				items={rows.map((one) => ({
					key: one,
					title: one,
					act: {
						label: "Remove",
						onAct: () => setRows((now) => now.filter((each) => each !== one)),
					},
				}))}
			/>
			<Button
				act="secondary"
				label="Add a row"
				onAct={() => setRows((now) => [...now, `Person ${now.length + 1}`])}
			/>
		</div>
	);
}

// The value move: a meter, a bar chart and a step count driven by
// one number the button moves, so the fills travel by transform and the level
// colour cross-fades.
const BARS = [3, 5, 2, 6, 4];
function ValueSample() {
	const [share, setShare] = useState(30);
	return (
		<>
			<button type="button" onClick={() => setShare((now) => (now + 35) % 105)}>
				Change
			</button>
			<div style={{ width: 200 }}>
				<Stats items={[{ label: "Quota", value: share, bound: 100 }]} />
			</div>
			<div style={{ width: 240 }}>
				<BarChart
					label="Requests"
					items={BARS.map((bar, at) => ({ at, bar: (bar * share) / 30 }))}
					bar={{ key: (one) => String(one.at), value: (one) => one.bar }}
				/>
			</div>
			<Gate
				title="Setup"
				step={{ at: (Math.floor(share / 35) % 3) + 1, of: 3 }}
			/>
		</>
	);
}

// The roll and the mark change: a figure that rises or falls with the button
// and a status whose state moves with it.
const STATES = ["done", "failed", "running", "waiting"] as const;
function RollSample() {
	const [figure, setFigure] = useState(12);
	const [state, setState] = useState(0);
	return (
		<>
			<button type="button" onClick={() => setFigure(figure + 5)}>
				Up
			</button>
			<button type="button" onClick={() => setFigure(Math.max(0, figure - 5))}>
				Down
			</button>
			<Stats items={[{ label: "Figure", value: figure }]} />
			<button type="button" onClick={() => setState((now) => (now + 1) % 4)}>
				Next state
			</button>
			<Section
				items={[
					{
						key: "deploy",
						title: "Deploy",
						status: { tone: STATES[state] ?? "done" },
					},
				]}
			/>
		</>
	);
}

// The loader per kind of glyph slot (`theme.loading`): each kind pulses or
// scrambles, a shape always pulses. Changing a kind mounts the sample again;
// Land answers the read, so a scrambled figure or id decodes as it arrives.
function ScrambleSample() {
	const [paint, setPaint] = useState<Record<LoadingSlot, LoadingPaint>>({
		...loading,
	});
	const [run, setRun] = useState(0);
	const gate = useMemo(() => {
		let land: () => void = () => {};
		const held = new Promise<readonly string[]>((resolve) => {
			land = () => resolve(["Ana Ruiz", "Ben Kaya"]);
		});
		return {
			land,
			rows: read({
				queryKey: ["motion-bench", "scramble", run],
				queryFn: () => held,
			}),
		};
	}, [run]);
	return (
		<>
			{LOADING_SLOTS.map((slot) => (
				<label key={slot}>
					{slot}{" "}
					<select
						value={paint[slot]}
						onChange={(event) => {
							setLoading({ [slot]: event.target.value as LoadingPaint });
							setPaint({ ...loading });
							setRun(run + 1);
						}}
					>
						{LOADING_PAINTS.map((one) => (
							<option key={one} value={one}>
								{one}
							</option>
						))}
					</select>
				</label>
			))}
			<button type="button" onClick={() => setRun(run + 1)}>
				Replay
			</button>
			<button type="button" onClick={gate.land}>
				Land
			</button>
			<Stats items={[{ label: "Figure", value: gate.rows.at(() => 41284) }]} />
			<Section
				items={[
					{
						label: "Commit",

						title: gate.rows.at(() => ({
							code: "9fceb02d4a1e",
							copy: true as const,
						})),
					},
				]}
			/>
			<Section
				items={gate.rows.at((names) =>
					names.map((name) => ({ key: name, title: name })),
				)}
			/>
			<Section key={run} items={[RUNNING]} />
		</>
	);
}

// A short log that a button adds a message to, which rises in as it arrives:
// the stream move (the Latest act shows once the log is scrolled away).
function StreamSample() {
	const [turns, setTurns] = useState([1, 2, 3, 4]);
	return (
		<div style={{ display: "grid", gap: 8, width: 320 }}>
			<div style={{ height: 200, display: "flex", flexDirection: "column" }}>
				<Thread
					items={turns}
					message={{
						key: (each) => `m${each}`,
						author: (each) => (each % 2 ? "you" : "other"),
						body: (each) => `Message ${each}`,
					}}
				/>
			</div>
			<Button
				act="secondary"
				label="Add a message"
				onAct={() => setTurns((now) => [...now, now.length + 1])}
			/>
		</div>
	);
}

// Each later motion unit appends a row here: a label and the sample to play.
const MOTION_SAMPLES: { name: string; sample: () => ReactNode }[] = [
	{ name: "Wait: appear, pulse, spinner", sample: () => <WaitSample /> },
	{
		name: "Answer (hover, press, release)",
		sample: () => (
			<>
				<Button act="secondary" label="Secondary" onAct={pressed} />
				<Button glyph icon="RefreshCw" label="Refresh" onAct={pressed} />
				<Button href="/overview" label="A link" />
			</>
		),
	},
	{
		name: "Give (press scale)",
		sample: () => (
			<>
				<Button label="Primary" onAct={pressed} />
				<Held<"a" | "b"> initial="a">
					{([value, set]) => (
						<Picker
							fit="segments"
							label="View"
							options={[
								{ value: "a", label: "List" },
								{ value: "b", label: "Board" },
							]}
							value={value}
							onChange={set}
						/>
					)}
				</Held>
				<Toolbar
					chips={[
						{ family: "neutral", label: "Removable", onRemove: () => {} },
					]}
				/>
			</>
		),
	},
	{
		name: "Toggle (thumb, mark, dot, chevron)",
		sample: () => (
			<>
				<Held initial={false}>
					{([on, set]) => <Switch checked={on} onChange={set} label="Switch" />}
				</Held>
				<Held<"a" | "b" | null> initial="a">
					{([value, set]) => (
						<Picker
							fit="list"
							label="Options"
							options={[
								{ value: "a", label: "First" },
								{ value: "b", label: "Second" },
							]}
							value={value}
							onChange={set}
						/>
					)}
				</Held>
				<Section title="Fold" folded={false}>
					<Text>The chevron turns.</Text>
				</Section>
			</>
		),
	},
	{
		name: "Layers: sheet, menu, picker, tooltip, toast, image view",
		sample: () => <LayerSample />,
	},
	{ name: "Line: a reason, a field's error", sample: () => <LineSample /> },
	{ name: "Stream: a message arrives", sample: () => <StreamSample /> },
	{
		name: "Block: fold, chip, rows (add and remove)",
		sample: () => <BlockSample />,
	},
	{
		name: "Value (meter, bars, steps)",
		sample: () => <ValueSample />,
	},
	{
		name: "Roll and mark change (figure, status)",
		sample: () => <RollSample />,
	},
	{
		name: "Scramble and decode (the loader per kind)",
		sample: () => <ScrambleSample />,
	},
	{
		name: "Follow: canvas travel and lift, toast swipe, sheet pull",
		sample: () => <FollowSample />,
	},
];

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
				<Section
					title="People"
					items={rows.at((names) =>
						names.map((name) => ({ key: name, title: name })),
					)}
				/>
				<Button label="Send" onAct={press} />
			</Pane>
		</Shell>
	);
}

// The knobs whose value differs from the contract's default, as the write-back
// reads them.
function changedKnobs(values: Values): Record<string, number> {
	return Object.fromEntries(
		MOTION_KNOBS.filter((knob) => values[knob.name] !== knob.default).map(
			(knob) => [knob.name, values[knob.name]],
		),
	);
}

function Tuning() {
	const [values, setValues] = useState<Values>({ ...tuned });
	const [reduced, setReduced] = useState(false);
	const [readMs, setReadMs] = useState(1200);
	const [actMs, setActMs] = useState(1200);
	const [outcome, setOutcome] = useState<Outcome>("resolve");
	const [copied, setCopied] = useState(false);
	// The root's own values come back when the story leaves.
	useEffect(() => {
		const root = document.documentElement;
		const was = MOTION_KNOBS.map(
			(knob) =>
				[knob.cssVar, root.style.getPropertyValue(knob.cssVar)] as const,
		);
		return () => {
			for (const [name, value] of was) {
				if (value) root.style.setProperty(name, value);
				else root.style.removeProperty(name);
			}
			for (const knob of MOTION_KNOBS) tune(knob.name, knob.default);
		};
	}, []);
	useEffect(() => {
		const root = document.documentElement;
		for (const knob of MOTION_KNOBS) {
			// Reduced motion zeroes the rungs and the tick, as the theme does.
			const still =
				reduced &&
				(knob.name === "tick" || DURATIONS.some((r) => r === knob.name));
			root.style.setProperty(
				knob.cssVar,
				still ? "0ms" : `${values[knob.name]}${knob.unit}`,
			);
			tune(knob.name, values[knob.name]);
		}
	}, [values, reduced]);
	const json = JSON.stringify(changedKnobs(values), null, 2);
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(json);
			setCopied(true);
		} catch {
			// The text under the button is selectable when the clipboard is not.
		}
	};
	return (
		<>
			<div style={{ display: "grid", gap: 16, padding: 16 }}>
				{GROUPS.map((group) => (
					<fieldset
						key={group.title}
						style={{ display: "grid", gap: 8, padding: 0, border: 0 }}
						aria-label={group.title}
					>
						<legend style={{ fontWeight: 600 }}>{group.title}</legend>
						{group.names.map((name) => {
							const knob = MOTION_KNOBS.find((each) => each.name === name);
							if (!knob) return null;
							return (
								<Slider
									key={name}
									label={knob.cssVar}
									value={values[name]}
									knob={knob}
									onChange={(value) => {
										setCopied(false);
										setValues({ ...values, [name]: value });
									}}
								/>
							);
						})}
					</fieldset>
				))}
				<div style={{ display: "flex", gap: 12, alignItems: "center" }}>
					<label style={{ display: "flex", gap: 8, alignItems: "center" }}>
						<input
							type="checkbox"
							checked={reduced}
							onChange={(event) => setReduced(event.target.checked)}
						/>
						Reduced motion
					</label>
					<button
						type="button"
						onClick={() => {
							setCopied(false);
							setValues({ ...DEFAULTS });
						}}
					>
						Reset
					</button>
					<button type="button" onClick={copy}>
						Copy values
					</button>
					{copied ? <span role="status">Copied</span> : null}
				</div>
				<textarea
					aria-label="Changed values"
					readOnly
					rows={Math.min(json.split("\n").length, 12)}
					value={json}
					style={{ fontFamily: "monospace" }}
				/>
				<fieldset
					style={{ display: "grid", gap: 8, padding: 0, border: 0 }}
					aria-label="Bench"
				>
					<legend style={{ fontWeight: 600 }}>Bench</legend>
					<Slider
						label="Read time"
						value={readMs}
						knob={{ min: 0, max: 5000, step: 100, unit: "ms" }}
						onChange={setReadMs}
					/>
					<Slider
						label="Act time"
						value={actMs}
						knob={{ min: 0, max: 5000, step: 100, unit: "ms" }}
						onChange={setActMs}
					/>
					<label style={{ display: "flex", gap: 12, alignItems: "center" }}>
						<span style={{ width: 240 }}>Act outcome</span>
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
				<section aria-label="Motion bench" style={{ display: "grid", gap: 8 }}>
					<h2 style={{ fontWeight: 600, margin: 0 }}>Motion bench</h2>
					{MOTION_SAMPLES.length === 0 ? (
						<p style={{ margin: 0 }}>
							Each motion unit adds a sample row here.
						</p>
					) : (
						MOTION_SAMPLES.map((row) => (
							<div
								key={row.name}
								style={{ display: "flex", gap: 12, alignItems: "center" }}
							>
								<span style={{ width: 240 }}>{row.name}</span>
								{row.sample()}
							</div>
						))
					)}
				</section>
			</div>
			<Bench readMs={readMs} actMs={actMs} outcome={outcome} />
		</>
	);
}

export const Tuning_: StoryObj = {
	name: "Tuning",
	render: () => <Tuning />,
	play: async ({ canvasElement }) => {
		const root = document.documentElement.style;
		const page = within(canvasElement);
		// Every knob has its slider, at its default on the root and in `tuned`.
		for (const knob of MOTION_KNOBS) {
			await expect(page.getByLabelText(knob.cssVar)).toBeTruthy();
			await expect(root.getPropertyValue(knob.cssVar)).toBe(
				`${knob.default}${knob.unit}`,
			);
			await expect(tuned[knob.name]).toBe(knob.default);
		}
		// A slider writes its variable and `tuned`, and shows in the copied JSON.
		fireEvent.change(page.getByLabelText("--transition-duration-fast"), {
			target: { value: "200" },
		});
		await expect(root.getPropertyValue("--transition-duration-fast")).toBe(
			"200ms",
		);
		await expect(tuned.fast).toBe(200);
		await expect(
			(page.getByLabelText("Changed values") as HTMLTextAreaElement).value,
		).toBe(JSON.stringify({ fast: 200 }, null, 2));
		// Reduced motion stills the rungs on the root, not the record.
		await userEvent.click(page.getByLabelText("Reduced motion"));
		await expect(root.getPropertyValue("--transition-duration-fast")).toBe(
			"0ms",
		);
		await expect(root.getPropertyValue("--wait-delay")).toBe(
			`${DEFAULTS.waitDelay}ms`,
		);
		await userEvent.click(page.getByLabelText("Reduced motion"));
		// Reset restores every knob.
		await userEvent.click(page.getByRole("button", { name: "Reset" }));
		await expect(root.getPropertyValue("--transition-duration-fast")).toBe(
			`${DEFAULTS.fast}ms`,
		);
		await expect(tuned.fast).toBe(DEFAULTS.fast);
		await expect(
			(page.getByLabelText("Changed values") as HTMLTextAreaElement).value,
		).toBe("{}");
	},
};
