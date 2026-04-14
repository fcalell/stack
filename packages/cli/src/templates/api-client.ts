export function apiClientTemplate(): string {
	return `import { createClient } from "@fcalell/api/client";
import type { AppRouter } from "../../worker";

export const api = createClient<AppRouter>();
`;
}
