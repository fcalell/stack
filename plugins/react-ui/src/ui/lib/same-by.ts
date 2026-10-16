import { replaceEqualDeep } from "@tanstack/react-query";

/** `memo`'s comparison for a collection's row: its props are equal when each is the same one, and its `by` prop (the row's item) is deeply equal to the last. A read shares unchanged items only by position, so an item landing at the top hands every row below it a copy of the item above's old place; compared by value, those rows draw nothing again. */
export function sameBy<K extends string>(by: K) {
	return <P extends Record<K, unknown>>(was: P, now: P): boolean => {
		for (const key of new Set([...Object.keys(was), ...Object.keys(now)])) {
			const [a, b] = [was, now].map((props) => props[key as keyof P]);
			if (key === by ? replaceEqualDeep(a, b) !== a : !Object.is(a, b))
				return false;
		}
		return true;
	};
}
