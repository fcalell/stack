import { read } from "@fcalell/plugin-api/tanstack-query";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import { Switch } from "@fcalell/plugin-react-ui/components/switch";
import type { PlaceSpec } from "@fcalell/ui-core/descriptors";
import { ORPCError } from "@orpc/client";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { expect, screen, waitFor } from "storybook/test";

// A control whose handler returns the save's promise holds the viewer's value
// while the latest save pends, and until the refetch the save's invalidation
// started has landed. A rejection puts the datum back and says why: in the
// field's error line when the control stands in a field, else in a toast
// whose Retry saves the same value again. The stories run a real client: the
// save invalidates its read on success, as a mutation's invalidation does.
const PLACES: PlaceSpec[] = [
	{ route: "/overview", label: "Overview", icon: "House" },
];

function Page(props: { children: ReactNode }) {
	return (
		<Shell places={PLACES}>
			<Place>
				<Pane title="Settings">{props.children}</Pane>
			</Place>
		</Shell>
	);
}

// A failed toast is hidden from the tree until it is focused, its acts
// included, so axe's `aria-hidden-focus` flags them.
const TOASTING = {
	a11y: {
		config: { rules: [{ id: "aria-hidden-focus", enabled: false }] },
	},
};

const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

interface Options<T> {
	initial: T;
	saveMs: number;
	readMs: number;
	// The refusal the nth save (from 0) ends in, if any.
	refuse?: (n: number) => Error | undefined;
}

// One setting on a server of its own: its read, its save and what each did.
let made = 0;
function server<T>(options: Options<T>) {
	const state = {
		value: options.initial,
		saves: [] as T[],
		settled: 0,
	};
	const setting = read({
		queryKey: ["control-save", made++],
		queryFn: async () => {
			await wait(options.readMs);
			const value = state.value;
			state.settled += 1;
			return { value };
		},
		staleTime: Number.POSITIVE_INFINITY,
	});
	const save = async (value: T) => {
		const n = state.saves.length;
		state.saves.push(value);
		await wait(options.saveMs);
		const refusal = options.refuse?.(n);
		if (refusal) throw refusal;
		state.value = value;
	};
	return { state, setting, save };
}
type Server<T> = ReturnType<typeof server<T>>;

// The save, as an app writes it: the promise handed back, the invalidation
// started on success and not awaited.
function useSave<T>(srv: Server<T>) {
	const client = useQueryClient();
	const mutation = useMutation({
		mutationFn: srv.save,
		onSuccess: () => {
			void client.invalidateQueries({
				queryKey: srv.setting.options.queryKey,
			});
		},
	});
	return (value: T) => mutation.mutateAsync(value);
}

function Setting(props: { srv: Server<boolean>; field?: boolean }) {
	const { srv } = props;
	const [on] = useState(() => srv.setting.at((s) => s.value));
	const save = useSave(srv);
	return props.field ? (
		<FormField label="Notify" switch={{ checked: on, onChange: save }} />
	) : (
		<Switch label="Notify" checked={on} onChange={save} />
	);
}

// The other descriptors a field hosts, each over a read and a save that refuses.
function Descriptors(props: {
	srv: Server<string>;
	kind: "segments" | "select" | "options";
}) {
	const { srv, kind } = props;
	const [value] = useState(() => srv.setting.at((s) => s.value));
	const save = useSave(srv);
	const choices = [
		{ value: "day", label: "Day" },
		{ value: "week", label: "Week" },
	];
	if (kind === "segments")
		return (
			<FormField
				label="Period"
				segments={{ options: choices, value, onChange: save }}
			/>
		);
	if (kind === "select")
		return (
			<FormField
				label="Period"
				select={{ options: choices, value, onChange: save }}
			/>
		);
	return (
		<FormField
			label="Period"
			options={{ options: choices, value, onChange: save }}
		/>
	);
}

function Boxed(props: { srv: Server<boolean> }) {
	const { srv } = props;
	const [on] = useState(() => srv.setting.at((s) => s.value));
	const save = useSave(srv);
	return (
		<FormField label="Notify" checkbox={{ checked: on, onChange: save }} />
	);
}

function Level(props: { srv: Server<number> }) {
	const { srv } = props;
	const [level] = useState(() => srv.setting.at((s) => s.value));
	const save = useSave(srv);
	return (
		<FormField
			label="Level"
			slider={{
				value: level,
				onChange: () => {},
				onCommit: save,
				min: 0,
				max: 10,
			}}
		/>
	);
}

