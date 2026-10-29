import type { Selection } from "@fcalell/plugin-api/tanstack-query";
import { BACK_GLYPH } from "@fcalell/ui-core/list-state";
import {
	SCRIM,
	SHEET,
	SHEET_FOOT,
	SHEET_HEAD,
	SHEET_HEAD_ROW,
	SHEET_PARTS,
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
	BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
	type QueryClient,
	QueryClientProvider,
	useQueryClient,
} from "@tanstack/react-query";
import {
	createContext,
	type PropsWithChildren,
	type ReactNode,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { Text as RNText, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";
import type { Act } from "../../lib/act";
import { type Acting, useAct } from "../../lib/act";
import { cn } from "../../lib/cn";
import type { Empty } from "../../lib/empty";
import { FieldNameContext } from "../../lib/field";
import { released } from "../../lib/follow";
import { timing } from "../../lib/motion";
import { RaisedGround } from "../../lib/raised";
import {
	BusyMark,
	type Frame,
	FrameBody,
	FrameLine,
	submitOf,
	useFrame,
	useSubmitOf,
} from "../../lib/read";
import {
	type Touched,
	TouchedContext,
	usePageTurn,
	useTouchState,
} from "../../lib/touched";
import { useWords } from "../../lib/words";
import type { ActionBarProps } from "../action-bar";
import { ActionBarBase } from "../action-bar/base";
import { Button } from "../button";
import { IconButtonBase } from "../button/glyph";

// The modal layer over the app while the sheet is open.
const LAYER = "absolute inset-0";
const HEAD_ROW = "flex-row items-center";
const TITLE_BLOCK = "grow basis-0 min-w-0";
const TITLE_SLOT = "flex-row items-center min-w-0";
const TITLE = "shrink";
const BODY = "grow min-h-0";
// A view's children fill the whole layer over the scrim.
const VIEW = "flex-1";
const FULL = ["100%"];
// The sheet enters at the base rung on the out curve and leaves at the base
// rung on the in curve (`LAYER_SHEET_BOTTOM`); the scrim fades with it, its
// opacity read off the sheet's position. gorhom follows the finger's drag
// down 1:1 and runs the release (the settle back or the swipe's close) and the
// scrim's close on the sheet's `animationConfigs`, so the sheet holds the
// enter timing until it has settled open, the release timing (`base` `out`,
// the follow's) from then on. The timings are read when the sheet opens, so
// the tuning page's rungs reach the next one.
const enter = () => timing("base", "out");
const leave = () => timing("base", "in");

// The scrim under the sheet, its own fill at full opacity.
const ScrimBase = withUniwind(BottomSheetBackdrop);
const ViewBody = withUniwind(BottomSheetView);

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
	acts?: Act[];
	// The form's bar.
	bar?: ActionBarProps;
	above?: ReactNode;
	// The holder of the sheet's acts' run: its submit, its foot's acts and its
	// form's bar share it, and it holds the dismissal while one runs.
	acting: Acting<number>;
	onClose: () => void;
	// The body's read waits or stands still: the submit paints, inert.
	painted?: boolean;
	// Why the body's read ended: the form's bar stands blocked under it too.
	ended?: string;
	// What the form in the body holds: the form's bar, hoisted into the foot,
	// submits what that gives.
	barRead?: Selection<unknown>;
	// The body's frame, whose busy mark and state line the head draws.
	frame: Frame;
	touched: Touched;
	// The app's query client: the body is drawn in gorhom's portal, outside the
	// providers above the sheet, and its leaves subscribe to their reads.
	client: QueryClient;
}

// A value a sheet's layer reads: gorhom draws the layer in its provider's
// host and pushes it only when the modal itself re-renders.
interface Store<T> {
	get: () => T;
	set: (value: T) => void;
	subscribe: (listener: () => void) => () => void;
}

function store<T>(initial: T): Store<T> {
	let current = initial;
	const listeners = new Set<() => void>();
	return {
		get: () => current,
		set: (value) => {
			current = value;
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
// contexts, and the query client its body's leaves read through, start at the
// container it draws everything in.
function layerOf(parts: Store<Parts>) {
	return function Layer({ children }: PropsWithChildren) {
		const current = useSyncExternalStore(parts.subscribe, parts.get);
		return (
			<QueryClientProvider client={current.client}>
				<PartsContext.Provider value={current}>
					<FieldNameContext.Provider value={current.title}>
						<TouchedContext.Provider value={current.touched}>
							<View
								accessibilityViewIsModal
								pointerEvents="box-none"
								className={LAYER}
							>
								{children}
							</View>
						</TouchedContext.Provider>
					</FieldNameContext.Provider>
				</PartsContext.Provider>
			</QueryClientProvider>
		);
	};
}

function Ground({ style }: BottomSheetBackgroundProps) {
	return <View pointerEvents="none" style={style} className={SHEET} />;
}

function Scrim(props: BottomSheetBackdropProps) {
	const { acting } = useParts();
	return (
		<ScrimBase
			{...props}
			className={SCRIM}
			opacity={1}
			appearsOnIndex={0}
			disappearsOnIndex={-1}
			pressBehavior={acting.holds ? "none" : "close"}
		/>
	);
}

function Head() {
	const words = useWords();
	const { back, acts, onClose, fit, title, description, acting, frame, above } =
		useParts();
	const heading = (
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
			<BusyMark frame={frame} />
		</View>
	);
	const said = description ? (
		<RNText className={text({ role: "meta" })}>{description}</RNText>
	) : null;
	return (
		<RaisedGround>
			<View className={SHEET_HEAD}>
				<View className={cn(SHEET_HEAD_ROW, HEAD_ROW)}>
					{back ? (
						<Button glyph icon={BACK_GLYPH} label={words.back} onAct={back} />
					) : null}
					{back || acts ? null : (
						<IconButtonBase
							icon="X"
							label={words.close}
							onAct={onClose}
							disabled={acting.holds}
						/>
					)}
					<View className={TITLE_BLOCK}>{heading}</View>
				</View>
				{said}
				<FrameLine frame={frame} />
			</View>
			{above}
		</RaisedGround>
	);
}

// The form's bar: it subscribes to the form's read itself, since the form that
// owns the read stands in the body and the bar in the footer.
function FormBar() {
	const { bar, acting, painted, ended, barRead } = useParts();
	const form = useSubmitOf(barRead);
	if (!bar) return null;
	return (
		<ActionBarBase
			{...bar}
			acting={acting}
			painted={painted || form.waiting}
			ended={ended ?? form.ended}
		/>
	);
}

// A decision's acts, the submit, then the form's bar, in gorhom's footer:
// gorhom measures it with the sheet and keeps it above the keyboard, so the
// submit follows the fields it submits and a keyboard never covers it. The
// bar stands the submit painted while the body's read waits and blocked once
// it ended, its reason or a failed run's sentence under it. Nothing in it, it
// draws nothing and the footer is no height.
function Foot() {
	const { acts, submit, bar, acting, painted, ended } = useParts();
	if (!acts && !submit && !bar) return null;
	return (
		<View className={SHEET_FOOT}>
			{acts ? <ActionBarBase acts={acts} acting={acting} /> : null}
			{submit ? (
				<ActionBarBase
					acts={[submit]}
					acting={acting}
					painted={painted}
					ended={ended}
				/>
			) : null}
			{bar ? <FormBar /> : null}
		</View>
	);
}

// The home indicator's inset is the footer's `bottomInset`: gorhom lifts the
// footer by it while the keyboard is down and drops it once the keyboard is
// up, so no gap stands between the foot and the keyboard.
function Footer(props: BottomSheetFooterProps) {
	const insets = useSafeAreaInsets();
	return (
		<BottomSheetFooter {...props} bottomInset={insets.bottom}>
			<RaisedGround>
				<Foot />
			</RaisedGround>
		</BottomSheetFooter>
	);
}

/** A submit that runs nothing: the viewer says they have taken in what the sheet shows ("I saved them"), and the press closes the sheet. */
export interface Acknowledge {
	/** The acknowledgement's words (a short phrase; truncates). */
	label: string;
	onAct?: never;
	sheet?: never;
}

/** What completes a sheet: an act, or an acknowledgement that closes it. */
export type SheetSubmit = Act | Acknowledge;

/** The act a sheet's submit runs: its own, or the sheet's close where it acknowledges (it neither runs nor opens anything). Outside the package's exports. */
export function submitAct(submit: SheetSubmit, close: () => void): Act {
	return submit.onAct === undefined && submit.sheet === undefined
		? { label: submit.label, onAct: close }
		: (submit as Act);
}

/** What every sheet draws: the public `Sheet`, the confirm, a `Menu` and the Picker's options. Outside the package's exports. */
export interface SheetBaseProps {
	open: boolean;
	onClose: () => void;
	// Hears the sheet gone, its leave played (a cell's pick ends its edit).
	onGone?: () => void;
	title: string;
	description?: string;
	back?: () => void;
	submit?: SheetSubmit;
	// What the body says when its `read` fails, in place of the generic sentence.
	fit?: SheetFit;
	// A decision's acts, the foot's `ActionBar`.
	acts?: Act[];
	// A form's bar, the foot's `ActionBar`.
	bar?: ActionBarProps;
	// A menu's rows stand under the head with no body inset or foot; a view (an
	// image's full size) is its children over the whole screen inside the safe
	// area, with no head, body or foot, so no accessible name of its own (the
	// children name themselves): the scrim and the children's own close act
	// dismiss it.
	form?: "menu" | "view";
	// Fixed under the head, over the scrolling body: the Picker's search, which
	// stands a menu full height.
	above?: ReactNode;
	// Internal: the sheet stands at the cap from its first frame, so what it
	// holds does not move it. Only a menu that searches is tall (its list must
	// not jump as the filter narrows); the rest grow with their content.
	tall?: boolean;
	// What the body holds, read once for the frame (`Sheet`'s `read`): the submit
	// paints, inert, while it waits or stands still, and stands blocked with the
	// failed sentence once it failed or is missing.
	read?: Selection<unknown>;
	// The body's sentence when the `read` is empty.
	empty?: Empty;
	// The read the form in the body holds: the form's bar, hoisted into the
	// foot, paints while it or the body's waits and stands blocked once either
	// has ended. A group's read is the group's.
	barRead?: Selection<unknown>;
	// The holder of the sheet's acts' run, when a holder above it hosts more
	// (a `Sheet` holds its form's bar too). Absent, the sheet hosts its own.
	acting?: Acting<number>;
	// The body's parts, at the card inset.
	children?: ReactNode;
	// The body's form (a `FormBody`), after the parts: its rows flush on the
	// sheet.
	fields?: ReactNode;
}

// A bottom sheet over the scrim, content-tall and growing with its content up
// to the screen under its top inset, the body scrolling past it (a menu that
// searches stands at that cap from its first frame): the head fixed at the top
// (the close act, or back on a second page, or neither for a decision, whose
// acts dismiss it, the title, the description under it), the body under it,
// and the foot (a decision's acts, the submit, a form's bar) in gorhom's
// footer, measured with the sheet and held above the keyboard. A submit that
// acknowledges closes the sheet. Native draws the phone at every width, so
// `fit` picks only the pane's title. The title names a typing control
// inside that no `FormField` labels. A new `title` or `description` is a new
// page, which has taken no input.
export function SheetBase({
	open,
	onClose,
	onGone,
	title,
	description,
	back,
	submit: offered,
	fit,
	acts,
	bar,
	form,
	above,
	tall: asked,
	acting: given,
	read,
	empty,
	barRead,
	children,
	fields,
}: SheetBaseProps) {
	const frame = useFrame(read);
	const words = useWords();
	// The submit waits only on the sheet's own read: painted while it waits or
	// stands still, blocked with the sentence once it ended.
	const { waiting, ended } = submitOf(words, frame.form);
	const submit = offered && submitAct(offered, onClose);
	const own = useAct<number>("line");
	const acting = given ?? own;
	const client = useQueryClient();
	const insets = useSafeAreaInsets();
	const { height } = useWindowDimensions();
	const ref = useRef<BottomSheetModal>(null);
	const [settled, setSettled] = useState(false);
	const [touchedValue, setTouched] = useTouchState();
	const view = form === "view";
	// A menu that searches is tall as well, so its list does not jump as the
	// filter narrows.
	const tall = (form === "menu" && above !== undefined) || asked === true;
	// A tall sheet and a view stand at the full height of the screen.
	const full = tall || view;
	usePageTurn(open, title, description, () => setTouched(false));
	// gorhom sizes the sheet to its content (the head, the body and, through
	// `enableFooterMarginAdjustment`, the footer it measures) up to this cap;
	// past it the body scrolls. Nothing here decides the height after
	// `present()`.
	const cap = height - insets.top;
	// Whether gorhom holds the sheet, from `present()` to its `onDismiss`.
	// A `dismiss()` while it holds none marks the modal dismissing for good,
	// and every later `present()` then draws nothing.
	const held = useRef(false);
	// biome-ignore lint/correctness/useExhaustiveDependencies: read again at each opening
	const timings = useMemo(
		() => ({ enter: enter(), release: released() }),
		[open],
	);
	useEffect(() => {
		if (open) {
			setSettled(false);
			held.current = true;
			ref.current?.present();
		} else if (held.current) ref.current?.dismiss(leave());
	}, [open]);
	const parts: Parts = {
		title,
		description,
		back,
		submit,
		fit,
		painted: waiting,
		ended,
		barRead,
		frame,
		acts,
		bar,
		above,
		acting,
		onClose,
		touched: touchedValue,
		client,
	};
	const [{ partsStore, Layer }] = useState(() => {
		const created = store<Parts>(parts);
		return {
			partsStore: created,
			Layer: layerOf(created),
		};
	});
	useLayoutEffect(() => partsStore.set(parts));
	// The footer is always gorhom's, so its height is measured with the sheet;
	// it draws nothing while the foot is empty. The body's end keeps the home
	// indicator's inset, gorhom adding the footer's height to it.
	const footed = form === undefined;
	const end = { paddingBottom: insets.bottom };
	let body: ReactNode = null;
	if (form === "menu") body = children;
	else if (children || fields || read !== undefined)
		body = (
			<View
				accessibilityState={{ busy: frame.holds && frame.form === "waiting" }}
				className={BODY}
			>
				<FrameBody frame={frame} fit="part" empty={empty}>
					{children ? <View className={SHEET_PARTS}>{children}</View> : null}
					{fields}
				</FrameBody>
			</View>
		);
	return (
		<BottomSheetModal
			ref={ref}
			// Every sheet reaches the screen under reduced motion through this
			// commit; the mechanism is undiagnosed.
			onChange={(index) => setSettled(index >= 0)}
			onDismiss={() => {
				held.current = false;
				onClose();
				onGone?.();
			}}
			containerComponent={Layer}
			accessible={false}
			backgroundComponent={view ? null : Ground}
			backdropComponent={Scrim}
			handleComponent={view ? null : Head}
			footerComponent={footed ? Footer : undefined}
			enablePanDownToClose={!acting.holds}
			enableDynamicSizing={!full}
			maxDynamicContentSize={cap}
			snapPoints={full ? FULL : undefined}
			animationConfigs={settled ? timings.release : timings.enter}
		>
			{view ? (
				<ViewBody
					style={{
						paddingTop: insets.top,
						paddingBottom: insets.bottom,
						paddingLeft: insets.left,
						paddingRight: insets.right,
					}}
					className={VIEW}
				>
					{children}
				</ViewBody>
			) : (
				<BottomSheetScrollView
					enableFooterMarginAdjustment={footed}
					keyboardShouldPersistTaps="handled"
					contentContainerStyle={end}
				>
					<RaisedGround>{body}</RaisedGround>
				</BottomSheetScrollView>
			)}
		</BottomSheetModal>
	);
}
