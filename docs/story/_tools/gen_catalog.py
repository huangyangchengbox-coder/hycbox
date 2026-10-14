# -*- coding: utf-8 -*-
"""生成全书章节目录 Markdown（按卷分组，含 seq / 原章号 / 标题 / 字数）"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
STORY = os.path.dirname(HERE)
d = json.load(open(os.path.join(STORY, 'chapters_index.json'), encoding='utf-8'))

VOL_HINT = {
    0: '卷一～卷四（七玄门·天南，原文未标卷名）',
    5: '第五卷 名震一方', 6: '第六卷 通天灵宝', 7: '第七卷 纵横人界',
    8: '第八卷 初入灵界', 9: '第九卷 灵界百族', 10: '第十卷 魔界之战',
    11: '第十一卷 真仙降世',
}

out = []
out.append('# 《凡人修仙传》章节总目录')
out.append('')
out.append('> 源文件为 GB18030 编码的第三方文本，**原文章号存在错乱跳号**（如第232章后直接跳到第333章）。')
out.append('> 本目录以 **seq（实物顺序）** 为准，`原章号` 列保留源文件标注供对照。')
out.append('> 实物章节共 **%d** 章，最大原章号 %d，源文件总字数为 %d。' % (
    d['totalChapters'], d['maxChapter'], d['totalChars']))
out.append('')
out.append('## 卷结构总览')
out.append('')
out.append('| 卷 | 名称 | 章节区间(seq) | 章数 | 字数 |')
out.append('|----|------|--------------|------|------|')
for v in d['volumes']:
    s = [c for c in d['chapters'] if c['vol'] == v['vol']]
    out.append('| %s | %s | %d–%d | %d | %d |' % (
        VOL_HINT.get(v['vol'], '第%d卷' % v['vol']).split(' ')[0],
        VOL_HINT.get(v['vol'], '').replace('第%s卷 ' % v['vol'], '') or '—',
        s[0]['seq'], s[-1]['seq'], v['count'], v['chars']))
out.append('')

cur_vol = None
for c in d['chapters']:
    if c['vol'] != cur_vol:
        cur_vol = c['vol']
        out.append('')
        out.append('## ' + VOL_HINT.get(cur_vol, '第%d卷' % cur_vol))
        out.append('')
        out.append('| seq | 原章号 | 标题 | 字数 |')
        out.append('|-----|--------|------|------|')
    out.append('| %d | %d | %s | %d |' % (c['seq'], c['n'], c['title'].replace('|', '/'), c['chars']))

p = os.path.join(STORY, '章节目录.md')
open(p, 'w', encoding='utf-8').write('\n'.join(out))
print('写入:', p, '行数:', len(out))
print('卷数:', len(d['volumes']), '章节:', d['totalChapters'])
