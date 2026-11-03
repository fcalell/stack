import { Menu } from "@base-ui/react/menu";
import { cn } from "@fcalell/ui-core/cn";
import type { TableColumn } from "@fcalell/ui-core/descriptors";
import { type ColumnChoice, columnShown } from "@fcalell/ui-core/list-state";
import {
	LAYER_POPOVER,
	menu,
	menuGroup,
	menuLabel,
	OPTION_ROW,
	POPOVER,
	row,
	text,
} from "@fcalell/ui-core/variants";
import { use } from "react";
import { useQuietGuards } from "../../lib/guards.ts";
import { spacing } from "../../lib/media.ts";
import { PortalContainer } from "../../lib/portal.ts";
import { useWords } from "../../lib/words.tsx";
import { IconButtonBase } from "../button/glyph.tsx";
import { Icon } from "../icon/index.tsx";

const POPUP = "flex flex-col max-h-(--available-height) overflow-y-auto";
const POSITIONER = "z-(--layer-popover)";
const GROUP = "flex flex-col";
const ITEM = "flex items-center focus-visible:-outline-offset-2";
const PRESS = "active:bg-wash-press";
const LABEL = "min-w-0 grow truncate";
const MARK = "flex shrink-0 text-ink-body";

/** The menu that shows and hides a table's columns: a check row per column after the leading one (the row's name, always shown), the list staying open as the viewer ticks. Outside the package's exports. */
export function ColumnsMenu(props: {
	columns: readonly TableColumn[];
	choice: ColumnChoice;
	onToggle: (key: string, on: boolean) => void;
}) {
	const words = useWords();
	const container = use(PortalContainer);
	useQuietGuards();
	return (
		<Menu.Root modal={false}>
			<Menu.Trigger
				render={<IconButtonBase icon="Columns3" label={words.columns} />}
			/>
			<Menu.Portal container={container}>
				<Menu.Positioner
					className={POSITIONER}
					align="end"
					sideOffset={() => spacing("gap")}
				>
					<Menu.Popup
						aria-label={words.columns}
						className={cn(
							POPOVER,
							menu({ form: "popover" }),
							POPUP,
							LAYER_POPOVER,
						)}
					>
						<div className={cn(menuGroup({ place: "first" }), GROUP)}>
							{props.columns.slice(1).map((column, place) => (
								<Menu.CheckboxItem
									key={column.key}
									label={column.label}
									checked={columnShown(column, place + 1, props.choice)}
									onCheckedChange={(on) => props.onToggle(column.key, on)}
									className={(state) =>
										cn(
											row({
												state: state.highlighted ? "highlighted" : "rest",
											}),
											OPTION_ROW,
											ITEM,
											PRESS,
										)
									}
								>
									<span
										className={cn(
											text({ role: "body" }),
											menuLabel({ kind: "act" }),
											LABEL,
										)}
									>
										{column.label}
									</span>
									<Menu.CheckboxItemIndicator className={MARK}>
										<Icon name="Check" />
									</Menu.CheckboxItemIndicator>
								</Menu.CheckboxItem>
							))}
						</div>
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}
