import { Banner } from "@fcalell/plugin-react-ui/components/banner";
import { Button } from "@fcalell/plugin-react-ui/components/button";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { MessageInput } from "@fcalell/plugin-react-ui/components/message-input";
import { OptionList } from "@fcalell/plugin-react-ui/components/option-list";
import { Picker } from "@fcalell/plugin-react-ui/components/picker";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import { Thread } from "@fcalell/plugin-react-ui/components/thread";
import { confirm } from "@fcalell/plugin-react-ui/lib/confirm";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, screen, waitFor } from "storybook/test";
import { focused } from "./support.ts";

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
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
		await waitFor(() => expect(trigger).toHaveFocus());
	},
};

// The same decision at touch density is an alertdialog too, and opens on Cancel
// though the stack draws the filled act first.
export const DecisionTouch: StoryObj = {
	...Decision,
	tags: ["touch"],
	globals: { density: "touch" },
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
const LONG_TURNS = Array.from({ length: 12 }, (_, at) => ({
	id: `t${at}`,
	body: `Why did deploy ${at + 1} of the api fail?`,
}));

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

// The touch head holds the close act, the title and the submit in one wrapping
// row. The title column is at most three fifths of the row and wraps whole in
// it (two lines at 25 characters); a submit that does not fit beside that
// column drops whole to a second line at the row's end, 44 tall, and one that
// fits stays in the row at the close act's height.
function touchHead(
	title: string,
	label: string,
	width: number,
	beside: boolean,
): StoryObj {
	return {
		tags: ["touch"],
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
				submit={{ label, onAct: () => {} }}
			>
				<p>Body</p>
			</Sheet>
		),
		play: async () => {
			const name = await screen.findByText(title);
			const line = Number.parseFloat(getComputedStyle(name).lineHeight);
			const at = name.getBoundingClientRect();
			expect(name.scrollWidth).toBeLessThanOrEqual(name.clientWidth);
			expect(at.height).toBeLessThanOrEqual(line * 2 + 1);
			const close = screen
				.getByRole("button", { name: "Close" })
				.getBoundingClientRect();
			const submit = screen
				.getByRole("button", { name: label })
				.getBoundingClientRect();
			const dialog = screen.getByRole("dialog").getBoundingClientRect();
			expect(submit.height).toBeCloseTo(44, 0);
			expect(submit.right).toBeLessThanOrEqual(window.innerWidth);
			expect(
				Math.abs(dialog.right - submit.right - (close.left - dialog.left)),
			).toBeLessThanOrEqual(1);
			if (beside) {
				expect(submit.left).toBeGreaterThanOrEqual(at.right);
				expect(Math.abs(submit.top - close.top)).toBeLessThanOrEqual(1);
			} else {
				expect(submit.top).toBeGreaterThanOrEqual(at.bottom);
			}
		},
	};
}

export const TouchHeadKeepsItsTitle: StoryObj = touchHead(
	"New thread with the code reviewer",
	"Open the thread",
	375,
	false,
);

export const TouchHeadLongSubmit375: StoryObj = touchHead(
	"New workflow",
	"Make the workflow",
	375,
	false,
);

export const TouchHeadLongSubmitFits390: StoryObj = touchHead(
	"New workflow",
	"Make the workflow",
	390,
	true,
);

export const TouchHeadGains375: StoryObj = touchHead(
	"What the workflow gains",
	"Save with these gains",
	375,
	false,
);

export const TouchHeadGains390: StoryObj = touchHead(
	"What the workflow gains",
	"Save with these gains",
	390,
	false,
);

export const TouchHeadLongTitle375: StoryObj = touchHead(
	"Review the workflow gains",
	"Save with these gains",
	375,
	false,
);

export const TouchHeadLongTitle390: StoryObj = touchHead(
	"Review the workflow gains",
	"Save with these gains",
	390,
	false,
);

export const TouchHeadDone375: StoryObj = touchHead(
	"Rename domain",
	"Done",
	375,
	true,
);

export const TouchHeadDone390: StoryObj = touchHead(
	"Rename domain",
	"Done",
	390,
	true,
);

export const TouchHeadShortTitleOpen375: StoryObj = touchHead(
	"New thread",
	"Open the thread",
	375,
	true,
);

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

// A desktop Sheet whose content at natural height fits the viewport is a card
// centred over the page at the dialog's width, its foot on screen.
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
		expect(box.width).toBeLessThan(window.innerWidth / 2);
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
				submit={{ label: "Save", onAct: () => setOpen(false) }}
			>
				{Array.from({ length: 24 }, (_, i) => `Field ${i + 1}`).map((label) => (
					<FormField key={label} label={label}>
						<Input value="" onChange={() => {}} />
					</FormField>
				))}
			</Sheet>
		</>
	);
}

