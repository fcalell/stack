import { createContext } from "react";

// Whether the field around an act is disabled. Base UI's field context is
// internal and its Button reads none, so a field hands its state to the acts
// inside it through this one.
export const FieldDisabled = createContext(false);
