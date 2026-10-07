import { cn } from "@fcalell/ui-core/cn";
import type { ChangeKind } from "@fcalell/ui-core/descriptors";
import { CHANGE_GLYPH } from "@fcalell/ui-core/list-state";
import { changeMark } from "@fcalell/ui-core/variants";
import { IconBase } from "../icon/index.tsx";

const BOX = "flex shrink-0 items-center justify-center";

/** Where a row, a fact or a field stands in a change set: its kind's glyph in the kind's ink in a lane one icon wide. Outside the package's exports. */
export function ChangeMark(props: { kind: ChangeKind }) {
	const { kind } = props;
	return (
		<span className={cn(changeMark({ kind }), BOX)}>
			<IconBase name={CHANGE_GLYPH[kind]} fit="meta" stroke="mark" />
		</span>
	);
}
