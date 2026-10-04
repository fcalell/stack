import type {
	CellValue,
	Option,
	TableColumn,
} from "@fcalell/ui-core/descriptors";
import { useState } from "react";
import { EmptyState } from "../../components/empty-state/index.tsx";
import { Form } from "../../components/form/index.tsx";
import { FormField } from "../../components/form-field/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { Input } from "../../components/input/index.tsx";
import { ListRow } from "../../components/list-row/index.tsx";
import { OptionList } from "../../components/option-list/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { Select } from "../../components/select/index.tsx";
import { Sheet } from "../../components/sheet/index.tsx";
import { Switch } from "../../components/switch/index.tsx";
import { Table } from "../../components/table/index.tsx";
import { confirm } from "../../lib/confirm.ts";
import { toast } from "../../lib/toast.ts";
import { settle, useFixture } from "./here.ts";

const ROLES = [
	{
		value: "admin",
		label: "Admin",
		description: "Manages members and settings",
	},
	{
		value: "member",
		label: "Member",
		description: "Creates and edits projects",
	},
	{ value: "viewer", label: "Viewer", description: "Reads and comments" },
] as const;
type Role = (typeof ROLES)[number]["value"];

interface Member {
	id: string;
	name: string;
	email: string;
	role: Role | "owner";
	team: string;
	deploys: boolean;
	active: string;
}

const ago = (minutes: number) =>
	new Date(Date.now() - minutes * 60_000).toISOString();

const MEMBERS: Member[] = [
	{
		id: "ana",
		name: "Ana Ruiz",
		email: "ana@acme.dev",
		role: "owner",
		team: "Platform",
		deploys: true,
		active: ago(2),
	},
	{
		id: "ben",
		name: "Ben Kaya",
		email: "ben@acme.dev",
		role: "admin",
		team: "Web",
		deploys: true,
		active: ago(18),
	},
	{
		id: "ema",
		name: "Ema Okafor",
		email: "ema@acme.dev",
		role: "member",
		team: "Platform",
		deploys: true,
		active: ago(60),
	},
	{
		id: "chen",
		name: "Chen Wu",
		email: "chen@acme.dev",
		role: "viewer",
		team: "Design",
		deploys: false,
		active: ago(60 * 26),
	},
	{
		id: "dara",
		name: "Dara Novak",
		email: "dara.novak@acme.dev",
		role: "member",
		team: "",
		deploys: false,
		active: ago(60 * 24 * 9),
	},
];

// The roles a member holds; the owner's moves only with ownership.
const ROLE_OPTIONS: Option<Member["role"]>[] = [
	{ value: "owner", label: "Owner", description: "Owns the workspace" },
	...ROLES,
];

const COLUMNS: TableColumn<Member>[] = [
	{
		key: "name",
		label: "Name",
		width: "1/4",
		sortable: true,
		cell: (member) => member.name,
	},
	{
		key: "email",
		label: "Email",
		kind: "source",
		sortable: true,
		cell: (member) => member.email,
	},
	{
		key: "role",
		label: "Role",
		kind: "chip",
		family: "violet",
		width: "measure-short",
		sortable: true,
		edit: { control: "picker", options: ROLE_OPTIONS },
		cell: (member) => member.role,
	},
	{
		key: "team",
		label: "Team",
		width: "measure-short",
		edit: { control: "input" },
		cell: (member) => member.team || null,
	},
	{
		key: "deploys",
		label: "Deploys",
		kind: "check",
		edit: { control: "checkbox" },
		cell: (member) => member.deploys,
	},
	{
		key: "active",
		label: "Last active",
		kind: "age",
		width: "measure-short",
		sortable: true,
		cell: (member) => member.active,
	},
];

const ROW = {
	id: (member: Member) => member.id,
	// The owner's role moves only with ownership.
	locked: (member: Member) => (member.role === "owner" ? ["role"] : undefined),
};

const PERMISSIONS = [
	{
		value: "deploy",
		label: "Deploy to production",
		description: "Promote a preview and roll back",
	},
	{ value: "domains", label: "Manage domains" },
	{ value: "billing", label: "See billing" },
	{
		value: "logs",
		label: "Read logs",
		description: "Request and build logs of every project",
		recommended: true,
	},
];

function Invite(props: { open: boolean; onClose: () => void }) {
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<Role>("member");
	const [permissions, setPermissions] = useState<string[]>(["logs"]);
	return (
		<Sheet
			open={props.open}
			onClose={props.onClose}
			title="Invite members"
			description="They join Acme once they accept the email."
			submit={{
				label: "Send invite",
				blocked: email ? undefined : "Enter an email address first.",
				onAct: async () => {
					await settle();
					props.onClose();
					toast(`Invitation sent to ${email}`, { state: "done" });
				},
			}}
		>
			<Form>
				<FormField label="Email">
					<Input value={email} onChange={setEmail} />
				</FormField>
				<FormField label="Role" description="What they can change.">
					<Select options={ROLES} value={role} onChange={setRole} />
				</FormField>
				<FormField label="Permissions">
					<OptionList
						options={PERMISSIONS}
						value={permissions}
						onChange={setPermissions}
					/>
				</FormField>
			</Form>
		</Sheet>
	);
}

