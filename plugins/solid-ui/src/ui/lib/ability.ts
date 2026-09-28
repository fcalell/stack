import {
	composeAbility,
	fetchOrgRules,
	ORG_RULES_QUERY_KEY,
	orgRulesQueryKey,
	type PackedRulesLike,
} from "@fcalell/plugin-api/ability-client";
import { useQuery } from "@tanstack/solid-query";

// The solid analog of `@fcalell/plugin-api/tanstack-query`'s `useAbility`,
// built on the same framework-agnostic core. Solid-style: the organization,
// the record layer and the return value are accessors, so the composed
// ability follows the organization in the URL and the caller's own
// record-rules signal.
//
// The rules are the caller's role in that organization. Deny-all while they
// load, error, or no organization is known yet; a record layer already in
// hand still answers its own checks in that window (see `composeAbility`'s
// doc comment in `ability-client.ts`). Never read the composed
// `MongoAbility` out of a query cache: this primitive composes it fresh on
// every access, memoized by rules-array identity.
export function useAbility(
	organizationId: () => string | undefined,
	recordRules?: () => PackedRulesLike | undefined,
) {
	const query = useQuery(() => {
		const id = organizationId();
		return {
			queryKey: orgRulesQueryKey(id ?? ""),
			queryFn: () => fetchOrgRules(id ?? ""),
			enabled: id !== undefined,
			staleTime: Infinity,
		};
	});

	return () => composeAbility(query.data, recordRules?.());
}

export type { PackedRulesLike };
export { ORG_RULES_QUERY_KEY, orgRulesQueryKey };
