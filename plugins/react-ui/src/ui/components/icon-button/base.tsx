import { Button as BaseButton } from "@base-ui/react/button";
import { Tooltip } from "@base-ui/react/tooltip";
import { cn } from "@fcalell/ui-core/cn";
import type { IconName } from "@fcalell/ui-core/descriptors";
import {
	type IconButtonFit,
	iconButton,
	TOOLTIP,
} from "@fcalell/ui-core/variants";
import { type ComponentProps, type ReactElement, use, useContext } from "react";
import type { Closed } from "../../lib/closed.ts";
import { FieldDisabled } from "../../lib/field.ts";
import { spacing, useTouch } from "../../lib/media.ts";
import { follow } from "../../lib/navigate.ts";
import { PortalContainer } from "../../lib/portal.ts";
import { InsetRing } from "../../lib/ring.ts";
import { Icon } from "../icon/index.tsx";
import { Spinner } from "../spinner/index.tsx";

const BOX = "relative inline-flex items-center justify-center shrink-0";
// Inside a field or a clipping frame the ring is drawn inset.
const INSET = "focus-visible:-outline-offset-2";
// A trigger stays pressed while its popup is open: `aria-expanded`, which the
// menu, picker and sheet triggers set and the tooltip's own trigger does not
// (its `data-popup-open` would press every act that shows its name).
const PRESS =
	"hover:bg-wash-hover hover:text-ink-body active:bg-wash-press active:text-ink-body aria-expanded:bg-wash-press aria-expanded:text-ink-body";
const DISABLED = "aria-disabled:text-ink-disabled";
// The name draws over a sheet's scrim and under the toasts, with the popovers.
const POSITIONER = "z-(--layer-popover)";
// The hover rest before the name shows, a beat longer than a pointer passing
// over the act and short enough that a rested pointer is answered.
const SHOW_AFTER = 500;

// The press a public IconButton maps from `onAct`, or the props a Base UI
// trigger hands through its `render`: never a style channel.
type Handed = Omit<ComponentProps<"button">, keyof Closed | "children">;

/** The icon act every IconButton and every popup trigger renders. Outside the package's exports: a molecule hands it to a trigger's `render`. */
export function IconButtonBase({
	icon,
	fit,
	label,
	loading,
	...handed
}: Handed & {
	icon: IconName;
	fit?: IconButtonFit;
	label: string;
	loading?: boolean;
}) {
	// Inert inside a disabled field, or when its holder says so (a sheet's
	// close while its act pends), or while it runs.
	const disabled =
		useContext(FieldDisabled) || handed.disabled === true || loading === true;
	const inset = useContext(InsetRing) || fit === "field";
	const look = disabled ? DISABLED : PRESS;
	return (
		<Named label={label}>
			<BaseButton
				{...handed}
				aria-label={label}
				aria-busy={loading || undefined}
				disabled={disabled}
				focusableWhenDisabled
				className={cn(
					iconButton({ fit }),
					BOX,
					inset && INSET,
					// A running act keeps the rest ink under its spinner and takes no wash.
					loading ? undefined : look,
				)}
			>
				{loading ? <Spinner /> : <Icon name={icon} fit="control" />}
			</BaseButton>
		</Named>
	);
}

// The act's name in a tooltip: on a pointer resting on it or on the keyboard
// reaching it, hidden by Escape, a press or leaving. The label stays the
// element's accessible name (the tooltip adds none), and touch draws none: a
// press there is not a rest, and the name would cover the act under the finger.
// Focus a dialog hands its own first act (its close) shows no name: the name
// would take the first Escape, which belongs to the dialog; Tab inside it does.
function handedByDialog(event: Event): boolean {
	if (!(event instanceof FocusEvent) || !(event.target instanceof Element))
		return false;
	const dialog = event.target.closest('[role="dialog"]');
	if (!dialog) return false;
	return !(
		event.relatedTarget instanceof Node && dialog.contains(event.relatedTarget)
	);
}

function Named(props: { label: string; children: ReactElement }) {
	const touch = useTouch();
	const container = use(PortalContainer);
	return (
		<Tooltip.Root
			disabled={touch}
			disableHoverablePopup
			onOpenChange={(open, details) => {
				if (
					open &&
					details.reason === "trigger-focus" &&
					handedByDialog(details.event)
				)
					details.cancel();
			}}
		>
			<Tooltip.Trigger delay={SHOW_AFTER} render={props.children} />
			<Tooltip.Portal container={container}>
				<Tooltip.Positioner
					className={POSITIONER}
					sideOffset={() => spacing("pair")}
				>
					<Tooltip.Popup className={cn(TOOLTIP)}>{props.label}</Tooltip.Popup>
				</Tooltip.Positioner>
			</Tooltip.Portal>
		</Tooltip.Root>
	);
}

/** The icon act that goes to a route: an anchor in the IconButton's look, for a back or close act. Outside the package's exports. */
export function IconButtonLink(props: {
	icon: IconName;
	fit?: IconButtonFit;
	label: string;
	href: string;
}) {
	return (
		<Named label={props.label}>
			<a
				href={props.href}
				onClick={follow}
				aria-label={props.label}
				className={cn(iconButton({ fit: props.fit }), BOX, PRESS)}
			>
				<Icon name={props.icon} fit="control" />
			</a>
		</Named>
	);
}
