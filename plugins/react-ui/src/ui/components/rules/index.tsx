import { cn } from "@fcalell/ui-core/cn";
import type {
	Act,
	EitherPick,
	Rule,
	RuleValue,
} from "@fcalell/ui-core/descriptors";
import { isTyped, marked, pairSet, termLabel } from "@fcalell/ui-core/rules";
import {
	RULE_CARD,
	RULE_ROW,
	RULES,
	ruleArrow,
} from "@fcalell/ui-core/variants";
import { useMemo, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { InlineField } from "../../lib/field.ts";
import { useTouch } from "../../lib/media.ts";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";
import { Group } from "../group/index.tsx";
import { Icon } from "../icon/index.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { Input } from "../input/index.tsx";
import { Picker } from "../picker/index.tsx";
import { Text } from "../text/index.tsx";

// From `tablet` the list is one grid of four columns (the terms share what
// the arrow or operator and the remove act leave) and each row a subgrid, so
// the columns align across rows. On touch each rule is a card of stacked
// terms in a Group.
const GRID = "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]";
const ROW = "col-span-4 grid grid-cols-subgrid items-center";
const ADD = "col-span-4 flex";
const STACKED = "flex flex-col items-stretch";
const STACK = "flex flex-col items-start gap-pair";
const GROUP_SLOT = "self-stretch";
const MARK = "flex shrink-0 items-center justify-center";
const REMOVE_END = "self-end";

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
	const rule = useMemo(() => ({ label, focus: typing }), [label, typing]);
	if (isTyped(value))
		return (
			<InlineField value={rule}>
				<Input
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
			</InlineField>
		);
	return (
		<Picker
			fit="bar"
			label={label}
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
	if (value.pick) return <Picker fit="bar" {...value.pick} />;
	if (value.picks) return <Picker fit="bar" {...value.picks} />;
	return <Either {...value.either} />;
}

function RuleRow<V extends string | null>({
	rule,
	touch,
}: {
	rule: Rule<V>;
	touch: boolean;
}) {
	const words = useWords();
	const { terms } = rule;
	const named = terms.from ? termLabel(terms.from) : terms.field.label;
	const middle = terms.from ? (
		<span
			className={cn(
				ruleArrow({ state: pairSet(terms) ? "set" : "unset" }),
				MARK,
			)}
		>
			<Icon name={touch ? "ArrowDown" : "ArrowRight"} fit="meta" />
		</span>
	) : (
		<Text role="meta">{terms.operator}</Text>
	);
	// The grid's fourth column stands empty for a rule that cannot go; a
	// stacked card has no column to hold.
	const absent = touch ? null : <span />;
	const remove = rule.onRemove ? (
		<span className={cn(MARK, touch && REMOVE_END)}>
			<IconButton
				icon="X"
				fit="bar"
				label={`${words.remove} ${named}`}
				onAct={rule.onRemove}
			/>
		</span>
	) : (
		absent
	);
	const Row = touch ? "div" : "li";
	return (
		<Row
			role={touch ? "listitem" : undefined}
			className={cn(RULE_ROW, touch ? cn(RULE_CARD, STACKED) : ROW)}
		>
			{terms.from ? (
				<Term value={terms.from} />
			) : (
				<Picker fit="bar" {...terms.field} />
			)}
			{middle}
			<Term value={terms.from ? terms.to : terms.value} />
			{remove}
		</Row>
	);
}

/** A list of rules, each one row of terms aligned in columns: a pair maps a source to a target, a condition is a field, fixed operator words and a value. */
export function Rules<V extends string | null = string>({
	rules,
	add,
}: RulesProps<V>) {
	const touch = useTouch();
	const rows = rules.map((rule) => (
		<RuleRow key={rule.id} rule={rule} touch={touch} />
	));
	const act = add ? (
		<Button
			act="secondary"
			fit="bar"
			icon="Plus"
			label={add.label}
			onAct={add.onAct}
			blocked={add.blocked}
			loading={add.loading}
		/>
	) : null;
	if (touch)
		return (
			<div className={STACK}>
				{rows.length > 0 ? (
					// biome-ignore lint/a11y/useSemanticElements: the Group's card sits between the list and its cards, and a `ul` over it cannot hold its `div`
					<div role="list" className={GROUP_SLOT}>
						<Group>{rows}</Group>
					</div>
				) : null}
				{act}
			</div>
		);
	return (
		<ul className={cn(RULES, GRID)}>
			{rows}
			{act ? <li className={ADD}>{act}</li> : null}
		</ul>
	);
}
