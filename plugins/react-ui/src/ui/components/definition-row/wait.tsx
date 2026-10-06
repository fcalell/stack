import { cn } from "@fcalell/ui-core/cn";
import type { DefinitionShape } from "@fcalell/ui-core/list-state";
import {
	DEFINITION_ROW,
	DEFINITION_ROW_CHEVRON,
	lineBox,
	ROW_TITLE_LINE,
	skeleton,
	skeletonRow,
	text,
} from "@fcalell/ui-core/variants";

// The geometry of the loaded DefinitionRow (`./index.tsx`): the label's line
// box beside the switch's hit box on the title line, the description's line
// box under it, so each bar centres where its text does.
const ROW = "flex items-center";
const MARK = "flex shrink-0 items-center justify-center";
const LINES = "flex grow min-w-0 flex-col";
const TITLE = "flex items-center min-w-0";
const LINE_HEIGHT = "h-lh";
const LABEL_LINE = "flex grow min-w-0 items-center h-lh";
const META_LINE = "flex items-center h-lh";
const END = "shrink-0";
const SWITCH =
	"flex shrink-0 items-center justify-center min-h-target min-w-target";
// A fact's label bar four figures wide, a short label's, starting where the
// label text does; its value bar at the line's end in the room the value
// takes. An identifier (`code`) fills the room the label leaves up to the
// measure, in the code role's characters, where the loaded value, cut to the
// room, fills it; any other value is a short word, half its lane.
const LABEL_BAR = "w-figures shrink-0";
const CODE_LANE = "flex basis-0 grow min-w-0 max-w-measure ms-auto justify-end";
const WORD_LANE = "flex min-w-0 w-measure-short ms-auto justify-end";
const CODE_BAR = "w-full";
const WORD_BAR = "w-1/2";
// A setting row's bars, a label over a description, each at the length of the
// line it stands in for.
const BARS = [
	["w-1/3", "w-1/4"],
	["w-1/4", "w-1/4"],
	["w-1/3", "w-1/2"],
] as const;

/** A DefinitionRow waiting, the `index`th of a waiting list: the change mark's skeleton in its lane when `change` is declared; a label bar and a value bar at the line's end (the room an identifier's value takes when the list is `copyable`), or, with a `description`, the label bar over a meta line's bar; then the act's square, the link's chevron square or the switch's box at the end. Busy only through the Group or List that holds it. Outside the package's exports. */
export function DefinitionWait(props: {
	shape: DefinitionShape;
	index: number;
}) {
	const { shape } = props;
	const [label, description] = BARS[props.index % BARS.length] ?? BARS[0];
	const one = !shape.description;
	return (
		<div
			aria-hidden
			className={cn(
				skeletonRow({ kind: one ? "one-line-group" : "setting" }),
				DEFINITION_ROW,
				ROW,
			)}
		>
			{shape.change ? (
				<span className={MARK}>
					<span className={skeleton({ kind: "icon" })} />
				</span>
			) : null}
			<span className={LINES}>
				{one ? (
					<span
						className={cn(
							ROW_TITLE_LINE,
							lineBox({ role: "body" }),
							TITLE,
							LINE_HEIGHT,
						)}
					>
						<span className={cn(skeleton({ kind: "line" }), LABEL_BAR)} />
						<span
							className={
								shape.code ? cn(text({ role: "code" }), CODE_LANE) : WORD_LANE
							}
						>
							<span
								className={cn(
									skeleton({ kind: "line" }),
									shape.code ? CODE_BAR : WORD_BAR,
								)}
							/>
						</span>
					</span>
				) : (
					<>
						<span className={cn(ROW_TITLE_LINE, TITLE)}>
							<span className={cn(lineBox({ role: "body" }), LABEL_LINE)}>
								<span className={cn(skeleton({ kind: "line" }), label)} />
							</span>
							{shape.end === "switch" ? (
								<span className={SWITCH}>
									<span className={skeleton({ kind: "switch" })} />
								</span>
							) : null}
						</span>
						<span className={cn(lineBox({ role: "meta" }), META_LINE)}>
							<span className={cn(skeleton({ kind: "line" }), description)} />
						</span>
					</>
				)}
			</span>
			{shape.end === "act" || shape.end === "chevron" ? (
				<span className={cn(DEFINITION_ROW_CHEVRON, END)} />
			) : null}
		</div>
	);
}
