import { field, text } from "@fcalell/ui-core/variants";
import { useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { useWords } from "../../lib/words";
import { Input } from "../input";

export interface EnumInputProps extends Closed {
	value: readonly string[];
	onChange: (value: string[]) => void;
	placeholder?: string;
}

// A list of string values a machine reads (a schema's allowed values): each
// value on a `source` cell with its remove act, then a `source` field whose
// act adds the next one. A value already listed is refused, and the field
// says so under it. Order is the order of adding.
export function EnumInput({ value, onChange, placeholder }: EnumInputProps) {
	const words = useWords();
	const [draft, setDraft] = useState("");
	const next = draft.trim();
	const duplicate = value.includes(next);
	const add = () => {
		if (!next || duplicate) return;
		onChange([...value, next]);
		setDraft("");
	};
	return (
		<View className="gap-pair">
			{value.map((item, at) => (
				<View
					key={item}
					className={cn(
						field({ kind: "code", state: "default" }),
						"flex-row items-center gap-inside",
					)}
				>
					<RNText
						numberOfLines={1}
						className={cn(text({ role: "code" }), "flex-1")}
					>
						{item}
					</RNText>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={words.remove}
						accessibilityHint={item}
						onPress={() => onChange(value.filter((_, index) => index !== at))}
						className="min-h-11 justify-center"
					>
						<RNText
							className={cn(
								text({ role: "body" }),
								"font-medium text-accent-ink",
							)}
						>
							{words.remove}
						</RNText>
					</Pressable>
				</View>
			))}
			<Input
				kind="source"
				value={draft}
				onChange={setDraft}
				placeholder={placeholder}
				act={
					next
						? {
								label: words.add,
								onAct: add,
								blocked: duplicate ? words.duplicate : undefined,
							}
						: undefined
				}
			/>
			{next && duplicate ? (
				<RNText
					accessibilityLiveRegion="polite"
					className={text({ role: "meta" })}
				>
					{words.duplicate}
				</RNText>
			) : null}
		</View>
	);
}
