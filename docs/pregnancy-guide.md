# Pregnancy guide — Nics and Dan's Cub

Source content for the app. Everything here is written to be converted into
structured seed data (`weeks`, `foods`, `stretch_routines`, `shops`,
`red_flags`, expense bands), not rendered as prose.

**Compiled 18 September 2026.** Dani's EDD is 19 May 2027 (Makati Med scan film, 18 Sept 2026); care is with
Dra. Fe Villafria at Makati Medical Center.

> **This is general information, not medical advice.** Every clinical item
> below is guidance from published bodies, not a decision about Dani's care.
> Dra. Villafria's instructions override anything in this file. In an
> emergency, go to the Makati Med ER.

## How to read the source notes

Every clinical, legal and price item carries a source and a `verified` date.
The `confidence` field is doing real work — read it before putting a number in
front of anyone:

| Confidence | Meaning |
| --- | --- |
| `high` | Traced to a named guideline body or statute. Safe to display. |
| `medium` | Consistent across several secondary sources, no primary source reached. Display with the source note visible. |
| `low` | Single secondary source, or sources disagreed. **Display as an estimate and prompt the user to confirm.** |

### A limitation worth stating plainly

This guide was compiled with search access only. The egress policy on the
machine blocked direct access to `sss.gov.ph`, `philhealth.gov.ph`, `pcw.gov.ph`
and `who.int`, so **no Philippine government primary source was read directly**.
Every statutory figure below is from secondary reporting and is marked `medium`
or `low` accordingly. Before Dani or Nico files anything, the numbers need
confirming against the agency itself.

One concrete example of why: search results for the SSS maternity maximum
returned **₱70,000** alongside an average daily salary credit of **₱1,166.67**.
Those two cannot both be right — ₱1,166.67 × 105 days is ₱122,500. The ₱70,000
figure belongs to the old ₱20,000 salary-credit ceiling. See the benefits
section for how this is handled.

---

## 1. Dating and the key dates

**Updated 18 September 2026** with the real dating inputs. The earlier +2 display
offset is gone — it was a fudge standing in for information we now have.

### The inputs

| Field | Value | Source |
| --- | --- | --- |
| First day of last period | **2026-08-14** | Makati Med scan report, 18 Sept 2026 |
| Cycle length | **28–30 days**, average | Dani (Dani recalled LMP as the 15th; the chart says the 14th) |
| Early scan | **5w2d on 2026-09-18**, by mean sac diameter | Makati Med, Dr. Quevedo |
| **EDD in use** | **2027-05-19** | Makati Med scan film, by mean sac diameter |
| Chart EDC (alternative) | 2027-05-21 | Report header, from LMP on a 28-day cycle |

### What each method gives

Naegele's rule is LMP + 280 days, which assumes a 28-day cycle with ovulation on
day 14. A longer cycle ovulates later, so the due date moves later by the same
difference.

| Method | EDD | Implied conception |
| --- | --- | --- |
| **Mean sac diameter, 5w2d — in use** | **2027-05-19** | **2026-08-26** |
| Chart header: LMP 14 Aug + 280, 28-day cycle | 2027-05-21 | 2026-08-28 |
| Recalled LMP 15 Aug, 28-day cycle | 2027-05-22 | 2026-08-29 |
| Recalled LMP 15 Aug, 29-day cycle | 2027-05-23 | 2026-08-30 |

### The corroboration

Every candidate lands within a few days of the conception window the couple
independently recall — **29–31 August**, in South Africa. The chart date implies
the 28th, one day before the window opens; a recalled LMP of the 15th with a
29–30 day cycle lands inside it. The sac reading implies the 26th, furthest out.

Spread across every method: **19–23 May**. Five days, which for a dating estimate
this early is agreement, not conflict.

### Which dating wins, and why

**The app uses 2027-05-19 — the scan's own date.**

Her paperwork carries both: the report header says EDC 21 May from LMP dating,
and the scan film prints EDD 05/19/2027 from the sac measurement. Two days
apart. The app follows the film, because that is the dating Dani is being given
and the reason she reads 5w2d rather than 5w0d on 18 September.

Worth holding lightly. The two-day gap sits well inside the ACOG threshold, so
neither is "wrong", and **the crown-rump-length scan settles it properly**.
Nothing irreversible — flights, leave dates, a booked section — should be fixed
before then.

ACOG Committee Opinion 700 sets when a scan should replace LMP dating: at
8w6d or earlier, only when the two disagree by **more than 5 days**. On the
chart's own numbers the disagreement is **2 days** — the report header reads AOG
5w0d by LMP against 5w2d by sac. Well inside tolerance, so the LMP date is kept.

Two further reasons not to redate on this scan:

- **The thresholds are written for crown-rump length.** A mean sac diameter is
  not a recommended dating measurement, and at 5w2d there is often no measurable
  embryo yet. The sac reading is weaker evidence than the numbers suggest.
- **The methods actually agree.** Three to five days apart, this early, is
  corroboration rather than conflict.

**What settles it properly:** the dating scan at 7–9 weeks, when a crown-rump
length can be measured. That is the measurement ACOG dates by, and if it moves
the EDD by more than five days, redate then — by changing the EDD, not by adding
an offset.

*Source: [ACOG Committee Opinion 700, Methods for Estimating the Due Date](https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2017/05/methods-for-estimating-the-due-date). Verified 2026-09-18. Confidence: high.*

### Where the pregnancy stands

On **18 September 2026**, with an EDD of 2027-05-19: **Week 5, Day 2**, with 243
days to go — matching the impression on the scan report.

The app computes this as `280 − (EDD − today)` on Manila calendar dates, plus a
per-pregnancy `dating_offset_days` that is **now zero**. The offset stays in the
model because it is the right place to hold a clinic redating that arrives
without a revised LMP — but it is set from a scan, never to make a number look
right.

### Milestone dates

One column now, because there is only one dating. Unchanged from the previous
standard-dating column: the EDD did not move.

| Milestone | Gestational age | Date |
| --- | --- | --- |
| Implied LMP | 0w0d | 2026-08-12 |
| Implied conception | 2w0d | 2026-08-26 |
| **Repeat scan — confirms viability** | **6w3d – 7w3d** | **2026-09-26 – 2026-10-03** |
| Dating scan window (CRL measurable) | 7w0d – 9w0d | 2026-09-30 – 2026-10-14 |
| NIPT available from | 10w0d | 2026-10-21 |
| NT scan window | 11w0d – 13w6d | 2026-10-28 – 2026-11-17 |
| End of first trimester | 13w6d | 2026-11-17 |
| Anomaly scan window | 18w0d – 22w0d | 2026-12-16 – 2027-01-13 |
| OGTT window | 24w0d – 28w0d | 2027-01-27 – 2027-02-24 |
| Tdap window | 27w0d – 36w0d | 2027-02-17 – 2027-04-21 |
| Third trimester begins | 28w0d | 2027-02-24 |
| RSV vaccine window opens | 32w0d | 2027-03-24 |
| GBS swab window | 35w0d – 37w0d | 2027-04-14 – 2027-04-28 |
| Hospital bag packed by | 35w0d | 2027-04-14 |
| Term | 37w0d | 2027-04-28 |
| **EDD** | **40w0d** | **2027-05-19** |

### If a caesarean is planned

| Week | Window | Note |
| --- | --- | --- |
| 37 — early term | 2027-04-28 – 2027-05-04 | Only with a medical indication |
| **38 — early term** | **2027-05-05 – 2027-05-11** | Only with a medical indication |
| **39 — full term** | **2027-05-12 – 2027-05-18** | ACOG's recommended window for a planned section without an indication |

ACOG recommends timing an elective caesarean at **39w0d or later**, because
neonatal respiratory problems, temperature and glucose instability and NICU
admission are all measurably higher before then. That guidance reverses when
there is a medical or obstetric indication — deferring to 39 weeks is then
explicitly *not* recommended. So the question to settle first is whether a
section would be indicated or elective, not which date.

*Source: [ACOG — Avoidance of Nonmedically Indicated Early-Term Deliveries](https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2019/02/avoidance-of-nonmedically-indicated-early-term-deliveries-and-associated-neonatal-morbidities); [ACOG — Medically Indicated Late-Preterm and Early-Term Deliveries](https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2021/07/medically-indicated-late-preterm-and-early-term-deliveries). Verified 2026-09-18.*

40 weeks lands exactly on the due date, which is what an estimated due date
means.

---

## 2. Tests and appointments by stage

All timings are the standard schedule; Dra. Villafria sets the actual plan.

| Test | When | What it is | Source | Confidence |
| --- | --- | --- | --- | --- |
| Dating / viability scan | 6–9 weeks | Confirms pregnancy location, heartbeat, and dating. Dating by crown-rump length in the first trimester is more accurate than LMP. | ACOG / RCOG standard practice | high |
| NIPT (cell-free DNA) | From 10 weeks | Blood screen for trisomy 21, 18, 13. A screen, not a diagnosis — a high-risk result needs confirmatory testing. | ACOG Practice Bulletin 226 | high |
| NT scan | 11w0d – 13w6d | Nuchal translucency + nasal bone, usually combined with first-trimester bloods. | Fetal Medicine Foundation standard window | high |
| Anomaly scan (CAS) | 18–22 weeks | Detailed structural survey. | Philippine Society of Maternal Fetal Medicine | high |
| OGTT | 24–28 weeks | Gestational diabetes screen. 75g two-hour test is standard in PH practice. | ADA / PH practice | high |
| Tdap | 27–36 weeks, **early in the window** | Maternal antibodies cross to the baby; pertussis protection before the baby's own shots. Given in *every* pregnancy, regardless of prior doses. | ACOG | high |
| RSV vaccine (Abrysvo) | 32w0d – 36w6d | Single dose, not within 2 weeks of a planned delivery. | ACOG Practice Advisory; ACOG 2026–27 respiratory season release, Sept 2026 | high |
| GBS swab | 35–37 weeks | Group B strep; a positive result means IV antibiotics in labour. | ACOG | high |

### Two flags on the vaccine timing

**RSV seasonality is not the US calendar.** ACOG's window of 1 September –
1 March reflects Northern-Hemisphere temperate RSV seasonality. Philippine RSV
activity tracks the rainy season instead, broadly mid-year. Dani reaches
32 weeks on **28 March 2027** on standard dating. Whether that is the right
moment is a question for Dra. Villafria against local surveillance — do **not**
let the app assert the US window as though it applied in Manila.
`confidence: low` on the seasonal timing; `high` on the 32–36 week gestational
window itself.

**Tdap: earlier in the window is better.** 27–28 weeks beats 35 weeks, because
antibody transfer needs time. Worth surfacing as a nudge, not just a date range.

