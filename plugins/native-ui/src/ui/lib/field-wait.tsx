import { skeleton, skeletonRow } from "@fcalell/ui-core/variants";
import { View } from "react-native";
import { cn } from "./cn";
import { Strut } from "./strut";

// The label line at the length of a field label.
const LABEL_WAIT = "w-1/4";
// A bar stands in a text line's box: a strut sets the line's height, as the
// web's `h-lh` does.
export const LABEL_LINE = "flex-row items-center";

// A form field's waiting form: a label bar over the control's box. A loading
// `Section` stands it for each field it counts and a `Form` for each of its
// own, so the two never differ.
export function FieldWait() {
	return (
		<View className={skeletonRow({ kind: "field" })}>
			<View className={LABEL_LINE}>
				<Strut role="body" />
				<View className={cn(skeleton({ kind: "line" }), LABEL_WAIT)} />
			</View>
			<View className={skeleton({ kind: "field" })} />
		</View>
	);
}
