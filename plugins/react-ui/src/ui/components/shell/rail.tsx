import { cn } from "@fcalell/ui-core/cn";
import type { IconName } from "@fcalell/ui-core/descriptors";
import {
	placeRow,
	placeRowGlyph,
	SHELL_RAIL_ENTRY,
	text,
} from "@fcalell/ui-core/variants";
import { follow } from "../../lib/navigate.ts";
import { Named } from "../button/glyph.tsx";
import { Icon } from "../icon/index.tsx";
import { GLYPH, LABEL, ROW_BOX, ROW_PRESS, ROW_SELECTED_PRESS } from "./row.ts";

// The group's entry is a place row cut to an icon: the current bar and wash
// when the current place is in the group, the selected ink alone when its
// column is the one standing, as a branch on the path to the current place.
function look(current: boolean) {
	return cn(
		placeRow({ state: current ? "selected" : "rest" }),
		ROW_BOX,
		current ? ROW_SELECTED_PRESS : ROW_PRESS,
	);
}

function glyph(icon: IconName, inked: boolean) {
	return (
		<span
			className={cn(
				placeRowGlyph({ state: inked ? "selected" : "rest" }),
				GLYPH,
			)}
		>
			<Icon name={icon} />
		</span>
	);
}

// An entry of the rail: a group's (it shows the group's column) or a footer
// place's (it goes there), its label the tooltip and the accessible name.
// Outside the package's exports.
export function RailEntry(props: {
	icon: IconName;
	label: string;
	current: boolean;
	shown?: boolean;
	href?: string;
	onPress?: () => void;
}) {
	const { icon, label, current, shown, href, onPress } = props;
	const inked = current || shown === true;
	return (
		<Named label={label}>
			{href === undefined ? (
				<button
					type="button"
					aria-label={label}
					aria-current={current ? "true" : undefined}
					aria-pressed={shown}
					onClick={onPress}
					className={cn(look(current), SHELL_RAIL_ENTRY)}
				>
					{glyph(icon, inked)}
				</button>
			) : (
				<a
					href={href}
					aria-label={label}
					aria-current={current ? "page" : undefined}
					onClick={follow}
					className={cn(look(current), SHELL_RAIL_ENTRY)}
				>
					{glyph(icon, inked)}
				</a>
			)}
		</Named>
	);
}

// A group on the touch layer's list: the rail's entry as a full row, with its
// label and a chevron on the way in. Outside the package's exports.
export function GroupRow(props: {
	icon: IconName;
	label: string;
	current: boolean;
	onPress: () => void;
}) {
	return (
		<button
			type="button"
			aria-current={props.current ? "true" : undefined}
			onClick={props.onPress}
			className={cn(look(props.current), "w-full text-start")}
		>
			{glyph(props.icon, props.current)}
			<span
				className={cn(
					text({ role: "body" }),
					placeRowGlyph({ state: props.current ? "selected" : "rest" }),
					LABEL,
				)}
			>
				{props.label}
			</span>
			<span className={cn(placeRowGlyph(), GLYPH)}>
				<Icon name="ChevronRight" />
			</span>
		</button>
	);
}
