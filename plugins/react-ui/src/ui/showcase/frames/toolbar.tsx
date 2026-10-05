import { Button } from "../../components/button/index.tsx";
import { Chip } from "../../components/chip/index.tsx";
import { IconButton } from "../../components/icon-button/index.tsx";
import { Input } from "../../components/input/index.tsx";
import { Picker } from "../../components/picker/index.tsx";
import { Toolbar } from "../../components/toolbar/index.tsx";

const change = () => {};
const SCOPES = [
	{ value: "all", label: "Every project in the workspace" },
	{
		value: "long",
		label: "Billing, onboarding and notification copy for the Frankfurt launch",
	},
];

// The search, Filter with its count, Sort and Display, and two applied
// filters as removable neutral chips; then, in a column narrower than its
// long picked value, a field-fit Picker alone on its line, truncating its
// value before the chevron.
export function drawToolbar() {
	return (
		<div className="flex flex-col gap-sections">
			<Toolbar>
				<Input kind="search" value="deploy" onChange={change} />
				<Button
					act="secondary"
					fit="bar"
					icon="ListFilter"
					label="Filter"
					count={2}
					onAct={change}
				/>
				<Button
					act="secondary"
					fit="bar"
					icon="ArrowUpDown"
					label="Sort"
					onAct={change}
				/>
				<IconButton
					icon="SlidersHorizontal"
					fit="bar"
					label="Display"
					onAct={change}
				/>
				<Chip family="neutral" label="Region: Frankfurt" onRemove={change} />
				<Chip family="neutral" label="Owner: Ana Ruiz" onRemove={change} />
			</Toolbar>
			<div className="flex w-popover max-w-full flex-col">
				<Toolbar>
					<Picker
						label="Scope"
						options={SCOPES}
						value="long"
						onChange={change}
					/>
				</Toolbar>
			</div>
		</div>
	);
}
