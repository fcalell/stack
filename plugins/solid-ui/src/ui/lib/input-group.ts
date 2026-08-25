import { cva } from "class-variance-authority";
import type { Accessor } from "solid-js";
import { createContext, useContext } from "solid-js";

// ─── The in-group contract ───

// The closure leaves the group no class to hand its children, so each control
// composes its own in-group overlay: the group root provides the membership
// flag, `InputGroup.Button` provides its compact size, and Input, Textarea and
// Button read them here.

export type GroupButtonSize = "xs" | "sm" | "icon-xs" | "icon-sm";

export const InputGroupContext = createContext(false);

export function useInInputGroup(): boolean {
	return useContext(InputGroupContext);
}

export const GroupButtonSizeContext =
	createContext<Accessor<GroupButtonSize>>();

export function useGroupButtonSize(): Accessor<GroupButtonSize> | undefined {
	return useContext(GroupButtonSizeContext);
}

// The group is the field surface, so a control inside it strips its own
// border, fill and ring and fills the row instead.
export const groupControlClass =
	"flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0";

// An addon button is a secondary affordance inside a control that already
// carries the tap floor, so each compact size clears the button matrix's own
// `min-h` explicitly. Without that the height is emitted and inert, and a
// 44px button renders inside a 48px group beside its input.
export const groupButtonClasses = cva(
	"flex flex-row items-center gap-2 rounded-none text-micro shadow-none",
	{
		variants: {
			size: {
				xs: "h-6 min-h-0 gap-1 px-2 [&>svg:not([class*='size-'])]:size-3.5",
				sm: "",
				"icon-xs": "size-6 min-h-0 p-0 has-[>svg]:p-0",
				"icon-sm": "size-8 min-h-0 p-0 has-[>svg]:p-0",
			},
		},
		defaultVariants: { size: "xs" },
	},
);
