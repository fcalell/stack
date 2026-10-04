import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { cn } from "@fcalell/ui-core/cn";
import type { Option, OptionGroup } from "@fcalell/ui-core/descriptors";
import {
	choose,
	chosenOf,
	isOneChoice,
	listBusy,
	listState,
	type OneChoice,
	type OptionChoice,
	type OptionShape,
	type OptionSlots,
	optionShape,
	optionsOf,
	optionsShape,
	retryOf,
	type SetChoice,
} from "@fcalell/ui-core/list-state";
import {
	lineBox,
	OPTION_CHILDREN,
	OPTION_GROUP_LABEL,
	OPTION_INDENT,
	OPTION_LINE,
	OPTION_LIST,
	OPTION_RADIO_DOT,
	optionRadio,
	ROW_META_LINE,
	row,
	SELECT_GROUP,
	skeleton,
	skeletonLane,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { Fragment, type ReactNode, use, useId } from "react";
import type { Closed } from "../../lib/closed.ts";
import { GroupName, LabelTarget } from "../../lib/field.ts";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";
import { Checkbox } from "../checkbox/index.tsx";
import { Chip } from "../chip/index.tsx";
import { useBackAct } from "../empty-state/missing.tsx";
import type { QueryLike } from "../query-boundary/index.tsx";

const LIST = "flex flex-col";
const GROUP = "flex flex-col";
// The row is the label of its box or radio: a press anywhere toggles or
// chooses it.
const OPTION = "flex items-center hover:bg-wash-hover active:bg-wash-press";
const LINE = "flex grow min-w-0 items-start";
// The box stands on its label's first line, a box one body line tall; the
// row is its target.
const BOX_LINE = "flex shrink-0 items-center h-lh";
const LABEL = "min-w-0 grow truncate";
const TEXT = "flex flex-col min-w-0 grow";
const TITLE = "truncate";
const DESCRIPTION_LINE = "flex flex-wrap items-center min-w-0";
// The radio is the box's size in its label's line, its dot centred; the
// focus ring is its own, as the checkbox's is.
const RADIO =
	"relative inline-flex shrink-0 items-center justify-center outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const CHILDREN = "flex";
const INDENT = "shrink-0";
const CHILDREN_BODY = "flex flex-col grow min-w-0";
// Loading, each row keeps its height: a box-sized skeleton on the label's
// line, and a bar at a label's length in a short label's lane on each line
// the row draws.
const LABEL_WAIT = "flex items-center";
const LINE_WAIT = "flex items-center h-lh";
const BAR_ROOM = "flex grow min-w-0";
const ROW_WAIT = "flex items-center";
const LABEL_BAR = "w-1/3";
const ROW_BARS = [
	["w-1/3", "w-1/2"],
	["w-2/3", "w-1/3"],
	["w-2/3", "w-1/2"],
	["w-1/2", "w-1/4"],
] as const;
// The failed, missing and empty lines: the sentence, and Retry or Back at its
// end.
const NOTE = "flex items-center";
const SENTENCE = "min-w-0 grow";
// The zero-width space gives an empty line its line box.
const EMPTY_LINE = "​";

/** Where an OptionList's options come from. */
type OptionSource<T, V extends string> =
	| {
			/** The choices, flat or under group labels. */
			options: readonly Option<V>[] | readonly OptionGroup<V>[];
			/** The options wait: skeleton rows stand in for them. */
			loading?: boolean;
			/** The sentence the card holds with no option; without it an empty set draws an empty card. */
			empty?: string;
			query?: never;
			option?: never;
			sentence?: never;
	  }
	| {
			/** The query whose items the check rows draw. */
			query: QueryLike<readonly T[]>;
			/** One function per check row slot, each called with a loaded item; the slots given are the shape the waiting rows draw. */
			option: OptionSlots<T, V>;
			/** What failed to load, beside the retry act. */
			sentence: string;
			/** The sentence the card holds when the query answers with no item. */
			empty: string;
			options?: never;
			loading?: never;
	  };

type OptionListBase<V extends string, T> = OptionSource<T, V> & {
	/** What a chosen option opens, under the first one chosen at its label's start. */
	children?: ReactNode;
};

/** One choice or several from one list, static or from a query: `value` one value or null draws radio rows, a set check rows. `V` is read off the options or the `option` map's `value`. */
export type OptionListProps<V extends string = string, T = unknown> = Closed &
	OptionListBase<V, T> &
	OptionChoice<V>;

function groupsOf<V extends string>(
	options: readonly Option<V>[] | readonly OptionGroup<V>[],
): readonly { label?: string; options: readonly Option<V>[] }[] {
	const first = options[0];
	if (first === undefined || !("options" in first))
		return [{ options: options as readonly Option<V>[] }];
	return options as readonly OptionGroup<V>[];
}

function GroupLabel(props: { children: ReactNode }) {
	return (
		<p
			className={cn(
				OPTION_GROUP_LABEL,
				text({ role: "meta" }),
				textStrong({ role: "meta" }),
			)}
		>
			{props.children}
		</p>
	);
}

// The waiting check rows in the slots the options declare: a group label's
// bar over them when they stand under labels, a description bar under each
// label when they are described.
function Wait(props: { shape: OptionShape }) {
	const { shape } = props;
	return (
		<div aria-hidden className={cn(SELECT_GROUP, GROUP)}>
			{shape.group ? (
				<p
					className={cn(
						OPTION_GROUP_LABEL,
						lineBox({ role: "meta" }),
						LABEL_WAIT,
					)}
				>
					{EMPTY_LINE}
					<span className={cn(skeletonLane({ role: "meta" }), BAR_ROOM)}>
						<span className={cn(skeleton({ kind: "line" }), LABEL_BAR)} />
					</span>
				</p>
			) : null}
			{ROW_BARS.map(([label, description], at) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: fixed stand-ins
					key={at}
					className={cn(
						row({ lines: shape.description ? "two" : "one" }),
						ROW_WAIT,
					)}
				>
					<span className={cn(OPTION_LINE, LINE)}>
						<span className={cn(lineBox({ role: "body" }), BOX_LINE)}>
							<span className={skeleton({ kind: "check" })} />
						</span>
						<span className={TEXT}>
							<span className={cn(lineBox({ role: "body" }), LINE_WAIT)}>
								<span className={cn(skeletonLane({ role: "body" }), BAR_ROOM)}>
									<span className={cn(skeleton({ kind: "line" }), label)} />
								</span>
							</span>
							{shape.description ? (
								<span
									className={cn(
										ROW_META_LINE,
										lineBox({ role: "meta" }),
										LINE_WAIT,
									)}
								>
									<span
										className={cn(skeletonLane({ role: "meta" }), BAR_ROOM)}
									>
										<span
											className={cn(skeleton({ kind: "line" }), description)}
										/>
									</span>
								</span>
							) : null}
						</span>
					</span>
				</div>
			))}
		</div>
	);
}

