import { Button as BaseButton } from "@base-ui/react/button";
import { Tooltip } from "@base-ui/react/tooltip";
import { cn } from "@fcalell/ui-core/cn";
import type { IconName } from "@fcalell/ui-core/descriptors";
import {
	ICON_BUTTON_DESTRUCTIVE,
	type IconButtonFit,
	iconButton,
	LAYER_TOOLTIP,
	TOOLTIP,
	TOOLTIP_CUT,
} from "@fcalell/ui-core/variants";
import {
	type ComponentProps,
	type ReactElement,
	type ReactNode,
	use,
	useContext,
} from "react";
import type { Closed } from "../../lib/closed.ts";
import { FieldDisabled } from "../../lib/field.ts";
import { spacing, useTouch } from "../../lib/media.ts";
import { follow } from "../../lib/navigate.ts";
import { PAINT_BOX } from "../../lib/paint.tsx";
import { PortalContainer } from "../../lib/portal.ts";
import { hid } from "../../lib/rest.ts";
import { Swap } from "../../lib/swap.tsx";
import { Turn } from "../../lib/turn.tsx";
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
// A disclosure (a branch's fold) is expanded while its body shows, which is no
// popup: its chevron stands bare in the meta ink open or closed, as a
// Section's fold toggle's does, and only turns.
const DISCLOSE =
	"hover:bg-wash-hover hover:text-ink-body active:bg-wash-press active:text-ink-body";
const DISABLED = "aria-disabled:text-ink-disabled";
// Pending, the glyph fades out and the spinner in once `--act-delay` has run
// (`globals.css`).
const FADE_OUT = "animate-act-out";
const SPINNER_LAYER =
	"absolute inset-0 flex items-center justify-center animate-act-in";
// Painted, the glyph keeps its place and is filled in its own box, the button
// around it staying as bare as the loaded one: an icon act is a glyph, so its
// waiting form is a glyph's worth of fill where it will stand, never a filled
// button.
const PAINT_GLYPH = cn(PAINT_BOX, "rounded-chip *:invisible");
// The name draws over a sheet's scrim and under the toasts, with the popovers.
const POSITIONER = "z-(--layer-popover)";
// The hover rest before the name shows, a beat longer than a pointer passing
// over the act and short enough that a rested pointer is answered.
export const SHOW_AFTER = 500;

// The press a public Button maps from `onAct`, or the props a Base UI
// trigger hands through its `render`: never a style channel.
type Handed = Omit<ComponentProps<"button">, keyof Closed | "children">;

/** The icon act every Button's icon form and every popup trigger renders. Outside the package's exports: a molecule hands it to a trigger's `render`. */
export function IconButtonBase({
	icon,
	fit,
	label,
	pending,
	inset: framed,
	painted,
	open,
	destructive,
	...handed
}: Handed & {
	icon: IconName;
	fit?: IconButtonFit;
	label: string;
	// An act that removes or ends something: the danger ink.
	destructive?: boolean;
	// The act is running: inert at once, then (after `ACT_DELAY`) its glyph swapped for the spinner.
	pending?: boolean;
	// Its frame clips (a Code's): the focus ring is drawn inset, so the clip never cuts it.
	inset?: boolean;
	// Its data is not here: the glyph's box filled, the glyph not drawn, inert.
	painted?: boolean;
	// A disclosure: the glyph is the chevron down, turned a quarter while it is closed, so it turns where a swapped glyph would pop.
	open?: boolean;
}) {
	// Inert inside a disabled field, or when its holder says so (a sheet's
	// close while its act pends), or while it runs.
	const disabled =
		useContext(FieldDisabled) || handed.disabled === true || pending === true;
	const inset = framed || fit === "field";
	const look = painted
		? undefined
		: disabled
			? DISABLED
			: open === undefined
				? PRESS
				: DISCLOSE;
	return (
		<Named label={label}>
			<BaseButton
				{...handed}
				aria-label={label}
				aria-busy={pending || undefined}
				inert={painted || undefined}
				disabled={disabled}
				focusableWhenDisabled
				className={cn(
					iconButton({ fit }),
					destructive && ICON_BUTTON_DESTRUCTIVE,
					BOX,
					inset && INSET,
					// A running act keeps the rest ink under its spinner and takes no wash.
					pending ? undefined : look,
				)}
			>
				<span
					className={cn(
						"inline-flex",
						pending && FADE_OUT,
						painted && PAINT_GLYPH,
					)}
				>
					{open === undefined ? (
						// A glyph swapped while shown (a copy act's check) is a mark change.
						<Swap id={icon} scale>
							<Icon name={icon} fit="control" />
						</Swap>
					) : (
						<Turn
							name="ChevronDown"
							fit="control"
							turned={!open}
							by="quarter"
						/>
					)}
				</span>
				{pending ? (
					<span className={SPINNER_LAYER}>
						<Spinner />
					</span>
				) : null}
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

/** The tooltip's popup: a name in the popover's ground, standing a pair off its anchor (the trigger inside a `Tooltip.Root`, else the `anchor` it is given). Outside the package's exports; the cut-text tooltip draws it too. */
export function NamePopup(props: {
	anchor?: Element;
	// Cut text's whole text, which may grow past an icon name's short measure.
	cut?: boolean;
	// It shows with no fade: it opened with no rest, within the last's `RECENT`.
	instant?: boolean;
	children: ReactNode;
}) {
	const container = use(PortalContainer);
	return (
		<Tooltip.Portal container={container}>
			<Tooltip.Positioner
				anchor={props.anchor}
				className={POSITIONER}
				sideOffset={() => spacing("gap")}
			>
				<Tooltip.Popup
					{...(props.instant ? { "data-instant": "delay" } : {})}
					className={cn(props.cut ? TOOLTIP_CUT : TOOLTIP, LAYER_TOOLTIP)}
				>
					{props.children}
				</Tooltip.Popup>
			</Tooltip.Positioner>
		</Tooltip.Portal>
	);
}

/** A name shown as a tooltip over its trigger, off on touch, or while `off` (a trigger that wears the name only some of the time keeps its place in the tree). Outside the package's exports; a row's marks wear it too. */
export function Named(props: {
	label: string;
	off?: boolean;
	children: ReactElement;
}) {
	const touch = useTouch();
	return (
		<Tooltip.Root
			disabled={touch || props.off}
			disableHoverablePopup
			onOpenChange={(open, details) => {
				if (!open) hid();
				if (
					open &&
					details.reason === "trigger-focus" &&
					handedByDialog(details.event)
				)
					details.cancel();
				// Escape hides the name and still reaches what the act sits in: a
				// sheet opened on its close act closes on the one press.
				if (!open && details.reason === "escape-key")
					details.allowPropagation();
			}}
		>
			<Tooltip.Trigger delay={SHOW_AFTER} render={props.children} />
			<NamePopup>{props.label}</NamePopup>
		</Tooltip.Root>
	);
}

/** The icon act that goes to a route: an anchor in the icon form's look, for a back or close act. Outside the package's exports. */
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
