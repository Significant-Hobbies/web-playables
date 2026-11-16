import type { PerkId } from "./model";

/** Original illustrated oath emblems; the surrounding controls stay Fleet components. */
export function PerkArt({ id }: { id: PerkId }) {
  const blade = (
    <>
      <path d="m63 13 13 18-9 52H51l-8-52Z" fill="#b6dce9" />
      <path d="m63 13 2 64H53l-3-44Z" fill="#effaff" strokeWidth="2" />
      <path d="M39 80h40l-3 11H42Z" fill="#f7c85d" />
      <path d="M53 91h13v23H53Z" fill="#a66841" />
      <path d="M50 110h19v9H50Z" fill="#f7c85d" />
      <path d="m53 96 13 6m-13 3 13 6" stroke="#563c3e" strokeWidth="3" />
    </>
  );
  return (
    <svg className={`perk-art perk-art-${id}`} viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <g stroke="#101d30" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
        {id === "edge" && <g transform="rotate(28 64 64)">{blade}</g>}
        {id === "tempo" && (
          <>
            <path d="M43 61 9 40l7 24 25 10L15 74l16 17 25-4Z" fill="#91e9dc" />
            <path d="m84 57 32-19-6 25-24 11 27 2-15 17-28-9Z" fill="#91e9dc" />
            <g transform="translate(12 0) scale(.82 1)">{blade}</g>
          </>
        )}
        {(id === "heart" || id === "renewal") && (
          <>
            <path
              d="M64 104 24 65C-3 36 36 9 64 37c28-28 67-1 40 28Z"
              fill={id === "renewal" ? "#61cba4" : "#f47784"}
            />
            <path d="M35 36c-13 1-16 13-9 21m12-16-4 5" stroke="#ffe3d4" strokeWidth="6" />
            {id === "heart" ? (
              <>
                <path d="M56 47h16v14h14v16H72v14H56V77H42V61h14Z" fill="#ffe299" strokeWidth="3" />
                <path d="m13 84-6 5m107-5 7 5M64 12V5" stroke="#ffc765" strokeWidth="4" />
              </>
            ) : (
              <>
                <path d="M69 111c-4-24 11-49 36-48 2 26-15 43-36 48Z" fill="#a8e976" />
                <path d="m72 107 23-29m-27 30c-7-28-26-40-43-31 4 22 21 33 43 31Z" fill="#6ea847" />
                <path d="m35 84 29 21" stroke="#c5f394" strokeWidth="3" />
              </>
            )}
          </>
        )}
        {id === "blood" && (
          <>
            <path d="M64 12C53 39 27 61 27 81a37 37 0 0 0 74 0c0-20-25-42-37-69Z" fill="#d4537c" />
            <path d="M52 45c-16 21-20 34-15 43" stroke="#ffb7b9" strokeWidth="7" />
            <path d="M62 58v16H46v15h16v16h15V89h15V74H77V58Z" fill="#ffe4a0" strokeWidth="3" />
          </>
        )}
        {(id === "bastion" || id === "ward" || id === "thorns") && (
          <>
            <path
              d="m64 14 38 15-4 42c-3 23-18 35-34 44-16-9-31-21-34-44l-4-42Z"
              fill={id === "ward" ? "#72c8e8" : "#a1b7c9"}
            />
            <path
              d="m64 26 26 10-3 33c-3 16-12 26-23 34-11-8-20-18-23-34l-3-33Z"
              fill={id === "ward" ? "#275d99" : "#315866"}
              strokeWidth="3"
            />
            {id === "bastion" && (
              <>
                <path d="m64 42 15 21-15 23-15-23Z" fill="#8ce1cc" />
                <path d="M64 43v41m-13-21h27" stroke="#d5ffdf" strokeWidth="2" />
              </>
            )}
            {id === "ward" && (
              <>
                <path
                  d="M12 49h36c19 0 19-20 7-20M7 67h61c22 0 25 26 9 26m-63-9h25"
                  stroke="#dcf9ff"
                  strokeWidth="7"
                />
                <path d="m105 41 17-11m-17 11 9 2m-9-2 3-9" stroke="#e8b66d" strokeWidth="4" />
              </>
            )}
            {id === "thorns" && (
              <>
                <path
                  d="M18 99c-5-45 96-23 87-76M23 79l-7-18 23 8m37-18 23 4-4-23M57 85l4 22 17-28"
                  stroke="#74bc71"
                  strokeWidth="7"
                />
                <path d="m52 51 12-13 12 13-12 12Z" fill="#9ce58c" strokeWidth="3" />
              </>
            )}
          </>
        )}
        {(id === "storm" || id === "chain" || id === "interrupt") && (
          <>
            <path d="M31 55c-24-13-9-42 12-35 7-22 42-22 48 0 29-3 36 31 13 37Z" fill="#7f8dd2" />
            <path d="M30 39c1-7 8-9 15-6 7-17 25-18 34-10" stroke="#c4caff" strokeWidth="5" />
            <path d="m67 43-27 40h24l-8 33 37-48H68l15-25Z" fill="#ffe27b" />
            {id === "chain" && (
              <>
                <path
                  d="m15 92 9-16 9 16-9 16Zm86-10 9-16 9 16-9 16Z"
                  fill="#cf9aff"
                  strokeWidth="3"
                />
                <path d="m30 86 16-12m42-2 15 9" stroke="#ce9fff" strokeWidth="6" />
              </>
            )}
            {id === "interrupt" && (
              <>
                <path
                  d="M17 107h22M93 111h22M13 67l11 5m82-8 10-5"
                  stroke="#d6a4ff"
                  strokeWidth="5"
                />
                <path d="m27 109 11 7m51 0 9-8" stroke="#ffe5a0" strokeWidth="4" />
              </>
            )}
          </>
        )}
        {(id === "cleave" || id === "pierce" || id === "execution") && (
          <>
            <path
              d="M15 93C33 43 76 23 116 33 85 35 48 65 31 112Z"
              fill={id === "cleave" ? "#ff9f70" : "#9bc8ee"}
            />
            <g transform="translate(10 0) rotate(35 64 64) scale(.87)">{blade}</g>
            {id === "pierce" && (
              <>
                <path
                  d="m89 65 17 9-5 17-17-9Zm10-25 17 9-5 17-17-9Z"
                  fill="#83ebd7"
                  strokeWidth="3"
                />
                <path d="m102 39 13-9-1 15" stroke="#e4ffec" strokeWidth="3" />
              </>
            )}
            {id === "execution" && (
              <>
                <path d="M78 79a18 18 0 1 1 30 13v13H81V92Z" fill="#e6d8bf" strokeWidth="3" />
                <path d="m85 86 6 5m12-5-6 5m-6 8v6m7-6v6" strokeWidth="3" />
              </>
            )}
          </>
        )}
      </g>
    </svg>
  );
}
