import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Table } from "@fcalell/plugin-react-ui/components/table";
import type { TableColumn } from "@fcalell/ui-core/descriptors";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, screen } from "storybook/test";
import { holdClock } from "./clock.ts";
import { focused } from "./support.ts";

// A cell edit starts, cancels and ends by event, not by frame. The parent's
// commit lands 100 ms after it is called, on a test clock: nothing is waited
// for in real time and no CPU is throttled.
interface Member {
	id: string;
	name: string;
	note: string;
	role: string | null;
}

const ROLES = [
	{ value: "owner", label: "Owner" },
	{ value: "member", label: "Member" },
	{ value: "viewer", label: "Viewer" },
];

const COLUMNS: TableColumn<Member>[] = [
	{ key: "name", label: "Name", cell: (member) => member.name },
	{
		key: "note",
		label: "Note",
		edit: { control: "input" },
		cell: (member) => member.note,
	},
	{
		key: "role",
		label: "Role",
		edit: { control: "picker", options: ROLES },
		cell: (member) => member.role,
	},
];

const commits: [string, string, unknown][] = [];

function Members() {
	const [members, setMembers] = useState<Member[]>([
		{ id: "ada", name: "Ada", note: "Founder", role: "owner" },
		{ id: "bo", name: "Bo", note: "Billing", role: "member" },
	]);
	return (
		<Place title="Members">
			<Table
				columns={COLUMNS}
				items={members}
				row={{ id: (member) => member.id }}
				onEdit={(id, key, value) => {
					commits.push([id, key, value]);
					setTimeout(
						() =>
							setMembers((all) =>
								all.map((member) =>
									member.id === id ? { ...member, [key]: value } : member,
								),
							),
						100,
					);
				}}
			/>
		</Place>
	);
}

export default {
	title: "Behaviour/Table edit",
	parameters: { layout: "fullscreen" },
	render: () => <Members />,
} satisfies Meta;

const cellAt = (row: number, column: number) => {
	const cell = document.querySelector<HTMLElement>(
		`td[data-row="${row}"][data-column="${column}"]`,
	);
	if (!cell) throw new Error(`no cell at ${row}, ${column}`);
	return cell;
};

// Escape puts the value back and calls no commit, whatever the parent's
// speed: the field leaving for its cell commits nothing, and the cell holds
// focus at once.
export const EscapeCommitsNothing: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		commits.length = 0;
		cellAt(0, 1).focus();
		await userEvent.keyboard("{Enter}");
		const input = await canvas.findByRole("textbox", { name: "Note" });
		await expect(input).toHaveFocus();
		await userEvent.keyboard(" and CEO");
		await expect(input).toHaveValue("Founder and CEO");
		const clock = holdClock();
		try {
			await userEvent.keyboard("{Escape}");
			// In the same turn: the cell holds focus, the edit is over.
			await expect(focused()).toBe(cellAt(0, 1));
			await expect(canvas.queryByRole("textbox")).toBeNull();
			await clock.advance(1000);
			await expect(commits).toHaveLength(0);
			await expect(cellAt(0, 1)).toHaveTextContent("Founder");
			await expect(cellAt(0, 1)).not.toHaveTextContent("CEO");
			await expect(focused()).toBe(cellAt(0, 1));
		} finally {
			clock.stop();
		}
	},
};

// The same edit with Enter commits once, and the parent's value lands 100 ms
// later: the harness sees a commit when there is one.
export const EnterCommitsOnce: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		commits.length = 0;
		cellAt(0, 1).focus();
		await userEvent.keyboard("{Enter}");
		await canvas.findByRole("textbox", { name: "Note" });
		await userEvent.keyboard(" and CEO");
		const clock = holdClock();
		try {
			await userEvent.keyboard("{Enter}");
			await expect(focused()).toBe(cellAt(0, 1));
			await clock.advance(1000);
			await expect(commits).toEqual([["ada", "note", "Founder and CEO"]]);
			await expect(cellAt(0, 1)).toHaveTextContent("Founder and CEO");
		} finally {
			clock.stop();
		}
	},
};

// A role cell's list is open in the edit's first rendered state: the pick
// that mounts for the edit is open as it mounts, never drawn closed first.
export const PickMountsOpen: StoryObj = {
	play: async ({ userEvent }) => {
		cellAt(0, 2).focus();
		const firsts: (string | null)[] = [];
		const seen = new Set<Element>();
		const watch = new MutationObserver(() => {
			for (const trigger of document.querySelectorAll(
				'td[data-column="2"] [role="combobox"]',
			)) {
				if (seen.has(trigger)) continue;
				seen.add(trigger);
				firsts.push(trigger.getAttribute("aria-expanded"));
			}
		});
		watch.observe(document.body, {
			subtree: true,
			childList: true,
			attributes: true,
		});
		try {
			await userEvent.keyboard("{Enter}");
			const list = await screen.findByRole("listbox");
			await expect(list).toBeVisible();
			await expect(firsts).toEqual(["true"]);
		} finally {
			watch.disconnect();
		}
		await userEvent.keyboard("{Escape}");
	},
};
