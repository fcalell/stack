import {
	type Datum,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type {
	Option,
	OptionGroup,
	OptionPick,
} from "@fcalell/ui-core/descriptors";
import {
	placeRow,
	placeRowGlyph,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Painted } from "../../lib/paint.tsx";
import { AvatarBase } from "../avatar/base.tsx";
import { Avatar } from "../avatar/index.tsx";
import { Icon } from "../icon/index.tsx";
import { HeldPicker } from "../picker/base.tsx";

const ROW_PRESS = "hover:bg-wash-hover active:bg-wash-press";
// The leading slot takes a place row glyph's ink: a button resets its colour.
const GLYPH = "flex shrink-0";
const END = "flex shrink-0 text-ink-faint";
// The trigger is a place row: its leading slot holds the glyph the caller
// gives (the app's mark), else the current option's icon at the row glyph's
// size, else its avatar.
const TRIGGER = "flex items-center w-full focus-visible:-outline-offset-2";
const NAME = "truncate grow text-left";

/** What the app is looking at and can switch to: an `OptionPick` whose `options` and `value` may be selections. A selection that waits paints the avatar and the name and keeps the chevron, the trigger inert; a value no option matches, or a read that ended, draws no name. */
export interface Switcher extends Omit<OptionPick, "options" | "value"> {
	options: Datum<readonly Option[] | readonly OptionGroup[]>;
	value?: Datum<string>;
}

function flatten(
	options: readonly Option[] | readonly OptionGroup[],
): readonly Option[] {
	const entries: readonly (Option | OptionGroup)[] = options;
	return entries.flatMap((entry) =>
		"options" in entry ? entry.options : [entry],
	);
}

// The switcher is a pick (its options with their avatars, the current one
// ticked, the act that makes a new one under a hairline), drawn as a place
// row in the Shell's sidebar and on its touch layer. Outside the package's
// exports.
export function SwitcherPick(props: { switcher: Switcher; glyph?: ReactNode }) {
	const { switcher, glyph } = props;
	const [options, value] = useSelections([
		switcher.options,
		switcher.value,
	] as const);
	// Pending: a read still to land. Absent: it ended, or no option matches the
	// value; the name slot then draws nothing, never the switcher's own label.
	const pending = paints(options) || paints(value);
	const current =
		options.painted || value.painted
			? undefined
			: flatten(options.value).find((option) => option.value === value.value);
	const name = current?.label;
	return (
		<HeldPicker
			label={switcher.label}
			options={switcher.options}
			value={switcher.value}
			onChange={switcher.onChange}
			act={switcher.act}
			drawn={(handed, open) => (
				<button
					{...handed}
					type="button"
					inert={pending || undefined}
					aria-label={name ? `${switcher.label}, ${name}` : switcher.label}
					className={cn(
						placeRow({ state: open ? "active" : "rest" }),
						TRIGGER,
						!open && !pending && ROW_PRESS,
					)}
				>
					<span aria-hidden className={cn(placeRowGlyph(), GLYPH)}>
						{glyph ??
							(pending ? (
								<AvatarBase name="" painted />
							) : current?.icon ? (
								<Icon name={current.icon} />
							) : name ? (
								<Avatar name={name} src={current?.avatar?.src} />
							) : null)}
					</span>
					<span
						className={cn(
							text({ role: "body" }),
							textStrong({ role: "body" }),
							NAME,
						)}
					>
						{pending ? <Painted role="name" /> : name}
					</span>
					<span className={END}>
						<Icon name="ChevronsUpDown" />
					</span>
				</button>
			)}
		/>
	);
}
