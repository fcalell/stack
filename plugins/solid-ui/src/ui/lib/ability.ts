import {
	composeAbility,
	fetchOrgRules,
	ORG_RULES_QUERY_KEY,
	orgRulesQueryKey,
	type PackedRulesLike,
} from "@fcalell/plugin-api/ability-client";
import { useQuery } from "@tanstack/solid-query";

// The query behind `useAbility`: the caller's rules in one organization,
// cached per organization for the session, disabled until the organization
// is known.
export function orgRulesQueryOptions(
	organizationId: string | undefined,
	fetch: (organizationId: string) => Promise<PackedRulesLike>,
) {
	return {
		queryKey: orgRulesQueryKey(organizationId ?? ""),
		queryFn: () => fetch(organizationId ?? ""),
		enabled: organizationId !== undefined,
		staleTime: Infinity,
	};
}

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
//
// `pending()` tells that window apart from a real deny for a caller that
// acts on a denial (a redirect): true only while an organization's rules are
// fetched for the first time (TanStack's `isLoading`), false once they
// answered or failed, on a background refetch, and with no organization.
export function useAbility(
	organizationId: () => string | undefined,
	recordRules?: () => PackedRulesLike | undefined,
) {
	const query = useQuery(() =>
		orgRulesQueryOptions(organizationId(), fetchOrgRules),
	);

	return Object.assign(() => composeAbility(query.data, recordRules?.()), {
		pending: () => query.isLoading,
	});
}

export type { PackedRulesLike };
export { ORG_RULES_QUERY_KEY, orgRulesQueryKey };
