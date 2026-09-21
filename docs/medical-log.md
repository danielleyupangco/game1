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
| Haemoglobin | The part of blood that carries oxygen — low means anaemia | — | Not done yet | pending | Lab 26596440 |
| Ferritin | Your iron *stores* — runs low long before haemoglobin drops | — | Above 30 ng/mL | pending | not ordered |
| Platelets | The cells that let blood clot | — | Not done yet | pending | Lab 26596440 |
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

- [ ] **Book the repeat scan.** Window is **28 Sept – 5 Oct**. Aim late in it —
      at 7w3d a heartbeat and a crown-rump length should both be measurable, and
      that is the scan that settles both the dating and the subchorionic
      hemorrhage. *From the 18 Sept scan.*
- [ ] **Folic acid, 400–600mcg daily, starting today.** The neural tube closes
      around week 6, which is this week. Nothing else here is as time-critical.

### Ask Dra. Villafria

- [ ] **The bleed and activity.** Specifically: the November walk, and whether
      pelvic rest applies. Evidence does not support routine restriction for a
      small SCH, but this is her call. *From the 18 Sept scan.*
- [ ] **Progesterone support** — asked openly, not expectantly. Evidence is
      mixed: one SCH study found dydrogesterone protective, while broader
      guidance does not recommend routine use.
- [ ] **The due date — which one is she working to?** The scan film says
      **19 May**, the report header says **21 May**. The app uses 19 May. Two
      days apart, and it moves any planned section date with it. The CRL scan
      resolves it, so confirm before booking anything around the birth.
- [ ] **Ferritin, added to the CBC.** The CBC gives haemoglobin, which only
      shows anaemia once it has arrived. Ferritin shows the iron *stores*, and a
      first-trimester haemoglobin catches only about 30% of the people whose
      ferritin is already low. It is usually not in the standard panel, so it
      has to be asked for by name — and it is far easier to fix now than at 32
      weeks. *From the missing CBC.*
- [ ] **The Pap inflammation note.** Common and non-specific beside a normal
      result, but worth raising once. *From the 4–5 Sept Pap.*

### Chase from the lab

- [ ] **Blood type and Rh.** Standard booking work, missing from the 18 Sept
      batch. Needed for the 28-week anti-D dose and for delivery — **not urgent
      because of the bleed**, since current guidance does not recommend RhIg
      under 12 weeks.
- [ ] **The CBC** (Lab 26596440). Released the same morning but not in the batch.
      This is the haemoglobin and platelet baseline, and anemia is common in
      Philippine pregnancies. **Until it arrives there is no iron reading at
      all** — the iron question cannot be answered from anything received so far.

### Already settled — no action

Rubella immune. Hepatitis B immune and not infected. Hepatitis C negative.
Syphilis screen negative. **HIV screen nonreactive.** HbA1c normal. Urine clean,
no protein. Pap normal. Blood pressure 120/70.

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

**The app uses 2027-05-19 — the date printed on the scan film.**

Her paperwork carries both. The report header gives EDC 21 May from LMP dating;
the film prints EDD 05/19/2027 from the sac. The app follows the film, because
that is the dating Dani has been given and the reason she is 5w2d on
18 September rather than 5w0d.

The two-day gap sits well inside the redating threshold either way, so neither
date is wrong. **The CRL scan settles it properly** — and until it does, nothing
irreversible should be booked against either.

### Actions

- [ ] **Book the repeat scan for 28 September – 5 October** (1–2 weeks out, which
      is 6w3d–7w3d). Cardiac activity and a CRL should both be measurable by the
      later end of that window.
- [ ] **Ask Dra. Villafria about the SCH and activity** — specifically the
      marathon walk and the flight.
- [ ] Ask whether she wants progesterone support, which some clinicians use with
      an early SCH.
- [ ] Confirm which due date she is working to — the film's 19 May or the
      header's 21 May.
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
