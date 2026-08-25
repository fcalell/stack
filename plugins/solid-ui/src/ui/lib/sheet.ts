import { cva } from "class-variance-authority";

// ─── Shared style constants ───

// The sheet look. `Sheet.Content` renders it; sidebar's mobile branch composes
// Kobalte's dialog primitives directly with the same strings, so no class
// crosses a component boundary.

export const sheetPortalVariants = cva("fixed inset-0 z-50 flex", {
	variants: {
		position: {
			top: "items-start",
			bottom: "items-end",
			left: "justify-start",
			right: "justify-end",
		},
	},
	defaultVariants: { position: "right" },
});

export const sheetOverlayClass =
	"fixed inset-0 z-50 bg-scrim data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0";

export const sheetVariants = cva(
	"fixed z-50 gap-4 bg-canvas p-6 transition duration-200 ease-ui data-[expanded]:animate-in data-[closed]:animate-out",
	{
		variants: {
			position: {
				top: "inset-x-0 top-0 rounded-b-sheet border-b data-[closed]:slide-out-to-top data-[expanded]:slide-in-from-top",
				bottom:
					"inset-x-0 bottom-0 rounded-t-sheet border-t data-[closed]:slide-out-to-bottom data-[expanded]:slide-in-from-bottom",
				left: "inset-y-0 left-0 h-full w-3/4 rounded-r-sheet border-r data-[closed]:slide-out-to-left data-[expanded]:slide-in-from-left",
				right:
					"inset-y-0 right-0 h-full w-3/4 rounded-l-sheet border-l data-[closed]:slide-out-to-right data-[expanded]:slide-in-from-right",
			},
			size: {
				sm: "sm:max-w-sm",
				md: "sm:max-w-md",
				lg: "sm:max-w-lg",
				xl: "sm:max-w-xl",
				full: "max-w-none",
			},
		},
		defaultVariants: {
			position: "right",
			size: "sm",
		},
	},
);
