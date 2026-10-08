import { cn } from "@fcalell/ui-core/cn";
import type { Act, Option } from "@fcalell/ui-core/descriptors";
import { SHELL_BANNER, SHELL_COLUMN } from "@fcalell/ui-core/variants";
import { useEffect, useRef, useState } from "react";
import { Banner } from "../../components/banner/index.tsx";
import { FormField } from "../../components/form-field/index.tsx";
import { Input } from "../../components/input/index.tsx";
import { MessageInput } from "../../components/message-input/index.tsx";
import { OptionList } from "../../components/option-list/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { ConfirmSheet } from "../../components/sheet/confirm.tsx";
import { Sheet } from "../../components/sheet/index.tsx";
import { Thread } from "../../components/thread/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { StandInRows } from "./layout-context.tsx";
import { press, Stage } from "./overlay-stage.tsx";
import { TURN, TURNS } from "./thread.tsx";

const act = () => {};

interface Question {
	title: string;
	options: Option[];
}

// The four questions a conversation asks before it acts, each a radio list.
const QUESTIONS: Question[] = [
	{
		title: "Which environment?",
		options: [
			{ value: "production", label: "Production", recommended: true },
			{ value: "staging", label: "Staging" },
			{ value: "preview", label: "Preview" },
		],
	},
	{
		title: "Which build image?",
		options: [
			{ value: "node-20", label: "Node 20", recommended: true },
			{ value: "node-18", label: "Node 18", description: "Leaves on Oct 12" },
			{ value: "bun", label: "Bun" },
		],
	},
	{
		title: "When should it run?",
		options: [
			{ value: "now", label: "Now" },
			{ value: "after", label: "After the migration" },
			{ value: "hold", label: "Hold it until I say" },
		],
	},
	{
		title: "Who hears about it?",
		options: [
			{ value: "me", label: "Only me" },
			{ value: "team", label: "The team", recommended: true },
			{ value: "channel", label: "The #deploys channel" },
		],
	},
];

// A conversation filling its page with a four-question sheet docked in its
// foot: each page a Section of one radio list, Back in the head from the
// second, Next on the first three and Send on the last, at a phone's height
// (844) under a banner. The body scrolls past two fifths of the region under
// the banner and keeps three rows, the log giving way; closing returns the
// input. Send's states open on the last page: blocked
// before the last question is answered (its reason shown once pressed),
// pending while it works, and failed, the act ready again with the error line
// under it saying why, in the line the reason keeps.
function DockedQuestions({ state }: { state: ShowcaseFrame["state"] }) {
	const frame = useRef<HTMLDivElement>(null);
	const [value, setValue] = useState("");
	const [at, setAt] = useState(state === "rest" ? 0 : QUESTIONS.length - 1);
	const [open, setOpen] = useState(true);
	const [answers, setAnswers] = useState<(string | null)[]>(
		QUESTIONS.map((_, i) =>
			state === "loading" || state === "error"
				? (QUESTIONS[i]?.options[0]?.value ?? null)
				: null,
		),
	);
	useEffect(() => {
		if (state === "disabled" && frame.current) pressSubmit(frame.current);
	}, [state]);
	const question = QUESTIONS[at];
	const last = at === QUESTIONS.length - 1;
	const close = () => {
		setOpen(false);
		setAt(0);
	};
	const input = (
		<MessageInput
			value={value}
			onChange={setValue}
			onAttach={act}
			placeholder="Ask about this deploy"
			onSend={() => setValue("")}
		/>
	);
	return (
		<div
			ref={frame}
			className={cn(
				SHELL_COLUMN,
				"flex flex-col h-211 w-screen max-w-full overflow-hidden",
			)}
		>
			<div className={SHELL_BANNER}>
				<Banner
					kind="warn"
					sentence="You have used 46 of your 50 answers this month. Upgrade to keep asking."
					act={{ label: "Upgrade", onAct: act }}
				/>
			</div>
			<Place title="Assistant">
				<Thread
					items={TURNS}
					message={TURN}
					foot={
						open && question ? (
							<Sheet
								open
								onClose={close}
								back={at > 0 ? () => setAt(at - 1) : undefined}
								title={`Question ${at + 1} of ${QUESTIONS.length}`}
								description="Before I redeploy"
								submit={{
									label: last ? "Send" : "Next",
									onAct: last ? close : () => setAt(at + 1),
									loading: (last && state === "loading") || undefined,
									blocked:
										last && state === "disabled"
											? "Choose who hears about it first."
											: undefined,
								}}
								foot={last ? "Your answers go with the redeploy." : undefined}
								failed={
									last && state === "error"
										? "Couldn't send your answers. Try again."
										: undefined
								}
							>
								<Section title={question.title}>
									<OptionList
										options={question.options}
										value={answers[at] ?? null}
										onChange={(next) =>
											setAnswers(
												answers.map((was, i) => (i === at ? next : was)),
											)
										}
									/>
								</Section>
							</Sheet>
						) : (
							input
						)
					}
				/>
			</Place>
		</div>
	);
}

