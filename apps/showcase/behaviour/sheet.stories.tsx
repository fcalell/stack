import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Picker } from "@fcalell/plugin-react-ui/components/picker";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import { Thread } from "@fcalell/plugin-react-ui/components/thread";
import { confirm } from "@fcalell/plugin-react-ui/lib/confirm";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, screen, waitFor, within } from "storybook/test";
import { orpc } from "../src/app/lib/api.ts";
import { focused, over, through, walked } from "./support.ts";

const pressed = fn();

// A sheet's form over one required line of text.
const renamed = through(orpc.forms.rename, async () => ({ id: "workspace-1" }));
const rename = (close: () => void, label = "Name", control?: "prose") => ({
	act: renamed,
	given: { workspaceId: "acme" },
	fields: { name: { label, control } },
	onDone: close,
});

function Page() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button type="button" onClick={() => setOpen(true)}>
				Rename domain
			</button>
			<Sheet
				open={open}
				onClose={() => setOpen(false)}
				title="Rename domain"
				form={rename(() => setOpen(false))}
			/>
		</>
	);
}

export default {
	title: "Behaviour/Sheet",
	render: () => <Page />,
} satisfies Meta;

// A modal sheet: focus moves into it on open, Escape closes it, and focus returns
// to its trigger.
export const Modal: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const trigger = canvas.getByRole("button", { name: "Rename domain" });
		await userEvent.click(trigger);
		const dialog = await screen.findByRole("dialog", { name: "Rename domain" });
		// Focus lands on the task's first field, not the head's close act.
		const field = within(dialog).getByRole("textbox", { name: "Name" });
		await waitFor(() => expect(field).toHaveFocus());
		// The open sheet keeps the rules.
		await expect(await walked()).toEqual([]);
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await waitFor(() => expect(trigger).toHaveFocus());
		// Closed, with focus returned to the act that opened it.
		await expect(await walked()).toEqual([]);
	},
};

// The same at touch density.
export const ModalTouch: StoryObj = {
	...Modal,
	tags: ["touch"],
	globals: { density: "touch" },
};

function Choices() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button type="button" onClick={() => setOpen(true)}>
				Open choices
			</button>
			<Sheet open={open} onClose={() => setOpen(false)} title="Choices">
				<p>Pick how to continue.</p>
				<Button act="secondary" label="Keep both" onAct={pressed} />
				<Button act="secondary" label="Replace" onAct={pressed} />
			</Sheet>
		</>
	);
}

// A sheet whose body holds no field opens on its body's first control, not on
// the head's close act.
export const OpensOnTheFirstControl: StoryObj = {
	render: () => <Choices />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Open choices" }));
		const dialog = await screen.findByRole("dialog", { name: "Choices" });
		await waitFor(() =>
			expect(
				within(dialog).getByRole("button", { name: "Keep both" }),
			).toHaveFocus(),
		);
	},
};

// A body with no control at all leaves focus on the head's close act, the one
// way out.
export const OpensOnCloseWithNoControl: StoryObj = {
	render: () => <RouteOpensSheet />,
	parameters: { layout: "fullscreen" },
	play: async () => {
		const dialog = await screen.findByRole("dialog", { name: "Question" });
		await waitFor(() =>
			expect(
				within(dialog).getByRole("button", { name: "Close" }),
			).toHaveFocus(),
		);
	},
};

// A decision (`confirm()`, drawn as a sheet by the Gate or Shell hosting it)
// takes focus on its way out (Cancel) when it asks, Escape dismisses it, and
// focus returns to the act that asked.
export const Decision: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => (
		<Gate title="Workspace">
			<Button
				act="secondary"
				label="Disconnect"
				onAct={() =>
					confirm({
						title: "Disconnect Acme?",
						sentence: "Its deploys stop until you connect it again.",
						act: {
							label: "Disconnect",
							destructive: true,
							onAct: () => Promise.resolve(),
						},
					})
				}
			/>
		</Gate>
	),
	play: async ({ canvas, userEvent }) => {
		const trigger = canvas.getByRole("button", { name: "Disconnect" });
		await userEvent.click(trigger);
		const dialog = await screen.findByRole("alertdialog", {
			name: "Disconnect Acme?",
		});
		await waitFor(() =>
			expect(dialog).toContainElement(document.activeElement as HTMLElement),
		);
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus(),
		);
		// Inside a root frame the sheet is modal: the page behind it is hidden
		// from assistive tech, and Tab cycles within the sheet.
		await expect(dialog).toHaveAttribute("aria-modal", "true");
		await waitFor(() =>
			expect(trigger.closest("[aria-hidden='true'], [inert]")).not.toBeNull(),
		);
		// Tab wraps through Base UI's focus guards: the press that leaves the last
		// control lands on a guard, which hands focus back into the sheet on the
		// next animation frame. So each press is judged where focus comes to rest:
		// in the sheet and on a control, never on a guard and never on the page
		// behind, and the loop visits more than one control.
		const visited = new Set<Element>();
		for (let press = 0; press < 4; press++) {
			await userEvent.tab();
			await waitFor(() => {
				const active = document.activeElement as HTMLElement;
				expect(active).not.toHaveAttribute("data-base-ui-focus-guard");
				expect(dialog).toContainElement(active);
			});
			visited.add(document.activeElement as Element);
		}
		await expect(visited.size).toBeGreaterThan(1);
		await expect(await walked()).toEqual([]);
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
		await waitFor(() => expect(trigger).toHaveFocus());
		await expect(await walked()).toEqual([]);
	},
};

