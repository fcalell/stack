import { message, text } from "@fcalell/ui-core/variants";
import { View } from "react-native";
import { Painted, PaintText } from "../../lib/paint";

/** The waiting form of a reply that is on its way: the unbubbled reply it becomes, with no author line, one line of paint at the body line height. Outside the package's exports: a Thread draws it for `replying`. */
export function WaitingReply() {
	return (
		<View
			accessibilityState={{ busy: true }}
			className={message({ author: "other" })}
		>
			<PaintText fills="phrase" painted className={text({ role: "body" })}>
				<Painted role="phrase" />
			</PaintText>
		</View>
	);
}
