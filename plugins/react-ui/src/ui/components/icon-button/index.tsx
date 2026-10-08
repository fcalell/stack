import type { IconName } from "@fcalell/ui-core/descriptors";
import type { IconButtonFit } from "@fcalell/ui-core/variants";
import type { Closed } from "../../lib/closed.ts";
import { IconButtonBase } from "./base.tsx";

/** An icon-only act. */
export interface IconButtonProps extends Closed {
	/** The glyph. */
	icon: IconName;
	/** What it sits in: a body (the default), a bar, or a field's end. */
	fit?: IconButtonFit;
	/** The act's accessible name; never drawn. */
	label: string;
	/** Runs the act. */
	onAct: () => void;
	/** The act is running: inert, its glyph swapped for a spinner, its size and name kept. */
	loading?: boolean;
}

/** A square act with no boundary at rest; the wash is its ground. Inside a disabled field it is inert and keeps focus. */
export function IconButton({
	icon,
	fit,
	label,
	onAct,
	loading,
}: IconButtonProps) {
	return (
		<IconButtonBase
			icon={icon}
			fit={fit}
			label={label}
			loading={loading}
			onClick={onAct}
		/>
	);
}
