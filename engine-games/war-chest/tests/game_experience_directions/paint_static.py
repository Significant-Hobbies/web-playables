"""Render isolated UI storyboards from recorded drawing commands.

These images are design proposals, not screenshots, engine output or edits to
the asset sources. Existing licensed sprites are composed into the UI layouts.
"""
from pathlib import Path
import json
import math
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "artifacts/game-experience-2026-10-03"
S = 2
FONTS = {
    "sans": "/System/Library/Fonts/Avenir Next.ttc",
    "serif": "/System/Library/Fonts/Supplemental/Georgia.ttf",
    "mono": "/System/Library/Fonts/Menlo.ttc",
}
REGIONS = {
    "rowan": (0,0,362,397), "lysa": (362,0,362,397),
    "fen": (724,0,362,397), "merrin": (1086,0,362,397),
    "skeleton": (734,397,352,320), "standard": (1114,717,334,369),
}
ATLAS = Image.open(ROOT / "assets/banner-steel/company-atlas.png").convert("RGBA")

def color(v):
    return tuple(round(max(0,min(1,x))*255) for x in v)

def xy(v):
    return tuple(round(x*S) for x in v)

def bounds(r):
    x,y,w,h = r
    return xy((x,y,x+w,y+h))

def render(data):
    canvas = Image.new("RGB", (1440*S,900*S), "#15282b")
    pen = ImageDraw.Draw(canvas, "RGBA")
    for p in data["primitives"]:
        k=p["kind"]; c=color(p["color"]); width=max(1,round(p.get("width",1)*S))
        if k=="rect":
            pen.rectangle(bounds(p["rect"]), fill=c if p.get("filled",True) else None,
                          outline=None if p.get("filled",True) else c, width=width)
        elif k=="line": pen.line([xy(p["from"]),xy(p["to"])],fill=c,width=width)
        elif k=="circle":
            x,y=p["at"];r=p["radius"]; b=xy((x-r,y-r,x+r,y+r))
            pen.ellipse(b,fill=c if p.get("filled",True) else None,outline=None if p.get("filled",True) else c,width=width)
        elif k=="polygon": pen.polygon([xy(q) for q in p["points"]],fill=c)
        elif k=="arc":
            x,y=p["at"];r=p["radius"]
            points=[xy((x+math.cos(a)*r,y+math.sin(a)*r)) for a in [p["start"]+(p["end"]-p["start"])*i/100 for i in range(101)]]
            pen.line(points,fill=c,width=width)
    for p in data["controls"]:
        k=p["kind"];x,y,w,h=p["rect"]
        if k=="box":
            pen.rectangle(bounds(p["rect"]),fill=color(p["color"]))
            if p["width"] and p["edge"][3]:
                pen.rectangle(bounds(p["rect"]),outline=color(p["edge"]),width=round(p["width"]*S))
        elif k=="text":
            family=p["family"];size=round(p["point"]*S)
            font=ImageFont.truetype(FONTS[family],size,index=5 if family=='sans' else 0)
            # Whole words fit the supplied box; preserve authored hard line breaks.
            lines=[]
            value=p["text"].replace("→", ">").replace("● ● ● ● ● ●", "6 ORDERS")
            for paragraph in value.split("\n"):
                line=""
                for word in paragraph.split(" "):
                    candidate=(line+" "+word).strip()
                    if line and font.getlength(candidate)>w*S:
                        lines.append(line);line=word
                    else:line=candidate
                lines.append(line)
            line_height=round(p["point"]*1.25*S)
            for i,line in enumerate(lines):
                pen.text(xy((x,y+i*line_height/S)),line,font=font,fill=color(p["color"]),anchor="lt")
        elif k=="actor":
            sx,sy,sw,sh=REGIONS[p["id"]]
            sprite=ATLAS.crop((sx,sy,sx+sw,sy+sh))
            ratio=min(w/sw,h/sh)
            target=(round(sw*ratio*S),round(sh*ratio*S))
            sprite=sprite.resize(target,Image.Resampling.LANCZOS)
            canvas.paste(sprite,(round((x+(w-sw*ratio)/2)*S),round(y*S)),sprite)
        elif k=="glyph":
            # Diagram symbols only, preserving the established semantic shapes.
            c=color(p["color"]);cx=x+w/2;cy=y+h/2
            if p["id"] in ("ward","guard"):
                pen.polygon([xy((cx-w*.3,cy-h*.35)),xy((cx+w*.3,cy-h*.35)),xy((cx+w*.25,cy+h*.15)),xy((cx,cy+h*.4)),xy((cx-w*.25,cy+h*.15))],fill=c)
            elif p["id"] in ("cube","staff"):
                pen.polygon([xy((cx+5,cy-h*.4)),xy((cx-w*.3,cy+2)),xy((cx-2,cy+2)),xy((cx-7,cy+h*.4)),xy((cx+w*.3,cy-8)),xy((cx+4,cy-8))],fill=c)
            elif p["id"]=="cleave":
                pen.line([xy((cx-w*.3,cy+h*.35)),xy((cx+w*.3,cy-h*.4))],fill=c,width=round(w*.14*S))
            else:
                for dx in [-w*.2,0,w*.2]:
                    pen.line([xy((cx+dx-10,cy+15)),xy((cx+dx+10,cy-15))],fill=c,width=3*S)
    return canvas.resize((1440,900),Image.Resampling.LANCZOS)

