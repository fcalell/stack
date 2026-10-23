import {
	preload,
	type Read,
	useMutation,
	useQueryClient,
	useRead,
} from "@fcalell/plugin-api/tanstack-query";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
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
	loader: ({ context }) =>
		preload(context.queryClient, orpc.members.list.read()),
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
		cell: (member) => member.role,
	},
	{
		key: "team",
		label: "Team",
		width: "measure-short",
		edit: "input",
		cell: (member) => member.team || null,
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
] as const;

function Invite(props: { open: boolean; onClose: () => void }) {
	return (
		<Sheet
			open={props.open}
			onClose={props.onClose}
			title="Invite members"
			description="They join Acme once they accept the email."
			form={{
				act: orpc.members.invite,
				values: { role: "member", permissions: ["logs"] },
				fields: {
					email: { label: "Email" },
					role: {
						label: "Role",
						description: "What they can change.",
						options: ROLES,
					},
					permissions: { label: "Permissions", options: PERMISSIONS },
				},
				submit: { label: "Send invite", done: "Invitation sent" },
				onDone: props.onClose,
			}}
		/>
	);
}

// The open member: what a phone edits, since its rows edit nothing in place.
function Record(props: { member?: Member; onClose: () => void }) {
	// The form follows the member opened and stays through the sheet's exit.
	const [shown, setShown] = useState(props.member);
	if (props.member && props.member !== shown) setShown(props.member);
	return (
		<Sheet
			open={props.member !== undefined}
			onClose={props.onClose}
			title={shown?.name ?? ""}
			description={shown?.email}
			form={
				shown && {
					act: orpc.members.update,
					given: { id: shown.id },
					values: {
						role: shown.role,
						team: shown.team,
						deploys: shown.deploys,
					},
					fields: {
						role: {
							label: "Role",
							description: "What they can change.",
							locked:
								shown.role === "owner"
									? "The owner's role moves only when another member is made owner."
									: undefined,
							options:
								shown.role === "owner" ? ROLE_OPTIONS : ROLE_OPTIONS.slice(1),
						},
						team: { label: "Team" },
						deploys: {
							label: "Deploys",
							description: "Promotes previews and deploys to production.",
						},
					},
					submit: { label: "Save", done: `${shown.name} saved` },
					onDone: props.onClose,
				}
			}
		/>
	);
}

// What one cell's edit changes on its member: the team, the one column that
// edits in place.
function edited(key: string, value: CellValue): Pick<Partial<Member>, "team"> {
	if (key === "team") return { team: String(value ?? "") };
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
	return (
		<>
			<Table
				columns={COLUMNS}
				items={props.members}
				row={ROW}
				selected={open}
				onOpen={setOpen}
				onEdit={(id, key, value) =>
					update.mutateAsync({ id, ...edited(key, value) })
				}
			/>
			<Record
				member={members.find((each) => each.id === open)}
				onClose={() => setOpen(undefined)}
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
				onAct: async () => {
					await revokeInvitation.mutateAsync();
					setInvited(false);
					toast("Invitation revoked");
				},
			},
		});
	return (
		<Pane
			title="Members"
			wide
			actions={[
				{ icon: "Plus", label: "Invite", onAct: () => setInviting(true) },
			]}
		>
			<Section
				title="People"
				description="Who works in Acme, and what each can change."
				read={members}
			>
				<MemberTable members={members} />
			</Section>
			{invited ? (
				<Section
					title="Invitations"
					items={[
						{
							key: "lea-northwind-io",
							title: "lea@northwind.io",
							meta: ["Invited 2 d ago by Ana Ruiz"],
							status: { tone: "waiting", label: "Pending" },
							trailing: { value: "Member" },
							more: [
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
							],
						},
					]}
				/>
			) : null}
			<Invite open={inviting} onClose={() => setInviting(false)} />
		</Pane>
	);
}
