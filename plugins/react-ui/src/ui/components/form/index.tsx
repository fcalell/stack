import { cn } from "@fcalell/ui-core/cn";
import { FORM_FOOT, form } from "@fcalell/ui-core/variants";
import { Children, isValidElement, type ReactNode, use, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { FormContext, FormStands, HOLDS_FILL } from "../../lib/form.ts";
import { useLeaveGuard } from "../../lib/leave.ts";
import { TouchedContext, useTouchState } from "../../lib/touched.ts";
import { ActionBar } from "../action-bar/index.tsx";
import { Section } from "../section/index.tsx";

const STACK = "flex flex-col";

/** Fields and the acts that submit them. */
export interface FormProps extends Closed {
	/** The fields, or the `Section`s that hold them, then its `ActionBar`, whose filled act submits the form. */
	children?: ReactNode;
}

/** One column, at most a line of running text wide on a page and the sheet's width in a sheet: fields apart at the fields rhythm, or sections at the sections rhythm with the `ActionBar` under a hairline across the form. Its bar's filled act is the submit button, so Enter in a field runs that act's `onAct`; while its promise pends the act is pending, the others ignore the press and the form is busy. A blocked act says its reason once a field has taken input. While the form stands edited, leaving its page (a navigation, the back button, a reload) asks once, "Discard your edit?" or keep editing; pressing the filled act ends the edit, so an act that navigates is not asked, and a rejected act puts the edit back. */
export function Form({ children }: FormProps) {
	const within = use(FormStands);
	const [pending, setPending] = useState(false);
	const [touch] = useTouchState();
	// A sheet's form is the sheet's: it closes on its own act and asks nothing.
	useLeaveGuard(touch.leave, within !== "sheet");
	const nodes = Children.toArray(children);
	const sectioned = nodes.some(
		(node) => isValidElement(node) && node.type === Section,
	);
	return (
		<FormContext value={setPending}>
			<TouchedContext value={touch}>
				{/* The submit act's click runs its `onAct`; the submit only stays on the page. */}
				<form
					onSubmit={(event) => event.preventDefault()}
					onChange={touch.touch}
					aria-busy={pending || undefined}
					className={cn(
						form({ holds: sectioned ? "sections" : "fields", in: within }),
						STACK,
						HOLDS_FILL,
					)}
				>
					{sectioned
						? nodes.map((node) =>
								isValidElement(node) && node.type === ActionBar ? (
									<div key={node.key} className={FORM_FOOT}>
										{node}
									</div>
								) : (
									node
								),
							)
						: nodes}
				</form>
			</TouchedContext>
		</FormContext>
	);
}
