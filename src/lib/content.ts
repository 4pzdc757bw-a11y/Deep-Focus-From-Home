export const APP_NAME = "Deep Focus from Home";
export const APP_LINE = "Focus is a design problem, not a character test.";

export const STARTER_DAYS = [
  {
    day: 1,
    title: "Workspace",
    job: "Claim one surface that is work-only.",
    why: "When the same table is dining, couch desk, and office, the brain never gets a clean start cue.",
    actions: [
      "Pick the exact surface you will use for the next seven workdays.",
      "Clear everything that is not work.",
      "For the first deep-work block, park the phone (another room or off the desk).",
      "When you finish, close the space — do not linger there.",
    ],
  },
  {
    day: 2,
    title: "Household",
    job: "Set one visible do-not-disturb signal.",
    why: "People at home treat physical presence as availability. A signal they can see is kinder than a lecture.",
    actions: [
      "Name your core hours out loud to anyone who shares the space.",
      "Choose a signal a child could understand (door, headphones, card).",
      "Agree what counts as an emergency.",
      "Write one rule: chores wait for a break.",
    ],
  },
  {
    day: 3,
    title: "Digital",
    job: "Park the phone for the first deep-work block.",
    why: "Plan the day first. Then, for the block itself, the phone leaves your desk. Some research suggests a phone in view can pull at your attention, even on silent. Out of sight beats willpower.",
    actions: [
      "Write today’s 1–3 outcomes, then start the block.",
      "Then put the phone away for 60–90 minutes (another room, or face-down off the desk).",
      "Need a timer? Use a kitchen timer or a clock, not the phone.",
      "Between blocks, pick two short windows to check messages.",
    ],
  },
  {
    day: 4,
    title: "Rituals",
    job: "Write a morning start and a shutdown.",
    why: "Rituals replace willpower. The same five minutes every day tell the brain when work begins and ends.",
    actions: [
      "Write a 5–7 minute morning sequence.",
      "Clear the surface. Write 1–3 outcomes. Start the first block.",
      "Write a 5-minute shutdown: mark what finished, capture tomorrow, leave.",
      "Run both for five workdays before changing them.",
    ],
  },
  {
    day: 5,
    title: "Blocks",
    job: "Protect two deep-work sessions on the calendar.",
    why: "A block that is not on the calendar is a wish. Treat it as immovable.",
    actions: [
      "Choose two 60–90 minute windows for the next five workdays.",
      "Put them on the calendar with a start and an end.",
      "At the end of each, write one sentence about what you finished.",
      "If the day is wrecked, keep a 15-minute minimum. Do not cancel the streak.",
    ],
  },
  {
    day: 6,
    title: "People",
    job: "Add one accountability loop.",
    why: "Home has no passive social pressure. One person who knows the plan is enough.",
    actions: [
      "Name one accountability partner.",
      "Send them today’s 1–3 outcomes before you start.",
      "Schedule one body-doubling or coworking session.",
      "Keep the message short. Do not wait for the perfect person.",
    ],
  },
  {
    day: 7,
    title: "Energy",
    job: "Find your peak window. Plan next week there.",
    why: "Focus follows energy. Heroic blocks in a trough are how people quit the system.",
    actions: [
      "Look back over the last few days (your one-line notes, or memory). When did focus feel easiest?",
      "Name your strongest two-hour window.",
      "Put next week’s hardest work inside it.",
      "Take one genuine outdoor or movement break this afternoon.",
    ],
  },
] as const;

/** The free fillable 7-day pack (same file the site and the Kit emails link to). */
export const STARTER_PDF = "/downloads/7-day-starter-pack.pdf";

/** Plain-words note at the top of the starter (page and PDF): where each day's steps get done. */
export const STARTER_HOW_IT_WORKS = [
  "Each day has one job. Do the steps in your real workday, not on this page.",
  "Anything a step asks you to write goes in the boxes under that day (saved in this browser on this device) or on the printed PDF.",
  "Calendar steps go on whatever calendar you already use: phone, Google or paper.",
] as const;

