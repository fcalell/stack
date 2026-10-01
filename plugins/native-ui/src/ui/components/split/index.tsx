import { splitMain } from "@fcalell/ui-core/variants";
import { type ReactNode, useContext, useEffect, useState } from "react";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { LendAct, PageTitle } from "../../lib/frame";
import { Scroll } from "../../lib/hosts";
import { useWords } from "../../lib/words";
import { Sheet } from "../sheet";

const REGION = "flex-1";
// The record sits under the bleeding Place's top inset, one inset under the
// title, so it draws none of its own.
const RECORD = "pt-0";

export interface SplitProps extends Closed {
	list?: ReactNode;
	main?: ReactNode;
	pane?: ReactNode;
	empty?: ReactNode;
}

// One region at a time, each scrolling itself in a bleeding Place: the list,
// or the open record once `main` is set. With a record and a pane open, the
// Split lends a Details act to its Place or Screen, which opens the pane as a
// sheet. `empty` is the desktop's, so the phone never draws it.
export function Split({ list, main, pane }: SplitProps) {
	const words = useWords();
	const title = useContext(PageTitle);
	const lend = useContext(LendAct);
	const [open, setOpen] = useState(false);
	const opened = main !== undefined;
	const sheet = opened && pane !== undefined;
	useEffect(() => {
		if (!sheet || !lend) return;
		lend({
			icon: "PanelRight",
			label: words.details,
			onAct: () => setOpen(true),
		});
		return () => lend(undefined);
	}, [sheet, lend, words.details]);
	return (
		<>
			{opened ? (
				<Scroll
					className={REGION}
					contentContainerClassName={cn(splitMain({ state: "rest" }), RECORD)}
				>
					{main}
				</Scroll>
			) : (
				<Scroll role="navigation" accessibilityLabel={title} className={REGION}>
					{list}
				</Scroll>
			)}
			<Sheet
				open={sheet && open}
				onClose={() => setOpen(false)}
				title={words.details}
			>
				{pane}
			</Sheet>
		</>
	);
}
