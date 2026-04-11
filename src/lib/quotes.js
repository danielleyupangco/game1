export const quotes = [
  // Law of Attraction / The Secret / Wealth
  "Money flows to me freely, easily, and abundantly.",
  "I am a magnet for wealth, prosperity, and abundance.",
  "Everything I touch turns to gold. Success is my natural state.",
  "The universe is conspiring to bring me everything I desire.",
  "I attract opportunities that create unlimited abundance.",
  "I am worthy of wealth. I am open to receiving it now.",
  "Abundance is not something we acquire. It is something we tune into.",
  "Ask. Believe. Receive. The law does not fail.",
  "What you think about, you bring about. Think wealth.",
  "I radiate wealth, success, and prosperity in all areas of my life.",
  "My thoughts create my reality. Today I choose power.",
  "The secret is there are no limits. None. Zero.",
  "I am aligned with the energy of abundance and infinite possibility.",
  "Gratitude is the great multiplier — what I appreciate, appreciates.",
  "Wealth is my birthright. I claim it with clarity and confidence.",
  "Every dollar I spend comes back to me multiplied.",
  "I am the architect of my financial destiny.",
  "The more I give, the more I receive. Abundance flows through me.",
  "I am open, ready, and deserving of more than I can imagine.",
  "Thoughts become things. Choose great ones.",

  // Power of the Mind / Grit / Mental Fortitude
  "The mind is everything. What you think, you become.",
  "You don't rise to the level of your goals. You fall to the level of your systems.",
  "Grit is passion and perseverance for long-term goals. Nothing more.",
  "The harder the struggle, the more glorious the triumph.",
  "Your brain is a goal-seeking organism. Feed it the right target.",
  "Comfort is the enemy of growth. Choose discomfort on purpose.",
  "Mental toughness is doing what needs to be done, especially when you don't want to.",
  "The body will quit 100 times before the mind does. Train both.",
  "Suffer the pain of discipline or suffer the pain of regret.",
  "Champions are built in the moments they want to quit and don't.",
  "Every time you resist a distraction, you forge mental steel.",
  "Clarity is the antidote to anxiety. Know your why.",
  "Your mind is either your greatest asset or your greatest liability.",
  "Discipline is the bridge between your goals and your accomplishments.",
  "Willpower is a muscle — the more you train it, the stronger it gets.",
  "The cave you fear to enter holds the treasure you seek.",

  // Goal Setting / Vision / Protocol
  "A goal without a deadline is just a dream. Set the date.",
  "What gets measured gets managed. Track everything.",
  "Small daily improvements are the magic of extraordinary results.",
  "Your daily habits are votes for the person you are becoming.",
  "Win the morning, win the day. The protocol is the path.",
  "Goals are the fuel in the furnace of achievement.",
  "The most productive people work from systems, not willpower.",
  "Execution eats strategy for breakfast.",
  "Success is the product of daily habits — not once-in-a-lifetime transformations.",
  "Set the goal. Build the system. Trust the process.",
  "One percent better every day. That's 37x better by year's end.",
  "Vision without action is hallucination. Act now.",
  "Write the goal. Read it daily. Move toward it relentlessly.",
  "The quality of your life is the quality of your daily decisions.",
  "What you do every single day matters more than what you do once in a while.",
  "Design your environment so the default action is the right action.",

  // Wisdom / Philosophy / Identity
  "Be the person you needed when you were younger.",
  "You become what you repeatedly do. Identity first.",
  "Slow is smooth. Smooth is fast. Precision over speed.",
  "The obstacle is the way. Every resistance is a redirect.",
  "Do the hard thing first. The rest of the day is easy.",
  "Stillness is the source of all great action.",
  "Earn your rest. Rest earns your energy.",
  "Create before you consume. Every single morning.",
  "What is mine to do today? Not what's urgent for others — what's yours.",
  "You are not behind. You are exactly where your choices have taken you.",
  "Own your morning. Own your life.",
  "The present moment is where power lives. Be here.",
]

export function getDailyQuote() {
  const d = new Date()
  const doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000)
  return quotes[doy % quotes.length]
}
