import { cn } from "@fcalell/ui-core/cn";
import { lineBox, message, skeleton } from "@fcalell/ui-core/variants";

const STACK = "flex flex-col";
const LINE = "flex items-center h-lh";
const BAR = "w-full";

/** The waiting form of a reply that is on its way: the unbubbled reply it becomes, with no author line, one skeleton line at the body line height at the reply's left edge and top. Outside the package's exports: a Thread draws it for `replying`. */
export function WaitingReply() {
	return (
		<article aria-busy className={cn(message({ author: "other" }), STACK)}>
			<span className={cn(lineBox({ role: "body" }), LINE)}>
				<span className={cn(skeleton({ kind: "line" }), BAR)} />
			</span>
		</article>
	);
}