*Sources: [ACOG maternal RSV vaccination](https://www.acog.org/clinical/clinical-guidance/practice-advisory/articles/2023/09/maternal-respiratory-syncytial-virus-vaccination), [ACOG 2026–27 respiratory virus season recommendations](https://www.acog.org/news/news-releases/2026/09/acog-releases-2026-27-respiratory-virus-season-immunization-recommendations), [ACOG Tdap in pregnancy](https://www.acog.org/womens-health/faqs/the-tdap-vaccine-and-pregnancy), [PSMFM congenital anomaly scan](https://psmfm.org/web/information-hub/congenital-anomaly-scan/). Verified 2026-09-18.*

---

## 3. Week by week (4–40)

Each week supplies six fields for the `weeks` seed table: `size`, `baby`,
`you`, `tests`, `nutrition`, `stretch`, `filipinoNote`.

**Size comparisons are approximations**, and deliberately so — babies vary
enormously and the fruit is a mnemonic, not a measurement. Each week gives a
fruit and a Filipino-market item; the app should label both "roughly the size
of".

*Developmental content follows the standard sequence described by ACOG, the NHS
pregnancy guide and Mayo Clinic's fetal development series. Verified
2026-09-18. Confidence: high for the sequence; the week at which any individual
milestone appears varies by a week either way between sources.*

### First trimester

**Week 4 — poppy seed / one malunggay leaflet**
- *Baby:* A ball of cells has burrowed into the uterine lining and become an embryo with three layers, which will form the nervous system, the organs, and the skin and skeleton.
- *You:* Most people feel nothing at all. A pregnancy test turns positive around now. Some light spotting as the embryo implants is normal.
- *Tests:* Confirm the pregnancy. Book a first appointment with Dra. Villafria.
- *Nutrition:* Folic acid, 400mcg daily, ideally already started. This is the window where it matters most for neural tube closure.
- *Stretch:* Nothing new. Keep whatever you already do.
- *Filipino life:* Most couples tell nobody yet — not even family. There is no obligation to.

**Week 5 — sesame seed / a single sago pearl**
- *Baby:* The neural tube closes. A heart tube begins to beat, though far too faintly to hear.
- *You:* Tiredness that feels unreasonable. Sore breasts. Nausea may start.
- *Tests:* First prenatal visit is usually booked for 6–8 weeks.
- *Nutrition:* Folate continues. Start thinking about iron-rich food; pair it with calamansi for absorption.
- *Stretch:* Gentle walking. Nothing strenuous is required.
- *Filipino life:* If you are still commuting in Makati traffic, this is the week that starts to feel long.

**Week 6 — lentil / one mung bean (monggo)**
- *Baby:* Facial features begin as small folds. Arm and leg buds appear. The heartbeat may be visible on a scan.
- *You:* Morning sickness rarely keeps to mornings. Smells become overwhelming.
- *Tests:* Dating scan often falls between 6 and 9 weeks.
- *Nutrition:* Eat what stays down. This is not the week for nutritional perfection.
- *Stretch:* Gentle neck and shoulder rolls; nausea makes people hunch.
- *Filipino life:* Ginger tea (salabat) is the standard local remedy for nausea, and it is a reasonable one.

**Week 7 — blueberry / one calamansi**
- *Baby:* The brain is growing fast. Hands and feet look like paddles.
- *You:* More frequent trips to the bathroom. Possibly food aversions to things you used to love.
- *Tests:* Bloods at the first visit: blood type, CBC, hepatitis B, syphilis, HIV, urinalysis.
- *Nutrition:* Small, frequent meals beat three large ones. Dry crackers before getting up can help.
- *Stretch:* Morning routine, trimester one — slow, short, no core work.
- *Filipino life:* The repeat scan falls just before this week. Vietnam was planned for around now and has been cancelled.

**Week 8 — raspberry / one small kalamansi to a grape**
- *Baby:* Now officially a fetus. Fingers and toes are separating. It moves, though you cannot feel it.
- *You:* Nausea often peaks between weeks 8 and 11.
- *Tests:* If not already done, the dating scan.
- *Nutrition:* Vitamin B6 helps some people with nausea — ask Dra. Villafria before adding anything.
- *Stretch:* Cat-cow on hands and knees, slowly.
- *Filipino life:* Aircon and hydration matter more than usual; Manila heat plus nausea is a bad pairing.

**Week 9 — green olive / one lanzones**
- *Baby:* The tail is gone. Essential organs are all present in early form.
- *You:* Waistbands feel different before there is anything to see.
- *Tests:* Discuss NIPT — available from week 10.
- *Nutrition:* Keep fluids up. Dehydration makes nausea worse, which makes drinking harder.
- *Stretch:* Ankle circles and calf stretches; circulation changes start early.
- *Filipino life:* Worth deciding now who gets told first, before anyone guesses.

**Week 10 — prune / one small santol**
- *Baby:* Vital organs are functioning. Nails begin forming.
- *You:* Nausea may begin to lift, or may not — both are normal.
- *Tests:* **NIPT available from today.** NT scan can be booked for 11–13+6.
- *Nutrition:* Iodine matters for brain development; iodised salt and fish cover it.
- *Stretch:* Add gentle hip openers.
- *Filipino life:* NIPT is widely available in Metro Manila but is largely out of pocket — see costs.

**Week 11 — lime / one dalandan**
- *Baby:* Bones are hardening. The baby can hiccup, though you cannot feel it.
- *You:* Energy may start to return.
- *Tests:* **NT scan window opens.**
- *Nutrition:* Calcium, 1000mg daily. Kesong puti, milk, sardines with bones.
- *Stretch:* Morning routine, full version.
- *Filipino life:* Many couples book the NT scan and the announcement photos on the same day.

**Week 12 — plum / one small mango**
- *Baby:* Reflexes are developing. Fingers and toes can curl.
- *You:* The uterus is rising out of the pelvis. Miscarriage risk drops substantially from here.
- *Tests:* NT scan, if not already done.
- *Nutrition:* Start DHA if not already — 200–300mg daily.
- *Stretch:* Add gentle side stretches.
- *Filipino life:* **The traditional announcement point.** Many Filipino couples wait until after 12 weeks precisely because of the drop in risk.

**Week 13 — peach / one chico**
- *Baby:* Vocal cords form. Fingerprints are appearing.
- *You:* The last week of the first trimester. Appetite often returns properly.
- *Tests:* NT scan window closes at 13+6.
- *Nutrition:* From the second trimester, roughly +340 kcal a day. Not before.
- *Stretch:* Begin the second-trimester routine next week.
- *Filipino life:* Expect food to start arriving from relatives once the news is out.

### Second trimester

**Week 14 — lemon / one saba banana**
- *Baby:* Facial muscles work; the baby can squint and frown. Fine lanugo hair covers the skin.
- *You:* The "good trimester" usually begins. Energy returns.
- *Tests:* Routine check-up.
- *Nutrition:* +340 kcal daily from now. That is a sandwich and a glass of milk, not a second dinner.
- *Stretch:* Second-trimester routine. **Stop lying flat on your back for long periods from about 16 weeks.**
- *Filipino life:* A good window for travel, if any is planned.

**Week 15 — apple / one medium mango**
- *Baby:* Can sense light through closed eyelids. Bones continue hardening.
- *You:* Possible nasal congestion and bleeding gums — both are normal pregnancy circulation changes.
- *Tests:* Routine.
- *Nutrition:* Vitamin C with iron-rich meals. Calamansi over everything is genuinely good advice here.
- *Stretch:* Side-lying rest position; start getting used to sleeping on the left.
- *Filipino life:* Soft toothbrush; dental care is safe and worth keeping up in pregnancy.

**Week 16 — avocado / one small papaya**
- *Baby:* May begin to hear. Growing rapidly.
- *You:* Some feel the first flutters between 16 and 22 weeks. First pregnancies tend towards the later end.
- *Tests:* Routine. Book the anomaly scan.
- *Nutrition:* Choline — eggs are the easiest source.
- *Stretch:* Pelvic tilts. Avoid supine positions.
- *Filipino life:* **Korea trip falls near here** — the best-timed trip. See travel.

**Week 17 — pear / one guava**
- *Baby:* Fat stores begin to form. The skeleton shifts from cartilage to bone.
- *You:* Round ligament pain — sharp, brief twinges at the sides of the belly when you move suddenly.
- *Tests:* Routine.
- *Nutrition:* Keep protein steady across the day.
- *Stretch:* Gentle hip flexor stretch helps round ligament discomfort.
- *Filipino life:* Time to think about whether you will find out the sex, and whether you want a reveal.

**Week 18 — bell pepper / one small buko**
- *Baby:* Yawning, and moving a great deal. The sex is usually visible on a scan.
- *You:* Movement becomes more convincing.
- *Tests:* **Anomaly scan window opens (18–22 weeks).**
- *Nutrition:* Iron demand rises through the second trimester.
- *Stretch:* Add wall-supported squats if comfortable.
- *Filipino life:* Gender reveals are popular and often large. There is no obligation to have one.

**Week 19 — mango / one large mango**
- *Baby:* Vernix, a waxy coating, protects the skin. Sensory areas of the brain develop.
- *You:* Possible leg cramps at night, and dizziness on standing quickly.
- *Tests:* Anomaly scan, if booked.
- *Nutrition:* Magnesium and hydration for cramps.
- *Stretch:* Calf stretches before bed, specifically.
- *Filipino life:* Standing in long queues gets harder; ask for the priority lane, which you are entitled to.

**Week 20 — banana / one medium papaya**
- *Baby:* Halfway. Swallowing, and producing meconium.
- *You:* The bump is usually visible to others now.
- *Tests:* Anomaly scan commonly falls this week.
- *Nutrition:* Fibre and water; constipation is very common from here.
- *Stretch:* Full second-trimester routine, morning and night.
- *Filipino life:* Halfway is a common point for a small family celebration.

**Week 21 — carrot / one medium sayote**
- *Baby:* Movements become coordinated kicks rather than flutters.
- *You:* Appetite is usually strong. Heartburn may begin.
- *Tests:* Routine.
- *Nutrition:* Smaller meals help heartburn more than avoiding specific foods does.
- *Stretch:* Upper-back opener; posture is starting to change.
- *Filipino life:* **India trip falls near here.** This is the highest-planning trip — see travel.

**Week 22 — papaya / one small melon**
- *Baby:* Lips, eyelids and eyebrows are distinct. Grip is developing.
- *You:* Stretch marks may appear. Nothing prevents them reliably, whatever the cream claims.
- *Tests:* Anomaly scan window closes.
- *Nutrition:* Keep calcium consistent.
- *Stretch:* Add thoracic rotation, seated.
- *Filipino life:* Ignore the pressure to buy expensive stretch mark oils. Moisturiser is fine.

**Week 23 — grapefruit / one small langka segment cluster**
- *Baby:* Can hear voices clearly now — including Nico's, which is lower and carries better.
- *You:* Swelling in the feet, especially in Manila heat.
- *Tests:* Routine.
- *Nutrition:* Reduce added salt if swelling is bothersome, but do not cut salt drastically.
- *Stretch:* Legs up the wall, five minutes, in the evening.
- *Filipino life:* This is a good week for Nico to start talking to the bump. It is not silly; the baby can hear him.

**Week 24 — corn cob / one medium suha segment**
- *Baby:* **Viability milestone.** Lungs develop surfactant. Survival outside the womb becomes possible with intensive care.
- *You:* Braxton Hicks — irregular, painless tightenings — may begin.
- *Tests:* **OGTT window opens (24–28 weeks).**
- *Nutrition:* Balanced carbohydrates ahead of the glucose test; do not crash-diet before it.
- *Stretch:* Keep the routine short and frequent rather than long.
- *Filipino life:* A meaningful milestone worth marking privately.

**Week 25 — cauliflower / one small upo**
- *Baby:* Putting on fat. Skin is less translucent.
- *You:* Backache is common as the centre of gravity shifts.
- *Tests:* Routine.
- *Nutrition:* Protein at breakfast steadies energy through the day.
- *Stretch:* Pelvic tilts and child's pose with knees wide.
- *Filipino life:* Consider the yaya search now if you plan to hire — good ones are booked early.

**Week 26 — lettuce head / one medium pechay bundle**
- *Baby:* Eyes open. Responds to sound with movement.
- *You:* Sleep gets harder. A pillow between the knees helps.
- *Tests:* OGTT if not yet done.
- *Nutrition:* Avoid large meals late; reflux worsens lying down.
- *Stretch:* Night routine, emphasising hips.
- *Filipino life:* Start the hospital pre-registration conversation with Makati Med.

**Week 27 — cabbage head / one small kalabasa**
- *Baby:* Last week of the second trimester. Brain activity increases sharply.
- *You:* Shortness of breath as the uterus presses upward.
- *Tests:* **Tdap window opens — take it early in the window, not late.**
- *Nutrition:* Iron; demand peaks in the third trimester.
- *Stretch:* Side-lying stretches only; avoid supine.
- *Filipino life:* A good time to file the SSS maternity notification. See benefits.

### Third trimester

**Week 28 — aubergine / one medium kalabasa**
- *Baby:* Can blink. Sleep cycles, including REM, are established.
- *You:* Visits usually move to every two weeks.
- *Tests:* OGTT window closes. Tdap if not yet given. Rh immunoglobulin if Rh negative.
- *Nutrition:* **+450 kcal daily from the third trimester.**
- *Stretch:* Third-trimester routine: shorter holds, wider base, more support.
- *Filipino life:* Baby showers are commonly held in the third trimester here, not earlier.

**Week 29 — butternut squash / one medium kalabasa**
- *Baby:* Muscles and lungs maturing. Kicks are strong enough to be visible.
- *You:* Heartburn, haemorrhoids and swelling are all common and all normal.
- *Tests:* Routine.
- *Nutrition:* Fibre, water, and do not ignore constipation.
- *Stretch:* Supported squats and pelvic floor work.
- *Filipino life:* **Mexico trip falls near here — see the Zika warning. This is the trip to reconsider.**

**Week 30 — large cabbage / one small winter melon**
- *Baby:* Around 1.3kg. Gaining roughly 200g a week from here.
- *You:* Fatigue returns. Sleep is broken.
- *Tests:* Routine. Start discussing the birth plan.
- *Nutrition:* Keep iron and calcium steady.
- *Stretch:* Birth-ball sitting instead of a chair, where practical.
- *Filipino life:* Start the hospital bag list even if you pack it later.

**Week 31 — coconut / one buko**
- *Baby:* All five senses working. Turning towards light.
- *You:* Braxton Hicks more noticeable.
- *Tests:* Routine.
- *Nutrition:* Small frequent meals; there is less room for the stomach now.
- *Stretch:* Hip and lower back focus.
- *Filipino life:* Confirm what Makati Med allows for birth companions — policies change.

**Week 32 — jicama / one medium singkamas**
- *Baby:* Most babies have turned head-down, though many still turn later.
- *You:* Visits may increase in frequency.
- *Tests:* **RSV vaccine window opens (32–36 weeks)** — but see the seasonality flag above; confirm timing with Dra. Villafria.
- *Nutrition:* Vitamin D and calcium for the final bone-building phase.
- *Stretch:* Avoid deep twists. Keep movements small and supported.
- *Filipino life:* **Airline cutoff territory.** Most carriers require medical clearance from around here. Flying gets complicated from this point.

**Week 33 — pineapple / one medium pinya**
- *Baby:* Bones hardening, except the skull, which stays soft to allow moulding during birth.
- *You:* Possible carpal tunnel symptoms from fluid retention.
- *Tests:* Routine.
- *Nutrition:* Keep hydration high in Manila heat.
- *Stretch:* Wrist and forearm stretches, genuinely useful this week.
- *Filipino life:* Confirm the paediatrician who will attend the birth.

**Week 34 — cantaloupe / one small melon**
- *Baby:* Fingernails reach the fingertips. Lungs nearly mature.
- *You:* The baby may drop, easing breathing but increasing pelvic pressure.
- *Tests:* Routine, likely weekly soon.
- *Nutrition:* Steady, unremarkable eating. Nothing special required.
- *Stretch:* Gentle only. Stop anything that strains.
- *Filipino life:* Finalise the birth plan and share it with Dra. Villafria.

**Week 35 — honeydew melon / one medium melon**
- *Baby:* Gaining fat quickly. Getting into position.
- *You:* Frequent urination returns as the head engages.
- *Tests:* **GBS swab window opens (35–37 weeks).**
- *Nutrition:* Keep iron up going into delivery.
- *Stretch:* Pelvic floor and breathing practice.
- *Filipino life:* **Hospital bag packed by now.** Both bags — Dani's and Nico's.

**Week 36 — romaine lettuce / one medium papaya**
- *Baby:* Considered early term from 37 weeks; almost there.
- *You:* Visits usually become weekly.
- *Tests:* GBS if not done. Tdap window closes.
- *Nutrition:* Eat normally. There is no food that starts labour, whatever you are told.
- *Stretch:* Walking and gentle hip openers.
- *Filipino life:* Expect a great deal of advice this month. See the pamahiin section.

**Week 37 — Swiss chard / one small langka**
- *Baby:* **Early term.** Practising breathing and sucking.
- *You:* Nesting is common. So is exhaustion.
- *Tests:* Weekly checks. Position assessed.
- *Nutrition:* Nothing special. Keep eating well.
- *Stretch:* Whatever is comfortable, and nothing that is not.
- *Filipino life:* Confirm the route to Makati Med, and a backup for traffic.

**Week 38 — leek / one medium upo**
- *Baby:* Around 3kg. Organs ready.
- *You:* Pelvic pressure, and possibly a loss of the mucus plug.
- *Tests:* Weekly.
- *Nutrition:* Keep hydrated; early labour is tiring.
- *Stretch:* Walking, birth ball, breathing.
- *Filipino life:* Keep the phone charged and the car fuelled.

**Week 39 — watermelon (small) / one small pakwan**
- *Baby:* **Full term.** Brain and lungs continue to mature right up to birth.
- *You:* Any day. Braxton Hicks may become regular contractions.
- *Tests:* Weekly, with position and cervix checks.
- *Nutrition:* Eat when hungry; labour uses a lot of energy.
- *Stretch:* Gentle movement, rest when tired.
- *Filipino life:* Ignore anyone who tells you the baby is late. 39 weeks is full term.

**Week 40 — pumpkin / one medium kalabasa**
- *Baby:* Fully developed and ready.
- *You:* The EDD is an estimate. Only about 1 in 20 babies arrive on it.
- *Tests:* Monitoring increases past the due date. Discuss the induction plan.
- *Nutrition:* Normal eating.
- *Stretch:* Rest, walk, breathe.
- *Filipino life:* Going past the due date is normal and not a failure. Expect a lot of phone calls.

---

## 4. Food guide

Seeds the `foods` table. Columns: `name`, `category`, `status`
(`safe` / `caution` / `avoid`), `reason`, `aliases`.

**The framing matters.** Most of this list is `safe`. The app should default to
reassurance and reserve `avoid` for genuine risk — a checker that flags
everything is a checker nobody opens twice.

*Sources: the risk categories below follow ACOG and NHS food-in-pregnancy
guidance (listeria, toxoplasma, salmonella, methylmercury, vitamin A). Filipino
dish assessments apply those same categories to local preparation methods.
Verified 2026-09-18. Confidence: high for the underlying rules; medium for
individual dish calls, which depend on how a given kitchen prepares them.*

### The five rules underneath the list

1. **Raw or undercooked animal protein** — risk of listeria, salmonella, toxoplasma.
2. **Unpasteurised dairy** — listeria.
3. **High-mercury fish** — methylmercury accumulates and affects the developing nervous system.
4. **Liver and high-dose vitamin A** — teratogenic in large amounts.
5. **Alcohol** — no established safe amount at any stage.

Everything else is a question of hygiene and reheating, not of the food itself.

### Filipino dishes and local items

| Food | Status | Reason |
| --- | --- | --- |
| Kinilaw | avoid | Raw fish "cooked" in vinegar only. Acid does not kill listeria or parasites. |
| Balut | caution | Safe if fully cooked and served hot. The risk is undercooking and street-stall holding temperature. |
| Bagoong (shrimp paste) | caution | Fermented, very high in salt. Safe cooked into a dish; avoid raw spoonfuls. |
| Tuyo / daing (dried fish) | safe | Cooked through before eating. Very high sodium. |
| Isaw (grilled intestine) | caution | Only if hot, fully cooked and from a clean source. Street versions are often reheated repeatedly. |
| Fishball / kikiam / squidball | caution | Same reasoning — the sauce sitting out in the open is the bigger risk than the ball. |
| Taho | caution | Safe if the soy is fresh and kept hot. Room-temperature street taho is a spoilage risk. |
| Halo-halo | caution | Depends entirely on the ice and the milk. From a reputable shop, fine. |
| Kesong puti | caution | **Only if pasteurised.** Traditional carabao-milk versions often are not. Ask. |
| Longganisa | safe | Cooked through. High in fat and salt. |
| Tocino | safe | Cooked through. Very high in sugar. |
| Hotdog (Filipino-style) | safe | Safe when heated until steaming. Cold from the pack is a listeria risk. |
| Sisig | safe | Served sizzling and fully cooked. Often includes chicken liver — see vitamin A. |
| Ripe papaya | safe | Ripe papaya is fine and a good source of vitamin C and folate. |
| Green (unripe) papaya | caution | Contains latex/papain. Small amounts cooked in tinola are widely eaten; avoid large quantities raw. |
| Pineapple | safe | The bromelain-causes-miscarriage claim is a myth at any realistic quantity. |
| Malunggay (moringa) | safe | Excellent source of iron, calcium and vitamin C. Commonly eaten throughout pregnancy. |
| Salabat (ginger tea) | safe | Genuinely helps nausea. Caffeine-free. |
| Milk tea | caution | Caffeine plus a large sugar load. Counts towards the 200mg daily caffeine limit. |
| Kapeng barako | caution | Notably strong. One cup can approach half the daily caffeine limit. |
| Sinigang | safe | Boiled, fully cooked. |
| Tinola | safe | Boiled. Green papaya content is small and cooked. |
| Adobo | safe | Cooked and acidic. |
| Kare-kare | safe | Fully cooked. Bagoong served on the side — see above. |
| Lechon | safe | Safe when hot and freshly carved; risk is in long room-temperature holding. |
| Dinuguan | caution | Pork blood stew. Safe fully cooked and hot; ensure it is not reheated repeatedly. |
| Chicharon | safe | Cooked. Very high in salt and fat. |
| Ube halaya | safe | Cooked. |
| Leche flan | caution | Safe when steamed through. Avoid versions with barely-set or raw egg. |
| Buko juice | safe | Excellent hydration. Drink fresh, not left standing. |
| Sago't gulaman | caution | Depends on water and ice quality. |
| Puto / kutsinta | safe | Steamed. |
| Pancit | safe | Cooked. |
| Lumpiang sariwa | caution | Fresh wrapper and raw vegetables — a washing question. Fine at home. |
| Street-vendor ice | avoid | Water source is unknown; a common cause of GI illness. |

### Fish and mercury

The rule: **avoid the large, long-lived predators; eat the small ones freely.**
Two to three servings a week of low-mercury fish is positively recommended, not
merely permitted — the omega-3s matter for brain development.

| Fish | Status | Reason |
| --- | --- | --- |
| Marlin | avoid | High mercury. |
| Swordfish | avoid | High mercury. |
| King mackerel | avoid | High mercury. |
| Large tanigue (Spanish mackerel) | avoid | High mercury in larger specimens. |
| Shark | avoid | High mercury. |
| Bigeye tuna | avoid | High mercury. |
| Tuna, canned light | caution | Limit to roughly 2 servings a week. |
| Tuna, albacore/yellowfin | caution | Higher mercury than light; limit to 1 serving a week. |
| Bangus (milkfish) | safe | Low mercury. A staple and a good one. |
| Tilapia | safe | Low mercury. |
| Galunggong (round scad) | safe | Low mercury. |
| Salmon | safe | Low mercury, high omega-3. Cooked, not raw. |
| Sardines (incl. canned) | safe | Low mercury, high calcium when bones are eaten. |
| Dilis (anchovies) | safe | Low mercury. |
| Tilapia / hito (catfish) | safe | Low mercury. |
| Shrimp / hipon | safe | Low mercury. Cook thoroughly. |
| Crab / alimango | safe | Cooked. |
| Squid / pusit | safe | Cooked. |
| Tahong (mussels) | caution | Safe fully cooked and from a clean source; discard any that stay shut. Check for red tide advisories. |
| Talaba (oysters), raw | avoid | Raw shellfish. |
| Oysters, cooked | safe | Cooked thoroughly. |
| Sashimi / sushi with raw fish | avoid | Raw fish. |
| Sushi with cooked fillings | safe | California roll, ebi, unagi, tamago. |
| Smoked salmon, refrigerated | caution | Listeria risk unless heated through or in a cooked dish. |

### Dairy and eggs

| Food | Status | Reason |
| --- | --- | --- |
| Pasteurised milk | safe | |
| Unpasteurised / raw milk | avoid | Listeria. |
| Carabao milk, unpasteurised | avoid | Listeria. |
| Hard cheese (cheddar, parmesan, edam) | safe | Safe even when unpasteurised; low moisture. |
| Soft cheese, pasteurised (mozzarella, cream cheese, cottage) | safe | |
| Soft mould-ripened cheese (brie, camembert) | caution | Avoid unless cooked until steaming. |
| Blue cheese (roquefort, gorgonzola) | caution | Same — cooked only. |
| Feta, pasteurised | safe | |
| Queso de bola | safe | Hard cheese. |
| Yoghurt, pasteurised | safe | Live cultures are fine. |
| Ice cream, commercial | safe | Made with pasteurised milk. |
| Soft-serve ice cream | caution | Machine hygiene is the variable. |
| Eggs, fully cooked | safe | |
| Eggs, runny or raw | caution | Salmonella risk. Lower where eggs are vaccinated, which is not standard in PH. |
| Homemade mayonnaise, raw-egg desserts, eggnog | avoid | Raw egg. |
| Commercial mayonnaise | safe | Made with pasteurised egg. |

### Meat

| Food | Status | Reason |
| --- | --- | --- |
| Beef / pork / chicken, well cooked | safe | |
| Rare or medium-rare steak | avoid | Toxoplasma. |
| Pork, undercooked | avoid | Toxoplasma and parasites. |
| Liver, chicken or pork | caution | **Limit strictly** — very high preformed vitamin A. Small amounts in sisig are fine; a liver dish as a main is not. |
| Liver pâté | avoid | Vitamin A plus listeria. |
| Deli meat / cold cuts | caution | Heat until steaming. |
| Tapa / tocino / longganisa | safe | Cooked through. |
| Cured ham (prosciutto, jamón) | caution | Cook it, or skip it. |
| Hotdogs, cold | caution | Heat until steaming. |
| Chicken, leftover | safe | Reheat once, until steaming. |

### Drinks

| Food | Status | Reason |
| --- | --- | --- |
| Alcohol — all forms | avoid | **No established safe amount.** Includes lambanog, beer, wine, and alcohol in cooking that has not been boiled off. |
| Brewed coffee | caution | Counts towards 200mg/day. |
| Espresso | caution | Counts towards 200mg/day. |
| Kapeng barako | caution | Strong; counts heavily. |
| Tea (black, green) | caution | Lower caffeine, still counts. |
| Herbal tea | caution | Ginger and rooibos are fine. Avoid unfamiliar herbal blends. |
| Salabat | safe | Caffeine-free. |
| Soft drinks with caffeine (Coke) | caution | Counts towards the limit. |
| Energy drinks | avoid | High caffeine plus unstudied stimulants. |
| Fresh juice, commercial pasteurised | safe | |
| Unpasteurised / street fresh juice | caution | Hygiene of water, ice and handling. |
| Buko juice, fresh | safe | |
| Tap water, Metro Manila | caution | Generally treated, but filtered or bottled is the common practice. |

### Other

| Food | Status | Reason |
| --- | --- | --- |
| Peanuts | safe | No reason to avoid unless Dani is allergic. |
| Bean sprouts, raw (togue) | caution | Cook them. |
| Unwashed fruit and vegetables | caution | Toxoplasma from soil. Wash well. |
| Pre-cut fruit left standing | caution | |
| Salad from a buffet | caution | Holding time and handling. |
| Rice, reheated | caution | Reheat once, hot; do not leave cooked rice at room temperature for hours. |
| Honey | safe | Safe for Dani. **Not for the baby until 12 months** — infant botulism. |
| Artificial sweeteners (aspartame, sucralose, stevia) | safe | Safe in normal amounts. |
| Papaya seeds | avoid | Concentrated papain. |
| Ampalaya (bitter gourd) | caution | Culinary amounts are fine; concentrated extracts and supplements are not. |
| Herbal supplements, unspecified | avoid | Unregulated and largely unstudied in pregnancy. Ask Dra. Villafria first. |
| Ginger | safe | Helps nausea. |
| Turmeric | safe | Culinary amounts. |
| Soy (tofu, taho, soy milk) | safe | Normal dietary amounts. |
| Nata de coco | safe | Commercially produced. |
| Macapuno | safe | |
| Bibingka / puto bumbong | safe | Cooked through. Salted egg on bibingka is cooked. |
| Salted egg (itlog na maalat) | safe | Cooked and cured. High sodium. |
| Century egg | caution | Cured, not cooked. Small amounts in a cooked dish only. |
| Atchara (pickled papaya) | safe | Pickled in vinegar, commercially or home-made with clean handling. |
| Ginataang dishes | safe | Coconut milk, cooked. |
| Laing | safe | Cooked taro leaves. Must be fully cooked — raw taro leaf is an irritant. |
| Pinakbet | safe | Cooked. Contains bagoong — see above. |
| Bulalo | safe | Long-boiled. |
| Goto / arroz caldo | safe | Boiled. A good sick-day food. |
| Champorado | safe | Cooked. Contains cocoa — minor caffeine. |
| Dark chocolate | caution | Contains caffeine; counts towards the limit in quantity. |
| Milk chocolate | safe | Caffeine is negligible. |
| Mangga't bagoong | caution | Raw green mango is fine; the bagoong is the salt and hygiene question. |
| Sorbetes (dirty ice cream) | caution | Depends on the vendor's milk and storage. |
| Siomai / siopao | safe | Steamed through. Eat hot. |
| Instant noodles | safe | Cooked. Very high sodium, low nutrition. |
| Raw oysters with calamansi | avoid | Still raw. The calamansi does nothing to the bacteria. |

---

## 5. Caffeine

**Limit: 200mg a day.** ACOG advises that moderate caffeine intake below 200mg
daily has not been shown to cause miscarriage or preterm birth. Above it, the
evidence is less settled, which is why the line sits there.

Seeds the caffeine tracker presets. Values are typical; brewing strength varies
a great deal, so the app should present these as estimates.

| Source | Serving | Caffeine (mg) |
| --- | --- | --- |
| Brewed coffee | 240ml (8oz) | 95 |
| Instant coffee | 240ml | 60 |
| Espresso | 1 shot (30ml) | 63 |
| Kapeng barako | 240ml | 150 |
| 3-in-1 coffee sachet | 1 sachet | 50 |
| Americano | double shot | 126 |
| Latte / cappuccino | regular, 1 shot | 63 |
| Milk tea | 500ml, black tea base | 100 |
| Milk tea | 500ml, green tea base | 60 |
| Black tea | 240ml | 47 |
| Green tea | 240ml | 28 |
| Coke / Pepsi | 330ml can | 34 |
| Coke Zero | 330ml | 34 |
| Dark chocolate | 50g | 40 |
| Milk chocolate | 50g | 10 |
| Champorado | 1 bowl | 15 |
| Energy drink | 250ml | 80 |
| Decaf coffee | 240ml | 3 |

**Two barako cups put Dani at 300mg — over the limit before lunch.** Worth a
gentle nudge in the app, not an alarm.

*Source: [ACOG — moderate caffeine consumption during pregnancy](https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2010/08/moderate-caffeine-consumption-during-pregnancy); caffeine values from USDA FoodData Central and manufacturer data. Verified 2026-09-18. Confidence: high for the 200mg limit, medium for individual serving values.*

---

## 6. Nutrients that matter

| Nutrient | Daily target | Why | Filipino sources |
| --- | --- | --- | --- |
| Folate / folic acid | 400–600mcg | Neural tube closure, in the first weeks — often before pregnancy is known | Malunggay, kangkong, fortified rice, supplement |
| Iron | 27mg | Blood volume rises ~45%; deficiency is very common in PH | Beef, liver (sparingly), malunggay, kangkong, fortified cereal |
| Calcium | 1000mg | Fetal skeleton; drawn from maternal bone if intake is low | Milk, kesong puti (pasteurised), sardines with bones, malunggay, tofu |
| DHA (omega-3) | 200–300mg | Brain and retinal development | Bangus, salmon, sardines, galunggong, supplement |
| Iodine | 220mcg | Fetal brain development; deficiency is the leading preventable cause of intellectual disability worldwide | Iodised salt, seafood, seaweed |
| Vitamin D | 600 IU | Calcium absorption; deficiency common despite the sunshine, because of sun avoidance | Fortified milk, eggs, fish, sunlight |
| Choline | 450mg | Brain development. Under-discussed and commonly under-consumed | Eggs — two eggs give roughly half the target |
| Protein | ~71g | Tissue growth | Fish, chicken, eggs, tofu, monggo |

**The iron and calamansi pairing is real.** Vitamin C substantially increases
absorption of non-haem (plant) iron. Calamansi over kangkong is not folklore —
it is useful. Conversely, coffee and tea with a meal reduce iron absorption, so
space them out.

*Sources: ACOG nutrition in pregnancy; Philippine Dietary Reference Intakes (FNRI-DOST). Verified 2026-09-18. Confidence: high.*

### Knowing where your iron actually stands

Two different tests, and they answer two different questions.

**Haemoglobin** is the oxygen-carrying part of blood. It tells you whether you
are *already* anaemic. Because blood volume rises about 45% in pregnancy while
red cells rise less, haemoglobin naturally falls — so pregnancy uses its own
cut-offs, not the ones on a general lab sheet:

| When | Anaemic below |
| --- | --- |
| First trimester | 11.0 g/dL |
| Second trimester | 10.5 g/dL |
| Third trimester | 11.0 g/dL |

**Ferritin** is the storage tank. It tells you whether you are *running out*,
which happens well before haemoglobin drops. A ferritin of **30 ng/mL or below**
is taken as iron deficiency in pregnancy. Below 15 is not the right line — that
threshold misses too many people.

**This is why haemoglobin alone is not enough.** In one first-trimester study, a
haemoglobin under 11 picked up only about **30%** of the people whose ferritin
showed they were iron deficient. Seven in ten looked fine on the CBC and were
not. A standard prenatal panel in the Philippines usually includes the CBC and
usually does not include ferritin — so if you want the real answer, it has to be
asked for by name.

**Why it is worth asking for early.** Iron demand rises steeply from the second
trimester and peaks in the third. Topping up a low tank at 10 weeks is a
month of tablets; discovering an empty one at 32 weeks is a harder problem, and
it is linked to fatigue, restless legs, and more blood loss mattering more at
delivery. Iron deficiency is common in Philippine pregnancies.

**If it does come back low,** the fix is ordinary: an oral iron tablet, and the
current evidence favours taking it **every other day** rather than daily —
absorption is better and the stomach upset is less. Take it with calamansi or
another vitamin C source, and keep it away from coffee, tea, milk and calcium
tablets by a couple of hours. Do not start iron on your own beyond what is in
the prenatal vitamin; too much is not benign, and the dose depends on the number.

*Sources: [ACOG — screening characteristics of hemoglobin and MCV for detection of iron deficiency in pregnancy](https://opqic.org/acog-screening-characteristics-of-hemoglobin-and-mean-corpuscular-volume-for-detection-of-iron-deficiency-in-pregnancy/); [ASH draft recommendations for the diagnosis of iron deficiency](https://www.hematology.org/-/media/hematology/files/education/clinicians/guidelines-quality/ida-dx-public-comment.pdf); [FIGO good practice recommendations on anemia in pregnancy](https://obgyn.onlinelibrary.wiley.com/doi/full/10.1002/ijgo.70529). Verified 2026-09-19. Confidence: high for the thresholds, medium for the alternate-day dosing.*

### Calories by trimester

| Trimester | Additional daily kcal |
| --- | --- |
| First | +0 |
| Second | +340 |
| Third | +450 |

**"Eating for two" is roughly a sandwich, not a second dinner.** Equally,
pregnancy is not a time to diet — restricting intake to limit weight gain is
not recommended at any stage, and any concern about weight belongs in a
conversation with Dra. Villafria rather than in a calorie deficit.

*Source: Institute of Medicine (2009); ACOG. Verified 2026-09-18. Confidence: high.*

### Weight gain bands (IOM 2009, singleton)

| Pre-pregnancy BMI | Total gain | Weekly gain, T2–T3 |
| --- | --- | --- |
| Under 18.5 | 12.5–18 kg | 0.44–0.58 kg |
| 18.5–24.9 | 11.5–16 kg | 0.35–0.50 kg |
| 25–29.9 | 7–11.5 kg | 0.23–0.33 kg |
| 30 and above | 5–9 kg | 0.17–0.27 kg |

First trimester gain of 0.5–2kg applies to all bands. **Display these as a
shaded range, never as a pass/fail line, and never in red.**

*Source: Institute of Medicine / National Research Council, "Weight Gain During Pregnancy: Reexamining the Guidelines" (2009). Verified 2026-09-18. Confidence: high.*

### Nausea — what actually helps

Ordered roughly by how well it works:

1. Eat before getting out of bed — dry crackers, plain bread.
2. Small and frequent beats large and spaced.
3. Ginger: salabat, ginger chews, fresh ginger in food.
4. Cold food often smells less than hot food, and smell is usually the trigger.
5. Vitamin B6 (pyridoxine) — evidence-backed. **Ask Dra. Villafria for the dose.**
6. Hydrate between meals rather than during.
7. Keep a window open; Manila humidity in a closed room makes it worse.

**When it stops being ordinary:** unable to keep fluids down for 24 hours,
weight loss, dark urine, dizziness on standing. That is hyperemesis territory
and needs a call, not endurance.

---

## 7. Movement and stretching

> **Get clearance from Dra. Villafria before starting any routine.** This
> applies to every routine below and should appear as a persistent banner on
> the Move screen, not a one-time dismissal.

The general guidance is 150 minutes of moderate activity a week in an
uncomplicated pregnancy, and that staying active is beneficial rather than
risky. Walking is ideal in Manila — indoors, in a mall, when it is too hot.

**The talk test:** if Dani can hold a conversation, the intensity is right. If
she cannot finish a sentence, ease off. This replaces heart-rate targets, which
are unreliable in pregnancy.

### What to avoid, by trimester

| Trimester | Avoid |
| --- | --- |
| First | Overheating. Hot yoga, saunas. Contact sports. New high-intensity training. |
| Second | **Lying flat on the back for extended periods from ~16 weeks** — the uterus compresses the vena cava. Deep twists. Anything with a fall risk. |
| Third | Deep backbends, deep squats if pelvic pressure is high, inversions, anything requiring sudden balance. |

Stop immediately and call for: vaginal bleeding, regular painful contractions,
fluid leaking, dizziness, chest pain, calf pain or swelling, or headache.

### Morning routine — first trimester (8 minutes)

| Move | Hold | Cue |
| --- | --- | --- |
| Seated neck rolls | 30s each way | Slow. Let the weight of the head do the work. |
| Shoulder rolls | 30s | Backwards, opening the chest. |
| Seated side stretch | 30s each side | Reach up and over; keep both sitting bones down. |
| Cat–cow | 60s | On hands and knees. Move with the breath, no forcing. |
| Child's pose, knees wide | 60s | Knees wide enough that the belly has room. |
| Ankle circles | 30s each | Circulation; do these in bed if easier. |
| Standing calf stretch | 30s each | Against a wall. |

### Night routine — first trimester (6 minutes)

| Move | Hold | Cue |
| --- | --- | --- |
| Legs up the wall | 3 min | Reduces evening swelling. Skip if it feels breathless. |
| Seated forward fold, legs wide | 45s | Only as far as comfortable. |
| Supine bound angle *(T1 only)* | 60s | Soles together. **Drop this from 16 weeks** — use side-lying instead. |
| Deep breathing | 2 min | Four in, six out. |

### Morning routine — second trimester (10 minutes)

| Move | Hold | Cue |
| --- | --- | --- |
| Cat–cow | 60s | |
| Bird dog | 30s each side | Opposite arm and leg. Keep the hips level. |
| Hip flexor lunge stretch | 45s each | Back knee down, gentle. |
| Wall squat | 30s | Back against the wall, thighs above parallel. |
| Thoracic rotation, seated | 30s each | **Rotate from the upper back only — no deep twisting through the belly.** |
| Standing calf and hamstring | 30s each | |
| Pelvic tilts | 60s | Standing or on hands and knees. |

### Night routine — second trimester (8 minutes)

| Move | Hold | Cue |
| --- | --- | --- |
| Legs up the wall | 3 min | |
| Side-lying quad stretch | 30s each | Left side preferred. |
| Child's pose, knees wide | 60s | |
| Figure-four stretch, seated | 45s each | For the glutes and lower back. |
| Breathing, left side-lying | 2 min | Pillow between the knees. |

### Morning routine — third trimester (8 minutes)

Shorter holds, wider base, more support. Everything can be done holding a chair.

| Move | Hold | Cue |
| --- | --- | --- |
| Supported cat–cow | 60s | Hands on a chair or the wall if the floor is awkward. |
| Birth ball hip circles | 90s | Sitting on the ball, slow circles. |
| Supported squat | 20s × 3 | Hold a chair. Only as deep as comfortable. |
| Wide-leg standing side stretch | 30s each | |
| Pelvic floor: slow lifts | 10 reps | Lift and hold 5s, full release between. The release matters as much as the lift. |
| Calf stretch | 30s each | Cramp prevention. |

### Night routine — third trimester (7 minutes)

| Move | Hold | Cue |
| --- | --- | --- |
| Legs up the wall, or on a chair | 3 min | Stop if breathless. |
| Side-lying with pillow support | 2 min | Left side, pillow between knees and under the bump. |
| Seated figure-four | 30s each | |
| Breathing for labour | 2 min | Four in, eight out. This is the pattern for early labour. |

### The November walk

Dani is walking a marathon event in November 2026. Across that month she moves
from **week 11 to week 16**, so the exact event date matters — early November is
still the first trimester, late November is comfortably the second.

> **Ask Dra. Villafria first, specifically about the subchorionic hemorrhage**
> found on 18 September. The evidence does not support routine activity
> restriction for a small SCH, but this is her call to make, not the app's.

**Heat and hydration checklist:**
- Start before 6am. Manila heat by 9am is the real risk, not the distance.
- 500ml of water in the two hours before; 150–250ml every 20 minutes during.
- Electrolytes if walking beyond 60 minutes.
- Light, loose, pale clothing. A cap.
- A planned bail-out point at every kilometre. No prize is worth pushing through.
- **Stop for:** dizziness, headache, no sweating despite the heat, cramping, contractions, any bleeding.
- Walk with someone. Nico is the obvious candidate.
- The talk test applies throughout.

*Sources: [ACOG — Physical Activity and Exercise During Pregnancy and the Postpartum Period](https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2020/04/physical-activity-and-exercise-during-pregnancy-and-the-postpartum-period). Verified 2026-09-18. Confidence: high for the guidance; the specific routines are a reasonable construction from it, not a published protocol.*

---

## 8. Travel

Weeks below are on the dating in section 1 (EDD 19 May 2027, from the
18 September scan).

| Trip | Dates | Week at start | Risk | Zika |
| --- | --- | --- | --- | --- |
| ~~Vietnam~~ | ~~early Oct 2026~~ | ~~7w3d~~ | **cancelled** | — |
| Korea | 5–9 Dec 2026 | 16w3d – 17w0d | low | no |
| India | Jan 2027 | ~22w2d | high | yes — present |
| Mexico | Mar 2027 | ~30w5d | **avoid** | yes — present |

### The rule that applies to every trip

**If Nico travels to a Zika-risk area, the couple use condoms or abstain for
the rest of the pregnancy** — regardless of whether he has symptoms, and
regardless of whether Dani travelled with him. Zika persists in semen longer
than in blood, and sexual transmission to a pregnant partner is the specific
risk being managed.

This is not a precaution that scales with how well he feels. It applies for the
full remaining duration.

*Source: [CDC — Preventing Zika](https://www.cdc.gov/zika/prevention/index.html), [CDC — Recommendations for travelers](https://www.cdc.gov/zika/travel/index.html). Verified 2026-09-18. Confidence: high.*

### Vietnam — cancelled

Planned for early October 2026, around week 7. **Not going** (decided
18 September 2026).

Worth recording why it no longer matters: it would have fallen in the first
trimester at the worst of the nausea, in a Zika and dengue area, and squarely on
top of the repeat-scan window after the subchorionic hemorrhage finding. Three
separate reasons, any one of which was a good argument.

Kept here rather than deleted so the itinerary history stays intact. **Korea is
now the next trip.**

### Korea — 5–9 December 2026, weeks 16–17

**The best-timed trip, and now the next one.** Second trimester, past the nausea, well
before any airline restriction, and a low-risk destination with excellent
medical care.

- **No alcohol**, including in the soju-heavy social context.
- **No raw seafood** — skip the hoe (raw fish) and raw marinated crab entirely.
- **Icy footing** is the genuine risk. December in Seoul is below freezing and
  pavements ice over. A fall in the second trimester is the thing to avoid. Flat
  boots with real grip, and no rushing.
- Cold air plus dry indoor heating aggravates nasal congestion, which is already
  a pregnancy symptom. Saline spray helps.
- Walking a lot is good; just keep the pace conversational.

### India — January 2027, ~week 22

The trip needing the most preparation.

- **Book a travel-health consultation 4–6 weeks beforehand** — so, by early
  December. This is the single most important item, because vaccine and
  antimalarial decisions in pregnancy need a clinician.
- **Malaria:** risk varies enormously by region. Some antimalarials are
  contraindicated in pregnancy; others are not. This is a specialist decision
  based on the specific itinerary.
- **Zika and dengue:** both present. Mosquito precautions throughout.
- **Food and water, strictly:** bottled or boiled water only, no ice, no raw
  salads, no unpasteurised dairy (including lassi from street vendors), hot
  freshly-cooked food only. "Boil it, cook it, peel it, or forget it."
- **Air quality:** Delhi and much of the north have severe winter particulate
  pollution in January. This is a real consideration in pregnancy. An N95 helps;
  choosing a different region helps more.
- Confirm hospital access at the destination before departure.

### Mexico — March 2027, ~week 31 — **defer or cancel**

> **This is the trip to reconsider.** Not as a matter of caution, but because
> several separate factors compound.

1. **Zika.** Mexico has ongoing transmission. CDC advises that pregnant women
   avoid travel to areas with Zika risk. This alone is sufficient reason.
2. **Week 30, and long-haul.** Manila to Mexico is among the longest routings
   in the world — typically 20–30 hours with connections. At 30 weeks that is a
   serious DVT exposure and a long way from Dra. Villafria.
3. **Airline cutoffs are close.** By the end of March she is at ~33w0d, inside
   the range where most carriers require medical clearance. If anything delays
   the return, the restrictions tighten fast.
4. **Distance from care.** At 30+ weeks, preterm labour is a real possibility,
   and it would happen a very long way from her OB and her hospital.

If the trip goes ahead regardless:
- Written OB clearance, and a fit-to-fly certificate dated within the carrier's
  validity window (often 7–10 days before travel).
- Aisle seat. Walk every hour. Compression stockings. Hydrate continuously.
- Travel insurance explicitly covering pregnancy, preterm birth and neonatal
  care abroad — confirm in writing, as most policies exclude all three.
- Identify the nearest hospital with a NICU at the destination before departure.
- Rigorous mosquito precautions for the entire stay.
- The condoms-or-abstinence rule applies to Nico afterwards regardless.

### Airline policy

**Confirm directly with the carrier when booking.** Policies differ between
airlines and between domestic and international routes, and they change.

For Philippine Airlines, reporting indicates: a "fit to travel" medical
certificate is required from around 32–34 weeks depending on route, valid
within roughly 10 days of issue; an Expectant Mother's Information Sheet (EMIS)
per flight; and **carriage is refused beyond 35 weeks**.

> `confidence: low`. Sources disagreed on whether the certificate threshold is
> 32 or 34 weeks. The 35-week refusal was consistent. **Treat every number here
> as needing confirmation with PAL at booking**, and have the app say so rather
> than assert it.

*Source: [PAL medical passengers](https://www.philippineairlines.com/us/en/before-you-fly/special-needs-and-request/medical-passengers.html). Verified 2026-09-18.*

### DVT prevention on any flight over four hours

- Aisle seat; walk every 60 minutes.
- Ankle circles and calf pumps every 30 minutes while seated.
- Graduated compression stockings — genuinely effective, and more so in pregnancy.
- Water continuously; skip the salty snacks.
- Seatbelt low, under the bump, across the hips.

### Per-trip packing checklist

Seeds `trips.checklist`:

- Maternity records / prenatal chart copy
- Dra. Villafria's number, and the Makati Med number
- Travel insurance documents with the pregnancy clause
- OB clearance letter, and fit-to-fly certificate if required
- Prenatal vitamins for the whole trip plus three spare days
- Insect repellent, DEET 30% or picaridin
- Compression stockings
- Ginger chews / nausea remedy
- Paracetamol (the safe analgesic in pregnancy)
- Oral rehydration salts
- Hand sanitiser
- Comfortable, flat, grippy shoes
- A refillable water bottle
- Snacks, for when the food is unsuitable or the timing is wrong

---

## 9. Costs and benefits (PHP)

> **Read the confidence column before showing any of these.** None of the
> Philippine government figures below were read from a government source — the
> egress policy blocked `sss.gov.ph`, `philhealth.gov.ph` and `pcw.gov.ph`.
> They are from secondary reporting, and at least one widely-repeated figure is
> demonstrably wrong (see the SSS note). Every one needs confirming before it is
> relied on to file anything.

### Prenatal and testing

| Item | Typical cost | Confidence |
| --- | --- | --- |
| Prenatal consult, private OB, Metro Manila | ₱800 – ₱2,000 per visit | medium |
| Full prenatal course (~12–14 visits) | ₱12,000 – ₱28,000 | medium |
| Dating / transvaginal scan | ₱1,500 – ₱3,000 | medium |
| NT scan (with nasal bone) | ₱3,000 – ₱5,500 | low |
| Congenital anomaly scan | ₱3,500 – ₱10,300 | medium |
| NIPT | ₱21,500 – ₱55,000 | medium |
| OGTT (75g) | ₱500 – ₱1,525 | medium |
| Routine bloods (CBC, blood type, urinalysis, serology) | ₱2,500 – ₱5,000 | low |
| Tdap vaccine | ₱1,500 – ₱2,500 | low |
| RSV vaccine (Abrysvo) | ₱10,000 – ₱18,000 | low |

**NIPT is the single largest discretionary prenatal cost** and is largely out of
pocket. The range is wide because providers bundle differently.

*Sources: [PinoyMedical NIPT pricing](https://pinoymedical.com/nipt-test-price/), [ClinicFinder PH prenatal checkup costs](https://www.clinicfinderph.com/blog/prenatal-checkup-cost-philippines), [PinoyMedical congenital anomaly scan](https://pinoymedical.com/congenital-anomaly-scan-price/), [PinoyMedical glucose tolerance test](https://pinoymedical.com/glucose-tolerance-test-price/). Verified 2026-09-18.*

### Delivery at Makati Medical Center

| Item | Typical cost | Confidence |
| --- | --- | --- |
| Normal delivery, total bill | ₱120,000 – ₱250,000 | medium |
| Caesarean, total bill | ₱200,000 – ₱400,000 | low |
| Private room, per day | ₱9,000 – ₱15,000 | medium |
| OB professional fee | Varies by doctor — ask Dra. Villafria directly | — |
| Paediatrician attendance | ₱5,000 – ₱15,000 | low |
| Anaesthesiologist (epidural / CS) | ₱15,000 – ₱30,000 | low |

**Makati Med is a premium hospital and prices accordingly.** Ask billing for a
written estimate — they provide them on request, and it is the only number that
actually means anything.

*Source: [ClinicFinder PH — MakatiMed rates](https://www.clinicfinderph.com/blog/makati-medical-center-rates-fees), [ClinicFinder PH — normal delivery cost](https://www.clinicfinderph.com/blog/normal-delivery-cost-philippines). Verified 2026-09-18.*

### What PhilHealth covers

Rates increased on **30 April 2026**.

| Benefit | Amount | Confidence |
| --- | --- | --- |
| Normal vaginal delivery | ₱29,000 | medium |
| Caesarean section | ₱58,000 – ₱62,000 (by hospital level) | medium |
| Newborn care package | ₱3,500 – ₱5,752.50 (sources disagree) | low |

The newborn figure appeared as both ₱3,500 and ₱5,752.50 in different
reporting, likely describing different package scopes. **Confirm with PhilHealth
or Makati Med billing.**

*Sources: [PIA — expanded PhilHealth coverage](https://pia.gov.ph/news/expanded-philhealth-coverage-aims-to-ease-childbirth-costs-improve-maternal-care/), [Cebu Daily News](https://cebudailynews.inquirer.net/723066/how-much-does-it-cost-to-give-birth-now-with-philhealth), [PhilHealth Circular 2026-0004](https://www.philhealth.gov.ph/circulars/2026/PC2026-0004.pdf) (not directly readable — blocked). Verified 2026-09-18.*

### SSS maternity benefit — and a figure not to trust

**The law (RA 11210, in force since 2019):**

| Provision | Value | Confidence |
| --- | --- | --- |
| Paid maternity leave, live birth | 105 days | high |
| Solo parent additional | +15 days (120 total) | high |
| Miscarriage / emergency termination | 60 days | high |
| Optional extension, unpaid | +30 days | high |
| Days allocable to the father or an alternate caregiver | up to 7 | high |

**The computation:** `Average Daily Salary Credit × 105`, where ADSC is the sum
of the six highest monthly salary credits in the 12 months before the semester
of contingency, divided by 180. Qualifying requires at least three monthly
contributions in that 12-month window.

**The maximum is where reporting breaks down.** Sources repeated "₱70,000
maximum" while also stating an ADSC of ₱1,166.67. Those are inconsistent:

- ₱1,166.67 × 105 = **₱122,500**, and ₱1,166.67 × 180 ÷ 6 = an MSC of ₱35,000.
- ₱70,000 corresponds to an MSC ceiling of ₱20,000 — the *old* ceiling.
- Independent 2026 contribution-table sources put the current MSC ceiling at
  **₱35,000** with a 15% contribution rate.

So ₱122,500 is the figure the arithmetic supports, and ₱70,000 appears to be
stale text carried forward. **The app should not display either as fact.**
Show the formula, let Dani enter her own salary credits, and link her to SSS to
confirm — which is better advice anyway, since her actual benefit depends on her
own contribution history, not the ceiling.

*Sources: [PCW RA 11210 FAQ](https://pcw.gov.ph/faq-republic-act-11210/) (blocked; via search summary), [SSS maternity benefit](https://www.sss.gov.ph/maternity-benefit/) (blocked), [Sprout Solutions 2026 contribution guide](https://sprout.ph/articles/how-to-calculate-your-sss-monthly-contribution/). Verified 2026-09-18. Confidence: high on the legal entitlements, **low on any peso maximum**.*

### Paternity leave — a caveat that matters for Nico

| Entitlement | Days | Condition | Confidence |
| --- | --- | --- | --- |
| RA 8187 paternity leave | 7 | **Requires legal marriage** and cohabitation with the spouse. First four deliveries only. | high |
| RA 11210 allocated days | up to 7 | Allocated by Dani from her 105. Goes to the child's father *or* an alternate caregiver — **no marriage requirement**. | high |

**If Dani and Nico are not married, the 7 days under RA 8187 do not apply** —
but the 7 allocated days still do. The app should not promise 14 days without
knowing their marital status. Make it a question in onboarding rather than an
assumption.

To claim the allocated days, Dani files the **SSS Allocation of Maternity Leave
Credits form** together with her Maternity Notification. Nico's HR at RCBC needs
both, and should be asked early — not in the delivery week.

*Sources: [RA 8187 full text](https://lawphil.net/statutes/repacts/ra1996/ra_8187_1996.html), [ParenTeam — claiming paternity leave](https://www.parenteam.com.ph/article/how-to-claim-paternity-leave-philippines), [Sprout Solutions](https://sprout.ph/articles/paternity-leave-in-the-philippines/). Verified 2026-09-18.*

### Yaya cost calculator

The salary is not the cost. Seeds the calculator:

| Component | 2026 value | Confidence |
| --- | --- | --- |
| NCR kasambahay minimum wage | ₱7,800/month, effective Feb 2026 (up ₱800) | high |
| Market rate, experienced yaya (NCR) | ₱13,000 – ₱16,000/month | medium |
| Newborn / night nurse specialist | ₱18,000 – ₱30,000/month | low |
| 13th month pay | 1/12 of annual basic — mandatory under PD 851 and RA 10361 | high |
| SSS employer share | Per the 2026 table; MSC ₱8,000 bracket applies at the minimum wage | medium |
| PhilHealth | Per the 2026 premium schedule | medium |
| Pag-IBIG | 2% employer + 2% employee, on compensation capped at ₱10,000 (so ₱200 each at the cap) | medium |
| Employees' Compensation | ₱10/month at MSC ₱8,000 | low |

**The Kasambahay Law wrinkle:** under RA 10361, where the kasambahay earns
**less than ₱5,000 a month**, the employer shoulders the entire SSS, PhilHealth
and Pag-IBIG contribution. At or above ₱5,000, the worker's share may be
deducted from wages. At a market yaya salary of ₱13,000–16,000, deduction is
legally permitted — but many households absorb it anyway.

**The calculator should default to the employer absorbing everything**, because
that is the conservative (higher) budget number and the one that avoids an
unpleasant surprise.

Also budget for: food and lodging if live-in, a rest day (or pay in lieu), SSS
registration within 30 days of hiring, and a written employment contract — all
required by RA 10361.

*Sources: [DOLE — NCR kasambahay wage increase](https://dole.gov.ph/news/kasambahays-in-ncr-to-receive-p800-monthly-minimum-wage-increase/), [NWPC](https://nwpc.dole.gov.ph/kasambahays-in-ncr-to-receive-p800-monthly-minimum-wage-increase/), [SweldoPH Kasambahay Law guide](https://sweldoph.com/guides/kasambahay-law), [KAMI Workforce 2026 contribution tables](https://kamiworkforce.com/ph/blog/sss-philhealth-pagibig-contribution-tables-2026/). Verified 2026-09-18.*

### Budget bands by phase

Seeds the `expenses` table. **These are planning bands for a Makati household
using private care, not quotes.** All `confidence: low` — they are constructed
from the item costs above plus typical Metro Manila ranges, and every family's
actual spend varies enormously.

| Phase | Category | Band (₱) |
| --- | --- | --- |
| Pregnancy | Prenatal consults and routine tests | 15,000 – 35,000 |
| Pregnancy | Scans (dating, NT, anomaly) | 8,000 – 20,000 |
| Pregnancy | NIPT (optional) | 21,500 – 55,000 |
| Pregnancy | Vaccines (Tdap, RSV, flu) | 12,000 – 25,000 |
| Pregnancy | Vitamins and supplements | 8,000 – 20,000 |
| Pregnancy | Maternity clothes | 8,000 – 25,000 |
| Pregnancy | Childbirth class / doula (optional) | 10,000 – 40,000 |
| Y0 | Delivery, net of PhilHealth and HMO | 60,000 – 250,000 |
| Y0 | Nursery and gear (cot, stroller, car seat, carrier) | 60,000 – 200,000 |
| Y0 | Diapers and wipes, first year | 30,000 – 60,000 |
| Y0 | Formula, if used | 40,000 – 120,000 |
| Y0 | Paediatrician visits and vaccines, first year | 40,000 – 90,000 |
| Y0 | Yaya, first year (salary + statutory + 13th) | 180,000 – 260,000 |
| Y0 | Night nurse, first 1–3 months (optional) | 54,000 – 90,000 |
| Y0 | Binyag (christening) | 30,000 – 200,000 |
| Y1 | First birthday party | 50,000 – 300,000 |
| Y1 | Diapers, food, clothing | 60,000 – 120,000 |
| Y1 | Paediatrician and vaccines | 20,000 – 45,000 |
| Y1 | Yaya | 190,000 – 275,000 |
| Y2 | Food, clothing, nappies to potty training | 60,000 – 110,000 |
| Y2 | Health and vaccines | 15,000 – 35,000 |
| Y2 | Yaya | 200,000 – 290,000 |
| Y2 | Classes and play (optional) | 20,000 – 80,000 |
| Y3 | Preschool / nursery | 80,000 – 300,000 |
| Y3 | Food and clothing | 60,000 – 110,000 |
| Y3 | Yaya | 210,000 – 300,000 |
| Y4 | Preschool | 100,000 – 350,000 |
| Y4 | Food, clothing, health | 75,000 – 140,000 |
| Y4 | Classes and activities | 25,000 – 100,000 |
| Y5 | Kindergarten / big school entry | 120,000 – 450,000 |
| Y5 | Food, clothing, health | 80,000 – 150,000 |
| Y5 | Classes and activities | 30,000 – 120,000 |

**The two things that dominate this table** are childcare and school fees. Gear,
which is what expectant parents tend to worry about, is a rounding error beside
either. Worth saying out loud in the app.

---

## 10. Shopping — Makati and BGC

Seeds the `shops` table. **Display with: "Verify store availability — last
checked September 2026."** Retail tenancy in Metro Manila malls turns over
frequently and this list will go stale.

*All entries `confidence: medium` — compiled from general knowledge of Metro Manila retail, not a store-by-store check. Verified 2026-09-18.*

| Store | Mall / location | Category |
| --- | --- | --- |
| Rustan's Department Store | Power Plant Mall, Rockwell | Premium gear, clothing, gifts |
| Rustan's | Glorietta / Makati | Premium gear, clothing |
| The SM Store — Baby Company | SM Makati, SM Aura BGC | Full range, mid-market |
| Mothercare | Power Plant Mall; SM Aura | Clothing, feeding, nursery |
| Mamas & Papas | Shangri-La Plaza; SM Aura | Prams, cots, nursery furniture |
| Baby Hub PH | Online, Metro Manila delivery | Gear, car seats, strollers |
| Edamama | Online | Curated baby and toddler, PH brands |
| Chicco | SM Aura; Glorietta | Strollers, car seats, feeding |
| Uniqlo Baby | Glorietta, SM Aura, Power Plant | Basics, cotton |
| H&M Baby | Glorietta, SM Aura | Basics, affordable |
| Cotton On Kids / Typo | Glorietta, SM Aura | Basics |
| Mercury Drug | Everywhere | Vitamins, thermometers, nappies |
| Watsons | Everywhere | Toiletries, nappy basics |
| Healthy Options | Power Plant, Glorietta | Organic, supplements, feeding |
| Lazada — official brand stores | Online | Avanti, Pigeon, Philips Avent, Chicco official stores |
| Shopee — official brand stores | Online | Same; check for the "Mall" badge |
| Landers / S&R | Various | Bulk nappies and wipes — the cheapest per-unit route |

### What a friend actually used

A couple in BGC kept a 101-line registry through their first baby and went back
afterwards to mark what each thing was worth. That hindsight column is the rare
part — anyone can produce a list of what to buy, almost nobody records what they
regretted. Their total came to **₱161,229.75**.

**Two caveats before reading it.** The sheet is from **2022**, so treat every
peso figure as a shape rather than a price — four years of inflation sit between
it and now. And it is one family's experience of one baby: a swaddle their
daughter hated is a swaddle another baby sleeps in.

**What they marked MUST, in their own words**

| Item | Their note |
| --- | --- |
| Bottle warmer (Philips) | "MUST; useful and conv" |
| Nipple cream (Lansinoh) | "MUST, helps a lot" — with air-drying and expressed milk |
| Post-partum binder (Wink) | "MUST" |
| Heating pad | "MUST, Shopee has versatile ones" |
| Maternity pads / post-partum pants | "MUST for at least first 3–5 days, then hoard napkins" |
| Stroller (Babyzen Yoyo2) | "MUST, we use for sun bathing outside too" — and their single biggest line at ₱45,500 |
| Ikea Råskog trolley | "MUST" — ₱2,490, the cheapest thing on the MUST list |

**What they bought and did not use**

| Item | Their note | What it cost |
| --- | --- | --- |
| **3-in-1 co-sleeper** | "Not so useful to us, ends up sleeping on the bed" | **₱18,999.75** |
| Swaddle (Halo) | "Barely used, she does not like it" | ₱2,100 |
| Socks, mittens, beanie | "Pass; always getting removed" | — |
| Petroleum jelly | "Pass; have not used" | ₱100 |
| Manual pump (Haakaa) | "Not so useful for me" | ₱1,250 |
| Perineal bottle | "Pass; bidet is fine" | ₱999 |
| Nipple shield | "Pass" | — |
| Crib | "Won't be able to maximise, better if play yard" | — |

The co-sleeper is the line to look at. **Nineteen thousand pesos on the single
thing most likely to go unused**, because where a newborn actually sleeps is not
knowable in advance. It is the strongest argument in the sheet for borrowing,
buying second-hand, or simply waiting on the big sleep purchase.

**What the hospital gives you anyway** — they bought these and needn't have:
baby thermometer, nasal aspirator, and baby bath soap for the stay.

**Smaller things they learned**

- **Onesies: buy the ones with feet**, and reckon on three to four a day for the
  first three months.
- **Second-hand worked.** Their swaddles came from Facebook, their nursing
  pillow second-hand. Newborn things are outgrown before they wear out.
- **Steam beats UV for sterilising.** Their own note: the evidence for UV is
  thinner, and it cannot be used on silicone. They bought the UV one anyway.
- **A nail grinder beats clippers** — about ₱200 on Shopee.
- **Dark curtains and a dimmable night lamp** matter more than they sound, for
  night feeds.
- **On the breast pump: see a lactation consultant for flange sizing** before
  buying into a system. Wrong size is the common reason pumping hurts and yields
  little.
- **Keep formula as a backup, unopened.** Some brands have long lead times
  locally, and the moment you need it is not the moment to discover that.

### Consumables: buy on unit price, not on price

The same sheet tracked nappies and wipes by **effective cost per piece**, which
is the only comparison that survives pack sizes ranging from 22 to 240. Their
2022 spread ran from about **₱6 to ₱13.50 per nappy for the same sizes** — a
difference of more than double, on identical products, decided entirely by pack
size and sale timing.

The transferable method, not the prices:

- **Divide by the piece.** Write the ₱/nappy and ₱/wipe in a note; compare that
  and nothing else.
- **Buy the jumbo or super-jumbo box.** The cheapest rates in their sheet were
  all 80- to 240-piece boxes.
- **Wait for the double-date sales** — 10.10, 11.11, 12.12. The same nappy moved
  several pesos a piece across them.
- **Do not bulk-buy newborn size.** Babies grow out of it in weeks, and an
  unopened box of the wrong size is money gone. Bulk from small upwards.
- **Buy two brands first, in small packs.** Fit varies by baby, and a 240-box of
  the one that leaks is an expensive way to find out.

*Source: a friend's 2022 registry and price sheet, shared directly. Confidence: high for what they did and thought, low for every peso figure — 2022 prices.*

**Malls for filtering:** Power Plant (Rockwell), Greenbelt / Glorietta (Makati
CBD), SM Aura (BGC), Shangri-La Plaza (Mandaluyong), SM Makati.

**Buy the car seat new.** It is the one item where second-hand is a genuine
safety question — a seat involved in a previous crash can be compromised
invisibly, and seats have expiry dates.

### Registry and nursery checklist

Items feed the expenses tracker via `price_php` and `bought`.

**Actually needed before the birth:**
- Car seat (rear-facing, new)
- Somewhere safe to sleep — cot, crib or bassinet, firm flat mattress
- Fitted sheets ×3
- Nappies, newborn size (do not overbuy — they outgrow the size fast)
- Wipes, fragrance-free
- Bodysuits / onesies ×7–10
- Sleepsuits ×7
- Swaddles or sleep sacks ×3
- Muslin cloths ×6
- Bath towel, hooded
- Baby soap and shampoo, fragrance-free
- Nappy cream
- Digital thermometer
- Nail scissors or file
- Breast pump, if planning to pump
- Bottles ×4, if planning to bottle-feed
- Nursing bras ×3
- Breast pads
- Maternity pads (many more than seems reasonable)

**Useful, not urgent:**
- Stroller
- Baby carrier
- Changing table or mat
- Nappy bin
- White noise machine
- Nightlight
- Baby monitor
- Nursing pillow
- Bottle steriliser
- High chair (not until ~6 months)

**Frequently bought and rarely used:** wipe warmers, cot bumpers (a suffocation
risk — do not buy), shoes for a baby who cannot walk, newborn-size clothing in
quantity, a full "nursery set".

---

## 11. Filipino milestones and traditions

Seeds the `milestones` table. Dates use standard dating.

| Milestone | Typical timing | Date | Notes |
| --- | --- | --- | --- |
| Announcement | after 12–13 weeks | from 2026-11-15 | After the risk drop, and usually after the NT scan |
| Gender reveal | 18–20 weeks | 2026-12-20 – 2027-01-03 | Often combined with the anomaly scan result |
| SSS maternity notification | as early as possible | by ~2026-12-01 | File early; do not leave it late |
| Baby shower | third trimester | Mar – Apr 2027 | Commonly held later here than in the US |
| Hospital bag packed | 35 weeks | 2027-04-18 | Both bags |
| Maternity leave filing | 60 days before | by ~2027-03-23 | 105 days under RA 11210 |
| Paternity leave filing | before the birth | by ~2027-05-01 | RCBC HR — see the marriage caveat |
| **PSA birth registration** | **within 30 days of birth** | — | Act No. 3753. Filed at the Local Civil Registry Office of the city of birth, not with PSA directly |
| Newborn screening | 24–72 hours after birth | — | Done at the hospital |
| Baby's passport | any time after registration | — | Infants under 1 year are exempt from the DFA appointment requirement |
| Binyag (christening) | 1–6 months | — | Ninong/ninang list manager |
| First birthday | 12 months | ~May 2028 | Often a large celebration |

### PSA birth registration — the detail that trips people up

The 30-day deadline is real, and the filing goes to the **Local Civil Registry
Office of the city or municipality where the birth occurred** — not to PSA.
The LCRO records it and transmits it to PSA for national archiving.

Miss the 30 days and it becomes a *delayed registration*: an affidavit
explaining the delay, supporting documents, and a 10-day posting period on the
LCRO noticeboard before approval. Entirely avoidable, and worth a reminder in
the app at day 7 and day 20.

For the baby's first passport, a newborn under one year without a PSA
certificate yet may use an LCR-certified true copy authenticated by PSA.

*Sources: [PSA civil registration](https://psa.gov.ph/civilregistration/facts), [DFA minor passport requirements](https://consular.dfa.gov.ph/minor-new/), [Duran & Duran-Schulze — delayed registration](https://duranschulze.com/filing-a-delayed-registration-of-birth-in-the-philippines/). Verified 2026-09-18. Confidence: high on the 30-day rule, medium on procedural detail.*

### Pamahiin — myth or fact

Swipe cards. The tone should be affectionate, never mocking — these come from
people who love them.

| Pamahiin | Verdict | The honest answer |
| --- | --- | --- |
| Eating twin bananas means twins | Myth | Twinning is determined at conception. |
| Craving dark food darkens the baby's skin | Myth | Skin colour is genetic. |
| A round belly means a girl, pointed means a boy | Myth | Belly shape reflects the mother's build and the baby's position. |
| Bad heartburn means a hairy baby | **Surprisingly, some truth** | One small Johns Hopkins study found a real correlation — both are linked to the same hormones. Genuinely charming, and genuinely studied. |
| Lihi — cravings shape the baby's appearance | Myth | Cravings are hormonal. Nothing transfers. |
| A pregnant woman must not attend funerals | Myth | No physical basis. Attend or don't, as feels right. |
| Don't sit in doorways or the baby gets stuck | Myth | Comfort aside, no. |
| Don't sleep during the day or the baby grows too big | Myth | Rest is good. Sleep whenever possible. |
| Wearing a safety pin wards off harm | Myth | Harmless, and wear it if it pleases a lola. |
| Stepping over a rope causes cord entanglement | Myth | Cord position is unrelated. |
| Reaching overhead causes cord wrapping | Myth | Very common advice, and untrue. |
| Don't cut hair during pregnancy | Myth | Cut it. |
| Papaya causes miscarriage | **Partly** | *Ripe* papaya is safe and good. *Unripe* papaya contains latex and is worth limiting. The pamahiin is over-broad, not baseless. |
| Pineapple causes miscarriage | Myth | Would require an implausible quantity. |
| Raising arms above the head is dangerous | Myth | It is not. |
| Craving sour food means a boy | Myth | |
| Don't take a bath right after giving birth | Myth | Hygiene after birth is important. |
| Binyag must happen before the baby is one | Tradition | A custom, not a rule. Families decide. |

---

## 12. Red flags

Seeds `red_flags`. **Reachable in one tap from every screen.** Calm layout, no
alarming imagery, and the call buttons use only the numbers saved in Settings —
**the app never supplies a phone number it was not given.**

### Cramping: the normal kind, and the kind that is not

Mild cramping that comes and goes is one of the most common first-trimester
experiences, and on its own it is not a warning sign. Several ordinary things
cause it at once:

- **The uterus is growing.** It is a muscle that has to roughly double in size,
  and the ligaments holding it pull as it does. Twinges swap sides because the
  pull is not symmetrical.
- **The corpus luteum.** The ovary that released the egg carries a cyst that
  makes the hormone holding the pregnancy up until the placenta takes over. It
  can be a couple of centimetres across and ache on that one side.
- **Progesterone has slowed the bowel.** Trapped wind and constipation produce
  cramps that feel identical to uterine ones. This is a bigger cause than most
  people expect.
- **A full bladder**, which presses directly on the uterus.
- **A subchorionic hemorrhage**, where one is present.

**What normal cramping looks like:** mild — you notice it but it does not stop
you. Brief, seconds to a minute or two. Irregular, with no rhythm to it. It
moves around or swaps sides. It eases with rest, a change of position, emptying
the bladder, or passing wind. It is not building hour by hour.

**What changes the picture** — any of these is a call, not a wait-and-see:

- Cramping that is **severe**, or that **does not ease**
- Pain **stuck on one side** that keeps getting worse, especially with
  shoulder-tip pain, dizziness or fainting — the ectopic pattern
- Cramping that **falls into a rhythm**, like early labour
- **Heavy bleeding**, soaking a pad, or passing clots or tissue
- **Fever**, or pain and burning on urination
- Pain with **vomiting that keeps nothing down**

**For the pain itself, paracetamol (Biogesic) is the one to take.** Avoid
**mefenamic acid (Ponstan)**, ibuprofen (Advil, Medicol), naproxen and aspirin.
This matters locally, because mefenamic acid is the reflex cramp remedy in the
Philippines and it is sold over the counter — but it is an NSAID, and NSAIDs are
not the right choice in pregnancy. A warm (not hot) compress, lying down, and
water are all reasonable. No hot baths and no hot tubs.

**Once an early scan has shown the pregnancy inside the uterus, ectopic is
effectively off the table** — two pregnancies at once, one in each place, is
rare enough to be a medical curiosity. That one line on a scan report takes the
frightening cause of one-sided early pain away.

*Sources: [Ectopic Pregnancy Trust — signs and symptoms](https://ectopic.org.uk/ectopic-pregnancy-symptoms); [Mayo Clinic — ectopic pregnancy](https://www.mayoclinic.org/diseases-conditions/ectopic-pregnancy/diagnosis-treatment/drc-20372093); FDA drug safety communication on NSAIDs in pregnancy. Verified 2026-09-20. Confidence: high.*

### Discharge: what the ordinary kind looks like

More discharge is one of the earliest pregnancy changes there is — often the
first, sometimes before a missed period. Oestrogen rises, blood flow to the
cervix and vaginal walls increases sharply, and the cervix starts building the
mucus plug that will seal it for the next eight months. The result is a genuine
increase, and it does not stop. It usually gets heavier as the pregnancy goes
on.

It has a name — **leukorrhea** — which is worth knowing only because seeing a
medical word for it makes clear how expected it is.

**The normal kind:** thin or milky, clear to white, and mild-smelling or with no
smell at all. No itching, no burning, no soreness. The amount can be enough to
want a panty liner. That is all normal, and it is doing a job: it is part of how
the vagina keeps infection away from the pregnancy.

**What is worth a call, and roughly what each one is:**

| What you see | Likely | Why it matters |
| --- | --- | --- |
| Thick, white, cottage-cheese, **with itching or soreness** | Thrush (yeast) | Very common in pregnancy, harmless to the baby, easily treated |
| Thin, grey or off-white, **fishy smell**, often worse after sex | Bacterial vaginosis | Worth treating in pregnancy rather than leaving |
| Green, yellow, or frothy | An infection needing a swab | Wants identifying, not guessing at |
| **Fresh red blood**, or soaking through | Needs assessing | See the bleeding entries below |
| Any discharge **with fever or pelvic pain** | Call | Not for waiting on |

**Brown or pink is not the same as fresh red.** Brown is old blood that has
taken its time coming out. Where a subchorionic hemorrhage has been seen on a
scan, brown or pinkish-brown spotting is the expected way that collection
drains, and can carry on intermittently for weeks. Worth mentioning at the next
appointment, not worth an emergency call on its own. **Fresh red blood — bright,
new, especially with cramping — is the one to ring about.**

**On treating thrush yourself:** the safe treatment in pregnancy is a **topical**
one — clotrimazole (Canesten) pessaries or cream, which barely absorbs into the
body and is first choice. **Do not take oral fluconazole (Diflucan) without
asking**, which is the tempting one-tablet option: guidance cautions against
oral antifungals in pregnancy, and the concern is greatest in the first
trimester and at higher or repeated doses. One is a local treatment; the other
goes everywhere.

*Sources: [UKTIS — clotrimazole in pregnancy](https://uktis.org/monographs/use-of-clotrimazole-in-pregnancy/); [MotherToBaby — fluconazole](https://mothertobaby.org/fact-sheets/fluconazole-pregnancy/); [Cochrane — topical treatment for vaginal candidiasis in pregnancy](https://pubmed.ncbi.nlm.nih.gov/11687074/). Verified 2026-09-21. Confidence: high.*

### Call immediately, at any stage

- Heavy vaginal bleeding, or bleeding with cramping
- Severe abdominal pain that does not ease
- Severe headache that will not lift
- Vision changes — blurring, spots, flashing lights
- Sudden swelling of the face, hands or feet
- Fever above 38°C
- Fainting, or severe dizziness
- Chest pain or difficulty breathing
- Pain, redness or swelling in one calf (possible DVT)
- Thoughts of harming herself or the baby

**Severe headache + vision changes + sudden swelling together** is the
pre-eclampsia pattern. Any one warrants a call; together they warrant going in.

### First trimester

- Bleeding with cramping
- Severe one-sided pain, with or without shoulder-tip pain — possible ectopic, which is an emergency
- Vomiting so persistent nothing stays down for 24 hours
- Pain or burning on urination
- Fever

### Second trimester

- Bleeding
- Regular contractions before 37 weeks
- Fluid leaking from the vagina
- Sudden severe swelling
- No fetal movement after movement has been established
- Severe back pain with fever

### Third trimester

- **Reduced fetal movement** — this is the one to act on quickly. Do not "wait and see" overnight
- Regular painful contractions before 37 weeks
- Waters breaking before 37 weeks
- Bleeding
- Severe headache, vision changes, or sudden swelling
- Intense itching, especially palms and soles — possible obstetric cholestasis

### Postpartum — for both of them to know

- Bleeding soaking more than one pad an hour
- Passing clots larger than a golf ball
- Fever above 38°C
- Severe headache or vision changes — pre-eclampsia can appear *after* birth
- Calf pain or swelling
- Red, painful, hot area on the breast with fever — mastitis
- Foul-smelling discharge
- Thoughts of harming herself or the baby — this is an emergency, not a mood

> **Reduced fetal movement deserves its own emphasis.** There is no "normal
> number" of kicks. What matters is a change from *her* baby's pattern. The
> advice is to call, not to drink cold water and lie down and hope, and
> certainly not to wait until morning.

*Sources: ACOG "Urgent Maternal Warning Signs"; NHS pregnancy symptom guidance; RCOG reduced fetal movement guidance. Verified 2026-09-18. Confidence: high. **This list is not exhaustive** — the app should say so, and should always end with: if something feels wrong, call.*

---

## 13. Birth day — dates and signs

The calendar on this screen is computed live from the EDD, so every date
re-derives itself if the dating changes. What follows is the reference behind it.

### How a birth date is classified

These are the official categories, not casual language. "Term" is not one thing,
and the distinctions carry real clinical weight — which is why a planned
caesarean is timed against them.

| Category | Gestational age | What it means |
| --- | --- | --- |
| Preterm | before 37w0d | Early enough to carry added neonatal risk |
| **Early term** | 37w0d – 38w6d | Measurably more respiratory trouble, temperature and glucose instability, NICU admission than full term |
| **Full term** | 39w0d – 40w6d | The lowest-risk window. Where an elective section is timed |
| Late term | 41w0d – 41w6d | Monitoring usually increases |
| Post-term | 42w0d and beyond | Induction usually discussed well before this |

*Source: ACOG / reVITALize gestational age terminology. Verified 2026-09-18. Confidence: high.*

**Only about 1 in 20 babies arrive on the due date itself.** The date is the
midpoint of a distribution, not an appointment. Most first babies arrive after
it.

### The hospital bag, actually packed

The list below is a real one, packed by a couple in BGC for a **24-hour stay
after a vaginal birth**. It is worth having now only so that nothing on it is a
surprise later — the packing itself belongs to about **36 weeks**, and a
caesarean means two to four days, so roughly double the clothes and pads.

**For the baby**

- Tie-side shirts ×5 — tie-side, not over-the-head
- Nappies ×5, **in two brands**, to see which fits
- Swaddle or sleepsack ×2, receiving blanket, lampin ×4
- Bonnet, rubber mat, cotton balls
- Going-home outfit
- Car seat or travel bassinet — **left in the car**, not carried in

**The labour bag** — the one that is nearly all forgotten items

- **Extension cord**, power bank, charger. Hospital sockets are never near the bed
- Headphones and a small speaker, both charged
- **Pen and paper for timing contractions**
- Massage ball, lotion for massage
- Lip balm, mints, hair ties ×3
- Water bottle **with a straw** — you will be lying down
- Something dull to read: a Kindle, a book
- **Food for the birth partner.** Nobody packs this and everybody needs it
- Snacks for you, if allowed: bananas, freeze-dried fruit, gelatin
- **The birth plan, printed.** Doctor's orders, PhilHealth and insurance papers

**For you**

- Nightgown or shirts **with a front opening** — every top has to open for feeding
- Bathrobe, PJs, cycling shorts, soft slippers
- Nursing bras ×2, and cheap or disposable underwear ×2
- **Maternity pads — more than you think.** Two packs is a starting point
- Post-partum binder
- Portable bidet
- Toiletries **decanted into small bottles**
- Going-home outfit — still maternity-sized
- Nipple cream, and the silicone pump if you have one (boil it 2–3 minutes first)

**What to leave at home:** a thermometer, a nasal aspirator and baby bath soap.
The hospital provides all three.

*Source: a friend's July 2022 hospital bag checklist, shared directly. Confidence: high as a record of what they packed.*

### The star sign, and why this one is close

Sun-sign boundaries move by up to a day each year, so they are computed for 2027
rather than taken from a magazine table. Times are Manila.

| Sign | From | Until |
| --- | --- | --- |
| Taurus | 20 April 2027, 16:00 | 21 May 2027, 15:00 |
| **Gemini** | **21 May 2027, 15:00** | 21 June 2027, 23:00 |
| Cancer | 21 June 2027, 23:00 | — |

**The due date of 19 May lands in Taurus with two days to spare.** That is a
narrow margin: arriving three days late makes the cub a Gemini instead, and
first babies are more often late than early. A planned caesarean at 38 or 39
weeks would be firmly Taurus; going past the due date is a coin-toss.

The earliest plausible dates, from 37 weeks on 28 April, are all Taurus too — so
in practice the only route to a Gemini is going past the due date.

### The Chinese year

Any date in this range falls in the **Year of the Fire Goat** (丁未, *Ding-Wei*),
which runs from **6 February 2027 to 25 January 2028**. The Heavenly Stem *Ding*
is yin fire; the Earthly Branch *Wei* is the Goat. The Goat is traditionally read
as gentle, artistic and drawn to peace, and fire years are said to warm that into
something more outgoing.

*Source: [ChineseZodiac.com — Chinese New Year 2027](https://chinesezodiac.com/chinese-new-year/2027). Verified 2026-09-18. Confidence: high on the dates and the stem-branch pairing; the character readings are tradition, not prediction.*

### Birthstones and birth flowers

| Month | Stone | Flower |
| --- | --- | --- |
| April | Diamond | Daisy, sweet pea |
| **May** | **Emerald** | **Lily of the valley, hawthorn** |
| June | Pearl, moonstone, alexandrite | Rose, honeysuckle |

*Modern Western birthstone list. Tradition, not fact — and there are older lists that disagree.*

> **Said plainly:** none of this section is medicine and none of it predicts
> anything. It is here because it is a nice thing to wonder about while you wait,
> and because the term classifications at the top genuinely matter when a
> delivery date is being chosen.

---

## 14. Birth plan — caesarean or vaginal

Nothing here needs deciding before about 20 weeks, and most of it settles at 36.
It is written down now so the thinking happens without pressure, and so the
questions exist before anyone is in a room asking for an answer.

### The thing most people get wrong

**This is usually not a free choice, and planning one does not guarantee it.** A
substantial minority of first-time mothers who plan a vaginal birth end up with a
caesarean anyway — position, progress, fetal distress. Some findings decide it
outright.

So the useful question is not *which do I pick*. It is:

1. **What is the default plan?**
2. **What would change it, and who decides in the room?**

The second matters more, because the worst statistical outcome is neither planned
route — it is an **emergency caesarean after a long labour**, which carries more
risk than a planned section or a spontaneous vaginal birth. Much of good planning
is simply not arriving there by drift.

### The comparison, honestly

| | Planned vaginal | Planned caesarean |
| --- | --- | --- |
| Recovery | Days to about 2 weeks | About 6 weeks. It is major abdominal surgery |
| Hospital stay | 1–2 days | 3–4 days |
| Mother's risks | Perineal tearing, pelvic floor injury, incontinence | Infection, haemorrhage, blood clots, more pain, harder early breastfeeding |
| Baby | Lung fluid cleared by the squeeze; microbiome seeded on the way through | More respiratory trouble, markedly so before 39 weeks |
| Predictability | None | A date and a time |
| Cost at Makati Med | ~₱120,000–250,000 | ~₱200,000–400,000 |
| Future pregnancies | Unaffected | The decisive difference — see below |

### The three factors that weigh heaviest here

**1. Dani is 27, and this is her first.** Each caesarean raises the risk of
placenta previa and placenta accreta spectrum in later pregnancies — accreta
being the complication that can cost a uterus. ACOG states that caesarean on
maternal request **is not recommended for anyone planning several children**. If
two or three are wanted, that argues strongly for planning vaginal this time. If
this is likely the only pregnancy, the calculus genuinely shifts.

**2. Know the base rate at the hospital.** Caesarean rates at many Philippine
private hospitals run **above 25%**, against the WHO position that population
benefit plateaus around 10–15%. That is context, not an accusation. **Ask Dra.
Villafria what her own rate is and what her threshold is.** A good obstetrician
answers that without defensiveness, and the answer is informative either way.

**3. What the guidance actually says.** Absent a maternal or fetal indication,
ACOG: *"a plan for vaginal delivery is safe and appropriate and should be
recommended."* They equally honour a request for caesarean after proper
counselling. There is a default, and there is a real choice.

### What will probably decide it, and when it is known

| Finding | When |
| --- | --- |
| Placenta previa | Anomaly scan, ~18–22 weeks |
| Baby's position (breech) | Not settled until ~36 weeks |
| Blood pressure or growth problems | Third trimester |
| Size, and how labour actually progresses | On the day |

### Questions for Dra. Villafria — ask at around 28 weeks

- [ ] What is your caesarean rate, and what is your threshold for calling one?
- [ ] Do you support a vaginal birth if that is what I want?
- [ ] What is your approach if labour is slow — how long before you intervene?
- [ ] What is your policy on induction, and at what point would you raise it?
- [ ] If a section becomes necessary, who decides, and will I be part of that conversation?
- [ ] Can Nico be in theatre for a caesarean? At what point does he come in?
- [ ] What pain relief is available in labour at Makati Med, and is an epidural always available?
- [ ] If I have a caesarean this time, what does that mean for a next pregnancy?
- [ ] What would make you recommend a planned section rather than waiting?

**How she answers the first and the fifth tells you most of what you need.**

### The decision timeline

| When | What happens |
| --- | --- |
| Now – 20 weeks | Nothing to decide. Read this once and set it down. |
| ~20 weeks | Anomaly scan rules placenta previa in or out. |
| ~28 weeks | Ask the questions above. Agree a default plan. |
| ~36 weeks | Position known. The plan is settled here. |
| If elective | **Timed at 39 weeks or later** — see the caesarean windows in section 13. |

### One note for later

If this birth is a caesarean, a vaginal birth next time — VBAC — is often still
possible, and is worth asking about rather than assuming. It is not automatically
closed off.

*Sources: [ACOG Committee Opinion 761 — Cesarean Delivery on Maternal Request](https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2019/01/cesarean-delivery-on-maternal-request); [WHO Statement on Caesarean Section Rates](https://www.who.int/publications/i/item/WHO-RHR-15.02); [ACOG — Avoidance of Nonmedically Indicated Early-Term Deliveries](https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2019/02/avoidance-of-nonmedically-indicated-early-term-deliveries-and-associated-neonatal-morbidities). Verified 2026-09-18. Confidence: high on the guidance; medium on the Philippine private-hospital rate, which is from secondary reporting; costs as per section 9 and low confidence.*

---

## 15. Sleep

> **Right now, at 5 weeks, the single most useful thing on this page:
> you do not have to sleep on your side yet.** The side-sleeping advice applies
> from **28 weeks**. Until then, sleep in whatever position gets you to sleep.
> A great many people spend the first trimester anxious about this unnecessarily.

### Why the first trimester wrecks sleep

It is a genuine paradox: exhausted all day, wide awake at 3am. Four things are
doing it at once.

- **Progesterone has surged.** It is sedating by day, which is the daytime
  exhaustion, and it fragments night sleep.
- **Your kidneys are filtering far more blood.** Night-time bathroom trips start
  in the first trimester, long before the bump presses on anything.
- **Nausea does not keep office hours.** An empty stomach at 4am makes it worse.
- **Your mind has a great deal to do.** Early pregnancy is a lot to hold, and it
  surfaces at night.

None of this means you are doing it wrong. It is the normal shape of weeks 5–13.

### What actually helps, by stage

**First trimester — now until about week 13**

- **Protect the 3am snack.** Plain crackers or dry toast on the bedside table.
  Eating a little when you wake often settles both the nausea and the waking.
- **Front-load fluids.** Drink plenty during the day and taper in the two hours
  before bed. Do not cut back overall — dehydration makes nausea worse.
- **Nap, but before 3pm and under 30 minutes.** Longer or later and it starts
  eating into the night.
- **Caffeine cut-off by early afternoon.** Under 200mg a day anyway, and none
  after about 2pm — its half-life is roughly 5–6 hours, and *longer* in
  pregnancy as metabolism slows.
- **Get up if you have been awake 20 minutes.** Something dull and dim, then
  back. Lying there teaches your body that bed is where you lie awake.

**Second trimester — about 14 to 27 weeks**

Usually the best sleep of the pregnancy. Use it, and build the habits now while
they are easy: a fixed wake time, a dim hour before bed, the bed reserved for
sleeping.

- Start getting used to side-sleeping *before* you need to, so it is not a new
  problem at 28 weeks.
- Heartburn often begins here. Nothing heavy within three hours of bed; raise
  the head of the bed a few inches rather than stacking pillows.

**Third trimester — 28 weeks on**

- **Go to sleep on your side, either side.** See below.
- A pillow between the knees, one under the bump, one behind the back.
- Reflux, leg cramps, restless legs and breathlessness all peak here. Each has
  its own fix — the guide's stretch section covers the cramps.
- Vivid dreams are almost universal and are not a sign of anything.

### The position rule, precisely

From **28 weeks**, go to sleep **on your side**. The evidence is about the
position you *fall asleep in*, not the one you wake in: studies of late
stillbirth found going to sleep on the back carried a meaningfully raised risk,
with odds ratios of roughly 2.5 to 3.7 across the case-control work. The
mechanism is mechanical — lying flat on the back lets the uterus compress the
large vein returning blood to the heart, reducing the blood reaching the
placenta.

Three things this does **not** mean:

- **It does not apply before 28 weeks.** Sleep however you like until then.
- **It does not have to be the left side.** Left is marginally better on
  circulation grounds, but either side is the actual advice, and a rule that is
  too strict to follow helps nobody.
- **Waking on your back is not a failure.** You cannot control what you do
  asleep, and the evidence is about the going-to-sleep position. Roll back onto
  your side and go back to sleep.

*Sources: [Going to sleep in the supine position is a modifiable risk factor for late pregnancy stillbirth (PLOS One)](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0179396); [Maternal sleep position during pregnancy (NCBI Bookshelf)](https://www.ncbi.nlm.nih.gov/books/NBK573947/). Verified 2026-09-19. Confidence: high on the 28-week threshold and the going-to-sleep framing.*

### What is safe to take, and what is not

| | |
| --- | --- |
| **Melatonin** | **Not recommended.** Evidence in pregnancy is thin, and it is not established as an effective insomnia treatment here. Widely sold and widely assumed harmless; neither is a reason. |
| **Antihistamines used as sleep aids** | Ask Dra. Villafria first. Some are used in pregnancy, but this is a conversation, not a pharmacy decision. |
| **Prescription sleeping tablets** | Only on a specialist's advice. |
| **Herbal sleep teas and supplements** | Avoid unless specifically cleared. Unregulated and largely unstudied. |
| **CBT-I** | **The first-line treatment, and it is safe in pregnancy.** Randomised trials, including of app-delivered versions, show it works for pregnancy insomnia — and it may reduce later postpartum depression symptoms. Ask Dra. Villafria for a referral or a reputable app. |

*Sources: [Digital CBT-I for insomnia in pregnancy (JAMA Psychiatry)](https://www.ovid.com/journals/japs/pdf/10.1001/jamapsychiatry.2019.4491~efficacy-of-digital-cognitive-behavioral-therapy-for-the); [Sleeping for Two RCT](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8358257/); [MGH Center for Women's Mental Health on melatonin](https://womensmentalhealth.org/posts/you-asked-is-it-safe-to-take-melatonin-during-pregnancy/). Verified 2026-09-19.*

### Two things to raise with the OB rather than solve alone

**Restless legs.** That crawling, must-move feeling in the legs at night affects
a large minority of pregnancies — and it is **strongly linked to low iron**.
If it starts, that is a specific reason to ask for **ferritin**, not just a
haemoglobin. Treating the iron often treats the legs.

**Snoring plus daytime sleepiness.** Sleep apnoea becomes more common in
pregnancy, and it is associated with raised blood pressure and gestational
diabetes. If Nico notices you snoring heavily or stopping breathing, that is
worth mentioning — it is treatable and routinely missed.

### On tracking it

A wearable measures sleep well enough to show a trend and badly enough that a
single night's score means very little. Two cautions worth holding:

- **A bad score is not a verdict on your night.** If you feel rested, you were.
- **Watching the number can itself cost you sleep.** There is a recognised
  pattern of anxiety about sleep data making sleep worse. If checking the score
  first thing is making mornings tense, stop checking it.

What a tracker *is* good for is the trend across weeks, and noticing the thing
you would otherwise have missed — a slide that starts when the caffeine crept
back up, or restless legs showing as broken sleep before you consciously
noticed them.

---

## 16. The run-up — help, the care team, and what happens when

Most of what makes the last months calm is arranged in the middle ones. This
section is a real plan, not a generic one: a couple in BGC worked through it for
their first baby and kept the sheet, including who owned each task.

### The order they did it in

Nothing here is due at five weeks. It is here so the timings are known before
they arrive.

**Second trimester — roughly weeks 14 to 27**

- [ ] Sort housing. Whether you are staying put or moving, decide early — they
      renegotiated with their landlord and found the next place in this window,
      and a move gets materially harder later.
- [ ] **Start looking for help.** Finding someone good takes months, not weeks,
      and the best route is usually a relative or referral of someone already
      trusted. Theirs came through family in Bohol.
- [ ] **Book the birthing class.** Theirs ran five Sunday sessions and was
      recommended for around week 26, so it needs booking well before that.
- [ ] Antenatal yoga or a movement class, if you want one.
- [ ] **Hand the baby shower to someone else.** They assigned it, by name, to a
      person who was not the pregnant one.

**Third trimester — roughly weeks 28 to 40**

- [ ] Help starts, and is trained, **before** the baby arrives — not after.
- [ ] Buy the shopping list, **high-priority items only**. Their own hindsight
      says the rest can wait until you know what this baby is like.
- [ ] **Finalise the birth plan.** See the Birth tab.
- [ ] Nursery: the practical part is blackout curtains and a dim lamp, not the
      decorating.
- [ ] Pack the hospital bag, around 36 weeks.
- [ ] Baby shower.

**Fourth trimester — the first three months after**

They named it, which is the useful part. The weeks after the birth are a stage
with its own needs, not an aftermath, and they planned for it in advance rather
than improvising.

### Choosing a paediatrician before you need one

**This is chosen before the birth, not after.** The baby needs a first check
within days of coming home, and a name and number you already trust is worth a
great deal at 2am in week one.

What their notes actually valued, which is worth copying as a question list:

- **Do they reply to messages?** The single most-repeated praise in their sheet
  was about responsiveness — one paediatrician was described as answering "even
  in the wee hours."
- **House calls, or drive-through visits?**
- **Is the secretary good at scheduling, and do they remind you about vaccines?**
- **How is the baby book kept** — do they record the actual brand of each vaccine
  given?
- **Are they calm with an anxious parent?** Their words, about one doctor: a
  "steady calmness that always appeases even the most panicky mom."
- **Are they light-handed giving injections?**
- **Which insurance do they take?** They tracked Intellicare coverage per doctor.

Paediatricians they had shortlisted, at **Makati Med** and **St. Luke's BGC** —
their opinions, not a recommendation, and contact details are in their own sheet
rather than reproduced here:

| Doctor | Where | What they said |
| --- | --- | --- |
| Dr. Jose Enrique Clemente | Makati Med, Rm 349; also St. Luke's BGC | Clinic and drive-through visits, reachable, very organised baby books, patient, calm with anxious parents |
| Dr. Romeo "Ome" Nugiud | St. Luke's BGC, Rm 507 | Does house calls, replies at any hour, good scheduling, light-handed with vaccines |
| Dr. Cricket Palanca-Cheng | St. Luke's BGC | By appointment only |

They also kept two **lactation consultants** on the list, one at Makati Med.
Worth having a name before the birth rather than searching for one on day three,
when latch problems actually show up.

### What help really costs

A yaya's salary is not what a yaya costs. Their fully-loaded budget, built in
2022 on a **₱10,000 base**, came to about **₱12,020 a month** — roughly **20%
on top** — because of everything stacked around it:

| On top of the base salary | Their monthly figure |
| --- | --- |
| 13th month pay (one month, spread) | ₱833 |
| SSS — employer and employee share | ₱970 |
| PhilHealth — both shares | ₱400 |
| Pag-IBIG — both shares | ₱200 |
| Toiletries and supplies | ₱250 |
| Medical allowance | ₱200 |
| Travel allowance | ₱250 |
| Five paid leave days, spread | ₱174 |

Plus **one-off costs at the start**: health screening (~₱1,000), travel to
Manila if they come from the provinces (~₱2,500), and a starter pack — shampoo,
soap, toothbrush, toothpaste, tissue, bath towel, slippers, blanket, two
pillows, and a basic phone.

**The current legal floor is higher than their 2022 base.** The NCR minimum for
a kasambahay is reported as **₱7,800 a month**, effective 7 February 2026 under
Wage Order NCR-DW-06. Their ₱10,000 was above it then and is above it now, which
is roughly the level a yaya for a newborn in BGC or Makati commands.

**What the law requires** — the Batas Kasambahay, RA 10361:

- **Registration with SSS, PhilHealth and Pag-IBIG** is the employer's job, not
  the worker's.
- If the wage is **below ₱5,000 a month, the employer pays the whole
  contribution.** At ₱5,000 and above the statute provides for the kasambahay to
  pay their share — though sources disagree on how that is applied in practice,
  and their sheet simply budgeted **both** shares as an employer cost. That is
  the safer way to plan: budget for both, and be pleasantly wrong.
- **A day off every week**, and daily rest.
- **Five days of paid leave after a year** of service.
- **13th month pay.**
- A written contract, and the papers to go with it: NBI clearance, barangay
  clearance, a government ID, and ID photographs.

**Get the registrations done in the first week.** Their plan had SSS, PhilHealth
and Pag-IBIG all registered within three days of arrival, alongside the health
check and NBI clearance — done as a block, before the routine sets in.

> **These are 2022 figures for everything except the minimum wage, and the
> statutory rates change.** Contribution tables in particular are revised
> regularly. Confirm current SSS, PhilHealth and Pag-IBIG household-employer
> rates before budgeting, and get the contract right — this is an employment
> relationship with legal obligations, not an informal arrangement.

### Classes, for much later

Nothing here starts before the baby is a few months old, but they are listed
because the good ones book up:

| Type | Starts from | Where they looked |
| --- | --- | --- |
| Music | 0 months | Kindermusik |
| Baby gym / parent-and-child | 4 months | The Little Gym |
| Pre-swimming | 6 months | Bert Lozada Swim School, Ace Water Spa |

*Sources: a friend's 2022 planning sheet, shared directly (high confidence as a record of what they did, low for peso figures). Kasambahay wage and statutory duties from secondary reporting — [NCR kasambahay wage order](https://sweldoph.com/news/ncr-kasambahay-7800-2026), [RA 10361 employer guide](https://sweldoph.com/guides/kasambahay-law) — because the egress policy blocks Philippine government sites. Confidence: medium. Verified 2026-09-22.*
