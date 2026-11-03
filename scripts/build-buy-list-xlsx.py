import json, re
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule

SRC = 'src/'
data = json.load(open(SRC + 'extracted.json'))
md   = json.load(open(SRC + 'md_rows.json'))

# ---- verdict + note lookup from the curated markdown, joined on item name ----
def key(s): return re.sub(r'[^a-z0-9]', '', str(s or '').lower())
verdict = {key(r[0]): r[6] for r in md}
added   = [r for r in md if r[9] != 'CJ']

shop, price, bag = data['shopping'], data['price'], data['bag']

PRI = {'High': 1, 'Medium': 2, 'Low': 3}
def num(v):
    try: return float(v)
    except (TypeError, ValueError): return None
def txt(v):
    s = '' if v is None else str(v).strip()
    return '' if s.lower() in ('none', 'nan') else s

items, miss = [], 0
for r in shop:
    k = key(r['Item'])
    if k not in verdict: miss += 1
    items.append(dict(
        cat=txt(r['Category']), item=txt(r['Item']), pri=txt(r['Priority']),
        typ=txt(r['Type']).replace('Consumables', 'Consumable'), qty=num(r['Qty']),
        brand=txt(r['Final choice']) or txt(r['Recommendations']),
        cost=num(r['Cost']), verdict=verdict.get(k, ''),
        review=txt(r['Review']), note=txt(r['Notes']), cjstatus=txt(r['Status']), src='CJ'))
for r in added:
    items.append(dict(cat=r[1], item=r[0], pri=r[2], typ=r[3], qty=None, brand=r[4],
                      cost=None, verdict=r[6], review='', note=r[7], cjstatus='', src='Added'))

# links live in CJ's Notes field; lift them into their own column
for it in items:
    m = re.search(r'https?://\S+', it['note'])
    it['link'] = m.group(0).rstrip(').,') if m else ''
    if m: it['note'] = it['note'].replace(m.group(0), '').strip(' -–—')

items.sort(key=lambda d: (PRI.get(d['pri'], 9), d['cat'], d['item']))
print('items:', len(items), '| unmatched against markdown:', miss)
print('CJ cost total:', round(sum(i['cost'] or 0 for i in items), 2), '(sheet header said 161,229.75)')

# ---------------- styling ----------------
F = 'Arial'
HDR  = PatternFill('solid', fgColor='1F3864')
BAND = PatternFill('solid', fgColor='F2F5FA')
YEL  = PatternFill('solid', fgColor='FFF2CC')
thin = Side(style='thin', color='BFBFBF')
BOX  = Border(left=thin, right=thin, top=thin, bottom=thin)
PESO = u'₱#,##0;[Red](₱#,##0);-'

def header(ws, row, labels, widths):
    for i, (lab, w) in enumerate(zip(labels, widths), start=1):
        c = ws.cell(row, i, lab)
        c.font = Font(F, bold=True, color='FFFFFF', size=10)
        c.fill = HDR
        c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        c.border = BOX
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.row_dimensions[row].height = 30

def body(ws, r, c, v, **kw):
    cell = ws.cell(r, c, v)
    cell.font = Font(F, size=10, **{k: kw[k] for k in ('bold', 'italic', 'color') if k in kw})
    cell.border = BOX
    cell.alignment = Alignment(vertical='top', wrap_text=kw.get('wrap', False),
                               horizontal=kw.get('h', 'left'))
    if 'fmt' in kw: cell.number_format = kw['fmt']
    if r % 2 == 0: cell.fill = BAND
    return cell

wb = Workbook()

# ======================= 1. Start here =======================
ws = wb.active; ws.title = 'Start here'
ws.sheet_view.showGridLines = False
for col, w in zip('ABCDEF', (3, 34, 16, 16, 16, 52)): ws.column_dimensions[col].width = w

t = ws.cell(2, 2, 'The Cub — buy list'); t.font = Font(F, bold=True, size=18, color='1F3864')
ws.cell(3, 2, 'Built from the Shopping list and Price comparison tabs of the Baby Readiness Checklist.').font = Font(F, size=10, italic=True, color='595959')

