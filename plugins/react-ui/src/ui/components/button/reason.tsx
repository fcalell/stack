import { cn } from "@fcalell/ui-core/cn";
import { text } from "@fcalell/ui-core/variants";

const END = "text-end";

/** A blocked act's reason, the act's description: held from the start and hidden until shown, so the press that shows it keeps the act mounted and focused. Outside the package's exports: the Button draws it, or the host that draws it on its own line. */
export function Reason(props: {
	id: string;
	shown: boolean;
	end?: boolean;
	children: string;
}) {
	return (
		<p
			id={props.id}
			hidden={!props.shown}
			className={cn(text({ role: "meta" }), props.end && END)}
		>
			{props.children}
		</p>
	);
}