// The open member: what a phone edits, since its rows edit nothing in place.
function Record(props: {
	member?: Member;
	onClose: () => void;
	onSave: (member: Member) => void;
}) {
	const { member } = props;
	// The draft follows the member opened and stays through the sheet's exit.
	const [draft, setDraft] = useState(member);
	const [shown, setShown] = useState(member);
	if (member && member !== shown) {
		setShown(member);
		setDraft(member);
	}
	const edit = (change: Partial<Member>) =>
		setDraft((current) => (current ? { ...current, ...change } : current));
	return (
		<Sheet
			open={member !== undefined}
			onClose={props.onClose}
			title={draft?.name ?? ""}
			description={draft?.email}
			submit={{
				label: "Save",
				onAct: async () => {
					await settle();
					if (draft) props.onSave(draft);
					props.onClose();
					toast(`${draft?.name} saved`, { state: "done" });
				},
			}}
		>
			{draft ? (
				<Form>
					<FormField
						label="Role"
						description={
							draft.role === "owner"
								? "The owner's role moves only when another member is made owner."
								: "What they can change."
						}
						disabled={draft.role === "owner"}
					>
						<Select
							options={
								draft.role === "owner" ? ROLE_OPTIONS : ROLE_OPTIONS.slice(1)
							}
							value={draft.role}
							onChange={(role) => edit({ role })}
						/>
					</FormField>
					<FormField label="Team">
						<Input value={draft.team} onChange={(team) => edit({ team })} />
					</FormField>
					<FormField
						label="Deploys"
						description="Promotes previews and deploys to production."
					>
						<Switch
							checked={draft.deploys}
							onChange={(deploys) => edit({ deploys })}
							label="Deploys"
						/>
					</FormField>
				</Form>
			) : null}
		</Sheet>
	);
}

// What one cell's edit changes on its member.
function edited(member: Member, key: string, value: CellValue): Member {
	const role = ROLE_OPTIONS.find((option) => option.value === value);
	if (key === "role" && role) return { ...member, role: role.value };
	if (key === "team") return { ...member, team: String(value ?? "") };
	if (key === "deploys") return { ...member, deploys: value === true };
	return member;
}

// The members query, its answer updated in place by each edit as a query's
// cache is.
function MemberTable() {
	const [all, setMembers] = useState(MEMBERS);
	const query = useFixture(all);
	const members = query.data ?? [];
	const [open, setOpen] = useState<string>();
	const save = (next: Member) =>
		setMembers((all) => all.map((each) => (each.id === next.id ? next : each)));
	// Ownership moves whole: the new owner takes it, the old one stays an admin.
	const transfer = (member: Member) =>
		confirm({
			title: `Make ${member.name} the owner?`,
			sentence:
				"They take over billing and the workspace's deletion. You stay an admin.",
			act: {
				label: "Transfer ownership",
				destructive: true,
				onAct: async () => {
					await settle();
					setMembers((all) =>
						all.map((each) => {
							if (each.id === member.id) return { ...each, role: "owner" };
							if (each.role === "owner") return { ...each, role: "admin" };
							return each;
						}),
					);
					toast(`${member.name} owns Acme`, { state: "done" });
				},
			},
		});
	return (
		<>
			<Table
				columns={COLUMNS}
				query={query}
				sentence="Members did not load."
				row={ROW}
				selected={open}
				onOpen={setOpen}
				onEdit={(id, key, value) => {
					const member = members.find((each) => each.id === id);
					if (!member) return;
					if (key === "role" && value === "owner") transfer(member);
					else save(edited(member, key, value));
				}}
				empty={
					<EmptyState
						icon="Users"
						title="No members yet"
						sentence="Invite the people you work with to deploy together."
					/>
				}
			/>
			<Record
				member={members.find((each) => each.id === open)}
				onClose={() => setOpen(undefined)}
				onSave={save}
			/>
		</>
	);
}

export function Members() {
	const [invited, setInvited] = useState(true);
	const [inviting, setInviting] = useState(false);
	const revoke = () =>
		confirm({
			title: "Revoke the invitation?",
			sentence: "The link in the email stops working. You can invite again.",
			act: {
				label: "Revoke",
				destructive: true,
				onAct: async () => {
					await settle();
					setInvited(false);
					toast("Invitation revoked", { state: "done" });
				},
			},
		});
	return (
		<Place
			title="Members"
			act={{ label: "Invite", onAct: () => setInviting(true) }}
		>
			<Section
				title="Members"
				description="Who works in Acme, and what each can change."
			>
				<MemberTable />
			</Section>
			{invited ? (
				<Section title="Invitations" count={1}>
					<Group>
						<ListRow
							leading={{ status: "waiting" }}
							title="lea@northwind.io"
							meta={["Invited 2 d ago by Ana Ruiz"]}
							status={{ state: "waiting", label: "Pending" }}
							trailing={{ value: "Member" }}
							more={[
								{
									label: "Resend",
									icon: "Send",
									onAct: () => toast("Invitation sent again"),
								},
								{
									label: "Revoke",
									icon: "UserMinus",
									destructive: true,
									onAct: revoke,
								},
							]}
						/>
					</Group>
				</Section>
			) : null}
			<Invite open={inviting} onClose={() => setInviting(false)} />
		</Place>
	);
}
