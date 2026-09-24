import type { Option } from "@fcalell/ui-core/descriptors";
import {
	COUNT,
	checkbox,
	GROUP,
	HAIRLINE,
	row,
	text,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { useWords } from "../../lib/words";

export interface OptionListProps extends Closed {
	options: readonly Option[];
	value?: string;
	onChange: (value: string) => void;
	children?: ReactNode;
}

// Radio rows with a description line, the recommended one marked; the
// children sit under the chosen option.
export function OptionList({
	options,
	value,
	onChange,
	children,
}: OptionListProps) {
	const words = useWords();
	return (
		<View
			accessibilityRole="radiogroup"
			className={cn(GROUP, "overflow-hidden")}
		>
			{options.map((option, index) => {
				const selected = option.value === value;
				return (
					<View
						key={option.value}
						className={cn(index > 0 && "border-t", index > 0 && HAIRLINE)}
					>
						<Pressable
							accessibilityRole="radio"
							accessibilityState={{ selected }}
							onPress={() => onChange(option.value)}
							className={cn(
								row({ state: "rest" }),
								"flex-row items-center active:bg-edge",
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
								<View className="flex-row items-center gap-row">
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
						{selected && children ? (
							<View className="px-inset pb-stack">{children}</View>
						) : null}
					</View>
				);
			})}
		</View>
	);
}
