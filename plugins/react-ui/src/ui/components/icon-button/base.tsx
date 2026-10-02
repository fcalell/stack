import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import type { IconName } from "@fcalell/ui-core/descriptors";
import { type IconButtonFit, iconButton } from "@fcalell/ui-core/variants";
import { type ComponentProps, useContext } from "react";
import type { Closed } from "../../lib/closed.ts";
import { FieldDisabled } from "../../lib/field.ts";
import { Icon } from "../icon/index.tsx";

const BOX = "relative inline-flex items-center justify-center shrink-0";
const IN_FIELD = "focus-visible:-outline-offset-2";
// A trigger stays pressed while its popup is open.
const PRESS =
	"hover:bg-wash-hover hover:text-ink-body active:bg-wash-press active:text-ink-body data-popup-open:bg-wash-press data-popup-open:text-ink-body";
const DISABLED = "aria-disabled:text-ink-disabled";

// The press a public IconButton maps from `onAct`, or the props a Base UI
// trigger hands through its `render`: never a style channel.
type Handed = Omit<ComponentProps<"button">, keyof Closed | "children">;

/** The icon act every IconButton and every popup trigger renders. Outside the package's exports: a molecule hands it to a trigger's `render`. */
export function IconButtonBase({
	icon,
	fit,
	label,
	...handed
}: Handed & { icon: IconName; fit?: IconButtonFit; label: string }) {
	// Inert inside a disabled field, or when its holder says so (a sheet's
	// close while its act pends).
	const disabled = useContext(FieldDisabled) || handed.disabled === true;
	return (
		<BaseButton
			{...handed}
			aria-label={label}
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
