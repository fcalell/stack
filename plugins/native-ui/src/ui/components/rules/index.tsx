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
	ruleArrowContentTone,
} from "@fcalell/ui-core/variants";
import { useMemo, useState } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { InlineField } from "../../lib/field";
import { Ink } from "../../lib/ink";
import { useWords } from "../../lib/words";
import { Button } from "../button";
import { Group } from "../group";
import { Icon } from "../icon";
import { IconButton } from "../icon-button";
import { Input } from "../input";
import { Picker } from "../picker";
import { Text } from "../text";

const STACK = "items-start gap-pair";
const GROUP_SLOT = "self-stretch";
const MARK = "items-start";
const REMOVE = "self-end";

export interface RulesProps<V extends string | null = string> extends Closed {
	rules: readonly Rule<V>[];
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
			<InlineField.Provider value={rule}>
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
			</InlineField.Provider>
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

// One rule: its terms stacked in a card, the arrow or the operator between
// them and the remove act at the card's end.
function RuleRow<V extends string | null>({ rule }: { rule: Rule<V> }) {
	const words = useWords();
	const { terms } = rule;
	const named = terms.from ? termLabel(terms.from) : terms.field.label;
	const middle = terms.from ? (
		<View className={MARK}>
			<Ink.Provider
				value={ruleArrowContentTone(pairSet(terms) ? "set" : "unset")}
			>
				<Icon name="ArrowDown" fit="meta" />
			</Ink.Provider>
		</View>
	) : (
		<Text role="meta">{terms.operator}</Text>
	);
	return (
		<View role="listitem" className={cn(RULE_ROW, RULE_CARD)}>
			{terms.from ? (
				<Term value={terms.from} />
			) : (
				<Picker fit="bar" {...terms.field} />
			)}
			{middle}
			<Term value={terms.from ? terms.to : terms.value} />
			{rule.onRemove ? (
				<View className={REMOVE}>
					<IconButton
						icon="X"
						fit="bar"
						label={`${words.remove} ${named}`}
						onAct={rule.onRemove}
					/>
				</View>
			) : null}
		</View>
	);
}

// A list of rules, each a card of stacked terms in a Group: a pair maps a
// source to a target, a condition is a field, fixed operator words and a
// value. `add` ends the list.
export function Rules<V extends string | null = string>({
	rules,
	add,
}: RulesProps<V>) {
	return (
		<View className={STACK}>
			{rules.length > 0 ? (
				<View accessibilityRole="list" className={GROUP_SLOT}>
					<Group>
						{rules.map((rule) => (
							<RuleRow key={rule.id} rule={rule} />
						))}
					</Group>
				</View>
			) : null}
			{add ? (
				<Button
					act="secondary"
					fit="bar"
					icon="Plus"
					label={add.label}
					onAct={add.onAct}
					blocked={add.blocked}
					loading={add.loading}
				/>
			) : null}
		</View>
	);
}
