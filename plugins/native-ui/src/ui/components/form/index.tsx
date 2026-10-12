import {
	FORM_FOOT,
	FORM_GROUP,
	FORM_LEGEND,
	form,
	SECTION_NESTED_TITLE,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useContext, useLayoutEffect } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { FootSlotContext, FormStands } from "../../lib/form";
import { useLeaveGuard } from "../../lib/leave";
import { LoadingContext, useWait, VEIL } from "../../lib/loading";
import { TouchedContext, useTouchState } from "../../lib/touched";
import { ActionBar, type ActionBarProps } from "../action-bar";
import { Text } from "../text";

// One group of fields a `Form` draws, titled.
export interface FormGroup {
	/** The group's name, its heading (a short phrase; wraps); without it the group draws no heading, for fields that lead or close the form among titled groups. */
	title?: string;
	/** Under the title (a sentence; wraps). */
	description?: string;
	/** A note ahead of the fields (a `Banner`, a sentence). */
	lead?: ReactNode;
	/** The group's `FormField`s. */
	fields: ReactNode;
	/** The group's data is on its way: the group is busy and each `FormField` in it draws its own waiting form, its typed text kept. */
	loading?: boolean;
}

interface FormBase extends Closed {
	/** The acts that close the form, drawn in its foot; the bar's filled act submits the form. */
	bar?: ActionBarProps;
}

// The form's structure is its props: `children`, a flat run of `FormField`s,
// or `groups`, each drawn as a titled group; never both. A form among a
// screen's other sections is `Section > Form`, so every section's head-to-body
// gap stays the pair step.
export type FormProps = FormBase &
	(
		| {
				/** A flat run of `FormField`s, a fields step apart. */
				children?: ReactNode;
				groups?: never;
		  }
		| {
				children?: never;
				/** Groups of fields, a sections step apart, each its heading with its fields a fields step apart. */
				groups: readonly FormGroup[];
		  }
	);

// One group: its heading, its description and lead, and its fields, which
// wait together when the group loads. The wait is a read that lasts: drawn
// after a delay and held a minimum, the fields undrawn meanwhile.
function GroupBox(props: { group: FormGroup; heading: string }) {
	const { group, heading } = props;
	const late = useWait(group.loading === true);
	// A Section around the form waits its groups too.
	const waiting = useContext(LoadingContext) || late.waiting;
	return (
		<View
			role="group"
			accessibilityLabel={group.title}
			accessibilityState={{ busy: late.waiting }}
			className={FORM_GROUP}
		>
			{group.title ? (
				<RNText accessibilityRole="header" className={cn(heading, FORM_LEGEND)}>
					{group.title}
				</RNText>
			) : null}
			{group.description ? <Text role="meta">{group.description}</Text> : null}
			{group.lead}
			<LoadingContext.Provider value={waiting}>
				<View className={cn(FORM_GROUP, late.veiled && VEIL)}>
					{group.fields}
				</View>
			</LoadingContext.Provider>
		</View>
	);
}

// One column, at most a line of running text wide on a page and the sheet's
// width in a sheet: fields apart at the fields rhythm, or `groups` apart at
// the sections rhythm with the `bar` under a hairline across the form; the bar
// sits in flow, so it scrolls with the fields and the keyboard never covers
// it; in a sheet it is the sheet's foot instead (the form hands it up),
// pinned while the fields scroll and at the content's end when they do not.
// Its filled act runs its `onAct` (native has no implicit submission); while
// that promise pends the act is pending and the others ignore the press. A
// blocked act says its reason once a field has taken input. While the form
// stands edited, leaving its screen (a back, a navigate) asks once, "Discard
// your edit?" or keep editing; pressing the filled act ends the edit, so an
// act that navigates is not asked, and a rejected act puts it back.
export function Form({ children, groups, bar }: FormProps) {
	const within = useContext(FormStands);
	const [touch] = useTouchState();
	// A sheet's form is the sheet's: it closes on its own act and asks nothing.
	useLeaveGuard(touch.leave, within !== "sheet");
	const loading = useContext(LoadingContext);
	// In a sheet the form's bar leaves its body for the sheet's foot, which
	// draws it in the form's own contexts.
	const slot = useContext(FootSlotContext);
	const lifted = slot !== null && within === "sheet";
	const acts = bar === undefined ? null : <ActionBar {...bar} />;
	const foot =
		lifted && acts !== null ? (
			<TouchedContext.Provider value={touch}>
				<LoadingContext.Provider value={loading}>
					{acts}
				</LoadingContext.Provider>
			</TouchedContext.Provider>
		) : null;
	useLayoutEffect(() => slot?.set(foot));
	useLayoutEffect(() => () => slot?.set(null), [slot]);
	return (
		<TouchedContext.Provider value={touch}>
			<View
				className={form({
					holds: groups ? "sections" : "fields",
					in: within,
				})}
			>
				{groups
					? groups.map((group, index) => (
							<GroupBox
								key={group.title ?? index}
								group={group}
								heading={
									within === "sheet"
										? SECTION_NESTED_TITLE
										: text({ role: "heading" })
								}
							/>
						))
					: children}
				{lifted ? null : groups && acts ? (
					<View className={FORM_FOOT}>{acts}</View>
				) : (
					acts
				)}
			</View>
		</TouchedContext.Provider>
	);
}
