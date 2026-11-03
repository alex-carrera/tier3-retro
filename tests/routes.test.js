import test from 'node:test';import assert from 'node:assert/strict';
import{appRoot,retroURL,gameURL,boardRef,legacyRedirect}from'../src/common/routes.js';
import{loadProfile,storedRetros,rememberBoard,readGameSession,retroMember,GAME_SESSION,RETRO_SESSION}from'../src/common/profile.js';
const root='https://alex-carrera.github.io/tier3-retro/';
const board={id:'a8a56233-9a98-4123-bf5a-14d3015cae10',key:'a'.repeat(64),title:'Squad',createdAt:'2026-11-02T00:00:00Z'};
const store=()=>{const map=new Map();return{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
test('Las dos entradas generan enlaces canónicos y conservan la clave solo en el fragmento',()=>{
 for(const href of[root,root+'index.html',root+'juego/',root+'juego/index.html']){
  assert.equal(appRoot(href).href,root);assert.equal(gameURL(href,'ABCDE'),root+'juego/?sala=ABCDE');
  const url=new URL(retroURL(href,board));assert.equal(url.pathname,'/tier3-retro/');assert.equal(url.search,'');assert.deepEqual(boardRef(url.href),{id:board.id,key:board.key});
 }
 assert.equal(appRoot('http://localhost:3000/juego/').href,'http://localhost:3000/');
 assert.equal(boardRef(root+'#retro=invalid'),null);
});
test('La dirección anterior conserva los enlaces de tablero y envía las invitaciones al juego',()=>{
 const old='https://alex-carrera.github.io/juntos-retro/';
 assert.equal(legacyRedirect(old,root),root);
 assert.equal(legacyRedirect(old+'?sala=ABCDE',root),root+'juego/?sala=ABCDE');
 assert.equal(legacyRedirect(retroURL(old,board),root),retroURL(root,board));
 assert.equal(legacyRedirect(old+'?sala=ABCDE#retro='+board.id+'.'+board.key,root),root+'?sala=ABCDE#retro='+board.id+'.'+board.key);
});
test('Perfil e historial anteriores se conservan y las sesiones del juego y retro se separan',()=>{
 const local=store(),session=store();local.setItem('juntos-profile',JSON.stringify({name:'Ana',color:'#ed7757',accessory:'cap'}));
 assert.equal(loadProfile(local).name,'Ana');
 session.setItem('juntos-session',JSON.stringify({code:'ABCDE',token:'game-token'}));
 rememberBoard(board,'retro-token',local,session);
 assert.equal(retroMember(board.id,local,session),'retro-token');assert.equal(readGameSession(session).token,'game-token');
 assert.equal(session.getItem('juntos-session'),null);assert.ok(session.getItem(GAME_SESSION));assert.ok(session.getItem(RETRO_SESSION));
 assert.equal(storedRetros(local)[0].id,board.id);assert.equal(retroMember('other-board',local,session),undefined);
 session.removeItem(GAME_SESSION);assert.equal(readGameSession(session),null);assert.equal(retroMember(board.id,local,session),'retro-token');
});
