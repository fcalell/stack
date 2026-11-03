import type { Fixtures } from "@fcalell/plugin-screens/fixtures";
import { session, user } from "./screens-session.ts";
import type { Device } from "./worker/outputs.ts";
import type {
	deviceProcedures,
	sessionProcedures,
} from "./worker/procedures.ts";

// The device keys a member's list shows in the screens workbench: one in use,
// one never used, one that expired, so a list draws each of its forms.
const devices: Device[] = [
	{
		id: "device_studio",
		name: "Studio laptop",
		start: "sk_stud",
		createdAt: new Date("2026-02-10T09:00:00.000Z"),
		expiresAt: null,
		lastUsedAt: new Date("2026-02-28T18:30:00.000Z"),
	},
	{
		id: "device_booth",
		name: "Booth laptop",
		start: "sk_boot",
		createdAt: new Date("2026-02-20T09:00:00.000Z"),
		expiresAt: new Date("2099-01-01T00:00:00.000Z"),
		lastUsedAt: null,
	},
	{
		id: "device_old",
		name: "Old desktop",
		start: "sk_oldd",
		createdAt: new Date("2025-06-01T09:00:00.000Z"),
		expiresAt: new Date("2025-12-01T09:00:00.000Z"),
		lastUsedAt: new Date("2025-11-30T12:00:00.000Z"),
	},
];

// What the screens workbench contributes for the procedures auth owns: the
// signed-in session `orpc.auth.session` reads, so a screen behind the session
// guard draws its signed-in form, and the device keys of `devices: true`
// (`auth.devices.list`, `create`, `revoke`), so a screen that lists, makes and
// revokes them draws each. A procedure the app's auth config leaves off is
// never called, so its fixture is inert. The app overrides any of them in
// `src/app/fixtures.ts`.
const fixtures: Fixtures<{
	auth: Pick<ReturnType<typeof sessionProcedures>, "session"> &
		ReturnType<typeof deviceProcedures>;
}> = {
	auth: {
		session: () => ({ session, user }),
		devices: {
			list: (): Device[] => devices,
			// The one key the answer shows, as the member copies it.
			create: ({ name }) => ({
				device: {
					id: "device_new",
					name,
					start: "sk_scre",
					createdAt: new Date("2026-03-01T09:00:00.000Z"),
					expiresAt: null,
					lastUsedAt: null,
				},
				key: "sk_screens_0123456789abcdefghijklmnopqrstuvwxyz",
			}),
			revoke: () => ({ success: true }),
		},
	},
};

export default fixtures;
