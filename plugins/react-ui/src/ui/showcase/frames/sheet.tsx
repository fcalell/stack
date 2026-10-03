import type { Act } from "@fcalell/ui-core/descriptors";
import { Section } from "../../components/section/index.tsx";
import { ConfirmSheet } from "../../components/sheet/confirm.tsx";
import { Sheet } from "../../components/sheet/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { StandInRows } from "./layout-context.tsx";
import { press, Stage } from "./overlay-stage.tsx";

const act = () => {};

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

// The side sheet (the bottom sheet on touch) in its three states on its
// form cell, a second page with back on the body icon act cell, the Split's pane on the
// pane cell, and the confirm on the primary act cell: its typed name blocked
// on `disabled` (the reason shown as the side sheet's is), typed and its act
// running on `loading`. The rows inside are context.
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
					<StandInRows ground="list" />
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
				</Sheet>
			</Stage>
		);
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