ws.cell(5, 2, 'The one number you can change').font = Font(F, bold=True, size=11)
ws.cell(6, 2, 'Price uplift, 2022 → 2026').font = Font(F, size=10)
u = ws.cell(6, 3, 1.20); u.font = Font(F, bold=True, size=10, color='0000FF'); u.fill = YEL
u.number_format = '0.00"×"'; u.border = BOX
ws.cell(6, 6, 'ASSUMPTION, editable. Every price in this workbook is from 2022. Roughly 20% covers Philippine inflation '
              '2022–2026. It is a rough figure, not a sourced one — change this cell and every estimate follows.').font = Font(F, size=9, italic=True, color='595959')
ws.cell(6, 6).alignment = Alignment(wrap_text=True, vertical='top')
ws.row_dimensions[6].height = 42

ws.cell(8, 2, 'What it costs').font = Font(F, bold=True, size=11)
header(ws, 9, ['', 'Slice', 'Items', 'CJ 2022', 'Est. 2026', 'What it means'], (3, 34, 16, 16, 16, 52))
B = "'Buy list'!"
N = len(items) + 1  # last data row on Buy list (data starts row 2)
SLICES = [
    ('Everything on the list', None, 'The whole thing, skips included.'),
    ('High priority only', 'High', 'CJ’s own first wave. The realistic pre-birth number.'),
    ('Medium priority', 'Medium', 'Can wait, but not forever.'),
    ('Low priority', 'Low', 'Nice to have. Most of this is where budgets go to die.'),
]
r = 10
for lab, pri, meaning in SLICES:
    body(ws, r, 2, lab, bold=(pri == 'High'))
    if pri:
        body(ws, r, 3, '=COUNTIFS(%sD2:D%d,"%s")' % (B, N, pri), h='center')
        body(ws, r, 4, '=SUMIFS(%sH2:H%d,%sD2:D%d,"%s")' % (B, N, B, N, pri), fmt=PESO, h='right')
        body(ws, r, 5, '=SUMIFS(%sI2:I%d,%sD2:D%d,"%s")' % (B, N, B, N, pri), fmt=PESO, h='right',
             bold=(pri == 'High'))
    else:
        body(ws, r, 3, '=COUNTA(%sC2:C%d)' % (B, N), h='center')
        body(ws, r, 4, '=SUM(%sH2:H%d)' % (B, N), fmt=PESO, h='right')
        body(ws, r, 5, '=SUM(%sI2:I%d)' % (B, N), fmt=PESO, h='right')
    body(ws, r, 6, meaning, wrap=True)
    r += 1

body(ws, r, 2, 'Minus what CJ regretted', bold=True)
body(ws, r, 3, '=COUNTA(%sC2:C%d)-COUNTIFS(%sK2:K%d,"skip")' % (B, N, B, N), h='center')
body(ws, r, 4, '=SUM(%sH2:H%d)-SUMIFS(%sH2:H%d,%sK2:K%d,"skip")' % (B, N, B, N, B, N), fmt=PESO, h='right')
body(ws, r, 5, '=SUM(%sI2:I%d)-SUMIFS(%sI2:I%d,%sK2:K%d,"skip")' % (B, N, B, N, B, N), fmt=PESO, h='right', bold=True)
body(ws, r, 6, 'The 11 things she bought and told you not to. The most useful line here.', wrap=True)
r += 1
body(ws, r, 2, 'Still to buy (unticked)', bold=True)
body(ws, r, 3, '=COUNTA(%sC2:C%d)-COUNTIFS(%sA2:A%d,"Yes")' % (B, N, B, N), h='center')
body(ws, r, 4, '')
body(ws, r, 5, '=SUM(%sI2:I%d)-SUMIFS(%sI2:I%d,%sA2:A%d,"Yes")' % (B, N, B, N, B, N), fmt=PESO, h='right')
body(ws, r, 6, 'Updates as you tick the Bought? column. This is your live remaining budget.', wrap=True)
r += 2

ws.cell(r, 2, 'By category').font = Font(F, bold=True, size=11); r += 1
header(ws, r, ['', 'Category', 'Items', 'CJ 2022', 'Est. 2026', 'High-priority items in it'], (3, 34, 16, 16, 16, 52))
r += 1
cats = sorted({i['cat'] for i in items if i['cat']})
for c in cats:
    body(ws, r, 2, c)
    body(ws, r, 3, '=COUNTIFS(%sB2:B%d,B%d)' % (B, N, r), h='center')
    body(ws, r, 4, '=SUMIFS(%sH2:H%d,%sB2:B%d,B%d)' % (B, N, B, N, r), fmt=PESO, h='right')
    body(ws, r, 5, '=SUMIFS(%sI2:I%d,%sB2:B%d,B%d)' % (B, N, B, N, r), fmt=PESO, h='right')
    body(ws, r, 6, '=COUNTIFS(%sB2:B%d,B%d,%sD2:D%d,"High")' % (B, N, r, B, N), h='center')
    r += 1