function Name(props: { srv: Server<string> }) {
	const { srv } = props;
	const [name] = useState(() => srv.setting.at((s) => s.value));
	const save = useSave(srv);
	return (
		<FormField label="Name">
			<Input value={name} onChange={() => {}} onCommit={save} />
		</FormField>
	);
}

export default {
	title: "Behaviour/ControlSave",
	parameters: { layout: "fullscreen" },
} satisfies Meta;

// The switch is inert until its read lands: painted.
async function ready(canvas: { getByRole: typeof screen.getByRole }) {
	const flip = () => canvas.getByRole("switch", { name: "Notify" });
	await waitFor(() => expect(flip().hasAttribute("inert")).toBe(false));
	return flip();
}

const wrongNow = () => new ORPCError("BAD_REQUEST", { message: "not now" });

const rapid = server({ initial: false, saveMs: 60, readMs: 40 });

// Three flips in a row: the viewer's last value stands the whole time, the
// server hears all three in order, and the control never shows an earlier one.
export const RapidTogglesKeepTheLast: StoryObj = {
	render: () => (
		<Page>
			<Setting srv={rapid} />
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		const flip = await ready(canvas);
		const seen: string[] = [];
		const watch = new MutationObserver(() =>
			seen.push(String(flip.getAttribute("aria-checked"))),
		);
		watch.observe(flip, {
			attributes: true,
			attributeFilter: ["aria-checked"],
		});
		await userEvent.click(flip);
		await userEvent.click(flip);
		await userEvent.click(flip);
		await expect(flip).toHaveAttribute("aria-checked", "true");
		await waitFor(() => expect(rapid.state.value).toBe(true));
		await waitFor(() => expect(rapid.state.settled).toBeGreaterThan(1));
		await wait(150);
		watch.disconnect();
		await expect(rapid.state.saves).toEqual([true, false, true]);
		await expect(flip).toHaveAttribute("aria-checked", "true");
		// on, off, on: the held value after the third press, never an older one.
		await expect(seen).toEqual(["true", "false", "true"]);
	},
};

const settling = server({ initial: false, saveMs: 20, readMs: 300 });

// The save lands, its read refetches slowly: the control keeps the viewer's
// value through the refetch instead of falling back to the old datum.
export const NoFlickerBackWhileTheRefetchLands: StoryObj = {
	render: () => (
		<Page>
			<Setting srv={settling} />
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		const flip = await ready(canvas);
		const before = settling.state.settled;
		const seen: string[] = [];
		const watch = new MutationObserver(() =>
			seen.push(String(flip.getAttribute("aria-checked"))),
		);
		await userEvent.click(flip);
		watch.observe(flip, {
			attributes: true,
			attributeFilter: ["aria-checked"],
		});
		await expect(flip).toHaveAttribute("aria-checked", "true");
		await waitFor(() => expect(settling.state.settled).toBe(before + 1), {
			timeout: 2000,
		});
		await wait(100);
		watch.disconnect();
		await expect(seen).not.toContain("false");
		await expect(flip).toHaveAttribute("aria-checked", "true");
	},
};

const fielded = server({
	initial: false,
	saveMs: 40,
	readMs: 20,
	refuse: () => wrongNow(),
});

// In a field a refusal puts the datum back and says why in the field's error
// line, which the next change clears.
export const ARefusalInAFieldRollsBackWithItsReasonInTheField: StoryObj = {
	render: () => (
		<Page>
			<Setting srv={fielded} field />
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		const flip = await ready(canvas);
		await userEvent.click(flip);
		await expect(flip).toHaveAttribute("aria-checked", "true");
		await expect(await canvas.findByText("Not now.")).toBeVisible();
		await expect(flip).toHaveAttribute("aria-checked", "false");
		await userEvent.click(flip);
		await waitFor(() => expect(canvas.queryByText("Not now.")).toBeNull());
		await expect(await canvas.findByText("Not now.")).toBeVisible();
		await expect(flip).toHaveAttribute("aria-checked", "false");
	},
};

const toasted = server({
	initial: false,
	saveMs: 40,
	readMs: 20,
	refuse: (n) => (n === 0 ? wrongNow() : undefined),
});

// Outside a field the reason toasts, and Retry saves the same value again.
export const ARefusalOutsideAFieldToastsWithRetry: StoryObj = {
	parameters: TOASTING,
	render: () => (
		<Page>
			<Setting srv={toasted} />
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		const flip = await ready(canvas);
		await userEvent.click(flip);
		await expect(flip).toHaveAttribute("aria-checked", "true");
		await screen.findAllByText("Not now.");
		await waitFor(() => expect(flip).toHaveAttribute("aria-checked", "false"));
		await userEvent.click(
			await screen.findByRole("button", { name: "Retry", hidden: true }),
		);
		await waitFor(() => expect(toasted.state.saves).toEqual([true, true]));
		await waitFor(() => expect(toasted.state.value).toBe(true));
		await waitFor(() => expect(flip).toHaveAttribute("aria-checked", "true"));
	},
};

