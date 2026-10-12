import { cn } from "@fcalell/ui-core/cn";
import { COUNT, COUNT_LABEL } from "@fcalell/ui-core/variants";

/** The number every Count and every Button's count renders. `inAct` draws it in the ink of the act it stands in, not the muted one. Outside the package's exports. */
export function CountBase(props: { value: number | string; inAct?: boolean }) {
	return (
		<span className={props.inAct ? COUNT_LABEL : cn(COUNT, COUNT_LABEL)}>
			{props.value}
		</span>
	);
}
