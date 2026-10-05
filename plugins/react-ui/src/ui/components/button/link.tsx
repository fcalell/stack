import { cn } from "@fcalell/ui-core/cn";
import {
	type ButtonAct,
	type ButtonFit,
	button,
	buttonLabel,
} from "@fcalell/ui-core/variants";

export const BOX = "relative inline-flex items-center justify-center";
export const LABEL = "truncate";
export const PRESS: Record<ButtonAct, string> = {
	primary: "hover:bg-act-accent-hover active:bg-act-accent-press",
	danger: "hover:bg-act-danger-hover active:bg-act-danger-press",
	secondary: "hover:bg-wash-hover active:bg-wash-press",
	destructive: "hover:bg-wash-hover active:bg-wash-press",
	quiet: "hover:bg-wash-hover active:bg-wash-press",
};

/** The secondary act that goes to a route: an anchor in the Button's hairline look, for a read's Back. Outside the package's exports. */
export function ButtonLink(props: {
	fit?: ButtonFit;
	label: string;
	href: string;
}) {
	return (
		<a
			href={props.href}
			className={cn(
				button({ act: "secondary", fit: props.fit }),
				BOX,
				PRESS.secondary,
			)}
		>
			<span className={cn(buttonLabel({ act: "secondary" }), LABEL)}>
				{props.label}
			</span>
		</a>
	);
}
