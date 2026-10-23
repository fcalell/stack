import { Form } from "@fcalell/plugin-react-ui/components/form";
import { ORPCError } from "@orpc/client";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, screen, waitFor } from "storybook/test";
import { type FormInput, over } from "./support.ts";

const sent = fn();
const cancelled = fn();
const saved = over(async (input) => {
	sent(input);
	return { id: "request-1" };
});

const FIELDS = {
	title: { label: "What should change?" },
	why: { label: "Why?", control: "prose" },
	kind: {
		label: "Kind of request",
		options: [
			{ value: "change", label: "A change" },
			{ value: "measurement", label: "A measurement" },
			{ value: "question", label: "A question" },
		],
	},
	priority: { label: "Priority" },
	seats: { label: "Seats" },
	budget: { label: "Budget" },
	due: { label: "By when?" },
	urgent: { label: "Urgent" },
	notify: { label: "Tell the requester" },
	channels: { label: "Channels" },
	owner: {
		label: "Owner",
		options: [
			{ value: "ana", label: "Ana Ruiz" },
			{ value: "ben", label: "Ben Kaya" },
		],
	},
} as const;

// The keys the screen supplies beside the workspace: a form of fewer fields
// gives the required ones it does not draw.
const GIVEN = {
	workspaceId: "acme",
	kind: "change",
	seats: 3,
	urgent: false,
} as const;
const TITLE = "Add the checkout event";

// A form is its procedure and its field labels: the control, whether it is
// required, its values and its issue line all come from the procedure's
// input schema.
export default {
	title: "Behaviour/Form",
	parameters: { layout: "fullscreen" },
	render: () => (
		<div className="w-sheet max-w-full">
			<Form
				act={saved}
				given={{ workspaceId: "acme" }}
				fields={FIELDS}
				submit={{ label: "Send request" }}
			/>
		</div>
	),
} satisfies Meta;

// Every field draws the control its schema entry derives: a string a line of
// text, prose by its hint, an enum a pick, a number a numeric line, a date
// a date line, a boolean a switch, a list of an enum a pick of several.
export const EveryControl: StoryObj = {
	play: async ({ canvas }) => {
		await canvas.findByRole("textbox", { name: "What should change?" });
		await expect(canvas.getByRole("textbox", { name: "Why?" })).toBeVisible();
		await expect(canvas.getByLabelText("Seats")).toHaveAttribute(
			"inputmode",
			"decimal",
		);
		await expect(canvas.getByLabelText("By when?")).toHaveAttribute(
			"type",
			"date",
		);
		await expect(canvas.getByRole("switch", { name: "Urgent" })).toBeVisible();
		for (const name of ["Kind of request", "Priority", "Channels", "Owner"]) {
			await expect(canvas.getByText(name)).toBeVisible();
		}
	},
};

// A required field left empty blocks the submit, and the optional ones do not;
// the input sent holds what the schema takes: the number as a number, the date
// as a `Date`, the given key beside the fields, and nothing for a field left
// empty.
export const RequiredBlocksOptionalDoesNot: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		sent.mockClear();
		const send = await canvas.findByRole("button", { name: "Send request" });
		await userEvent.click(send);
		await expect(sent).not.toHaveBeenCalled();
		await userEvent.type(
			canvas.getByRole("textbox", { name: "What should change?" }),
			TITLE,
		);
		await userEvent.type(canvas.getByLabelText("Seats"), "3");
		await userEvent.type(
			canvas.getByRole("textbox", { name: "By when?" }),
			"2026-11-02",
		);
		await userEvent.click(
			canvas.getByRole("combobox", { name: "Kind of request" }),
		);
		await userEvent.click(
			await screen.findByRole("option", { name: "A change" }),
		);
		await userEvent.click(send);
		await waitFor(() => expect(sent).toHaveBeenCalledTimes(1));
		const input = sent.mock.calls[0]?.[0] as FormInput;
		await expect(input.workspaceId).toBe("acme");
		await expect(input.title).toBe(TITLE);
		await expect(input.kind).toBe("change");
		await expect(input.seats).toBe(3);
		await expect(input.due).toEqual(new Date("2026-11-02"));
		await expect("why" in input).toBe(false);
		await expect("budget" in input).toBe(false);
	},
};

