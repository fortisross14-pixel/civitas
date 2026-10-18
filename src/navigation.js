// Keep the originating game when moving through auxiliary screens.
export function auxiliaryOrigin(page,hasCity,origins={}){
 return hasCity&&(page==='game'||origins[page]==='game')?'game':'home';
}
export function auxiliaryDestination(origin,hasCity){return origin==='game'&&hasCity?'game':'home';}
