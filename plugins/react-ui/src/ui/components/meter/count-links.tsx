import { cn } from "@fcalell/ui-core/cn";
import type { CountLink } from "@fcalell/ui-core/descriptors";
import { formatterFor } from "@fcalell/ui-core/format";
import { COUNT_LINKS, FIGURES, text } from "@fcalell/ui-core/variants";
import { Link } from "../link/index.tsx";

const COUNTS = "flex flex-wrap";

/** A line of counts that lead to their lists: each a figure and its label as a standalone link on the target height. Outside the package's exports. */
export function CountLinks({ counts }: { counts: readonly CountLink[] }) {
	const number = formatterFor("number");
	return (
		<p className={cn(text({ role: "meta" }), COUNT_LINKS, COUNTS)}>
			{counts.map((count) => (
				<Link
					key={`${count.href}${count.label}`}
					href={count.href}
					fit="standalone"
				>
					{/* A standalone link is a flex box, whose bare text drops the space. */}
					<span>
						<span className={FIGURES}>{number.format(count.value)}</span>{" "}
						{count.label}
					</span>
				</Link>
			))}
		</p>
	);
}
