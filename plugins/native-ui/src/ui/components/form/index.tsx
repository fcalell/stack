import { FORM_FOOT, form } from "@fcalell/ui-core/variants";
import { Children, isValidElement, type ReactNode, useContext } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { FormContext, FormStands } from "../../lib/form";
import { useLeaveGuard } from "../../lib/leave";
import { TouchedContext, useTouchState } from "../../lib/touched";
import { ActionBar } from "../action-bar";
import { Section } from "../section";

export interface FormProps extends Closed {
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
export function Form({ children }: FormProps) {
	const within = useContext(FormStands);
	const [touch] = useTouchState();
	// A sheet's form is the sheet's: it closes on its own act and asks nothing.
	useLeaveGuard(touch.leave, within !== "sheet");
	const nodes = Children.toArray(children);
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
