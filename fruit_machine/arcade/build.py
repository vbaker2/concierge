#!/usr/bin/env python3
"""Build fruit_machine/static/arcade.html (the widescreen arcade edition).

    python3 fruit_machine/arcade/build.py

Fills arcade.template.html with:
  /*@GM@*/      <- gm.js      (game maths, also used by sim.js)
  /*@SHARED@*/  <- shared.js  (sound, symbol art, effects, pot, topper bulbs, gamepad)
  <!--@DATA@--> <- the window.__ART / __SND / __FONT script blocks copied from static/index.html
"""
import os, re

HERE = os.path.dirname(os.path.abspath(__file__))
STATIC = os.path.join(HERE, "..", "static")

def read(p):
    with open(p, encoding="utf-8") as f:
        return f.read()

tpl = read(os.path.join(HERE, "arcade.template.html"))
gm = read(os.path.join(HERE, "gm.js"))
shared = read(os.path.join(HERE, "shared.js"))
index = read(os.path.join(STATIC, "index.html"))

blocks = []
for name in ("__ART", "__SND", "__FONT"):
    m = re.search(r"<script>window\." + name + r"=.*?</script>", index, flags=re.S)
    if not m:
        raise SystemExit("missing window.%s block in static/index.html" % name)
    blocks.append(m.group(0))

out = (tpl.replace("<!--@DATA@-->", "\n".join(blocks))
          .replace("/*@GM@*/", gm)
          .replace("/*@SHARED@*/", shared))
for marker in ("<!--@DATA@-->", "/*@GM@*/", "/*@SHARED@*/"):
    assert marker not in out, marker
dest = os.path.join(STATIC, "arcade.html")
with open(dest, "w", encoding="utf-8") as f:
    f.write(out)
print("wrote", os.path.relpath(dest), "%.1f MB" % (len(out) / 1e6))
