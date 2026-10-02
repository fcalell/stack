import { cn } from "@fcalell/ui-core/cn";
import type { Option, OptionGroup } from "@fcalell/ui-core/descriptors";
import {
	lineBox,
	OPTION_CHILDREN,
	OPTION_GROUP_LABEL,
	OPTION_INDENT,
	OPTION_LINE,
	OPTION_LIST,
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
import { Checkbox } from "../checkbox/index.tsx";
import { Chip } from "../chip/index.tsx";

const LIST = "flex flex-col";
const GROUP = "flex flex-col";
// The row is the label of its box: a press anywhere toggles it.
const OPTION = "flex items-center hover:bg-wash-hover active:bg-wash-press";
const LINE = "flex grow min-w-0 items-start";
// The box stands on its label's first line, a box one body line tall; the
// row is its target.
const BOX_LINE = "flex shrink-0 items-center h-lh";
const LABEL = "min-w-0 grow truncate";
const TEXT = "flex flex-col min-w-0 grow";
const TITLE = "truncate";
const DESCRIPTION_LINE = "flex flex-wrap items-center min-w-0";
const CHILDREN = "flex";
const INDENT = "shrink-0";
const CHILDREN_BODY = "flex flex-col grow min-w-0";
// Loading, each row keeps its height: a box-sized skeleton and a bar at a
// label's length in a short label's lane.
const LABEL_WAIT = "flex items-center";
const BAR_ROOM = "flex grow min-w-0";
const BOX_WAIT = "shrink-0";
const ROW_WAIT = "flex items-center";
const LABEL_BAR = "w-1/3";
const ROW_BARS = ["w-1/3", "w-2/3", "w-2/3", "w-1/2"] as const;
// The zero-width space gives an empty line its line box.
const EMPTY_LINE = "​";

/** Several choices from one list. `V` is read off the options. */
export interface OptionListProps<V extends string = string> extends Closed {
	/** The choices, flat or under group labels. */
	options: readonly Option<V>[] | readonly OptionGroup<V>[];
	/** The chosen options' values. */
	value: readonly V[];
	/** Hears the whole chosen set after a toggle. */
	onChange: (value: V[]) => void;
	/** The options wait: skeleton rows stand in for them. */
	loading?: boolean;
	/** What a chosen option opens, under the first one chosen at its label's start. */
	children?: ReactNode;
}

function groupsOf<V extends string>(
	options: OptionListProps<V>["options"],
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

/** Option rows on a hairline card, each the Checkbox on its label's first line, a description and the recommended mark on the line under it; the row under the pointer washes, the checked box is the choice. The children stand under the first chosen option. */
export function OptionList<V extends string = string>({
	options,
	value,
	onChange,
	loading,
	children,
}: OptionListProps<V>) {
	const words = useWords();
	const named = use(GroupName);
	const ids = useId();
	if (loading)
		return (
			// biome-ignore lint/a11y/useSemanticElements: a group of rows, not a form's fieldset
			<div
				role="group"
				aria-busy
				aria-label={words.loading}
				className={cn(OPTION_LIST, LIST)}
			>
				<div aria-hidden className={cn(SELECT_GROUP, GROUP)}>
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
					{ROW_BARS.map((bar, at) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: fixed stand-ins
							key={at}
							className={cn(row({ lines: "one" }), ROW_WAIT)}
						>
							<span className={cn(skeleton({ kind: "check" }), BOX_WAIT)} />
							<span className={cn(skeletonLane({ role: "body" }), BAR_ROOM)}>
								<span className={cn(skeleton({ kind: "line" }), bar)} />
							</span>
						</div>
					))}
				</div>
			</div>
		);
	const first = value[0];
	const toggle = (option: V) =>
		onChange(
			value.includes(option)
				? value.filter((each) => each !== option)
				: [...value, option],
		);
	return (
		// biome-ignore lint/a11y/useSemanticElements: a group of rows, not a form's fieldset
		<div
			role="group"
			aria-labelledby={named?.labelledBy}
			aria-describedby={named?.describedBy}
			className={cn(OPTION_LIST, LIST)}
		>
			{groupsOf(options).map((group, at) => (
				// biome-ignore lint/a11y/useSemanticElements: a group of rows, not a form's fieldset
				<div
					key={group.label ?? at}
					role="group"
					aria-label={group.label}
					className={cn(SELECT_GROUP, GROUP)}
				>
					{group.label ? <GroupLabel>{group.label}</GroupLabel> : null}
					{group.options.map((option, place) => {
						const chosen = value.includes(option.value);
						const marked = option.description || option.recommended;
						const labelId = `${ids}-${at}-${place}`;
						const saidId = `${labelId}-said`;
						return (
							<Fragment key={option.value}>
								{/* biome-ignore lint/a11y/noLabelWithoutControl: the Checkbox inside is its control */}
								<label
									className={cn(row({ lines: marked ? "two" : "one" }), OPTION)}
								>
									<span className={cn(OPTION_LINE, LINE)}>
										<span className={cn(lineBox({ role: "body" }), BOX_LINE)}>
											<LabelTarget
												value={{
													labelledBy: labelId,
													describedBy: option.description ? saidId : undefined,
												}}
											>
												<Checkbox
													checked={chosen}
													onChange={() => toggle(option.value)}
													label={option.label}
												/>
											</LabelTarget>
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
														<span
															id={saidId}
															className={text({ role: "meta" })}
														>
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
			))}
		</div>
	);
}
