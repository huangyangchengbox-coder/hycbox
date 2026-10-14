# -*- coding: utf-8 -*-
"""
《凡人修仙传》切章工具 v2
章节行真实格式（同一行，章号在行中）：
  第一章山边小村
  第五卷名震一方第六百四十八章至木灵婴
  凡人修仙传第六卷通天灵宝第九百零八章晶化妖丹和飞针
  第十一卷真仙降临第两千四百四十六章飞升仙界(大结局）
输出 chapters_index.json + 卷汇总
"""
import re, json, sys, os

SRC = r"D:\play_joy\novel\《凡人修仙传》 - 忘语.txt"
HERE = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(os.path.dirname(HERE), "chapters_index.json")

CN = {'零':0,'〇':0,'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9}
UNIT = {'十':10,'百':100,'千':1000,'万':10000}
NUM = '0-9一二三四五六七八九十百千万零〇两'

def cn2int(s):
    if s.isdigit():
        return int(s)
    total, cur, big = 0, 0, 0
    for ch in s:
        if ch in CN: cur = CN[ch]
        elif ch in UNIT:
            u = UNIT[ch]
            if u == 10000: big += (total + cur) * u; total, cur = 0, 0
            else: total += (cur if cur else 1) * u; cur = 0
        else: return None
    return big + total + cur

# 允许前缀 "凡人修仙传" + 可选 "第X卷+卷名"，然后 "第X章+标题"
LINE_RE = re.compile(
    r'^(?:凡人修仙传)?'
    r'(?:第([%s]+)卷(.*?))?'
    r'第([%s]+)章(.*)$' % (NUM, NUM))

def load_text():
    raw = open(SRC, 'rb').read()
    for enc in ('gb18030', 'gbk', 'utf-8'):
        try: return raw.decode(enc)
        except Exception: pass
    return raw.decode('gb18030', 'replace')

def build():
    text = load_text()
    lines = text.splitlines(keepends=True)
    offsets, pos = [], 0
    for l in lines:
        offsets.append(pos); pos += len(l)

    chapters = []
    cur_vol_no, cur_vol_name = 0, ''
    last_n = 0
    for i, l in enumerate(lines):
        s = l.strip()
        if not s or len(s) > 100:
            continue
        # 正文误匹配防护：含对话引号或句末标点的长句直接跳过
        m = LINE_RE.match(s)
        if not m:
            continue
        vno_s, vname, cno_s, ctitle = m.group(1), m.group(2), m.group(3), m.group(4)
        n = cn2int(cno_s)
        if not n:
            continue
        if vno_s:
            vn = cn2int(vno_s)
            if vn and vn != cur_vol_no and vname is not None:
                # 排除正文引用：卷名段不能含标点
                nm = vname.strip()
                if nm and not re.search(r'[，。！？“”"：；、]', nm):
                    cur_vol_no, cur_vol_name = vn, nm
        if n != last_n + 1:
            # 非连续：可能是重复/误匹配，若小于等于上一个则跳过
            if n <= last_n:
                continue
        last_n = n
        title = ctitle.strip()
        title = re.sub(r'^第[%s]+章' % NUM, '', title).strip()  # 去重复章号
        title = re.sub(r'\s+', ' ', title)[:60]
        chapters.append({'n': n, 'vol': cur_vol_no, 'volName': cur_vol_name,
                         'title': title, 'offset': offsets[i]})
    for idx, c in enumerate(chapters):
        end = chapters[idx + 1]['offset'] if idx + 1 < len(chapters) else len(text)
        c['offsetEnd'] = end
        c['chars'] = end - c['offset']
        c['seq'] = idx + 1   # 实物顺序编号（原文章号错乱，以此为准）

    vols = {}
    for c in chapters:
        v = c['vol']
        d = vols.setdefault(v, {'vol': v, 'volName': c['volName'], 'first': c['n'],
                                'last': c['n'], 'count': 0, 'chars': 0})
        d['last'] = c['n']; d['count'] += 1; d['chars'] += c['chars']
        if c['volName']: d['volName'] = c['volName']
    vol_list = [vols[k] for k in sorted(vols)]

    # 缺号检测
    ns = [c['n'] for c in chapters]
    miss = [x for x in range(1, max(ns) + 1) if x not in set(ns)]
    data = {'source': os.path.basename(SRC), 'totalChapters': len(chapters),
            'maxChapter': max(ns), 'totalChars': len(text),
            'missing': miss[:50], 'missingCount': len(miss),
            'volumes': vol_list, 'chapters': chapters}
    json.dump(data, open(INDEX, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    print('切出章节:', len(chapters), ' 最大章号:', max(ns), ' 缺号:', len(miss))
    print('总字符:', len(text))
    print('=== 卷汇总 ===')
    for v in vol_list:
        print('vol%-2s %-16s 第%d-%d章  %d章 %d字' % (
            v['vol'], (v['volName'] or '(原文未标卷名)'), v['first'], v['last'],
            v['count'], v['chars']))
    if miss:
        print('缺号样例:', miss[:20])
    return chapters

def get_text(a, b):
    d = json.load(open(INDEX, encoding='utf-8'))
    text = load_text()
    sel = [c for c in d['chapters'] if a <= c['n'] <= b]
    if not sel: return ''
    return text[sel[0]['offset']:sel[-1]['offsetEnd']]

if __name__ == '__main__':
    a = sys.argv[1] if len(sys.argv) > 1 else None
    if a == '--range':
        d = json.load(open(INDEX, encoding='utf-8'))
        for c in d['chapters']:
            if int(sys.argv[2]) <= c['n'] <= int(sys.argv[3]):
                print('第%d章 %s (%d字)' % (c['n'], c['title'], c['chars']))
    elif a == '--dump':
        txt = get_text(int(sys.argv[2]), int(sys.argv[3]))
        open(sys.argv[4], 'w', encoding='utf-8').write(txt)
        print('导出 %d 字 -> %s' % (len(txt), sys.argv[4]))
    else:
        build()
