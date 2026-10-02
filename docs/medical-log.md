# Medical check-up log

Every appointment, scan and result, in one place. Seeds a `checkups` table:
`date`, `week`, `type`, `provider`, `findings`, `impression`, `actions`, `next`.

**Why keep this.** Pregnancy care is a series of measurements that only mean
something next to the previous ones. A blood pressure is a number; a blood
pressure beside the booking reading is information. Same for weight, fundal
height, and every scan.

> General information, not medical advice. Dra. Villafria's reading of these
> results is the one that counts. In an emergency, go to the Makati Med ER.

---

## Vitals

Everything measured so far, in plain words. Each row says what the test actually
looks at, not just what the lab called it. Status is written as a word — `good`,
`watch`, `pending` or `urgent` — and never signalled by colour alone.

**If a term here is unfamiliar, it is in the glossary at the end of this file.**

| Vital | What it actually is | Value | Normal is | Status | Measured |
| --- | --- | --- | --- | --- | --- |
| Blood pressure | How hard blood pushes on your artery walls | 120/70 mmHg | Under 140/90 | good | 2026-09-18 |
| HbA1c | Your average blood sugar over the last 2–3 months | 5.2 % | Under 5.7 % | good | 2026-09-18 |
| Urine protein | Protein leaking into urine — the pre-eclampsia warning sign | Negative | Negative | good | 2026-09-18 |
| Urine glucose | Sugar spilling into urine, which can point to diabetes | Negative | Negative | good | 2026-09-18 |
| Urine ketones | A sign the body is burning fat because it is short of food or fluid | Negative | Negative | good | 2026-09-18 |
| Nitrites | A chemical made by the bacteria that cause bladder infections | Negative | Negative | good | 2026-09-18 |
| Leucocyte esterase | A sign white blood cells are in the urine, fighting infection | Negative | Negative | good | 2026-09-18 |
| Urine blood | Blood in the urine | Negative | Negative | good | 2026-09-18 |
| Bacteria | How many bacteria were seen under the microscope | 10 /HPF | 0–50 per view | good | 2026-09-18 |
| Urine specific gravity | How concentrated your urine is — how much water is in it | 1.002 | 1.015–1.025 | watch | 2026-09-18 |
| Rubella IgG | Whether you are immune to German measles | Reactive, 219 | Reactive means immune | good | 2026-09-18 |
| HBsAg | Whether you currently have hepatitis B | Nonreactive | Nonreactive means no | good | 2026-09-18 |
| Anti-HBs | Whether your hepatitis B vaccination is still protecting you | Reactive, 288 | Above 10 is protective | good | 2026-09-18 |
| Anti-HCV | Whether you have hepatitis C | Nonreactive | Nonreactive means no | good | 2026-09-18 |
| RPR | The syphilis test | Nonreactive | Nonreactive means no | good | 2026-09-18 |
| Pap smear | Checks the cervix for abnormal cells | NILM | No abnormal cells | good | 2026-09-05 |
| Haemoglobin | The part of blood that carries oxygen — low means anaemia | 13.5 g/dL | 12.3–16.0 | good | 2026-09-18 |
| Haematocrit | What share of your blood is red cells | 41.1 % | 35.9–48.0 | good | 2026-09-18 |
| MCV | The average size of a red cell — small points to low iron | 88 fL | 80–96 | good | 2026-09-18 |
| MCH | How much haemoglobin sits in an average red cell | 29 pg | 27.5–33.2 | good | 2026-09-18 |
| RDW | How much red cell sizes vary — rises early in iron deficiency | 12.3 % | 11.6–14.6 | good | 2026-09-18 |
| MCHC | Haemoglobin packed into a red cell. Calculated, not measured | 32.8 % | 33.4–35.5 | watch | 2026-09-18 |
| Ferritin | Your iron *stores* — runs low long before haemoglobin drops | — | Above 30 ng/mL | pending | not ordered |
| Platelets | The cells that let blood clot | 209,000 /µL | 150,000–450,000 | good | 2026-09-18 |
| White cells | The infection-fighting cells, also on the CBC | 5.91 ×10³/µL | 4.40–11.00 | good | 2026-09-18 |
| Fasting blood sugar | Blood sugar after not eating overnight | 76 mg/dL | 74–99 | good | 2026-09-18 |
| TSH | The pituitary's signal to the thyroid — the main thyroid number | **5.13 uIU/mL** | 0.27–4.20, and under 4.0 in pregnancy | urgent | 2026-09-18 |
| Total T4 | The thyroid hormone itself. *Total*, not free — see note | 10.06 ug/dL | 5.15–14.12 | good | 2026-09-18 |
| Total T3 | The other thyroid hormone | 1.11 ug/dL | 0.85–2.02 | good | 2026-09-18 |
| Vitamin D (25-OH) | Your vitamin D stores | 29.6 ng/mL | 30.0 or above is sufficient | watch | 2026-09-18 |
| Blood type & Rh | Your blood group, and whether you are Rh positive or negative | — | Needed by 28 weeks | pending | not ordered |
| HIV screen | Standard test offered to everyone in pregnancy | Nonreactive, 0.31 S/CO | Below 1.0 is negative | good | 2026-09-18 |
| Pre-pregnancy weight | Your starting weight, used to work out healthy gain | — | Not recorded | pending | not recorded |
| Height | Used with weight to work out BMI | — | Not recorded | pending | not recorded |
| Sugar test (OGTT) | The proper test for pregnancy diabetes — a sweet drink, then bloods | — | Due 24–28 weeks | pending | 2027-01-27 – 2027-02-24 |

### The one flagged `watch`, and why it is not a problem

**Urine specific gravity 1.002** is below the 1.015–1.025 reference, which means
only that the sample was very dilute — she was well hydrated when she gave it.
It is not a finding in its own right. The single caveat is that a very dilute
sample is slightly less sensitive, so a faint trace of protein or bacteria could
in principle be missed. Not a reason to repeat it on its own.

### Blood sugar, in more detail

**HbA1c 5.2 % is normal with room to spare.** It reflects average blood glucose
over roughly the preceding two to three months, and 5.2 % corresponds to an
average of about **103 mg/dL (5.7 mmol/L)**. The thresholds: under 5.7 % is
normal, 5.7–6.4 % marks increased risk, and 6.5 % or above is the diagnostic
range. The negative urine glucose agrees with it.

Two things worth understanding about this number:

- **HbA1c normally runs *lower* in pregnancy**, because red cells turn over
  faster and plasma volume expands. So a normal result early on is expected
  rather than remarkable — which is fine. It is a baseline, not an achievement.