metadata=[]
for path in sorted(OUT.glob("*-drawing.json")):
    data=json.loads(path.read_text())
    image=render(data)
    key=f'{data["direction"]}-{data["context"]}'
    for width,height in [(1440,900),(1152,720)]:
        target=OUT/f"{key}-{width}x{height}.png"
        image.resize((width,height),Image.Resampling.LANCZOS).save(target)
        metadata.append({"path":str(target.relative_to(ROOT)),"method":"static UI storyboard from drawing records; not a native screenshot","width":width,"height":height,"resizedFrom":[1440,900] if width==1152 else None,"nativeRender":"blocked"})
(OUT/"static-capture-evidence.json").write_text(json.dumps(metadata,indent=2))
print(f"Rendered {len(metadata)} labelled static direction boards; native evidence remains blocked.")

# Paired landing composition boards. These preserve the proposal's HTML
# hierarchy; they are labelled static compositions, not browser screenshots.
schemes=[
 ("a-crossing","WORLD FIRST","#102a30","#efe8d6","#e9b85f"),
 ("b-table","PLAN EVERY CONSEQUENCE","#e8dfc9","#15282b","#9d4133"),
 ("c-road","TRAVEL WITH THE COMPANY","#251e29","#f3e4cc","#e4b471"),
]
for key,thesis,bg,ink,accent in schemes:
    page=Image.new("RGB",(1280,1150),bg);d=ImageDraw.Draw(page)
    serif=lambda size:ImageFont.truetype(FONTS["serif"],size)
    sans=lambda size:ImageFont.truetype(FONTS["sans"],size,index=5)
    mono=lambda size:ImageFont.truetype(FONTS["mono"],size)
    d.text((64,25),"War Chest",font=serif(27),fill=ink)
    d.text((898,29),"LOCAL PROTOTYPE · macOS",font=mono(13),fill=accent)
    d.line((64,72,1216,72),fill=accent,width=1)
    d.text((64,99),thesis,font=mono(15),fill=accent)
    if key=="b-table":
        d.text((64,141),"Open the gate.",font=serif(53),fill=ink)
        d.text((64,201),"Bring everyone home.",font=serif(53),fill=ink)
        d.text((753,153),"A story tactics prototype for Mac.",font=sans(18),fill=ink)
        d.text((753,189),"Lead Rowan, Lysa and Fen through",font=sans(18),fill=ink)
        d.text((753,225),"a winter campaign. Defend the families.",font=sans(18),fill=ink)
    elif key=="c-road":
        title="Open the gate. Bring everyone home."
        font=serif(49);left=(1280-font.getlength(title))/2
        d.text((left,150),title,font=font,fill=ink)
        copy="A story tactics prototype for Mac. Lead Rowan, Lysa and Fen."
        font=sans(19);d.text(((1280-font.getlength(copy))/2,223),copy,font=font,fill=ink)
    else:
        d.text((64,141),"Open the gate. Bring everyone home.",font=serif(51),fill=ink)
        d.text((64,224),"A story tactics prototype for Mac. Defend the families and recover their stolen wages.",font=sans(19),fill=ink)
    d.rectangle((64,280,343,327),fill=accent)
    d.text((79,294),"Explore this direction >",font=sans(18),fill=bg)
    battle=Image.open(OUT/f"{key}-battle-1440x900.png").resize((1152,720),Image.Resampling.LANCZOS)
    page.paste(battle,(64,354))
    d.text((64,1095),"STATIC LANDING COMPOSITION · proposed identity · not a browser screenshot or playable demo",font=mono(13),fill=accent)
    page.save(OUT/f"{key}-landing-static-1280x1150.png")
print("Rendered three explicitly labelled paired landing composition boards.")
