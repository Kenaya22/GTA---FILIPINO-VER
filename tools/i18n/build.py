import json, re, sys
sys.path.insert(0, '.')
from en_src import IDX, EXTRA, EXTRA_T
S = json.load(open('strings.json'))
def unesc(s): return s.replace('\\n', '\n').replace("\\'", "'").replace('\\"', '"').replace('\\`', '`')
def split_tpl(s):
    """split a JS template into literal parts and placeholder count (brace-balanced)"""
    parts, buf, i = [], '', 0
    while i < len(s):
        if s.startswith('${', i):
            depth, j = 1, i + 2
            while j < len(s) and depth:
                if s[j] == '{': depth += 1
                elif s[j] == '}': depth -= 1
                j += 1
            parts.append(buf); buf = ''; i = j
        else: buf += s[i]; i += 1
    parts.append(buf)
    return parts
exact, rules = {}, []
def add_rule(lits, en):
    lits = [unesc(x) for x in lits]
    src = '^' + '(.*?)'.join(re.escape(x) for x in lits) + '$'
    # python re.escape escapes some chars JS doesn't need; fine for JS RegExp except "\ " etc.
    src = src.replace('\\ ', ' ').replace('\\-', '-').replace('\\#', '#').replace('\\&', '&').replace('\\~', '~').replace("\\'", "'").replace('\\"', '"').replace('\\!', '!').replace('\\%', '%').replace('\\:', ':').replace('\\=', '=').replace('\\<', '<').replace('\\>', '>').replace('\\,', ',').replace('\\@', '@').replace('\\`', '`')
    rules.append((sum(len(x) for x in lits), src, en))
for i, en in IDX.items():
    src = S[i]
    if '${' in src:
        add_rule(split_tpl(src), en)
    else:
        exact[unesc(src).strip()] = en
for k, v in EXTRA.items(): exact[k] = v
for fil, en in EXTRA_T:
    lits = re.split(r'\{\d\}', fil)
    # keep placeholder order mapping by index used in fil
    order = [int(x) for x in re.findall(r'\{(\d)\}', fil)]
    en2 = en
    for pos, idx in enumerate(order): en2 = en2.replace('{%d}' % idx, '{@%d}' % pos)
    en2 = re.sub(r'\{@(\d)\}', r'{\1}', en2)
    if len(lits) == 1: exact[fil] = en
    else: add_rule(lits, en2)
rules.sort(key=lambda r: -r[0])
out = 'const LANG_EN = {\n  exact: ' + json.dumps(exact, ensure_ascii=False) + ',\n  rules: ' + json.dumps([[r[1], r[2]] for r in rules], ensure_ascii=False) + ',\n};\n'
open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', '..', 'js', 'lang_en.js'), 'w').write("'use strict';\n// English translations (generated). Filipino text -> English.\n" + out)
print('exact', len(exact), 'rules', len(rules))
