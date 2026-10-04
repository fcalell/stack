import type { Switcher } from "@fcalell/ui-core/descriptors";
import { SWITCHER, text, textStrong } from "@fcalell/ui-core/variants";
import { useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { Avatar } from "../avatar";
import { Icon } from "../icon";
import { PickSheet, useOptionGroups } from "../picker/sheet";

const TRIGGER = "flex-row items-center min-w-0";
const NAME = "shrink";
const GLYPH = "shrink-0";

// The switcher is a pick: its trigger in a Place's top bar, which draws it
// from the Shell's `Switcher`, and the pick's sheet (the options with their
// avatars under the switcher's label, the current one ticked, the act that
// makes a new one under a hairline). Outside the package's exports.
export function SwitcherPick({ switcher }: { switcher: Switcher }) {
	const [open, setOpen] = useState(false);
	const groups = useOptionGroups(switcher.options);
	const current = groups.flat.find((option) => option.value === switcher.value);
	const name = current?.label ?? switcher.label;
	return (
		<>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={switcher.label}
				accessibilityValue={{ text: name }}
				accessibilityState={{ expanded: open }}
				onPress={() => setOpen(true)}
				className={cn(SWITCHER, TRIGGER)}
			>
				<Avatar name={name} src={current?.avatar?.src} />
				<RNText
					numberOfLines={1}
					className={cn(
						text({ role: "body" }),
						textStrong({ role: "body" }),
						NAME,
					)}
				>
					{name}
				</RNText>
				<View className={GLYPH}>
					<Ink.Provider value="ink-meta">
						<Icon name="ChevronsUpDown" />
					</Ink.Provider>
				</View>
			</Pressable>
			<PickSheet
				title={switcher.label}
				groups={groups}
				value={switcher.value}
				onChange={switcher.onChange}
				act={switcher.act}
				open={open}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}
