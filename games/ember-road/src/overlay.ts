import { createContext } from "react";

// A platform-owned panel temporarily owns the top layer. Keep each game dialog's
// state mounted so returning restores its choice, tab, or story beat.
export const OverlaySuspended = createContext(false);
