# -*- coding: utf-8 -*-
import re
SRC = r"D:\play_joy\novel\《凡人修仙传》 - 忘语.txt"
raw = open(SRC, 'rb').read()
text = raw.decode('gb18030', 'replace')
lines = text.splitlines()
print('总行数:', len(lines))
pat = re.compile(r'第[0-9一二三四五六七八九十百千万零〇两]+章')
hits = [(i+1, l.strip()) for i, l in enumerate(lines) if pat.search(l)]
print('含"第X章"的行数:', len(hits))
print('=== 前 20 条 ===')
for h in hits[:20]:
    print(h[0], '|', h[1][:70])
print('=== 中间 20 条 (行 30000-32000) ===')
mid = [h for h in hits if 30000 <= h[0] <= 32000][:20]
for h in mid:
    print(h[0], '|', h[1][:70])
print('=== 后 20 条 ===')
for h in hits[-20:]:
    print(h[0], '|', h[1][:70])
# 卷标记
vpat = re.compile(r'第[0-9一二三四五六七八九十百千万零〇两]+卷')
vh = [(i+1, l.strip()) for i, l in enumerate(lines) if vpat.search(l)]
print('=== 含"卷"标记行 (%d) ===' % len(vh))
for h in vh[:25]:
    print(h[0], '|', h[1][:80])
# 样例：行首非空的章节样式 vs 行首带空格
print('=== 非行首匹配的章节行样例 ===')
cnt = 0
for i, l in enumerate(lines):
    if pat.search(l) and not re.match(r'^\s*第', l):
        print(i+1, '|', repr(l[:80])); cnt += 1
        if cnt >= 10: break
print('非行首总数(采样停止)')