// A form past the viewport stays the full-height side sheet at the end edge,
// its body scrolling between the head and the foot, which stay on screen.
export const LongFormStaysASideSheet: StoryObj = {
	...DESKTOP_900,
	render: () => <LongPage />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(
			canvas.getByRole("button", { name: "Rename domain" }),
		);
		const dialog = await screen.findByRole("dialog", { name: "Rename domain" });
		await waitFor(() =>
			expect(dialog.getBoundingClientRect().right).toBe(window.innerWidth),
		);
		const box = dialog.getBoundingClientRect();
		expect(box.top).toBe(0);
		expect(box.height).toBe(window.innerHeight);
		const save = screen.getByRole("button", { name: "Save" });
		expect(save.getBoundingClientRect().bottom).toBeLessThanOrEqual(
			window.innerHeight,
		);
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

// A docked title is the container's name: the `heading` role (16/600), over a
// Section in its body that reads a level below (14/600), and the description
// follows the title a pair below.
export const DockedTitleOutranksItsBody: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => (
		<Place
			title="Assistant"
			foot={
				<Sheet
					open
					onClose={() => {}}
					title="Question 1 of 2"
					description="Before I redeploy"
				>
					<Section title="Which environment?">
						<p>Production</p>
					</Section>
				</Sheet>
			}
		/>
	),
	play: async ({ canvas }) => {
		const title = await canvas.findByRole("heading", {
			name: "Question 1 of 2",
		});
		const section = canvas.getByText("Which environment?");
		expect(sized(title)).toBe("16px 600");
		expect(sized(section)).toBe("14px 600");
		const pair = Number.parseFloat(
			getComputedStyle(document.documentElement).getPropertyValue(
				"--spacing-pair",
			),
		);
		const gap = pairGap(title, canvas.getByText("Before I redeploy"));
		expect(gap).toBeGreaterThanOrEqual(pair - 2);
		expect(gap).toBeLessThanOrEqual(pair + 4);
	},
};

// The same at touch: 18/600 over 16/600, the description a pair (8) below.
export const DockedTitleOutranksItsBodyTouch: StoryObj = {
	...DockedTitleOutranksItsBody,
	tags: ["touch"],
	globals: { density: "touch" },
	play: async ({ canvas }) => {
		const title = await canvas.findByRole("heading", {
			name: "Question 1 of 2",
		});
		const section = canvas.getByText("Which environment?");
		expect(sized(title)).toBe("18px 600");
		expect(sized(section)).toBe("16px 600");
		const gap = pairGap(title, canvas.getByText("Before I redeploy"));
		expect(gap).toBeGreaterThanOrEqual(6);
		expect(gap).toBeLessThan(12);
	},
};

// A Section in a modal Sheet's body reads under the modal title too.
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
		expect(sized(screen.getByText("Details"))).toBe("14px 600");
	},
};

// A modal Sheet's body shorter than its Groups scrolls, and each Group keeps
// the height of its rows.
export const GroupsInTheBodyKeepTheirRows: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => (
		<Sheet open onClose={() => {}} title="Usage">
			{[0, 1, 2, 3, 4, 5].map((key) => (
				<Group key={key}>
					<List
						items={USAGE}
						row={{ key: (name) => name, title: (name) => name }}
					/>
				</Group>
			))}
		</Sheet>
	),
	play: async () => {
		const dialog = await screen.findByRole("dialog", { name: "Usage" });
		const groups = [...dialog.querySelectorAll(".rounded-card")];
		const body = groups[0]?.parentElement;
		if (!body) throw new Error("no Group is drawn");
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
					kind="warn"
					sentence="You have used 46 of your 50 answers this month. Upgrade to keep asking."
					act={{ label: "Upgrade", onAct: () => {} }}
				/>
			</div>
			<Place title="Assistant">
				<Thread
					items={long ? LONG_TURNS : TURNS}
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
function footRegion(log: HTMLElement) {
	const region = log.parentElement?.parentElement;
	if (!region) throw new Error("the log has no region");
	return region;
}

// What of the log shows: its region clips it, so a log box taller than the room
// it is left (its padding alone is) shows only the region's height.
function visible(log: HTMLElement) {
	const region = log.parentElement;
	if (!region) throw new Error("the log has no region");
	return region.getBoundingClientRect();
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
		tags: ["touch"],
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
export const DockedLatestStaysInItsRegion: StoryObj = latestReachable(320, 560);
export const DockedLatestReachableShortPhone: StoryObj = latestReachable(
	320,
	640,
);
export const DockedLatestReachableShortPhoneTall: StoryObj = latestReachable(
	390,
	667,
);

// The body's last row keeps the section gap above the submit.
function lastRowKeepsTheGap(width: number, height: number): StoryObj {
	return {
		tags: ["touch"],
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
export const DockedLastRowKeepsTheSectionGap320: StoryObj = lastRowKeepsTheGap(
	320,
	640,
);
export const DockedLastRowKeepsTheSectionGap390: StoryObj = lastRowKeepsTheGap(
	390,
	667,
);
export const DockedLastRowKeepsTheSectionGap560: StoryObj = lastRowKeepsTheGap(
	320,
	560,
);

// Under a banner where two fifths of the region would leave the log less than
// its floor: the body gave toward its own floor first, so the log keeps two
// rows and the body stays between its three rows and its cap.
export const DockedLeavesTheLogItsFloor: StoryObj = {
	tags: ["touch"],
	globals: { density: "touch" },
	parameters: { layout: "fullscreen" },
	render: () => <BannerQuestion height={645} tabs={TABS} />,
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
		<Place title={route === "item" ? "Item" : "Items"}>
			<Button label="Add" onAct={() => {}} />
			{route === "item" ? (
				<Sheet open onClose={() => setRoute("list")} title="Question">
					<p>Which one?</p>
				</Sheet>
			) : null}
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
