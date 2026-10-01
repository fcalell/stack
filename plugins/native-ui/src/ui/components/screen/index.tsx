import type { IconAct, MenuItem } from "@fcalell/ui-core/descriptors";
import {
	PAGE_BODY,
	PAGE_HEAD,
	PAGE_TOP_BAR,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useContext, useEffect, useState } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { CoverTabs, LendAct, PageTitle } from "../../lib/frame";
import { Scroll } from "../../lib/hosts";
import { MenuCircle } from "../../lib/more";
import { navigate } from "../../lib/navigate";
import { useWords } from "../../lib/words";
import { IconButton } from "../icon-button";

const SCREEN = "flex-1";
const TOP_BAR = "relative flex-row items-center";
const SPACER = "flex-1";
const TITLE = "min-w-0 grow";
const BODY = "flex-1";

export interface ScreenProps extends Closed {
	title: string;
	back?: string;
	actions?: IconAct[];
	more?: MenuItem[];
	children?: ReactNode;
}

// A page pushed over a place: the top bar (back, the actions, more) over the
// title, the body scrolling under it, no filled act; it covers the Shell's
// tab bar while it stands. A Split inside lends it its Details act.
export function Screen({ title, back, actions, more, children }: ScreenProps) {
	const words = useWords();
	const cover = useContext(CoverTabs);
	const [lent, lend] = useState<IconAct>();
	useEffect(() => {
		if (!cover) return;
		cover(true);
		return () => cover(false);
	}, [cover]);
	return (
		<LendAct.Provider value={lend}>
			<PageTitle.Provider value={title}>
				<View className={SCREEN}>
					<View className={PAGE_HEAD}>
						<View className={cn(PAGE_TOP_BAR, TOP_BAR)}>
							{back === undefined ? null : (
								<IconButton
									icon="ChevronLeft"
									fit="body"
									label={words.back}
									onAct={() => navigate(back)}
								/>
							)}
							<View className={SPACER} />
							{[...(actions ?? []), ...(lent ? [lent] : [])].map((action) => (
								<IconButton key={action.label} {...action} fit="body" />
							))}
							{more?.length ? (
								<MenuCircle
									label={words.more}
									title={title}
									items={more}
									fit="body"
								/>
							) : null}
						</View>
						<RNText
							accessibilityRole="header"
							className={cn(text({ role: "title" }), TITLE)}
						>
							{title}
						</RNText>
					</View>
					<Scroll className={BODY} contentContainerClassName={PAGE_BODY}>
						{children}
					</Scroll>
				</View>
			</PageTitle.Provider>
		</LendAct.Provider>
	);
}