// The same decision at touch density is an alertdialog too, and opens on Cancel
// though the stack draws the filled act first.
export const DecisionTouch: StoryObj = {
	...Decision,
	tags: ["touch"],
	globals: { density: "touch" },
};

// A sheet in a Gate or a Shell is modal: the page behind it is hidden from
// assistive tech and a press on the scrim closes it. An edit in its form is
// asked about first, so Escape or a press outside neither closes it at once nor
// loses what was typed; a sheet with no edit closes at once.
function Hosted() {
	const [open, setOpen] = useState(false);
	return (
		<Gate title="Workspace">
			<Button
				act="secondary"
				label="Rename domain"
				onAct={() => setOpen(true)}
			/>
			<Sheet
				open={open}
				onClose={() => setOpen(false)}
				title="Rename domain"
				form={rename(() => setOpen(false))}
			/>
		</Gate>
	);
}

export const PressOutsideCloses: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => <Hosted />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(
			canvas.getByRole("button", { name: "Rename domain" }),
		);
		const dialog = await screen.findByRole("dialog", { name: "Rename domain" });
		await waitFor(() =>
			expect(dialog).toContainElement(document.activeElement as HTMLElement),
		);
		// The page behind it is out of the accessibility tree.
		await expect(screen.queryByRole("button", { name: "Rename domain" })).toBe(
			null,
		);
		// The layer around the card is the scrim.
		await userEvent.click(dialog.parentElement as HTMLElement);
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
	},
};

export const EditedSheetAsksBeforeClosing: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => <Hosted />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(
			canvas.getByRole("button", { name: "Rename domain" }),
		);
		await screen.findByRole("dialog", { name: "Rename domain" });
		await userEvent.type(screen.getByRole("textbox", { name: "Name" }), "Acme");
		await userEvent.keyboard("{Escape}");
		const question = await screen.findByRole("alertdialog", {
			name: "Discard your edit?",
		});
		// Keeping the edit returns to the sheet with what was typed.
		await userEvent.click(screen.getByRole("button", { name: "Keep editing" }));
		await waitFor(() => expect(question).not.toBeInTheDocument());
		await expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue(
			"Acme",
		);
		// Discarding closes it.
		await userEvent.keyboard("{Escape}");
		await screen.findByRole("alertdialog", { name: "Discard your edit?" });
		await userEvent.click(screen.getByRole("button", { name: "Discard" }));
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
	},
};

// The docked question a foot's input gives way to, then the input that returns.
function useDocked() {
	const [open, setOpen] = useState(true);
	const [text, setText] = useState("");
	return {
		text,
		setText,
		sheet: {
			open,
			onClose: () => setOpen(false),
			title: "Question 1 of 1",
			submit: { label: "Send", onAct: () => setOpen(false) },
			children: <p>Who hears about it?</p>,
		},
	};
}

function Docked() {
	const { text, setText, sheet } = useDocked();
	return (
		<Place>
			<Pane
				title="Assistant"
				foot={<Input value={text} onChange={setText} />}
				sheet={sheet}
			/>
		</Place>
	);
}

const TURNS = [{ id: "t1", body: "Why did the last deploy fail?" }];
const LONG_TURNS = Array.from({ length: 12 }, (_, at) => ({
	id: `t${at}`,
	body: `Why did deploy ${at + 1} of the api fail?`,
}));

function DockedThread() {
	const { text, setText, sheet } = useDocked();
	return (
		<Place>
			<Pane fill title="Assistant">
				<Thread
					items={TURNS}
					message={{
						key: (turn) => turn.id,
						author: () => "you",
						body: (turn) => turn.body,
					}}
					composer={{ value: text, onChange: setText, onSend: () => {} }}
					sheet={sheet}
				/>
			</Pane>
		</Place>
	);
}

const closesToInput: NonNullable<StoryObj["play"]> = async ({
	canvas,
	userEvent,
}) => {
	await canvas.findByRole("region", { name: "Question 1 of 1" });
	canvas.getByRole("button", { name: "Send" }).focus();
	await userEvent.keyboard("{Escape}");
	await waitFor(() =>
		expect(
			canvas.queryByRole("region", { name: "Question 1 of 1" }),
		).toBeNull(),
	);
	await waitFor(() => expect(canvas.getByRole("textbox")).toHaveFocus());
};

// A Pane's docked `sheet`: Escape closes it and hands focus to the foot's
// input that returns in its place.
export const DockedInFoot: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => <Docked />,
	play: closesToInput,
};

// The same as a Thread's `sheet`.
export const DockedInThreadFoot: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => <DockedThread />,
	play: closesToInput,
};

const QUESTION =
	"Should the rename go in the changelog, in the migration notes, or in both of them together?";

