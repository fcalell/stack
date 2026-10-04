import type { Act, IconAct, Part } from "@fcalell/ui-core/descriptors";
import { sectionCount } from "@fcalell/ui-core/list-state";
import {
	lineBox,
	SECTION_HEAD,
	SECTION_HEAD_ROW,
	SECTION_TITLE,
	SECTION_TOGGLE,
	section,
	skeleton,
	skeletonRow,
	text,
} from "@fcalell/ui-core/variants";
import {
	type ReactNode,
	useContext,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { FormContext } from "../../lib/form";
import { ThreadRoom } from "../../lib/frame";
import { Ink } from "../../lib/ink";
import { LoadingContext } from "../../lib/loading";
import { partText } from "../../lib/parts";
import { SectionContext, type SectionHost } from "../../lib/section";
import { Button } from "../button";
import { Count } from "../count";
import { Icon } from "../icon";
import { IconButton } from "../icon-button";
import { Text } from "../text";

const BOX = "min-w-0";
const HEAD_ROW = "flex-row items-center";
// A labelled act that would squeeze the title column wraps under the title:
// the column's basis is its own width, so the row breaks once the title, its
// count and its description cannot stand beside the act.
const WRAP = "flex-wrap";
const TITLE_BLOCK = "grow min-w-0";
const TITLE_LINE = "flex-row items-center min-w-0";
const TOGGLE =
	"flex-row items-center grow min-w-0 -ms-inside active:bg-wash-press";
const ACT_SLOT = "flex-row items-center shrink-0";
// The waiting count stands at a one-figure pill's width: the pill's padding
// round an unseen figure at the pill's type.
const COUNT_WAIT = "shrink-0 flex-row items-center px-inside";
const FIGURE_WAIT = "opacity-0 tabular-nums";
// The label line at the length of a field label.
const LABEL_WAIT = "w-1/4";
// The label's bar stands in the label's line box: a strut sets the line's
// height, as the web's `h-lh` does.
const LABEL_LINE = "flex-row items-center";
const STRUT = "\u200B";
const BODY_FOLDED = "hidden";
// A loading body of fields waits as one skeleton per field it registered, or
// as three when nothing registered (content other than fields).
const FALLBACK_FIELDS = 3;

// How many field skeletons a loading body waits as: none when it holds rows.
function waitAs(rows: number, fields: number): number {
	return rows === 0 ? fields || FALLBACK_FIELDS : 0;
}

export interface SectionProps extends Closed {
	title: Part;
	// A total the body's lists do not hold; without it a List in the body
	// counts its items here.
	count?: number;
	description?: string;
	folded?: boolean;
	// Called as a foldable section opens or closes, with whether it is now
	// open.
	onToggle?: (open: boolean) => void;
	act?: Act | IconAct;
	loading?: boolean;
	children?: ReactNode;
}

// A heading with its count, description and act over its body; the title
// folds the body when `folded` is set. Inside a Form it takes the fields
// rhythm. A loading section hands its loading to a Group or a List in its
// body, which draws its own skeleton rows; any other body waits as three
// skeleton fields. A blocked act says its reason under itself once pressed
// or once its form or sheet is touched, as a `Button` does. React Native
// exposes no heading level, so the title is a header at any depth.
export function Section({
	title,
	count,
	description,
	folded,
	onToggle,
	act,
	loading,
	children,
}: SectionProps) {
	const within = useContext(FormContext) ? "form" : "page";
	const [open, setOpen] = useState(folded !== true);
	// A QueryBoundary or a List's query in the body waits through the
	// Section: it draws its rows waiting, the Section its busy head until
	// every waiter settles. A List in it reports its item count, the
	// Section's count unless it has its own.
	const [waiters, setWaiters] = useState(0);
	const [listed, setListed] = useState<ReadonlyMap<string, number | undefined>>(
		() => new Map(),
	);
	// A loading body draws its own rows when a Group or a List in it (however
	// deep) registers; with none, the body waits as fields. The body renders
	// once to learn, and the swap lands in a synchronous re-render before
	// paint, so the swap is never painted; a registration or a release while
	// loading checks again (the only List unmounting leaves fields).
	const rowBodies = useRef(0);
	const loadingNow = useRef(loading === true);
	const fieldBodies = useRef(0);
	// How many field skeletons the body waits as; none while it draws itself.
	const [fields, setFields] = useState(0);
	const parts = useMemo<SectionHost>(
		() => ({
			wait: () => {
				setWaiters((waiting) => waiting + 1);
				return () => setWaiters((waiting) => waiting - 1);
			},
			count: (id, value) => {
				setListed((counts) => new Map(counts).set(id, value));
				return () =>
					setListed((counts) => {
						const next = new Map(counts);
						next.delete(id);
						return next;
					});
			},
			rows: () => {
				const recheck = () => {
					if (loadingNow.current)
						setFields(waitAs(rowBodies.current, fieldBodies.current));
				};
				rowBodies.current += 1;
				recheck();
				return () => {
					rowBodies.current -= 1;
					recheck();
				};
			},
			field: () => {
				fieldBodies.current += 1;
				return () => {
					fieldBodies.current -= 1;
				};
			},
		}),
		[],
	);
	useLayoutEffect(() => {
		loadingNow.current = loading === true;
		setFields(
			loading === true ? waitAs(rowBodies.current, fieldBodies.current) : 0,
		);
	}, [loading]);
	const busy = loading === true || waiters > 0;
	const lists = [...listed.values()];
	const counted = count !== undefined || lists.length > 0;
	const shown = sectionCount(count, lists);
	// A count waits with the body.
	let tally: ReactNode = null;
	if (counted && busy)
		tally = (
			<View className={cn(skeleton({ kind: "count" }), COUNT_WAIT)}>
				<RNText className={cn(text({ role: "caption" }), FIGURE_WAIT)}>
					0
				</RNText>
			</View>
		);
	else if (shown !== undefined) tally = <Count value={shown} />;
	const name = (
		<>
			<RNText numberOfLines={1} className={text({ role: "heading" })}>
				{partText(title)}
			</RNText>
			{tally}
		</>
	);
	return (
		<View
			accessibilityState={{ busy }}
			className={cn(section({ in: within }), BOX)}
		>
			<View className={SECTION_HEAD}>
				<View
					className={cn(
						SECTION_HEAD_ROW,
						HEAD_ROW,
						act && !("icon" in act) && WRAP,
					)}
				>
					<View className={TITLE_BLOCK}>
						{folded === undefined ? (
							<View
								accessibilityRole="header"
								className={cn(SECTION_TITLE, TITLE_LINE)}
							>
								{name}
							</View>
						) : (
							<Pressable
								accessibilityRole="button"
								accessibilityState={{ expanded: open }}
								onPress={() => {
									setOpen(!open);
									onToggle?.(!open);
								}}
								className={cn(SECTION_TOGGLE, TOGGLE)}
							>
								{({ pressed }) => (
									<>
										{name}
										<Ink.Provider value={pressed ? "ink-body" : "ink-meta"}>
											<Icon name={open ? "ChevronDown" : "ChevronRight"} />
										</Ink.Provider>
									</>
								)}
							</Pressable>
						)}
						{description ? <Text role="meta">{description}</Text> : null}
					</View>
					{act ? (
						<View className={ACT_SLOT}>
							{"icon" in act ? (
								<IconButton
									icon={act.icon}
									fit="bar"
									label={act.label}
									onAct={act.onAct}
								/>
							) : (
								<Button
									act={act.destructive ? "destructive" : "secondary"}
									fit="bar"
									label={act.label}
									onAct={act.onAct}
									loading={act.loading}
									blocked={act.blocked}
								/>
							)}
						</View>
					) : null}
				</View>
			</View>
			{/* A section without children draws no body. */}
			{children === undefined || children === null ? null : (
				<View className={cn(section({ in: within }), !open && BODY_FOLDED)}>
					{loading && fields > 0 ? (
						Array.from({ length: fields }, (_, index) => `field-${index}`).map(
							(key) => (
								<View key={key} className={skeletonRow({ kind: "field" })}>
									<View className={LABEL_LINE}>
										<RNText className={lineBox({ role: "body" })}>
											{STRUT}
										</RNText>
										<View
											className={cn(skeleton({ kind: "line" }), LABEL_WAIT)}
										/>
									</View>
									<View className={skeleton({ kind: "field" })} />
								</View>
							),
						)
					) : (
						<LoadingContext.Provider value={loading === true}>
							<SectionContext.Provider value={parts}>
								<ThreadRoom.Provider value={false}>
									{children}
								</ThreadRoom.Provider>
							</SectionContext.Provider>
						</LoadingContext.Provider>
					)}
				</View>
			)}
		</View>
	);
}
