#!/usr/bin/env python3
"""Validate the public War Chest landing's approved screenshot assets."""
from __future__ import annotations

import hashlib
import struct
import os
import sys
import zlib
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(os.environ.get("WAR_CHEST_LANDING_ROOT", Path(__file__).resolve().parents[1]))
EXPECTED = ["images/battle-1440.png", "images/chest-1440.png"]
APPROVED_SHA256 = {
    "images/battle-1440.png": "ffd2d258227eb6e07ec87fc855f140d4ac1619d0f03aaf17288290b4bb3bd0fc",
    "images/chest-1440.png": "7f69677ac28486f6b6b936baa6ec5b2589c023381d713477a25381462cd9d3be",
}


class LandingParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.images: list[dict[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "img":
            self.images.append({key: value or "" for key, value in attrs})


def png_size(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError(f"{path.relative_to(ROOT)} is not a PNG")
    offset = 8
    image_data = bytearray()
    saw_header = False
    saw_end = False
    while offset + 12 <= len(data):
        length = struct.unpack(">I", data[offset : offset + 4])[0]
        kind = data[offset + 4 : offset + 8]
        chunk = data[offset + 8 : offset + 8 + length]
        crc = struct.unpack(">I", data[offset + 8 + length : offset + 12 + length])[0]
        if zlib.crc32(kind + chunk) & 0xFFFFFFFF != crc:
            raise ValueError(f"{path.relative_to(ROOT)} has a bad PNG chunk checksum")
        if kind == b"IHDR":
            if length != 13 or saw_header:
                raise ValueError(f"{path.relative_to(ROOT)} has an invalid PNG header")
            width, height = struct.unpack(">II", chunk[:8])
            saw_header = True
        elif kind == b"IDAT":
            image_data.extend(chunk)
        elif kind == b"IEND":
            saw_end = True
            offset += length + 12
            break
        offset += length + 12
    if not saw_header or not saw_end or offset != len(data):
        raise ValueError(f"{path.relative_to(ROOT)} is truncated or has trailing data")
    zlib.decompress(image_data)
    return width, height


def main() -> int:
    parser = LandingParser()
    parser.feed((ROOT / "site/index.html").read_text())
    if [image.get("src") for image in parser.images] != EXPECTED:
        raise ValueError("landing must reference the battle and chest proof images in order")
    for image, relative in zip(parser.images, EXPECTED):
        if image.get("width") != "1440" or image.get("height") != "900" or not image.get("alt"):
            raise ValueError(f"{relative} needs intrinsic 1440x900 dimensions and useful alt text")
        path = ROOT / "site" / relative
        if hashlib.sha256(path.read_bytes()).hexdigest() != APPROVED_SHA256[relative]:
            raise ValueError(f"{relative} does not match the reviewed screenshot provenance")
        if png_size(path) != (1440, 900):
            raise ValueError(f"{relative} is not the approved 1440x900 source size")
    html = (ROOT / "site/index.html").read_text()
    if "width:100%; height:auto" not in html:
        raise ValueError("landing screenshots must preserve their intrinsic aspect ratio")
    provenance = (ROOT / "ASSETS.md").read_text()
    if "approved Banner & Steel" not in provenance or "1440×900" not in provenance:
        raise ValueError("landing screenshot approval provenance must remain documented")
    print("Landing checks passed: approved PNGs, 1440x900 dimensions, provenance, alt text and intrinsic ratio.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, zlib.error) as error:
        print(error, file=sys.stderr)
        raise SystemExit(1)
