import { cn } from "@fcalell/ui-core/cn";
import { COUNT, COUNT_LABEL } from "@fcalell/ui-core/variants";

// The page breaks a word anywhere; a badge keeps its figures whole.
const HOLD = "wrap-normal";

/** The number every Count and every Button's count renders. `inAct` draws it in the ink of the act it stands in, not the muted one. Outside the package's exports. */
export function CountBase(props: { value: number | string; inAct?: boolean }) {
	return (
		<span
			className={cn(props.inAct ? COUNT_LABEL : cn(COUNT, COUNT_LABEL), HOLD)}
		>
			{props.value}
		</span>
	);
}