// A docked title is a sentence: it wraps to its whole text, ending in no
// ellipsis, and its close act stands at the first line.
export const DockedTitleWraps: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => (
		<Place>
			<Pane
				title="Assistant"
				sheet={{
					open: true,
					onClose: () => {},
					title: QUESTION,
					children: <p>Both</p>,
				}}
			/>
		</Place>
	),
	play: async ({ canvas }) => {
		const title = await canvas.findByText(QUESTION);
		const line = Number.parseFloat(getComputedStyle(title).lineHeight);
		expect(title.scrollWidth).toBeLessThanOrEqual(title.clientWidth);
		expect(title.getBoundingClientRect().height).toBeGreaterThan(line * 1.5);
		const close = canvas.getByRole("button", { name: "Close" });
		expect(close.getBoundingClientRect().top).toBeLessThanOrEqual(
			title.getBoundingClientRect().top,
		);
	},
};

// The touch head holds the close act, the title and the submit in one line at
// every width: the title is cut with an ellipsis when it does not fit, and the
// submit stands whole beside it, 44 tall, at the close act's height.
function touchHead(title: string, label: string, width: number): StoryObj {
	return {
		globals: {
			density: "touch",
			viewport: { value: "phone", isRotated: false },
		},
		parameters: {
			viewport: {
				options: {
					phone: {
						name: "Phone",
						styles: { width: `${width}px`, height: "812px" },
						type: "mobile",
					},
				},
			},
		},
		render: () => (
			<Sheet
				open
				onClose={() => {}}
				title={title}
				submit={{ label, onAct: pressed }}
			>
				<p>Body</p>
			</Sheet>
		),
		play: async () => {
			const name = await screen.findByText(title);
			const line = Number.parseFloat(getComputedStyle(name).lineHeight);
			const at = name.getBoundingClientRect();
			// One line, never a stack of fragments.
			expect(at.height).toBeLessThanOrEqual(line + 1);
			const close = screen
				.getByRole("button", { name: "Close" })
				.getBoundingClientRect();
			const button = screen.getByRole("button", { name: label });
			const submit = button.getBoundingClientRect();
			const dialog = screen.getByRole("dialog").getBoundingClientRect();
			expect(submit.height).toBeCloseTo(44, 0);
			expect(submit.right).toBeLessThanOrEqual(window.innerWidth);
			expect(
				Math.abs(dialog.right - submit.right - (close.left - dialog.left)),
			).toBeLessThanOrEqual(1);
			// The submit stands whole beside the title, on the close act's line.
			expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth);
			expect(submit.left).toBeGreaterThanOrEqual(at.right - 0.5);
			expect(Math.abs(submit.top - close.top)).toBeLessThanOrEqual(1);
		},
	};
}

export const TouchHeadKeepsItsTitle: StoryObj = {
	...touchHead("New thread with the code reviewer", "Open the thread", 375),
	tags: ["touch"],
};

export const TouchHeadLongSubmit375: StoryObj = {
	...touchHead("New workflow", "Make the workflow", 375),
	tags: ["touch"],
};

export const TouchHeadGains375: StoryObj = {
	...touchHead("What the workflow gains", "Save with these gains", 375),
	tags: ["touch"],
};

export const TouchHeadLongTitle390: StoryObj = {
	...touchHead("Review the workflow gains", "Save with these gains", 390),
	tags: ["touch"],
};

export const TouchHeadDone375: StoryObj = {
	...touchHead("Rename domain", "Done", 375),
	tags: ["touch"],
};

export const TouchHeadShortTitleOpen375: StoryObj = {
	...touchHead("New thread", "Open the thread", 375),
	tags: ["touch"],
};

// At 320 a long title is cut with an ellipsis on the one line and the submit
// stands whole beside it.
const LONG = "Review every change the workflow gains from this run";
const cuts = touchHead(LONG, "Save with these gains", 320);
export const TouchHeadCutsALongTitle320: StoryObj = {
	...cuts,
	play: async (context) => {
		await cuts.play?.(context);
		const name = await screen.findByText(LONG);
		expect(name.scrollWidth).toBeGreaterThan(name.clientWidth);
	},
};

const DESKTOP_900 = {
	globals: { viewport: { value: "w1440", isRotated: false } },
	parameters: {
		layout: "fullscreen",
		viewport: {
			options: {
				w1440: {
					name: "1440",
					styles: { width: "1440px", height: "900px" },
					type: "desktop",
				},
			},
		},
	},
} satisfies StoryObj;

// A desktop Sheet is a card centred over the page at the sheet's width, its
// foot on screen.
export const ShortSheetIsACentredCard: StoryObj = {
	...DESKTOP_900,
	render: () => <Page />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(
			canvas.getByRole("button", { name: "Rename domain" }),
		);
		const dialog = await screen.findByRole("dialog", { name: "Rename domain" });
		// The enter plays first: the card rises a pair as it fades.
		await waitFor(() => {
			const box = dialog.getBoundingClientRect();
			expect(
				Math.abs(box.left + box.width / 2 - window.innerWidth / 2),
			).toBeLessThan(1.5);
			expect(
				Math.abs(box.top + box.height / 2 - window.innerHeight / 2),
			).toBeLessThan(1.5);
		});
		const box = dialog.getBoundingClientRect();
		// The card stands at the sheet's width, in the sheet pattern's 610 to
		// 730 and not the dialog's 520.
		const probe = document.createElement("div");
		probe.className = "w-sheet";
		document.body.append(probe);
		const sheet = probe.getBoundingClientRect().width;
		probe.remove();
		expect(Math.abs(box.width - sheet)).toBeLessThan(0.5);
		expect(box.width).toBeGreaterThanOrEqual(610);
		expect(box.width).toBeLessThanOrEqual(730);
		expect(box.height).toBeLessThan(window.innerHeight / 2);
		const save = screen.getByRole("button", { name: "Save" });
		expect(save.getBoundingClientRect().bottom).toBeLessThanOrEqual(box.bottom);
		expect(getComputedStyle(dialog).borderTopWidth).toBe("1px");
	},
};

