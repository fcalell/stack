import { FORM_FOOT, form } from "@fcalell/ui-core/variants";
import {
	Children,
	Fragment,
	isValidElement,
	type ReactNode,
	useContext,
} from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { FieldWait } from "../../lib/field-wait";
import { FormContext, FormStands } from "../../lib/form";
import { useLeaveGuard } from "../../lib/leave";
import { LoadingContext } from "../../lib/loading";
import { TouchedContext, useTouchState } from "../../lib/touched";
import { ActionBar } from "../action-bar";
import { FormField, fieldWaitOf } from "../form-field";
import { Section } from "../section";

// A field's wrapper stays mounted, as the field in it, while its waiting form
// stands in its place, so what it holds (a typed text) outlives the wait.
const FIELD_WAITS = "hidden";

// Each `FormField` among the nodes (through fragments) stands as a waiting
// field while a loading `Section` or `Group` surrounds the form.
function waitFields(children: ReactNode, waiting: boolean): ReactNode[] {
	return Children.toArray(children).map((node) => {
		if (!isValidElement<{ children?: ReactNode }>(node)) return node;
		if (node.type === Fragment)
			return (
				<Fragment key={node.key}>
					{waitFields(node.props.children, waiting)}
				</Fragment>
			);
		if (node.type !== FormField) return node;
		return (
			<Fragment key={node.key}>
				{waiting ? <FieldWait {...fieldWaitOf(node)} /> : null}
				<View className={waiting ? FIELD_WAITS : undefined}>{node}</View>
			</Fragment>
		);
	});
}

export interface FormProps extends Closed {
	/** The fields, then its `ActionBar`, whose filled act submits the form. A form among a screen's other sections is `Section > Form`, so every section's head-to-body gap stays the pair step; `Section`s inside the form are the whole screen's, all at the fields step. */
	children?: ReactNode;
}

// One column, at most a line of running text wide on a page and the sheet's
// width in a sheet: fields apart at the fields rhythm, or sections at the sections rhythm with
// the `ActionBar` under a hairline across the form; the bar sits in flow, so
// it scrolls with the fields and the keyboard never covers it. Its filled act
// runs its `onAct` (native has no implicit submission); while that promise
// pends the act is pending and the others ignore the press. A blocked act
// says its reason once a field has taken input. While the
// form stands edited, leaving its screen (a back, a navigate) asks once,
// "Discard your edit?" or keep editing; pressing the filled act ends the edit,
// so an act that navigates is not asked, and a rejected act puts it back.
// Inside a loading `Section` or `Group` each `FormField` waits as a skeleton
// field and its `ActionBar` as its waiting form, the fields kept mounted,
// hidden.
export function Form({ children }: FormProps) {
	const within = useContext(FormStands);
	const [touch] = useTouchState();
	// A sheet's form is the sheet's: it closes on its own act and asks nothing.
	useLeaveGuard(touch.leave, within !== "sheet");
	const nodes = waitFields(children, useContext(LoadingContext));
	const sectioned = nodes.some(
		(node) => isValidElement(node) && node.type === Section,
	);
	return (
		<FormContext.Provider value>
			<TouchedContext.Provider value={touch}>
				<View
					className={form({
						holds: sectioned ? "sections" : "fields",
						in: within,
					})}
				>
					{sectioned
						? nodes.map((node) =>
								isValidElement(node) && node.type === ActionBar ? (
									<View key={node.key} className={FORM_FOOT}>
										{node}
									</View>
								) : (
									node
								),
							)
						: nodes}
				</View>
			</TouchedContext.Provider>
		</FormContext.Provider>
	);
}
