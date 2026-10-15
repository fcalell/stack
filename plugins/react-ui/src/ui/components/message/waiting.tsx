import { cn } from "@fcalell/ui-core/cn";
import { message, text } from "@fcalell/ui-core/variants";
import { Painted } from "../../lib/paint.tsx";

const STACK = "flex flex-col";

/** The waiting form of a reply that is on its way: the unbubbled reply it becomes, with no author line, one line of paint at the body line height. Outside the package's exports: a Thread draws it for `replying`. */
export function WaitingReply() {
	return (
		<article aria-busy className={cn(message({ author: "other" }), STACK)}>
			<p className={text({ role: "body" })}>
				<Painted role="phrase" />
			</p>
		</article>
	);
}
