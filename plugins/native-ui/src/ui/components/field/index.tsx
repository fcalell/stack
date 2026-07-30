import { Text, type TextProps, View, type ViewProps } from "react-native";
import { cn } from "../../lib/cn";

// Form-row anatomy around an Input / TextArea / trigger. The four parts and
// their type roles/inks are the shared facts with web's Field; web's Content
// and Value are web-only form-layout parts and are deliberately not mirrored.

function Root({ className, ...rest }: ViewProps) {
	return <View className={cn("w-full gap-2", className)} {...rest} />;
}

function Label({ className, ...rest }: TextProps) {
	return (
		<Text
			className={cn(
				"text-micro font-bold uppercase tracking-widest text-ink-3",
				className,
			)}
			{...rest}
		/>
	);
}

function Description({ className, ...rest }: TextProps) {
	return (
		<Text
			className={cn("text-caption font-normal text-ink-3", className)}
			{...rest}
		/>
	);
}

function FieldError({ className, ...rest }: TextProps) {
	return (
		<Text
			className={cn("text-caption font-normal text-danger", className)}
			{...rest}
		/>
	);
}

export const Field = Object.assign(Root, {
	Label,
	Description,
	Error: FieldError,
});
