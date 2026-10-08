import { Group } from "@fcalell/plugin-react-ui/components/group";
import { ListRow } from "@fcalell/plugin-react-ui/components/list-row";
import { Picker } from "@fcalell/plugin-react-ui/components/picker";
import { Toolbar } from "@fcalell/plugin-react-ui/components/toolbar";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, screen, waitFor, within } from "storybook/test";
import { hover } from "./mouse.ts";
import { focused } from "./support.ts";

const ROLES = [
	{ value: "owner", label: "Owner" },
	{ value: "admin", label: "Admin" },
	{ value: "member", label: "Member" },
	{ value: "viewer", label: "Viewer" },
];

function Role() {
	const [role, setRole] = useState("member");
	return (
		<Picker label="Role" options={ROLES} value={role} onChange={setRole} />
	);
}

export default {
	title: "Behaviour/Picker",
	render: () => <Role />,
} satisfies Meta;

// The picker's list takes focus when it opens, moves by the arrow keys and
// typeahead, Enter picks, and Escape closes it and returns focus to the
// trigger.
export const Popover: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const trigger = canvas.getByRole("combobox", { name: /Role/ });
		await userEvent.click(trigger);
		const list = await screen.findByRole("listbox");
		await waitFor(() => expect(list).toContainElement(focused()));
		const options = screen.getAllByRole("option");
		await expect(options[2]).toHaveAttribute("aria-selected", "true");
		await userEvent.keyboard("{ArrowDown}");
		await waitFor(() => expect(options[3]).toHaveAttribute("data-highlighted"));
		await userEvent.keyboard("a");
		await waitFor(() => expect(options[1]).toHaveAttribute("data-highlighted"));
		await userEvent.keyboard("{Enter}");
		await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
		await expect(trigger).toHaveTextContent("Admin");
		await waitFor(() => expect(trigger).toHaveFocus());
		await userEvent.click(trigger);
		await screen.findByRole("listbox");
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
		await waitFor(() => expect(trigger).toHaveFocus());
	},
};

const OWNERS = [
	{ value: "ana", label: "Ana Ruiz" },
	{ value: "ben", label: "Ben Kaya" },
	{ value: "chen", label: "Chen Wu" },
	{ value: "dana", label: "Dana Moss" },
	{ value: "ema", label: "Ema Okafor" },
	{ value: "felix", label: "Felix Varga" },
	{ value: "gus", label: "Gus Lund" },
];

function Owner() {
	const [owner, setOwner] = useState("ana");
	return (
		<Picker label="Owner" options={OWNERS} value={owner} onChange={setOwner} />
	);
}

// A pick past six options leads its list with a search; "No matches" stands
// only while the typed search matches no option.
export const Search: StoryObj = {
	render: () => <Owner />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("combobox", { name: /Owner/ }));
		await screen.findByRole("listbox");
		await expect(screen.queryByText("No matches")).toBeNull();
		await userEvent.keyboard("zzz");
		await screen.findByText("No matches");
		await userEvent.keyboard("{Backspace}{Backspace}{Backspace}");
		await waitFor(() => expect(screen.queryByText("No matches")).toBeNull());
		await expect(screen.getAllByRole("option")).toHaveLength(OWNERS.length);
	},
};

function Trailing() {
	const [role, setRole] = useState("member");
	return (
		<Group>
			<ListRow
				leading={{ avatar: { name: "Ben Kaya" } }}
				title="Ben Kaya"
				meta={["ben@acme.app"]}
				trailing={{
					pick: {
						label: "Ben's role",
						options: ROLES,
						value: role,
						onChange: setRole,
					},
				}}
			/>
		</Group>
	);
}

