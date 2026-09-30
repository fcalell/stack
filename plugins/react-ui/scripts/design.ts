// The artboards' ground: the showcase's emitted `app.css` compiled together
// with the boards' own markup, and the default fonts declared from
// `./files/`, so a board under `design/` renders standalone on the real
// contract. Run through `pnpm design` at the root, which builds the showcase
// first.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildFontFaceCss, defaultFonts } from "../src/node/fonts.ts";

const design = fileURLToPath(new URL("../design/", import.meta.url));
mkdirSync(resolve(design, "files"), { recursive: true });

const fonts = defaultFonts.map((font) => {
	const abs = fileURLToPath(import.meta.resolve(font.specifier));
	copyFileSync(abs, resolve(design, "files", basename(abs)));
	return { font, href: `./files/${basename(abs)}` };
});
writeFileSync(resolve(design, "fonts.css"), `${buildFontFaceCss(fonts)}\n`);

execFileSync("tailwindcss", ["-i", "board.css", "-o", "app.css"], {
	cwd: design,
	stdio: "inherit",
});
