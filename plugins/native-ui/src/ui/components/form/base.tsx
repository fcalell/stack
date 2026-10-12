import {
	FORM_FOOT,
	FORM_GROUP,
	FORM_LEGEND,
	type FormIn,
	form,
	text,
} from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { useLeaveGuard } from "../../lib/leave";
import { LoadingContext, useWait, VEIL } from "../../lib/loading";
import { TouchedContext, useTouched, useTouchState } from "../../lib/touched";
import { ActionBar } from "../action-bar";
import { Text } from "../text";
import type { FormGroup, FormProps } from "./index";

// One group: its heading, its description and lead, and its fields, which
// wait together when the group loads. The wait is a read that lasts: drawn
// after a delay and held a minimum, the fields undrawn meanwhile.
function GroupBox(props: { group: FormGroup }) {
	const { group } = props;
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
				<RNText
					accessibilityRole="header"
					className={cn(text({ role: "heading" }), FORM_LEGEND)}
				>
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

// What every form draws: the public `Form` (`in` the page), a `Sheet`'s (`in`
// the sheet) and a `Gate`'s (`in` the auth column). Outside the package's
// exports: `in` is the drawers' alone. A sheet's form takes the sheet's
// touched state, which its foot's bar reads too, and asks nothing when it is
// left.
export function FormBody({
	children,
	groups,
	bar,
	in: within,
}: FormProps & { in: FormIn }) {
	const [own] = useTouchState();
	const sheet = useTouched();
	const touch = within === "sheet" ? sheet : own;
	useLeaveGuard(touch.leave, within !== "sheet");
	const acts = bar === undefined ? null : <ActionBar {...bar} />;
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
							<GroupBox key={group.title ?? index} group={group} />
						))
					: children}
				{groups && acts ? <View className={FORM_FOOT}>{acts}</View> : acts}
			</View>
		</TouchedContext.Provider>
	);
}
