import type {
	IconLinkAct,
	IconName,
	LinkAct,
} from "@fcalell/ui-core/descriptors";
import type { ButtonAct, ButtonFit } from "@fcalell/ui-core/variants";
import { type Act, type IconAct, wiringOf } from "../../lib/act.ts";
import { ButtonBase } from "./base.tsx";
import { IconButtonLink } from "./glyph.tsx";
import { Button } from "./index.tsx";
import { ButtonLink } from "./link.tsx";

/** A labelled act as its host draws it: a Button that runs an `Act`, or the anchor that goes to a `LinkAct`'s route, in the same look. `kind` is the look a host gives the act (a `destructive` act draws as `destructive` where the host asks `secondary`). `blocked` is the host's reason where it holds one apart from the act's own (a read that ended); a link draws inert with its own reason, as a blocked act does, and the host's does not stop it. Outside the package's exports. */
export function ActFace(props: {
	act: Act | LinkAct;
	kind: ButtonAct;
	fit?: ButtonFit;
	icon?: IconName;
	ink?: string;
	blocked?: string;
	tabIndex?: -1;
}) {
	const { act, kind, fit, icon, ink, blocked, tabIndex } = props;
	if ("href" in act && act.blocked === undefined)
		return (
			<ButtonLink
				act={kind}
				fit={fit}
				icon={icon}
				label={act.label}
				href={act.href}
				ink={ink}
				tabIndex={tabIndex}
			/>
		);
	return (
		<ButtonBase
			act={
				kind === "secondary" && "destructive" in act && act.destructive
					? "destructive"
					: kind
			}
			fit={fit}
			icon={icon}
			label={act.label}
			onAct={"onAct" in act ? act.onAct : undefined}
			{...("onAct" in act ? wiringOf(act) : {})}
			blocked={"onAct" in act ? (blocked ?? act.blocked) : act.blocked}
			ink={ink}
			tabIndex={tabIndex}
		/>
	);
}

/** An icon act as its host draws it: the glyph that runs an `IconAct`, or the one that goes to an `IconLinkAct`'s route; a blocked link is inert, as a blocked act is, and gives its reason. Outside the package's exports. */
export function IconActFace(props: { act: IconAct | IconLinkAct }) {
	const { act } = props;
	if ("href" in act && act.blocked === undefined) {
		return <IconButtonLink icon={act.icon} label={act.label} href={act.href} />;
	}
	const run = "onAct" in act;
	return (
		<Button
			glyph
			icon={act.icon}
			label={act.label}
			act={run && act.destructive ? "destructive" : undefined}
			blocked={act.blocked}
			onAct={run ? act.onAct : undefined}
			{...(run ? wiringOf(act) : {})}
		/>
	);
}