export type StarterWriteIn = {
  id: string;
  label: string;
  /** "time" shows a time picker and "long" a taller box on the page; the PDF prints blank lines. */
  kind?: "text" | "time" | "long";
  placeholder?: string;
};

/**
 * Write-in boxes under each starter day, only where a step asks the reader to
 * write or choose something. Same labels on /starter and in the PDF.
 */
export const STARTER_WRITE_INS: Record<
  number,
  { fields: StarterWriteIn[]; note?: string }
> = {
  1: {
    fields: [
      {
        id: "surface",
        label: "My work surface",
        placeholder: "e.g. the desk in the spare room",
      },
    ],
  },
  2: {
    fields: [
      {
        id: "coreHours",
        label: "My core hours",
        placeholder: "e.g. 9:00–12:00",
      },
      {
        id: "signal",
        label: "My signal",
        placeholder: "e.g. door closed, headphones on",
      },
      {
        id: "emergency",
        label: "What counts as an emergency",
        placeholder: "e.g. someone is hurt or the school calls",
      },
      {
        id: "choresRule",
        label: "My chores rule",
        placeholder: "e.g. chores wait for a break",
      },
    ],
  },
  3: {
    fields: [
      { id: "outcomes", label: "Today’s 1–3 outcomes", kind: "long" },
      {
        id: "checkWindows",
        label: "My two message-check windows",
        placeholder: "e.g. 11:30 and 3:00",
      },
    ],
  },
  4: {
    fields: [
      {
        id: "morningStart",
        label: "My morning start (5–7 minutes)",
        kind: "long",
      },
      { id: "shutdown", label: "My shutdown (5 minutes)", kind: "long" },
    ],
  },
  5: {
    fields: [
      { id: "block1Start", label: "Block 1 start", kind: "time" },
      { id: "block1End", label: "Block 1 end", kind: "time" },
      { id: "block2Start", label: "Block 2 start", kind: "time" },
      { id: "block2End", label: "Block 2 end", kind: "time" },
    ],
    note: "Also put these on your calendar.",
  },
  6: {
    fields: [
      { id: "partner", label: "My accountability partner’s name" },
      {
        id: "coworking",
        label: "My coworking session time",
        placeholder: "e.g. Thursday 10:00, video call with Sam",
      },
    ],
  },
  7: {
    fields: [
      {
        id: "peakWindow",
        label: "My strongest two-hour window",
        placeholder: "e.g. 9:00–11:00",
      },
    ],
  },
};

/**
 * "What the full handbook adds": last box on /starter (after Day 7) and page 8
 * of the free PDF. Every bullet is something the $17 handbook purchase really
 * delivers (handbook PDF chapters + Fillables.zip in private/downloads/handbook).
 * The button goes straight to the live $17 handbook Stripe Payment Link (the
 * same VITE_STRIPE_HANDBOOK_PAYMENT_LINK /buy uses; vercel.json), with /buy as
 * the "Or read the details first" link. "$17" must match PRICE_LABEL in offer.ts
 * (offer.ts reads import.meta.env, so the PDF builder can't import it).
 */
export const STARTER_HANDBOOK_ADDS = {
  heading: "What the full handbook adds",
  lead: [
    "This free pack is week one: one small job a day.",
    "The Deep Focus from Home handbook by Jeffsebiz is the full system behind it, with much more detail and the forms already set up for you, as phone and desktop PDFs.",
  ],
  bullets: [
    "All seven chapters in full, plus the introduction. Each goes deeper than its day here: lighting and posture, browser profiles, focus sprints, and what to do on a low-energy day.",
    "Daily Focus Operating System: one page for each workday, with morning setup, up to three deep-work blocks, a note to your accountability partner and a 5-minute shutdown.",
    "Energy & Focus Log: rate your energy and focus morning, afternoon and evening for three to five days, then name your peak window from real numbers, not memory.",
    "Weekly Deep Work Planner and Monthly Focus Review: plan next week’s blocks on Friday, and once a month keep one or two changes and drop the rest.",
    "Household Focus Agreement: core hours, the do-not-disturb signal and what counts as an emergency, plus a kid version to read out loud and put on the fridge.",
    "Home Focus Setup Worksheet: your workspace, household rules, phone and app rules, and your morning and shutdown routines, written down once.",
    "Meetings and messages: how to cluster meetings so mornings stay free, and how to check email and chat at two or three set times a day.",
  ],
  button: "Get the handbook, $17",
  payNote: "Pay once. No subscription.",
  bothOptions: "Or read the details first",
} as const;

