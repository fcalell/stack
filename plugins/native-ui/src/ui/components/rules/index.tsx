import type { EitherPick, Rule, RuleValue } from "@fcalell/ui-core/descriptors";
import { isTyped, marked, pairSet, ruleName } from "@fcalell/ui-core/rules";
import {
	RULE_CARD,
	RULE_ROW,
	ruleArrowContentTone,
} from "@fcalell/ui-core/variants";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { type Act, wiringOf } from "../../lib/act";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { useWords } from "../../lib/words";
import { Button } from "../button";
import { ButtonBase } from "../button/base";
import { Icon } from "../icon";
import { HeldInput } from "../input/base";
import { Picker } from "../picker";
import { SheetEntries } from "../section/card";
import { Text } from "../text";

const STACK = "items-start gap-gap";
const GROUP_SLOT = "self-stretch";
const MARK = "items-start";
const LAST = "flex-row items-center";
const LAST_TERM = "flex-1 min-w-0";

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
	if (value.pick) return <Picker {...value.pick} />;
	if (value.picks) return <Picker {...value.picks} />;
	return <Either {...value.either} />;
}

// One rule: its terms stacked in a card, the arrow or the operator between
// them and the remove act beside the last term, on its line.
function RuleRow<V extends string | null>({ rule }: { rule: Rule<V> }) {
	const words = useWords();
	const { terms } = rule;
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
			{terms.from ? <Term value={terms.from} /> : <Picker {...terms.field} />}
			{middle}
			<View className={cn(RULE_ROW, LAST)}>
				<View className={LAST_TERM}>
					<Term value={terms.from ? terms.to : terms.value} />
				</View>
				{rule.onRemove ? (
					<Button
						glyph
						icon="X"
						label={`${words.remove} ${ruleName(terms)}`}
						onAct={() => rule.onRemove?.()}
					/>
				) : null}
			</View>
		</View>
	);
}

// A list of rules, each a card of stacked terms in a sheet: a pair maps a
// source to a target, a condition is a field, fixed operator words and a
// value. `add` ends the list.
export function Rules<V extends string | null = string>({
	rules,
	add,
}: RulesProps<V>) {
	return (
		<View className={STACK}>
			{rules.length > 0 ? (
				<View role="list" className={GROUP_SLOT}>
					<SheetEntries
						entries={rules.map((rule) => ({
							key: rule.id,
							node: <RuleRow rule={rule} />,
						}))}
					/>
				</View>
			) : null}
			{add ? (
				<ButtonBase
					act="secondary"
					icon="Plus"
					label={add.label}
					onAct={add.onAct}
					blocked={add.blocked}
					{...wiringOf(add)}
				/>
			) : null}
		</View>
	);
}
