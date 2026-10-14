import { COUNT, COUNT_LABEL } from "@fcalell/ui-core/variants";
import { Text as RNText } from "react-native";
import { cn } from "../../lib/cn";
import { useInk } from "../../lib/ink";
import { Painted } from "../../lib/paint";
import { useTokenColor } from "../../lib/theme";

// The number every Count and every Button's count renders. `inAct` draws it in
// the act's ink, not the muted one: a text takes no currentColor, so the ink
// the button provides (`Ink`) is resolved and set. Outside the package's
// exports. `painted` is the number while its data is not here: a figure's filler.
export function CountBase(props: {
	value: number | string;
	inAct?: boolean;
	painted?: boolean;
}) {
	const color = useTokenColor(`--color-${useInk() ?? "ink-meta"}`);
	return (
		<RNText
			className={props.inAct ? COUNT_LABEL : cn(COUNT, COUNT_LABEL)}
			style={props.inAct ? { color } : undefined}
		>
			{props.painted ? <Painted role="figure" /> : props.value}
		</RNText>
	);
}
