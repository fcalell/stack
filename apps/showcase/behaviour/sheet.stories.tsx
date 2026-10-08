import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Button } from "@fcalell/plugin-react-ui/components/button";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { MessageInput } from "@fcalell/plugin-react-ui/components/message-input";
import { OptionList } from "@fcalell/plugin-react-ui/components/option-list";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import { Thread } from "@fcalell/plugin-react-ui/components/thread";
import { confirm } from "@fcalell/plugin-react-ui/lib/confirm";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, screen, waitFor } from "storybook/test";

function Page() {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	return (
		<>
			<button type="button" onClick={() => setOpen(true)}>
				Rename domain
			</button>
			<Sheet
				open={open}
				onClose={() => setOpen(false)}
				title="Rename domain"
				submit={{ label: "Save", onAct: () => setOpen(false) }}
			>
				<FormField label="Name">
					<Input value={name} onChange={setName} />
				</FormField>
			</Sheet>
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
		await waitFor(() =>
			expect(dialog).toContainElement(document.activeElement as HTMLElement),
		);
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await waitFor(() => expect(trigger).toHaveFocus());
	},
};

// A decision (`confirm()`, drawn as a sheet by the Gate or Shell hosting it)
// takes focus when it asks, Escape dismisses it, and focus returns to the act that
// asked.
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
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
		await waitFor(() => expect(trigger).toHaveFocus());
	},
};

// The foot a docked question stands in, then the input that returns.
function useDockedFoot() {
	const [open, setOpen] = useState(true);
	const [text, setText] = useState("");
	const docked = open ? (
		<Sheet
			open
			onClose={() => setOpen(false)}
			title="Question 1 of 1"
			submit={{ label: "Send", onAct: () => setOpen(false) }}
		>
			<p>Who hears about it?</p>
		</Sheet>
	) : (
		<MessageInput value={text} onChange={setText} onSend={() => {}} />
	);
	return docked;
}

function Docked() {
	const foot = useDockedFoot();
	return <Place title="Assistant" foot={foot} />;
}

const TURNS = [{ id: "t1", body: "Why did the last deploy fail?" }];

function DockedThread() {
	const foot = useDockedFoot();
	return (
		<Place title="Assistant">
			<Thread
				items={TURNS}
				message={{
					key: (turn) => turn.id,
					author: () => "you",
					body: (turn) => turn.body,
				}}
				foot={foot}
			/>
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

// A Sheet docked in a Place's foot: Escape closes it and hands focus to the
// input that returns in its place.
export const DockedInFoot: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => <Docked />,
	play: closesToInput,
};

// The same in a Thread's foot.
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
		<Place
			title="Assistant"
			foot={
				<Sheet open onClose={() => {}} title={QUESTION}>
					<p>Both</p>
				</Sheet>
			}
		/>
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

// The touch head holds the close act, the title and the submit in one row: a
// title longer than its room wraps whole and the submit stays beside it.
export const TouchHeadKeepsItsTitle: StoryObj = {
	tags: ["touch"],
	globals: { density: "touch", viewport: { value: "phone", isRotated: false } },
	parameters: {
		viewport: {
			options: {
				phone: {
					name: "Phone",
					styles: { width: "375px", height: "812px" },
					type: "mobile",
				},
			},
		},
	},
	render: () => (
		<Sheet
			open
			onClose={() => {}}
			title="New thread with the code reviewer"
			submit={{ label: "Open the thread", onAct: () => {} }}
		>
			<p>Body</p>
		</Sheet>
	),
	play: async () => {
		const title = await screen.findByText("New thread with the code reviewer");
		const line = Number.parseFloat(getComputedStyle(title).lineHeight);
		expect(title.scrollWidth).toBeLessThanOrEqual(title.clientWidth);
		expect(title.getBoundingClientRect().height).toBeGreaterThan(line * 1.5);
		const submit = screen.getByRole("button", { name: "Open the thread" });
		expect(submit.getBoundingClientRect().right).toBeLessThanOrEqual(
			window.innerWidth,
		);
		expect(submit.getBoundingClientRect().left).toBeGreaterThanOrEqual(
			title.getBoundingClientRect().right,
		);
	},
};

// A desktop side sheet for a short form is its content's height, hung from
// the top at the end edge.
export const SideSheetFitsItsContent: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => <Page />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(
			canvas.getByRole("button", { name: "Rename domain" }),
		);
		const dialog = await screen.findByRole("dialog", { name: "Rename domain" });
		// The enter plays first: the sheet slides in from the end edge.
		await waitFor(() =>
			expect(dialog.getBoundingClientRect().right).toBe(window.innerWidth),
		);
		const box = dialog.getBoundingClientRect();
		expect(box.top).toBe(0);
		expect(box.height).toBeLessThan(window.innerHeight / 2);
	},
};

const OPTIONS = [
	{ value: "prod", label: "Production", description: "Serves traffic" },
	{ value: "staging", label: "Staging", description: "Mirrors production" },
	{ value: "preview", label: "Preview", description: "One per pull request" },
	{ value: "local", label: "Local", description: "Your machine" },
];

// A two-page docked question under a banner, in a phone's 390 px column (the
// touch project draws at 375 x 812, so the column carries its own height).
function BannerQuestion({ height }: { height: number }) {
	const [at, setAt] = useState(0);
	const [value, setValue] = useState<string | null>(null);
	return (
		<div
			style={{ display: "flex", flexDirection: "column", width: 390, height }}
		>
			<div style={{ padding: "var(--spacing-page)" }}>
				<Banner
					kind="warn"
					sentence="You have used 46 of your 50 answers this month. Upgrade to keep asking."
					act={{ label: "Upgrade", onAct: () => {} }}
				/>
			</div>
			<Place title="Assistant">
				<Thread
					items={TURNS}
					message={{
						key: (turn) => turn.id,
						author: () => "you",
						body: (turn) => turn.body,
					}}
					foot={
						<Sheet
							open
							onClose={() => {}}
							back={at > 0 ? () => setAt(0) : undefined}
							title={at === 0 ? "Question 1 of 2" : "Review"}
							description="Before I redeploy"
							submit={{
								label: at === 0 ? "Next" : "Send",
								onAct: () => setAt(1),
							}}
							foot={at === 0 ? undefined : "Your answers go with the redeploy."}
						>
							<Section title={at === 0 ? "Which environment?" : "Your answers"}>
								{at === 0 ? (
									<OptionList
										options={OPTIONS}
										value={value}
										onChange={setValue}
									/>
								) : (
									<p>Production</p>
								)}
							</Section>
						</Sheet>
					}
				/>
			</Place>
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
		const region = log.parentElement?.parentElement;
		if (!region) throw new Error("the log has no region");
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
		expect(log.getBoundingClientRect().height).toBeGreaterThan(0);
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
