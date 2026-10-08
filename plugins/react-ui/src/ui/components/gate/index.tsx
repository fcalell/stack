import { cn } from "@fcalell/ui-core/cn";
import type { GateMark, Sentence } from "@fcalell/ui-core/descriptors";
import {
	GATE,
	GATE_COLUMN,
	GATE_FLOW,
	GATE_HEAD,
	GATE_LEAD,
	GATE_MARK,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { Runs } from "../../lib/code.tsx";
import { focusFirst } from "../../lib/focus.ts";
import { FormStands } from "../../lib/form.ts";
import { PageTitle } from "../../lib/frame.ts";
import { HeadingContext } from "../../lib/heading.ts";
import { useScrolls } from "../../lib/scrolls.ts";
import { FrameHost, FrameMain } from "../shell/host.tsx";
import { StepCount } from "../step-count/index.tsx";

// The frame fills the viewport and the page inside scrolls itself, as the
// Shell's does, so the toasts stand at the viewport's foot.
const FRAME = "flex flex-col h-dvh overflow-hidden";
// The column stands in the page's middle while it fits: an auto margin, never
// `justify-center`, which clips the top of a column taller than the page, so
// it scrolls from its top instead, with a tab stop of its own while it scrolls
// and holds nothing a keyboard reaches (`useScrolls`). On touch a typed step
// stands at the top, for the keyboard; a first run holds no field and stays centred.
const PAGE =
	"flex flex-col items-center grow min-h-0 overflow-y-auto focus-visible:-outline-offset-2";
const COLUMN = "flex flex-col my-auto";
const COLUMN_TYPED = "touch:my-0";
const LEAD = "flex flex-col";
const HEAD = "flex flex-col";
// An unbroken run (an address) wraps inside the column's width.
const WRAPS = "wrap-anywhere";
const IMAGE = "shrink-0 object-contain";

interface GateBase extends Closed {
	/** A `Banner` standing first in the column, at its width. */
	banner?: ReactNode;
	/** The step's body: a `Form`, a `Group`, an `OptionList`, a `List`, `Section`s; a first run's one `EmptyState`. */
	children?: ReactNode;
}

/** A page outside the shell: what the product is, where the flow stands, what this step is. */
export type GateProps = GateBase &
	(
		| {
				/** The page's one `h1` (a short phrase; wraps). Absent, the Gate is a first run: it draws no lead and its one `EmptyState` is the page's `h1`. */
				title: string;
				/** A meta line under the title, as runs: `{ strong }` runs draw at weight 500 (the address the step names) (a sentence; wraps). */
				description?: Sentence;
				/** Where an onboarding flow stands, a `StepCount` between the mark and the title. */
				step?: { at: number; of: number };
				/** The product's mark, drawn at the avatar's size; its `name` stands in its place while the image fails or `src` is absent. */
				mark?: GateMark;
		  }
		| {
				title?: undefined;
				description?: never;
				step?: never;
				mark?: never;
		  }
	);

function Mark({ src, name }: GateMark) {
	const [failed, setFailed] = useState<string>();
	// Keyed by the address that failed, so a new `src` is tried again.
	if (src && src !== failed)
		return (
			<img
				src={src}
				alt={name}
				onError={() => setFailed(src)}
				className={cn(GATE_MARK, IMAGE)}
			/>
		);
	return (
		<p
			className={cn(
				text({ role: "meta" }),
				textStrong({ role: "meta" }),
				WRAPS,
			)}
		>
			{name}
		</p>
	);
}

/** A root frame for a page outside the shell (sign-in, a consent step): one centred column at the `auth` width on the surface. The banner stands first, then the lead (the mark, the `StepCount`, the title and the description a pair under it), then the body a sections gap under it. On touch it spans the viewport inside the page inset and a typed step stands at the top. The first field of a step takes focus as the page opens and as `title` changes, and a `Form`'s `ActionBar` in it draws `full`. It hosts `toast()` and `confirm()` as the `Shell` does, and its body's `Section`s title a level under the `h1`. With no `title` it is a first run: no lead and no `h1` of its own, its one `EmptyState` is the page's `h1`, and the column stands centred down at every width, touch included. It draws no word of its own. */
export function Gate({
	title,
	description,
	step,
	mark,
	banner,
	children,
}: GateProps) {
	const titleId = useId();
	const body = useRef<HTMLDivElement>(null);
	const [pageNode, setPageNode] = useState<HTMLDivElement | null>(null);
	const stop = useScrolls(pageNode);
	// A step that opens (the page, then each new `title`) hands focus to its
	// first field; a step with none leaves focus where it is.
	// biome-ignore lint/correctness/useExhaustiveDependencies: a new title is the step opening
	useEffect(() => {
		focusFirst(body.current, "input, textarea");
	}, [title]);
	return (
		<FrameHost>
			<PageTitle value={title === undefined ? undefined : titleId}>
				<HeadingContext value={2}>
					<div className={FRAME}>
						<FrameMain>
							<div
								ref={setPageNode}
								tabIndex={stop ? 0 : undefined}
								className={cn(GATE, PAGE)}
							>
								<div
									ref={body}
									className={cn(
										GATE_COLUMN,
										GATE_FLOW,
										COLUMN,
										title !== undefined && COLUMN_TYPED,
									)}
								>
									{banner}
									{title === undefined ? null : (
										<div className={cn(GATE_LEAD, LEAD)}>
											{mark ? <Mark src={mark.src} name={mark.name} /> : null}
											{step ? <StepCount at={step.at} of={step.of} /> : null}
											<div className={cn(GATE_HEAD, HEAD)}>
												<h1
													id={titleId}
													className={cn(text({ role: "title" }), WRAPS)}
												>
													{title}
												</h1>
												{description ? (
													<p className={cn(text({ role: "meta" }), WRAPS)}>
														<Runs runs={description} />
													</p>
												) : null}
											</div>
										</div>
									)}
									<FormStands value="auth">{children}</FormStands>
								</div>
							</div>
						</FrameMain>
					</div>
				</HeadingContext>
			</PageTitle>
		</FrameHost>
	);
}
