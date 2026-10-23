import { cn } from "@fcalell/ui-core/cn";
import type { CountLink } from "@fcalell/ui-core/descriptors";
import { formatterFor } from "@fcalell/ui-core/format";
import {
	COUNT_LINKS,
	FIGURES,
	LINK_TARGET,
	text,
} from "@fcalell/ui-core/variants";
import { Painted } from "../../lib/paint.tsx";
import { ButtonLink } from "../button/link.tsx";

const COUNTS = "flex flex-wrap";
const PAINTED = "flex items-center";

/** A line of counts that lead to their lists: each a figure and its label as a standalone link on the target height; `painted` while the counts are not here, one link's target box and a phrase's filler. Outside the package's exports. */
export function CountLinks({
	counts,
	painted,
}: {
	counts: readonly CountLink[];
	painted?: boolean;
}) {
	const number = formatterFor("number");
	if (painted)
		return (
			<p className={cn(text({ role: "meta" }), COUNT_LINKS, COUNTS)}>
				<span className={cn(LINK_TARGET, PAINTED)}>
					<Painted role="phrase" />
				</span>
			</p>
		);
	return (
		<p className={cn(text({ role: "meta" }), COUNT_LINKS, COUNTS)}>
			{counts.map((count) => (
				<ButtonLink key={`${count.href}${count.label}`} href={count.href}>
					{/* A standalone link is a flex box, whose bare text drops the space. */}
					<span>
						<span className={FIGURES}>{number.format(count.value)}</span>{" "}
						{count.label}
					</span>
				</ButtonLink>
			))}
		</p>
	);
}
