import { router, usePathname } from "expo-router";

// A route on a row or a back circle navigates through expo-router; the shell
// reads the pathname to mark the selected place.
export function navigate(route: string): void {
	router.navigate(route as Parameters<typeof router.navigate>[0]);
}

export { usePathname };