function LongPage() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button type="button" onClick={() => setOpen(true)}>
				Rename domain
			</button>
			<Sheet
				open={open}
				onClose={() => setOpen(false)}
				title="Rename domain"
				form={{
					act: through(orpc.forms.long, async () => ({ id: "workspace-1" })),
					given: { workspaceId: "acme" },
					fields: Object.fromEntries(
						Array.from({ length: 24 }, (_, at) => [
							`field${at + 1}`,
							{ label: `Field ${at + 1}` },
						]),
					),
					onDone: () => setOpen(false),
				}}
			/>
		</>
	);
}

// A form past the viewport stays the centred card, capped at the viewport less
// the page inset above and below, its body scrolling between the head and the
// foot, which stay on screen.
export const LongFormStaysACappedCard: StoryObj = {
	...DESKTOP_900,
	render: () => <LongPage />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(
			canvas.getByRole("button", { name: "Rename domain" }),
		);
		const dialog = await screen.findByRole("dialog", { name: "Rename domain" });
		const probe = document.createElement("div");
		probe.className = "pt-page";
		document.body.append(probe);
		const inset = Number.parseFloat(getComputedStyle(probe).paddingTop);
		probe.remove();
		await waitFor(() =>
			expect(dialog.getBoundingClientRect().top).toBeCloseTo(inset, 0),
		);
		const box = dialog.getBoundingClientRect();
		expect(box.height).toBeCloseTo(window.innerHeight - 2 * inset, 0);
		expect(
			Math.abs(box.left + box.width / 2 - window.innerWidth / 2),
		).toBeLessThan(1.5);
		const save = screen.getByRole("button", { name: "Save" });
		expect(save.getBoundingClientRect().bottom).toBeLessThanOrEqual(box.bottom);
	},
};

// The card's top holds to the pixel the layout rounds it to.
function expectTop(dialog: HTMLElement, top: number) {
	expect(Math.abs(dialog.getBoundingClientRect().top - top)).toBeLessThan(1);
}

function Growing() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button type="button" onClick={() => setOpen(true)}>
				Write a note
			</button>
			<Sheet
				open={open}
				onClose={() => setOpen(false)}
				title="Write a note"
				form={rename(() => setOpen(false), "Note", "prose")}
			/>
		</>
	);
}

// The card stands where it opened as its body grows under the member's hands:
// it grows downward, then scrolls its body at the cap, and its top never moves.
export const CardKeepsItsTopAsTheBodyGrows: StoryObj = {
	...DESKTOP_900,
	render: () => <Growing />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Write a note" }));
		const dialog = await screen.findByRole("dialog", { name: "Write a note" });
		const field = within(dialog).getByRole("textbox", { name: "Note" });
		await waitFor(() => expect(field).toHaveFocus());
		// The enter plays first: the card rises a pair as it fades.
		await waitFor(() => {
			const box = dialog.getBoundingClientRect();
			expect(
				Math.abs(box.top + box.height / 2 - window.innerHeight / 2),
			).toBeLessThan(1.5);
		});
		const opened = dialog.getBoundingClientRect();
		const probe = document.createElement("div");
		probe.className = "pt-page";
		document.body.append(probe);
		const inset = Number.parseFloat(getComputedStyle(probe).paddingTop);
		probe.remove();
		// Grown a few lines, then past the cap.
		await userEvent.keyboard("{Enter}".repeat(6));
		await waitFor(() =>
			expect(dialog.getBoundingClientRect().height).toBeGreaterThan(
				opened.height,
			),
		);
		expectTop(dialog, opened.top);
		await userEvent.keyboard("{Enter}".repeat(60));
		await waitFor(() =>
			expect(dialog.getBoundingClientRect().bottom).toBeCloseTo(
				window.innerHeight - inset,
				0,
			),
		);
		expectTop(dialog, opened.top);
	},
};

function sized(el: HTMLElement) {
	const style = getComputedStyle(el);
	return `${style.fontSize} ${style.fontWeight}`;
}

// The gap between the head's title text and its description, a pair.
function pairGap(title: HTMLElement, description: HTMLElement) {
	return (
		description.getBoundingClientRect().top -
		title.getBoundingClientRect().bottom
	);
}

