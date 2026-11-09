import type { ProcedureCall } from "@fcalell/plugin-api/types";
import { cn } from "@fcalell/ui-core/cn";
import type { LinkAct, Run, Runs } from "@fcalell/ui-core/descriptors";
import { runsOf } from "@fcalell/ui-core/runs";
import {
	BLOCK_IN,
	GATE,
	GATE_COLUMN,
	GATE_LOGO,
	GATE_MARK_ROW,
	GATE_STEP,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, use, useId, useState } from "react";
import type { Act } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import { RunText } from "../../lib/code.tsx";
import { focusFirst } from "../../lib/focus.ts";
import { PageTitle } from "../../lib/frame.ts";
import { HeadingContext } from "../../lib/heading.ts";
import { Lockup, useMark } from "../../lib/mark.tsx";
import { DistanceContext } from "../../lib/media.ts";
import { useScrolls } from "../../lib/scrolls.ts";
import { GATE_CENTRED } from "../../lib/walk-classes.ts";
import { Scroller, useScroller } from "../../lib/window.tsx";
import { ActionBarBase } from "../action-bar/base.tsx";
import { FormBody } from "../form/base.tsx";
import { type FormProps, useDerivedForm } from "../form/index.tsx";
import { FrameHost, FrameMain } from "../shell/host.tsx";
import { StepCount } from "../step-count/index.tsx";

// The frame fills the viewport and the page inside scrolls itself, as the
// Shell's does, so the toasts stand at the viewport's foot. Inside a `Place`
// (a room's, whose set it then draws at) it grows across the place's row,
// which would otherwise hold it at its content's width.
const FRAME = "flex flex-col grow min-w-0 h-dvh overflow-hidden";
// The column stands in the page's middle while it fits: an auto margin, never
// `justify-center`, which clips the top of a column taller than the page, so
// it scrolls from its top instead, with a tab stop of its own while it scrolls
// and holds nothing a keyboard reaches (`useScrolls`). On touch the step
// stands at the top, for the keyboard; in a room Place there is no keyboard,
// and the step stands in the middle of the screen, as a lock screen's does.
const PAGE =
	"flex flex-col items-center grow min-h-0 overflow-y-auto focus-visible:-outline-offset-2";
const COLUMN = GATE_CENTRED;
const COLUMN_TOUCH = "touch:my-0";
const STEP = "flex flex-col";

// biome-ignore lint/suspicious/noExplicitAny: any procedure
type AnyCall = any;

/** A page outside the shell: what the product is, where the flow stands, what this step is. */
export interface GateProps<P extends ProcedureCall = AnyCall> extends Closed {
	/** A `Banner` standing in the step under the title and description, before the body, at the column's width: a verdict stands with the content it is about. */
	banner?: ReactNode;
	/** The page's one `h1` (a short phrase; wraps). */
	title: string;
	/** A meta line under the title, a sentence or runs: `{ strong }` runs draw at weight 500 (the address the step names) (a sentence; wraps). */
	description?: Run | Runs;
	/** Where an onboarding flow stands, a `StepCount` between the mark and the title. */
	step?: { at: number; of: number };
	/** The step's body, ahead of the `form`: a `Picker` in `fit: list`, `Section`s of rows, a first run's `Button`s, or the step's controls drawn directly when it holds only local state. */
	children?: ReactNode;
	/** The step's acts in reading order, the filled act last (a first run's "Connect", a consent's Decline then Allow, a Back then a Continue, a way home as a `LinkAct`), drawn as an `ActionBar` under the body, as a form's bar stands: across the column, the filled act on top, a blocked act's reason under them. A step with a `form` gives its alternatives (a Back, a passkey) as the form's `acts`, so the step holds one bar. The body stays for prose and controls. */
	acts?: (Act | LinkAct)[];
	/** The step's form, a `Form`'s props (its procedure, its fields), drawn after the body in the column: its fields a card, its bar after the card. */
	form?: FormProps<P>;
}

// A step that opens hands focus to its first field; a step with none leaves
// focus where it is.
const opens = (step: HTMLDivElement | null) => {
	if (step) focusFirst(step, "input, textarea");
};

// One step of the flow: a block of its own per `title`, so a step the viewer's
// act replaces fades in on `base` and takes focus as it mounts; a step the
// page opens with does not fade.
function GateStep(props: { fresh: boolean; children: ReactNode }) {
	return (
		<div ref={opens} className={cn(GATE_STEP, STEP, props.fresh && BLOCK_IN)}>
			{props.children}
		</div>
	);
}

// The step's form over its procedure, its bar after its card. It stands in
// the step, so a new step starts it afresh.
function GateForm<P extends ProcedureCall>(props: { form: FormProps<P> }) {
	const { frame, outer } = useDerivedForm(props.form);
	return <FormBody {...frame} in="gate" outer={outer} />;
}

/** A root frame for a page outside the shell (sign-in, a consent step): one centred column at the `auth` width on the surface. The step is one stack, one fields gap between each part: the app's mark when the app has an icon (its icon at the avatar's size beside its name; a drawn `react({ logo })` lockup stands 40 px tall at every density), the `StepCount`, the title, the description, the `banner` (a verdict stands with the content it is about, so an act's result lands beside the act, not above the page), the body, the `form` (its fields a card, its bar after it) and the `acts`, each bar laid out by the column's width as every `ActionBar` is, so at the auth width its acts stand across the column, the filled act on top. On touch it spans the viewport inside the page inset and the step stands at the top. The first field of a step takes focus as the page opens and as `title` changes. A step that submits something is a derived `form` over the step's procedure; a step with local state only draws its controls in its body. It hosts `toast()` and `confirm()` as the `Shell` does, and its body's `Section`s title a level under the `h1`. Inside a room `Place` (`<Place distance="room"><Gate … /></Place>`, a TV's signed-out or failed page) it fills the place and draws at the room set. A first run is a titled Gate whose `acts` are its acts. It draws no word of its own. */
export function Gate<P extends ProcedureCall = AnyCall>({
	title,
	description,
	step,
	banner,
	acts,
	form,
	children,
}: GateProps<P>) {
	const mark = useMark();
	const far = use(DistanceContext);
	const titleId = useId();
	// The step the page opened with arrives with the page.
	const [opened] = useState(title);
	const scroll = useScroller();
	useScrolls(scroll.node);
	return (
		<FrameHost>
			<PageTitle value={titleId}>
				<HeadingContext value={2}>
					<div className={FRAME}>
						<FrameMain>
							<div ref={scroll.ref} className={cn(GATE, PAGE)}>
								<Scroller value={scroll}>
									<div
										className={cn(GATE_COLUMN, COLUMN, !far && COLUMN_TOUCH)}
									>
										<GateStep key={title} fresh={title !== opened}>
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
													<RunText runs={runsOf(description)} />
												</p>
											) : null}
											{banner}
											{children}
											{form ? <GateForm form={form} /> : null}
											{acts ? <ActionBarBase acts={acts} /> : null}
										</GateStep>
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
