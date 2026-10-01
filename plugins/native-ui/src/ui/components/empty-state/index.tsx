import type { Act, IconName } from "@fcalell/ui-core/descriptors";
import { EMPTY_MARK, text } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { Button } from "../button";
import { Icon } from "../icon";

export interface EmptyStateProps extends Closed {
	icon?: IconName;
	title?: string;
	sentence: string;
	act?: Act;
	children?: ReactNode;
}

// One sentence and the way to make the first one; with a title it centers as
// a first screen. Alone in a body it centres in the space the body leaves;
// what the screen still has to show goes in the children, and then it stays
// at the top above them. The mark is `icon` in a control disc.
export function EmptyState({
	icon,
	title,
	sentence,
	act,
	children,
}: EmptyStateProps) {
	return (
		<View
			accessibilityRole="summary"
			className={cn(
				"items-center gap-fields py-sections",
				(title !== undefined || !children) && "flex-1 justify-center",
			)}
		>
			{icon ? (
				<View className={cn(EMPTY_MARK, "items-center justify-center")}>
					<Ink.Provider value="ink-meta">
						<Icon name={icon} fit="control" />
					</Ink.Provider>
				</View>
			) : null}
			{title !== undefined ? (
				<RNText className={cn(text({ role: "heading" }), "text-center")}>
					{title}
				</RNText>
			) : null}
			<RNText className={cn(text({ role: "meta" }), "text-center")}>
				{sentence}
			</RNText>
			{act ? <Button act="secondary" {...act} /> : null}
			{children}
		</View>
	);
}