// A docked title is the container's name at the `heading` role (16/600), a
// Section in its body names itself at the same size, and the description
// follows the title a pair below.
export const DockedTitleAndItsSectionShareASize: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => (
		<Place>
			<Pane
				title="Assistant"
				sheet={{
					open: true,
					onClose: () => {},
					title: "Question 1 of 2",
					description: "Before I redeploy",
					children: (
						<Section title="Which environment?">
							<p>Production</p>
						</Section>
					),
				}}
			/>
		</Place>
	),
	play: async ({ canvas }) => {
		const title = await canvas.findByRole("heading", {
			name: "Question 1 of 2",
		});
		const section = canvas.getByText("Which environment?");
		expect(sized(title)).toBe("16px 600");
		expect(sized(section)).toBe("16px 600");
		const pair = Number.parseFloat(
			getComputedStyle(document.documentElement).getPropertyValue(
				"--spacing-gap",
			),
		);
		const gap = pairGap(title, canvas.getByText("Before I redeploy"));
		expect(gap).toBeGreaterThanOrEqual(pair - 2);
		expect(gap).toBeLessThanOrEqual(pair + 4);
	},
};

// The same at touch: 18/600 both, the description a pair (8) below.
export const DockedTitleAndItsSectionShareASizeTouch: StoryObj = {
	...DockedTitleAndItsSectionShareASize,
	tags: ["touch"],
	globals: { density: "touch" },
	play: async ({ canvas }) => {
		const title = await canvas.findByRole("heading", {
			name: "Question 1 of 2",
		});
		const section = canvas.getByText("Which environment?");
		expect(sized(title)).toBe("18px 600");
		expect(sized(section)).toBe("18px 600");
		const gap = pairGap(title, canvas.getByText("Before I redeploy"));
		expect(gap).toBeGreaterThanOrEqual(6);
		expect(gap).toBeLessThan(12);
	},
};

// A Section in a modal Sheet's body names itself at the heading size, the
// sheet's title's.
export const SectionInModalSheet: StoryObj = {
	render: () => (
		<Sheet open onClose={() => {}} title="Rename domain">
			<Section title="Details">
				<p>Body</p>
			</Section>
		</Sheet>
	),
	play: async () => {
		const title = await screen.findByRole("heading", { name: "Rename domain" });
		// The modal head styles the span inside its heading.
		const text = title.firstElementChild;
		if (!(text instanceof HTMLElement)) throw new Error("no title text");
		expect(sized(text)).toBe("16px 600");
		expect(sized(screen.getByText("Details"))).toBe("16px 600");
	},
};

// A modal Sheet's body shorter than its sheets scrolls, and each sheet keeps
// the height of its rows.
export const GroupsInTheBodyKeepTheirRows: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => (
		<Sheet open onClose={() => {}} title="Usage">
			{[0, 1, 2, 3, 4, 5].map((key) => (
				<Section
					key={key}
					items={USAGE.map((name) => ({ key: name, title: name }))}
				/>
			))}
		</Sheet>
	),
	play: async () => {
		const dialog = await screen.findByRole("dialog", { name: "Usage" });
		const groups = [...dialog.querySelectorAll(".rounded-card")];
		const body = groups[0]?.parentElement;
		if (!body) throw new Error("no sheet is drawn");
		await waitFor(() =>
			expect(body.scrollHeight).toBeGreaterThan(body.clientHeight),
		);
		await expect(groups).toHaveLength(6);
		const clipped = groups.filter(
			(group) => group.scrollHeight > group.clientHeight + 1,
		);
		await expect(clipped).toEqual([]);
	},
};
export const GroupsInTheBodyKeepTheirRowsTouch: StoryObj = {
	...GroupsInTheBodyKeepTheirRows,
	tags: ["touch"],
	globals: { density: "touch" },
};

const USAGE = ["Builds", "Bandwidth", "Storage", "Seats"];

const OPTIONS = [
	{ value: "prod", label: "Production", description: "Serves traffic" },
	{ value: "staging", label: "Staging", description: "Mirrors production" },
	{ value: "preview", label: "Preview", description: "One per pull request" },
	{ value: "local", label: "Local", description: "Your machine" },
];

// A two-page docked question under a banner, in a phone's column (the touch
// project draws at 375 x 812, so the column carries its own size).
function BannerQuestion({
	height,
	width = 390,
	tabs = 0,
	long = false,
}: {
	height: number;
	width?: number;
	// The height of a tab bar the shell draws under the page.
	tabs?: number;
	// A log long enough to scroll.
	long?: boolean;
}) {
	const [at, setAt] = useState(0);
	const [value, setValue] = useState<string | null>(null);
	return (
		<div style={{ display: "flex", flexDirection: "column", width, height }}>
			<div style={{ padding: "var(--spacing-page)" }}>
				<Banner
					tone="attention"
					sentence="You have used 46 of your 50 answers this month. Upgrade to keep asking."
					act={{ label: "Upgrade", onAct: pressed }}
				/>
			</div>
			<Place>
				<Pane
					fill
					title="Assistant"
					sheet={{
						open: true,
						onClose: () => {},
						back: at > 0 ? () => setAt(0) : undefined,
						title: at === 0 ? "Question 1 of 2" : "Review",
						description: "Before I redeploy",
						submit: {
							label: at === 0 ? "Next" : "Send",
							onAct: () => setAt(1),
						},
						children: (
							<Section title={at === 0 ? "Which environment?" : "Your answers"}>
								{at === 0 ? (
									<Picker
										fit="list"
										label="Options"
										options={OPTIONS}
										value={value}
										onChange={setValue}
									/>
								) : (
									<p>Production</p>
								)}
							</Section>
						),
					}}
				>
					<Thread
						items={long ? LONG_TURNS : TURNS}
						message={{
							key: (turn) => turn.id,
							author: () => "you",
							body: (turn) => turn.body,
						}}
					/>
				</Pane>
			</Place>
			{tabs > 0 ? (
				<nav aria-label="Tabs" style={{ height: tabs, flexShrink: 0 }} />
			) : null}
		</div>
	);
}

