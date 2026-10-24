import { read } from "@fcalell/plugin-api/tanstack-query";
import { BarChart } from "@fcalell/plugin-native-ui/components/bar-chart";
import { Button } from "@fcalell/plugin-native-ui/components/button";
import { Code } from "@fcalell/plugin-native-ui/components/code";
import { Gate } from "@fcalell/plugin-native-ui/components/gate";
import { Pane } from "@fcalell/plugin-native-ui/components/pane";
import { Picker } from "@fcalell/plugin-native-ui/components/picker";
import { Section } from "@fcalell/plugin-native-ui/components/section";
import { Sheet } from "@fcalell/plugin-native-ui/components/sheet";
import { Slider } from "@fcalell/plugin-native-ui/components/slider";
import { Stats } from "@fcalell/plugin-native-ui/components/stats";
import { Switch } from "@fcalell/plugin-native-ui/components/switch";
import { Text } from "@fcalell/plugin-native-ui/components/text";
import { Toolbar } from "@fcalell/plugin-native-ui/components/toolbar";
import { toast } from "@fcalell/plugin-native-ui/lib/toast";
import {
	loading,
	setLoading,
	subscribeMotion,
	tune,
	tuned,
} from "@fcalell/ui-core/paint";
import {
	LOADING_PAINTS,
	LOADING_SLOTS,
	type LoadingPaint,
	type LoadingSlot,
	MOTION_KNOBS,
	type MotionKnob,
} from "@fcalell/ui-core/tokens";
import { useMemo, useState, useSyncExternalStore } from "react";

// The dev tuning page for the phone's motion: one slider per knob of the
// contract, written to the live `tuned` record, so the next animation played
// takes it. The changed knobs are a text dump to copy for the write-back: save
// it and run `pnpm --filter @fcalell/ui-core motion:apply values.json`.
const GROUPS: { title: string; names: MotionKnob["name"][] }[] = [
	{ title: "Rungs", names: ["instant", "fast", "base", "slow"] },
	{ title: "Loop and pulse", names: ["loop", "pulse"] },
	{ title: "Tick", names: ["tick"] },
	{ title: "Scales", names: ["press", "lift"] },
	{ title: "Follow", names: ["fling", "reach"] },
	{ title: "Waits", names: ["waitDelay", "actDelay", "waitMin"] },
];

// The changed knobs, `{ "<knob name>": number }`, as the write-back reads
// them.
function changedKnobs(): string {
	const changed = MOTION_KNOBS.filter(
		(knob) => tuned[knob.name] !== knob.default,
	);
	return JSON.stringify(
		Object.fromEntries(changed.map((knob) => [knob.name, tuned[knob.name]])),
		null,
		2,
	);
}

// A snapshot that moves when any knob does.
function useDump(): string {
	return useSyncExternalStore(subscribeMotion, changedKnobs);
}

// The value move: a meter, a bar chart, a pending bar and a step count driven
// by one number the button moves, and a figure and a status mark that follow it.
const BARS = [3, 5, 2, 6, 4];
const STATES = ["done", "failed", "running", "waiting"] as const;
function Values() {
	const [share, setShare] = useState(30);
	return (
		<>
			<Button
				act="secondary"
				label="Change value"
				onAct={() => setShare((now) => (now + 35) % 105)}
			/>
			<Stats items={[{ label: "Quota", value: share, bound: 100 }]} />
			<BarChart
				label="Requests"
				items={BARS.map((bar, at) => ({ at, bar: (bar * share) / 30 }))}
				bar={{ key: (one) => String(one.at), value: (one) => one.bar }}
			/>
			<Gate
				title="Setup"
				step={{ at: (Math.floor(share / 35) % 3) + 1, of: 3 }}
			/>
			<Stats items={[{ label: "Figure", value: share }]} />
			<Section
				items={[
					{
						key: "deploy",
						title: "Deploy",
						status: { tone: STATES[Math.floor(share / 35) % 4] ?? "done" },
					},
				]}
			/>
		</>
	);
}

// A press that settles after a moment, so a sample shows its pending look.
const settle = () => new Promise<void>((done) => setTimeout(done, 800));

