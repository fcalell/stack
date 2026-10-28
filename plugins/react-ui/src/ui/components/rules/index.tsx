import { cn } from "@fcalell/ui-core/cn";
import type { EitherPick, Rule, RuleValue } from "@fcalell/ui-core/descriptors";
import { isTyped, marked, pairSet, ruleName } from "@fcalell/ui-core/rules";
import {
	BLOCK_IN,
	RULE_CARD,
	RULE_ROW,
	RULES,
	ruleArrow,
} from "@fcalell/ui-core/variants";
import { Fragment, useMemo, useRef, useState } from "react";
import { type Act, wiringOf } from "../../lib/act.ts";
import { useArrivals } from "../../lib/arrive.ts";
import type { Closed } from "../../lib/closed.ts";
import { useTouch } from "../../lib/media.ts";
import { useWords } from "../../lib/words.tsx";
import { ButtonBase } from "../button/base.tsx";
import { Button } from "../button/index.tsx";
import { Icon } from "../icon/index.tsx";
import { HeldInput } from "../input/base.tsx";
import { HeldPicker } from "../picker/base.tsx";
import { Picker } from "../picker/index.tsx";
import { SheetCard } from "../section/card.tsx";
import { Text } from "../text/index.tsx";

// From `tablet` each rule is one flex row: its two terms share the row's
// width equally (the same basis, so their columns align across rows), the
// arrow or operator between them at a floor of the remove act's width, so
// the short words and the arrow line up. A rule that cannot go keeps the
// remove act's room as the row's end padding, so the terms stay aligned.
// A term's control yields to its column (`*:min-w-0`): a typed term's box
// would otherwise hold the input's own width, run past its column and draw
// its act over the next term; its value truncates before its act instead.
// A list narrower than its one-row width (`RULES_ONE_ROW`, the `rules`
// container: two terms at their floor of characters, the arrow and the remove
// act) stacks each rule's terms rather than cut them (`rules-stacked:`), the
// arrow turned down between them and the remove act beside the last term on
// its line, a hairline between the rules. On touch each rule is a card of
// stacked terms in a sheet, its remove act beside the last term on that
// term's line.
const LIST = "@container/rules flex flex-col";
const ROW =
	"flex items-center rules-stacked:flex-col rules-stacked:items-stretch rules-stacked:not-first:border-t rules-stacked:not-first:border-edge rules-stacked:not-first:pt-gap";
const KEPT =
	"pe-[calc(var(--spacing-control)+var(--spacing-gap))] rules-stacked:pe-0";
const TERM =
	"flex min-w-0 grow basis-0 *:grow *:min-w-0 rules-stacked:basis-auto";
const MIDDLE = "min-w-control";
// The arrow points down where the terms stack.
const TURN = "flex rules-stacked:rotate-90";
// The last term and the remove act: items of the row where it is one, one
// line of their own where the terms stack.
const TAIL =
	"contents rules-stacked:flex rules-stacked:items-center rules-stacked:gap-gap";
const ADD = "flex";
const STACKED = "flex flex-col items-stretch";
const STACK = "flex flex-col items-start gap-gap";
const GROUP_SLOT = "self-stretch";
const ADD_WRAP = "max-w-full";
const MARK = "flex shrink-0 items-center justify-center";
// On touch the last term and the remove act share one line of the card.
const LAST = "flex items-center";
const LAST_TERM = "flex min-w-0 grow *:grow *:min-w-0";

/** The rules, each one row of terms. */
export interface RulesProps<V extends string | null = string> extends Closed {
	/** The rules in order, each a pair (`from`, `to`) or a condition (`field`, `operator`, `value`), with its own `onRemove` and an `id` unique in the list. */
	rules: readonly Rule<V>[];
	/** The act that adds a rule, ending the list. */
	add?: Act;
}

// A picked option or a typed value: the pick (its list ends with the act that
// types), or the typed `Input` (its act picks again). An act the viewer ran
// types into a field that takes focus; a typed value that arrives so does not.
function Either<V extends string | null>(props: EitherPick<V>) {
	const { label, options, value, onChange, placeholder } = props;
	const words = useWords();
	const [typing, setTyping] = useState(false);
	const marks = useMemo(() => marked(options), [options]);
	const rule = { label, focus: typing };
	if (isTyped(value))
		return (
			<HeldInput
				inline={rule}
				value={value.typed}
				onChange={(typed) => onChange({ typed })}
				placeholder={placeholder}
				act={{
					icon: "ListFilter",
					label: words.pickValue,
					onAct: () => {
						setTyping(false);
						onChange({});
					},
				}}
			/>
		);
	return (
		<Picker
			label={label}
			fit="bar"
			options={marks}
			value={value.picked}
			onChange={(picked) => onChange({ picked })}
			act={{
				icon: "TextCursorInput",
				label: words.typeValue,
				onAct: () => {
					setTyping(true);
					onChange({ typed: "" });
				},
			}}
		/>
	);
}

