import type { StatusState } from "@fcalell/ui-core/descriptors";
import { statusDot } from "@fcalell/ui-core/variants";
import { View } from "react-native";
import { cn } from "../../lib/cn";

const DOT = "shrink-0";

/** A status's dot alone: beside its word in a `Status`, named by `label` as a list row's leading, or leading a status pick's option. Outside the package's exports. */
export function StatusDot({
	state,
	label,
}: {
	state: StatusState;
	label?: string;
}) {
	const drawn = cn(statusDot({ state }), DOT);
	if (label)
		return (
			<View
				accessible
				accessibilityRole="image"
				accessibilityLabel={label}
				className={drawn}
			/>
		);
	return <View className={drawn} />;
}
