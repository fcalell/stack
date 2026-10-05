import type { Act } from "@fcalell/ui-core/descriptors";
import {
	SHEET_DOCKED_BODY,
	SHEET_DOCKED_FOOT,
	SHEET_DOCKED_HEAD,
	SHEET_HEAD_ROW,
	text,
} from "@fcalell/ui-core/variants";
import {
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Text as RNText, type TextInput, View } from "react-native";
import { cn } from "../../lib/cn";
import { FieldClaim, FieldNameContext } from "../../lib/field";
import { FormStands } from "../../lib/form";
import { FootPlace, FootReturn } from "../../lib/frame";
import { Scroll } from "../../lib/hosts";
import { TouchedContext, usePageTurn } from "../../lib/touched";
import { useWords } from "../../lib/words";
import { ActionBar } from "../action-bar";
import { IconButton } from "../icon-button";

// The sheet fills its foot, which bounds it: the head and the foot keep their
// height and the body scrolls in what is left. The foot centres what it holds,
// so the sheet spans it.
const ROOT = "w-full min-h-0 shrink";
const HEAD = "shrink-0";
const HEAD_ROW = "flex-row items-center";
const TITLE_SLOT = "flex-1 flex-row items-center min-w-0";
const TITLE = "shrink";
const BODY = "shrink";
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
	children?: ReactNode;
}

// A `Sheet` standing in a Thread's or a Place's foot: no scrim or modal, the
// foot's raised cell its surface. The head holds the back act, the title over
// the description and the close act; the body scrolls between the head and
// the foot, which hold their height; the foot holds the line over the submit.
// The first field of each page takes focus as it mounts, and leaving sets the
// foot's claim for the input that returns. Closed it draws nothing.
export function SheetDocked({
	open,
	onClose,
	title,
	description,
	back,
	submit,
	foot,
	children,
}: SheetDockedProps) {
	const words = useWords();
	const claim = useContext(FootReturn);
	const held = useRef<TextInput>(null);
	const [touched, setTouched] = useState(false);
	const touch = useCallback(() => setTouched(true), []);
	const touchedValue = useMemo(() => ({ touched, touch }), [touched, touch]);
	usePageTurn(open, title, description, () => setTouched(false));
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
							<View className={cn(SHEET_DOCKED_HEAD, HEAD)}>
								<View className={cn(SHEET_HEAD_ROW, HEAD_ROW)}>
									{back ? (
										<IconButton
											icon="ChevronLeft"
											fit="body"
											label={words.back}
											onAct={back}
										/>
									) : null}
									<View accessibilityRole="header" className={TITLE_SLOT}>
										<RNText
											numberOfLines={1}
											className={cn(text({ role: "heading" }), TITLE)}
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
							<Scroll
								className={BODY}
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
									{submit ? <ActionBar acts={[submit]} /> : null}
								</View>
							) : null}
						</View>
					</FieldClaim.Provider>
				</FootPlace.Provider>
			</FieldNameContext.Provider>
		</TouchedContext.Provider>
	);
}
