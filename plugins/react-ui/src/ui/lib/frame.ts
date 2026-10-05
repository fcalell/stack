import type { Dialog } from "@base-ui/react/dialog";
import type { Switcher } from "@fcalell/ui-core/descriptors";
import { createContext, type ReactNode } from "react";

// What the frame molecules hand each other. The Shell hands its switcher to
// the Place, which draws its trigger at the start of its touch top bar.
export const ShellSwitcher = createContext<Switcher | undefined>(undefined);

// The handle of the details sheet a Split's pane opens in, owned by the Place
// or pushed Screen it sits in, which draws the sheet's trigger, the Details
// act, from its first frame. The Split marks its root (`data-record` while a
// record is open, `data-pane` while that record has a pane, `data-beside` while
// a record stands beside the main) and the page's head shows its acts by the
// marks: the Details act below `wide` of the page with a pane, at every width
// beside a record; the back act to the list below `tablet` with a record;
// below `tablet` with a record beside the main, no head at all.
export const DetailsSheet = createContext<Dialog.Handle<unknown> | null>(null);

// A Split's `beside` record is a Screen standing in its page, not a page of
// its own: it covers no tab bar, its title is a heading at the level where it
// stands, its body is the size container what stands in it decides by, and
// its back act draws as Close to the same route from `wide` of the page.
// Below `tablet` of the page its head stands alone, so it draws the Details
// act of the Split's pane while it is open; `null` outside a `beside`.
export interface BesideFrame {
	details?: Dialog.Handle<unknown>;
}
export const Beside = createContext<BesideFrame | null>(null);

// The route of the Shell's current place: the list a Place returns to
// from a record its Split shows alone.
export const PlaceRoute = createContext<string | undefined>(undefined);

// The route a Screen's back act returns to, where a read inside that answers
// not found leads back; outside a Screen it leads to `PlaceRoute`.
export const BackRoute = createContext<string | undefined>(undefined);

// Whether a Thread standing here fills the region it stands in: true in a
// Place's body without a foot and in a Split's main, false in a Section,
// where it stands among the page's sections. A filling Thread marks its root
// `data-fill`, and the region reads the mark by a `has-[>[data-fill]]`
// variant (no inset, scrolling left to the log) from its first frame.
export const ThreadRoom = createContext(false);

// A Split's main keeps the page inset around the record's head, so a Thread
// filling it bleeds through the sides, its log and foot inset themselves.
export const ThreadBleeds = createContext(false);

// A Split's main, whose record head stands in the Thread's column on the
// desktop while a Thread fills the main (the main's `data-fill` mark).
export const OverThread = createContext(false);

// A bleeding touch Place hands the room its floating act needs to the regions
// that scroll inside its body, which keep it under their last row.
export const ActRoom = createContext<ReactNode>(null);

// The id of the Place's or Screen's title, which names a Split's list.
export const PageTitle = createContext<string | undefined>(undefined);
