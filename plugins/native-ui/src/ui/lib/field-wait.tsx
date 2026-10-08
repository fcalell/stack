import type { FieldShape } from "@fcalell/ui-core/list-state";
import { formField, skeleton, skeletonRow } from "@fcalell/ui-core/variants";
import { View } from "react-native";
import { cn } from "./cn";
import { Strut } from "./strut";

// The label line at the length of a field label, the description's at the
// sentence's half measure.
const LABEL_WAIT = "w-1/4";
const NOTE_WAIT = "w-1/2";
// A bar stands in a text line's box: a strut sets the line's height, as the
// web's `h-lh` does.
export const LABEL_LINE = "flex-row items-center";
// The loaded field's geometry (`../components/form-field/index.tsx`): a switch
// beside the label block, a checkbox ahead of it on a line of the body role,
// the description under the label.
const BESIDE = "flex-row items-center min-w-0";
const AHEAD = "flex-row items-start min-w-0";
const LABEL_BLOCK = "flex-1 min-w-0";
const SWITCH_HIT =
	"shrink-0 items-center justify-center min-h-target min-w-target";
const BOX_LINE = "flex-row shrink-0 items-center";

// A form field's waiting form, in the form of the field it stands in for: a
// label bar over the control's box, a switch's box at the label's end, a
// checkbox's on the label's first line, and a description's bar under the
// label or the control. A loading `Section` stands it for each field it
// counts and a `Form` for each of its own, so the two never differ.
export function FieldWait({
	holds = "field",
	described = false,
}: Partial<FieldShape>) {
	const label = (
		<View className={LABEL_LINE}>
			<Strut role="body" />
			<View className={cn(skeleton({ kind: "line" }), LABEL_WAIT)} />
		</View>
	);
	const note = described ? (
		<View className={LABEL_LINE}>
			<Strut role="meta" />
			<View className={cn(skeleton({ kind: "line" }), NOTE_WAIT)} />
		</View>
	) : null;
	if (holds === "field")
		return (
			<View className={skeletonRow({ kind: "field" })}>
				{label}
				<View className={skeleton({ kind: "field" })} />
				{note}
			</View>
		);
	const block = (
		<View className={LABEL_BLOCK}>
			{label}
			{note}
		</View>
	);
	if (holds === "switch")
		return (
			<View className={cn(formField({ holds }), BESIDE)}>
				{block}
				<View className={SWITCH_HIT}>
					<View className={skeleton({ kind: "switch" })} />
				</View>
			</View>
		);
	return (
		<View className={cn(formField({ holds }), AHEAD)}>
			<View className={BOX_LINE}>
				<Strut role="body" />
				<View className={skeleton({ kind: "check" })} />
			</View>
			{block}
		</View>
	);
}
