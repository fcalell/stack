import { cn } from "@fcalell/ui-core/cn";
import { COUNT, COUNT_LABEL } from "@fcalell/ui-core/variants";
import { Decoded } from "../../lib/slot.tsx";

// The page breaks a word anywhere; a badge keeps its figures whole.
const HOLD = "wrap-normal";

/** The number every Count and every Button's count renders. `inAct` draws it in the ink of the act it stands in, not the meta one. `painted` is the number while its data is not here: a figure's filler, inert. Outside the package's exports. */
export function CountBase(props: {
	value: number | string;
	inAct?: boolean;
	painted?: boolean;
}) {
	return (
		<span
			inert={props.painted || undefined}
			className={cn(props.inAct ? COUNT_LABEL : cn(COUNT, COUNT_LABEL), HOLD)}
		>
			<Decoded
				role="figure"
				painted={props.painted}
				text={String(props.value)}
				of={Number.parseFloat(String(props.value))}
			/>
		</span>
	);
}
