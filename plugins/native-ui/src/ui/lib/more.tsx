import type { Act, IconAct } from "@fcalell/ui-core/descriptors";
import { List } from "../components/list";
import { ListRow } from "../components/list-row";
import { Sheet } from "../components/sheet";

// What a top bar's more circle opens: the actions past the bar's circles,
// each with its glyph, then the labelled `more` acts; a blocked act shows
// its reason and does not open.
export function MoreSheet({
	title,
	open,
	onClose,
	actions,
	more,
}: {
	title: string;
	open: boolean;
	onClose: () => void;
	actions: IconAct<string>[];
	more: Act[];
}) {
	return (
		<Sheet open={open} onClose={onClose} title={title}>
			<List>
				{actions.map((action) => (
					<ListRow
						key={action.label}
						leading={{ icon: action.icon }}
						title={action.label}
						onOpen={() => {
							onClose();
							action.onAct();
						}}
					/>
				))}
				{more.map((act) => (
					<ListRow
						key={act.label}
						title={act.label}
						meta={act.blocked ? [act.blocked] : undefined}
						onOpen={
							act.blocked === undefined
								? () => {
										onClose();
										act.onAct();
									}
								: undefined
						}
					/>
				))}
			</List>
		</Sheet>
	);
}
