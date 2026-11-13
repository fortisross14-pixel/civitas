// CIVITAS v1.6 — one number to beat: Prosperity-years.
// Every year the city earns (population ÷ 1,000) × (prosperity ÷ 56), where 56
// is the engine's neutral prosperity. A big, contented city scores fast; a big
// unhappy one slowly. Declines and unanswered history cost points on top.
export const NEUTRAL_PROSPERITY=56,DECLINE_YEARS_LOST=3,UNANSWERED_YEARS_LOST=4;

export function emptyScore(){return {total:0,earned:0,lost:0,last:0,penalties:[]};}
export function scoreOf(city){const s=city?.score;return s&&Number.isFinite(s.total)?s:emptyScore();}
export function yearlyPoints(s){return Math.max(0,(s.population||0)/1000*Math.max(0,s.prosperity||0)/NEUTRAL_PROSPERITY);}

// Add one year of points. Mutates `city` (a working copy in the year tick).
export function scoreYear(city,s){
  const prev=scoreOf(city),pts=yearlyPoints(s);
  city.score={...prev,earned:prev.earned+pts,total:prev.total+pts,last:pts,penalties:prev.penalties};
  return pts;
}
// Lose `years` of the current yearly rate, scaled by how much of the city was hit.
export function penalize(city,kind,years,weight,text,year){
  const prev=scoreOf(city),points=Math.round(prev.last*years*Math.max(.25,Math.min(1,weight))*10)/10;
  if(points<=0)return 0;
  city.score={...prev,total:Math.max(0,prev.total-points),lost:prev.lost+points,penalties:[...prev.penalties,{year,kind,points,text}].slice(-40)};
  return points;
}
export function normalizeScore(input){
  if(!input||!Number.isFinite(input.total))return emptyScore();
  const num=v=>Math.max(0,Number(v)||0);
  return {total:num(input.total),earned:num(input.earned),lost:num(input.lost),last:num(input.last),
    penalties:(Array.isArray(input.penalties)?input.penalties:[]).filter(p=>p&&Number.isFinite(p.points)).slice(-40)};
}
export const formatScore=n=>Math.round(n||0).toLocaleString('en-US');
