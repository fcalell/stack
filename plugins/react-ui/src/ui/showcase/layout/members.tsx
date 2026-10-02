import type { StatusState } from "@fcalell/ui-core/tokens";
import { useState } from "react";
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
import { confirm } from "../../lib/confirm.ts";
import { toast } from "../../lib/toast.ts";
import { settle } from "./here.ts";

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
	name: string;
	email: string;
	role: Role | "owner";
	// An invitation not yet taken.
	invited?: StatusState;
}

const MEMBERS: Member[] = [
	{ name: "Ana Ruiz", email: "ana@acme.dev", role: "owner" },
	{ name: "Ben Kaya", email: "ben@acme.dev", role: "admin" },
	{ name: "Ema Okafor", email: "ema@acme.dev", role: "member" },
	{ name: "Chen Wu", email: "chen@acme.dev", role: "viewer" },
	{
		name: "lea@northwind.io",
		email: "Invited 2 d ago by Ana Ruiz",
		role: "member",
		invited: "waiting",
	},
];

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

export function Members() {
	const [members, setMembers] = useState(MEMBERS);
	const [inviting, setInviting] = useState(false);
	const remove = (member: Member) =>
		confirm({
			title: `Remove ${member.name}?`,
			sentence:
				"They lose access to every project in Acme at once. Their deploys stay.",
			act: {
				label: "Remove member",
				destructive: true,
				onAct: async () => {
					await settle();
					setMembers((all) => all.filter((each) => each !== member));
					toast(`${member.name} removed`, { state: "done" });
				},
			},
			confirmName: {
				value: member.name,
				label: `Type ${member.name} to confirm`,
				blocked: "Type their name to remove them.",
			},
		});
	return (
		<Place
			title="Members"
			act={{ label: "Invite", onAct: () => setInviting(true) }}
		>
			<Section
				title="Members"
				count={members.length}
				description="Who works in Acme, and what each can change."
			>
				<Group>
					{members.map((member) => (
						<ListRow<Role>
							key={member.name}
							leading={
								member.invited
									? { status: member.invited }
									: { avatar: { name: member.name } }
							}
							title={member.name}
							meta={[member.email]}
							status={
								member.invited
									? { state: member.invited, label: "Pending" }
									: undefined
							}
							trailing={
								member.role === "owner"
									? { value: "Owner" }
									: {
											pick: {
												label: `${member.name}'s role`,
												options: ROLES,
												value: member.role,
												onChange: (role) => {
													setMembers((all) =>
														all.map((each) =>
															each === member ? { ...each, role } : each,
														),
													);
													toast(`${member.name} is now ${role}`);
												},
											},
										}
							}
							more={[
								{
									label: "Copy email",
									icon: "Copy",
									onAct: () => toast("Email copied"),
								},
								{
									label: "Remove",
									icon: "UserMinus",
									destructive: true,
									onAct: () => remove(member),
								},
							]}
						/>
					))}
				</Group>
			</Section>
			<Invite open={inviting} onClose={() => setInviting(false)} />
		</Place>
	);
}
