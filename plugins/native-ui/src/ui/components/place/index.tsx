import type { Act, IconAct } from "@fcalell/ui-core/descriptors";
import { text } from "@fcalell/ui-core/variants";
import { Ellipsis } from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { Text as RNText, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Circle } from "../../lib/circle";
import type { Closed } from "../../lib/closed";
import { Scroll } from "../../lib/hosts";
import { useWords } from "../../lib/words";
import { Button } from "../button";
import { IconButton } from "../icon-button";
import { List } from "../list";
import { ListRow } from "../list-row";
import { Sheet } from "../sheet";

export interface PlaceProps extends Closed {
	title: string;
	actions?: IconAct<string>[];
	act?: Act;
	children?: ReactNode;
}

// At most two circles in the top bar; the rest open under a more circle.
const BAR_ACTIONS = 2;

// A place in the shell: the large title in the body, the side inset, the
// scroll, and the primary act as a pill floating above the tab bar.
export function Place({ title, actions, act, children }: PlaceProps) {
	const insets = useSafeAreaInsets();
	const words = useWords();
	const [more, setMore] = useState(false);
	const all = actions ?? [];
	const shown = all.length > BAR_ACTIONS ? all.slice(0, BAR_ACTIONS - 1) : all;
	const rest = all.slice(shown.length);
	return (
		<View className="flex-1 bg-canvas">
			<Scroll
				className="flex-1"
				contentContainerClassName="gap-section px-inset pb-room"
				contentContainerStyle={{ paddingTop: insets.top }}
			>
				<View className="min-h-11 flex-row items-center justify-end gap-row">
					{shown.map((action) => (
						<IconButton key={action.label} {...action} />
					))}
					{rest.length > 0 ? (
						<Circle
							icon={Ellipsis}
							label={words.more}
							onAct={() => setMore(true)}
						/>
					) : null}
				</View>
				<RNText className={text({ role: "title" })}>{title}</RNText>
				{children}
			</Scroll>
			{act ? (
				<View className="absolute right-0 bottom-0 p-inset shadow-float">
					<Button act="primary" {...act} />
				</View>
			) : null}
			{rest.length > 0 ? (
				<Sheet open={more} onClose={() => setMore(false)} title={title}>
					<List>
						{rest.map((action) => (
							<ListRow
								key={action.label}
								leading={{ icon: action.icon }}
								title={action.label}
								onOpen={() => {
									setMore(false);
									action.onAct();
								}}
							/>
						))}
					</List>
				</Sheet>
			) : null}
		</View>
	);
}
