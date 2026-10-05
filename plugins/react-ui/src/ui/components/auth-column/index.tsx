import { cn } from "@fcalell/ui-core/cn";
import type { Run } from "@fcalell/ui-core/descriptors";
import {
	AUTH_COLUMN,
	AUTH_HEAD,
	AUTH_PAGE,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useRef } from "react";
import type { Closed } from "../../lib/closed.ts";
import { AuthColumnRoot } from "../../lib/frame.ts";
import { HeadingContext } from "../../lib/heading.ts";
import { PortalContainer, usePopupLayer } from "../../lib/portal.ts";
import { StepCount } from "../step-count/index.tsx";

// The page fills the viewport and the column stands in its middle while it
// fits: an auto margin, never `justify-center`, which clips the top of a
// column taller than the viewport, so it scrolls from its top instead.
const PAGE = "flex flex-col items-center min-h-dvh";
// An unbroken run (an address) wraps inside the column's width.
const WRAPS = "wrap-anywhere";
const COLUMN = "flex flex-col my-auto";
const HEAD = "flex flex-col";

/** A page outside the shell: the product, where the flow stands, what this step is. */
export interface AuthColumnProps extends Closed {
	/** The product's name, the line that leads the column. */
	product: string;
	/** Where an onboarding flow stands, a `StepCount` between the product and the title. */
	step?: { at: number; of: number };
	/** The page's one `h1`. */
	title: string;
	/** A meta line under the title, as words or runs: `{ strong }` runs draw at weight 500 (the address the step names). */
	sentence?: string | readonly Run[];
	/** A `Banner` standing first in the column, at its width. */
	banner?: ReactNode;
	/** The step's body: a `Form`, a `Group`, an `OptionList`, a `List`. */
	children?: ReactNode;
}

/** One centred column at the `auth` width on the surface, outside the shell (sign-in, a consent step): the banner, the product's name at meta and 500, the `StepCount`, the title, the sentence a pair under it, then the body. On touch it spans the viewport inside the page inset. An `Input` or `InputOtp` that mounts in it takes focus unless one is already typed in, and a `Form`'s `ActionBar` in it draws `full`. The body's `Section`s title a level under the `h1`. It draws no word of its own, and `toast()` and `confirm()` stand only in a `Shell`. */
export function AuthColumn({
	product,
	step,
	title,
	sentence,
	banner,
	children,
}: AuthColumnProps) {
	const root = useRef<HTMLElement>(null);
	const [layer, setLayer] = usePopupLayer();
	const runs = typeof sentence === "string" ? [sentence] : sentence;
	return (
		<AuthColumnRoot value={root}>
			<PortalContainer value={layer}>
				<HeadingContext value={2}>
					<main ref={root} className={cn(AUTH_PAGE, PAGE)}>
						<div className={cn(AUTH_COLUMN, COLUMN)}>
							{banner}
							<p
								className={cn(
									text({ role: "meta" }),
									textStrong({ role: "meta" }),
									WRAPS,
								)}
							>
								{product}
							</p>
							{step ? <StepCount at={step.at} of={step.of} /> : null}
							<div className={cn(AUTH_HEAD, HEAD)}>
								<h1 className={cn(text({ role: "title" }), WRAPS)}>{title}</h1>
								{runs ? (
									<p className={cn(text({ role: "meta" }), WRAPS)}>
										{runs.map((run, at) =>
											typeof run === "string" ? (
												// biome-ignore lint/suspicious/noArrayIndexKey: a run is its position
												<span key={at}>{run}</span>
											) : (
												// biome-ignore lint/suspicious/noArrayIndexKey: a run is its position
												<span key={at} className={textStrong({ role: "meta" })}>
													{run.strong}
												</span>
											),
										)}
									</p>
								) : null}
							</div>
							{children}
						</div>
						<div ref={setLayer} />
					</main>
				</HeadingContext>
			</PortalContainer>
		</AuthColumnRoot>
	);
}
