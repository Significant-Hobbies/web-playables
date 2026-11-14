"""Isolated review pages; never packaged into the game or production site."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "artifacts/game-experience-2026-10-03"
OUT.mkdir(parents=True, exist_ok=True)
DIRECTIONS = {
    "a-crossing": ("A", "The Last Crossing", "World first", "Make the people, gate and threat tangible. Select a companion in the world; issue a contextual order; watch the crossing change.", "#102a30", "#efe8d6", "#e9b85f"),
    "b-table": ("B", "The Captain’s Table", "Plan every consequence", "Read the whole battlefield as a tactical board. Follow attack arrows, preview the result, and spend the company’s orders deliberately.", "#e8dfc9", "#15282b", "#9d4133"),
    "c-road": ("C", "The Company Road", "Travel with the company", "Stay close to Rowan, Lysa and Fen. Defend the wall through an intimate side-view journey, then return to a living camp.", "#251e29", "#f3e4cc", "#e4b471"),
}
BASE = """
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:'Avenir Next',Arial,sans-serif}
header{max-width:1184px;margin:auto;padding:25px 24px;display:flex;justify-content:space-between;gap:24px;border-bottom:1px solid color-mix(in srgb,var(--ink) 20%,transparent)}
.brand{font-family:Georgia,serif;font-size:24px;font-weight:bold}.status{font-size:13px;color:var(--accent);letter-spacing:.06em}
main{max-width:1184px;margin:auto;padding:0 24px}.intro{padding:46px 0 34px}.eyebrow{color:var(--accent);font-size:13px;letter-spacing:.12em;text-transform:uppercase}
h1{font-family:Georgia,serif;font-size:clamp(36px,4.1vw,57px);line-height:1.04;max-width:850px;margin:17px 0 20px;letter-spacing:-.02em}
p{font-size:18px;line-height:1.6;max-width:650px;margin:0 0 21px}
a{color:inherit}a:focus-visible{outline:3px solid var(--accent);outline-offset:5px}.action{display:inline-block;text-decoration:none;background:var(--accent);color:var(--bg);padding:13px 21px;font-weight:bold}
figure{margin:0 0 43px}img{display:block;width:100%;height:auto;border:1px solid color-mix(in srgb,var(--ink) 24%,transparent)}
figcaption{font-size:14px;line-height:1.6;margin:12px 0;color:var(--ink)}.second{padding:24px 0 20px;border-top:1px solid color-mix(in srgb,var(--ink) 20%,transparent)}
h2{font:34px/1.15 Georgia,serif;max-width:800px;margin:10px 0 18px}footer{max-width:1184px;margin:auto;padding:26px 24px 42px;font-size:13px;line-height:1.6;opacity:.8}
.table .intro{display:grid;grid-template-columns:1.3fr 1fr;gap:45px;align-items:center}.table .intro h1{font-size:51px}.table .intro .copy{padding-top:24px}.table .eyebrow{font-family:Menlo,monospace}
.road .intro{text-align:center;padding:47px 0 33px}.road h1,.road p{margin-left:auto;margin-right:auto}.road h1{max-width:1000px;font-style:italic}.road figure{max-width:1040px;margin-left:auto;margin-right:auto}
@media(max-width:760px){header{padding:21px 18px}.status{max-width:145px}main{padding:0 18px}.intro{padding-top:32px}.table .intro{display:block}.table .intro h1{font-size:38px}.table .intro .copy{padding-top:0}.road .intro{text-align:left}.road h1{font-style:normal}h2{font-size:28px}p{font-size:17px}}
"""
for key, (letter, title, thesis, description, bg, ink, accent) in DIRECTIONS.items():
    body_class = "table" if key == "b-table" else "road" if key == "c-road" else "crossing"
    html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>{letter} · {title} · War Chest direction preview</title><style>:root{{--bg:{bg};--ink:{ink};--accent:{accent}}}{BASE}</style></head>
<body class="{body_class}"><header><span class="brand">War Chest</span><span class="status">LOCAL PROTOTYPE · macOS<br>DIRECTION {letter} · PRESENTATION PROPOSAL</span></header><main>
<section class="intro"><div><div class="eyebrow">{thesis}</div><h1>Open the gate.<br>Bring everyone home.</h1></div><div class="copy"><p>A story tactics prototype for Mac. Lead Rowan, Lysa and Fen through a winter campaign. Defend the families, recover their stolen wages, and decide what your company stands for.</p><a class="action" href="#mission">Explore this direction ↓</a></div></section>
<figure id="mission"><img src="{key}-battle-1440x900.png" width="1440" height="900" alt="Direction {letter}: proposed native Lantern Gate battle presentation"><figcaption>{description} This is a rendered design proposal, not a playable demo.</figcaption></figure>
<section class="second"><div class="eyebrow">After the Lantern Gate</div><h2>The families are safe. Lysa’s brother is still missing.</h2><p>Return to camp with the company at level 2. Fit the recovered storm rune beside a weapon in the chest, then follow Ivo’s trail.</p><figure><img src="{key}-camp-1440x900.png" width="1440" height="900" alt="Direction {letter}: proposed camp, company level reward and storm-rune packing"><figcaption>The same real story, company and earned reward in every direction. No accounts, payments or daily obligations.</figcaption></figure></section>
</main><footer>Private comparison preview · native Godot game in development · unsigned local prototype · no public game download or commercial release.<br>The landing page and game use the same proposed identity. Selection is pending; production screens remain unchanged.</footer></body></html>"""
    (OUT / f"{key}.html").write_text(html)

items = []
for key, (letter, title, thesis, description, bg, ink, accent) in DIRECTIONS.items():
    items.append(f"""<section style="padding:35px 0;border-bottom:1px solid #bbb"><h2>{letter} · {title}</h2><p>{description}</p><a href="{key}.html">Paired landing HTML proposal</a> · <a href="{key}-landing-static-1280x1150.png">Static paired identity board</a><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px"><a href="{key}-battle-1440x900.png"><img style="width:100%" src="{key}-battle-1440x900.png" alt="Battle direction {letter}"></a><a href="{key}-camp-1440x900.png"><img style="width:100%" src="{key}-camp-1440x900.png" alt="Camp direction {letter}"></a></div></section>""")
(OUT / "index.html").write_text(f"""<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>War Chest · experience directions</title><body style="margin:0;background:#efe8d6;color:#15282b;font-family:'Avenir Next',Arial,sans-serif"><main style="max-width:1300px;margin:auto;padding:40px 25px"><h1 style="font:48px Georgia,serif">Make the purpose visible.</h1><p>Three native presentation proposals: Lantern Gate opening → earned storm rune → camp. These are static rendered probes, not new playable builds.</p><p><strong>Recommendation: A.</strong> The people, defended gate and useful actions live in the same world. B favors planning; C favors intimate story staging.</p>{''.join(items)}</main></body></html>""")
print("Wrote three paired landing probes and comparison page; production site untouched.")
