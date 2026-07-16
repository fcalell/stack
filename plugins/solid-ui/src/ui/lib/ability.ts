import {
	composeAbility,
	fetchOrgRules,
	ORG_RULES_QUERY_KEY,
	type PackedRulesLike,
} from "@fcalell/plugin-api/ability-client";
import { useQuery } from "@tanstack/solid-query";

// WS6.3: the solid analog of
// `@fcalell/plugin-api/tanstack-query`'s `useAbility`, built on the same
// framework-agnostic core. Solid-style: the record layer and the return
// value are both accessors, so the composed ability stays reactive to org
// rules resolving and to the caller's own record-rules signal.
//
// Deny-all while the org rules query is loading/errored or absent; a record
// layer already in hand still answers its own checks in that window (see
// `composeAbility`'s doc comment in `ability-client.ts`). Never read the
// composed `MongoAbility` out of a query cache -- this primitive composes it
// fresh on every access, memoized by rules-array identity.
export function useAbility(recordRules?: () => PackedRulesLike | undefined) {
	const query = useQuery(() => ({
		queryKey: ORG_RULES_QUERY_KEY,
		queryFn: fetchOrgRules,
		staleTime: Infinity,
	}));

	return () => composeAbility(query.data, recordRules?.());
}

export type { PackedRulesLike };
export { ORG_RULES_QUERY_KEY };
