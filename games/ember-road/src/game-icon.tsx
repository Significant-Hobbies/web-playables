export type GameIconKind =
  | "battle"
  | "equipment"
  | "company"
  | "pet"
  | "skills"
  | "quests"
  | "daily"
  | "weekly"
  | "gold"
  | "rewards";

/** Original game artwork. Fleet buttons and dialogs own the surrounding controls. */
export function GameIcon({ kind }: { kind: GameIconKind }) {
  return (
    <svg
      className={`game-icon game-icon-${kind}`}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      <g stroke="#171a24" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
        {kind === "battle" && (
          <>
            <path d="m19 12 19 4 42 56-15 12-44-54Z" fill="#b9c8dc" />
            <path d="m21 13 10 16 39 49 10-6-42-56Z" fill="#fff4cf" strokeWidth="2" />
            <path d="m81 12-19 4-42 56 15 12 44-54Z" fill="#dce9ec" />
            <path d="m80 13-11 16-39 49-10-6 42-56Z" fill="#fff8e3" strokeWidth="2" />
            <path d="m12 63 25 19-8 10L5 73Zm76 0L63 82l8 10 24-19Z" fill="#edb84a" />
            <path d="m17 79-7 10m73-10 7 10" stroke="#ad6933" strokeWidth="10" />
          </>
        )}
        {kind === "equipment" && (
          <>
            <path d="M17 71V47C17 27 29 14 50 10c21 4 33 17 33 37v24L63 87H37Z" fill="#8497b9" />
            <path
              d="M24 47c3-16 12-23 26-27 15 4 24 11 26 27L50 36Z"
              fill="#bfd2df"
              strokeWidth="3"
            />
            <path d="M18 56 50 44l32 12-7 29-25 8-25-8Z" fill="#eec454" />
            <path d="M29 61 50 54l21 7-4 15-17 7-17-7Z" fill="#273c64" />
            <path d="M42 59v17m16-17v17" stroke="#c0d1e6" strokeWidth="5" />
          </>
        )}
        {kind === "company" && (
          <>
            <path d="m14 84 5-24 17-7h28l17 7 5 24Z" fill="#449b9b" />
            <path d="M27 43V27C27 11 73 11 73 27v16L61 61H39Z" fill="#a4b6cb" />
            <path d="M28 31h44v15H28Z" fill="#223047" />
            <path d="M40 36v6m20-6v6" stroke="#fff9de" strokeWidth="5" />
            <path d="m28 51 22 11 22-11-7 24H35Z" fill="#f4933d" />
            <path d="m20 64 16 8m44-8-16 8" stroke="#b8dbda" strokeWidth="4" />
          </>
        )}
        {kind === "pet" && (
          <>
            <path d="m18 35-4-25 27 18 18-1L85 8l-4 29 6 23-23 27H36L13 60Z" fill="#f69b37" />
            <path d="m19 17 15 15-14 5m59-20L64 32l14 5" fill="#8e513a" strokeWidth="3" />
            <path d="m21 54 29 12 29-12-14 26-15 9-15-9Z" fill="#ffe6a9" strokeWidth="3" />
            <path d="m43 62 7 9 7-9Z" fill="#302f39" strokeWidth="2" />
            <path d="m28 46 8 3m28-3-8 3" strokeWidth="5" />
            <path d="m28 82 22 9 22-9" stroke="#5baf84" strokeWidth="7" />
          </>
        )}
        {kind === "skills" && (
          <>
            <path d="m10 28 35-8 12 64-35 7Z" fill="#43b9e4" />
            <path d="m59 17 31 12-20 61-31-12Z" fill="#b675e6" />
            <path d="M32 8h38v75H32Z" fill="#f9c74e" />
            <path d="M39 16h24v56H39Z" fill="#f5a83c" strokeWidth="2" />
            <path d="m54 23-14 26h12l-5 17 17-27H52Z" fill="#fff2ac" strokeWidth="3" />
          </>
        )}
        {kind === "quests" && (
          <>
            <path d="m21 16 57 8-8 68-57-8Z" fill="#5490da" />
            <path d="m29 12 57 8-8 68-57-8Z" fill="#b3d5ef" />
            <path d="m36 25 39 5-5 45-39-5Z" fill="#fff1d5" strokeWidth="3" />
            <path d="m44 12 20 3-1 12-20-3Z" fill="#929faa" />
            <path d="m39 44 6 6 10-11m2 16 11 1m-30 9 20 2" stroke="#719d70" strokeWidth="4" />
          </>
        )}
        {kind === "daily" && (
          <>
            <rect x="13" y="21" width="75" height="67" rx="9" fill="#fff2d8" />
            <path d="M13 47V30q0-9 9-9h57q9 0 9 9v17Z" fill="#ef7064" />
            <path d="M29 13v18m43-18v18" stroke="#a8c5d9" strokeWidth="9" />
            <path d="m31 65 13 11 23-25" stroke="#699c59" strokeWidth="12" />
            <path d="m30 62 14 10 22-24" stroke="#a0d97b" strokeWidth="5" />
          </>
        )}
        {kind === "weekly" && (
          <>
            <path d="m21 80 9-34 25 25Z" fill="#a575dd" />
            <path d="m32 39 28 29 16-19-28-29Z" fill="#eb7fbe" />
            <path
              d="M52 15c-4 9 12 11 8 22m11-22c-14 4 4 13-3 21M23 30l-9 9m65-7 8 4m-7 36 4 9"
              stroke="#ffcf57"
              strokeWidth="6"
            />
            <path d="m23 71 15 9m-8-25 14 12" stroke="#7ac6f0" strokeWidth="6" />
          </>
        )}
        {kind === "gold" && (
          <>
            <circle cx="50" cy="50" r="38" fill="#f3c53f" />
            <circle cx="50" cy="50" r="28" stroke="#fff09b" strokeWidth="6" />
            <path
              d="m50 25 8 16 18 3-13 13 3 18-16-9-16 9 3-18-13-13 18-3Z"
              fill="#ffe497"
              stroke="#be7a35"
              strokeWidth="3"
            />
          </>
        )}
        {kind === "rewards" && (
          <>
            <path d="M12 43h76v43H12Z" fill="#b24f41" />
            <path d="M12 43V28q0-12 12-12h52q12 0 12 12v15Z" fill="#dd7255" />
            <path d="M26 17h10v69H26Zm38 0h10v69H64Z" fill="#f5c752" />
            <path d="M12 48h76" stroke="#74452f" strokeWidth="7" />
            <path d="m42 43 8-5 8 5v19l-8 5-8-5Z" fill="#ffe388" />
            <path d="M50 48v9" strokeWidth="4" />
          </>
        )}
      </g>
    </svg>
  );
}
