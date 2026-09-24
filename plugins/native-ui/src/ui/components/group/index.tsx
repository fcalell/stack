import { GROUP, HAIRLINE } from "@fcalell/ui-core/variants";
import { Children, type ReactNode } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { LoadingRows } from "../../lib/loading";

export interface GroupProps extends Closed {
	loading?: boolean;
	children?: ReactNode;
}

// A group-filled box with a hairline between its rows: a record.
export function Group({ loading, children }: GroupProps) {
	if (loading) return <LoadingRows />;
	const rows = Children.toArray(children).filter(Boolean);
	return (
		<View className={cn(GROUP, "overflow-hidden")}>
			{rows.map((row, index) => (
				<View
					// biome-ignore lint/suspicious/noArrayIndexKey: rows are positional and never reorder
					key={index}
					className={cn(index > 0 && "border-t", index > 0 && HAIRLINE)}
				>
					{row}
				</View>
			))}
		</View>
	);
}
