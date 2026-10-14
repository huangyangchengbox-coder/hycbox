# -*- coding: utf-8 -*-
import re, json
SRC = r"D:\play_joy\novel\《凡人修仙传》 - 忘语.txt"
text = open(SRC, 'rb').read().decode('gb18030', 'replace')
lines = text.splitlines()
d = json.load(open(r"D:\codes\hycbox\v1\hycBox\docs\story\chapters_index.json", encoding='utf-8'))

print('=== 索引中 225-260 章 ===')
for c in d['chapters']:
    if 225 <= c['n'] <= 260:
        print('第%d章 %-16s chars=%d line?' % (c['n'], c['title'], c['chars']))

print()
print('=== 行 19100-19130 (232章附近) ===')
for i in range(19099, 19130):
    print(i+1, '|', lines[i].strip()[:80])
print()
print('=== 行 19200-19260 (232章之后) ===')
for i in range(19199, 19260):
    print(i+1, '|', lines[i].strip()[:80])
