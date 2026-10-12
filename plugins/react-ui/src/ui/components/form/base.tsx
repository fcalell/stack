import { cn } from "@fcalell/ui-core/cn";
import {
	FORM_FOOT,
	FORM_GROUP,
	FORM_LEGEND,
	type FormIn,
	form,
	text,
} from "@fcalell/ui-core/variants";
import { use, useState } from "react";
import { FormContext } from "../../lib/form.ts";
import { useLeaveGuard } from "../../lib/leave.ts";
import { LoadingContext, useWait, VEIL } from "../../lib/loading.ts";
import { TouchedContext, useTouchState } from "../../lib/touched.ts";
import { ActionBar } from "../action-bar/index.tsx";
import { Text } from "../text/index.tsx";
import type { FormGroup, FormProps } from "./index.tsx";

const STACK = "flex flex-col";
const GROUP = "flex flex-col min-w-0";
// The fields stand in the group's own rhythm, wrapped only to carry the veil.
const FIELDS = "contents";
// In a sheet's body, which scrolls, the bar stays at the
// scroller's bottom edge. A sticky box sticks inside the scroller's padding, so
// the negative offset reaches the edge; the negative margin and matching
// padding run its ground and hairline across the scroller's inset, so what
// scrolls under it shows in no gutter.
const FOOT_STUCK =
	"sticky -bottom-card bg-raised -mx-card px-card -mb-card pb-card";

// One group: its legend, its description and lead, and its fields, which wait
// together when the group loads. The wait is a read that lasts: drawn after a
// delay and held a minimum, the fields undrawn meanwhile.
function GroupBox(props: { group: FormGroup }) {
	const { group } = props;
	const late = useWait(group.loading === true);
	// A Section around the form waits its groups too.
	const waiting = use(LoadingContext) || late.waiting;
	return (
		<fieldset
			aria-busy={late.waiting || undefined}
			className={cn(FORM_GROUP, GROUP)}
		>
			{group.title ? (
				<legend className={cn(text({ role: "heading" }), FORM_LEGEND)}>
					{group.title}
				</legend>
			) : null}
			{group.description ? <Text role="meta">{group.description}</Text> : null}
			{group.lead}
			<LoadingContext value={waiting}>
				<div className={cn(FIELDS, late.veiled && VEIL)}>{group.fields}</div>
			</LoadingContext>
		</fieldset>
	);
}

/** What every form draws: the public `Form` (`in` the page), a `Sheet`'s (`in` the sheet) and a `Gate`'s (`in` the auth column). Outside the package's exports: `in` is the drawers' alone. */
export function FormBody({
	children,
	groups,
	bar,
	in: within,
}: FormProps & { in: FormIn }) {
	const [pending, setPending] = useState(false);
	const [touch] = useTouchState();
	// A sheet's form is the sheet's: it closes on its own act and asks nothing.
	useLeaveGuard(touch.leave, within !== "sheet");
	const stuck = within === "sheet" ? FOOT_STUCK : undefined;
	const foot =
		bar === undefined ? null : groups || stuck ? (
			<div className={cn(FORM_FOOT, stuck)}>
				<ActionBar {...bar} />
			</div>
		) : (
			<ActionBar {...bar} />
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
						form({ holds: groups ? "sections" : "fields", in: within }),
						STACK,
					)}
				>
					{groups
						? groups.map((group, index) => (
								<GroupBox key={group.title ?? index} group={group} />
							))
						: children}
					{foot}
				</form>
			</TouchedContext>
		</FormContext>
	);
}
