import type { ProcedureCall } from "@fcalell/plugin-api/types";
import type { Runs } from "@fcalell/ui-core/descriptors";
import { GATE, GATE_COLUMN, GATE_STEP, text } from "@fcalell/ui-core/variants";
import { type ReactNode, useRef, useState } from "react";
import { Text as RNText, type TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { RunText } from "../../lib/code";
import { FieldClaim } from "../../lib/field";
import { Scroll } from "../../lib/hosts";
import { blockIn, FadingView } from "../../lib/motion";
import { type FormProps, useDerivedForm } from "../form";
import { FormBody } from "../form/base";
import { FrameHost } from "../shell/host";
import { StepCount } from "../step-count";
import { ToastRoom } from "../toast/room";

// The scroll's content fills it, so the column stands in the page's top and
// grows past the viewport when it does not fit.
const FILL = "flex-1";
const PAGE = "grow items-center";
// The toasts stand at the page's foot, above the home indicator.
const TOAST_BOX = "absolute inset-x-0 top-0";

// A page outside the shell, a root frame as the Shell is: one column at the
// `auth` width inside the page inset on the surface, one step: the
// `StepCount`, the title, the description, the banner and the body, a fields
// gap between each. It keeps the safe area and scrolls over
// the keyboard, so the focused field and the submit act stay in view. An
// `Input` or code `Input` that mounts in it takes focus unless one holds it,
// each step claiming afresh as its field mounts, and its `form`'s bar
// draws `full`. It hosts `toast()` and `confirm()` as the Shell does, and
// draws no word of its own. A first run is a titled Gate whose body is its
// `Button`s.
// biome-ignore lint/suspicious/noExplicitAny: any procedure
type AnyCall = any;

export interface GateProps<P extends ProcedureCall = AnyCall> extends Closed {
	// A `Banner` standing in the step under the title and description, before
	// the body, at the column's width: a verdict stands with the content it is
	// about.
	banner?: ReactNode;
	/** The page's one header (a short phrase; wraps). */
	title: string;
	// A meta line under the title, as runs: `{ strong }` runs draw at
	// weight 500.
	description?: Runs;
	// Where an onboarding flow stands, a `StepCount` before the title.
	step?: { at: number; of: number };
	// The step's body, ahead of the `form`; a step with local state only draws
	// its controls here.
	children?: ReactNode;
	// The step's form, a `Form`'s props (its procedure, its fields), drawn after
	// the body in the column: its bar stands across it.
	form?: FormProps<P>;
}

// The step's form over its procedure, its bar across the column. It stands in
// the step, so a new step starts it afresh.
function GateForm<P extends ProcedureCall>(props: { form: FormProps<P> }) {
	const frame = useDerivedForm(props.form);
	return (
		<FormBody
			{...frame}
			bar={frame.bar && { fit: "full", ...frame.bar }}
			in="page"
		/>
	);
}

export function Gate<P extends ProcedureCall = AnyCall>({
	title,
	description,
	step,
	banner,
	form,
	children,
}: GateProps<P>) {
	const held = useRef<TextInput>(null);
	const insets = useSafeAreaInsets();
	// The step the page opened with arrives with the page; a later step (a new
	// `title`) is a block of its own that fades in on `base`.
	const [opened] = useState(title);
	return (
		<FrameHost>
			<FieldClaim.Provider value={held}>
				<View className={FILL}>
					<Scroll className={FILL} contentContainerClassName={cn(GATE, PAGE)}>
						<View
							style={{
								paddingTop: insets.top,
								paddingBottom: insets.bottom,
							}}
							className={GATE_COLUMN}
						>
							<FadingView
								key={title}
								entering={title === opened ? undefined : blockIn()}
								className={GATE_STEP}
							>
								{step ? <StepCount at={step.at} of={step.of} /> : null}
								<RNText
									accessibilityRole="header"
									className={text({ role: "title" })}
								>
									{title}
								</RNText>
								{description ? (
									<RNText className={text({ role: "meta" })}>
										<RunText runs={description} />
									</RNText>
								) : null}
								{banner}
								{children}
								{form ? <GateForm form={form} /> : null}
							</FadingView>
						</View>
					</Scroll>
					<View
						pointerEvents="none"
						style={{ bottom: insets.bottom }}
						className={TOAST_BOX}
					>
						<ToastRoom />
					</View>
				</View>
			</FieldClaim.Provider>
		</FrameHost>
	);
}
