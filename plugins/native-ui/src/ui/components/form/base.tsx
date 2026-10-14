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
import { type Frame, FrameBody, useFrame } from "../../lib/read";
import { TouchedContext, useTouched, useTouchState } from "../../lib/touched";
import { ActionBarBase } from "../action-bar/base";
import { Text } from "../text";
import type { FormGroup, FormProps } from "./index";

// One group: its heading, its description and lead, and its fields, which
// wait together when the group loads. The wait is a read that lasts: drawn
// after a delay and held a minimum, the fields undrawn meanwhile.
function GroupBox(props: { group: FormGroup }) {
	const { group } = props;
	const late = useWait(group.loading === true);
	const frame = useFrame(group.read);
	// A Section around the form waits its groups too.
	const waiting = useContext(LoadingContext) || late.waiting;
	return (
		<View
			role="group"
			accessibilityLabel={group.title}
			accessibilityState={{
				busy: late.waiting || (frame.holds && frame.waits),
			}}
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
					<FrameBody
						frame={frame}
						fit="frame"
						empty={group.empty}
						failed={group.failed}
					>
						{group.fields}
					</FrameBody>
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
	read,
	empty,
	failed,
	frame: held,
	in: within,
}: FormProps & {
	in: FormIn;
	// The frame its read was subscribed to by the parent that hoists the bar (a
	// `Sheet`), which holds the read; the form then subscribes to none.
	frame?: Frame;
}) {
	const subscribed = useFrame(held === undefined ? read : undefined);
	const frame = held ?? subscribed;
	const [own] = useTouchState();
	const sheet = useTouched();
	const touch = within === "sheet" ? sheet : own;
	useLeaveGuard(touch.leave, within !== "sheet");
	const acts =
		bar === undefined ? null : <ActionBarBase {...bar} painted={frame.waits} />;
	return (
		<TouchedContext.Provider value={touch}>
			<View
				accessibilityState={{ busy: frame.holds && frame.waits }}
				className={form({
					holds: groups ? "sections" : "fields",
					in: within,
				})}
			>
				<FrameBody frame={frame} fit="frame" empty={empty} failed={failed}>
					{groups
						? groups.map((group, index) => (
								<GroupBox key={group.title ?? index} group={group} />
							))
						: children}
				</FrameBody>
				{groups && acts ? <View className={FORM_FOOT}>{acts}</View> : acts}
			</View>
		</TouchedContext.Provider>
	);
}
