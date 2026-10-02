import type { MenuItem } from "@fcalell/ui-core/descriptors";
import { Group } from "../../components/group/index.tsx";
import { List } from "../../components/list/index.tsx";
import { ListRow } from "../../components/list-row/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

const act = () => {};
const MORE: MenuItem[] = [
	{ label: "Redeploy", icon: "RotateCw", onAct: act },
	{ label: "Copy URL", icon: "Copy", onAct: act },
];
const ROLES = [
	{ value: "owner", label: "Owner" },
	{ value: "admin", label: "Admin" },
	{ value: "member", label: "Member" },
];

// Board 40's issues in a Split's list: the first row current (its href is
// the page's own path), the others at their own.
function Issues() {
	const here = location.pathname;
	return (
		<List>
			<ListRow
				leading={{ avatar: { name: "Ben Kaya" } }}
				title="Fix invoice rounding"
				meta={["Billing", "ACM-142"]}
				trailing={{ age: "2 h" }}
				status={{ state: "active", label: "In progress" }}
				href={here}
			/>
			<ListRow
				leading={{ avatar: { name: "Ema Okafor" } }}
				title="Export cohorts to CSV"
				meta={["Growth", "ACM-139"]}
				trailing={{ age: "5 h" }}
				status={{ state: "waiting", label: "Todo" }}
				href="#acm-139"
			/>
			<ListRow
				leading={{ avatar: { name: "Ana Ruiz" } }}
				title="Retry failed webhooks with backoff"
				meta={["Infra", "ACM-137"]}
				trailing={{ age: "1 d" }}
				status={{ state: "attention", label: "Blocked" }}
				href="#acm-137"
			/>
		</List>
	);
}

// Board 40's props: deploys in a List (a glyph or an avatar leading, a chip
// or a status on the meta line, the more act) and members in a Group (a
// trailing value, a trailing pick, a status dot leading).
function Props() {
	return (
		<>
			<List>
				<ListRow
					leading={{ icon: "Rocket" }}
					title="api · main"
					trailing={{ age: "Just now" }}
					more={MORE}
					href="#api"
				/>
				<ListRow
					leading={{ icon: "GitBranch" }}
					title="web · fix/checkout"
					meta={["b71d0e2", "Ana Ruiz"]}
					trailing={{ age: "40 min" }}
					chip={{ family: "red", label: "Rolled back" }}
					more={MORE}
					href="#web"
				/>
				<ListRow
					leading={{ avatar: { name: "Ema Okafor" } }}
					title="worker · main"
					meta={["0c5e4aa", "Ema Okafor"]}
					trailing={{ age: "2 h" }}
					status={{ state: "done", label: "Ready" }}
					chip={{ family: "teal", label: "Production" }}
					more={MORE}
					href="#worker"
				/>
			</List>
			<Group>
				<ListRow
					leading={{ avatar: { name: "Ana Ruiz" } }}
					title="Ana Ruiz"
					meta={["ana@acme.app"]}
					trailing={{ value: "Owner" }}
					more={MORE}
				/>
				<ListRow
					leading={{ avatar: { name: "Ben Kaya" } }}
					title="Ben Kaya"
					meta={["ben@acme.app"]}
					trailing={{
						pick: {
							label: "Ben Kaya's role",
							options: ROLES,
							value: "admin",
							onChange: act,
						},
					}}
					more={MORE}
				/>
				<ListRow
					leading={{ status: "waiting" }}
					title="lea@northwind.io"
					meta={["Invited 2 d ago by Ana Ruiz"]}
					status={{ state: "waiting", label: "Pending" }}
					more={MORE}
				/>
			</Group>
		</>
	);
}

// The pointer, focus and current states draw the Split's list, a cell on
// the group ground or a part only the props draw (a chip, the more act, a
// glyph) the props; the rest cells draw the issues too.
export function drawListRow(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	const props =
		cell === "ROW.ground.group" ||
		cell === "ROW.lines.one" ||
		cell.startsWith("CHIP") ||
		cell.startsWith("ICON") ||
		cell === "ROW_ACTS";
	return <Wide>{props ? <Props /> : <Issues />}</Wide>;
}
