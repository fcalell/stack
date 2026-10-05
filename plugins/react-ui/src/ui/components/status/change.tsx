import { cn } from "@fcalell/ui-core/cn";
import type { ChangeKind } from "@fcalell/ui-core/descriptors";
import { CHANGE_GLYPH, CHANGE_WORD } from "@fcalell/ui-core/list-state";
import { changeMark } from "@fcalell/ui-core/variants";
import { useWords } from "../../lib/words.tsx";
import { Icon } from "../icon/index.tsx";

const BOX = "flex shrink-0 items-center justify-center";
const SPOKEN = "sr-only";

/** Where a row, a fact or a field stands in a change set: its kind's glyph in the kind's ink in a lane one icon wide, named by the kind's word. Outside the package's exports. */
export function ChangeMark(props: { kind: ChangeKind }) {
	const words = useWords();
	const { kind } = props;
	return (
		<span className={cn(changeMark({ kind }), BOX)}>
			<Icon name={CHANGE_GLYPH[kind]} fit="meta" />
			<span className={SPOKEN}>{words[CHANGE_WORD[kind]]}</span>
		</span>
	);
}