function Term<V extends string | null>({ value }: { value: RuleValue<V> }) {
	if (value.pick) return <Picker {...value.pick} fit="bar" />;
	if (value.picks) return <HeldPicker fold {...value.picks} fit="bar" />;
	return <Either {...value.either} />;
}

// A rule is a block of the list: named for the page's block move (the viewer's
// remove runs in it), and fading in if it came on its own once the list was
// drawn, held from the first render.
function RuleRow<V extends string | null>({
	rule,
	onRemove,
	touch,
	arrived,
}: {
	rule: Rule<V>;
	onRemove: (() => void) | undefined;
	touch: boolean;
	arrived: boolean;
}) {
	const words = useWords();
	const [fades] = useState(arrived);
	const { terms } = rule;
	const middle = terms.from ? (
		<span
			className={cn(
				ruleArrow({ state: pairSet(terms) ? "set" : "unset" }),
				MARK,
				!touch && MIDDLE,
			)}
		>
			{touch ? (
				<Icon name="ArrowDown" fit="meta" />
			) : (
				<span className={TURN}>
					<Icon name="ArrowRight" fit="meta" />
				</span>
			)}
		</span>
	) : (
		<span className={cn(MARK, !touch && MIDDLE)}>
			<Text role="meta">{terms.operator}</Text>
		</span>
	);
	const remove = onRemove ? (
		<span data-rule-remove="" className={MARK}>
			<Button
				glyph
				icon="X"
				label={`${words.remove} ${ruleName(terms)}`}
				onAct={onRemove}
			/>
		</span>
	) : null;
	const last = <Term value={terms.from ? terms.to : terms.value} />;
	const Row = touch ? "div" : "li";
	return (
		<Row
			role={touch ? "listitem" : undefined}
			className={cn(
				RULE_ROW,
				touch ? cn(RULE_CARD, STACKED) : cn(ROW, !onRemove && KEPT),
				fades && BLOCK_IN,
			)}
		>
			<span className={touch ? undefined : TERM}>
				{terms.from ? (
					<Term value={terms.from} />
				) : (
					<Picker {...terms.field} fit="bar" />
				)}
			</span>
			{middle}
			{!touch ? (
				<span className={TAIL}>
					<span className={TERM}>{last}</span>
					{remove}
				</span>
			) : remove ? (
				<div className={cn(RULE_ROW, LAST)}>
					<span className={LAST_TERM}>{last}</span>
					{remove}
				</div>
			) : (
				<span>{last}</span>
			)}
		</Row>
	);
}

/** A list of rules, each one row of terms aligned in columns: a pair maps a source to a target, a condition is a field, fixed operator words and a value. In a list narrower than its one-row width each rule stacks its terms, so no term is cut under its floor of characters. */
export function Rules<V extends string | null = string>({
	rules,
	add,
}: RulesProps<V>) {
	const touch = useTouch();
	const list = useRef<HTMLElement | null>(null);
	// One ref for the list element of either density, a `ul` or a `div`.
	const hold = (element: HTMLElement | null) => {
		list.current = element;
	};
	const removable = rules.filter((rule) => rule.onRemove);
	// A removed rule hands focus to the next row's remove act, else the
	// previous one's, else the add act, so a keyboard viewer keeps their place.
	const removeRule = (rule: Rule<V>) => () => {
		const acts = list.current?.querySelectorAll("[data-rule-remove] button");
		const at = removable.indexOf(rule);
		const next =
			acts?.[at + 1] ??
			acts?.[at - 1] ??
			list.current?.querySelector("[data-rule-add] button");
		rule.onRemove?.();
		if (next instanceof HTMLElement) next.focus();
	};
	const arrived = useArrivals(
		rules.map((rule) => rule.id),
		true,
	);
	const rowOf = (rule: Rule<V>) => (
		<RuleRow
			rule={rule}
			onRemove={rule.onRemove && removeRule(rule)}
			touch={touch}
			arrived={arrived.has(rule.id)}
		/>
	);
	const act = add ? (
		<ButtonBase
			act="secondary"
			icon="Plus"
			label={add.label}
			onAct={add.onAct}
			blocked={add.blocked}
			{...wiringOf(add)}
		/>
	) : null;
	if (touch)
		return (
			<div ref={hold} className={STACK}>
				{rules.length > 0 ? (
					// biome-ignore lint/a11y/useSemanticElements: the sheet's card sits between the list and its cards, and a `ul` over it cannot hold its `div`
					<div role="list" className={GROUP_SLOT}>
						<SheetCard>
							{rules.map((rule) => (
								<Fragment key={rule.id}>{rowOf(rule)}</Fragment>
							))}
						</SheetCard>
					</div>
				) : null}
				{act ? (
					<div data-rule-add="" className={ADD_WRAP}>
						{act}
					</div>
				) : null}
			</div>
		);
	return (
		<ul ref={hold} className={cn(RULES, LIST)}>
			{rules.map((rule) => (
				<Fragment key={rule.id}>{rowOf(rule)}</Fragment>
			))}
			{act ? (
				<li data-rule-add="" className={ADD}>
					{act}
				</li>
			) : null}
		</ul>
	);
}
