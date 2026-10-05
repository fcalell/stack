import type { Run } from "@fcalell/ui-core/descriptors";
import {
	AUTH_COLUMN,
	AUTH_HEAD,
	AUTH_PAGE,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useRef } from "react";
import { Text as RNText, type TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { FieldClaim, InAuthColumn } from "../../lib/field";
import { Scroll } from "../../lib/hosts";
import { StepCount } from "../step-count";

// The scroll's content fills it, so the column stands in the middle while it
// fits and the content grows past the viewport when it does not.
const PAGE = "grow items-center justify-center";
const SCROLL = "flex-1";

export interface AuthColumnProps extends Closed {
	// The product's name, the line that leads the column.
	product: string;
	// Where an onboarding flow stands, a `StepCount` between the product and
	// the title.
	step?: { at: number; of: number };
	// The page's one header.
	title: string;
	// A meta line under the title, as words or runs: `{ strong }` runs draw at
	// weight 500.
	sentence?: string | readonly Run[];
	// A `Banner` standing first in the column, at its width.
	banner?: ReactNode;
	// The step's body.
	children?: ReactNode;
}

// A page outside the shell: one column at the `auth` width inside the page
// inset, the banner, the product's name at meta and 500, the `StepCount`, the
// title, the sentence a pair under it, then the body. It keeps the safe area
// and scrolls over the keyboard, so the focused field and the submit act stay
// in view. An `Input` or `InputOtp` that mounts in it takes focus unless one
// holds it, and a `Form`'s `ActionBar` in it draws `full`. It draws no word
// of its own; `toast()` and `confirm()` stand only in a `Shell`.
export function AuthColumn({
	product,
	step,
	title,
	sentence,
	banner,
	children,
}: AuthColumnProps) {
	const held = useRef<TextInput>(null);
	const insets = useSafeAreaInsets();
	const runs = typeof sentence === "string" ? [sentence] : sentence;
	return (
		<InAuthColumn.Provider value>
			<FieldClaim.Provider value={held}>
				<Scroll
					className={SCROLL}
					contentContainerClassName={cn(AUTH_PAGE, PAGE)}
				>
					<View
						style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
						className={AUTH_COLUMN}
					>
						{banner}
						<RNText
							className={cn(
								text({ role: "meta" }),
								textStrong({ role: "meta" }),
							)}
						>
							{product}
						</RNText>
						{step ? <StepCount at={step.at} of={step.of} /> : null}
						<View className={AUTH_HEAD}>
							<RNText
								accessibilityRole="header"
								className={text({ role: "title" })}
							>
								{title}
							</RNText>
							{runs ? (
								<RNText className={text({ role: "meta" })}>
									{runs.map((run, at) =>
										typeof run === "string" ? (
											run
										) : (
											<RNText
												// biome-ignore lint/suspicious/noArrayIndexKey: a run is its position
												key={at}
												className={textStrong({ role: "meta" })}
											>
												{run.strong}
											</RNText>
										),
									)}
								</RNText>
							) : null}
						</View>
						{children}
					</View>
				</Scroll>
			</FieldClaim.Provider>
		</InAuthColumn.Provider>
	);
}