- **It does not screen for gestational diabetes, and a normal result does not
  let anyone skip the OGTT.** Early-pregnancy HbA1c is there to catch
  *pre-existing* diabetes that had gone unnoticed. Gestational diabetes develops
  later, driven by placental hormones, and is diagnosed by the **oral glucose
  tolerance test at 24–28 weeks — 27 January to 24 February 2027.**

What this result does buy is interpretive power later. Starting from a normal
HbA1c means that if the OGTT is ever abnormal, it is genuinely gestational,
rather than something pre-existing finally being noticed.

*Sources: American Diabetes Association HbA1c thresholds, as printed on the Makati Med report; eAG conversion from the ADAG study (eAG mg/dL = 28.7 × A1c − 46.7). Verified 2026-09-19. Confidence: high.*

---

## Action steps

Everything outstanding from the tests so far, in the order it needs doing.
Rendered on the home screen, because a dated to-do buried three taps deep is a
to-do that does not happen.

### Do now

- [ ] **The TSH of 5.13 — the one thing still open.** Every other result is
      normal and the 2 October scan was good, which leaves this as the only
      outstanding question in the pregnancy. Ask for **TPO antibodies, free T4
      and a repeat TSH** — one draw, three tests. If it was already raised at
      the 2 October visit, note what she said and tick this off.
      *From Lab 26596449 page 2.*
- [ ] **Folic acid, 400–600mcg daily, starting today.** The neural tube closes
      around week 6, which is this week. Nothing else here is as time-critical.

### Ask Dra. Villafria

- [ ] **Ferritin, as a separate request.** The CBC has now arrived and the
      haemoglobin is normal at 13.5, so this is no longer about anaemia — it is
      a stock-check. Haemoglobin shows whether the tank has run dry; ferritin
      shows how much is left in it, and a first-trimester haemoglobin catches
      only about 30% of people whose stores are already low. Demand climbs
      steeply from the second trimester, so knowing now is worth more than
      knowing at 32 weeks. It is not part of a standard panel, so it has to be
      asked for by name.
- [ ] **Vitamin D at 29.6, against a cutoff of 30.** Borderline rather than
      deficient. Ask whether the prenatal vitamin already covers it or whether a
      separate supplement is worth adding. Least urgent thing on the list.
- [ ] **The Pap inflammation note.** Common and non-specific beside a normal
      result, but worth raising once. *From the 4–5 Sept Pap.*

### Chase from the lab

- [ ] **Blood type and Rh — never ordered.** The request form's box is blank,
      so this was not missed by the lab; it was not asked for. Needed for the
      28-week anti-D dose and for delivery. **No longer urgent at all** — the
      only thing that ever made it time-sensitive was the bleed, and the
      2 October scan found the bleed gone. Add it to the next request.
- [ ] **Varicella IgG — also never ordered.** Whether you are immune to
      chickenpox. Often skipped where someone clearly had it as a child, so ask
      whether that was the reasoning rather than assuming it was an oversight.

### Already settled — no action

Rubella immune. Hepatitis B immune and not infected. Hepatitis C negative.
Syphilis screen negative. **HIV screen nonreactive.** HbA1c 5.2% and **fasting
glucose 76** — both normal. Urine clean, no protein. Pap normal. Blood pressure
120/70. **CBC normal — haemoglobin 13.5, platelets 209,000, white cells 5.91,
differential normal.** Not anaemic, and clotting cells in range. **T3 and T4
normal.**

**All twelve ordered tests are now in hand.** Eleven are normal or better. The
TSH is the one exception, and it is at the top of this list.

**From the 2 October scan:** heartbeat at 128 bpm, dating settled at 22 May 2027
by crown-rump length, **subchorionic hemorrhage resolved**, cervix long and
closed. The bleed question, the activity question, the progesterone question and
the due-date question are all closed by this scan.

---

## 2 October 2026 — Follow-up scan · 6w6d · **heartbeat**

**Makati Medical Center**, Section of Maternal & Fetal Medicine and OB-GYN
Ultrasound. Attending: **Dr. Maria Fe P. Villafria**. Scanned by **Dr. Sharon
Leah R. Enghog**, FPOGS, FPSUOG. First trimester ultrasound, outpatient.

| | Finding |
| --- | --- |
| **Cardiac rate** | **128 beats per minute** |
| **Crown-rump length** | **8.5 mm → 6 weeks 6 days** |
| **Subchorionic hemorrhage** | **None** |
| Gestational sac | Single, regular in shape, upper in location |
| Yolk sac | 3.6 mm |
| Uterus | 70.8 × 67.3 × 61.9 mm, anteverted, homogeneous, regular |
| Cervix | 34.6 × 28.5 × 34.2 mm, **long and closed** |
| Right ovary | 34.2 × 26.6 × 18.5 mm (8.9 mL) |
| Left ovary | 34.8 × 30.1 × 21.6 mm (11.9 mL), corpus luteum 23.0 × 15.5 mm |
| Cul-de-sac | No fluid. Not adherent, positive sliding sign |
| **Ultrasound EDD** | **22 May 2027** |

**Impression as reported:** Single live intrauterine pregnancy, 6 weeks and 6
days by crown-rump length. No subchorionic hemorrhage. Normal-sized uterus, long
cervix. Normal-sized ovaries with corpus luteum in the left. EDD 22 May 2027.

### There is a heartbeat

**128 beats per minute at 6w6d.** That is squarely where it should be — the
embryonic heart starts around 100 and climbs through the following fortnight to
roughly 170 by weeks 9 to 10, so 128 at not-quite-seven-weeks is on the expected
curve rather than at either edge of it.

This is the milestone that changes the odds. Once a heartbeat is seen at around
seven weeks in a pregnancy with no bleeding, the chance of continuing is
**high** — the published figures sit in the 90s. The first three weeks of
uncertainty since 18 September are over.

### The subchorionic hemorrhage has gone

The September scan found a collection at the inferior pole, 4.0 × 11.6 × 3.3 mm,
volume 0.082 mL. This report records **none**. Not smaller — absent. That is the
usual course for a small one, and it is the single best outcome that line could
have had.

The cul-de-sac findings back it up: no free fluid, positive sliding sign, same
as before.

### The date is now settled

**22 May 2027**, by crown-rump length. See the dating section of the guide for
what moved and why. Two things worth noting here:

**The scan agrees with Dani, not with the chart.** The implied last period is
**15 August** — the date she gave from the start, against the chart's 14th.

**The second number on the report is not a disagreement.** The header reads AOG
7 weeks 2 days, because the ultrasound machine was set to an assumed LMP of
12 August. The measurement is 6w6d. Where a machine's assumed date and a
measured embryo disagree, the measurement wins; the header is arithmetic on an
input, not a finding.