// The motion units' samples: each control holds its own value, so it can be
// pressed and watched against the sliders above.
function Bench() {
	const [on, setOn] = useState(false);
	const [checked, setChecked] = useState(false);
	const [view, setView] = useState<"a" | "b">("a");
	const [one, setOne] = useState<"a" | "b" | null>("a");
	return (
		<>
			<Button act="secondary" label="Secondary" onAct={settle} />
			<Button glyph icon="RefreshCw" label="Refresh" onAct={settle} />
			<Toolbar
				chips={[{ family: "neutral", label: "Removable", onRemove: () => {} }]}
			/>
			<Switch checked={on} onChange={setOn} label="Switch" />
			<Switch checked={checked} onChange={setChecked} label="Checkbox" />
			<Picker
				fit="segments"
				label="View"
				options={[
					{ value: "a", label: "List" },
					{ value: "b", label: "Board" },
				]}
				value={view}
				onChange={setView}
			/>
			<Picker
				fit="list"
				label="Options"
				options={[
					{ value: "a", label: "First" },
					{ value: "b", label: "Second" },
				]}
				value={one}
				onChange={setOne}
			/>
		</>
	);
}

// A line (a blocked act's reason, on a press) and a block (a row the viewer
// adds or removes, landing at once; one that arrives on its own fades in).
function LinesAndBlocks() {
	const [rows, setRows] = useState(["Ana Ruiz", "Ben Kaya"]);
	return (
		<>
			<Button label="Publish" blocked="Add a title first" onAct={settle} />
			<Section
				items={rows.map((name) => ({
					key: name,
					title: name,
					act: {
						icon: "Trash2",
						label: "Remove",
						onAct: () => setRows((now) => now.filter((one) => one !== name)),
					},
				}))}
			/>
			<Button
				act="secondary"
				label="Add a row"
				onAct={() => setRows((now) => [...now, `Person ${now.length + 1}`])}
			/>
		</>
	);
}

// The loader per kind of glyph slot (`theme.loading`): each kind pulses or
// scrambles, a shape always pulses. A kind changed mounts the sample again;
// Land answers the read, so a scrambled figure or id decodes as it arrives.
function Loader() {
	const [paint, setPaint] = useState<Record<LoadingSlot, LoadingPaint>>({
		...loading,
	});
	const [run, setRun] = useState(0);
	const gate = useMemo(() => {
		let land: () => void = () => {};
		const held = new Promise<readonly string[]>((resolve) => {
			land = () => resolve([]);
		});
		return {
			land,
			rows: read({
				queryKey: ["motion-bench", "loader", run],
				queryFn: () => held,
			}),
		};
	}, [run]);
	return (
		<>
			{LOADING_SLOTS.map((slot) => (
				<Picker
					fit="segments"
					key={slot}
					label={slot}
					options={LOADING_PAINTS.map((one) => ({ value: one, label: one }))}
					value={paint[slot]}
					onChange={(value) => {
						setLoading({ [slot]: value as LoadingPaint });
						setPaint({ ...loading });
						setRun(run + 1);
					}}
				/>
			))}
			<Button
				act="secondary"
				label="Replay"
				onAct={() => setRun((now) => now + 1)}
			/>
			<Button act="secondary" label="Land" onAct={gate.land} />
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
				key={run}
				items={[
					{ key: "run", title: "Running", leading: { status: "running" } },
				]}
			/>
		</>
	);
}

// A toast to swipe toward the inline end (1:1, then it leaves past the reach or
// flung, else settles back on `base`) and a bottom sheet to pull down by its head.
function Follow() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button
				act="secondary"
				label="Raise a toast to swipe"
				onAct={() => toast("Swipe me toward the end")}
			/>
			<Button
				act="secondary"
				label="Open a sheet to pull"
				onAct={() => setOpen(true)}
			/>
			<Sheet
				open={open}
				onClose={() => setOpen(false)}
				title="Pull me down"
				submit={{ label: "Done", onAct: () => setOpen(false) }}
			>
				<Text>Pull the head down: it follows the finger.</Text>
			</Sheet>
		</>
	);
}

export default function Motion() {
	const dump = useDump();
	return (
		<Pane title="Motion tuning">
			{GROUPS.map((group) => (
				<Section key={group.title} title={group.title}>
					{group.names.map((name) => {
						const knob = MOTION_KNOBS.find((each) => each.name === name);
						if (!knob) return null;
						return (
							<Slider
								key={name}
								label={name}
								value={tuned[name]}
								min={knob.min}
								max={knob.max}
								step={knob.step}
								unit={knob.unit === "ms" ? "millisecond" : undefined}
								onChange={(value) => tune(name, value)}
							/>
						);
					})}
				</Section>
			))}
			<Section title="Motion bench">
				<Bench />
				<LinesAndBlocks />
				<Values />
				<Follow />
			</Section>
			<Section title="Loader">
				<Loader />
			</Section>
			<Section title="Changed values">
				<Code text={dump} title="Changed values" copy />
			</Section>
			<Button
				label="Reset"
				onAct={() => {
					for (const knob of MOTION_KNOBS) tune(knob.name, knob.default);
				}}
			/>
		</Pane>
	);
}
