export const PROTOCOL_ITEMS = [
  {
    key: 'noBreakfast',
    label: 'Morning: liquids only',
    sublabel: 'Tea, matcha, hot water + honey — no solid food',
    icon: '🍵',
  },
  {
    key: 'lunchLiquids',
    label: 'Lunch: liquids only',
    sublabel: 'Matcha, tea, hot water, or miso soup',
    icon: '🫖',
  },
  {
    key: 'fastUntil630',
    label: 'No meal until 6:30 PM',
    sublabel: 'Eating window opens at dinner',
    icon: '🕕',
  },
  {
    key: 'stepsGoalMet',
    label: 'Step goal achieved',
    sublabel: 'Log your steps below',
    icon: '👟',
  },
  {
    key: 'meditateDone',
    label: 'Meditation completed',
    sublabel: 'Go to the Meditate tab',
    icon: '🧘',
  },
  {
    key: 'plankDone',
    label: 'Plank hold completed',
    sublabel: 'Go to the Meditate tab',
    icon: '💪',
  },
  {
    key: 'journalDone',
    label: 'Journal entry written',
    sublabel: 'Go to the Journal tab',
    icon: '✍️',
  },
  {
    key: 'noScrolling',
    label: 'No mindless scrolling before bed',
    sublabel: 'Phone down by 10 PM',
    icon: '📵',
  },
]

export const CREATOR_ITEM = {
  key: 'creatorDone',
  label: 'Created something today',
  sublabel: 'Word written, plan made, message sent, idea developed',
  icon: '🎨',
}

export const MOODS = [
  { value: 'Calm', emoji: '😌' },
  { value: 'Energized', emoji: '⚡' },
  { value: 'Motivated', emoji: '🔥' },
  { value: 'Grateful', emoji: '🙏' },
  { value: 'Low', emoji: '😔' },
  { value: 'Anxious', emoji: '🌀' },
  { value: 'Frustrated', emoji: '😤' },
  { value: 'Numb', emoji: '😶' },
]

export const DEFAULT_DAY_RECORD = {
  protocol: {
    noBreakfast: false,
    lunchLiquids: false,
    fastUntil630: false,
    stepsGoalMet: false,
    meditateDone: false,
    plankDone: false,
    journalDone: false,
    noScrolling: false,
    creatorDone: false,
  },
  steps: { entered: 0, goal: 10000 },
  mood: [],
  gratitude: ['', '', ''],
  journal: '',
  meditation: { sessions: [] },
  plank: { sessions: [] },
  protocolComplete: false,
}

export const PROTOCOL_KEYS = [
  'noBreakfast',
  'lunchLiquids',
  'fastUntil630',
  'stepsGoalMet',
  'meditateDone',
  'plankDone',
  'journalDone',
  'noScrolling',
]

export function isProtocolComplete(protocol) {
  return PROTOCOL_KEYS.every(k => protocol[k] === true)
}
