# INSTITUTION Campus add-on

New in this version, all reachable from the **Campus** button in the top bar:

| Section | Who uses it | What it does |
|---|---|---|
| **Bus tracking** | Parent, student, class teacher, principal, transport | Every bus on one live map, with driver and conductor. Each student's journey is tracked from the stop to school and from school back home. |
| **Activities** | Student, parent, teacher in charge, principal | Co-curricular activities (sports, arts, clubs, NCC/NSS). The student asks, the parent approves, and the teacher confirms. The principal can add or close activities. |
| **Lesson videos** | Student, parent, teacher | A narrated video lesson for every topic. Teachers can add their own recording or a link. The video also opens from the **▶ Video lesson** button on every 3D model. |
| **Messages** | Every role | Alerts and messages for each role (bus, activities, videos, study lock), plus a reply form. |
| **Study lock** | Student, parent | A parent-controlled "do not disturb" study mode, plus a phone setup guide. |
| **Today** | Student, parent | The daily card: overall progress, streak and XP, "continue where you stopped", tasks from the teacher and the parent, and suggestions. It also pops up once a day when the learning app opens. |
| **Subjects** | Everyone | Physics, Chemistry, Maths, Social Science, Computers, EVS and Physical Education (50 topics): notes, read-aloud, a 4-question quiz (pass with 3), a linked 3D lab and an AI subject teacher. Biology stays in the 3D library. |
| **3D Labs** | Everyone | 22 real-time 3D labs with steps, tools, saved observations and an AI lab teacher (list below). |
| **Study Hub** | Everyone | Every topic in 5 steps: Understand (3D, video, AI teacher) → Practice (quiz) → Read (notes, read-aloud, NCERT) → Write (exam-style answer, key-term checker, model answer) → Execute (3D lab or activity). Also important questions with answers, printable board-pattern practice papers with an answer key and a timer, official previous-years'-paper links, a school paper library (teachers upload PDFs or photos) and printable revision notes. |
| **Fun Zone** | Everyone | "Where difficult concepts become fun": 27 hard topics across Maths, Science, Social Science, Computers, EVS and PE, each with a memory trick, an original sing-along chant on a beat, a picture story and a quick check. Includes a 118-element periodic table explorer with a chant and a "find it" game, and a 2-minute guided brain break. |
| **Games** | Student (not during study lock) | 6 games with levels and stars: Maths Sprint (10 levels), Element Hunter, Binary Blaster, Map Master (state and world capitals), Quiz Quest (all subjects by class) and Formula Flip (memory). Pass with 7/10 to unlock the next level. |
| **Assignments** | Class teacher, parent | Set tasks (3D topic, video lesson, 3D lab, subject quiz or any other task) with a due date. They appear on the student's Today card and tick themselves off when finished, and the setter gets a message. |

## 3D labs (`public/labs3d.js`)

| Subject | Lab | What the student does |
|---|---|---|
| Biology | Cockroach dissection | Pin, lift the wings, cut along the back, open the flaps, find the heart, 4 parts of the gut, lift the gut to see the nerve cord |
| Biology | Frog dissection | Pin, cut and open the skin and muscle wall, find 5 organs, move the gut to see the kidneys and bladder |
| Biology | Typical flower (China rose) | Remove sepals and petals with forceps, look at pollen with a hand lens, find the stigma, cut the ovary and count the chambers |
| Physics | Magnetic and non-magnetic | Test 10 objects with a magnet, sort them into boxes, see the compass needle follow the magnet |
| Physics | How a battery lights a bulb | Look inside the cell, close the switch, watch electrons (and conventional current), add cells, break the wire. Live V, I and R |
| Physics | Force, friction and motion | Pull a block on glass, wood and sandpaper with force arrows; change mass and force; see static and sliding friction |
| Chemistry | Chemical reactions bench | Neutralisation with phenolphthalein, zinc + acid with the hydrogen pop test, iron nail in copper sulphate, baking soda + vinegar with lime water, a copper hydroxide precipitate. Each ends with the balanced equation |
| Maths | Solids and nets | Unfold a cube, cuboid, square pyramid and cylinder; live faces, edges, vertices, surface area and volume |
| Social Science | Globe | Latitudes, tropics and circles; click anywhere for latitude and longitude; month and UTC sliders move the Sun for day, night, IST and seasons |
| Computers | Inside a computer | Power on, open the case, follow data from SSD to RAM to CPU to GPU to monitor, then identify parts |
| Computers | Logic gates | AND, OR, NOT, NAND, NOR and XOR with switches, an LED and a truth table |
| Biology | Microscope: onion peel | Place the slide, focus on low power, switch to 400× and refocus, find cell wall, nucleus, cytoplasm and vacuole |
| Physics | Simple pendulum | The lab times 10 oscillations; change mass (no change) and length (changes); find the 2-second pendulum |
| Physics | Convex lens | Move the object past 2F, at 2F, between F and 2F and inside F; live ray diagram, image, v and magnification |
| Chemistry | pH of household liquids | Universal indicator on 8 liquids, neutralise vinegar, bee-sting question |
| Maths | Graph board y = mx + c | Slope and intercept sliders, an ant walking the line with coordinates, match target lines |
| Maths | Probability with dice | Roll 1 or 2 dice up to thousands of times; 3D bar chart against theory; P(sum 7) |
| Social Science | Inside the Earth | Cut-away layers, go deeper, erupt a volcano, earthquake with a live seismograph |
| Social Science | Solar System | Planets in order, largest, red planet, one Earth year |
| Computers | Sorting algorithms | Bubble and selection sort step by step with counters; sort by hand |
| Computers | Binary bulbs | One byte of bulbs: make 5, 13, 255 and the letter A |
| EVS | Water cycle | Sun heats the sea, clouds fill, rain and snow fall, river collects |