/** One line at the end of Day 7 in the PDF, pointing at the page above. */
export const STARTER_PDF_DAY7_MORE = "Ready for more? See page 8.";

export const CHAPTERS = [
  {
    slug: "intro",
    number: "Introduction",
    title: "Why focus feels harder at home",
    kicker: "It is a systems problem",
    summary:
      "Remote work removed the office’s structure. Concentration did not fail you. The supports disappeared, and they have to be rebuilt on purpose.",
    body: [
      "Remote work promised freedom. For many people it delivered some of that. It also delivered days that dissolve into chores, phone checks, and low-grade guilt.",
      "Household tasks interrupt flow. Personal devices sit within arm’s reach. Nobody sees whether you are in deep work or scrolling. The home itself lacks the cues that once told the brain this is work time.",
      "An office, whatever its flaws, supplied structure, separation, and external pressure by default. At home those supports disappear. The individual has to rebuild them.",
      "You do not need every idea at once. Start with the chapter that names your biggest current friction. The goal is not perfection. It is reliable concentration that leaves you less drained.",
    ],
    action:
      "Write 1–3 outcomes for this workday and put one 60–90 minute block on the calendar before you do anything else.",
  },
  {
    slug: "environment",
    number: "Chapter 1",
    title: "Design your focus environment",
    kicker: "Claim one workspace",
    summary:
      "A dedicated surface is one of the most useful changes many remote workers can make. Mixed-use tables send mixed signals.",
    body: [
      "Choose one consistent location. A room with a door is ideal. If not, a corner that can stay set up.",
      "Equip it with essentials only: screen, keyboard, chair, light, water, notebook. Remove non-work objects.",
      "Prefer natural light. Desk perpendicular to a window. Control sound with headphones or a simple door signal.",
      "Clear the desk every evening so the morning starts clean. Store work materials in one place so setup is short.",
      "When you leave the space, treat it as closing the office. Do not linger there for leisure.",
    ],
    action:
      "Spend 30–45 minutes redesigning one workspace. Use it exclusively for the next five workdays and notice how quickly you settle.",
  },
  {
    slug: "household",
    number: "Chapter 2",
    title: "Set clear boundaries with home life",
    kicker: "Presence is not availability",
    summary:
      "Family, pets, deliveries, and unfinished chores are commonly cited focus killers. Boundaries have to be explicit and consistently signaled.",
    body: [
      "Share core work hours. Post them if it helps. Agree what is an emergency versus a question that can wait.",
      "For children, use a signal they can see: closed door, headphones, a red or green card.",
      "If you share space with another remote worker, coordinate quiet windows.",
      "Batch chores into break slots. Keep a home-task list separate from the work list.",
      "Some days will be more interrupted. Plan lighter goals those days rather than fighting reality.",
    ],
    action:
      "Hold a short conversation with anyone who shares your space. Agree on a signal and one rule about chores. Fill the Household Agreement.",
  },
  {
    slug: "digital",
    number: "Chapter 3",
    title: "Tame digital distractions",
    kicker: "First 90 minutes protected",
    summary:
      "Devices are engineered to capture attention. At home they are closer and less constrained. Treat them as a design problem.",
    body: [
      "During deep-work blocks, park the phone off the desk. Plan before the block and check messages after it — out of sight beats willpower.",
      "Turn off non-essential notifications. Keep only calls from favorites if you truly must.",
      "Schedule two short windows for personal messages instead of continuous availability.",
      "Close extra tabs. Check email on a timer, not as a default tab.",
      "The first 90 minutes of the workday are the most expensive to leak. Guard them first.",
    ],
    action:
      "For the next three workdays, park the phone during the first 90-minute block. Note the urge, then keep working. Check messages between blocks.",
  },
  {
    slug: "rituals",
    number: "Chapter 4",
    title: "Create structure and daily rituals",
    kicker: "A start and a stop",
    summary:
      "Without a commute, the day has no edges. A short morning sequence and a shutdown give the brain a beginning and an end.",
    body: [
      "Morning: clear the surface, write 1–3 outcomes, start the first block. Five to seven minutes is enough.",
      "Do not open chat or news before the first block ends.",
      "Shutdown: mark what finished, capture tomorrow, close the space. Five minutes.",
      "Run both for five consecutive workdays before you change them. Adjusting daily is another form of avoidance.",
    ],
    action:
      "Write the two sequences in Today’s Daily OS. Execute both for five workdays without skipping.",
  },
  {
    slug: "deep-work",
    number: "Chapter 5",
    title: "Protect deep work time",
    kicker: "Treat the block as immovable",
    summary:
      "Deep work is the work that actually moves a project. It needs a named block, not leftover minutes between meetings.",
    body: [
      "Block two 60–90 minute sessions. Put them on the calendar with start and end times.",
      "One outcome per block is better than a heroic list.",
      "At the end, write one sentence about what you completed.",
      "Meetings do not get to eat the first block unless you chose that on purpose.",
      "On a wrecked day, keep a 15–20 minute minimum. Do not treat a sick-child day as a failed streak.",
    ],
    action:
      "Block two sessions for the next five workdays. Treat them as immovable. Review the sentences on Friday.",
  },
  {
    slug: "people",
    number: "Chapter 6",
    title: "Build accountability and motivation",
    kicker: "One person who knows the plan",
    summary:
      "Home has no hallway. Body doubling, a short daily note, and one partner restore the social pressure the office used to supply.",
    body: [
      "Name one accountability partner. Send today’s 1–3 outcomes before you start.",
      "Schedule two body-doubling or virtual coworking sessions this week.",
      "Keep the message one sentence. Do not wait for a perfect system.",
      "Motivation follows completed blocks more reliably than it precedes them.",
    ],
    action:
      "Send the first daily priority note today. Book one coworking session before the week ends.",
  },
  {
    slug: "energy",
    number: "Chapter 7",
    title: "Manage energy, breaks, and sustainability",
    kicker: "On a hard day, shrink the plan",
    summary:
      "Focus follows energy. Log a few days, put the hardest work in the peak window, and take real breaks. This is how the system lasts.",
    body: [
      "Log energy and focus a few times a day for three days. Look for the two-hour peak.",
      "Put the week’s hardest thinking in that window. Admin can live in the trough.",
      "Take one genuine outdoor or movement break each afternoon.",
      "Sleep, food, and a hard stop matter more than another productivity trick.",
      "On a hard day: 15–20 minutes, one outcome, a person who knows the plan.",
    ],
    action:
      "Complete the energy log for three days. Place next week’s hardest block in the peak window you find.",
  },
] as const;

