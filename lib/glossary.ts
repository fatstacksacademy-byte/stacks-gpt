// Central, beginner-friendly definitions for the jargon Stacks OS exposes.
// Keep each entry to 1–2 plain-English sentences. Surfaced via <InfoTip term="…" />
// so the wording stays consistent everywhere a term appears.

export const GLOSSARY = {
  directDeposit:
    "Direct deposit — money sent automatically into your account, like your paycheck from an employer or a government/benefits payment. Most bank bonuses require one to qualify.",
  ddSlots:
    "How many separate paychecks you can split across accounts. Most people have 1 — some employers let you route direct deposit to 2–3 accounts at once, which lets Stacks run more bonuses in parallel.",
  churn:
    "Closing an account after you collect the bonus and reopening it later to earn the same bonus again, once the bank's waiting period passes.",
  churnable:
    "This bonus can be earned again later. After you close the account and the bank's cooldown passes, you can reopen and collect it once more.",
  cooldown:
    "The waiting period a bank makes you sit out before you can earn the same bonus again.",
  velocity:
    "Roughly how much this bonus earns per week for your paycheck size. Higher means a faster payoff, so it's usually worth doing sooner.",
  tier:
    "Banks often pay more for a bigger deposit. Each tier shows the bonus you'd get for that deposit amount — pick the one you can comfortably hit.",
  sequencer:
    "Stacks' planner that ranks and schedules bonuses in the best order for your paycheck, so you earn the most over time. (A Pro feature.)",
  payProfile:
    "Your pay frequency and paycheck amount. Stacks uses these to estimate how fast you'll meet each bonus's deposit requirement. Update them if your income changes.",
  fiveTwentyFour:
    "Chase's 5/24 rule: Chase usually denies you if you've opened 5 or more personal credit cards (from any bank) in the last 24 months. Business cards usually don't count.",
  blendedReturn:
    "Your total first-year rewards (sign-up bonus + everyday earnings) divided by what you spend — shown as a % and a multiplier (e.g. 1.9× = about $1.90 back per $1 spent).",
  introApr:
    "A 0% intro APR card lets you carry a balance with no interest for a set number of months. Some people park cash in savings, pay only the minimum, then pay it off before the 0% period ends — keeping the interest.",
  prequalified:
    "A soft check that estimates whether a lender might approve you. It's not a guarantee — the real application uses a hard credit pull and the terms can change.",
  openingDeposit:
    "The amount you must put in to open the account on day one. This is separate from any ongoing balance or direct-deposit requirement.",
  minBalance:
    "The average daily balance you must keep in the account. The bonus is based on what you maintain over time, not just what you deposit once.",
  qualifyingTransactions:
    "A set number of debit-card purchases the bank requires. Usually any purchase counts — even a $1 one.",
  holdPeriod:
    "How long you must keep the account open after the bonus posts. Closing early can trigger a fee or make the bank take the bonus back.",
  combo:
    "Some banks let you open two linked bonuses on one application (e.g. checking + savings). A combo opens both at once for a bigger total.",
  stackPotential:
    "An estimate of how much you could earn across every bonus type over time, based on your paycheck and spending.",
  bonusPosted:
    "The day the bonus money actually lands in your account. This is what you're working toward — once it posts, you can safely close the account after any hold period.",
  // Debt strategies
  avalanche:
    "Pay extra toward your highest-interest debt first. Costs the least in interest over time.",
  snowball:
    "Pay off your smallest balance first for a quick win, then roll that payment into the next. Best for motivation.",
  balanceTransfer:
    "Moving debt onto a 0% intro-APR card so it stops accruing interest for a while — giving you a window to pay down the principal.",
} as const

export type GlossaryKey = keyof typeof GLOSSARY
