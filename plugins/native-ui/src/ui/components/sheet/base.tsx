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
	INITIAL_LAYOUT_VALUE,
	KEYBOARD_STATUS,
	useBottomSheetInternal,
} from "@gorhom/bottom-sheet";
import {
	Children,
	createContext,
	isValidElement,
	type PropsWithChildren,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { Text as RNText, useWindowDimensions, View } from "react-native";
import { useAnimatedReaction } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { useResolveClassNames, withUniwind } from "uniwind";
import { cn } from "../../lib/cn";
import { FieldNameContext } from "../../lib/field";
import { FormStands } from "../../lib/form";
import { timing } from "../../lib/motion";
import { RaisedGround } from "../../lib/raised";
import { type ReasonHost, ReasonHostContext } from "../../lib/reason";
import { type Touched, TouchedContext } from "../../lib/touched";
import { useWords } from "../../lib/words";
import { ActionBar } from "../action-bar";
import { Button } from "../button";
import { FormField, type FormFieldProps, fieldControl } from "../form-field";
import { IconButton } from "../icon-button";
import { IconButtonBase } from "../icon-button/base";
import { TextArea } from "../text-area";

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
const ScrimBase = withUniwind(BottomSheetBackdrop);

// What the head, the foot and the scrim draw. gorhom renders each slot as an
// element type, so a new component identity remounts its tree (a typing
// field in the head loses focus): the slots are module components reading
// this, never closures.
interface Parts {
	title: string;
	description?: string;
	back?: () => void;
	submit?: Act;
	fit?: SheetFit;
	foot?: string;
	acts?: Act[];
	above?: ReactNode;
	busy?: boolean;
	onClose: () => void;
	// A blocked submit's reason once the sheet is touched or the submit pressed.
	reason?: string;
	host?: ReasonHost;
	touched: Touched;
	// The sheet's height cap, gorhom's `maxDynamicContentSize`.
	cap: number;
	setCapped: (capped: boolean) => void;
	setFootHeight: (height: number) => void;
}

// One sheet's parts, which its layer reads: gorhom draws the layer in its
// provider's host and pushes it only when the modal itself re-renders.
interface PartsStore {
	get: () => Parts;
	set: (parts: Parts) => void;
	subscribe: (listener: () => void) => () => void;
}

function partsStore(initial: Parts): PartsStore {
	let current = initial;
	const listeners = new Set<() => void>();
	return {
		get: () => current,
		set: (parts) => {
			current = parts;
			for (const listener of listeners) listener();
		},
		subscribe: (listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

const PartsContext = createContext<Parts | undefined>(undefined);

function useParts(): Parts {
	const parts = useContext(PartsContext);
	if (!parts) throw new Error("A sheet's part is drawn outside its sheet.");
	return parts;
}

// gorhom draws the sheet outside the tree that opens it, so the sheet's
// contexts start at the container it draws everything in.
function layerOf(store: PartsStore) {
	return function Layer({ children }: PropsWithChildren) {
		const parts = useSyncExternalStore(store.subscribe, store.get);
		return (
			<PartsContext.Provider value={parts}>
				<FieldNameContext.Provider value={parts.title}>
					<TouchedContext.Provider value={parts.touched}>
						<FormStands.Provider value="sheet">
							<View
								accessibilityViewIsModal
								pointerEvents="box-none"
								className={LAYER}
							>
								{children}
							</View>
						</FormStands.Provider>
					</TouchedContext.Provider>
				</FieldNameContext.Provider>
			</PartsContext.Provider>
		);
	};
}

function Ground({ style }: BottomSheetBackgroundProps) {
	return <View pointerEvents="none" style={style} className={SHEET} />;
}

function Scrim(props: BottomSheetBackdropProps) {
	const { busy } = useParts();
	return (
		<ScrimBase
			{...props}
			className={SCRIM}
			opacity={1}
			appearsOnIndex={0}
			disappearsOnIndex={-1}
			pressBehavior={busy ? "none" : "close"}
		/>
	);
}

function Head() {
	const words = useWords();
	const {
		back,
		acts,
		onClose,
		busy,
		fit,
		title,
		submit,
		host,
		description,
		reason,
		above,
	} = useParts();
	return (
		<RaisedGround>
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
										? cn(text({ role: "body" }), textStrong({ role: "body" }))
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
				{reason ? (
					<RNText className={cn(text({ role: "meta" }), REASON)}>
						{reason}
					</RNText>
				) : null}
			</View>
			{above}
		</RaisedGround>
	);
}

// The foot's line over a decision's acts, at the content's end or held by
// gorhom's footer; either place reports its height.
function Foot() {
	const { foot, acts, setFootHeight } = useParts();
	const insets = useSafeAreaInsets();
	const { paddingBottom } = useResolveClassNames(FOOT_END);
	const footEnd = typeof paddingBottom === "number" ? paddingBottom : 0;
	return (
		<View
			onLayout={(event) => setFootHeight(event.nativeEvent.layout.height)}
			style={{ paddingBottom: footEnd + insets.bottom }}
			className={SHEET_FOOT}
		>
			{foot ? (
				<View className={FOOT_LINE}>
					<RNText className={text({ role: "meta" })}>{foot}</RNText>
				</View>
			) : null}
			{acts ? <ActionBar acts={acts} /> : null}
		</View>
	);
}

function Footer(props: BottomSheetFooterProps) {
	return (
		<BottomSheetFooter {...props}>
			<RaisedGround>
				<Foot />
			</RaisedGround>
		</BottomSheetFooter>
	);
}

// Whether the content scrolls, read off gorhom's own layout: the head and
// the content at the height cap, or, with the keyboard up, taller than the
// room left over it, where gorhom clips the content.
function Fits() {
	const { cap, setCapped } = useParts();
	const { animatedLayoutState, animatedKeyboardState } =
		useBottomSheetInternal();
	useAnimatedReaction(
		() => {
			const { containerHeight, handleHeight, contentHeight } =
				animatedLayoutState.get();
			if (
				containerHeight === INITIAL_LAYOUT_VALUE ||
				handleHeight === INITIAL_LAYOUT_VALUE ||
				contentHeight === INITIAL_LAYOUT_VALUE
			)
				return undefined;
			const keyboard = animatedKeyboardState.get();
			const covered =
				keyboard.status === KEYBOARD_STATUS.SHOWN
					? keyboard.heightWithinContainer
					: 0;
			const sheet = handleHeight + contentHeight;
			return sheet >= cap || sheet + covered > containerHeight;
		},
		(capped, previous) => {
			if (capped !== undefined && capped !== previous)
				scheduleOnRN(setCapped, capped);
		},
		[cap, setCapped],
	);
	return null;
}

// Whether the sheet holds a `TextArea`, read off the elements it is given
// (through a `FormField`'s control), so it stands full height from its first
// frame and a wizard's page without one returns to content height. A
// TextArea an app component draws inside itself is out of its sight.
function holdsTextArea(node: ReactNode): boolean {
	return Children.toArray(node).some((child) => {
		if (!isValidElement<{ children?: ReactNode }>(child)) return false;
		if (child.type === TextArea) return true;
		if (child.type === FormField)
			// The element's type is FormField, so its props are a field's.
			return holdsTextArea(fieldControl(child.props as FormFieldProps));
		const inner = child.props.children;
		// A render prop (a bound field, a list's map) is no node to read.
		return typeof inner !== "function" && holdsTextArea(inner);
	});
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
// blocked submit's reason under the head), the body under it, and the foot
// (its line over a decision's acts) at the body's end, or fixed at the
// bottom once the body scrolls. Native draws the phone at every width, so
// `fit` picks only the pane's title. The title names a typing control
// inside that no `FormField` labels. A new `title` or `description` is a new
// page, which has taken no input.
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
	const insets = useSafeAreaInsets();
	const { height } = useWindowDimensions();
	const ref = useRef<BottomSheetModal>(null);
	const [settled, setSettled] = useState(false);
	const [touched, setTouched] = useState(false);
	const [pressed, setPressed] = useState(false);
	const touch = useCallback(() => setTouched(true), []);
	const tall = holdsTextArea(children);
	const blocked = submit?.blocked !== undefined;
	// A sheet as it opens, and a new page (a wizard's, or the next queued
	// decision's), has taken no input: reset during render, so it never draws
	// the last one's reason, while a closing sheet keeps its own until it is
	// gone.
	const page = `${title}\n${description ?? ""}`;
	const [shown, setShown] = useState({ open, page });
	if (shown.open !== open || shown.page !== page) {
		setShown({ open, page });
		if (open) {
			setTouched(false);
			setPressed(false);
		}
	}
	// gorhom sizes a sheet to its content once it has measured the content
	// and the head; a footer it measures after them sizes it a second time.
	// So the foot stands at the content's end, measured with it, and moves to
	// gorhom's footer only where the content scrolls: a full-height sheet, or
	// content gorhom caps, which keeps the foot's height as its end inset so
	// the content's height holds.
	const [capped, setCapped] = useState(false);
	const [footHeight, setFootHeight] = useState(0);
	const cap = height - insets.top;
	// Whether gorhom holds the sheet, from `present()` to its `onDismiss`.
	// A `dismiss()` while it holds none marks the modal dismissing for good,
	// and every later `present()` then draws nothing.
	const held = useRef(false);
	useEffect(() => {
		if (open) {
			setSettled(false);
			held.current = true;
			ref.current?.present();
		} else if (held.current) ref.current?.dismiss(LEAVE);
	}, [open]);
	useEffect(() => {
		if (!blocked) setPressed(false);
	}, [blocked]);
	const touchedValue = useMemo(() => ({ touched, touch }), [touched, touch]);
	const host = useMemo(
		() => (blocked ? { press: () => setPressed(true) } : undefined),
		[blocked],
	);
	const parts: Parts = {
		title,
		description,
		back,
		submit,
		fit,
		foot,
		acts,
		above,
		busy,
		onClose,
		reason: blocked && (pressed || touched) ? submit?.blocked : undefined,
		host,
		touched: touchedValue,
		cap,
		setCapped,
		setFootHeight,
	};
	const [{ store, Layer }] = useState(() => {
		const created = partsStore(parts);
		return { store: created, Layer: layerOf(created) };
	});
	useLayoutEffect(() => store.set(parts));
	const footed = form !== "menu" && (foot !== undefined || acts !== undefined);
	const fixed = footed && (tall || capped);
	let end: { paddingBottom: number } | undefined;
	if (!footed) end = { paddingBottom: insets.bottom };
	else if (fixed && !tall) end = { paddingBottom: footHeight };
	let body: ReactNode = null;
	if (form === "menu") body = children;
	else if (children)
		body = <View className={cn(SHEET_BODY, BODY)}>{children}</View>;
	return (
		<BottomSheetModal
			ref={ref}
			// Every sheet reaches the screen under reduced motion through this
			// commit; the mechanism is undiagnosed.
			onChange={(index) => setSettled(index >= 0)}
			onDismiss={() => {
				held.current = false;
				onClose();
			}}
			containerComponent={Layer}
			accessible={false}
			backgroundComponent={Ground}
			backdropComponent={Scrim}
			handleComponent={Head}
			footerComponent={fixed ? Footer : undefined}
			enablePanDownToClose={!busy}
			enableDynamicSizing={!tall}
			maxDynamicContentSize={cap}
			snapPoints={tall ? FULL : undefined}
			animationConfigs={settled ? LEAVE : ENTER}
		>
			<BottomSheetScrollView
				enableFooterMarginAdjustment={fixed && tall}
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={end}
			>
				<RaisedGround>
					{body}
					{footed && !fixed ? <Foot /> : null}
					{footed && !tall ? <Fits /> : null}
				</RaisedGround>
			</BottomSheetScrollView>
		</BottomSheetModal>
	);
}
