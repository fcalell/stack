import type { Option, OptionGroup } from "@fcalell/ui-core/descriptors";
import {
	COUNT,
	checkbox,
	GROUP_GROUND,
	HAIRLINE,
	row,
	text,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { LoadingRows } from "../../lib/loading";
import { flatOptions } from "../../lib/pick-sheet";
import { useWords } from "../../lib/words";

export interface OptionListProps<V extends string = string> extends Closed {
	options: readonly Option<V>[] | readonly OptionGroup<V>[];
	value: readonly V[];
	onChange: (value: V[]) => void;
	loading?: boolean;
	children?: ReactNode;
}

// Check rows with a description line, the recommended one marked; a press
// toggles its option and `onChange` hears the whole set. The children sit
// under the first chosen option.
export function OptionList<V extends string>({
	options,
	value,
	onChange,
	loading,
	children,
}: OptionListProps<V>) {
	const words = useWords();
	if (loading) return <LoadingRows />;
	const first = value[0];
	const toggle = (option: V) =>
		onChange(
			value.includes(option)
				? value.filter((each) => each !== option)
				: [...value, option],
		);
	return (
		<View className={cn(GROUP_GROUND, "overflow-hidden")}>
			{flatOptions(options).map((option, index) => {
				const selected = value.includes(option.value);
				return (
					<View
						key={option.value}
						className={cn(index > 0 && "border-t", index > 0 && HAIRLINE)}
					>
						<Pressable
							accessibilityRole="checkbox"
							accessibilityState={{ checked: selected }}
							onPress={() => toggle(option.value)}
							className={cn(
								row({ state: "rest" }),
								"flex-row items-center active:bg-wash-press",
							)}
						>
							<View
								className={cn(
									checkbox({ state: selected ? "checked" : "unchecked" }),
									"size-6 items-center justify-center",
								)}
							>
								{selected ? (
									<View className="size-2 rounded-full bg-on-accent" />
								) : null}
							</View>
							<View className="min-w-0 flex-1 gap-pair">
								<View className="flex-row items-center gap-inside">
									<RNText className={text({ role: "body" })}>
										{option.label}
									</RNText>
									{option.recommended ? (
										<RNText className={COUNT}>{words.recommended}</RNText>
									) : null}
								</View>
								{option.description ? (
									<RNText className={text({ role: "meta" })}>
										{option.description}
									</RNText>
								) : null}
							</View>
						</Pressable>
						{option.value === first && children ? (
							<View className="px-card pb-pair">{children}</View>
						) : null}
					</View>
				);
			})}
		</View>
	);
}