**Dissection cutting is easier now.** When the scalpel is picked, the camera turns to look straight down the cut, a glowing guide line and a 3D scalpel appear, and you can drag or simply tap along the line (55% is enough). If it is still hard, **Guide my hand** moves the scalpel along the line for you. The frog's pin points were also enlarged so they can't hide under the hands.

Every lab can be dragged to turn, scrolled or pinched to zoom, and right-dragged (or Shift-dragged) to move. Names can be switched on and off, and **Labelled picture** saves a PNG. Finishing a lab messages the parent and the class teacher.

Dissections are virtual. No animal is harmed, and CBSE no longer requires real animal dissection.

## AI teachers

- **Asha**, the AI lab teacher, sits beside every lab and knows the current step.
- **Ravi**, the AI subject teacher, is on every subject topic and every Study Hub step (he can also review a written answer) and in the 3D viewer (the new **AI teacher** button).
- Both can read answers aloud and take spoken questions where the browser supports it.

The teachers try three sources, in order:

1. **Claude**, automatically, when the page runs inside claude.ai.
2. **Your own server**, if you set `AI.endpoint` at the top of `public/labs3d.js`. `server/ai-teacher-example.mjs` is a ready example. Keep the API key on the server.
3. **Offline notes**. Without either, the teachers answer from the lesson notes, part names and steps, and say so.

The panel always shows which source answered, and the teachers say they are an AI.

## Files

- `public/labs3d.js` and `public/labs3d.css` hold the 3D labs, Subjects, Today, Assignments and AI teachers. They need `campus.js` and the app's own three.js, which `src/main.jsx` now shares as `window.__THREE` (also patched into the built file in `dist/`).
- `server/ai-teacher-example.mjs` is an optional AI server.
- `public/campus.js` and `public/campus.css` hold the campus add-on. They load the same way `panic-button.js` does, through `index.html`.
- `dist/` is already updated, so you can upload it as it is. No rebuild is needed.
- `public/assets/videos/` is where recorded videos go (see the README inside).
- `INSTITUTION-single.html` is the whole app in one file, for opening directly on a computer.

`npm run dev` and `npm run build` work as before, because Vite copies `public/` into `dist/` automatically.

## Settings (top of `public/campus.js`)

```js
const CAMPUS = {
  school: 'INSTITUTION',
  transportOfficePhone: '',   // shown to parents
  notifyWebhook: '',          // your server URL for SMS / WhatsApp (see below)
  lessonVideos: {},           // { heart: './assets/videos/heart.mp4' }
};
```

## Bus tracking: how it works

1. **Driver app** (Transport → Driver app). The driver starts the morning or afternoon trip, reports a delay or an emergency, and can test what happens when the GPS signal is lost.
2. **Conductor app.** The conductor marks each student:
   - Morning: Boarded or Not at stop.
   - Afternoon at school: Boarded or Picked up at school.
   - At each drop stop: Got off, plus who received the student.
   - End of trip: confirms the bus is empty.
