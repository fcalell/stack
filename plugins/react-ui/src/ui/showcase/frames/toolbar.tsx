import { Button } from "../../components/button/index.tsx";
import { Chip } from "../../components/chip/index.tsx";
import { IconButton } from "../../components/icon-button/index.tsx";
import { Input } from "../../components/input/index.tsx";
import { Toolbar } from "../../components/toolbar/index.tsx";

const change = () => {};

// The search, Filter with its count, Sort and Display, and two applied
// filters as removable neutral chips.
export function drawToolbar() {
	return (
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
	);
}
