import { Text, type TextProps, View, type ViewProps } from "react-native";

// Form-row anatomy around an Input / Textarea / trigger. The four parts and
// their type roles/inks are the shared facts with web's Field; web's Content
// and Value are web-only form-layout parts and are deliberately not mirrored.

interface RootProps extends ViewProps {
	className?: never;
	style?: never;
}

interface LabelProps extends TextProps {
	className?: never;
	style?: never;
	selectionColorClassName?: never;
}

interface DescriptionProps extends TextProps {
	className?: never;
	style?: never;
	selectionColorClassName?: never;
}

interface ErrorProps extends TextProps {
	className?: never;
	style?: never;
	selectionColorClassName?: never;
}

function Root(props: RootProps) {
	return <View {...props} className="w-full gap-2" />;
}

function Label(props: LabelProps) {
	return (
		<Text
			{...props}
			className="text-micro font-bold uppercase tracking-widest text-ink-3"
		/>
	);
}

function Description(props: DescriptionProps) {
	return <Text {...props} className="text-caption font-normal text-ink-3" />;
}

function FieldError(props: ErrorProps) {
	return <Text {...props} className="text-caption font-normal text-danger" />;
}

export const Field = Object.assign(Root, {
	Label,
	Description,
	Error: FieldError,
});
