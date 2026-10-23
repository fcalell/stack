// Folds addressing variants of the same inbox into one canonical key, so
// per-email rate limiting can't be evaded by `+tag` or (Gmail-only) dot
// placement. Not a general-purpose email normalizer — narrow to the abuse
// surface it defends.
const DOT_FOLDING_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

export function emailKey(email: string): string {
	const lower = email.toLowerCase();
	const at = lower.lastIndexOf("@");
	if (at === -1) return lower;

	const domain = lower.slice(at + 1);
	let local = lower.slice(0, at);

	const plus = local.indexOf("+");
	if (plus !== -1) local = local.slice(0, plus);

	if (DOT_FOLDING_DOMAINS.has(domain)) local = local.replaceAll(".", "");

	return `${local}@${domain}`;
}
