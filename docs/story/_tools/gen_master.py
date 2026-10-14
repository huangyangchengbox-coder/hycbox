# -*- coding: utf-8 -*-
"""合并 45 批为全书合订本 + 生成全书剧情总纲"""
import os, re, glob

STORY = r"D:\codes\hycbox\v1\hycBox\docs\story"
BATCH = os.path.join(STORY, "batches")

parts = []
first = os.path.join(STORY, "章节梗概-第01批.md")
if os.path.exists(first):
    parts.append(("第01批  seq 1–20", first))
for f in sorted(glob.glob(os.path.join(BATCH, "batch_*.md"))):
    parts.append((os.path.basename(f).replace(".md", ""), f))

print("参与合并的批次:", len(parts))

full = ["# 《凡人修仙传》章节梗概 × 游戏情节设计 · 全书合订", "",
        "> 覆盖实物顺序 seq 1–2211（全书 2211 章 / 8 卷块），共 45 批。",
        "> 源文本原章号存在跳号错乱，一律以 seq（实物顺序）为准。",
        "> 全部梗概为**原创改写**，不含原文摘录。", "", "---"]

outline = ["# 《凡人修仙传》全书剧情总纲", "",
           "> 由 45 批逐章梗概归并而成，用于游戏剧情节点的编译来源。", "",
           "| 批次 | 覆盖 seq | 游戏映射 | 剧情弧 |", "|------|---------|---------|--------|"]

for name, f in parts:
    lines = open(f, encoding="utf-8").read().splitlines()
    body = ["## " + l[2:] if l.startswith("# ") else l for l in lines]
    full += ["", "---", "", "\n".join(body)]

    def grab(key):
        for l in lines:
            if l.strip().startswith("- **" + key):
                return l.strip().lstrip("- ").replace("**", "")
        return ""

    span = ""
    for l in lines:
        m = re.search(r"seq\s*([\d]+)[–\-~]([\d]+)", l)
        if m:
            span = "%s–%s" % (m.group(1), m.group(2)); break
    outline.append("| %s | %s | %s | %s |" % (
        name, span, grab("游戏映射").replace("游戏映射：", "")[:40],
        grab("剧情弧").replace("剧情弧：", "")[:110]))

    units = [l.strip() for l in lines if re.match(r"^###\s", l.strip())]
    if units:
        outline += ["", "**%s 剧情单元**：" % name]
        for u in units:
            outline.append("- " + u.lstrip("# ").strip())
        outline.append("")

p1 = os.path.join(STORY, "凡人修仙传-章节梗概全书.md")
p2 = os.path.join(STORY, "全书剧情总纲.md")
open(p1, "w", encoding="utf-8").write("\n".join(full))
open(p2, "w", encoding="utf-8").write("\n".join(outline))
print("合订本:", p1, len("\n".join(full)), "字符")
print("总纲:", p2, len("\n".join(outline)), "字符")
