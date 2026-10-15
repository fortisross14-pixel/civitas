// IndexedDB stores many historical city records without localStorage's small quota.
// No external library, server account, or network connection is required.
const DB_NAME='civitas-chronicle-v3';
const STORE='atlas';
const KEY='cities';

function openDatabase(){
  return new Promise((resolve,reject)=>{
    if(typeof indexedDB==='undefined')return reject(new Error('IndexedDB unavailable'));
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);};
    request.onerror=()=>reject(request.error||new Error('Cannot open city library'));
    request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();resolve(db);};
    request.onblocked=()=>reject(new Error('City library blocked by another tab'));
  });
}
export async function readAtlas(){
  const db=await openDatabase();
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get(KEY);
    req.onsuccess=()=>resolve(req.result===undefined?null:req.result);
    req.onerror=()=>reject(req.error||new Error('Cannot read saved cities'));
    tx.onerror=()=>reject(tx.error||new Error('Cannot read city library'));
  });}finally{db.close();}
}
export async function writeAtlas(cities){
  const db=await openDatabase();
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(cities,KEY);
    tx.oncomplete=()=>resolve(true);
    tx.onerror=()=>reject(tx.error||new Error('Cannot save city library'));
    tx.onabort=()=>reject(tx.error||new Error('City save was interrupted'));
  });}finally{db.close();}
}

// Permanent progression is independent from city-specific saves; both use the same
// IndexedDB library and can survive reloading a static GitHub Pages application.
export async function readLegacy(){
  const db=await openDatabase();
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get('legacy');
    req.onsuccess=()=>resolve(req.result??null);
    req.onerror=()=>reject(req.error||new Error('Cannot load legacy'));
    tx.onerror=()=>reject(tx.error||new Error('Cannot read legacy'));
  });}finally{db.close();}
}
export async function writeLegacy(legacy){
  const db=await openDatabase();
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(legacy,'legacy');
    tx.oncomplete=()=>resolve(true);
    tx.onerror=()=>reject(tx.error||new Error('Cannot save legacy'));
    tx.onabort=()=>reject(tx.error||new Error('Legacy transaction aborted'));
  });}finally{db.close();}
}