/** Option rows on a hairline card, each the Checkbox (several choices) or the radio (one choice, a radiogroup) on its label's first line, a description and the recommended mark on the line under it; the row under the pointer washes, the checked box or the ringed dot is the choice. The children stand under the first chosen option. From a query it draws its states in the card: waiting rows in the slots `option` declares, a failed line with `sentence` and Retry, a line saying it no longer exists with Back (never Retry) when the query answers not found, the `empty` sentence, then the rows. */
export function OptionList<V extends string = string, T = unknown>(
	props: Closed & OptionListBase<V, T> & OneChoice<V>,
): ReactNode;
export function OptionList<V extends string = string, T = unknown>(
	props: Closed & OptionListBase<V, T> & SetChoice<V>,
): ReactNode;
export function OptionList<V extends string = string, T = unknown>(
	props: OptionListProps<V, T>,
) {
	const { children } = props;
	const words = useWords();
	const back = useBackAct();
	const named = use(GroupName);
	const ids = useId();
	const input = {
		query: props.query,
		items: props.options,
		loading: props.loading,
		sectionLoading: false,
		inSection: false,
		hasEmpty: props.empty !== undefined,
	};
	const state = listState(input);
	const frame = (body: ReactNode) => (
		// biome-ignore lint/a11y/useSemanticElements: a group of rows, not a form's fieldset
		<div
			role="group"
			aria-busy={listBusy(input) || undefined}
			aria-labelledby={named?.labelledBy}
			aria-describedby={named?.describedBy}
			className={cn(OPTION_LIST, LIST)}
		>
			{body}
		</div>
	);
	if (state === "pending")
		return frame(
			<Wait
				shape={
					props.option ? optionShape(props.option) : optionsShape(props.options)
				}
			/>,
		);
	if (state === "missing")
		return frame(
			<div className={cn(row({ lines: "one" }), NOTE)}>
				<span className={cn(text({ role: "meta" }), SENTENCE)}>
					{words.missing}
				</span>
				{back ? (
					<Button
						act="secondary"
						fit="bar"
						label={back.label}
						onAct={back.onAct}
					/>
				) : null}
			</div>,
		);
	if (state === "failed" && props.query !== undefined)
		return frame(
			<div className={cn(row({ lines: "one" }), NOTE)}>
				<span className={cn(text({ role: "meta" }), SENTENCE)}>
					{props.sentence}
				</span>
				<Button
					act="secondary"
					fit="bar"
					label={words.retry}
					onAct={retryOf(props.query)}
				/>
			</div>,
		);
	if (state === "empty")
		return frame(
			<p className={cn(row({ lines: "one" }), NOTE, text({ role: "meta" }))}>
				{props.empty}
			</p>,
		);
	const options = props.query
		? optionsOf(props.query.data ?? [], props.option)
		: props.options;
	const one = isOneChoice(props);
	const chosenValues = chosenOf(props);
	const first = chosenValues[0];
	const rows = groupsOf(options).map((group, at) => (
		// biome-ignore lint/a11y/useSemanticElements: a group of rows, not a form's fieldset
		<div
			key={group.label ?? at}
			role="group"
			aria-label={group.label}
			className={cn(SELECT_GROUP, GROUP)}
		>
			{group.label ? <GroupLabel>{group.label}</GroupLabel> : null}
			{group.options.map((option, place) => {
				const chosen = chosenValues.includes(option.value);
				const marked = option.description || option.recommended;
				const labelId = `${ids}-${at}-${place}`;
				const saidId = `${labelId}-said`;
				const target = {
					labelledBy: labelId,
					describedBy: option.description ? saidId : undefined,
				};
				return (
					<Fragment key={option.value}>
						{/* biome-ignore lint/a11y/noLabelWithoutControl: the Checkbox or the radio inside is its control */}
						<label
							className={cn(row({ lines: marked ? "two" : "one" }), OPTION)}
						>
							<span className={cn(OPTION_LINE, LINE)}>
								<span className={cn(lineBox({ role: "body" }), BOX_LINE)}>
									{one ? (
										<Radio.Root
											value={option.value}
											aria-labelledby={target.labelledBy}
											aria-describedby={target.describedBy}
											className={cn(
												optionRadio({
													state: chosen ? "checked" : "unchecked",
												}),
												RADIO,
											)}
										>
											<Radio.Indicator className={OPTION_RADIO_DOT} />
										</Radio.Root>
									) : (
										<LabelTarget value={target}>
											<Checkbox
												checked={chosen}
												onChange={() => choose<V>(props, option.value)}
												label={option.label}
											/>
										</LabelTarget>
									)}
								</span>
								{marked ? (
									<span className={TEXT}>
										<span
											id={labelId}
											className={cn(text({ role: "body" }), TITLE)}
										>
											{option.label}
										</span>
										<span className={cn(ROW_META_LINE, DESCRIPTION_LINE)}>
											{option.description ? (
												<span id={saidId} className={text({ role: "meta" })}>
													{option.description}
												</span>
											) : null}
											{option.recommended ? (
												<Chip family="neutral" label={words.recommended} />
											) : null}
										</span>
									</span>
								) : (
									<span
										id={labelId}
										className={cn(text({ role: "body" }), LABEL)}
									>
										{option.label}
									</span>
								)}
							</span>
						</label>
						{option.value === first && chosen && children ? (
							<div className={cn(OPTION_CHILDREN, CHILDREN)}>
								<span aria-hidden className={cn(OPTION_INDENT, INDENT)} />
								<div className={CHILDREN_BODY}>{children}</div>
							</div>
						) : null}
					</Fragment>
				);
			})}
		</div>
	));
	if (!one) return frame(rows);
	// One choice is a radiogroup: Base UI moves between its radios by the
	// arrows and chooses the one it reaches. Null, not undefined, keeps it
	// controlled while nothing is chosen.
	return (
		<RadioGroup<V | null>
			value={props.value}
			onValueChange={(next) => {
				if (next !== null) choose<V>(props, next);
			}}
			aria-labelledby={named?.labelledBy}
			aria-describedby={named?.describedBy}
			className={cn(OPTION_LIST, LIST)}
		>
			{rows}
		</RadioGroup>
	);
}
