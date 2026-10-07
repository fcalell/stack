import { cn } from "@fcalell/ui-core/cn";
import type {
	Option,
	OptionGroup,
	Switcher,
} from "@fcalell/ui-core/descriptors";
import {
	placeRow,
	placeRowGlyph,
	SWITCHER,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { Avatar } from "../avatar/index.tsx";
import { Icon } from "../icon/index.tsx";
import { PickerBase } from "../picker/base.tsx";

const ROW_PRESS = "hover:bg-wash-hover active:bg-wash-press";
const GLYPH = "flex shrink-0";
const TRIGGER = "flex items-center w-full focus-visible:-outline-offset-2";
const TRIGGER_TOUCH = "flex items-center min-w-0";
const NAME = "truncate grow text-left";
const NAME_TOUCH = "truncate";

function flatten(options: Switcher["options"]): readonly Option[] {
	const entries: readonly (Option | OptionGroup)[] = options;
	return entries.flatMap((entry) =>
		"options" in entry ? entry.options : [entry],
	);
}

// The switcher is a pick (its options with their avatars, the current one
// ticked, the act that makes a new one under a hairline), drawn as a place
// row in the Shell's sidebar and a compact trigger in a Place's touch top
// bar, each drawing it from the Shell's `Switcher`. Outside the package's
// exports.
export function SwitcherPick(props: { switcher: Switcher; touch: boolean }) {
	const { switcher, touch } = props;
	const current = flatten(switcher.options).find(
		(option) => option.value === switcher.value,
	);
	const name = current?.label ?? switcher.label;
	return (
		<PickerBase
			label={switcher.label}
			options={switcher.options}
			value={switcher.value}
			onChange={switcher.onChange}
			act={switcher.act}
			drawn={(handed, open) => (
				<button
					{...handed}
					type="button"
					className={
						touch
							? cn(SWITCHER, TRIGGER_TOUCH)
							: cn(
									placeRow({ state: open ? "active" : "rest" }),
									TRIGGER,
									!open && ROW_PRESS,
								)
					}
				>
					<span aria-hidden className={GLYPH}>
						<Avatar name={name} src={current?.avatar?.src} />
					</span>
					<span
						className={cn(
							text({ role: "body" }),
							textStrong({ role: "body" }),
							touch ? NAME_TOUCH : NAME,
						)}
					>
						{name}
					</span>
					<span className={cn(placeRowGlyph({ state: "rest" }), GLYPH)}>
						<Icon name="ChevronsUpDown" />
					</span>
				</button>
			)}
		/>
	);
}