### Everything else is as it should be

**Cervix long and closed** — 34.6mm, which is what you want and will be measured
again at the anomaly scan. **Corpus luteum still present** on the left and
slightly smaller than in September (23.0 × 15.5 against 24.2mm), which is the
expected course as the placenta takes over hormone production over the next few
weeks. **Uterus noticeably larger** than three weeks ago — 70.8mm against
58.5mm. **Yolk sac 3.6mm**, within normal.

*Source: Makati Medical Center first-trimester ultrasound report, 2 October 2026, 09:33. Verified 2026-10-02. Confidence: high.*

---

## 18 September 2026 — First OB scan · 5w0d

**Makati Medical Center**, Department of Obstetrics and Gynecology, Section of
Maternal & Fetal Medicine and OB-GYN Ultrasound.
Attending: **Dr. Maria Fe P. Villafria**. Scanned by Dr. Ma. Linda E. Quevedo,
FPOGS, FPSUOG, FPSMFM. First trimester ultrasound, outpatient. G1 P0.

### Measurements

| | Finding |
| --- | --- |
| **Gestational sac** | Single, regular in shape, **upper uterine segment** |
| Mean sac diameter | 6.1 mm → **5w2d** |
| Yolk sac | 1.1 mm, present |
| Embryo (CRL) | Not yet seen |
| Cardiac activity | Not yet appreciated |
| Developing placenta | Not yet seen |
| **Subchorionic hemorrhage** | Inferior pole, 4.0 × 11.6 × 3.3 mm — **volume 0.082 mL** |
| Uterus | 58.5 × 58.6 × 54.6 mm, anteverted, homogeneous, regular |
| Cervix | 43.9 × 29.1 × 30.7 mm, **long and closed** |
| Right ovary | 27.6 × 13.4 × 14.4 mm (2.8 mL), no other findings |
| Left ovary | 39.5 × 43.5 × 22.5 mm (20.3 mL), **corpus luteum 24.2 mm** |
| Cul-de-sac | No fluid. Not adherent, **positive sliding sign** |
| Blood pressure | **120/70** |

**Impression as reported:** Early intrauterine pregnancy, 5 weeks 2 days by mean
sac diameter. Subchorionic hemorrhage seen. Normal ovaries with corpus luteum in
the left.

**Recommendation as reported:** Repeat scan after 1–2 weeks to confirm fetal
viability, or earlier if clinically indicated.

### What the good news is

**The pregnancy is in the right place.** "Single, regular in shape, located in
the upper uterine segment" is the single most important line on this report. The
main thing an early scan looks for is an ectopic pregnancy, and this rules it
out. The cul-de-sac finding supports it — no free fluid, positive sliding sign,
which means no blood in the pelvis and no adhesions.

**The yolk sac is there.** Its appearance is the expected next milestone after
the sac itself, and it confirms this is a true gestational sac rather than a
pseudosac. It is the structure feeding the embryo until the placenta takes over.

**No heartbeat yet is normal at 5w2d, not a bad sign.** Cardiac activity is
usually first seen around 6 weeks, and a crown-rump length is generally
measurable from about then too. Finding neither at 5w2d is exactly what the
timetable predicts. This is precisely why the repeat scan is scheduled — not
because anything looked wrong.

**The corpus luteum is doing its job.** It is the structure left behind after
ovulation, and it produces the progesterone holding the pregnancy up until the
placenta takes over around weeks 8–10. At 24.2 mm it explains why the left ovary
(20.3 mL) is so much larger than the right (2.8 mL). Both were reported normal.

**The cervix is long and closed**, which is what you want at every stage.

### The subchorionic hemorrhage — read this part carefully

A subchorionic hemorrhage is a small pocket of blood between the membrane
surrounding the pregnancy and the wall of the uterus. It is a common finding.

**Hers is very small: 0.082 mL.** For scale, that is under a tenth of a
millilitre — a fraction of a drop. Size is the thing that matters most in the
research, and small is the category you want to be in.

Being straight about what the evidence says, because it cuts both ways:

- A first-trimester SCH is associated with a modestly increased risk of
  miscarriage — around a 1.9× odds ratio in a large 2024 singleton study.
- **But size drives it.** Miscarriage was around 18.8% with large hematomas
  against 7.7% with small ones. The raised abruption risk attached specifically
  to large collections.
- One honest counterweight: diagnosis *before* 7 weeks was itself associated with
  higher risk, and this was found at 5 weeks. So the early timing is a reason to
  take the follow-up scan seriously rather than to relax entirely.
- **Most small SCHs resolve on their own** and the pregnancy continues normally.

**On activity:** the evidence does not support routine bed rest, and studies have
not found that SCH diagnosed in early pregnancy changes delivery method or drives
adverse outcomes across the board. But **this is exactly the question to put to
Dra. Villafria**, because it has two concrete consequences here:

- **The November marathon walk.** Ask specifically. Depending on the event date
  that falls somewhere in weeks 11–16.
- **Travel.** Vietnam was cancelled on 18 September, which removes the nearest
  conflict. Korea in December is the next trip, at week 16.

**How Dra. Villafria described it:** *minor bleeding.* That is the plain-language
name for exactly this finding — a subchorionic hemorrhage **is** a small bleed,
sitting between the membrane and the uterine wall. "Minor" matches the
measurement: 0.082 mL, at the small end of the scale that the research says
drives the risk.

**Seeing blood versus having a bleed are different things.** The collection on
the scan is internal. Many women with an SCH never see any bleeding at all. Some
have brown or pink spotting as it drains, which is old blood leaving and is
common rather than alarming.

**What to report, and how fast:**

| What | What to do |
| --- | --- |
| Brown or pink spotting, no pain | Tell Dra. Villafria at the next contact. Normal with a known SCH. |
| Fresh red bleeding, light | Call the same day. |
| Bleeding like a period, or with clots | **Call now.** |
| Soaking a pad in an hour | **Makati Med ER.** |
| Cramping that builds, or one-sided pain | **Call now**, whatever the bleeding is doing. |
| Any fluid leaking | Call now. |

There is no prize for waiting it out, and no such thing as wasting her time with
this. A call that turns out to be nothing is the correct outcome.

### The dating, reconciled

The report gives **LMP 14 August 2026** and **EDC 21 May 2027**. That checks out
exactly: 14 Aug + 280 days = 21 May, Naegele's rule on a 28-day cycle.

| Source | EDD | Notes |
| --- | --- | --- |
| **Report EDC (LMP 14 Aug, 28-day cycle)** | **2027-05-21** | The chart date |
| Dani's recalled LMP 15 Aug, 28-day cycle | 2027-05-22 | One day out from the chart |
| Dani's recalled LMP 15 Aug, 29-day cycle | 2027-05-23 | The app's previous date |
| Mean sac diameter, 5w2d | 2027-05-19 | Printed on the film as 05/19/2027 |

