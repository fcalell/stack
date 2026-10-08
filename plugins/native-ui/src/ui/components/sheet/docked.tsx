import type { Act } from "@fcalell/ui-core/descriptors";
import {
	SHEET_DOCKED_BODY,
	SHEET_DOCKED_FOOT,
	SHEET_DOCKED_HEAD,
	SHEET_HEAD_ROW,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useContext, useEffect, useRef } from "react";
import { Text as RNText, type TextInput, View } from "react-native";
import { cn } from "../../lib/cn";
import { FieldClaim, FieldNameContext } from "../../lib/field";
import { FormStands } from "../../lib/form";
import { FootPlace, FootRegion, FootReturn } from "../../lib/frame";
import { Scroll, type ScrollRef } from "../../lib/hosts";
import { ActFailed, ReasonKept } from "../../lib/reason";
import { useCSSVariable } from "../../lib/theme";
import { TouchedContext, usePageTurn, useTouchState } from "../../lib/touched";
import { useWords } from "../../lib/words";
import { ActionBar } from "../action-bar";
import { IconButton } from "../icon-button";

// The sheet fills its foot, which bounds it: the head and the foot keep their
// height and the body scrolls in what is left. The foot centres what it holds,
// so the sheet spans it.
const ROOT = "w-full min-h-0 shrink";
const HEAD = "flex-row items-start shrink-0";
const HEAD_MAIN = "flex-1 min-w-0";
// The close act stands at the title's first line, which centres on it.
const HEAD_ROW = "flex-row items-start";
const TITLE_SLOT = "flex-1 flex-row items-center min-w-0 min-h-control";
const TITLE = "shrink";
const BODY = "shrink";
// In a foot the body scrolls past two fifths of the foot's region and keeps
// three rows, so a body shorter than three rows pads to them. Yoga has no
// container units: the region's height comes from its layout (`FootRegion`,
// zero outside a docked foot, where the body has no bound) and the row from its
// token.
const BODY_SHARE = 0.4;
const BODY_ROWS = 3;
const FOOT = "shrink-0";
const FOOT_LINE = "flex-row items-center min-w-0";

/** What a docked `Sheet` draws: the public `Sheet`'s props, standing in a foot. Outside the package's exports. */
export interface SheetDockedProps {
	open: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	back?: () => void;
	submit?: Act;
	foot?: string;
	failed?: string;
	children?: ReactNode;
}

// A `Sheet` standing in a Thread's or a Place's foot: no scrim or modal, the
// foot's raised cell its surface. The head holds the back act before one
// column, the title and the close act over the description, so both lines
// share a start; the body, bounded, scrolls between the head and the foot, which
// hold their height, and each page opens at its top; the foot holds the line over
// the submit, and under it one kept line for a blocked reason or a failed
// run's sentence. The first field of each page takes focus as it mounts, and
// leaving sets the foot's claim for the input that returns. Closed it draws
// nothing.
export function SheetDocked({
	open,
	onClose,
	title,
	description,
	back,
	submit,
	foot,
	failed,
	children,
}: SheetDockedProps) {
	const words = useWords();
	const claim = useContext(FootReturn);
	const region = useContext(FootRegion);
	const row = Number.parseFloat(String(useCSSVariable("--spacing-row") ?? 0));
	const bound =
		region > 0
			? { maxHeight: BODY_SHARE * region, minHeight: BODY_ROWS * row }
			: undefined;
	const held = useRef<TextInput>(null);
	const scroll = useRef<ScrollRef>(null);
	const [touchedValue, setTouched] = useTouchState();
	const page = usePageTurn(open, title, description, () => setTouched(false));
	// A new page opens at its top, not where the last one was scrolled to.
	// biome-ignore lint/correctness/useExhaustiveDependencies: a new page resets the scroll
	useEffect(() => {
		scroll.current?.scrollTo({ y: 0, animated: false });
	}, [page]);
	useEffect(
		() => () => {
			if (claim) claim.current = true;
		},
		[claim],
	);
	if (!open) return null;
	return (
		<TouchedContext.Provider value={touchedValue}>
			<FieldNameContext.Provider value={title}>
				<FootPlace.Provider value={null}>
					<FieldClaim.Provider value={held}>
						<View className={ROOT}>
							<View className={cn(SHEET_HEAD_ROW, HEAD)}>
								{back ? (
									<IconButton
										icon="ChevronLeft"
										fit="body"
										label={words.back}
										onAct={back}
									/>
								) : null}
								<View className={cn(SHEET_DOCKED_HEAD, HEAD_MAIN)}>
									<View className={cn(SHEET_HEAD_ROW, HEAD_ROW)}>
										<View accessibilityRole="header" className={TITLE_SLOT}>
											<RNText
												className={cn(
													text({ role: "body" }),
													textStrong({ role: "body" }),
													TITLE,
												)}
											>
												{title}
											</RNText>
										</View>
										<IconButton
											icon="X"
											fit="body"
											label={words.close}
											onAct={onClose}
										/>
									</View>
									{description ? (
										<RNText className={text({ role: "meta" })}>
											{description}
										</RNText>
									) : null}
								</View>
							</View>
							<Scroll
								ref={scroll}
								className={BODY}
								style={bound}
								contentContainerClassName={SHEET_DOCKED_BODY}
							>
								<FormStands.Provider value="sheet">
									{children}
								</FormStands.Provider>
							</Scroll>
							{foot || submit ? (
								<View className={cn(SHEET_DOCKED_FOOT, FOOT)}>
									{foot ? (
										<View className={FOOT_LINE}>
											<RNText className={text({ role: "meta" })}>{foot}</RNText>
										</View>
									) : null}
									{submit ? (
										<ReasonKept.Provider value>
											<ActFailed.Provider value={failed}>
												<ActionBar acts={[submit]} />
											</ActFailed.Provider>
										</ReasonKept.Provider>
									) : null}
								</View>
							) : null}
						</View>
					</FieldClaim.Provider>
				</FootPlace.Provider>
			</FieldNameContext.Provider>
		</TouchedContext.Provider>
	);
}
