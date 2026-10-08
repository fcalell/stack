import { cn } from "@fcalell/ui-core/cn";
import { lineBox, skeleton, skeletonRow } from "@fcalell/ui-core/variants";

const FIELD_WAIT = "flex flex-col";
// The label line at the length of a field label.
const LABEL_WAIT = "w-1/4";
// The label's bar stands in the label's line box, at its line height.
const LABEL_LINE = "flex items-center h-lh";

// A form field's waiting form: a label bar over the control's box. A loading
// `Section` stands it for each field it counts and a `Form` for each of its
// own, so the two never differ.
export function FieldWait() {
	return (
		<div aria-hidden className={cn(skeletonRow({ kind: "field" }), FIELD_WAIT)}>
			<span className={cn(lineBox({ role: "body" }), LABEL_LINE)}>
				<span className={cn(skeleton({ kind: "line" }), LABEL_WAIT)} />
			</span>
			<span className={skeleton({ kind: "field" })} />
		</div>
	);
}