const renamed = server({
	initial: "Ana",
	saveMs: 40,
	readMs: 20,
	refuse: () => new ORPCError("CONFLICT", { message: "that name is taken" }),
});

// A typing control saves at its commit: the value held while it pends, and a
// refusal puts the datum back with its reason in a toast. The field hosts only
// its own descriptors' saves, so an Input given as children toasts as a bare
// one does.
export const ACommitThatIsRefusedPutsTheValueBack: StoryObj = {
	parameters: TOASTING,
	render: () => (
		<Page>
			<Name srv={renamed} />
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		const input = await canvas.findByRole("textbox", { name: "Name" });
		await waitFor(() => expect(input).toHaveValue("Ana"));
		await userEvent.clear(input);
		await userEvent.type(input, "Bea");
		await userEvent.tab();
		await expect(input).toHaveValue("Bea");
		await screen.findAllByText("That name is taken.");
		await expect(input).toHaveValue("Ana");
		await expect(renamed.state.saves).toEqual(["Bea"]);
	},
};

// Every descriptor a field hosts draws a refusal in the field's line, and the
// value goes back to the datum: the field holds the save, not the control.
const refusing = <T,>(initial: T) =>
	server({
		initial,
		saveMs: 40,
		readMs: 20,
		refuse: () => wrongNow(),
	});

const boxed = refusing(false);

export const ACheckboxInAFieldRefusesIntoTheFieldsLine: StoryObj = {
	render: () => (
		<Page>
			<Boxed srv={boxed} />
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		const box = canvas.getByRole("checkbox", { name: "Notify" });
		await waitFor(() => expect(box.hasAttribute("inert")).toBe(false));
		await userEvent.click(box);
		await expect(await canvas.findByText("Not now.")).toBeVisible();
		await waitFor(() => expect(box).toHaveAttribute("aria-checked", "false"));
	},
};

const sliding = refusing(3);

export const ASliderInAFieldRefusesIntoTheFieldsLine: StoryObj = {
	render: () => (
		<Page>
			<Level srv={sliding} />
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		const thumb = await canvas.findByRole("slider", { name: "Level" });
		await waitFor(() => expect(thumb).toHaveAttribute("aria-valuenow", "3"));
		thumb.focus();
		await userEvent.keyboard("{ArrowRight}");
		await expect(await canvas.findByText("Not now.")).toBeVisible();
		await waitFor(() => expect(sliding.state.saves).toEqual([4]));
		await waitFor(() => expect(thumb).toHaveAttribute("aria-valuenow", "3"));
	},
};

const segmented = refusing("day");

export const SegmentsInAFieldRefuseIntoTheFieldsLine: StoryObj = {
	render: () => (
		<Page>
			<Descriptors srv={segmented} kind="segments" />
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		const day = await canvas.findByRole("radio", { name: "Day" });
		await waitFor(() => expect(day).toHaveAttribute("aria-checked", "true"));
		await userEvent.click(canvas.getByRole("radio", { name: "Week" }));
		await expect(await canvas.findByText("Not now.")).toBeVisible();
		await waitFor(() => expect(day).toHaveAttribute("aria-checked", "true"));
	},
};

const choosing = refusing("day");

export const OptionsInAFieldRefuseIntoTheFieldsLine: StoryObj = {
	render: () => (
		<Page>
			<Descriptors srv={choosing} kind="options" />
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		const day = await canvas.findByRole("radio", { name: "Day" });
		await waitFor(() => expect(day).toHaveAttribute("aria-checked", "true"));
		await userEvent.click(canvas.getByRole("radio", { name: "Week" }));
		await expect(await canvas.findByText("Not now.")).toBeVisible();
		await waitFor(() => expect(day).toHaveAttribute("aria-checked", "true"));
	},
};

const picking = refusing("day");

export const ASelectInAFieldRefusesIntoTheFieldsLine: StoryObj = {
	render: () => (
		<Page>
			<Descriptors srv={picking} kind="select" />
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		const trigger = await canvas.findByRole("combobox", { name: "Period" });
		await waitFor(() => expect(trigger).toHaveTextContent("Day"));
		await userEvent.click(trigger);
		await userEvent.click(await screen.findByRole("option", { name: "Week" }));
		await expect(await canvas.findByText("Not now.")).toBeVisible();
		await waitFor(() => expect(trigger).toHaveTextContent("Day"));
	},
};
