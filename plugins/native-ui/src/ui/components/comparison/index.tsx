import type { ComparisonRow } from "@fcalell/ui-core/descriptors";
import { COUNT, text } from "@fcalell/ui-core/variants";
import { useState } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { LoadingRows } from "../../lib/loading";
import { DefinitionRow } from "../definition-row";
import { Group } from "../group";
import { SegmentedControl } from "../segmented-control";

export interface ComparisonProps extends Closed {
	rows: readonly ComparisonRow[];
	loading?: boolean;
}

// Two or three cells per row. The phone stacks the cells under a segmented
// control of the cell labels; the desktop sets them side by side.
export function Comparison({ rows, loading }: ComparisonProps) {
	const labels = rows[0]?.cells.map((cell) => cell.label) ?? [];
	const [which, setWhich] = useState(labels[labels.length - 1] ?? "");
	if (loading) return <LoadingRows />;
	const index = Math.max(0, labels.indexOf(which));
	return (
		<View className="gap-stack">
			{labels.length > 1 ? (
				<SegmentedControl
					options={labels.map((label) => ({ value: label, label }))}
					value={labels[index] ?? ""}
					onChange={setWhich}
				/>
			) : null}
			<Group>
				{rows.map((row) => (
					<DefinitionRow
						key={row.label}
						label={row.label}
						value={
							<View className="shrink items-end gap-pair">
								<RNText className={cn(text({ role: "meta" }), "text-right")}>
									{row.cells[index]?.value ?? ""}
								</RNText>
								{row.chips && row.chips.length > 0 ? (
									<View className="flex-row flex-wrap justify-end gap-pair">
										{row.chips.map((chip) => (
											<RNText key={chip.label} className={COUNT}>
												{chip.label}
											</RNText>
										))}
									</View>
								) : null}
							</View>
						}
					/>
				))}
			</Group>
		</View>
	);
}
