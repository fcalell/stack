import { cva, type VariantProps } from "class-variance-authority";
import { Text, View } from "react-native";

// Presentational toast surface. The imperative queue/host (the native analog
// of solid-sonner's <Toaster />) is still deferred; for now a screen can render
// this directly inside its own overlay.
const toast = cva(
	"flex-row items-center gap-2 rounded-md border bg-canvas px-4 py-3",
	{
		variants: {
			tone: {
				neutral: "border-edge",
				ok: "border-ok",
				danger: "border-danger",
			},
		},
		defaultVariants: { tone: "neutral" },
	},
);

export interface ToastProps extends VariantProps<typeof toast> {
	message: string;
	className?: never;
	style?: never;
}

export function Toast({ tone, message }: ToastProps) {
	return (
		<View className={toast({ tone })}>
			<Text className="flex-1 text-callout text-ink-1">{message}</Text>
		</View>
	);
}
