import type {
	CellValue,
	FieldControl,
	Option,
	TableColumn,
} from "@fcalell/ui-core/descriptors";
import { z } from "zod";
import type { Picker } from "../src/ui/components/picker/index.tsx";
import type { useApiForm } from "../src/ui/lib/api-form.ts";

const ROLES = ["owner", "admin", "viewer"] as const;
type Role = (typeof ROLES)[number];
const ROLE_OPTIONS = ROLES.map((value) => ({ value, label: value }));

declare const pick: typeof Picker;
declare const use: typeof useApiForm;
declare const control: FieldControl<Role>;
declare const loose: Option[];

// Checked by the package's type-check and never run: the value type is read
// off the options, so an enum field's control spreads in without a cast and
// a value outside the options is refused.
export function inferred() {
	pick({ label: "Role", options: ROLE_OPTIONS, ...control });
	pick({
		label: "Role",
		options: [{ label: "Roles", options: ROLE_OPTIONS }],
		...control,
	});
	pick({
		label: "Role",
		options: ROLE_OPTIONS,
		value: "admin",
		onChange: (role: Role) => role,
	});

	const form = use({
		schema: z.object({ role: z.enum(ROLES) }),
		defaultValues: { role: "viewer" as Role },
		mutation: () => ({ mutationFn: async ({ role }) => role }),
	});
	pick({ label: "Role", options: ROLE_OPTIONS, ...form.bind("role") });

	// Options of plain strings pick a plain string.
	pick({
		label: "Any",
		options: loose,
		value: "anything",
		onChange: (value: string) => value,
	});

	// No value is nothing selected yet, the placeholder, with no empty choice
	// in the options: a pick still hears the enum, never undefined.
	pick({
		label: "Role",
		options: ROLE_OPTIONS,
		onChange: (role) => {
			const picked: Role = role;
			return picked;
		},
	});
	pick({
		label: "Role",
		options: ROLE_OPTIONS,
		value: undefined,
		onChange: (role: Role) => role,
	});

	const stray = [...ROLE_OPTIONS, { value: "guest" as const, label: "Guest" }];
	// @ts-expect-error a stray literal widens the options past the field's enum
	pick({ label: "Role", options: stray, ...control });
	pick({
		label: "Role",
		options: ROLE_OPTIONS,
		// @ts-expect-error a value outside the options
		value: "guest",
		onChange: () => {},
	});
}

const NONE = { value: null, label: "Not set" };
declare const nullable: FieldControl<Role | null>;

// Checked the same way: an option whose value is null is the empty choice,
// so the pick is nullable exactly when the options offer it.
export function empty(): readonly unknown[] {
	pick({ label: "Role", options: [NONE, ...ROLE_OPTIONS], ...nullable });
	pick({
		label: "Role",
		options: [{ label: "Roles", options: [NONE, ...ROLE_OPTIONS] }],
		...nullable,
	});
	pick({
		label: "Role",
		options: [NONE, ...ROLE_OPTIONS],
		value: null,
		onChange: (role: Role | null) => role,
	});

	const form = use({
		schema: z.object({ role: z.enum(ROLES).nullable() }),
		defaultValues: { role: null as Role | null },
		mutation: () => ({ mutationFn: async ({ role }) => role }),
	});
	pick({
		label: "Role",
		options: [NONE, ...ROLE_OPTIONS],
		...form.bind("role"),
	});

	// @ts-expect-error the empty choice on a field that cannot hold null
	pick({ label: "Role", options: [NONE, ...ROLE_OPTIONS], ...control });
	// @ts-expect-error a nullable field over options that offer no empty choice
	pick({ label: "Role", options: ROLE_OPTIONS, ...nullable });
	pick({
		label: "Role",
		options: ROLE_OPTIONS,
		// @ts-expect-error null where the options offer no empty choice
		value: null,
		onChange: () => {},
	});

	// A picked cell clears through its null option, and its edit hands back null.
	const column: TableColumn = {
		key: "type",
		label: "Type",
		kind: "chip",
		family: 1,
		edit: { control: "picker", options: [NONE, ...ROLE_OPTIONS] },
	};
	const cleared: CellValue = null;
	return [column, cleared];
}
