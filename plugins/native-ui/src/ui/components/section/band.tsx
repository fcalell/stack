import type { IconLinkAct } from "@fcalell/ui-core/descriptors";
import { LIST_BAND, text, textStrong } from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import { asIconAct, type IconAct } from "../../lib/act";
import { cn } from "../../lib/cn";
import { Button } from "../button";
import { CountBase } from "../count/base";

const BAND = "flex-row items-center";
// The label and its count stand together, the act at the end.
const NAME = "flex-row items-center min-w-0 grow gap-gap";
const LABEL = "shrink min-w-0";

/** A band: its label, the count of its rows (none when it has none) and its act. Outside the package's exports; the Section draws it. */
export function BandHead(props: {
	label: string;
	count: number;
	act?: IconAct | IconLinkAct;
}) {
	const { act } = props;
	return (
		<View className={cn(LIST_BAND, BAND)}>
			<View className={NAME}>
				<RNText
					accessibilityRole="header"
					numberOfLines={1}
					className={cn(
						text({ role: "body" }),
						textStrong({ role: "body" }),
						LABEL,
					)}
				>
					{props.label}
				</RNText>
				{props.count > 0 ? <CountBase value={props.count} /> : null}
			</View>
			{act ? <Button glyph {...asIconAct(act)} /> : null}
		</View>
	);
}
