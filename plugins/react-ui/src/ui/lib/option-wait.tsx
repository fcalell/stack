import { cn } from "@fcalell/ui-core/cn";
import type { OptionShape } from "@fcalell/ui-core/list-state";
import {
	lineBox,
	OPTION_GROUP_LABEL,
	OPTION_LINE,
	ROW_META_LINE,
	row,
	SELECT_GROUP,
	skeleton,
	skeletonLane,
} from "@fcalell/ui-core/variants";

const GROUP = "flex flex-col";
const LINE = "flex grow min-w-0 items-start";
// The box stands on its label's first line, a box one body line tall.
const BOX_LINE = "flex shrink-0 items-center h-lh";
const TEXT = "flex flex-col min-w-0 grow";
// Loading, each row keeps its height: a box-sized skeleton on the label's
// line, and a bar at a label's length in a short label's lane on each line
// the row draws.
const LABEL_WAIT = "flex items-center";
const LINE_WAIT = "flex items-center h-lh";
const BAR_ROOM = "flex grow min-w-0";
const ROW_WAIT = "flex items-center";
// The loaded row of an unmarked option: its line and the pair padding, never
// under the one-line row's height.
const ROW_WHOLE = "min-h-row";
const LABEL_BAR = "w-1/3";
const ROW_BARS = [
	["w-1/3", "w-1/2"],
	["w-2/3", "w-1/3"],
	["w-2/3", "w-1/2"],
	["w-1/2", "w-1/4"],
] as const;
// The zero-width space gives an empty line its line box.
const EMPTY_LINE = "​";

/** The waiting rows in the slots the options declare, each led by the mark its form draws (a box, or a radio's ring): a group label's bar over them when they stand under labels, a description bar under each label when they are described. One group per entry of `rows` (four rows in one group unless given). */
export function OptionWait(props: {
	shape: OptionShape;
	mark: "check" | "radio";
	rows?: readonly number[];
}) {
	const { shape, mark, rows = [ROW_BARS.length] } = props;
	return (
		<>
			{rows.map((count, group) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: fixed stand-ins
					key={group}
					aria-hidden
					className={cn(SELECT_GROUP, GROUP)}
				>
					{shape.group ? (
						<p
							className={cn(
								OPTION_GROUP_LABEL,
								lineBox({ role: "meta" }),
								LABEL_WAIT,
							)}
						>
							{EMPTY_LINE}
							<span className={cn(skeletonLane({ role: "meta" }), BAR_ROOM)}>
								<span className={cn(skeleton({ kind: "line" }), LABEL_BAR)} />
							</span>
						</p>
					) : null}
					{Array.from({ length: count }, (_, at) => {
						const [label, description] = ROW_BARS[at % ROW_BARS.length] ?? [];
						return (
							<div
								// biome-ignore lint/suspicious/noArrayIndexKey: fixed stand-ins
								key={at}
								className={cn(
									row({ lines: shape.description ? "two" : "whole" }),
									ROW_WAIT,
									!shape.description && ROW_WHOLE,
								)}
							>
								<span className={cn(OPTION_LINE, LINE)}>
									<span className={cn(lineBox({ role: "body" }), BOX_LINE)}>
										<span className={skeleton({ kind: mark })} />
									</span>
									<span className={TEXT}>
										<span className={cn(lineBox({ role: "body" }), LINE_WAIT)}>
											<span
												className={cn(skeletonLane({ role: "body" }), BAR_ROOM)}
											>
												<span
													className={cn(skeleton({ kind: "line" }), label)}
												/>
											</span>
										</span>
										{shape.description ? (
											<span
												className={cn(
													ROW_META_LINE,
													lineBox({ role: "meta" }),
													LINE_WAIT,
												)}
											>
												<span
													className={cn(
														skeletonLane({ role: "meta" }),
														BAR_ROOM,
													)}
												>
													<span
														className={cn(
															skeleton({ kind: "line" }),
															description,
														)}
													/>
												</span>
											</span>
										) : null}
									</span>
								</span>
							</div>
						);
					})}
				</div>
			))}
		</>
	);
}