3. **Automatic checks**:
   - A student isn't marked when the bus leaves a stop. Parent and principal are alerted.
   - A student didn't board at school and isn't marked as picked up. Teacher, principal and parent are alerted.
   - A student is still marked on the bus after the last stop. An URGENT alert goes to the principal, teacher and parent.
   - Nobody confirms the bus is empty within a minute. The principal is alerted.
4. **Messages sent**:

   | Who | What they get |
   |---|---|
   | Parent | Trip started; bus one stop away; boarded (with driver and conductor names); reached school safely; boarded for home; got off and who received the child; delays; problems |
   | Class teacher | Arrival summary for their class; absences at the stop; delays; urgent cases |
   | Principal | Every arrival, missing students, delays, emergencies, empty-bus checks |

The demo moves the buses on simulated GPS. Use **Start all morning trips** on any bus page. For real tracking, the driver app needs to send the phone's location to a server, or each bus needs a GPS tracker.

## Sending real SMS / WhatsApp

A website cannot send SMS or WhatsApp messages on its own. Set `notifyWebhook` to your server's address. Every alert is then POSTed as JSON:

```json
{ "to": "parent", "text": "Ananya reached school safely at 8:42 am on Bus 2 …", "kind": "bus", "urgent": false, "at": 1730000000000, "child": "Ananya", "school": "INSTITUTION" }
```

Your server looks up the phone numbers and sends the message through an SMS / WhatsApp Business provider (for example MSG91, Gupshup or Twilio). Teachers and the principal also get a **WhatsApp the parent** button on urgent alerts, once the parent has saved their number under Messages.

## Study lock: what is real

**The app itself:**
- Full screen.
- Only lessons, 3D models, quizzes and videos can be opened. Dashboard, Feedback and other sections are blocked.
- Every time the student leaves the app, the time away is recorded and the parent is told.
- Ending early needs the parent's PIN.
- Study hours can remind the student to start.

**What a website cannot do:** block other apps or browser tabs, or forward phone calls. The phone setup guide (Study lock tab) walks parents through the phone's own settings:
- App pinning (Android) or Guided Access (iPhone), to keep the phone on this app.
- Do Not Disturb with parents allowed through.
- Call forwarding.
- Family Link or Screen Time.

Emergency calls (112) and the SOS button always stay available. A future native Android app could enforce this directly on school-managed devices (lock-task mode).

## Data

Everything is saved in the browser (`localStorage`, plus IndexedDB for uploaded videos). Each phone or computer keeps its own copy. To share data between parents, teachers and staff, connect a backend such as Supabase.

## 3D viewer additions (every topic)

The 3D viewer's bottom bar has three new buttons:

- **Inside**: makes the outer wall see-through so the inner parts show. On the heart these are the septum, valves, conduction system and chordae. On a cell, the organelles show through the membrane.
- **Labelled image**: saves a PNG of the current view with every part named.
- **3D video**: a narrated tour of the real 3D model. It turns to each part, highlights it, shows its name and job, and reads them aloud. It can be saved as a `.webm` file. These tours are also the default video in Lesson videos.

Labels (names) are now on by default.

While the 3D video plays, the model stays live: drag to turn it and scroll to zoom. The captions sit at the bottom of the screen, and **Show video screen** brings back the recorded-video view.

**Heart, extra parts.** The heart now has 23 parts (it had 14). New ones:

| Group | Parts |
|---|---|
| Structure | interventricular septum, papillary muscles and chordae tendineae |
| Electrical system | SA node (pacemaker), AV node, bundle of His and bundle branches, Purkinje fibres |
| Nerves | vagus nerve (slows the heart), sympathetic cardiac nerves (speed it up) |
| Blood vessels | coronary veins and coronary sinus |

New simulation switches:

- **Heart sound (lub-dub)**: lub as the tricuspid and mitral valves close, dub as the aortic and pulmonary valves close. The valves visibly snap shut in time with the sound.
- **Electrical impulse**: a spark travels from the SA node to the AV node, then down the bundle of His into the Purkinje fibres every beat.

The info panel shows what is happening at each moment of the beat.

## Fixes included

- "Cannot read properties of undefined (reading 'x')" when opening a 3D model. The first animation frame could get a negative time, so curve-based animations (heart blood flow, neuron, pollen tube) asked for a point before the start of the curve. Fixed in `src/three/Stage.js` and `src/three/models/heartbrain.js`, and patched directly into `dist/assets/index-campus-3d.js` (the built file was renamed so browsers don't keep the old copy).
- `src/three/Stage.js` now registers each 3D stage in `window.__instStages`, so `campus.js` can add the inside view, names and 3D tours.
