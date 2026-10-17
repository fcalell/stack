import {
	type QueryClient,
	useQueryClient,
} from "@fcalell/plugin-api/tanstack-query";
import { useEffect } from "react";

// The query client of the story on screen. The providers make one per story
// inside React, where the run's hooks cannot reach, so a component in the
// story's tree (`RememberClient`) hands it over for as long as the story is
// mounted.
let current: QueryClient | undefined;

export function storyClient(): QueryClient | undefined {
	return current;
}

export function RememberClient() {
	const client = useQueryClient();
	useEffect(() => {
		current = client;
		return () => {
			if (current === client) current = undefined;
		};
	}, [client]);
	return null;
}
