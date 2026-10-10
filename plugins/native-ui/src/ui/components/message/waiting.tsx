import { message, skeleton } from "@fcalell/ui-core/variants";
import { View } from "react-native";
import { cn } from "../../lib/cn";
import { Strut } from "../../lib/strut";

// A line stands in its text's line box: a zero-width line of the role beside
// the bar, so the waiting reply keeps the loaded one's height.
const LINE = "flex-row items-center";

/** The waiting form of a reply that is on its way: the unbubbled reply it becomes, with no author line, one skeleton line at the body line height. Outside the package's exports: a Thread draws it for `replying`. */
export function WaitingReply() {
	return (
		<View
			accessibilityState={{ busy: true }}
			className={message({ author: "other" })}
		>
			<View className={LINE}>
				<Strut role="body" />
				<View className={cn(skeleton({ kind: "line" }), "w-full")} />
			</View>
		</View>
	);
}