export const DAILY_CHECKS = [
  { id: "surface", label: "Work-only surface is clear" },
  { id: "phone", label: "Phone parked for the block (off desk / out of reach)" },
  { id: "signal", label: "Household signal is on" },
  { id: "block", label: "Deep-work block started" },
  { id: "shutdown", label: "Shutdown sequence done" },
] as const;

export type DailyCheckId = (typeof DAILY_CHECKS)[number]["id"];

/** Ticked per block, right above "Start · ring the bell". */
export const BLOCK_PREP_CHECKS = [
  { id: "surface", label: "Work-only surface is clear" },
  { id: "phone", label: "Phone parked for the block (off desk / out of reach)" },
  { id: "signal", label: "Household signal is on" },
] as const;

export type BlockPrepId = (typeof BLOCK_PREP_CHECKS)[number]["id"];

/**
 * End-of-day shutdown, from the handbook's "Daily Focus Checklist → END-OF-DAY
 * SHUTDOWN (5 minutes)" (same routine as Chapter 4.3, End-of-Day Shutdown
 * Ritual). The checklist's optional fifth item is left out.
 */
export const SHUTDOWN_STEPS = [
  { id: "outcomes", label: "Review and mark the day’s top outcomes" },
  { id: "loops", label: "Capture open loops for tomorrow" },
  { id: "apps", label: "Close work apps and browser profiles" },
  { id: "space", label: "Leave or cover the workspace" },
] as const;