const refused = over(() =>
	Promise.reject(
		new ORPCError("BAD_REQUEST", {
			message: "Input validation failed",
			data: {
				issues: [
					{ path: ["title"], message: "Say what should change" },
					{ path: ["seats"], message: "Too small: expected at least 1" },
				],
			},
		}),
	),
);

// The issues the server's schema refused stand under their fields, in the
// error ink, until the field is changed.
export const AnIssueStandsUnderItsField: StoryObj = {
	render: () => (
		<div className="w-sheet max-w-full">
			<Form
				act={refused}
				given={GIVEN}
				values={{ title: TITLE }}
				fields={{ title: FIELDS.title, seats: FIELDS.seats }}
			/>
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(await canvas.findByRole("button", { name: "Save" }));
		await canvas.findByText("Say what should change.");
		await expect(
			canvas.getByRole("textbox", { name: "What should change?" }),
		).toBeInvalid();
		await canvas.findByText("Too small: expected at least 1.");
		await userEvent.type(
			canvas.getByRole("textbox", { name: "What should change?" }),
			"!",
		);
		await waitFor(() =>
			expect(canvas.queryByText("Say what should change.")).toBeNull(),
		);
		await expect(
			canvas.getByText("Too small: expected at least 1."),
		).toBeVisible();
	},
};

let release: () => void = () => {};
const slow = over(
	() =>
		new Promise((resolve) => {
			release = () => resolve({ id: "request-1" });
		}),
);

// The submit act pends while the procedure runs and is ready again when it
// resolves.
export const PendingWhileItRuns: StoryObj = {
	render: () => (
		<div className="w-sheet max-w-full">
			<Form
				act={slow}
				given={GIVEN}
				values={{ title: TITLE }}
				fields={{ title: FIELDS.title }}
			/>
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		const save = await canvas.findByRole("button", { name: "Save" });
		await userEvent.click(save);
		await expect(save).toHaveAttribute("aria-busy", "true");
		release();
		await waitFor(() => expect(save).not.toHaveAttribute("aria-busy"));
	},
};

function Done() {
	const [id, setId] = useState<string>();
	return (
		<div className="w-sheet max-w-full">
			<Form
				act={saved}
				given={GIVEN}
				fields={{ title: FIELDS.title, seats: FIELDS.seats }}
				values={{ seats: 3 }}
				onDone={(output) => setId(output.id)}
			/>
			{id ? <p>Sent {id}</p> : null}
		</div>
	);
}

// Once the procedure resolves `onDone` hears the output and the fields go back
// to their first values.
export const DoneResetsTheFields: StoryObj = {
	render: () => <Done />,
	play: async ({ canvas, userEvent }) => {
		const title = await canvas.findByRole("textbox", {
			name: "What should change?",
		});
		await userEvent.type(title, TITLE);
		await userEvent.click(canvas.getByRole("button", { name: "Save" }));
		await canvas.findByText("Sent request-1");
		await expect(title).toHaveValue("");
		await expect(canvas.getByLabelText("Seats")).toHaveValue("3");
	},
};

// A caller who cannot submit sees the form disabled, the act blocked with the
// reason.
export const CanBlocked: StoryObj = {
	render: () => (
		<div className="w-sheet max-w-full">
			<Form
				act={saved}
				given={GIVEN}
				values={{ title: TITLE }}
				fields={{ title: FIELDS.title, urgent: FIELDS.urgent }}
				can={["send", "request"]}
			/>
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		sent.mockClear();
		await expect(
			await canvas.findByRole("textbox", { name: "What should change?" }),
		).toBeDisabled();
		await userEvent.click(canvas.getByRole("button", { name: "Save" }));
		await expect(sent).not.toHaveBeenCalled();
		await canvas.findByText("You can't do this.");
	},
};

