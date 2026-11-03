import { filled } from "@fcalell/ui-core/tokens";
import { text } from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { useWords } from "../../lib/words";
import { Button } from "../button";

const LINE = "flex-row flex-wrap items-center gap-gap";
const SAID = "min-w-0 shrink grow";

// What a saved secret draws in its field: that it is saved and how it ends, in
// the meta ink, with a quiet Replace and a quiet Remove that asks first. The
// value is never read back, so no mask stands in for it. Outside the package's
// exports: a `Form` draws it for a saved `secret`.
export function SavedSecret(props: {
	// The saved value's last characters, as the server sends them.
	tail: string;
	// The field's label, which names the decision.
	label: string;
	onReplace: () => void;
	onRemove: () => Promise<unknown>;
}) {
	const words = useWords();
	const { tail, label, onReplace, onRemove } = props;
	return (
		<View className={LINE}>
			<RNText className={cn(text({ role: "meta" }), SAID)}>
				{filled(words.savedEndsIn, { tail })}
			</RNText>
			<Button act="quiet" label={words.replace} onAct={onReplace} />
			<Button
				act="quiet"
				label={words.remove}
				confirm={{
					title: `${words.remove} ${label}`,
					sentence: words.removeSecret,
				}}
				done={words.removed}
				onAct={onRemove}
			/>
		</View>
	);
}