body(ws, r, 2, 'Total', bold=True)
for col, L in ((3, 'C'), (4, 'D'), (5, 'E'), (6, 'F')):
    body(ws, r, col, '=SUM(%s%d:%s%d)' % (L, r - len(cats), L, r - 1), bold=True,
         h=('right' if col in (4, 5) else 'center'), **({'fmt': PESO} if col in (4, 5) else {}))
r += 2

ws.cell(r, 2, 'How to use it').font = Font(F, bold=True, size=11); r += 1
for line in [
    'Buy list — every item, sorted High to Low priority. Tick Bought? and the totals above follow.',
    'Only the yellow cell above and the Bought? / Your cost columns are meant to be typed in. Everything else is a formula.',
    'Verdict is CJ’s hindsight after actually using the thing: must, skip, or note. "skip" means she regretted buying it.',
    'Unit prices — her price-per-piece research on the consumables. Sorted cheapest first inside each category.',
    'Hospital bag — her packed list, for later. Nothing to do with it until about 35 weeks.',
    'Every peso figure and every link is from 2022. Brands and item names are the durable part; prices and URLs rot.',
    'One fix carried over: CJ\u2019s own grand total read \u20b1161,229.75 from =SUM(H3:H101), which stopped two rows short '
    'and left out Toothbrush (\u20b1200) and Baby stuff trolley (\u20b12,490). The correct 2022 total is \u20b1163,919.75, and that '
    'is what the totals here use.',
]:
    c = ws.cell(r, 2, '•  ' + line); c.font = Font(F, size=10); c.alignment = Alignment(wrap_text=True, vertical='top')
    ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=6)
    ws.row_dimensions[r].height = 15
    r += 1

# ======================= 2. Buy list =======================
ws = wb.create_sheet('Buy list')
cols = ['Bought?', 'Category', 'Item', 'Priority', 'Type', 'Qty', 'Brand / choice',
        'CJ 2022 (₱)', 'Est. 2026 (₱)', 'Your cost (₱)', 'Verdict',
        'CJ’s review — after using it', 'Notes', 'Where', 'Source']
header(ws, 1, cols, (9, 14, 30, 9, 12, 6, 24, 12, 12, 12, 9, 46, 46, 22, 8))
for n, it in enumerate(items, start=2):
    body(ws, n, 1, None, h='center')
    body(ws, n, 2, it['cat'])
    body(ws, n, 3, it['item'], bold=(it['pri'] == 'High'), wrap=True)
    body(ws, n, 4, it['pri'], h='center')
    body(ws, n, 5, it['typ'], h='center')
    body(ws, n, 6, it['qty'], h='center')
    body(ws, n, 7, it['brand'], wrap=True)
    body(ws, n, 8, it['cost'], fmt=PESO, h='right')
    body(ws, n, 9, '=IF(H%d="","",H%d*\'Start here\'!$C$6)' % (n, n), fmt=PESO, h='right')
    body(ws, n, 10, None, fmt=PESO, h='right').font = Font(F, size=10, color='0000FF')
    body(ws, n, 11, it['verdict'], h='center')
    body(ws, n, 12, it['review'], wrap=True)
    body(ws, n, 13, it['note'], wrap=True)
    c = body(ws, n, 14, '')
    if it['link']:
        c.value = re.sub(r'^www\.', '', (re.match(r'https?://([^/]+)', it['link']) or [None, ''])[1])
        c.hyperlink = it['link']; c.font = Font(F, size=10, color='0563C1', underline='single')
    body(ws, n, 15, it['src'], h='center')
    ws.row_dimensions[n].height = 28

tot = len(items) + 2
body(ws, tot, 3, 'TOTAL  —  %d items' % len(items), bold=True)
body(ws, tot, 8, '=SUM(H2:H%d)' % (tot - 1), fmt=PESO, bold=True, h='right')
body(ws, tot, 9, '=SUM(I2:I%d)' % (tot - 1), fmt=PESO, bold=True, h='right')
body(ws, tot, 10, '=SUM(J2:J%d)' % (tot - 1), fmt=PESO, bold=True, h='right')

