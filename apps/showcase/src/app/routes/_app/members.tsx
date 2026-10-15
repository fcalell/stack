import {
	preload,
	type Read,
	useMutation,
	useQueryClient,
	useRead,
} from "@fcalell/plugin-api/tanstack-query";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { ListRow } from "@fcalell/plugin-react-ui/components/list-row";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import { Table } from "@fcalell/plugin-react-ui/components/table";
import { confirm } from "@fcalell/plugin-react-ui/lib/confirm";
import { toast } from "@fcalell/plugin-react-ui/lib/toast";
import type {
	CellValue,
	Option,
	TableColumn,
} from "@fcalell/ui-core/descriptors";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { AppRouter } from "../../../../.stack/worker";
import { orpc } from "../../lib/api.ts";

export const Route = createFileRoute("/_app/members")({
	loader: () => preload(orpc.members.list.read()),
	component: Members,
});

type Member = AppRouter["members"]["list"]["__output"][number];

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
	const invite = useMutation(orpc.members.invite.mutationOptions());
	return (
		<Sheet
			open={props.open}
			onClose={props.onClose}
			title="Invite members"
			description="They join Acme once they accept the email."
			submit={{
				label: "Send invite",
				failed: "The invitation was not sent.",
				blocked: email ? undefined : "Enter an email address first.",
				onAct: async () => {
					await invite.mutateAsync({ email, role, permissions });
					props.onClose();
					toast(`Invitation sent to ${email}`, { state: "done" });
				},
			}}
			form={{
				children: (
					<>
						<FormField label="Email">
							<Input value={email} onChange={setEmail} />
						</FormField>
						<FormField
							label="Role"
							description="What they can change."
							select={{ options: ROLES, value: role, onChange: setRole }}
						/>
						<FormField
							label="Permissions"
							options={{
								options: PERMISSIONS,
								value: permissions,
								onChange: setPermissions,
							}}
						/>
					</>
				),
			}}
		/>
	);
}

// The open member: what a phone edits, since its rows edit nothing in place.
function Record(props: {
	member?: Member;
	onClose: () => void;
	onSave: (member: Member) => Promise<unknown>;
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
				failed: "The member was not saved.",
				onAct: async () => {
					if (draft) await props.onSave(draft);
					props.onClose();
					toast(`${draft?.name} saved`, { state: "done" });
				},
			}}
			form={{
				children: draft ? (
					<>
						<FormField
							label="Role"
							description={
								draft.role === "owner"
									? "The owner's role moves only when another member is made owner."
									: "What they can change."
							}
							disabled={draft.role === "owner"}
							select={{
								options:
									draft.role === "owner" ? ROLE_OPTIONS : ROLE_OPTIONS.slice(1),
								value: draft.role,
								onChange: (role) => edit({ role }),
							}}
						/>
						<FormField label="Team">
							<Input value={draft.team} onChange={(team) => edit({ team })} />
						</FormField>
						<FormField
							label="Deploys"
							description="Promotes previews and deploys to production."
							switch={{
								checked: draft.deploys,
								onChange: (deploys) => edit({ deploys }),
							}}
						/>
					</>
				) : null,
			}}
		/>
	);
}

// What one cell's edit changes on its member.
function edited(
	key: string,
	value: CellValue,
): Pick<Partial<Member>, "role" | "team" | "deploys"> {
	const role = ROLE_OPTIONS.find((option) => option.value === value);
	if (key === "role" && role) return { role: role.value };
	if (key === "team") return { team: String(value ?? "") };
	if (key === "deploys") return { deploys: value === true };
	return {};
}

// The members read, its answer updated in place by each edit as a query's
// cache is: the mutations own the cache they change. The Section around the
// table holds the read; the open record's member is the app's own view of it.
function MemberTable(props: { members: Read<readonly Member[]> }) {
	const queryClient = useQueryClient();
	const members = useRead(props.members) ?? [];
	const [open, setOpen] = useState<string>();
	const update = useMutation(
		orpc.members.update.mutationOptions({
			meta: { skipAutoInvalidation: true },
			onSuccess: (next) =>
				queryClient.setQueryData(orpc.members.list.queryKey(), (all) =>
					all?.map((each) => (each.id === next.id ? next : each)),
				),
		}),
	);
	const owner = useMutation(
		orpc.members.transfer.mutationOptions({
			meta: { skipAutoInvalidation: true },
			onSuccess: (all) =>
				queryClient.setQueryData(orpc.members.list.queryKey(), all),
		}),
	);
	const save = (next: Member) =>
		update.mutateAsync({
			id: next.id,
			role: next.role,
			team: next.team,
			deploys: next.deploys,
		});
	// Ownership moves whole: the new owner takes it, the old one stays an admin.
	const transfer = (member: Member) =>
		confirm({
			title: `Make ${member.name} the owner?`,
			sentence:
				"They take over billing and the workspace's deletion. You stay an admin.",
			act: {
				label: "Transfer ownership",
				destructive: true,
				failed: "Ownership was not transferred.",
				onAct: async () => {
					await owner.mutateAsync({ id: member.id });
					toast(`${member.name} owns Acme`, { state: "done" });
				},
			},
		});
	return (
		<>
			<Table
				columns={COLUMNS}
				items={props.members}
				row={ROW}
				selected={open}
				onOpen={setOpen}
				onEdit={(id, key, value) => {
					const member = members.find((each) => each.id === id);
					if (!member) return;
					if (key === "role" && value === "owner") return transfer(member);
					return update.mutateAsync({ id, ...edited(key, value) });
				}}
			/>
			<Record
				member={members.find((each) => each.id === open)}
				onClose={() => setOpen(undefined)}
				onSave={save}
			/>
		</>
	);
}

function Members() {
	const members = orpc.members.list.read();
	const [invited, setInvited] = useState(true);
	const [inviting, setInviting] = useState(false);
	const revokeInvitation = useMutation(
		orpc.members.revokeInvitation.mutationOptions(),
	);
	const revoke = () =>
		confirm({
			title: "Revoke the invitation?",
			sentence: "The link in the email stops working. You can invite again.",
			act: {
				label: "Revoke",
				destructive: true,
				failed: "The invitation was not revoked.",
				onAct: async () => {
					await revokeInvitation.mutateAsync();
					setInvited(false);
					toast("Invitation revoked", { state: "done" });
				},
			},
		});
	return (
		<Place>
			<Pane
				title="Members"
				actions={[
					{ icon: "Plus", label: "Invite", onAct: () => setInviting(true) },
				]}
			>
				<Section
					title="People"
					description="Who works in Acme, and what each can change."
					read={members}
					failed="Members did not load."
					empty={{
						icon: "Users",
						title: "No members yet",
						sentence: "Invite the people you work with to deploy together.",
					}}
				>
					<MemberTable members={members} />
				</Section>
				{invited ? (
					<Section title="Invitations" count={1}>
						<Group
							items={[
								{
									key: "lea-northwind-io",
									row: (
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
									),
								},
							]}
						/>
					</Section>
				) : null}
				<Invite open={inviting} onClose={() => setInviting(false)} />
			</Pane>
		</Place>
	);
}
