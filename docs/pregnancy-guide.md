# Pregnancy guide — Nics and Dan's Cub

Source content for the app. Everything here is written to be converted into
structured seed data (`weeks`, `foods`, `stretch_routines`, `shops`,
`red_flags`, expense bands), not rendered as prose.

**Compiled 18 September 2026.** Dani's EDD is 23 May 2027; care is with
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

| Field | Value | Source | Confidence |
| --- | --- | --- | --- |
| EDD | 2027-05-23 | Given | — |
| Term length | 280 days from LMP | Naegele's rule, standard obstetric dating | high |
| Implied LMP (bare count) | 2026-08-16 | Derived | high |
| Implied conception (bare count) | 2026-08-30 | LMP + 14 days | high |
| Displayed dating offset | +2 days | App setting `dating_offset_days` | — |

**The offset, and why it is flagged.** The app displays gestational age as
`280 − (EDD − today) + dating_offset_days`, with the offset defaulting to `2`
so that 16 Sept 2026 reads as Week 4, Day 5. The bare subtraction gives Week 4,
Day 3.

The bare count also places conception on **30 August 2026** — the middle of the
29–31 August window the couple recall. The offset moves it to 28 August, just
outside. That is a reason to raise the dating with Dra. Villafria at the dating
scan rather than to assume the app is right. Setting the offset to `0` reverts
to standard dating.

### Milestone dates computed from the EDD

Both columns are shown because they differ, and the difference matters.

| Milestone | Gestational age | Standard dating | With +2 offset |
| --- | --- | --- | --- |
| Implied LMP | 0w0d | 2026-08-16 | 2026-08-14 |
| Implied conception | 2w0d | 2026-08-30 | 2026-08-28 |
| NIPT available from | 10w0d | 2026-10-25 | 2026-10-23 |
| NT scan window | 11w0d – 13w6d | 2026-11-01 – 2026-11-21 | 2026-10-30 – 2026-11-19 |
| End of first trimester | 13w6d | 2026-11-21 | 2026-11-19 |
| Anomaly scan window | 18w0d – 22w0d | 2026-12-20 – 2027-01-17 | 2026-12-18 – 2027-01-15 |
| OGTT window | 24w0d – 28w0d | 2027-01-31 – 2027-02-28 | 2027-01-29 – 2027-02-26 |
| Tdap window | 27w0d – 36w0d | 2027-02-21 – 2027-04-25 | 2027-02-19 – 2027-04-23 |
| Third trimester begins | 28w0d | 2027-02-28 | 2027-02-26 |
| RSV vaccine window opens | 32w0d | 2027-03-28 | 2027-03-26 |
| GBS swab window | 35w0d – 37w0d | 2027-04-18 – 2027-05-02 | 2027-04-16 – 2027-04-30 |
| Hospital bag packed by | 35w0d | 2027-04-18 | 2027-04-16 |
| Term | 37w0d | 2027-05-02 | 2027-04-30 |
| 40 weeks | 40w0d | **2027-05-23** | **2027-05-21** |

**Read the last row.** Under standard dating, 40w0d lands exactly on the EDD,
which is what "estimated due date" means. With the +2 offset, the app reaches
40 weeks *two days before* Dani's due date, and every window above shifts two
days early with it.

That is not a rounding artifact — it is the offset doing exactly what it was
asked to do, and it is why the offset is presentation-only:

- **Seed the appointment planner from the standard-dating column.** Those are
  the dates to book against and the ones to put in front of Dra. Villafria.
- **The offset changes only the "Week N, Day N" label** on the home screen.
- If the dating scan confirms the 29–31 August conception window, set
  `dating_offset_days` to `0` and the two columns collapse into one.

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
- *Filipino life:* **Vietnam trip lands near here.** See the travel section for the mosquito and food-hygiene rules.

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
- *Filipino life:* **Korea trip falls near here** — the best-timed of the four. See travel.

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
- *Filipino life:* **India trip falls near here.** This is the highest-planning trip of the four — see travel.

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

*Source: Institute of Medicine / National Research Council, "Weight Gain During Pregnancy: Reexamining the Guidelines" (2009). Verified 2026-09-18. Confidence: high. Already implemented in `src/lib/bmi.ts`.*

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

Dani is walking a marathon event in November 2026 — around **week 15–16**,
which is the best-timed part of the pregnancy for it.

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

Weeks below are on **standard dating** (the +2 offset shifts each by two days;
it does not change any recommendation).

| Trip | Dates | Week at start | Risk | Zika |
| --- | --- | --- | --- | --- |
| Vietnam | early Oct 2026 | ~7w1d | moderate | yes — present |
| Korea | 5–9 Dec 2026 | 15w6d – 16w3d | low | no |
| India | Jan 2027 | ~21w5d | high | yes — present |
| Mexico | Mar 2027 | ~30w1d | **avoid** | yes — present |

### The one rule that applies to all four

**If Nico travels to a Zika-risk area, the couple use condoms or abstain for
the rest of the pregnancy** — regardless of whether he has symptoms, and
regardless of whether Dani travelled with him. Zika persists in semen longer
than in blood, and sexual transmission to a pregnant partner is the specific
risk being managed.

This is not a precaution that scales with how well he feels. It applies for the
full remaining duration.

*Source: [CDC — Preventing Zika](https://www.cdc.gov/zika/prevention/index.html), [CDC — Recommendations for travelers](https://www.cdc.gov/zika/travel/index.html). Verified 2026-09-18. Confidence: high.*

### Vietnam — early October 2026, ~week 7

First trimester, and the nausea is likely at its worst. That is the main
practical constraint, not the destination.

- **Mosquitoes:** dengue and Zika both circulate. DEET up to 30% is safe in
  pregnancy — as is picaridin. Cover up at dawn and dusk, when *Aedes* bites.
- **Food and water:** bottled water, no ice from unknown sources, no raw herbs
  or salads, no street-stall raw preparations. The usual traveller's-diarrhoea
  rules, applied more strictly — dehydration is worse when already nauseated.
- **No raw fish.** Vietnamese cuisine has excellent raw and fermented dishes; none of them this trip.
- Travel insurance that explicitly covers pregnancy. Most standard policies exclude it.
- Bring a nausea plan: ginger, crackers, whatever is working at home.

### Korea — 5–9 December 2026, weeks 15–16

**The best-timed trip of the four.** Second trimester, past the nausea, well
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

### Mexico — March 2027, ~week 30 — **defer or cancel**

> **This is the trip to reconsider.** Not as a matter of caution, but because
> several separate factors compound.

1. **Zika.** Mexico has ongoing transmission. CDC advises that pregnant women
   avoid travel to areas with Zika risk. This alone is sufficient reason.
2. **Week 30, and long-haul.** Manila to Mexico is among the longest routings
   in the world — typically 20–30 hours with connections. At 30 weeks that is a
   serious DVT exposure and a long way from Dra. Villafria.
3. **Airline cutoffs are close.** By the end of March she is at ~32w3d, inside
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