// Groups partition the keys under bands, each titled.
export const Groups: StoryObj = {
	render: () => (
		<div className="w-sheet max-w-full">
			<Form
				act={saved}
				given={GIVEN}
				groups={[
					{
						title: "The request",
						description: "What it asks for.",
						fields: { title: FIELDS.title, kind: FIELDS.kind },
					},
					{
						title: "Notifications",
						fields: { urgent: FIELDS.urgent, channels: FIELDS.channels },
					},
				]}
			/>
		</div>
	),
	play: async ({ canvas }) => {
		await canvas.findByRole("group", { name: "The request" });
		await expect(
			canvas.getByRole("group", { name: "Notifications" }),
		).toBeVisible();
	},
};

// A field the schema makes optional says so after its label; a required one
// says nothing.
export const OptionalFieldsSayOptional: StoryObj = {
	play: async ({ canvas }) => {
		const label = async (name: string) =>
			(await canvas.findByText(name)).closest("label");
		await expect(await label("Why?")).toHaveTextContent("Optional");
		await expect(await label("What should change?")).not.toHaveTextContent(
			"Optional",
		);
	},
};

function Heard() {
	const [heard, setHeard] = useState<string>();
	return (
		<div className="w-sheet max-w-full">
			<Form
				act={saved}
				given={GIVEN}
				fields={{ title: FIELDS.title }}
				values={{ title: TITLE }}
				onDone={(output, input) => setHeard(`${output.id} ${input.title}`)}
			/>
			{heard ? <p>Heard {heard}</p> : null}
		</div>
	);
}

// `onDone` hears the input the form sent beside the output, typed as the
// procedure's own.
export const OnDoneHearsTheInput: StoryObj = {
	render: () => <Heard />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(await canvas.findByRole("button", { name: "Save" }));
		await canvas.findByText(`Heard request-1 ${TITLE}`);
	},
};

// An optional enum's empty choice sends the key absent, never an error under
// the field.
export const AnOptionalPickLeftEmptyIsNotSent: StoryObj = {
	render: () => (
		<div className="w-sheet max-w-full">
			<Form
				act={saved}
				given={GIVEN}
				values={{ title: TITLE }}
				fields={{ title: FIELDS.title, priority: FIELDS.priority }}
			/>
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		sent.mockClear();
		await userEvent.click(
			await canvas.findByRole("combobox", { name: /Priority/ }),
		);
		await userEvent.click(await screen.findByRole("option", { name: "high" }));
		await userEvent.click(canvas.getByRole("combobox", { name: /Priority/ }));
		await userEvent.click(await screen.findByRole("option", { name: "None" }));
		await userEvent.click(canvas.getByRole("button", { name: "Save" }));
		await waitFor(() => expect(sent).toHaveBeenCalledTimes(1));
		const input = sent.mock.calls[0]?.[0] as FormInput;
		await expect("priority" in input).toBe(false);
		await expect(canvas.queryByRole("alert")).toBeNull();
	},
};

// Other acts stand in the bar before the filled submit: a Cancel runs its own
// act, and the submit still sends.
export const ActsStandBeforeTheSubmit: StoryObj = {
	render: () => (
		<div className="w-sheet max-w-full">
			<Form
				act={saved}
				given={GIVEN}
				values={{ title: TITLE }}
				fields={{ title: FIELDS.title }}
				acts={[{ label: "Cancel", onAct: cancelled }]}
			/>
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		cancelled.mockClear();
		sent.mockClear();
		const bar = await canvas.findAllByRole("button");
		await expect(bar.map((one) => one.textContent)).toEqual(["Cancel", "Save"]);
		await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));
		await expect(cancelled).toHaveBeenCalledTimes(1);
		await expect(sent).not.toHaveBeenCalled();
		await userEvent.click(canvas.getByRole("button", { name: "Save" }));
		await waitFor(() => expect(sent).toHaveBeenCalledTimes(1));
	},
};
