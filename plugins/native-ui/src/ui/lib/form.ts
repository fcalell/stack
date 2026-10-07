import type { FormIn } from "@fcalell/ui-core/variants";
import { createContext } from "react";

// Whether a `Form` holds this part: what puts a `Section` on the fields
// rhythm.
export const FormContext = createContext(false);

// Set around an act that cannot run where it stands, with no reason to give:
// a `MessageInput`'s Send while its text is empty. It is inert and says so,
// drawn in its disabled form.
export const ActInert = createContext(false);

// Where a `Form` stands, which bounds its column: a sheet's body is the
// form's column, so is a `Gate`'s (its `ActionBar` stands across it);
// anywhere else the form stands on a page's, at most a line of
// running text wide.
export const FormStands = createContext<FormIn>("page");
