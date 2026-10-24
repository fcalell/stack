import type { StatusMark } from "@fcalell/ui-core/descriptors";
import { StatusBase } from "../status/base.tsx";

/** A row's status at the start of its meta line: the dot and its word, a given word too, or `painted` (the dot's box and a word's filler) while the status is not here. Outside the package's exports. */
export function RowStatusMark(props: {
	status: StatusMark;
	painted?: boolean;
}) {
	const { status, painted } = props;
	// Painted before anything reads the status: over a placeholder every key is there.
	if (painted) return <StatusBase painted />;
	return <StatusBase tone={status.tone} label={status.label} dot />;
}
