// CIVITAS v1.8 — pacing. The clock ticks once per in-game month. Normal speed
// is one year every 1.5 s, so 1300–2030 takes about 18 minutes. Quiet decades
// (nothing waiting for you) pass 1.5× faster; while you are deciding (Market
// Hall open, history waiting in the Needs panel) time slows to a quarter
// instead of stopping.
import {omensOf} from './events.js';
import {needsOf} from './needs.js';

// [months per second, label]
export const SPEEDS=[[4,'½×'],[8,'1×'],[16,'2×'],[36,'MAX']];
export const NORMAL_SPEED=8,MAX_SPEED=36,QUIET_FACTOR=1.5,DECIDING_FACTOR=.25;

export function isQuiet(city){
  return !omensOf(city).some(o=>!Number.isInteger(o.choice))&&!needsOf(city).some(n=>!n.served&&n.progress>=.5);
}
// Multiplier on the chosen speed. MAX is never altered.
export function paceFactor(city,rate,deciding=false){
  if(rate>=MAX_SPEED)return 1;
  if(deciding)return DECIDING_FACTOR;
  return isQuiet(city)?QUIET_FACTOR:1;
}
// Real minutes for a whole run at `rate`, if `quietShare` of the years are quiet.
export function runMinutes(rate,quietShare=0,years=730){
  const months=years*12;return (months*(1-quietShare)/rate+months*quietShare/(rate*QUIET_FACTOR))/60;
}
export function paceLabel(city,rate,deciding){
  const f=paceFactor(city,rate,deciding);
  return f<1?'Time slowed while you decide':f>1?'Quiet years pass faster':'';
}
