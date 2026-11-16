import type { Loadout } from "./model";

/** Original inventory artwork; controls and containers remain Fleet components. */
export function LoadoutArt({ slot, id }: { slot: keyof Loadout; id: string }) {
  return (
    <svg className={`loadout-art art-${id}`} viewBox="0 0 160 160" fill="none" aria-hidden="true">
      <ellipse cx="80" cy="139" rx="43" ry="8" fill="#253443" opacity=".15" />
      <g stroke="#253041" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
        {slot === "weapon" && (
          <g transform={id === "greatsword" ? "translate(-5 -6) scale(1.08)" : undefined}>
            {id === "spear" ? (
              <>
                <path d="m40 133 64-86" stroke="#a76f43" strokeWidth="11" />
                <path d="m104 52-12-14 35-25-7 43Z" fill="#d4ecf1" />
                <path d="m98 43 20-17" stroke="#fff8df" strokeWidth="4" />
                <path d="m91 57 20 14" stroke="#edc45c" strokeWidth="8" />
                <path d="m43 120 10 8" stroke="#f4d78a" />
              </>
            ) : (
              <>
                <path
                  d="m58 99-13-15 55-63 28-8-7 28Z"
                  fill={id === "greatsword" ? "#9eb6d4" : "#c0dfe7"}
                />
                <path d="m58 88 57-63" stroke="#fff7d9" strokeWidth="7" />
                <path d="m39 79 29 25-8 9-29-25Z" fill="#f1bf4c" />
                <path d="m43 101-18 23 12 10 19-22" fill="#a86141" />
                <path d="m24 125 13 10" stroke="#f3c153" strokeWidth="10" />
              </>
            )}
          </g>
        )}
        {slot === "armor" &&
          (id === "cloak" ? (
            <>
              <path d="M57 35q23-30 46 0l29 97-52-12-52 12Z" fill="#63a689" />
              <path d="m57 35 23 26 23-26-23 85Z" fill="#315c65" />
              <path d="M63 32q17-16 34 0L80 53Z" fill="#263e51" />
              <path d="m41 112 15-50m63 50-15-50" stroke="#9ed3a7" />
              <circle cx="80" cy="58" r="6" fill="#efc461" />
            </>
          ) : (
            <>
              <path
                d="m52 30-25 16 8 31 16-8-6 60h70l-6-60 16 8 8-31-25-16-14 13H66Z"
                fill={id === "plate" ? "#8ba9d1" : "#a1b8bd"}
              />
              <path
                d="m52 30 14 13h28l14-13-7 46-21 17-21-17Z"
                fill={id === "plate" ? "#bbd4e9" : "#d1ded9"}
              />
              <path d="m46 115 34 9 34-9M80 48v41" stroke="#edc25f" strokeWidth="7" />
              <path d="m69 63 11-7 11 7-4 14H73Z" fill="#e8b74d" />
              {id === "plate" && (
                <path d="m31 47 19-9-1 27-14 7m94-25-19-9 1 27 14 7" fill="#e6bc5a" />
              )}
            </>
          ))}
        {slot === "skill" &&
          (id === "aegis" ? (
            <>
              <path d="m80 17 45 19-5 54q-8 29-40 46-32-17-40-46l-5-54Z" fill="#678dd1" />
              <path d="m80 29 31 14-4 45q-6 20-27 34-21-14-27-34l-4-45Z" fill="#bcd9f2" />
              <path d="m80 46 10 20 22 3-16 16 4 22-20-11-20 11 4-22-16-16 22-3Z" fill="#f5cf66" />
            </>
          ) : id === "volley" ? (
            <>
              <path d="M44 25q86 29 35 102" stroke="#b37947" strokeWidth="12" />
              <path d="m44 25 35 102" stroke="#f8e7bd" strokeWidth="3" />
              <path d="m32 113 79-79m-52 88 66-66m-95 35 59-59" stroke="#d7f0ee" strokeWidth="8" />
              <path d="m100 31 21-9-8 22m1 10 21-8-8 21M78 30l19-9-8 20" fill="#91c6e3" />
            </>
          ) : (
            <>
              <path
                d="M29 72q-5-35 40-43 49-8 64 29M124 91q-9 40-63 37-28-2-38-20"
                stroke="#7dcde4"
                strokeWidth="14"
              />
              <path d="m119 39 15 21-25 5M42 117l-22-10 11-20" fill="#b7e8ee" />
              <path d="m58 100-12-14 45-51 24-7-6 25Z" fill="#e0edf0" />
              <path d="m40 82 29 26m-27 2-12 15" stroke="#f0bf52" strokeWidth="10" />
            </>
          ))}
      </g>
    </svg>
  );
}
