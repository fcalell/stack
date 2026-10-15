import type { Sentence } from "@fcalell/ui-core/descriptors";
import {
	GATE,
	GATE_COLUMN,
	GATE_FLOW,
	GATE_STEP,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useRef } from "react";
import { Text as RNText, type TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Runs } from "../../lib/code";
import { EmptyBase, type GateFirstRun } from "../../lib/empty";
import { FieldClaim } from "../../lib/field";
import { Scroll } from "../../lib/hosts";
import type { FormProps } from "../form";
import { FormBody } from "../form/base";
import { FrameHost } from "../shell/host";
import { StepCount } from "../step-count";
import { ToastRoom } from "../toast/room";

// The scroll's content fills it, so the column stands in the page's top and
// grows past the viewport when it does not fit; a first run's stands centred
// down while it fits.
const FILL = "flex-1";
const PAGE = "grow items-center";
const CENTRED = "justify-center";
// The toasts stand at the page's foot, above the home indicator.
const TOAST_BOX = "absolute inset-x-0 top-0";

// A page outside the shell, a root frame as the Shell is: one column at the
// `auth` width inside the page inset on the surface, the banner, then the
// step a sections gap under it: the `StepCount`, the title, the description
// and the body, a fields gap between each. It keeps the safe area and scrolls over
// the keyboard, so the focused field and the submit act stay in view. An
// `Input` or `InputOtp` that mounts in it takes focus unless one holds it,
// each step claiming afresh as its field mounts, and its `form`'s `ActionBar`
// draws `full`. It hosts `toast()` and `confirm()` as the Shell does, and
// draws no word of its own. With no `title` it is a first run: no step stack and no
// header of its own, its `empty` is the page's header, and the column stands
// centred down.
interface GateBase extends Closed {
	// A `Banner` standing first in the column, at its width.
	banner?: ReactNode;
	// The step's body, ahead of the `form`.
	children?: ReactNode;
}

export type GateProps = GateBase &
	(
		| {
				/** The page's one header (a short phrase; wraps). Absent, the Gate is a first run. */
				title: string;
				// A meta line under the title, as runs: `{ strong }` runs draw at
				// weight 500.
				description?: Sentence;
				// Where an onboarding flow stands, a `StepCount` before the
				// title.
				step?: { at: number; of: number };
				// The step's form, drawn after the body in the column: its `bar` stands
				// across it.
				form?: FormProps;
				empty?: never;
		  }
		| {
				title?: undefined;
				description?: never;
				step?: never;
				form?: never;
				// The first run's one empty state, its title the page's header.
				empty?: GateFirstRun;
		  }
	);

export function Gate({
	title,
	description,
	step,
	banner,
	form,
	empty,
	children,
}: GateProps) {
	const held = useRef<TextInput>(null);
	const insets = useSafeAreaInsets();
	return (
		<FrameHost>
			<FieldClaim.Provider value={held}>
				<View className={FILL}>
					<Scroll
						className={FILL}
						contentContainerClassName={cn(
							GATE,
							PAGE,
							title === undefined && CENTRED,
						)}
					>
						<View
							style={{
								paddingTop: insets.top,
								paddingBottom: insets.bottom,
							}}
							className={cn(GATE_COLUMN, GATE_FLOW)}
						>
							{banner}
							{title === undefined ? (
								<>
									{empty ? (
										<EmptyBase fit="first" tone="rest" {...empty} />
									) : null}
									{children}
								</>
							) : (
								<View className={GATE_STEP}>
									{step ? <StepCount at={step.at} of={step.of} /> : null}
									<RNText
										accessibilityRole="header"
										className={text({ role: "title" })}
									>
										{title}
									</RNText>
									{description ? (
										<RNText className={text({ role: "meta" })}>
											<Runs runs={description} />
										</RNText>
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
								</View>
							)}
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
