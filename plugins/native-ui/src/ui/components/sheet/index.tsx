import { SHEET, text } from "@fcalell/ui-core/variants";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { ChevronLeft, X } from "lucide-react-native";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Circle } from "../../lib/circle";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { TouchedContext } from "../../lib/touched";
import { useWords } from "../../lib/words";

export interface SheetSubmit {
	label: string;
	blocked?: string;
	onAct: () => void;
	loading?: boolean;
}

interface SheetBase extends Closed {
	open: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	back?: () => void;
	foot?: ReactNode;
	children?: ReactNode;
}

// `submit` (top right, where a keyboard would cover a bar) and an ActionBar
// child exclude each other: a sheet with text entry submits from its top bar,
// a decision sheet takes the bar. The union names the two shapes; which
// children a sheet holds is the consumer's side of it.
export type SheetProps =
	| (SheetBase & { submit: SheetSubmit })
	| (SheetBase & { submit?: never });

// A TextArea inside asks the sheet for the full height.
const GrowContext = createContext<(() => void) | undefined>(undefined);

export function useSheetGrow(): (() => void) | undefined {
	return useContext(GrowContext);
}

const FULL = ["100%"];
const TRANSPARENT = { backgroundColor: "transparent" } as const;

// Content-tall, full height when it holds a TextArea, the sheet corners; a
// close circle left, the title, submit right, the foot under the children.
export function Sheet({
	open,
	onClose,
	title,
	description,
	back,
	foot,
	children,
	...rest
}: SheetProps) {
	const words = useWords();
	const insets = useSafeAreaInsets();
	const ref = useRef<BottomSheetModal>(null);
	const [tall, setTall] = useState(false);
	const [touched, setTouched] = useState(false);
	const grow = useCallback(() => setTall(true), []);
	const touch = useCallback(() => setTouched(true), []);
	const submit = "submit" in rest ? rest.submit : undefined;
	useEffect(() => {
		if (open) ref.current?.present();
		else {
			ref.current?.dismiss();
			setTouched(false);
		}
	}, [open]);
	const snapPoints = useMemo(() => (tall ? FULL : undefined), [tall]);
	return (
		<BottomSheetModal
			ref={ref}
			onDismiss={onClose}
			backgroundStyle={TRANSPARENT}
			handleComponent={null}
			enableDynamicSizing={!tall}
			snapPoints={snapPoints}
		>
			<BottomSheetView>
				<GrowContext.Provider value={grow}>
					<TouchedContext.Provider value={{ touched, touch }}>
						<View
							style={{ paddingBottom: insets.bottom + 8 }}
							className={cn(SHEET, "gap-stack px-inset pt-stack shadow-sheet")}
						>
							<View className="min-h-11 flex-row items-center gap-row">
								{back ? (
									<Circle icon={ChevronLeft} label={words.back} onAct={back} />
								) : (
									<Circle icon={X} label={words.close} onAct={onClose} />
								)}
								<RNText
									numberOfLines={1}
									className={cn(text({ role: "heading" }), "flex-1")}
								>
									{title}
								</RNText>
								{submit ? (
									<SubmitAct submit={submit} touched={touched} />
								) : null}
							</View>
							{description ? (
								<RNText className={text({ role: "meta" })}>
									{description}
								</RNText>
							) : null}
							{children}
							{foot}
						</View>
					</TouchedContext.Provider>
				</GrowContext.Provider>
			</BottomSheetView>
		</BottomSheetModal>
	);
}

// A blocked submit says its reason under it once pressed or once a field in
// the sheet has taken input.
function SubmitAct({
	submit,
	touched,
}: {
	submit: SheetSubmit;
	touched: boolean;
}) {
	const blocked = submit.blocked !== undefined;
	const muted = blocked || submit.loading;
	const [pressed, setPressed] = useState(false);
	useEffect(() => {
		if (!blocked) setPressed(false);
	}, [blocked]);
	const said = blocked && (pressed || touched);
	return (
		<View className="items-end gap-pair">
			<Pressable
				accessibilityRole="button"
				accessibilityState={{ disabled: muted }}
				accessibilityHint={said ? submit.blocked : undefined}
				disabled={submit.loading}
				onPress={() => (blocked ? setPressed(true) : submit.onAct())}
				className="min-h-11 justify-center"
			>
				<RNText
					className={cn(
						text({ role: "body" }),
						"font-medium text-tint",
						muted && "text-ink-faint",
					)}
				>
					{submit.label}
				</RNText>
			</Pressable>
			{said ? (
				<RNText className={text({ role: "meta" })}>{submit.blocked}</RNText>
			) : null}
		</View>
	);
}