// A short form: one field, so the side sheet is its content's height.
function OneField() {
	const [value, setValue] = useState("production");
	return (
		<FormField label="Branch">
			<Input value={value} onChange={setValue} />
		</FormField>
	);
}

function submitOf(state: ShowcaseFrame["state"]): Act {
	return {
		label: "Save",
		onAct: act,
		loading: state === "loading" || undefined,
		blocked: state === "disabled" ? "Add a description first." : undefined,
	};
}

// A blocked submit shows its reason once pressed.
const pressSubmit = (stage: HTMLElement) =>
	requestAnimationFrame(() =>
		press(stage.querySelector('[aria-disabled="true"]:not([aria-busy])')),
	);

const NAME = {
	value: "acme-web",
	label: "Type acme-web to confirm",
	blocked: "Type the project name to delete it.",
};
// The act's work never settles, so a pressed act stays pending.
const CONFIRM = {
	id: 0,
	title: "Delete acme-web?",
	sentence: "Its deploys, domains and logs go with it. This cannot be undone.",
	cancel: "Keep the project",
	act: {
		label: "Delete project",
		destructive: true,
		onAct: () => new Promise<never>(() => {}),
	},
	confirmName: NAME,
};

// The name typed in, then the act pressed: the act runs its work.
const typeAndRun = (stage: HTMLElement) =>
	requestAnimationFrame(() => {
		const field = stage.querySelector("input");
		if (!field) return;
		Object.getOwnPropertyDescriptor(
			HTMLInputElement.prototype,
			"value",
		)?.set?.call(field, NAME.value);
		field.dispatchEvent(new Event("input", { bubbles: true }));
		requestAnimationFrame(() =>
			press(
				[...stage.querySelectorAll("button")].find(
					(button) => button.textContent === CONFIRM.act.label,
				),
			),
		);
	});

// The side sheet (the bottom sheet on touch) in its four states (the failed
// one a line under the act in the foot, under the head's act on touch) on its
// form cell, a second page with back on the body icon act cell, the Split's pane on the
// pane cell (two Sections in its body, a sections gap apart), and the confirm on the primary act cell: its typed name blocked
// on `disabled` (the reason shown as the side sheet's is), typed and its act
// running on `loading`. The rows inside are context. The bar fit cell draws the
// docked form, since the docked foot draws no matrix cell of its own: a
// conversation with a four-question sheet in its foot at a phone's height.
export function drawSheet(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	const { state } = frame;
	if (cell === "SHEET_SIDE.fit.form")
		return (
			<Stage contain ready={state === "disabled" ? pressSubmit : undefined}>
				<Sheet
					open
					onClose={act}
					title="Edit project"
					description="acme-web · production"
					submit={submitOf(state)}
					foot={state === "rest" ? "Applies from the next deploy." : undefined}
					failed={
						state === "error"
							? "Couldn't save the project. Try again."
							: undefined
					}
				>
					<StandInRows ground="list" />
				</Sheet>
			</Stage>
		);
	if (cell === "ICON_BUTTON.fit.body" && state === "rest")
		return (
			<Stage contain>
				<Sheet
					open
					onClose={act}
					back={act}
					title="Production environment"
					description="acme-web · what every production deploy reads"
					submit={submitOf(state)}
				>
					<OneField />
				</Sheet>
			</Stage>
		);
	if (cell === "SHEET_SIDE.fit.pane" && state === "rest")
		return (
			<Stage contain>
				<Sheet open onClose={act} title="Details" fit="pane">
					<Section title="Properties">
						<StandInRows ground="list" />
					</Section>
					<Section title="Activity">
						<StandInRows ground="list" />
					</Section>
				</Sheet>
			</Stage>
		);
	if (cell === "BUTTON.fit.bar") return <DockedQuestions state={state} />;
	if (cell === "BUTTON.act.primary")
		return (
			<Stage
				contain
				ready={
					state === "disabled"
						? pressSubmit
						: state === "loading"
							? typeAndRun
							: undefined
				}
			>
				<ConfirmSheet
					open
					onDone={act}
					entry={
						state === "rest" ? { ...CONFIRM, confirmName: undefined } : CONFIRM
					}
				/>
			</Stage>
		);
	return undefined;
}
