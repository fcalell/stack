import type { ProcedureCall } from "@fcalell/plugin-api/types";
import { BACK_GLYPH } from "@fcalell/ui-core/list-state";
import { dockedBodyMax } from "@fcalell/ui-core/tokens";
import {
	SHEET_DOCKED_BODY,
	SHEET_DOCKED_FOOT,
	SHEET_DOCKED_HEAD,
	SHEET_HEAD_ROW,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { Text as RNText, type TextInput, View } from "react-native";
import type { Act } from "../../lib/act";
import { useAct } from "../../lib/act";
import { cn } from "../../lib/cn";
import { FieldClaim, FieldNameContext } from "../../lib/field";
import { type FootRegionValue, FootReturn, tokenPx } from "../../lib/frame";
import { Scroll, type ScrollRef } from "../../lib/hosts";
import { blockIn, FadingView } from "../../lib/motion";
import { useCSSVariable } from "../../lib/theme";
import { TouchedContext, usePageTurn, useTouchState } from "../../lib/touched";
import { useWords } from "../../lib/words";
import { ActionBarBase } from "../action-bar/base";
import { Button } from "../button";
import { type FormProps, useDerivedForm } from "../form";
import { FormBody } from "../form/base";

// The sheet fills its foot, which bounds it: the head and the foot keep their
// height and the body scrolls in what is left. The foot centres what it holds,
// so the sheet spans it.
const ROOT = "w-full min-h-0 shrink";
const HEAD = "flex-row items-start shrink-0";
const HEAD_MAIN = "flex-1 min-w-0";
// The back and close acts stand at the title's first line: each in a box one
// heading line tall, centred on the line; a taller act overflows it centred.
const FIRST_LINE = "shrink-0 justify-center items-center";
const TITLE = "shrink";
const BODY = "shrink";
// In a foot the body scrolls past two fifths of the foot's region and its
// content keeps three rows, so a body shorter than three rows pads to them
// while the scroller itself yields below them where the region is short. Yoga
// has no container units: the region's height comes from its layout
// (the `region` the Pane or Thread measures), the head and foot from theirs,
// and the row from its token.
const FOOT = "shrink-0";

/** What a docked `Sheet` draws: the public `Sheet`'s props, standing in a foot, and the foot's measured `region`. Outside the package's exports: a `Pane` and a `Thread` draw it for their `sheet`. */
export interface SheetDockedProps<P extends ProcedureCall = ProcedureCall> {
	open: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	back?: () => void;
	submit?: Act;
	form?: FormProps<P>;
	// The foot's region, which bounds the body.
	region: FootRegionValue;
	children?: ReactNode;
}

// A `Sheet` a Thread or a Pane draws in its foot: no scrim or modal, the
// foot's raised cell its surface. The head holds the back act before one
// column, the title over the description, with the acts at the title's first
// line; the body, bounded, scrolls between the head and the foot, which
// hold their height, and each page opens at its top; the foot holds the submit,
// and under it one kept line for a blocked reason or a failed
// run's sentence. The first field of each page takes focus as it mounts, and
// leaving sets the foot's claim for the input that returns. Closed it draws
// nothing.
export function SheetDocked<P extends ProcedureCall>({
	open,
	onClose,
	title,
	description,
	back,
	submit,
	form,
	region,
	children,
}: SheetDockedProps<P>) {
	const words = useWords();
	// The foot's act and its form's bar share one run: one act pends at a time,
	// and closing is held while it runs.
	const acting = useAct<number>("line");
	const derived = useDerivedForm(form, open);
	// Closing runs in the screen's block move: the sheet fades out on `fast` as
	// the body above takes the room back.
	const close = () => {
		if (!acting.holds) onClose();
	};
	const claim = useContext(FootReturn);
	const floor = tokenPx(useCSSVariable("--spacing-docked-floor"));
	// The head's and the foot's heights, which the sheet pins.
	const [head, setHead] = useState(0);
	const [pinFoot, setPinFoot] = useState(0);
	const bound =
		region.height > 0
			? {
					maxHeight: dockedBodyMax({
						region: region.height,
						pinned: region.chrome + head + (submit ? pinFoot : 0),
						floor,
						logFloor: region.logFloor,
					}),
				}
			: undefined;
	const line = {
		height: Number.parseFloat(String(useCSSVariable("--leading-heading") ?? 0)),
	};
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
				<FieldClaim.Provider value={held}>
					<FadingView entering={blockIn()} className={ROOT}>
						<View
							className={cn(SHEET_HEAD_ROW, HEAD)}
							onLayout={(event) => setHead(event.nativeEvent.layout.height)}
						>
							{back ? (
								<View className={FIRST_LINE} style={line}>
									<Button
										glyph
										icon={BACK_GLYPH}
										label={words.back}
										onAct={back}
									/>
								</View>
							) : null}
							<View className={cn(SHEET_DOCKED_HEAD, HEAD_MAIN)}>
								<RNText
									accessibilityRole="header"
									className={cn(text({ role: "heading" }), TITLE)}
								>
									{title}
								</RNText>
								{description ? (
									<RNText className={text({ role: "meta" })}>
										{description}
									</RNText>
								) : null}
							</View>
							<View className={FIRST_LINE} style={line}>
								<Button glyph icon="X" label={words.close} onAct={close} />
							</View>
						</View>
						<Scroll
							ref={scroll}
							className={BODY}
							style={bound}
							contentContainerClassName={SHEET_DOCKED_BODY}
							contentContainerStyle={
								region.height > 0 ? { minHeight: floor } : undefined
							}
						>
							{children}
							{derived ? (
								<FormBody {...derived} in="sheet" acting={acting} />
							) : null}
						</Scroll>
						{submit ? (
							<View
								className={cn(SHEET_DOCKED_FOOT, FOOT)}
								onLayout={(event) =>
									setPinFoot(event.nativeEvent.layout.height)
								}
							>
								<ActionBarBase acts={[submit]} acting={acting} kept />
							</View>
						) : null}
					</FadingView>
				</FieldClaim.Provider>
			</FieldNameContext.Provider>
		</TouchedContext.Provider>
	);
}
