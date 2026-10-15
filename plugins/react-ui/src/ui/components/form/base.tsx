import { cn } from "@fcalell/ui-core/cn";
import {
	FORM_FOOT,
	FORM_GROUP,
	FORM_LEGEND,
	type FormIn,
	form,
	text,
} from "@fcalell/ui-core/variants";
import { useState } from "react";
import { FormContext } from "../../lib/form.ts";
import { useLeaveGuard } from "../../lib/leave.ts";
import { BusyMark, FrameBody, FrameLine, useFrame } from "../../lib/read.tsx";
import { useSettleName } from "../../lib/settle.ts";
import { TouchedContext, useTouchState } from "../../lib/touched.ts";
import { ActionBarBase } from "../action-bar/base.tsx";
import { Text } from "../text/index.tsx";
import type { FormGroup, FormProps } from "./index.tsx";

const STACK = "flex flex-col";
const GROUP = "flex flex-col min-w-0";
// The legend is a line, the busy mark after its title.
const LEGEND = "flex items-center gap-pair";
// In a sheet's body, which scrolls, the bar stays at the
// scroller's bottom edge. A sticky box sticks inside the scroller's padding, so
// the negative offset reaches the edge; the negative margin and matching
// padding run its ground and hairline across the scroller's inset, so what
// scrolls under it shows in no gutter.
const FOOT_STUCK =
	"sticky -bottom-card bg-raised -mx-card px-card -mb-card pb-card";

// One group: its legend, its description and lead, and its fields, which are
// the group's own frame when it holds a `read`.
function GroupBox(props: { group: FormGroup }) {
	const { group } = props;
	const frame = useFrame(group.read);
	const settle = useSettleName();
	return (
		<fieldset
			aria-busy={(frame.holds && frame.form === "waiting") || undefined}
			style={group.read === undefined ? undefined : settle}
			className={cn(FORM_GROUP, GROUP)}
		>
			{group.title ? (
				<legend className={cn(text({ role: "heading" }), FORM_LEGEND, LEGEND)}>
					{group.title}
					<BusyMark frame={frame} />
				</legend>
			) : null}
			<FrameLine frame={frame} />
			{group.description ? <Text role="meta">{group.description}</Text> : null}
			{group.lead}
			<FrameBody
				frame={frame}
				fit="frame"
				empty={group.empty}
				failed={group.failed}
			>
				{group.fields}
			</FrameBody>
		</fieldset>
	);
}

/** What every form draws: the public `Form` (`in` the page), a `Sheet`'s (`in` the sheet) and a `Gate`'s (`in` the auth column). Outside the package's exports: `in` is the drawers' alone. */
export function FormBody({
	children,
	groups,
	bar,
	read,
	empty,
	failed,
	in: within,
}: FormProps & { in: FormIn }) {
	const frame = useFrame(read);
	const settle = useSettleName();
	const [pending, setPending] = useState(false);
	const [touch] = useTouchState();
	// A sheet's form is the sheet's: it closes on its own act and asks nothing.
	useLeaveGuard(touch.leave, within !== "sheet");
	const stuck = within === "sheet" ? FOOT_STUCK : undefined;
	const foot =
		bar === undefined ? null : groups || stuck ? (
			<div className={cn(FORM_FOOT, stuck)}>
				<ActionBarBase {...bar} painted={frame.waits} />
			</div>
		) : (
			<ActionBarBase {...bar} painted={frame.waits} />
		);
	return (
		<FormContext value={setPending}>
			<TouchedContext value={touch}>
				{/* The submit act's click runs its `onAct`; the submit only stays on the page. */}
				<form
					onSubmit={(event) => event.preventDefault()}
					onChange={touch.touch}
					aria-busy={
						pending || (frame.holds && frame.form === "waiting") || undefined
					}
					style={read === undefined ? undefined : settle}
					className={cn(
						form({ holds: groups ? "sections" : "fields", in: within }),
						STACK,
					)}
				>
					<FrameLine frame={frame} />
					<FrameBody frame={frame} fit="frame" empty={empty} failed={failed}>
						{groups
							? groups.map((group, index) => (
									<GroupBox key={group.title ?? index} group={group} />
								))
							: children}
					</FrameBody>
					{foot}
				</form>
			</TouchedContext>
		</FormContext>
	);
}
