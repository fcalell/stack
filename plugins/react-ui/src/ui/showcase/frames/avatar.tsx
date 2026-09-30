import { Avatar } from "../../components/avatar/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";

// A name whose hash picks each step, so the frame draws its cell through the
// component's own pick.
const BY_STEP: Record<string, string> = {
	"1": "Ana Ruiz",
	"2": "Mia Chen",
	"3": "Chloé Martin",
	"4": "Ben Kaya",
	"5": "Kai Lund",
	"6": "Omar Haddad",
	"7": "Hugo Silva",
	"8": "Dev Patel",
};

// The board's portrait (`design/11-text-avatar.svg`), inline so the frame
// needs no asset pipeline.
const PORTRAIT = `data:image/svg+xml,${encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9fb7c9"/><stop offset="1" stop-color="#5f7d93"/></linearGradient><linearGradient id="skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8b996"/><stop offset="1" stop-color="#c98f6b"/></linearGradient></defs><rect width="64" height="64" fill="url(#bg)"/><path d="M8 64c2-13 12-19 24-19s22 6 24 19z" fill="#2f3a45"/><path d="M26 40h12v8c0 3-3 5-6 5s-6-2-6-5z" fill="#c98f6b"/><ellipse cx="32" cy="28" rx="11" ry="13" fill="url(#skin)"/><path d="M20 27c-1-10 5-16 13-16 9 0 13 6 12 15-2-5-6-8-12-8-6 0-10 3-13 9z" fill="#3b2a20"/></svg>',
)}`;

// `AVATAR.step.n` draws the initials on step n, then the image form (the
// `AVATAR` base); `AVATAR_LABEL.step.n` the initials alone.
export function drawAvatar(frame: ShowcaseFrame) {
	const [cell, , step] = frame.cell.name.split(".");
	const name = step && BY_STEP[step];
	if (!name) return undefined;
	if (cell === "AVATAR_LABEL") return <Avatar name={name} />;
	return (
		<span className="flex items-center gap-pair">
			<Avatar name={name} />
			<Avatar name={name} src={PORTRAIT} />
		</span>
	);
}
