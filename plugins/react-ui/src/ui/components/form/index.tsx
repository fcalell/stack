import { cn } from "@fcalell/ui-core/cn";
import { FORM_FOOT, type FormIn, form } from "@fcalell/ui-core/variants";
import {
	Children,
	Fragment,
	isValidElement,
	type ReactNode,
	use,
	useState,
} from "react";
import type { Closed } from "../../lib/closed.ts";
import { FieldWait } from "../../lib/field-wait.tsx";
import { FormContext, FormStands, HOLDS_FILL } from "../../lib/form.ts";
import { useLeaveGuard } from "../../lib/leave.ts";
import { LoadingContext } from "../../lib/loading.ts";
import { TouchedContext, useTouchState } from "../../lib/touched.ts";
import { ActionBar } from "../action-bar/index.tsx";
import { FormField, fieldWaitOf } from "../form-field/index.tsx";
import { Section } from "../section/index.tsx";

const STACK = "flex flex-col";
// A field's wrapper stays mounted, as the field in it, while its waiting form
// stands in its place, so what it holds (a typed text) outlives the wait.
const FIELD_SHOWN = "contents";
const FIELD_WAITS = "hidden";
// In a Split's pane or a sheet's body, which scroll, the bar stays at the
// scroller's bottom edge. A sticky box sticks inside the scroller's padding, so
// the negative offset reaches the edge; the negative margin and matching
// padding run its ground and hairline across the scroller's inset, so what
// scrolls under it shows in no gutter.
const FOOT_STUCK: Partial<Record<FormIn, string>> = {
	pane: "sticky -bottom-page bg-surface -mx-page px-page -mb-page pb-page",
	sheet: "sticky -bottom-card bg-raised -mx-card px-card -mb-card pb-card",
};

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
				<div className={waiting ? FIELD_WAITS : FIELD_SHOWN}>{node}</div>
			</Fragment>
		);
	});
}

/** Fields and the acts that submit them. */
export interface FormProps extends Closed {
	/** The fields, then its `ActionBar`, whose filled act submits the form. A form among a page's other sections is `Section > Form`, so every section's head-to-body gap stays the pair step; `Section`s inside the form are the whole page's, all at the fields step. */
	children?: ReactNode;
}

/** One column, at most a line of running text wide on a page and the sheet's width in a sheet: fields apart at the fields rhythm, or sections at the sections rhythm with the `ActionBar` under a hairline across the form. Its bar's filled act is the submit button, so Enter in a field runs that act's `onAct`; while its promise pends the act is pending, the others ignore the press and the form is busy. A blocked act says its reason once a field has taken input. Inside a loading `Section` or `Group` each `FormField` waits as a skeleton field and its `ActionBar` as its waiting form, the fields kept mounted, hidden. While the form stands edited, leaving its page (a navigation, the back button, a reload) asks once, "Discard your edit?" or keep editing; pressing the filled act ends the edit, so an act that navigates is not asked, and a rejected act puts the edit back. */
export function Form({ children }: FormProps) {
	const within = use(FormStands);
	const [pending, setPending] = useState(false);
	const [touch] = useTouchState();
	// A sheet's form is the sheet's: it closes on its own act and asks nothing.
	useLeaveGuard(touch.leave, within !== "sheet");
	const nodes = waitFields(children, use(LoadingContext));
	const sectioned = nodes.some(
		(node) => isValidElement(node) && node.type === Section,
	);
	const stuck = FOOT_STUCK[within];
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
					{sectioned || stuck
						? nodes.map((node) =>
								isValidElement(node) && node.type === ActionBar ? (
									<div key={node.key} className={cn(FORM_FOOT, stuck)}>
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