// The sheet's body is the scroller around what the page holds.
function bodyOf(inside: HTMLElement) {
	let el = inside.parentElement;
	while (el && getComputedStyle(el).overflowY !== "auto") el = el.parentElement;
	if (!el) throw new Error("nothing scrolls around the page");
	return el;
}

// The question's body keeps its floor of three rows, where the old cap left it
// 84 px: the log gives way, standing above the foot in what is left, and the
// body scrolls past two fifths of the region. The review page, shorter than
// three rows, pads to the floor.
export const DockedBodyKeepsThreeRows: StoryObj = {
	tags: ["touch"],
	globals: { density: "touch" },
	parameters: { layout: "fullscreen" },
	render: () => <BannerQuestion height={844} />,
	play: async ({ canvas, userEvent }) => {
		const body = bodyOf(await canvas.findByRole("radiogroup"));
		const log = canvas.getByRole("log");
		const region = footRegion(log);
		const row = Number.parseFloat(
			getComputedStyle(document.documentElement).getPropertyValue(
				"--spacing-row",
			),
		);
		expect(row).toBe(48);
		const height = body.getBoundingClientRect().height;
		expect(height).toBeGreaterThanOrEqual(3 * row - 1);
		expect(height).toBeLessThanOrEqual(
			0.4 * region.getBoundingClientRect().height + 1,
		);
		expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
		expect(visible(log).height).toBeGreaterThanOrEqual(
			sizeOf("docked-log-floor"),
		);
		const sheet = body.parentElement?.getBoundingClientRect();
		expect(sheet?.bottom).toBeLessThanOrEqual(
			region.getBoundingClientRect().bottom + 1,
		);
		await userEvent.click(canvas.getByRole("button", { name: "Next" }));
		const short = bodyOf(await canvas.findByText("Production"));
		expect(short.getBoundingClientRect().height).toBeGreaterThanOrEqual(
			3 * row - 1,
		);
		expect(short.scrollHeight).toBeLessThanOrEqual(short.clientHeight);
	},
};

// The foot's region, the log's and the dock's shared column, and the touch
// token a size is.
// The region the Pane's body and its docked foot share.
function footRegion(log: HTMLElement) {
	const region = log.closest("[data-page]")?.children[1];
	if (!(region instanceof HTMLElement))
		throw new Error("the log has no region");
	return region;
}

// What the log is left: the Pane's body around it, its insets included, the
// box the docked sheet keeps the log's floor in.
function visible(log: HTMLElement) {
	const body = log.closest("[data-page]")?.children[1]?.firstElementChild;
	if (!body) throw new Error("the log has no body");
	return body.getBoundingClientRect();
}

function sizeOf(name: string) {
	return Number.parseFloat(
		getComputedStyle(document.documentElement).getPropertyValue(
			`--spacing-${name}`,
		),
	);
}

// The shell's touch tab bar under the page.
const TABS = 57;

// A short viewport under a banner: the pinned parts stay inside the foot's
// region, above the tab bar, on both pages; the log prints nowhere over the
// sheet's head and nothing it holds leaves the region. Where `yields`, the
// region cannot hold the body's three rows and the body gives below them.
function shortViewport(
	width: number,
	height: number,
	yields = false,
): StoryObj {
	return {
		render: () => <BannerQuestion width={width} height={height} tabs={TABS} />,
		play: async ({ canvas, userEvent }) => {
			const body = bodyOf(await canvas.findByRole("radiogroup"));
			const log = canvas.getByRole("log");
			const region = footRegion(log).getBoundingClientRect();
			const head = canvas.getByRole("heading", { name: "Question 1 of 2" });
			const submit = canvas.getByRole("button", { name: "Next" });
			const tabs = canvas.getByRole("navigation", { name: "Tabs" });
			expect(submit.getBoundingClientRect().bottom).toBeLessThanOrEqual(
				region.bottom + 1,
			);
			expect(submit.getBoundingClientRect().bottom).toBeLessThanOrEqual(
				tabs.getBoundingClientRect().top + 1,
			);
			expect(visible(log).bottom).toBeLessThanOrEqual(
				head.getBoundingClientRect().top + 1,
			);
			expect(visible(log).top).toBeGreaterThanOrEqual(region.top - 1);
			expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
			if (yields)
				expect(body.getBoundingClientRect().height).toBeLessThan(
					sizeOf("docked-floor"),
				);
			await userEvent.click(submit);
			const done = await canvas.findByRole("button", { name: "Send" });
			expect(done.getBoundingClientRect().bottom).toBeLessThanOrEqual(
				footRegion(canvas.getByRole("log")).getBoundingClientRect().bottom + 1,
			);
		},
	};
}

