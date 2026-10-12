import { createElement } from "react";
import type { GroupItem } from "../src/ui/components/group/index.tsx";

const node = createElement("b");

// an entry is a row, drawn bare, or an item, drawn at the card's inset
const entry = (each: GroupItem) => each;
entry({ key: "a", row: node });
entry({ key: "a", item: node });
// @ts-expect-error: an entry is a row or an item, never both
entry({ key: "a", row: node, item: node });
// @ts-expect-error: an entry is one or the other
entry({ key: "a" });
