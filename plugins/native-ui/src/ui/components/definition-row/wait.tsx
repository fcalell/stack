import type { DefinitionShape } from "@fcalell/ui-core/list-state";
import {
	DEFINITION_ROW,
	DEFINITION_ROW_CHEVRON,
	ROW_TITLE_LINE,
	skeleton,
	skeletonRow,
} from "@fcalell/ui-core/variants";
import { View } from "react-native";
import { cn } from "../../lib/cn";
import { Strut } from "../../lib/strut";

// The geometry of the loaded DefinitionRow (`./index.tsx`): the label's line
// beside the switch's hit box on the title line, the description's line under
// it, each line's height set by a zero-width strut at its role, so each bar
// centres where its text does.
const ROW = "flex-row items-center";
const MARK = "shrink-0 items-center justify-center";
const LINES = "flex-1 min-w-0";
const TITLE = "flex-row items-center min-w-0";
const LABEL_LINE = "flex-1 min-w-0 flex-row items-center";
const META_LINE = "flex-row items-center";
const END = "shrink-0";
const SWITCH = "shrink-0 items-center justify-center min-h-target min-w-target";
// A fact's label bar a third of the line, its value bar a quarter, at the
// line's end.
const LABEL_ONE = "w-1/3 flex-row items-center";
const BAR = "flex-1";
const VALUE_BAR = "ms-auto w-1/4";
// A setting row's bars, a label over a description, each at the length of the
// line it stands in for.
const BARS = [
	["w-1/3", "w-1/4"],
	["w-1/4", "w-1/4"],
	["w-1/3", "w-1/2"],
] as const;

// A DefinitionRow waiting, the `index`th of a waiting list: the change mark's
// skeleton in its lane when `change` is declared; a label bar and a value bar
// at the line's end, or, with a `description`, the label bar over a meta
// line's bar; then the act's square, the link's chevron square or the
// switch's box at the end. Busy only through the Group or List that holds it.
// Outside the package's exports.
export function DefinitionWait(props: {
	shape: DefinitionShape;
	index: number;
}) {
	const { shape } = props;
	const [label, description] = BARS[props.index % BARS.length] ?? BARS[0];
	const one = !shape.description;
	return (
		<View
			className={cn(
				skeletonRow({ kind: one ? "one-line-group" : "setting" }),
				DEFINITION_ROW,
				ROW,
			)}
		>
			{shape.change ? (
				<View className={MARK}>
					<View className={skeleton({ kind: "icon" })} />
				</View>
			) : null}
			<View className={LINES}>
				{one ? (
					<View className={cn(ROW_TITLE_LINE, TITLE)}>
						<View className={LABEL_ONE}>
							<Strut role="body" />
							<View className={cn(skeleton({ kind: "line" }), BAR)} />
						</View>
						<View className={cn(skeleton({ kind: "line" }), VALUE_BAR)} />
					</View>
				) : (
					<>
						<View className={cn(ROW_TITLE_LINE, TITLE)}>
							<View className={LABEL_LINE}>
								<Strut role="body" />
								<View className={cn(skeleton({ kind: "line" }), label)} />
							</View>
							{shape.end === "switch" ? (
								<View className={SWITCH}>
									<View className={skeleton({ kind: "switch" })} />
								</View>
							) : null}
						</View>
						<View className={META_LINE}>
							<Strut role="meta" />
							<View className={cn(skeleton({ kind: "line" }), description)} />
						</View>
					</>
				)}
			</View>
			{shape.end === "act" || shape.end === "chevron" ? (
				<View className={cn(DEFINITION_ROW_CHEVRON, END)} />
			) : null}
		</View>
	);
}
