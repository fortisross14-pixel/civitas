// CIVITAS v2.0 — run perks. Founding artifacts and Legacy Market upgrades that
// bend a rule (hand size, Decree slots, rerolls, prices, warnings) are stored on
// the city at founding, so a saved run keeps the perks it was founded with.
// No imports: every system may read perks without an import cycle.
const ADDITIVE=['handBonus','decreeBonus','freeRerolls','omenLeadBonus','draftBonus'];

// Additive perks also count Legacy Market ranks (city.legacyBonuses).
export function perk(city,key){
  const own=Number(city?.perks?.[key])||0;
  return ADDITIVE.includes(key)?own+(Number(city?.legacyBonuses?.[key])||0):own;
}
// Multiplicative perks default to 1.
export function perkMult(city,key){const v=Number(city?.perks?.[key]);return Number.isFinite(v)&&v>0?v:1;}
export function hardshipOf(city){return Math.max(0,Math.min(10,Math.floor(Number(city?.hardship)||0)));}
