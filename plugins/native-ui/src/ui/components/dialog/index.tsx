import type { Action } from "@fcalell/ui-core/descriptors";
import type { LucideIcon } from "lucide-react-native";
import { Modal, Pressable, Text, View } from "react-native";
import { cn } from "../../lib/cn";
import { useTokenColor } from "../../lib/theme";
import { Button } from "../button";

export interface DialogProps {
	visible: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	// Rendered inside the 48px disc, inked by `tone`.
	icon?: LucideIcon;
	// `danger` tints the icon chip for destructive confirms; otherwise neutral.
	tone?: "default" | "danger";
	// The action row, rendered through Button: a tertiary secondary beside a
	// primary that takes the dialog's tone (a danger dialog confirms in danger).
	primary?: Action<never>;
	secondary?: Action<never>;
	className?: string;
}

// Centred confirm dialog over a dimmed backdrop. Tapping the backdrop closes it.
// For destructive confirms set tone="danger" (the chip outlines in danger — fill
// stays reserved, per persona-by-fill). Routine choices belong in a BottomSheet.
export function Dialog({
	visible,
	onClose,
	title,
	description,
	icon: Icon,
	tone = "default",
	primary,
	secondary,
	className,
}: DialogProps) {
	const danger = tone === "danger";
	const iconColor = useTokenColor(danger ? "--color-danger" : "--color-ink-1");
	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<Pressable
				onPress={onClose}
				className="flex-1 items-center justify-center bg-scrim px-6"
			>
				{/* Stop propagation: taps on the card must not close the dialog. */}
				<Pressable
					onPress={() => {}}
					className={cn("w-full rounded-sheet bg-canvas p-5", className)}
				>
					{Icon ? (
						<View
							className={cn(
								"mb-3.5 h-12 w-12 items-center justify-center rounded-full border",
								danger ? "border-danger" : "border-edge",
							)}
						>
							<Icon size={24} color={iconColor} />
						</View>
					) : null}
					<Text className="mb-1.5 text-h3 font-bold text-ink-1">{title}</Text>
					{description ? (
						<Text className="text-callout text-ink-2">{description}</Text>
					) : null}
					{primary || secondary ? (
						<View className="mt-4 flex-row gap-3">
							{secondary ? (
								<View className="flex-1">
									<Button
										emphasis="tertiary"
										disabled={secondary.disabled}
										loading={secondary.loading}
										onPress={secondary.onSelect}
									>
										{secondary.label}
									</Button>
								</View>
							) : null}
							{primary ? (
								<View className="flex-1">
									<Button
										tone={danger ? "danger" : "neutral"}
										disabled={primary.disabled}
										loading={primary.loading}
										onPress={primary.onSelect}
									>
										{primary.label}
									</Button>
								</View>
							) : null}
						</View>
					) : null}
				</Pressable>
			</Pressable>
		</Modal>
	);
}
