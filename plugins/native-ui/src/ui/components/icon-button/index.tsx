import type { IconName } from "@fcalell/ui-core/descriptors";
import type { IconButtonFit } from "@fcalell/ui-core/variants";
import { useContext } from "react";
import type { Closed } from "../../lib/closed";
import { FieldDisabled } from "../../lib/field";
import { IconButtonBase } from "./base";

export interface IconButtonProps extends Closed {
	icon: IconName;
	fit?: IconButtonFit;
	/** The act's accessible name (a short phrase; read aloud, never drawn). */
	label: string;
	onAct: () => void;
	loading?: boolean;
}

// A square act with no boundary at rest; the label is its name, never
// drawn. Inside a disabled field it is inert.
export function IconButton({
	icon,
	fit,
	label,
	onAct,
	loading,
}: IconButtonProps) {
	const disabled = useContext(FieldDisabled);
	return (
		<IconButtonBase
			icon={icon}
			fit={fit}
			label={label}
			onAct={onAct}
			loading={loading}
			disabled={disabled}
		/>
	);
}
