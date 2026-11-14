#!/usr/bin/env python3
"""Source checks for the paired teaser; rendered layout remains a separate gate."""
from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


@dataclass
class Element:
    tag: str
    attrs: dict[str, str]
    content: list[Element | str] = field(default_factory=list)

    def text(self) -> str:
        return " ".join(part.text() if isinstance(part, Element) else part for part in self.content)

    def has_class(self, name: str) -> bool:
        return name in self.attrs.get("class", "").split()


class Page(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.root = Element("document", {})
        self.stack = [self.root]
        self.elements: list[Element] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        element = Element(tag, {key: value or "" for key, value in attrs})
        self.stack[-1].content.append(element)
        self.elements.append(element)
        if tag not in VOID:
            self.stack.append(element)

    def handle_endtag(self, tag: str) -> None:
        if tag in VOID:
            return
        if len(self.stack) == 1 or self.stack[-1].tag != tag:
            raise ValueError(f"unmatched closing tag: {tag}")
        self.stack.pop()

    def handle_data(self, data: str) -> None:
        self.stack[-1].content.append(data)

    def tag(self, tag: str) -> list[Element]:
        return [element for element in self.elements if element.tag == tag]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def luminance(hex_color: str) -> float:
    channels = [int(hex_color[index:index + 2], 16) / 255 for index in (1, 3, 5)]
    linear = [value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4 for value in channels]
    return sum(value * weight for value, weight in zip(linear, (.2126, .7152, .0722)))


def main() -> int:
    html = (ROOT / "site/index.html").read_text()
    page = Page()
    page.feed(html)
    require(len(page.stack) == 1, "unclosed HTML element")
    require(len(page.tag("main")) == 1 and len(page.tag("h1")) == 1, "one main landmark and one h1 required")
    require(page.tag("html")[0].attrs.get("lang") == "en", "document language required")
    ids = [element.attrs["id"] for element in page.elements if "id" in element.attrs]
    require(len(ids) == len(set(ids)), "duplicate section/label id")
    by_id = {element.attrs["id"]: element for element in page.elements if "id" in element.attrs}
    for element in page.elements:
        for label in element.attrs.get("aria-labelledby", "").split():
            require(label in by_id and bool(by_id[label].text().strip()), "section label must resolve to real text")
    for link in page.tag("a"):
        href = link.attrs.get("href", "")
        require(href.startswith("#") and href[1:] in by_id, "teaser links must lead to an existing page section")
        require(bool(link.text().strip()), "links need a readable label")
        require("download" not in link.attrs, "no public game download is available")
    primary = [link for link in page.tag("a") if link.has_class("primary")]
    require(len(primary) == 1 and primary[0].attrs["href"] == "#campaign", "primary action must explore the actual campaign section")
    destination = by_id[primary[0].attrs["href"][1:]]
    require(destination.tag == "section" and len(destination.text().split()) > 60, "campaign destination must contain a useful campaign explanation")
    require(primary[0].text().strip() == "Explore the campaign", "primary action must describe its local destination")
    availability = [element for element in page.elements if element.has_class("availability")]
    require(len(availability) == 1 and page.elements.index(availability[0]) < page.elements.index(primary[0]), "availability must appear before the primary action")
    require("local game prototype" in availability[0].text().lower() and "no public game build is available" in availability[0].text().lower(), "prototype lifecycle must be explicit")
    require("in development" in page.tag("header")[0].text().lower(), "header must identify development status")
    require(page.tag("a")[0].has_class("skip") and page.tag("a")[0].attrs["href"] == "#main", "keyboard skip link must lead to main")
    images = page.tag("img")
    require([image.attrs.get("src") for image in images] == ["images/battle-1440.png", "images/chest-1440.png"], "preserve the existing battle/chest proof references and order")
    for image in images:
        require(image.attrs.get("width") == "1440" and image.attrs.get("height") == "900", "images need reviewed intrinsic dimensions")
        require("earlier" in image.attrs.get("alt", "").lower(), "alt text must not depict the redesign as current")
    captions = page.tag("figcaption")
    require(len(captions) == 2 and all("earlier prototype" in caption.text().lower() for caption in captions), "both images must disclose earlier prototype status")
    require("width:100%; height:auto" in html, "preserve image aspect ratio")
    require(not page.tag("script"), "static teaser must not add analytics or runtime scripts")
    css = page.tag("style")[0].text()
    tokens = dict(re.findall(r"--([a-z]+):\s*(#[0-9a-fA-F]{6})", css))
    for foreground, background in [("paper", "river"), ("stone", "river"), ("gold", "river"), ("paper", "forest"), ("gold", "forest")]:
        light, dark = sorted((luminance(tokens[foreground]), luminance(tokens[background])), reverse=True)
        require((light + .05) / (dark + .05) >= 4.5, f"{foreground}/{background} text contrast below 4.5:1")
    require("a:focus-visible" in css and "outline:3px solid var(--gold)" in css, "keyboard focus must remain visible")
    require("@media (max-width:760px)" in css and "grid-template-columns:1fr;" in css, "paired content needs a single-column narrow-screen fallback")
    print("TEASER CHECKS PASSED: real anchor handoff, lifecycle, semantic labels, preserved image references, intrinsic ratio, text contrast and keyboard focus. Browser rendering remains unverified.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, KeyError, IndexError) as error:
        print(f"TEASER CHECK FAILED: {error}", file=sys.stderr)
        raise SystemExit(1)
