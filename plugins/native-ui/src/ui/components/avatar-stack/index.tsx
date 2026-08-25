import { Children, isValidElement } from "react";
import { View, type ViewProps } from "react-native";
import { cn } from "../../lib/cn";

export interface AvatarStackProps extends ViewProps {
	// Overflow count rendered as a trailing "+N" affordance is the consumer's
	// job — pass it as the last child if needed.
	children?: ViewProps["children"];
	className?: never;
	style?: never;
}

// Overlapping row of `Avatar`s (crew social proof). Each gets a canvas ring so
// it reads against the next; every avatar after the first pulls left to overlap.
export function AvatarStack({ children, ...rest }: AvatarStackProps) {
	const items = Children.toArray(children).filter(isValidElement);
	return (
		<View className="flex-row items-center" {...rest}>
			{items.map((child, i) => (
				<View
					// biome-ignore lint/suspicious/noArrayIndexKey: positional ring wrappers, order is stable
					key={i}
					className={cn(
						"rounded-full border-2 border-canvas",
						i > 0 && "-ml-2",
					)}
				>
					{child}
				</View>
			))}
		</View>
	);
}