Two small discrepancies worth knowing about, neither of them a problem:

1. **The report has LMP 14 August; Dani recalled the 15th.** A one-day
   difference, and the clinic's date is the one the chart runs on.
2. **The header says AOG 5w0d; the sac says 5w2d.** The header is LMP dating,
   the impression is sac dating. They disagree by 2 days.

**Two days is well inside the threshold for redating.** ACOG Committee Opinion
700 replaces LMP dating with scan dating at 8w6d or earlier only when the two
disagree by **more than 5 days**. It does not here, so LMP dating stands — and
those thresholds are written for crown-rump length anyway, which this scan could
not measure. A mean sac diameter is not a recommended dating measurement.

**At the time, the app used 2027-05-19 — the date printed on the scan film.**

Her paperwork carried both. The report header gave EDC 21 May from LMP dating;
the film printed EDD 05/19/2027 from the sac. The app followed the film, because
that was the dating Dani had been given and the reason she read 5w2d on
18 September rather than 5w0d.

> **Superseded on 2 October 2026.** The crown-rump length measured that day gives
> **22 May 2027**, and that is the date the app runs on now. The reasoning above
> is kept as a record of what was known in September, not as current guidance.
> It also called this correctly: the gap was inside the redating threshold,
> neither date was wrong, and the CRL settled it.

### Actions — all closed by the 2 October scan

- [x] **Book the repeat scan for 28 September – 5 October.** Done, 2 October.
- [x] **Ask about the SCH and activity.** Moot: the hemorrhage had resolved.
- [x] **Progesterone support.** Moot for the same reason.
- [x] **Confirm which due date.** Settled: neither. The CRL gives **22 May**.
- [ ] Start or confirm folic acid, if not already.

### The Vietnam conflict, resolved

The repeat scan window (28 Sept – 5 Oct) overlapped the planned Vietnam trip in
early October. **Vietnam was cancelled on 18 September**, so the conflict is
gone and the scan can be booked anywhere in the window.

The scan itself still matters just as much. Book it.

### Next

**Repeat scan, 28 Sept – 5 Oct 2026.** Confirming fetal viability — cardiac
activity and crown-rump length.

