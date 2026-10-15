import {
	FORM_FOOT,
	FORM_GROUP,
	FORM_LEGEND,
	type FormIn,
	form,
	text,
} from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import type { Acting } from "../../lib/act";
import { cn } from "../../lib/cn";
import { useLeaveGuard } from "../../lib/leave";
import {
	BusyMark,
	FrameBody,
	FrameLine,
	formReads,
	useFrame,
} from "../../lib/read";
import { TouchedContext, useTouched, useTouchState } from "../../lib/touched";
import { ActionBarBase } from "../action-bar/base";
import { Text } from "../text";
import type { FormGroup, FormProps } from "./index";

// The legend is a row, the busy mark after its title.
const LEGEND = "flex-row items-center gap-inside";

// One group: its heading, its description and lead, and its fields, which are
// the group's own frame when it holds a `read`.
function GroupBox(props: { group: FormGroup }) {
	const { group } = props;
	const frame = useFrame(group.read);
	return (
		<View
			role="group"
			accessibilityLabel={group.title}
			accessibilityState={{
				busy: frame.holds && frame.form === "waiting",
			}}
			className={FORM_GROUP}
		>
			{group.title ? (
				<View className={LEGEND}>
					<RNText
						accessibilityRole="header"
						className={cn(text({ role: "heading" }), FORM_LEGEND, "shrink")}
					>
						{group.title}
					</RNText>
					<BusyMark frame={frame} />
				</View>
			) : null}
			<FrameLine frame={frame} flow />
			{group.description ? <Text role="meta">{group.description}</Text> : null}
			{group.lead}
			<View className={FORM_GROUP}>
				<FrameBody
					frame={frame}
					fit="frame"
					empty={group.empty}
					failed={group.failed}
				>
					{group.fields}
				</FrameBody>
			</View>
		</View>
	);
}

// What every form draws: the public `Form` (`in` the page), a `Sheet`'s (`in`
// the sheet) and a `Gate`'s (`in` the auth column). Outside the package's
// exports: `in` is the drawers' alone. A sheet's form takes the sheet's
// touched state, which its foot's bar reads too, and asks nothing when it is
// left. A bar the form is given draws in its flow and subscribes to the reads
// its fields hold; a sheet hoists the bar into its foot and gives it the same.
export function FormBody({
	children,
	groups,
	bar,
	read,
	empty,
	failed,
	in: within,
	acting,
}: FormProps & {
	in: FormIn;
	// The holder of the bar's run, when the form stands in one that holds more
	// than the bar (a docked sheet's dismissal).
	acting?: Acting<number>;
}) {
	const frame = useFrame(read);
	const [own] = useTouchState();
	const sheet = useTouched();
	const touch = within === "sheet" ? sheet : own;
	useLeaveGuard(touch.leave, within !== "sheet");
	const acts =
		bar === undefined ? null : (
			<ActionBarBase
				{...bar}
				acting={acting}
				waits={formReads({ read, groups })}
			/>
		);
	return (
		<TouchedContext.Provider value={touch}>
			<View
				accessibilityState={{ busy: frame.holds && frame.form === "waiting" }}
				className={form({
					holds: groups ? "sections" : "fields",
					in: within,
				})}
			>
				<FrameLine frame={frame} flow />
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