// The `touch` tag is spelled in each story: Storybook's index reads tags from
// the literal, not from a call.
export const DockedShortPhone: StoryObj = {
	tags: ["touch"],
	globals: { density: "touch" },
	parameters: { layout: "fullscreen" },
	...shortViewport(320, 640),
};
export const DockedShortPhoneTall: StoryObj = {
	tags: ["touch"],
	globals: { density: "touch" },
	parameters: { layout: "fullscreen" },
	...shortViewport(390, 667),
};
// Shorter still, where the three rows cannot stand: the body gives below them.
export const DockedShortestPhone: StoryObj = {
	tags: ["touch"],
	globals: { density: "touch" },
	parameters: { layout: "fullscreen" },
	...shortViewport(320, 560, true),
};

// A reader scrolled up in a log the foot leaves little room: the Latest act is
// reachable only while its whole box stands inside the log's visible box. Tab
// to it draws the 2 px ring wholly inside the region; where the log is shorter
// than the act and its inset the act is out of the tab order and the tree.
function latestReachable(width: number, height: number): StoryObj {
	return {
		globals: { density: "touch" },
		parameters: { layout: "fullscreen" },
		render: () => (
			<BannerQuestion width={width} height={height} tabs={TABS} long />
		),
		play: async ({ canvas, userEvent }) => {
			const log = await canvas.findByRole("log");
			log.scrollTop = 0;
			const status = canvas.getByRole("heading", { name: "Assistant" });
			expect(status.getBoundingClientRect().bottom).toBeLessThanOrEqual(
				visible(log).top + 1,
			);
			const shown = visible(log);
			const found = canvas.queryByRole("button", { name: "Latest" });
			if (found === null) {
				// Not in the tab order: a Tab from the log lands on no Latest act.
				log.focus();
				await userEvent.tab();
				expect(document.activeElement?.textContent).not.toContain("Latest");
				return;
			}
			const box = found.getBoundingClientRect();
			expect(box.top).toBeGreaterThanOrEqual(shown.top);
			expect(box.bottom).toBeLessThanOrEqual(shown.bottom + 1);
			log.focus();
			await userEvent.tab();
			expect(document.activeElement).toBe(found);
			const style = getComputedStyle(found);
			expect(style.outlineStyle).toBe("solid");
			expect(Number.parseFloat(style.outlineWidth)).toBe(2);
			const ring = Number.parseFloat(style.outlineOffset) + 2;
			expect(box.top - ring).toBeGreaterThanOrEqual(shown.top - 1);
		},
	};
}
export const DockedLatestStaysInItsRegion: StoryObj = {
	...latestReachable(320, 560),
	tags: ["touch"],
};
export const DockedLatestReachableShortPhone: StoryObj = {
	...latestReachable(320, 640),
	tags: ["touch"],
};
export const DockedLatestReachableShortPhoneTall: StoryObj = {
	...latestReachable(390, 667),
	tags: ["touch"],
};

// The body's last row keeps the section gap above the submit.
function lastRowKeepsTheGap(width: number, height: number): StoryObj {
	return {
		globals: { density: "touch" },
		parameters: { layout: "fullscreen" },
		render: () => <BannerQuestion width={width} height={height} tabs={TABS} />,
		play: async ({ canvas }) => {
			const group = await canvas.findByRole("radiogroup");
			const body = bodyOf(group);
			body.scrollTop = body.scrollHeight;
			const last = group.lastElementChild;
			const submit = canvas.getByRole("button", { name: "Next" });
			const gap =
				submit.getBoundingClientRect().top -
				(last?.getBoundingClientRect().bottom ?? 0);
			expect(gap).toBeGreaterThanOrEqual(sizeOf("sections") - 1);
		},
	};
}
export const DockedLastRowKeepsTheSectionGap320: StoryObj = {
	...lastRowKeepsTheGap(320, 640),
	tags: ["touch"],
};
export const DockedLastRowKeepsTheSectionGap390: StoryObj = {
	...lastRowKeepsTheGap(390, 667),
	tags: ["touch"],
};
export const DockedLastRowKeepsTheSectionGap560: StoryObj = {
	...lastRowKeepsTheGap(320, 560),
	tags: ["touch"],
};

// Under a banner where two fifths of the region would leave the log less than
// its floor: the body gave toward its own floor first, so the log keeps two
// rows and the body stays between its three rows and its cap.
export const DockedLeavesTheLogItsFloor: StoryObj = {
	tags: ["touch"],
	globals: { density: "touch" },
	parameters: { layout: "fullscreen" },
	render: () => <BannerQuestion height={661} tabs={TABS} />,
	play: async ({ canvas }) => {
		const body = bodyOf(await canvas.findByRole("radiogroup"));
		const log = canvas.getByRole("log");
		const region = footRegion(log).getBoundingClientRect();
		const grown = body.getBoundingClientRect().height;
		expect(sizeOf("docked-log-floor")).toBe(2 * sizeOf("row"));
		expect(visible(log).height).toBeGreaterThanOrEqual(
			sizeOf("docked-log-floor") - 1,
		);
		expect(grown).toBeGreaterThanOrEqual(sizeOf("docked-floor") - 1);
		expect(grown).toBeLessThan(0.4 * region.height - 1);
	},
};

