import { Circle } from "../../lib/circle";
import type { Closed } from "../../lib/closed";
import { useIcon } from "../../lib/icons";

export interface IconButtonProps extends Closed {
	icon: string;
	label: string;
	onAct: () => void;
}

// A 44 px circle for moving and nothing else; the label is read aloud.
export function IconButton({ icon, label, onAct }: IconButtonProps) {
	return <Circle icon={useIcon(icon)} label={label} onAct={onAct} />;
}