export type ShutdownStepId = (typeof SHUTDOWN_STEPS)[number]["id"];

export const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Read why home is hard",
    copy: "The office used to supply structure. Home does not. This is a design problem, not a character test.",
  },
  {
    step: "2",
    title: "Do the 7-day starter",
    copy: "One job per day. Workspace, household signal, phone, rituals, blocks, people, energy. Do not add extra systems this week.",
  },
  {
    step: "3",
    title: "Run the Daily OS",
    copy: "Each workday: 1–3 outcomes, one protected block, five checks, a shutdown. That is the whole morning.",
  },
  {
    step: "4",
    title: "Use one tool when you need it",
    copy: "Setup sheet, household agreement, weekly planner, energy log, monthly review. Open the one that names your current friction.",
  },
] as const;

export const FAQ = [
  {
    q: "Do I have to follow every chapter?",
    a: "No. Start with the biggest friction. The starter week is the only sequence. After that, pick the chapter that names what is actually stealing the block.",
  },
  {
    q: "I have kids / a shared room. Will this still work?",
    a: "It’s built with that in mind. Chapter 2 and the Household Agreement cover shared homes. Perfect quiet is not required. You still pick a visible signal, an emergency rule, and a 15-minute minimum on hard days. Fill the Household Agreement in language a child can understand.",
  },
  {
    q: "What if I miss a day?",
    a: "Start the next workday. Do not restart the week as punishment. A sick-child day is not a failed streak. Shrink the plan to one outcome and a short block.",
  },
  {
    q: "Why park the phone during a block?",
    a: "Plan the day first. Then, for the deep-work block itself, park the phone off your desk — another room, or face-down and out of reach. Some research suggests a phone in view can pull at your attention, even on silent. Out of sight beats willpower. Need a timer? Use a kitchen timer or a clock, not the phone. Between blocks, pick two short windows to check messages.",
  },
  {
    q: "Do I need a spare room?",
    a: "No. You need one surface that is work-only for the week. A corner is enough if it stays set up and you leave it when you shut down.",
  },
  {
    q: "Where is my data saved?",
    a: "On this device only — there is no account. Use Tools → Export notes to keep a copy. Print the household agreement for the fridge. If you clear site data, the logs go with it unless you have that file.",
  },
  {
    q: "Will the bell ring if I lock my phone?",
    /** About the app's bell: only shown to app buyers. */
    appOnly: true,
    a: "The screen tries to stay awake during a block. If you lock the phone or leave the app, the bell rings when you open it again. It will not ding in another room. If you need the chime, leave only this screen on away from your desk — do not use the phone for anything else until the block ends.",
  },
  {
    q: "How is this different from a planner?",
    a: "A planner captures tasks. This system rebuilds the structure an office used to give you: a workspace, a household signal, a phone rule, a start, a stop, and one person who knows the plan.",
  },
  {
    q: "When do I add the weekly planner or monthly review?",
    a: "After a few days of the Daily OS. Do not flood week one. Day 5 is blocks. Day 7 is energy. The monthly review is for the end of the month — keep one or two changes, drop the rest.",
  },
] as const;
