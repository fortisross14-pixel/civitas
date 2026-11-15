// What a new Age brings: its landmarks, and the cards that arrive and retire.
import {BASIC_BUILDINGS} from './construction.js';
import {ERA_CARDS} from './turningPoints.js';
export function ageChanges(age){
  const landmarks=BASIC_BUILDINGS.filter(b=>b.start===age.from).map(b=>b.name);
  const arrive=ERA_CARDS.filter(c=>c.minYear===age.from&&c.kind!=='figure'),retire=ERA_CARDS.filter(c=>c.maxYear===age.from-1&&c.kind!=='figure');
  return {landmarks,arrive,retire,works:arrive.filter(c=>c.urban)};
}
