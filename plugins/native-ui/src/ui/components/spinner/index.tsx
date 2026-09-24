import { ActivityIndicator } from "react-native";
import type { Closed } from "../../lib/closed";
import { useTokenColor } from "../../lib/theme";
import { useWords } from "../../lib/words";

export interface SpinnerProps extends Closed {}

export function Spinner(_props: SpinnerProps) {
	const words = useWords();
	return (
		<ActivityIndicator
			color={useTokenColor("--color-ink-meta")}
			accessibilityLabel={words.loading}
		/>
	);
}
