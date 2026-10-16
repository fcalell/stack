import { cn } from "@fcalell/ui-core/cn";
import type { Sentence } from "@fcalell/ui-core/descriptors";
import {
	GATE,
	GATE_COLUMN,
	GATE_FLOW,
	GATE_LOGO,
	GATE_MARK_ROW,
	GATE_STEP,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useEffect, useId, useRef } from "react";
import type { Closed } from "../../lib/closed.ts";
import { Runs } from "../../lib/code.tsx";
import { focusFirst } from "../../lib/focus.ts";
import { PageTitle } from "../../lib/frame.ts";
import { HeadingContext } from "../../lib/heading.ts";
import { Lockup, useMark } from "../../lib/mark.tsx";
import { useScrolls } from "../../lib/scrolls.ts";
import { Scroller, useScroller } from "../../lib/window.tsx";
import { FormBody } from "../form/base.tsx";
import type { FormProps } from "../form/index.tsx";
import { FrameHost, FrameMain } from "../shell/host.tsx";
import { StepCount } from "../step-count/index.tsx";

// The frame fills the viewport and the page inside scrolls itself, as the
// Shell's does, so the toasts stand at the viewport's foot.
const FRAME = "flex flex-col h-dvh overflow-hidden";
// The column stands in the page's middle while it fits: an auto margin, never
// `justify-center`, which clips the top of a column taller than the page, so
// it scrolls from its top instead, with a tab stop of its own while it scrolls
// and holds nothing a keyboard reaches (`useScrolls`). On touch the step
// stands at the top, for the keyboard.
const PAGE =
	"flex flex-col items-center grow min-h-0 overflow-y-auto focus-visible:-outline-offset-2";
const COLUMN = "flex flex-col my-auto touch:my-0";
const STEP = "flex flex-col";

/** A page outside the shell: what the product is, where the flow stands, what this step is. */
export interface GateProps extends Closed {
	/** A `Banner` standing first in the column, at its width. */
	banner?: ReactNode;
	/** The page's one `h1` (a short phrase; wraps). */
	title: string;
	/** A meta line under the title, as runs: `{ strong }` runs draw at weight 500 (the address the step names) (a sentence; wraps). */
	description?: Sentence;
	/** Where an onboarding flow stands, a `StepCount` between the mark and the title. */
	step?: { at: number; of: number };
	/** The step's body, ahead of the `form`: a `Group`, an `OptionList`, a `List`, `Section`s, a first run's `Button`s. */
	children?: ReactNode;
	/** The step's form, drawn after the body in the column: its `bar` stands across it. */
	form?: FormProps;
}

/** A root frame for a page outside the shell (sign-in, a consent step): one centred column at the `auth` width on the surface. The banner stands first, then the step a sections gap under it: the app's mark when the app has an icon (a drawn lockup stands 40 px tall at every density), the `StepCount`, the title, the description and the body, one fields gap between each. On touch it spans the viewport inside the page inset and the step stands at the top. The first field of a step takes focus as the page opens and as `title` changes, and the `form`'s `ActionBar` draws `full`. It hosts `toast()` and `confirm()` as the `Shell` does, and its body's `Section`s title a level under the `h1`. A first run is a titled Gate whose body is its `Button`s. It draws no word of its own. */
export function Gate({
	title,
	description,
	step,
	banner,
	form,
	children,
}: GateProps) {
	const mark = useMark();
	const titleId = useId();
	const body = useRef<HTMLDivElement>(null);
	const scroll = useScroller();
	useScrolls(scroll.node);
	// A step that opens (the page, then each new `title`) hands focus to its
	// first field; a step with none leaves focus where it is.
	// biome-ignore lint/correctness/useExhaustiveDependencies: a new title is the step opening
	useEffect(() => {
		focusFirst(body.current, "input, textarea");
	}, [title]);
	return (
		<FrameHost>
			<PageTitle value={titleId}>
				<HeadingContext value={2}>
					<div className={FRAME}>
						<FrameMain>
							<div ref={scroll.ref} className={cn(GATE, PAGE)}>
								<Scroller value={scroll.holder}>
									<div
										ref={body}
										className={cn(GATE_COLUMN, GATE_FLOW, COLUMN)}
									>
										{banner}
										<div className={cn(GATE_STEP, STEP)}>
											{mark ? (
												<Lockup
													mark={mark}
													logo={GATE_LOGO}
													className={GATE_MARK_ROW}
												/>
											) : null}
											{step ? <StepCount at={step.at} of={step.of} /> : null}
											<h1 id={titleId} className={text({ role: "title" })}>
												{title}
											</h1>
											{description ? (
												<p className={text({ role: "meta" })}>
													<Runs runs={description} />
												</p>
											) : null}
											{children}
											{form ? (
												<FormBody
													key={title}
													{...form}
													bar={form.bar && { fit: "full", ...form.bar }}
													in="auth"
												/>
											) : null}
										</div>
									</div>
								</Scroller>
							</div>
						</FrameMain>
					</div>
				</HeadingContext>
			</PageTitle>
		</FrameHost>
	);
}
