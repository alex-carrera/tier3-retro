import {PALETTE} from '../../shared/profile.js';
export const GAME_SESSION='tier3-game-session',RETRO_SESSION='tier3-retro-session';
export function loadProfile(storage=localStorage){let p={};try{p=JSON.parse(storage.getItem('tier3-profile')||storage.getItem('juntos-profile')||'{}');}catch{}return {name:String(p?.name||'').slice(0,16),color:PALETTE.includes(p?.color)?p.color:PALETTE[0],accessory:['ears','sprout','cap'].includes(p?.accessory)?p.accessory:'ears'};}
export function saveProfile(profile,storage=localStorage){try{storage.setItem('tier3-profile',JSON.stringify(profile));}catch{}}
export function storedRetros(storage=localStorage){try{return JSON.parse(storage.getItem('tier3-retro-history')||'[]').filter(b=>b.id&&b.key);}catch{return [];}}
export function rememberBoard(board,memberToken,storage=localStorage,sessions=sessionStorage){
  const ref={id:board.id,key:board.key,memberToken};
  try{const entries=storedRetros(storage).filter(b=>b.id!==board.id);entries.unshift({...ref,title:board.title,createdAt:board.createdAt});storage.setItem('tier3-retro-history',JSON.stringify(entries.slice(0,100)));}catch{}
  try{sessions.setItem(RETRO_SESSION,JSON.stringify(ref));}catch{}
}
export function readGameSession(storage=sessionStorage){try{const raw=storage.getItem(GAME_SESSION)||storage.getItem('juntos-session');if(!raw)return null;const value=JSON.parse(raw);if(!value?.code||!value?.token)return null;storage.setItem(GAME_SESSION,raw);storage.removeItem('juntos-session');return value;}catch{return null;}}
export function retroMember(id,storage=localStorage,sessions=sessionStorage){try{const current=JSON.parse(sessions.getItem(RETRO_SESSION)||'null');if(current?.id===id&&current.memberToken)return current.memberToken;}catch{}return storedRetros(storage).find(b=>b.id===id)?.memberToken;}

export function forgetBoard(id,storage=localStorage){storage.setItem('tier3-retro-history',JSON.stringify(storedRetros(storage).filter(board=>board.id!==id)));}
