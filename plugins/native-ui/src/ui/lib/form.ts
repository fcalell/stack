import { createContext } from "react";

// Set around an act that cannot run where it stands, with no reason to give:
// a `Thread`'s composer's Send while its text is empty. It is inert and says so,
// drawn in its disabled form.
export const ActInert = createContext(false);
