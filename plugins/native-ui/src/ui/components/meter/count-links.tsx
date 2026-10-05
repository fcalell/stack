import type { CountLink } from "@fcalell/ui-core/descriptors";
import { formatterFor } from "@fcalell/ui-core/format";
import { COUNT_LINKS, FIGURES, lineBox } from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { Link } from "../link";

const COUNTS = "flex-row flex-wrap";

// A line of counts that lead to their lists: each a figure and its label as a
// standalone link on the target height, its words at the meta size (the
// link's accent ink and weight are the words' own). Outside the package's
// exports.
export function CountLinks({ counts }: { counts: readonly CountLink[] }) {
	const number = formatterFor("number");
	return (
		<View className={cn(COUNT_LINKS, COUNTS)}>
			{counts.map((count) => (
				<Link
					key={`${count.href}${count.label}`}
					href={count.href}
					fit="standalone"
				>
					<RNText className={lineBox({ role: "meta" })}>
						<RNText className={FIGURES}>{number.format(count.value)}</RNText>{" "}
						{count.label}
					</RNText>
				</Link>
			))}
		</View>
	);
}
