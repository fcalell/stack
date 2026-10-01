import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import type { IconName } from "@fcalell/ui-core/descriptors";
import { type IconButtonFit, iconButton } from "@fcalell/ui-core/variants";
import { useContext } from "react";
import type { Closed } from "../../lib/closed.ts";
import { FieldDisabled } from "../../lib/field.ts";
import { Icon } from "../icon/index.tsx";

const BOX = "relative inline-flex items-center justify-center shrink-0";
const IN_FIELD = "focus-visible:-outline-offset-2";
const PRESS =
	"hover:bg-wash-hover hover:text-ink-body active:bg-wash-press active:text-ink-body";
const DISABLED = "aria-disabled:text-ink-disabled";

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
}

/** A square act with no boundary at rest; the wash is its ground. Inside a disabled field it is inert and keeps focus. */
export function IconButton({ icon, fit, label, onAct }: IconButtonProps) {
	const disabled = useContext(FieldDisabled);
	return (
		<BaseButton
			aria-label={label}
			onClick={onAct}
			disabled={disabled}
			focusableWhenDisabled
			className={cn(
				iconButton({ fit }),
				BOX,
				fit === "field" && IN_FIELD,
				disabled ? DISABLED : PRESS,
			)}
		>
			<Icon name={icon} fit="control" />
		</BaseButton>
	);
}
