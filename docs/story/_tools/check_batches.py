# -*- coding: utf-8 -*-
"""校验批次完整性：统计每批行数、seq 范围、全书覆盖缺口"""
import os, re, json, glob

BATCH_DIR = r"D:\codes\hycbox\v1\hycBox\docs\story\batches"
STORY = os.path.dirname(BATCH_DIR)
files = sorted(glob.glob(os.path.join(BATCH_DIR, 'batch_*.md')))
print('批次文件数:', len(files))

meta, allseq = [], set()
for f in files:
    txt = open(f, encoding='utf-8').read()
    lines = txt.splitlines()
    rows = []
    for l in lines:
        m = re.match(r'^\|\s*(\d+)\s*\|\s*(\d+)\s*\|', l)
        if m:
            rows.append((int(m.group(1)), int(m.group(2))))
    for s, _ in rows:
        allseq.add(s)
    rng = (rows[0][0], rows[-1][0]) if rows else None
    # 抓本批头部元信息
    hd = [l.strip() for l in lines[:10] if l.strip().startswith('-')]
    meta.append({'file': os.path.basename(f), 'rows': len(rows),
                 'seqStart': rng[0] if rng else None, 'seqEnd': rng[1] if rng else None,
                 'kb': len(txt) // 1024, 'head': hd})
    print('%-16s rows=%-3d seq=%s size=%dKB' % (os.path.basename(f), len(rows), rng, len(txt) // 1024))

missing = [i for i in range(1, 2212) if i not in allseq]
dup = len([s for s, _ in [(s, 0) for s in allseq]])  # placeholder
print()
print('覆盖 seq 总数:', len(allseq), '（应为 2211）')
print('缺失 seq 数:', len(missing), '样例:', missing[:30])
json.dump(meta, open(os.path.join(STORY, 'batches_meta.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
print('meta 已写入 batches_meta.json')