ws.freeze_panes = 'C2'
ws.auto_filter.ref = 'A1:O%d' % (tot - 1)
dv = DataValidation(type='list', formula1='"Yes,No"', allow_blank=True)
ws.add_data_validation(dv); dv.add('A2:A%d' % (tot - 1))
ws.conditional_formatting.add('K2:K%d' % (tot - 1),
    CellIsRule(operator='equal', formula=['"skip"'], fill=PatternFill('solid', fgColor='FFC7CE'), font=Font(F, size=10, color='9C0006', bold=True)))
ws.conditional_formatting.add('K2:K%d' % (tot - 1),
    CellIsRule(operator='equal', formula=['"must"'], fill=PatternFill('solid', fgColor='C6EFCE'), font=Font(F, size=10, color='006100', bold=True)))
ws.conditional_formatting.add('D2:D%d' % (tot - 1),
    CellIsRule(operator='equal', formula=['"High"'], font=Font(F, size=10, color='C00000', bold=True)))

# ======================= 3. Unit prices =======================
ws = wb.create_sheet('Unit prices')
header(ws, 1, ['Category', 'Brand / pack', 'Qty in pack', 'Pack price (₱)',
               'Per piece (₱)', 'Cheapest in category?', 'Noted', 'Where'], (16, 42, 12, 14, 12, 18, 12, 24))
pr = [p for p in price if txt(p['Category']) or txt(p['Brand'])]
pr.sort(key=lambda p: (txt(p['Category']), num(p['Effective price']) if num(p['Effective price']) is not None else 9e9))
n = 2
for p in pr:
    body(ws, n, 1, txt(p['Category']))
    body(ws, n, 2, txt(p['Brand']), wrap=True)
    body(ws, n, 3, num(p['Quantity']), h='center')
    body(ws, n, 4, num(p['Price']), fmt=PESO, h='right')
    body(ws, n, 5, '=IFERROR(D%d/C%d,"")' % (n, n), fmt=u'₱#,##0.00', h='right')
    body(ws, n, 6, '=IF(E%d="","",IF(E%d=MINIFS_PLACEHOLDER,"← cheapest",""))' % (n, n), h='center')
    body(ws, n, 7, txt(p['Date']), h='center')
    c = body(ws, n, 8, '')
    lk = txt(p['Link'])
    if lk.startswith('http'):
        c.value = re.sub(r'^www\.', '', (re.match(r'https?://([^/]+)', lk) or [None, ''])[1])
        c.hyperlink = lk; c.font = Font(F, size=10, color='0563C1', underline='single')
    n += 1
last = n - 1
for row in range(2, n):
    ws.cell(row, 6).value = ('=IF(E{r}="","",IF(E{r}=_xlfn.MINIFS($E$2:$E${L},$A$2:$A${L},$A{r}),'
                            '"← cheapest",""))').format(r=row, L=last)
ws.freeze_panes = 'A2'
ws.auto_filter.ref = 'A1:H%d' % last

# ======================= 4. Hospital bag =======================
ws = wb.create_sheet('Hospital bag')
header(ws, 1, ['Packed?', 'For', 'Item', 'Qty', 'CJ’s status', 'Notes'], (10, 14, 38, 7, 16, 60))
n = 2
for b in bag:
    if not txt(b['Item']): continue
    body(ws, n, 1, None, h='center')
    body(ws, n, 2, txt(b['Category']))
    body(ws, n, 3, txt(b['Item']), wrap=True)
    body(ws, n, 4, num(b['Qty']), h='center')
    body(ws, n, 5, txt(b['Status']), h='center')
    body(ws, n, 6, txt(b['Notes']), wrap=True)
    n += 1
dv2 = DataValidation(type='list', formula1='"Yes,No"', allow_blank=True)
ws.add_data_validation(dv2); dv2.add('A2:A%d' % (n - 1))
ws.freeze_panes = 'A2'
ws.auto_filter.ref = 'A1:F%d' % (n - 1)
body(ws, n + 1, 3, 'Nothing to do here until about 35 weeks — kept so it is not rebuilt from scratch later.', italic=True)

for s in wb: s.sheet_properties.tabColor = '1F3864'
out = '/home/user/game1/cub-buy-list.xlsx'
wb.save(out)
print('saved', out, '| bag rows', n - 2, '| price rows', last - 1)
