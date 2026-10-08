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
import { type ReactNode, useRef, useState } from "react";
import { Image, Text as RNText, type TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Runs } from "../../lib/code";
import { FieldClaim } from "../../lib/field";
import { FormStands } from "../../lib/form";
import { PageTitle } from "../../lib/frame";
import { Scroll } from "../../lib/hosts";
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
// `auth` width inside the page inset on the surface, the banner, the lead (the
// mark, the `StepCount`, the title and the description a pair under it), then
// the body a sections gap under it. It keeps the safe area and scrolls over
// the keyboard, so the focused field and the submit act stay in view. An
// `Input` or `InputOtp` that mounts in it takes focus unless one holds it,
// each step claiming afresh as its field mounts, and a `Form`'s `ActionBar` in
// it draws `full`. It hosts `toast()` and `confirm()` as the Shell does, and
// draws no word of its own.
export interface GateProps extends Closed {
	/** The page's one header (a short phrase; wraps). */
	title: string;
	// A meta line under the title, as runs: `{ strong }` runs draw at weight
	// 500.
	description?: Sentence;
	// Where an onboarding flow stands, a `StepCount` between the mark and the
	// title.
	step?: { at: number; of: number };
	// The product's mark at the avatar's size; its `name` stands in its place
	// while the image fails or `src` is absent.
	mark?: GateMark;
	// A `Banner` standing first in the column, at its width.
	banner?: ReactNode;
	// The step's body.
	children?: ReactNode;
}

function Mark({ src, name }: GateMark) {
	const [failed, setFailed] = useState<string>();
	// Keyed by the address that failed, so a new `src` is tried again.
	if (src && src !== failed)
		return (
			<Image
				source={{ uri: src }}
				accessible
				accessibilityRole="image"
				accessibilityLabel={name}
				accessibilityIgnoresInvertColors
				resizeMode="contain"
				onError={() => setFailed(src)}
				className={GATE_MARK}
			/>
		);
	return (
		<RNText
			className={cn(text({ role: "meta" }), textStrong({ role: "meta" }))}
		>
			{name}
		</RNText>
	);
}

export function Gate({
	title,
	description,
	step,
	mark,
	banner,
	children,
}: GateProps) {
	const held = useRef<TextInput>(null);
	const insets = useSafeAreaInsets();
	return (
		<FrameHost>
			<PageTitle.Provider value={title}>
				<FormStands.Provider value="auth">
					<FieldClaim.Provider value={held}>
						<View className={FILL}>
							<Scroll
								className={FILL}
								contentContainerClassName={cn(GATE, PAGE)}
							>
								<View
									style={{
										paddingTop: insets.top,
										paddingBottom: insets.bottom,
									}}
									className={cn(GATE_COLUMN, GATE_FLOW)}
								>
									{banner}
									<View className={GATE_LEAD}>
										{mark ? <Mark src={mark.src} name={mark.name} /> : null}
										{step ? <StepCount at={step.at} of={step.of} /> : null}
										<View className={GATE_HEAD}>
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
										</View>
									</View>
									{children}
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
				</FormStands.Provider>
			</PageTitle.Provider>
		</FrameHost>
	);
}