*Sources: [ACOG Committee Opinion 700 — Methods for Estimating the Due Date](https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2017/05/methods-for-estimating-the-due-date); [First-trimester subchorionic hematoma and pregnancy loss, Scientific Reports 2024](https://www.nature.com/articles/s41598-024-81759-3); [Subchorionic hemorrhage, StatPearls](https://www.ncbi.nlm.nih.gov/books/NBK559017/); [Subchorionic hemorrhage in first-trimester pregnancies, Radiology](https://pubs.rsna.org/doi/10.1148/radiology.200.3.8756935). Verified 2026-09-18. Confidence: high on the report transcription and the dating arithmetic; high on the ACOG threshold; medium on SCH prognosis, where study populations and size definitions vary.*

---

## 18 September 2026 — Thyroid, fasting glucose and vitamin D · 5w0d

**Lab 26596449, page 2.** Same report as the hepatitis and rubella serology,
same draw, released 18 September 12:02. Page 1 was the only page seen until
29 September.

| Test | Result | Reference |
| --- | --- | --- |
| Glucose (fasting) | 76 mg/dL | 74 – 99 |
| Total T3 | 1.11 ug/dL | 0.85 – 2.02 |
| Total T4 | 10.06 ug/dL | 5.15 – 14.12 |
| **Vitamin D, total** | **29.6 ng/mL** — flagged low | 30.0 or above is sufficient |
| **TSH** | **5.130 uIU/mL** — flagged high | 0.270 – 4.200 |

### The TSH is the one thing in this pregnancy that needs a decision

**TSH 5.13 against a ceiling of 4.20 — and pregnancy uses a lower ceiling
still, commonly 4.0 in the first trimester.** With a normal T4 beside it, that
pattern has a name: **subclinical hypothyroidism**. Not an emergency, not a
crisis, and not something to leave sitting either.

**Why it matters more in pregnancy than it would otherwise.** The baby cannot
make any thyroid hormone of its own until around week 12 and runs entirely on
yours until then. Subclinical hypothyroidism in pregnancy is associated with a
raised risk of miscarriage and preterm birth. The evidence that treating it
improves the child's later neurocognitive outcomes is *not* strong — that is
worth knowing so nobody oversells it — but the pregnancy-loss association is
why guidelines lean towards treating rather than watching.

**Timing makes this more striking, not less.** hCG mildly stimulates the thyroid
and normally pushes TSH *down* through the first trimester, reaching its lowest
point around weeks 9–12. This sample was drawn at **5w0d**, so the number was
taken before much of that dip, and it was still above range.

**What decides the treatment is a test you have not had: TPO antibodies.**
Under the 2017 American Thyroid Association guidance:

| Situation | What the guidance says |
| --- | --- |
| TPO antibodies **positive**, TSH above the pregnancy range | **Treat** |
| TPO antibodies **negative**, TSH above 10 | **Treat** |
| TPO antibodies **negative**, TSH above the pregnancy range but under 10 | **Consider treating**, aiming to bring TSH to 2.5 or below |

At 5.13 you are in the third row unless the antibodies come back positive, in
which case the first. Either way the treatment is **levothyroxine**, typically
started at 25–50mcg — a cheap daily tablet, taken on an empty stomach, kept
apart from iron and calcium by several hours. It is one of the most
well-established medications in pregnancy.

**One technical point worth raising with her.** What was measured was **total**
T3 and T4, not **free** T4. Oestrogen raises thyroxine-binding globulin sharply
in pregnancy, which inflates the total figures by roughly half by mid-pregnancy.
Total T4 is the wrong denominator from here on; **free T4** is the pregnancy
test. At 5w0d the distortion is still small, so the 10.06 is probably a fair
reading — but any repeat should be free T4.

**What to ask for:** TPO antibodies, free T4, and a repeat TSH. All three from
one draw.

### The fasting glucose is normal

**76 mg/dL** against 74–99, and comfortably under the 92 that pregnancy uses as
its fasting threshold. It sits alongside the HbA1c of 5.2%, and the two together
are the baseline the OGTT at 24–28 weeks will be read against. Nothing to do.

### Vitamin D is 0.4 below the line

**29.6 ng/mL** against the lab's own sufficiency cutoff of 30.0. Technically
insufficient; practically, borderline, and the least urgent thing on the page.
Deficiency is common in Metro Manila despite the sunshine, because of sun
avoidance and long days indoors. The fix is a daily supplement — the prenatal
vitamin usually contains some already, so the question for Dra. Villafria is
whether what you are taking is enough rather than whether to start something
new.

*Source: Makati Medical Center, Lab 26596449 page 2, released 18 September 2026. Treatment thresholds from the [2017 American Thyroid Association guidelines](https://www.e-lactancia.org/media/papers/TiroidesLevotiroxinaLiotironinaBFGuia-Thyr2017.pdf) and [NHS Lothian's summary of subclinical hypothyroidism in pregnancy](https://apps.nhslothian.scot/refhelp/guidelines/endocrinology/thyroid-conditions-and-pregnancy/subclinical-hypothyroidism-and-pregnancy/). Verified 2026-09-29. Confidence: high for the result, high for the guidance, and **this is a summary of published guidance, not a treatment decision — that is Dra. Villafria's.***

---

## 18 September 2026 — Complete blood count · 5w0d

**Lab 26596440**, Hematology. Ordered 4 September, released 18 September
10:48. Retrieved from the Makati Med portal on 29 September, eleven days after
it was released and after three separate questions had been blocked on it.

| | Result | Reference |
| --- | --- | --- |
| **Haemoglobin** | **13.5 g/dL** | 12.3 – 16.0 |
| Red blood cells | 4.68 ×10⁶/µL | 4.50 – 5.10 |
| Haematocrit | 41.1 % | 35.9 – 48.0 |
| MCV | 88 fL | 80 – 96 |
| MCH | 29 pg | 27.5 – 33.2 |
| **MCHC** | **32.8 %** — flagged low | 33.4 – 35.5 |
| RDW | 12.3 % | 11.6 – 14.6 |
| White blood cells | 5.91 ×10³/µL | 4.40 – 11.00 |
| Neutrophils / Lymphocytes | 60 % / 31 % | 40–70 / 22–43 |
| Monocytes / Eosinophils / Basophils | 6 % / 2 % / 1 % | 0–7 / 0–4 / 0–1 |
| **Platelets** | **209,000 /µL** | 150,000 – 450,000 |
| MPV | 11.9 fL | 7.00 – 12.00 |

### Platelets are normal, so the bruising is not a clotting problem

**209,000** sits comfortably in range. Gestational thrombocytopenia is the
common reason platelets drop in pregnancy and this is nowhere near it —
spontaneous bruising from low platelets belongs to counts far below this.
Bruising more easily is instead the ordinary hormonal one: oestrogen and
progesterone make small vessels more fragile, blood volume is climbing, and
shins meet furniture.

This is also the number an anaesthetist wants before an epidural, so the
booking baseline is now on file.

### Not anaemic — but this still does not settle iron

**Haemoglobin 13.5** is comfortably normal, and well above the 11.0 g/dL
first-trimester threshold for anaemia in pregnancy. The supporting indices agree:
**MCV 88** and **MCH 29** are mid-range, and small, pale red cells are what iron
deficiency produces. **RDW 12.3** is normal too, and RDW usually rises early in
iron deficiency, before anything else moves.

That is a genuinely good picture. **It still does not answer the ferritin
question**, because haemoglobin measures whether the tank has run dry, not how
much is left in it. A first-trimester haemoglobin catches only about 30% of
people whose ferritin is already low, and demand climbs steeply from the second
trimester. Ferritin remains worth asking for — the difference now is that it is
a stock-check rather than a worry.

### The one flagged value is a non-finding

**MCHC 32.8** against a floor of 33.4 is the only thing the lab marked. It is
not measured; it is calculated from the two numbers above it — haemoglobin
divided by haematocrit, ×100. Doing that by hand: 13.5 ÷ 41.1 × 100 = **32.8**.
It is the least informative of the red cell indices and the one most prone to
analyser quirks.

What would make a low MCHC meaningful is company: a low MCV, a low MCH, a raised
RDW, a low haemoglobin. **All four are normal here.** A value 0.6 below a
reference floor, alone, with every related index mid-range, is noise. Worth one
sentence to Dra. Villafria for completeness, not worth thinking about.

*Source: Makati Medical Center, Department of Pathology and Laboratories, Lab 26596440, released 18 September 2026. Pregnancy anaemia thresholds per ACOG. Verified 2026-09-29. Confidence: high.*

---

## 18 September 2026 — Booking bloods, serology and urinalysis · 5w0d

**Makati Medical Center**, Department of Pathology and Laboratories. Ordered
4 September 2026 by Dr. Marinette Tuason Sto. Domingo; collected and released
18 September.

### Serology and infection screen — Lab 26596449, 26596452

| Test | Result | Reading |
| --- | --- | --- |
| **Rubella IgG** | Reactive, **219.0 IU/mL** | **Immune.** The result you want. |
| **HBsAg** | Nonreactive | No hepatitis B infection. |
| **Anti-HBs** | Reactive, **288.00 IU/L** | **Immune, from vaccination.** |
| **Anti-HCV** | Nonreactive | No hepatitis C. |
| **RPR (qualitative)** | Nonreactive | Syphilis screen negative. |

**Two of these come with lab boilerplate that reads worse than the result is.
Read this before you read the report.**

**Rubella IgG reactive means protected, not infected.** The printed comment
— *"reactive result suggests possible infection"* — is generic text attached to
the assay, not a finding about her. IgG is the long-term antibody: it is what
remains after childhood MMR vaccination or a past infection, and its presence is
the definition of immunity. Acute infection would show as **IgM**, which was not
what was measured. At 219 IU/mL she is far above the usual protective threshold
of around 10 IU/mL.

This matters more than almost any other line on the page. Rubella caught during
early pregnancy is one of the few infections that causes serious congenital
harm, and there is no way to vaccinate against it while pregnant. **Being
already immune removes that risk entirely.**

**Anti-HBs reactive with HBsAg nonreactive is the textbook vaccinated picture.**
The comment says "current or past infection, or recent vaccination" — but read
the two lines together and it resolves cleanly: HBsAg is the marker of actual
infection, and it is **negative**. Anti-HBs is the protective antibody, and at
288 IU/L it is a strong titre (above 10 is considered protective). She is
vaccinated and immune, not a carrier. Practically, this means **the baby will
not need hepatitis B immunoglobulin at birth** on her account.

### HIV screen — Accession 26-09-1131

| Test | Result | Cut-off | Reading |
| --- | --- | --- | --- |
| **HIV Ag/Ab (screening)** | **0.31 S/CO** | 1.0 | **Nonreactive.** Negative. |

Collected and released 18 September, same batch as the rest. Method:
**chemiluminescent microparticle immunoassay (CMIA)**.

**What the number means.** S/CO is "signal to cut-off" — the sample's signal
divided by the line the lab draws for a positive. Anything **under 1.0 is
negative**, and 0.31 is comfortably under it. It is not a percentage and not a
viral load; there is no such thing as a "better" negative than another.

**Ag/Ab is the fourth-generation test**, which looks for two things at once: the
p24 **antigen**, which the virus itself sheds within about two weeks of
infection, and the **antibodies** the body makes over the following weeks.
Catching the antigen is what makes it far more sensitive in the early window
than the older antibody-only tests.

**The footnote is standard text, not a caveat about her.** Every HIV report
carries it: a nonreactive result cannot exclude a very recent exposure, because
nothing detectable has had time to appear. It is printed on all of them.

**Why it is on the prenatal panel at all.** It is offered to everyone in
pregnancy, and the reason is simple and worth knowing: when HIV is known about,
treatment in pregnancy brings the chance of passing it to the baby to under 1%.
Undiagnosed, it is far higher. The test is on the list because the outcome is so
changeable, not because anything was suspected.

**This closes the infection screen.** Rubella, hepatitis B, hepatitis C,
syphilis and HIV were the five, and all five are now back and clear.

### Chemistry — Lab 26596443

| Test | Result | Reference |
| --- | --- | --- |
| **Hemoglobin A1c (NGSP)** | **5.2 %** | Less than 5.7 % |
| Hemoglobin A1c (IFCC) | 33 mmol/mol | Less than 39 |

Normal, with room to spare. The 5.7–6.4 % band is where increased diabetes risk
starts, and 6.5 % and above is the diagnostic range. **A useful baseline going
into the OGTT at 24–28 weeks** — it means she starts this pregnancy with normal
glucose handling, so a later abnormal OGTT would be genuinely gestational rather
than something pre-existing that had gone unnoticed.

### Routine urinalysis — Lab 26596441

| | Result |
| --- | --- |
| Colour / transparency | Yellow, clear |
| pH | 7.0 (ref 4.8–7.8) |
| **Specific gravity** | **1.002 — flagged low** (ref 1.015–1.025) |
| **Protein** | **Negative** |
| Glucose, ketones, bilirubin | Negative |
| **Nitrites, leucocyte esterase** | **Negative** |
| Blood | Negative |
| RBC / WBC / epithelial cells | 0 /HPF |
| Bacteria | 10 /HPF (ref 0–50) |
| Crystals, casts | None seen |

**Clean.** Three things worth naming:

- **Protein negative** is the pre-eclampsia baseline. Pre-eclampsia is high blood
  pressure *plus* protein in the urine, so a clean booking sample beside a
  booking BP of 120/70 is exactly the pair of numbers she wants on file.
- **No sign of a urinary infection** — nitrites, leucocyte esterase and WBCs all
  negative. Worth noting because UTIs are common in pregnancy, often silent, and
  matter more than they do otherwise.
- **The low specific gravity just means very dilute urine** — she was well
  hydrated when she gave the sample. Not a problem in itself. The only caveat is
  that a very dilute sample is slightly less sensitive, so faint findings can be
  missed. Nothing to redo on its own.

### Actions

- [ ] **Get the blood type and Rh status.** Not in this set, and it is standard
      booking work. See the note below on why it is not urgent.
- [ ] **Ask for the hematology / CBC result** (Lab 26596440). It was released the
      same morning but is not in this batch — that is the haemoglobin and
      platelet baseline, and anemia is common in Philippine pregnancies.
- [ ] Confirm whether **HIV screening** was included; it is standard in the
      Philippine prenatal panel and is not among these reports.
- [ ] Mention the Pap smear inflammation note at the next visit.

### On Rh, since there is a bleed

The instinct with any first-trimester bleeding is to worry about anti-D
immunoglobulin. **Current guidance says not to.** ACOG's 2024 clinical practice
update states that patients under 12 weeks with vaginal bleeding or pregnancy
loss **do not require routine Rh testing, and RhIg prophylaxis is not
recommended** — recent evidence found fetal red cells in maternal circulation
stayed below the sensitization threshold in 99.8% of cases before 12 weeks.
SOGC, RCOG and WHO have moved the same way.

So: still get the blood type, because it is needed for the 28-week anti-D dose
and for delivery. But it is **not an emergency because of this bleed**, and it
can be added to the next blood draw.

### Next

Repeat scan, 28 Sept – 5 Oct. Chase the CBC and blood type.

*Sources: [ACOG Clinical Practice Update — Rh D Immune Globulin at Less Than 12 Weeks](https://pubmed.ncbi.nlm.nih.gov/39255498/); [ASRM position statement on Rho(D) immune globulin in the first trimester (2026)](https://www.asrm.org/practice-guidance/practice-committee-documents/position-statement-on-rhod-immune-globulin-administration-in-the-first-trimester-2026/); American Diabetes Association HbA1c thresholds, as printed on the report. Verified 2026-09-18. Confidence: high on the result readings; high on the Rh guidance.*

---

## 4–5 September 2026 — Pap smear · pre-pregnancy work-up

**Makati Medical Center**, Lab CF2608270. Cytology, conventional processing.
Requesting clinician: Dr. Marinette Tuason Sto. Domingo. Reported by
Dr. Alejandro E. Arevalo, MD, FPSP.

| | Result |
| --- | --- |
| Clinical impression | Essentially normal gyne findings |
| Adequacy of specimen | Satisfactory for evaluation |
| **General categorization** | **Negative for intraepithelial lesion or malignancy** |
| Comments | Inflammation |
| LMP recorded | **14 August 2026** |

**"Negative for intraepithelial lesion or malignancy" — NILM — is a normal Pap.**
No precancerous or cancerous cells. That is the whole point of the test and it
came back clear.

**The inflammation note is common and usually non-specific.** It describes what
the cells looked like, not a diagnosis. It can follow a minor irritation, a
recent infection, or nothing identifiable at all. It is worth mentioning at the
next visit so Dra. Villafria can decide whether it needs anything, but on its own
beside a NILM result it is not a finding to chase.

**One useful side effect:** this report independently records **LMP 14 August
2026** — written down two weeks before the scan, for a different purpose, by a
different department. That is third-party corroboration of the date the whole
dating calculation rests on.

---

## 4 September 2026 — What was ordered, and what came back

The request form, signed by **Dr. Marinette Tuason-Sto. Domingo** (Lic. 88082)
and addressed to the Makati Med laboratory, ordered **twelve** tests. **All
twelve results are in hand.**

Three of them spent eleven days appearing to be missing because they sit on
**page 2 of Lab 26596449** — the same report as the hepatitis and rubella
serology, whose page 1 carries no hint that the thyroid, the fasting glucose and
the vitamin D are overleaf. Worth remembering for every report from here: **check
the page count in the top right corner.**

### Everything ordered, against everything received

| # | Test | Ordered | Received | Result | Where it is |
| --- | --- | --- | --- | --- | --- |
| 1 | CBC | yes | **yes** | Normal. Hb 13.5, platelets 209,000, WBC 5.91 | Portal 26596440 |
| 2 | Urinalysis | yes | **yes** | Clean. No protein, no infection | Portal 26596441 |
| 3 | FBS (fasting sugar) | yes | **yes** | 76 mg/dL — normal | Portal 26596449 **page 2** |
| 4 | HbA1c | yes | **yes** | 5.2 % — normal | Portal 26596443 |
| 5 | **T3, T4, TSH** | yes | **yes** | T3 and T4 normal. **TSH 5.13 — high** | Portal 26596449 **page 2** |
| 6 | HBsAg | yes | **yes** | Nonreactive — no hepatitis B | Portal 26596449 |
| 7 | Anti-HBs | yes | **yes** | Reactive 288 — immune | Portal 26596449 |
| 8 | Anti-HCV | yes | **yes** | Nonreactive — no hepatitis C | Portal 26596449 |
| 9 | Rubella IgG | yes | **yes** | Reactive 219 — immune | Portal 26596449 |
| 10 | Vitamin D (25-OH) | yes | **yes** | 29.6 ng/mL — just under the 30 cutoff | Portal 26596449 **page 2** |
| 11 | RPR | yes | **yes** | Nonreactive — syphilis screen clear | Portal 26596452 |
| 12 | HIV Ag/Ab | yes | **yes** | Nonreactive, 0.31 S/CO | **Paper only** — Accession 26-09-1131 |

### Ordered separately, outside that form

| Test | Received | Result | Where it is |
| --- | --- | --- | --- |
| Pap smear | **yes** | NILM — normal. Comment: inflammation | Portal CF2608270 |
| First OB ultrasound | **yes** | Intrauterine, 5w2d, subchorionic hemorrhage | **Paper and films only** |
| Blood pressure | **yes** | 120/70 | Clinic, 18 Sept |

### Never ordered — the boxes are blank, so these were choices

| Test | Verdict |
| --- | --- |
| **Blood typing with Rh** | **Needs adding.** Genuinely required by 28 weeks for the anti-D decision and for delivery. |
| **Ferritin** | **Needs adding.** Not on the form at all. The CBC rules out anaemia but says nothing about iron stores. |
| **Varicella IgG** | **Ask.** Chickenpox immunity. Often skipped where childhood infection is known — check that was the reasoning. |
| 75g OGTT | Correct to omit. Belongs at 24–28 weeks. |
| Group B strep swab | Correct to omit. Belongs at 36–37 weeks. |

**Running total: 12 ordered, 12 received, 0 missing, 3 to add.** Eleven results
normal. One — the TSH — needs a decision.

### The portal has been checked, and it holds six results

Checked 29 September. The Makati Med portal lists **Laboratory 6** and **zero**
under every other section — Radiology, CVDL-Heart Station, Breast Clinic,
Pulmonary, Nuclear Medicine, Other Centers.

| Result ID | Section | Released | What it is |
| --- | --- | --- | --- |
| CF2608270 | Cytology | 5 Sept | Pap smear |
| 26596440 | Hematology | 18 Sept | CBC |
| 26596441 | Clinical microscopy | 18 Sept | Urinalysis |
| 26596443 | Clinical chemistry | 18 Sept | HbA1c |
| 26596449 | Clinical chemistry | 18 Sept | Hepatitis and rubella serology |
| 26596452 | Serology | 18 Sept | RPR |

**Six result IDs, twelve results.** The count is right and the conclusion drawn
from it on 29 September — that three tests were missing — was wrong: one of
those six PDFs runs to two pages and carries five results rather than four. A
portal index counts documents, not tests.

**The portal is not a complete record, so do not treat it as one.** Two results
that exist are absent from it: the **HIV screen** (Accession 26-09-1131, issued
on paper) and the **18 September ultrasound**, which is why Radiology reads zero
despite the scan having happened. Anything that arrives on paper stays on paper.

### What the three newly-missing results would tell you

**The thyroid panel is the one to chase first.** Thyroid demand rises sharply in
the first trimester — the baby cannot make its own thyroid hormone until about
week 12 and relies entirely on yours until then. An underactive thyroid is
common, and its symptoms are exhaustion, feeling cold, low mood and weight
change, every one of which is indistinguishable from ordinary early pregnancy.
It is found by a blood test and treated with a cheap daily tablet. Missing it
is the expensive outcome; finding it is trivial.

Rough first-trimester reading: **TSH up to about 4.0** is generally treated as
normal, though laboratories set their own pregnancy ranges and guidance has
moved on this. Between **2.5 and 4.0**, some guidelines suggest checking thyroid
antibodies (TPO) before deciding anything. Above 4.0 with a normal free T4 is
*subclinical hypothyroidism*, which in pregnancy is usually treated.

**The fasting blood sugar** pairs with the HbA1c already back at 5.2%, which was
reassuring on its own. In pregnancy a fasting glucose **under 92 mg/dL** is
normal; 126 or above would point to diabetes that predates the pregnancy rather
than a gestational one. Together the two make the baseline that the OGTT at
24–28 weeks is compared against.

**The vitamin D** is the least urgent and still worth having. Deficiency is
common in Metro Manila despite the sunshine, precisely because of sun avoidance.
Above **30 ng/mL** is comfortable; below **20** is deficient. It is corrected
with an inexpensive daily supplement, and the pregnancy vitamin usually contains
some already.

*Source: the signed laboratory request form, photographed 29 September 2026, read against the results received. Thyroid and vitamin D thresholds from [American Thyroid Association](https://www.thyroid.org/hypothyroidism-in-pregnancy/), [Korean Thyroid Association 2023 guidelines](https://www.e-enm.org/journal/view.php?doi=10.3803%2FEnM.2023.1696) and [ACOG on vitamin D screening](https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2011/07/vitamin-d-screening-and-supplementation-during-pregnancy). Verified 2026-09-29. Confidence: high for the reconciliation, medium for the thresholds, which are laboratory- and guideline-dependent.*

---

## Template for the next entry

Copy this block. The site picks up any `## ` heading dated `YYYY-MM-DD`.

```
## <date> — <type> · <week>

**<facility>**. Attending: <name>.

### Measurements
| | Finding |
| --- | --- |
| Blood pressure | |
| Weight | |

### What it means

### Actions
- [ ]

### Next
```

### Worth recording every visit

Blood pressure, weight, urine dip (protein and glucose), and from around 20
weeks fundal height. From 24 weeks, fetal heart rate. These are the numbers that
only mean something as a trend — which is the entire reason for keeping this log.

---

## Plain English

Every abbreviation and piece of jargon used anywhere in this handbook, in
ordinary words. If something you were told isn't here, it belongs here — add it.

### On the scan report

| Term | What it means |
| --- | --- |
| **AOG** | Age of gestation. How far along you are, in weeks and days. |
| **EDD / EDC** | Estimated due date / estimated date of confinement. Same thing, two names. |
| **LMP** | Last menstrual period — the first day of your last period. Dating counts from here. |
| **Gestational sac** | The fluid-filled bubble the baby grows inside. The first thing visible on a scan. |
| **Yolk sac** | A small ring inside the sac that feeds the embryo until the placenta takes over. Seeing it is a good sign. |
| **MSD** | Mean sac diameter. The average width of that bubble, used to estimate dating very early on. |
| **CRL** | Crown-rump length. The baby measured head to bottom — the most accurate way to date a pregnancy. |
| **Subchorionic hemorrhage** | A small pocket of blood between the membrane around the pregnancy and the wall of the womb. |
| **Corpus luteum** | What's left of the follicle that released your egg. It makes the hormone holding the pregnancy up until the placenta takes over. |
| **Anteverted** | Your womb tilts forward. Completely normal — most do. |
| **Cul-de-sac** | The space behind the womb. Doctors look for fluid there, which can signal bleeding. |
| **Sliding sign** | Organs move freely against each other. "Positive" means no scarring sticking them together — the good result. |
| **G1 P0** | First pregnancy, no previous births. |
| **Intrauterine** | Inside the womb, where it should be — as opposed to ectopic. |
| **Ectopic** | A pregnancy growing outside the womb, usually in a tube. An emergency, and the main thing early scans rule out. |

### On the blood and urine results

| Term | What it means |
| --- | --- |
| **HbA1c** | Average blood sugar over 2–3 months, in one number. |
| **Reactive / Nonreactive** | The lab's yes / no. Whether it's good news depends on the test — reactive is good for rubella, bad for hepatitis B surface antigen. |
| **IgG** | The long-lasting antibody. Its presence means past infection or vaccination — in other words, immunity. |
| **IgM** | The short-lived antibody. This is the one that signals a *current* infection. |
| **HBsAg** | Hepatitis B surface antigen — the marker of actually having hepatitis B. |
| **Anti-HBs** | The protective antibody against hepatitis B, usually from vaccination. |
| **RPR** | The screening test for syphilis. |
| **HIV Ag/Ab** | The fourth-generation HIV test. Looks for the virus's own protein (antigen) *and* your antibodies, so it picks things up earlier than antibody-only tests. |
| **S/CO** | "Signal to cut-off." The sample's reading divided by the line for a positive. Under 1.0 is negative. Not a percentage. |
| **CMIA** | Chemiluminescent microparticle immunoassay — the machine method. It describes how the lab measured it, not what was found. |
| **NILM** | "Negative for intraepithelial lesion or malignancy" — a normal Pap. No abnormal cells. |
| **CBC** | Complete blood count. Checks your red cells, white cells and platelets. |
| **Rh positive / negative** | A blood group feature. If you're negative and the baby is positive, you may need an injection called anti-D. |
| **/HPF** | "Per high-power field" — how many were seen in one view down the microscope. |
| **Haemoglobin (Hb)** | The part of red blood cells that carries oxygen. Low means anaemia. Pregnancy uses lower cut-offs than usual, because blood volume rises. |
| **Ferritin** | Your iron *stores* — the tank behind the haemoglobin. It empties first, so it drops long before anaemia shows up. |
| **Anaemia** | Not enough oxygen-carrying capacity in the blood. Usually, though not always, caused by low iron. |
| **MCV** | The average size of your red blood cells. Small cells are a hint that iron is low. |
| **Platelets** | The cells that let blood clot. Checked before delivery and before any epidural. |

### Tests coming up

| Term | What it means |
| --- | --- |
| **NIPT** | A blood test from 10 weeks that screens for Down syndrome and two other chromosome conditions. A screen, not a diagnosis. |
| **NT scan** | Nuchal translucency. Measures fluid at the back of the baby's neck, at 11–14 weeks. |
| **Anomaly scan** | The detailed 18–22 week scan that checks the baby's structure head to toe. |
| **OGTT** | Oral glucose tolerance test. You drink something very sweet, then have bloods taken. Tests for pregnancy diabetes. |
| **GBS** | Group B strep. A common harmless bacterium, swabbed for at 35–37 weeks. If present, you get antibiotics during labour. |
| **Tdap** | The whooping cough vaccine, given in every pregnancy so the baby is protected before their own shots. |
| **RSV vaccine** | Protects the newborn against a common winter chest virus. |

### Words about the birth

| Term | What it means |
| --- | --- |
| **Trimester** | A third of the pregnancy. First is weeks 1–13, second 14–27, third 28 onwards. |
| **Preterm** | Born before 37 weeks. |
| **Early term** | 37–38 weeks. Safe, but slightly more breathing and feeding trouble than full term. |
| **Full term** | 39–40 weeks. The lowest-risk window. |
| **Elective** | Planned in advance, rather than because something went wrong. An elective caesarean is a chosen one. |
| **Indication** | A medical reason to do something. "No indication" means there's no medical need. |
| **Placenta previa** | The placenta sitting over the cervix, blocking the exit. Means a caesarean. |
| **Placenta accreta** | The placenta growing too deeply into the womb wall. Serious, and more likely after previous caesareans. |
| **VBAC** | Vaginal birth after caesarean. Often still possible next time. |
| **Pre-eclampsia** | High blood pressure plus protein in the urine. Why they check both at every visit. |
| **Fundal height** | The bump measured from pubic bone to top of the womb, to track growth. |
| **Braxton Hicks** | Practice tightenings. Irregular and painless — not real labour. |
| **Epidural** | Pain relief injected near the spine, numbing you from the waist down. |

### Words about the baby

| Term | What it means |
| --- | --- |
| **Embryo** | What the baby is called up to 8 weeks. |
| **Fetus** | What the baby is called from 8 weeks until birth. |
| **Vernix** | The waxy white coating protecting the baby's skin in the womb. |
| **Lanugo** | Fine soft hair covering the baby before birth. |
| **Meconium** | The baby's first bowel movement — dark and sticky. |
| **Neonatal** | To do with a newborn, roughly the first month. |
| **NICU** | Neonatal intensive care unit. |
| **Congenital** | Present from birth. |
