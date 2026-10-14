# -*- coding: utf-8 -*-
import re
SRC = r"D:\play_joy\novel\《凡人修仙传》 - 忘语.txt"
text = open(SRC, 'rb').read().decode('gb18030', 'replace')
lines = text.splitlines()

def show(kw, limit=6):
    print('=== 含 %s 的行 ===' % kw)
    cnt = 0
    for i, l in enumerate(lines):
        if kw in l:
            print(i+1, '|len=%d|' % len(l.strip()), l.strip()[:90])
            cnt += 1
            if cnt >= limit: break
    if cnt == 0:
        print('  (无)')

for kw in ['第二百三十三章', '第233章', '第二百三十二章', '第二百五十三章', '第二百六十章']:
    show(kw)

# 统计所有 "第X章" 行的行首前缀形态
pat = re.compile(r'第[0-9一二三四五六七八九十百千万零〇两]+章')
pref = {}
for l in lines:
    s = l.strip()
    if len(s) > 110: continue
    m = pat.search(s)
    if not m: continue
    p = s[:m.start()][:14]
    pref[p] = pref.get(p, 0) + 1
print('=== 章号前缀 TOP 25 ===')
for k, v in sorted(pref.items(), key=lambda x: -x[1])[:25]:
    print('%6d  %r' % (v, k))
print('总章行数:', sum(pref.values()))
