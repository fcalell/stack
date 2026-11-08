import { useEffect, useRef } from "react";
import { Button } from "../../components/button/index.tsx";

import { Picker } from "../../components/picker/index.tsx";
import { Toolbar } from "../../components/toolbar/index.tsx";

const change = () => {};
const REGIONS = [
	{ value: "fra", label: "Frankfurt" },
	{ value: "iad", label: "Virginia" },
];
const OWNERS = [
	{ value: "ana", label: "Ana Ruiz" },
	{ value: "ben", label: "Ben Kaya" },
];
const KINDS = [
	{ value: null, label: "All kinds" },
	{ value: "page", label: "Page" },
	{ value: "action", label: "Action" },
];
const PROJECTS = [
	{ value: "shop", label: "Shop" },
	{ value: "docs", label: "Docs" },
	{ value: "app", label: "App" },
];
const SCOPES = [
	{ value: "all", label: "Every project in the workspace" },
	{
		value: "long",
		label: "Billing, onboarding and notification copy for the Frankfurt launch",
	},
];

// The search, Filter with its count, Sort and Display, and two applied
// filters as removable neutral chips; then two Pickers at the strip's start,
// each hanging its list from its own start edge, given as `filters`; then four
// filters folded behind one Filters act with the count of those set, each set
// one a removable chip before the rest; then, in a column narrower
// than its long picked value, a Picker alone on its line,
// truncating its value before the chevron. The frame judges one edge: a search
// and folded filters stand on one row at 320, so it logs an error where the
// acts fall under the search while the row holds the search's short measure and
// the acts beside it.
//
// The strip (a div with a ref): its first line is the row, the search its first
// box and the acts group the box after it.
function Folded() {
	const host = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const root = host.current;
		if (!root) return;
		const check = () => {
			const row = root.firstElementChild?.firstElementChild;
			const box = row?.firstElementChild;
			const acts = box?.nextElementSibling;
			if (!row || !box || !acts) return;
			const probe = document.createElement("div");
			probe.style.cssText =
				"position:absolute;visibility:hidden;width:var(--container-measure-short)";
			box.append(probe);
			const short = probe.getBoundingClientRect().width;
			probe.remove();
			const style = getComputedStyle(row);
			const room =
				row.clientWidth -
				Number.parseFloat(style.paddingLeft) -
				Number.parseFloat(style.paddingRight);
			const gap = Number.parseFloat(style.columnGap) || 0;
			const under =
				acts.getBoundingClientRect().top >=
				box.getBoundingClientRect().bottom - 1;
			if (under && room >= short + gap + acts.getBoundingClientRect().width + 1)
				console.error("Toolbar: the acts fall under the search");
		};
		check();
		const watch = new ResizeObserver(check);
		watch.observe(root);
		return () => watch.disconnect();
	}, []);
	return (
		<div ref={host}>
			<Toolbar
				search={{ value: "", onChange: change, placeholder: "Search" }}
				filters={[
					{ label: "Region", options: REGIONS, value: "fra", onChange: change },
					{ label: "Owner", options: OWNERS, onChange: change },
					{ label: "Kind", options: KINDS, value: null, onChange: change },
					{
						label: "Projects",
						options: PROJECTS,
						several: true,
						value: ["shop", "docs", "app"],
						onChange: change,
					},
				]}
			/>
		</div>
	);
}

export function drawToolbar() {
	return (
		<div className="flex flex-col gap-section">
			<Toolbar
				search={{ value: "deploy", onChange: change }}
				chips={[
					{ family: "neutral", label: "Region: Frankfurt", onRemove: change },
					{ family: "neutral", label: "Owner: Ana Ruiz", onRemove: change },
				]}
			>
				<Button
					act="secondary"
					icon="ListFilter"
					label="Filter"
					count={2}
					onAct={change}
				/>
				<Button
					act="secondary"
					icon="ArrowUpDown"
					label="Sort"
					onAct={change}
				/>
				<Button glyph icon="SlidersHorizontal" label="Display" onAct={change} />
			</Toolbar>
			<Toolbar
				filters={[
					{ label: "Region", options: REGIONS, value: "fra", onChange: change },
					{ label: "Owner", options: OWNERS, value: "ana", onChange: change },
				]}
			/>
			<Folded />
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
