import type { Act } from "@fcalell/ui-core/descriptors";
import {
	SCRIM,
	SHEET,
	SHEET_BODY,
	SHEET_FOOT,
	SHEET_HEAD,
	SHEET_HEAD_ROW,
	type SheetFit,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import {
	BottomSheetBackdrop,
	type BottomSheetBackdropProps,
	type BottomSheetBackgroundProps,
	BottomSheetFooter,
	type BottomSheetFooterProps,
	BottomSheetModal,
	BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import {
	createContext,
	type PropsWithChildren,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Text as RNText, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResolveClassNames, withUniwind } from "uniwind";
import { cn } from "../../lib/cn";
import { FieldNameContext } from "../../lib/field";
import { FormStands } from "../../lib/form";
import { timing } from "../../lib/motion";
import { RaisedGround } from "../../lib/raised";
import { ReasonHostContext } from "../../lib/reason";
import { TouchedContext } from "../../lib/touched";
import { useWords } from "../../lib/words";
import { ActionBar } from "../action-bar";
import { Button } from "../button";
import { IconButton } from "../icon-button";
import { IconButtonBase } from "../icon-button/base";

// The layer over the app that VoiceOver keeps to while the sheet is open.
const LAYER = "absolute inset-0";
const HEAD_ROW = "flex-row items-center";
const TITLE_BLOCK = "flex-1 min-w-0";
const TITLE_SLOT = "flex-row items-center min-w-0";
const TITLE = "shrink";
const REASON = "text-right";
const BODY = "grow min-h-0";
// The foot's end inset, which the home indicator's inset joins: a style
// overrides the class, so the sum is one value.
const FOOT_END = "pb-card";
const FOOT_LINE = "flex-row items-center min-w-0";
const FULL = ["100%"];
// The sheet enters at the slow rung on the out curve and leaves at the base
// rung on the in curve; the scrim fades with it, its opacity read off the
// sheet's position. gorhom runs a swipe's and the scrim's close on the
// sheet's `animationConfigs`, so the sheet holds the enter timing until it
// has settled open, the leave timing from then on.
const ENTER = timing("slow", "out");
const LEAVE = timing("base", "in");

// The scrim under the sheet, its own fill at full opacity.
const Scrim = withUniwind(BottomSheetBackdrop);

// A TextArea inside asks the sheet for the full height.
const GrowContext = createContext<(() => void) | undefined>(undefined);

export function useSheetGrow(): (() => void) | undefined {
	return useContext(GrowContext);
}

function Layer({ children }: PropsWithChildren) {
	return (
		<View accessibilityViewIsModal pointerEvents="box-none" className={LAYER}>
			{children}
		</View>
	);
}

function Ground({ style }: BottomSheetBackgroundProps) {
	return <View pointerEvents="none" style={style} className={SHEET} />;
}

/** What every sheet draws: the public `Sheet`, the confirm, a `Menu` and the Picker's options. Outside the package's exports. */
export interface SheetBaseProps {
	open: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	back?: () => void;
	submit?: Act;
	foot?: string;
	fit?: SheetFit;
	// A decision's acts, the foot's `ActionBar`.
	acts?: Act[];
	// A menu's rows stand under the head with no body inset or foot.
	form?: "menu";
	// Fixed under the head, over the scrolling body: the Picker's search.
	above?: ReactNode;
	// An act pends: the close act, the scrim and the drag are inert.
	busy?: boolean;
	children?: ReactNode;
}

// A bottom sheet over the scrim, content-tall up to the screen under its top
// inset (full height when it holds a TextArea): the head fixed at the top
// (the close act, or back on a second page, or neither for a decision, whose
// acts dismiss it, the title and the submit at its
// end where a keyboard would cover a bar, the description under them and a
// blocked submit's reason under the head), the body scrolling under it, and
// the foot fixed at the bottom (its line over a decision's acts). Native
// draws the phone at every width, so `fit` picks only the pane's title. The
// title names a typing control inside that no `FormField` labels. A new
// `title` or `description` is a new page, which has taken no input.
export function SheetBase({
	open,
	onClose,
	title,
	description,
	back,
	submit,
	foot,
	fit,
	acts,
	form,
	above,
	busy,
	children,
}: SheetBaseProps) {
	const words = useWords();
	const insets = useSafeAreaInsets();
	const { height } = useWindowDimensions();
	const { paddingBottom } = useResolveClassNames(FOOT_END);
	const footEnd = typeof paddingBottom === "number" ? paddingBottom : 0;
	const ref = useRef<BottomSheetModal>(null);
	const [tall, setTall] = useState(false);
	const [settled, setSettled] = useState(false);
	const [touched, setTouched] = useState(false);
	const [pressed, setPressed] = useState(false);
	const grow = useCallback(() => setTall(true), []);
	const touch = useCallback(() => setTouched(true), []);
	const blocked = submit?.blocked !== undefined;
	// A wizard swaps its page in place; reset during render, so the new page
	// never draws the old page's reason.
	const page = `${title}\n${description ?? ""}`;
	const [shown, setShown] = useState(page);
	if (shown !== page) {
		setShown(page);
		setTouched(false);
		setPressed(false);
	}
	// Whether gorhom holds the sheet, from `present()` to its `onDismiss`.
	// A `dismiss()` while it holds none marks the modal dismissing for good,
	// and every later `present()` then draws nothing.
	const held = useRef(false);
	useEffect(() => {
		if (open) {
			setSettled(false);
			held.current = true;
			ref.current?.present();
		} else {
			if (held.current) ref.current?.dismiss(LEAVE);
			setTouched(false);
		}
	}, [open]);
	useEffect(() => {
		if (!blocked) setPressed(false);
	}, [blocked]);
	const snapPoints = useMemo(() => (tall ? FULL : undefined), [tall]);
	const touchedValue = useMemo(() => ({ touched, touch }), [touched, touch]);
	const host = useMemo(
		() => (blocked ? { press: () => setPressed(true) } : undefined),
		[blocked],
	);
	// gorhom draws the head, the body and the foot as three trees, so each
	// carries the sheet's contexts and its raised ground.
	const within = useCallback(
		(node: ReactNode) => (
			<RaisedGround>
				<GrowContext.Provider value={grow}>
					<FieldNameContext.Provider value={title}>
						<TouchedContext.Provider value={touchedValue}>
							<FormStands.Provider value="sheet">{node}</FormStands.Provider>
						</TouchedContext.Provider>
					</FieldNameContext.Provider>
				</GrowContext.Provider>
			</RaisedGround>
		),
		[grow, title, touchedValue],
	);
	const scrim = useCallback(
		(props: BottomSheetBackdropProps) => (
			<Scrim
				{...props}
				className={SCRIM}
				opacity={1}
				appearsOnIndex={0}
				disappearsOnIndex={-1}
				pressBehavior={busy ? "none" : "close"}
			/>
		),
		[busy],
	);
	const head = useCallback(
		() =>
			within(
				<>
					<View className={SHEET_HEAD}>
						<View className={cn(SHEET_HEAD_ROW, HEAD_ROW)}>
							{back ? (
								<IconButton
									icon="ChevronLeft"
									fit="body"
									label={words.back}
									onAct={back}
								/>
							) : null}
							{back || acts ? null : (
								<IconButtonBase
									icon="X"
									fit="body"
									label={words.close}
									onAct={onClose}
									disabled={busy}
								/>
							)}
							<View className={TITLE_BLOCK}>
								<View accessibilityRole="header" className={TITLE_SLOT}>
									<RNText
										numberOfLines={1}
										className={cn(
											fit === "pane"
												? cn(
														text({ role: "body" }),
														textStrong({ role: "body" }),
													)
												: text({ role: "heading" }),
											TITLE,
										)}
									>
										{title}
									</RNText>
								</View>
							</View>
							{submit ? (
								<ReasonHostContext.Provider value={host}>
									<Button
										fit="bar"
										label={submit.label}
										onAct={() => void submit.onAct()}
										loading={submit.loading}
										blocked={submit.blocked}
									/>
								</ReasonHostContext.Provider>
							) : null}
						</View>
						{description ? (
							<RNText className={text({ role: "meta" })}>{description}</RNText>
						) : null}
						{blocked && (pressed || touched) ? (
							<RNText className={cn(text({ role: "meta" }), REASON)}>
								{submit?.blocked}
							</RNText>
						) : null}
					</View>
					{above}
				</>,
			),
		[
			within,
			back,
			acts,
			words,
			onClose,
			busy,
			fit,
			title,
			submit,
			host,
			description,
			blocked,
			pressed,
			touched,
			above,
		],
	);
	const footed = form !== "menu" && (foot !== undefined || acts !== undefined);
	const footer = useCallback(
		(props: BottomSheetFooterProps) => (
			<BottomSheetFooter {...props}>
				{within(
					<View
						style={{ paddingBottom: footEnd + insets.bottom }}
						className={SHEET_FOOT}
					>
						{foot ? (
							<View className={FOOT_LINE}>
								<RNText className={text({ role: "meta" })}>{foot}</RNText>
							</View>
						) : null}
						{acts ? <ActionBar acts={acts} /> : null}
					</View>,
				)}
			</BottomSheetFooter>
		),
		[within, footEnd, insets.bottom, foot, acts],
	);
	let body: ReactNode = null;
	if (form === "menu") body = children;
	else if (children)
		body = <View className={cn(SHEET_BODY, BODY)}>{children}</View>;
	return (
		<BottomSheetModal
			ref={ref}
			onChange={(index) => setSettled(index >= 0)}
			onDismiss={() => {
				held.current = false;
				onClose();
			}}
			containerComponent={Layer}
			accessible={false}
			backgroundComponent={Ground}
			backdropComponent={scrim}
			handleComponent={head}
			footerComponent={footed ? footer : undefined}
			enablePanDownToClose={!busy}
			enableDynamicSizing={!tall}
			maxDynamicContentSize={height - insets.top}
			snapPoints={snapPoints}
			animationConfigs={settled ? LEAVE : ENTER}
		>
			<BottomSheetScrollView
				enableFooterMarginAdjustment={footed}
				contentContainerStyle={
					footed ? undefined : { paddingBottom: insets.bottom }
				}
			>
				{within(body)}
			</BottomSheetScrollView>
		</BottomSheetModal>
	);
}
