import type { CountLink } from "@fcalell/ui-core/descriptors";
import { formatterFor } from "@fcalell/ui-core/format";
import {
	COUNT_LINKS,
	FIGURES,
	LINK_TARGET,
	lineBox,
} from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { Painted } from "../../lib/paint";
import { Link } from "../link";

const COUNTS = "flex-row flex-wrap";
const PAINTED = "justify-center";
// A link's words wrap inside the row's width, so a long label never pushes a link past the edge.
const LINK = "shrink";

// A line of counts that lead to their lists: each a figure and its label as a
// standalone link on the target height, its words at the meta size (the
// link's accent ink and weight are the words' own). Outside the package's
// exports. `painted` while the counts are not here: one link's target box and
// a phrase's filler.
export function CountLinks({
	counts,
	painted,
}: {
	counts: readonly CountLink[];
	painted?: boolean;
}) {
	const number = formatterFor("number");
	if (painted)
		return (
			<View className={cn(COUNT_LINKS, COUNTS)}>
				<View className={cn(LINK_TARGET, PAINTED)}>
					<RNText className={lineBox({ role: "meta" })}>
						<Painted role="phrase" />
					</RNText>
				</View>
			</View>
		);
	return (
		<View className={cn(COUNT_LINKS, COUNTS)}>
			{counts.map((count) => (
				<View key={`${count.href}${count.label}`} className={LINK}>
					<Link href={count.href} fit="standalone">
						<RNText className={lineBox({ role: "meta" })}>
							<RNText className={FIGURES}>{number.format(count.value)}</RNText>{" "}
							{count.label}
						</RNText>
					</Link>
				</View>
			))}
		</View>
	);
}
