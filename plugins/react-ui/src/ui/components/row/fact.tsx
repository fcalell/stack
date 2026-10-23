import { cn } from "@fcalell/ui-core/cn";
import type { RowTitle } from "@fcalell/ui-core/descriptors";
import { CODE_NAME, FIGURES } from "@fcalell/ui-core/variants";
import { useCopy } from "../../lib/copy.ts";
import { partText } from "../../lib/parts.ts";
import { Decoded } from "../../lib/slot.tsx";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";

/** Whether a definition's value is the absent word. */
export function isAbsent(
	value: RowTitle | undefined,
): value is { absent: string } {
	return typeof value === "object" && value !== null && "absent" in value;
}

/** Whether a title is a code the row copies: an identifier. Outside the package's exports. */
export function isCopy(
	value: RowTitle | undefined,
): value is { code: string; copy: true } {
	return typeof value === "object" && value !== null && "copy" in value;
}

/** The words a title names, which name the row where it has no label. Outside the package's exports. */
export function titleWords(title: RowTitle): string {
	if (isAbsent(title)) return title.absent;
	if (typeof title === "object" && !Array.isArray(title) && "status" in title)
		return title.label ?? "";
	return partText(title as Parameters<typeof partText>[0]);
}

// An identifier (`copyable`) is the mono, carrying the body ink as the value
// beside it; too long for its room it cuts in its middle, its stem truncating
// to the room and its tail standing whole (`valueCut`).
const ID = "flex min-w-0 text-ink-body";
const STEM = "min-w-0 truncate";
const TAIL = "shrink-0";

/** A copyable id bare in the mono, cut as the row cuts it: its stem is one slot across the waiting form and the loaded one, so it decodes if it waited. Outside the package's exports. */
export function IdValue(props: {
	painted?: boolean;
	at?: number;
	stem?: string;
	tail?: string;
}) {
	return (
		<span className={cn(CODE_NAME, ID, FIGURES)}>
			<span className={STEM}>
				<Decoded
					role="id"
					painted={props.painted}
					at={props.at}
					text={props.stem}
				/>
			</span>
			{props.tail ? <span className={TAIL}>{props.tail}</span> : null}
		</span>
	);
}

/** The copy act: a check and the word Copied for two seconds once copied. Outside the package's exports. */
export function CopyAct({ label, value }: { label: string; value: string }) {
	const words = useWords();
	const [done, copy] = useCopy();
	return (
		<Button
			glyph
			icon={done ? "Check" : "Copy"}
			label={done ? words.copied : `${words.copy} ${label}`}
			onAct={() => copy(value)}
		/>
	);
}
