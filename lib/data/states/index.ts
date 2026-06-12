import type { CreditCardBonus } from "../creditCardBonuses"

/**
 * Aggregation layer for state-specific regional card modules.
 *
 * Every per-state module (built with ./_builder.ts) is imported here and
 * concatenated into `regionalStateCards`, which ../creditCardBonuses.ts spreads
 * into the main catalog. Adding a state = one import + one spread below.
 *
 * Hawaii lives in its own module (../hawaiiCreditCardBonuses.ts) and is spread
 * separately in creditCardBonuses.ts, so it is intentionally NOT re-exported
 * here — its data and behavior are preserved untouched.
 *
 * A handful of regional issuers (BECU, Ent, VyStar, First Community CU,
 * CommunityAmerica) predate this layer and live inline in creditCardBonuses.ts;
 * state modules here deliberately cover *other* institutions to avoid duplicate
 * IDs. The uniqueness invariant is enforced by cardAvailability.test.ts.
 */

// ── West ──────────────────────────────────────────────────────────────
import { californiaCards } from "./california"
import { oregonCards } from "./oregon"
import { washingtonCards } from "./washington"
import { alaskaCards } from "./alaska"
import { nevadaCards } from "./nevada"
import { arizonaCards } from "./arizona"

// ── Mountain / Southwest ──────────────────────────────────────────────
import { coloradoCards } from "./colorado"
import { utahCards } from "./utah"
import { idahoCards } from "./idaho"
import { montanaCards } from "./montana"
import { wyomingCards } from "./wyoming"
import { newMexicoCards } from "./new-mexico"
import { texasCards } from "./texas"
import { oklahomaCards } from "./oklahoma"

// ── Midwest ───────────────────────────────────────────────────────────
import { ohioCards } from "./ohio"
import { michiganCards } from "./michigan"
import { indianaCards } from "./indiana"
import { illinoisCards } from "./illinois"
import { wisconsinCards } from "./wisconsin"
import { minnesotaCards } from "./minnesota"
import { iowaCards } from "./iowa"
import { missouriCards } from "./missouri"
import { northDakotaCards } from "./north-dakota"
import { southDakotaCards } from "./south-dakota"
import { nebraskaCards } from "./nebraska"
import { kansasCards } from "./kansas"

// ── South / Gulf ──────────────────────────────────────────────────────
import { kentuckyCards } from "./kentucky"
import { tennesseeCards } from "./tennessee"
import { alabamaCards } from "./alabama"
import { mississippiCards } from "./mississippi"
import { louisianaCards } from "./louisiana"

// ── Mid-Atlantic ──────────────────────────────────────────────────────

// ── New England ───────────────────────────────────────────────────────

/** All verified state-restricted regional cards, aggregated across modules. */
export const regionalStateCards: CreditCardBonus[] = [
  // West
  ...californiaCards,
  ...oregonCards,
  ...washingtonCards,
  ...alaskaCards,
  ...nevadaCards,
  ...arizonaCards,
  // Mountain / Southwest
  ...coloradoCards,
  ...utahCards,
  ...idahoCards,
  ...montanaCards,
  ...wyomingCards,
  ...newMexicoCards,
  ...texasCards,
  ...oklahomaCards,
  // Midwest
  ...ohioCards,
  ...michiganCards,
  ...indianaCards,
  ...illinoisCards,
  ...wisconsinCards,
  ...minnesotaCards,
  ...iowaCards,
  ...missouriCards,
  ...northDakotaCards,
  ...southDakotaCards,
  ...nebraskaCards,
  ...kansasCards,
  // South / Gulf
  ...kentuckyCards,
  ...tennesseeCards,
  ...alabamaCards,
  ...mississippiCards,
  ...louisianaCards,
]
