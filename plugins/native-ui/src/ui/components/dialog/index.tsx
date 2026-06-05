import type { ReactNode } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { cn } from "#lib/cn";

export interface DialogProps {
	visible: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	// Icon chip glyph (e.g. a lucide <AlertTriangle/>). Tinted by `tone`.
	icon?: ReactNode;
	// `danger` tints the icon chip for destructive confirms; otherwise neutral.
	tone?: "default" | "danger";
	// Action buttons (typically a ghost cancel + a primary/danger confirm).
	children?: ReactNode;
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
	icon,
	tone = "default",
	children,
	className,
}: DialogProps) {
	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<Pressable
				onPress={onClose}
				className="flex-1 items-center justify-center bg-black/50 px-6"
			>
				{/* Stop propagation: taps on the card must not close the dialog. */}
				<Pressable
					onPress={() => {}}
					className={cn("w-full rounded-2xl bg-canvas p-5", className)}
				>
					{icon ? (
						<View
							className={cn(
								"mb-3.5 h-12 w-12 items-center justify-center rounded-full border",
								tone === "danger" ? "border-danger" : "border-edge",
							)}
						>
							{icon}
						</View>
					) : null}
					<Text className="mb-1.5 text-lg font-extrabold text-ink-1">
						{title}
					</Text>
					{description ? (
						<Text className="text-sm text-ink-2">{description}</Text>
					) : null}
					{children ? (
						<View className="mt-4 flex-row gap-3">{children}</View>
					) : null}
				</Pressable>
			</Pressable>
		</Modal>
	);
}