// A row's trailing pick stands at the viewport's end: its list hangs from its
// start and shifts back inside the viewport.
export const RowEnd: StoryObj = {
	render: () => <Trailing />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("combobox", { name: /Ben's role/ }));
		const list = await screen.findByRole("listbox");
		await waitFor(() => {
			const rect = list.getBoundingClientRect();
			expect(rect.left).toBeGreaterThanOrEqual(0);
			expect(rect.right).toBeLessThanOrEqual(innerWidth);
		});
	},
};

// A row's trailing pick is a control: its box, and so its hover wash, its press
// and open fill and its focus ring, stands at the control radius (6 px), never
// a pill.
function rowRadius(touch: boolean): StoryObj {
	return {
		render: () => <Trailing />,
		...(touch
			? {
					tags: ["touch"],
					globals: {
						density: "touch",
						viewport: { value: "phone", isRotated: false },
					},
					parameters: {
						viewport: {
							options: {
								phone: {
									name: "Phone",
									styles: { width: "390px", height: "812px" },
									type: "mobile",
								},
							},
						},
					},
				}
			: {}),
		play: async ({ canvas, userEvent }) => {
			// On touch the pick opens a sheet, so its trigger is a button.
			const trigger = canvas.getByRole(touch ? "button" : "combobox", {
				name: /Ben's role/,
			});
			const radius = () => getComputedStyle(trigger).borderTopLeftRadius;
			await expect(radius()).toBe("6px");
			if (!touch) {
				// The focus ring is the box's own outline, which follows its radius.
				await userEvent.tab();
				await expect(trigger).toHaveFocus();
				await expect(getComputedStyle(trigger).outlineStyle).toBe("solid");
				await expect(getComputedStyle(trigger).outlineWidth).toBe("2px");
				const rest = getComputedStyle(trigger).backgroundColor;
				const box = trigger.getBoundingClientRect();
				await hover({
					x: box.left + box.width / 2,
					y: box.top + box.height / 2,
				});
				await waitFor(() =>
					expect(getComputedStyle(trigger).backgroundColor).not.toBe(rest),
				);
				await expect(radius()).toBe("6px");
			}
			await userEvent.click(trigger);
			await screen.findByRole("listbox");
			await expect(trigger).toHaveAttribute("data-popup-open");
			await expect(radius()).toBe("6px");
		},
	};
}

export const RowRadius = rowRadius(false);
export const RowRadiusTouch = rowRadius(true);

const AGENTS = [
	{ value: "writer", label: "Writer", description: "Drafts the brief" },
	{ value: "reviewer", label: "Reviewer", blocked: "Lacks brief.flag" },
	{ value: "editor", label: "Editor", blocked: "Asks for edit" },
	{ value: "planner", label: "Planner" },
];

function Agents(props: { width: number }) {
	const [agent, setAgent] = useState("writer");
	const [agents, setAgents] = useState(["editor"]);
	return (
		<div
			style={{ width: props.width, maxWidth: "100%" }}
			className="flex flex-col gap-pair"
		>
			<Picker
				fit="bar"
				label="Agent"
				options={AGENTS}
				value={agent}
				onChange={setAgent}
			/>
			<Picker
				fit="bar"
				label="Agents"
				options={AGENTS}
				value={agents}
				onChange={setAgents}
			/>
		</div>
	);
}

// A blocked option's reason replaces its description in the disabled ink, the
// arrows reach it but Enter and a press pick nothing; in a pick of several a
// blocked option in the value is a chip that removes, and once removed it is
// blocked again.
function blocks(width: number): StoryObj {
	return {
		render: () => <Agents width={width} />,
		play: async ({ canvas, userEvent }) => {
			const trigger = canvas.getByRole("combobox", { name: "Agent" });
			await userEvent.click(trigger);
			const list = await screen.findByRole("listbox");
			const options = screen.getAllByRole("option");
			const [writer, reviewer, editor, planner] = options;
			await expect(reviewer).toHaveAttribute("aria-disabled", "true");
			await expect(writer).not.toHaveAttribute("aria-disabled");
			const reason = within(list).getByText("Lacks brief.flag");
			await expect(getComputedStyle(reason).color).not.toBe(
				getComputedStyle(within(list).getByText("Drafts the brief")).color,
			);
			await expect(reviewer?.getBoundingClientRect().height).toBeCloseTo(
				writer?.getBoundingClientRect().height ?? 0,
				1,
			);
			await waitFor(() => expect(list).toContainElement(focused()));
			await userEvent.keyboard("{ArrowDown}");
			await waitFor(() => expect(reviewer).toHaveAttribute("data-highlighted"));
			await userEvent.keyboard("{Enter}");
			await expect(screen.getByRole("listbox")).toBeInTheDocument();
			await expect(trigger).toHaveTextContent("Writer");
			await userEvent.keyboard("{ArrowDown}{ArrowDown}");
			await waitFor(() => expect(planner).toHaveAttribute("data-highlighted"));
			await userEvent.keyboard("{Enter}");
			await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
			await expect(trigger).toHaveTextContent("Planner");
			await userEvent.click(trigger);
			await screen.findByRole("listbox");
			await userEvent.click(editor as HTMLElement);
			await userEvent.click(reviewer as HTMLElement);
			await expect(screen.getByRole("listbox")).toBeInTheDocument();
			await expect(trigger).toHaveTextContent("Planner");
			await userEvent.keyboard("{Escape}");
			await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
			const remove = canvas.getByRole("button", { name: "Remove Editor" });
			await userEvent.click(remove);
			await waitFor(() =>
				expect(
					canvas.queryByRole("button", { name: "Remove Editor" }),
				).toBeNull(),
			);
			await userEvent.click(canvas.getByRole("combobox", { name: "Agents" }));
			const several = await screen.findByRole("listbox");
			await within(several).findByText("Asks for edit");
		},
	};
}

export const Blocked320 = blocks(320);
export const Blocked1440 = blocks(1440);

// The touch sheet's rows are buttons: a blocked row is aria-disabled, shows
// its reason in its own ink at the described row's height and picks nothing;
// the sheet opens on the chosen row. A blocked option in a pick of several's
// value is an enabled row with no reason, and once unticked it is blocked again.
export const BlockedSheet: StoryObj = {
	render: () => <Agents width={320} />,
	tags: ["touch"],
	globals: {
		density: "touch",
		viewport: { value: "narrow", isRotated: false },
	},
	parameters: {
		viewport: {
			options: {
				narrow: {
					name: "Narrow",
					styles: { width: "320px", height: "700px" },
					type: "mobile",
				},
			},
		},
	},
	play: async ({ canvas, userEvent }) => {
		const trigger = canvas.getByRole("button", { name: "Agent" });
		await userEvent.click(trigger);
		const list = await screen.findByRole("listbox", { name: "Agent" });
		const [writer, reviewer, editor, planner] =
			within(list).getAllByRole("option");
		await expect(reviewer).toHaveAttribute("aria-disabled", "true");
		await expect(editor).toHaveAttribute("aria-disabled", "true");
		await expect(writer).not.toHaveAttribute("aria-disabled");
		await expect(planner).not.toHaveAttribute("aria-disabled");
		const reason = within(list).getByText("Lacks brief.flag");
		await expect(getComputedStyle(reason).color).not.toBe(
			getComputedStyle(within(list).getByText("Drafts the brief")).color,
		);
		await expect(reviewer?.getBoundingClientRect().height).toBeCloseTo(
			writer?.getBoundingClientRect().height ?? 0,
			1,
		);
		await waitFor(() => expect(focused()).toBe(writer));
		await userEvent.click(reviewer as HTMLElement);
		await expect(screen.getByRole("listbox")).toBeInTheDocument();
		await expect(trigger).toHaveTextContent("Writer");
		await userEvent.click(planner as HTMLElement);
		await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
		await expect(trigger).toHaveTextContent("Planner");

		await userEvent.click(canvas.getByRole("button", { name: "Agents" }));
		const several = await screen.findByRole("listbox", { name: "Agents" });
		const [, , chosen] = within(several).getAllByRole("option");
		await expect(chosen).toHaveAttribute("aria-selected", "true");
		await expect(chosen).not.toHaveAttribute("aria-disabled");
		await expect(within(several).queryByText("Asks for edit")).toBeNull();
		await userEvent.click(chosen as HTMLElement);
		await waitFor(() =>
			expect(chosen).toHaveAttribute("aria-disabled", "true"),
		);
		await within(several).findByText("Asks for edit");
		await userEvent.click(chosen as HTMLElement);
		await expect(chosen).toHaveAttribute("aria-selected", "false");
	},
};

function Pair() {
	const [repo, setRepo] = useState("web");
	const [lead, setLead] = useState("ana");
	return (
		<Toolbar>
			<Picker
				label="Repo"
				options={[
					{ value: "web", label: "web" },
					{ value: "api", label: "api" },
				]}
				value={repo}
				onChange={setRepo}
			/>
			<Picker label="Lead" options={OWNERS} value={lead} onChange={setLead} />
		</Toolbar>
	);
}

// A pick in a toolbar's start hangs its list from its own start edge: the
// first and the one after it, a short list and a searching one.
export const Start: StoryObj = {
	render: () => <Pair />,
	play: async ({ canvas, userEvent }) => {
		// The two triggers stand on one line with room beside them.
		const [repo, lead] = [/Repo/, /Lead/].map((name) =>
			canvas.getByRole("combobox", { name }),
		);
		expect(
			Math.abs(
				(repo?.getBoundingClientRect().top ?? 0) -
					(lead?.getBoundingClientRect().top ?? 1),
			),
		).toBeLessThan(2);
		for (const name of [/Repo/, /Lead/]) {
			const trigger = canvas.getByRole("combobox", { name });
			await userEvent.click(trigger);
			const list = await screen.findByRole("listbox");
			const popup = list.closest("[data-side]") ?? list;
			await waitFor(() =>
				expect(
					Math.abs(
						popup.getBoundingClientRect().left -
							trigger.getBoundingClientRect().left,
					),
				).toBeLessThan(2),
			);
			await userEvent.keyboard("{Escape}");
			await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
		}
	},
};
