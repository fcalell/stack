import { cva, type VariantProps } from "class-variance-authority";
import { Text, View } from "react-native";
import { cn } from "#lib/cn";

// Presentational toast surface. The imperative queue/host (the native analog
// of solid-sonner's <Toaster />) is still deferred; for now a screen can render
// this directly inside its own overlay.
const toast = cva(
	"flex-row items-center gap-2 rounded-md border bg-canvas px-4 py-3",
	{
		variants: {
			variant: {
				default: "border-edge",
				success: "border-ok",
				danger: "border-danger",
			},
		},
		defaultVariants: { variant: "default" },
	},
);

export interface ToastProps extends VariantProps<typeof toast> {
	message: string;
	className?: string;
}

export function Toast({ variant, message, className }: ToastProps) {
	return (
		<View className={cn(toast({ variant }), className)}>
			<Text className="flex-1 text-sm text-ink-1">{message}</Text>
		</View>
	);
}