// With room, a page shorter than two fifths of the region is its content's
// height, does not scroll, and leaves the log more than the body.
export const DockedWithRoomFitsItsPage: StoryObj = {
	tags: ["touch"],
	globals: { density: "touch" },
	parameters: { layout: "fullscreen" },
	render: () => <BannerQuestion height={1600} />,
	play: async ({ canvas }) => {
		const body = bodyOf(await canvas.findByRole("radiogroup"));
		expect(body.scrollHeight).toBeLessThanOrEqual(body.clientHeight);
		expect(
			canvas.getByRole("log").getBoundingClientRect().height,
		).toBeGreaterThan(body.clientHeight);
	},
};

const REPOS = [
	{ value: "api", label: "api" },
	{ value: "web", label: "web" },
];

function PickOpensSheet() {
	const [repo, setRepo] = useState("api");
	const [open, setOpen] = useState(false);
	return (
		<>
			<Picker
				label="Repo"
				options={REPOS}
				value={repo}
				onChange={setRepo}
				act={{ icon: "Plus", label: "New epic", onAct: () => setOpen(true) }}
			/>
			<Sheet open={open} onClose={() => setOpen(false)} title="New epic">
				<p>Name it</p>
			</Sheet>
		</>
	);
}

// A Sheet a pick's closing act opens: the act unmounts with the popup, so on
// close focus returns to the picker's trigger, not the body.
export const OpenedByAPicksAct: StoryObj = {
	render: () => <PickOpensSheet />,
	play: async ({ canvas, userEvent }) => {
		const trigger = canvas.getByRole("combobox", { name: /Repo/ });
		await userEvent.click(trigger);
		await userEvent.click(
			await screen.findByRole("button", { name: /New epic/ }),
		);
		await screen.findByRole("dialog", { name: "New epic" });
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await waitFor(() => expect(trigger).toHaveFocus());
	},
};

function RouteOpensSheet() {
	const [route, setRoute] = useState<"item" | "list">("item");
	return (
		<Place>
			<Pane title={route === "item" ? "Item" : "Items"}>
				<Button label="Add" onAct={pressed} />
				{route === "item" ? (
					<Sheet open onClose={() => setRoute("list")} title="Question">
						<p>Which one?</p>
					</Sheet>
				) : null}
			</Pane>
		</Place>
	);
}

// A Sheet its route mounts open, closed by Escape as the route leaves: focus
// lands on the page it returns to, never the body.
export const OpenedByARoute: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => <RouteOpensSheet />,
	play: async ({ canvas, canvasElement, userEvent }) => {
		await screen.findByRole("dialog", { name: "Question" });
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await waitFor(() =>
			expect(canvasElement.querySelector("[data-page]")).toContainElement(
				focused(),
			),
		);
		await expect(canvas.getByRole("button", { name: "Add" })).toBeVisible();
	},
};

function OpensOnPress() {
	const [open, setOpen] = useState(false);
	return (
		<Place>
			<Pane title="Items">
				<Button label="Open" onAct={() => setOpen(true)} />
				{open ? (
					<Sheet open onClose={() => setOpen(false)} title="Question">
						<p>Which one?</p>
					</Sheet>
				) : null}
			</Pane>
		</Place>
	);
}

// A Sheet closed by Escape before its own first focus lands, focus still on
// the body: the page takes focus, never the body. The Escape goes out as the
// dialog enters the document, before the frame its focus waits for.
export const EscapedBeforeItsFocusLands: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => <OpensOnPress />,
	play: async ({ canvas, canvasElement }) => {
		await expect(focused()).toBe(document.body);
		const escaped = new Promise<Element | null>((resolve) => {
			const watch = new MutationObserver(() => {
				const dialog = document.querySelector('[role="dialog"]');
				if (!dialog) return;
				watch.disconnect();
				const active = document.activeElement;
				document.body.dispatchEvent(
					new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
				);
				resolve(active);
			});
			watch.observe(document.body, { childList: true, subtree: true });
		});
		canvas.getByRole("button", { name: "Open" }).click();
		await expect(await escaped).toBe(document.body);
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await waitFor(() =>
			expect(canvasElement.querySelector("[data-page]")).toContainElement(
				focused(),
			),
		);
	},
};

function Derived() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button type="button" onClick={() => setOpen(true)}>
				New request
			</button>
			<Sheet
				open={open}
				onClose={() => setOpen(false)}
				title="New request"
				form={{
					act: over(async () => ({ id: "request-1" })),
					given: {
						workspaceId: "acme",
						kind: "change",
						seats: 3,
						urgent: false,
					},
					fields: { title: { label: "What should change?" } },
					submit: { label: "Send request" },
					onDone: () => setOpen(false),
				}}
			/>
		</>
	);
}

// A sheet's `form` is a form over a procedure: its bar submits, the sheet
// closes on `onDone`, and the edit is dropped when the sheet opens again.
export const FormOverAProcedure: StoryObj = {
	render: () => <Derived />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "New request" }));
		const dialog = within(await screen.findByRole("dialog"));
		const title = dialog.getByRole("textbox", { name: /What should change/ });
		await userEvent.type(title, "Add the checkout event");
		await userEvent.click(dialog.getByRole("button", { name: "Send request" }));
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await userEvent.click(canvas.getByRole("button", { name: "New request" }));
		const again = within(await screen.findByRole("dialog"));
		await expect(
			again.getByRole("textbox", { name: /What should change/ }),
		).toHaveValue("");
	},
};
