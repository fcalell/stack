import { Select as Control } from "@base-ui/react/select";
import { cn } from "@fcalell/ui-core/cn";
import type { Option, OptionGroup } from "@fcalell/ui-core/descriptors";
import {
	FIELD_GLYPH,
	FIELD_PLACEHOLDER,
	field,
	fieldValue,
	POPOVER,
	row,
	SELECT_GROUP,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { use } from "react";
import type { Closed } from "../../lib/closed.ts";
import { PortalContainer } from "../../lib/portal.ts";
import { Icon } from "../icon/index.tsx";
import { BOX, BOX_DISABLED, BOX_HOVER } from "../input/index.tsx";

// Base UI moves focus into the list while it is open, so the trigger keeps
// the ring on its open state.
const TRIGGER_OPEN =
	"data-popup-open:outline-2 data-popup-open:outline-offset-2 data-popup-open:outline-ring";
// The value starts at the start, as an input's does, not at the button's centre.
const VALUE = "min-w-0 grow truncate text-start";
const VALUE_DISABLED = "text-ink-disabled";
// The list stands at the trigger's width, which Base UI sets on the
// positioner as `--anchor-width`.
const POPUP = "flex flex-col w-(--anchor-width)";
const OPTION_GROUP = "flex flex-col";
const GROUP_LABEL = "px-control-x pt-pair";
// The highlight wash marks the keyboard's option, so a row draws no ring.
const ITEM = "flex items-center outline-none";
const ITEM_TEXT = "flex flex-col min-w-0 grow";
const LINE = "truncate";
const INDICATOR = "flex shrink-0 text-ink-body";

/** One choice among options, the control a `FormField` labels, describes and marks in error. `V` is read off the options, so an enum's options pick that enum. */
export interface SelectProps<V extends string | null = string> extends Closed {
	/** The chosen option's value; none draws the placeholder. */
	value?: NoInfer<V>;
	/** Hears the picked option's value; `null` for an option whose value is `null` (the empty choice). */
	onChange: (value: NoInfer<V>) => void;
	/** The choices, flat or under group labels. */
	options: readonly Option<V>[] | readonly OptionGroup<V>[];
	/** The hint drawn while nothing is chosen; never the field's name. */
	placeholder?: string;
}

function groupsOf<V extends string | null>(
	options: SelectProps<V>["options"],
): readonly { label?: string; options: readonly Option<V>[] }[] {
	const first = options[0];
	if (first === undefined || !("options" in first)) {
		return [{ options: options as readonly Option<V>[] }];
	}
	return options as readonly OptionGroup<V>[];
}

// The list sits one `pair` below the trigger, the gap a label keeps over its
// field; the role is read off the root so it follows the density.
function pairOffset(): number {
	return Number.parseFloat(
		getComputedStyle(document.documentElement).getPropertyValue(
			"--spacing-pair",
		),
	);
}

/** The field box showing the chosen label and a chevron; it opens a popover of rows under group labels, the highlighted row washed and the chosen one ticked. Base UI supplies the listbox, its keyboard and its typeahead. */
export function Select<V extends string | null = string>({
	value,
	onChange,
	options,
	placeholder,
}: SelectProps<V>) {
	const container = use(PortalContainer);
	const groups = groupsOf(options);
	const items = groups.flatMap((group) =>
		group.options.map((option) => ({
			value: option.value,
			label: option.label,
		})),
	);
	return (
		<Control.Root
			items={items}
			value={value ?? null}
			onValueChange={(next) => onChange(next as V)}
		>
			<Control.Trigger
				// The render function hands over the trigger's state (Base UI's Field
				// wires its label, validity and disabled), so the value inside draws it.
				render={(trigger, state) => (
					<button
						{...trigger}
						className={cn(
							field({
								state: state.valid === false ? "error" : "rest",
							}),
							FIELD_GLYPH,
							BOX,
							TRIGGER_OPEN,
							state.disabled
								? BOX_DISABLED
								: state.valid !== false && BOX_HOVER,
						)}
					>
						<Control.Value
							placeholder={placeholder}
							className={(value) =>
								cn(
									fieldValue({ kind: "text" }),
									value.placeholder && FIELD_PLACEHOLDER,
									VALUE,
									state.disabled && VALUE_DISABLED,
								)
							}
						/>
						<Control.Icon className="flex">
							<Icon name="ChevronDown" fit="control" />
						</Control.Icon>
					</button>
				)}
			/>
			<Control.Portal container={container}>
				<Control.Positioner
					alignItemWithTrigger={false}
					sideOffset={pairOffset}
				>
					<Control.Popup className={cn(POPOVER, POPUP)}>
						{groups.map((group, at) => (
							<Control.Group
								key={group.label ?? at}
								className={cn(SELECT_GROUP, OPTION_GROUP)}
							>
								{group.label ? (
									<Control.GroupLabel
										className={cn(
											text({ role: "meta" }),
											textStrong({ role: "meta" }),
											GROUP_LABEL,
										)}
									>
										{group.label}
									</Control.GroupLabel>
								) : null}
								{group.options.map((option) => (
									<Control.Item
										key={String(option.value)}
										value={option.value}
										label={option.label}
										className={(state) =>
											cn(
												row({
													state: state.highlighted ? "highlighted" : "rest",
												}),
												ITEM,
											)
										}
									>
										<span className={ITEM_TEXT}>
											<Control.ItemText
												className={cn(
													fieldValue({ kind: "text" }),
													option.value === null && FIELD_PLACEHOLDER,
													LINE,
												)}
											>
												{option.label}
											</Control.ItemText>
											{option.description ? (
												<span className={cn(text({ role: "meta" }), LINE)}>
													{option.description}
												</span>
											) : null}
										</span>
										<Control.ItemIndicator className={INDICATOR}>
											<Icon name="Check" fit="body" />
										</Control.ItemIndicator>
									</Control.Item>
								))}
							</Control.Group>
						))}
					</Control.Popup>
				</Control.Positioner>
			</Control.Portal>
		</Control.Root>
	);
}
