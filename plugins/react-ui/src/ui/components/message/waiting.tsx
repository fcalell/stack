import { cn } from "@fcalell/ui-core/cn";
import { message, STREAM_IN, text } from "@fcalell/ui-core/variants";
import { Painted } from "../../lib/paint.tsx";

const STACK = "flex flex-col";

/** The waiting form of a reply that is on its way: the unbubbled reply it becomes, with no author line, one line of paint at the body line height. `arrives` is one that came on its own, which rises in. Outside the package's exports: a Thread draws it for `replying`. */
export function WaitingReply({ arrives }: { arrives?: boolean }) {
	return (
		<article
			aria-busy
			className={cn(message({ author: "other" }), STACK, arrives && STREAM_IN)}
		>
			<p className={text({ role: "body" })}>
				<Painted role="phrase" />
			</p>
		</article>
	);
}
