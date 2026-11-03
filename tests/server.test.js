import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import WebSocket from 'ws';
const waitMessage=(ws,predicate,timeout=6000)=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{ws.off('message',handler);reject(new Error('Tiempo de espera agotado'));},timeout);
  function handler(raw){const m=JSON.parse(raw.toString());if(predicate(m)){clearTimeout(timer);ws.off('message',handler);resolve(m);}}
  ws.on('message',handler);
});
const open=async port=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`);await once(ws,'open');return ws;};
test('Sala real: siete personas, límite de cupos, inicio, pausa y reconexión',async t=>{
  const port=32000+Math.floor(Math.random()*10000),clients=[];
  const child=spawn(process.execPath,['server/index.js'],{env:{...process.env,PORT:String(port),NODE_ENV:'production',RETRO_STORE:'memory'},stdio:['ignore','pipe','pipe']});
  t.after(()=>{clients.forEach(ws=>ws.terminate());child.kill();});
  await new Promise((resolve,reject)=>{let error='';child.stderr.on('data',chunk=>error+=chunk);const timer=setTimeout(()=>reject(new Error('El servidor no arrancó: '+error)),7000);child.stdout.on('data',()=>{clearTimeout(timer);resolve();});child.on('error',reject);child.on('exit',code=>{clearTimeout(timer);reject(new Error('El servidor terminó: '+code+' '+error));});});
  const host=await open(port);clients.push(host);
  let joined=waitMessage(host,m=>m.type==='joined');host.send(JSON.stringify({type:'create',name:'Ana',color:'#ed7757'}));
  const hostSession=await joined;const code=hostSession.code;assert.match(code,/^[A-Z0-9]{5}$/);
  const sessions=[];
  for(let i=0;i<6;i++){const ws=await open(port);clients.push(ws);const ack=waitMessage(ws,m=>m.type==='joined');ws.send(JSON.stringify({type:'join',code,name:'Persona '+i,color:'#ed7757'}));sessions.push(await ack);}
  const extra=await open(port);clients.push(extra);const full=waitMessage(extra,m=>m.type==='error');extra.send(JSON.stringify({type:'join',code,name:'Octava'}));assert.match((await full).message,/completa/);
  const readyState=waitMessage(host,m=>m.type==='state'&&m.room.players.every(p=>p.ready));for(const ws of clients.slice(0,7))ws.send(JSON.stringify({type:'ready',ready:true}));const ready=await readyState;assert.equal(ready.room.players.length,7);assert.equal(new Set(ready.room.players.map(p=>p.color)).size,7);
  const playing=waitMessage(host,m=>m.type==='state'&&m.room.status==='playing');host.send(JSON.stringify({type:'start'}));assert.equal((await playing).room.level,0);
  const paused=waitMessage(host,m=>m.type==='state'&&m.room.players.some(p=>!p.connected));clients[1].close();await paused;
  const resumed=await open(port);clients.push(resumed);const ack=waitMessage(resumed,m=>m.type==='joined');resumed.send(JSON.stringify({type:'resume',code,token:sessions[0].token}));assert.equal((await ack).id,sessions[0].id);
  const active=await waitMessage(host,m=>m.type==='state'&&m.room.players.every(p=>p.connected));assert.equal(active.room.players.length,7);
  const late=await open(port);clients.push(late);const denied=waitMessage(late,m=>m.type==='error');late.send(JSON.stringify({type:'join',code,name:'Tarde'}));assert.match((await denied).message,/empezó/);
  const board=waitMessage(host,m=>m.type==='state'&&m.room.status==='retro');host.send(JSON.stringify({type:'open-retro'}));const shared=(await board).room;assert.ok(shared.retro.id);assert.equal(shared.retro.phase,'write');
  const timerState=waitMessage(clients[2],m=>m.type==='state'&&m.room.retro?.round?.mode==='running');host.send(JSON.stringify({type:'retro-timer',command:'start'}));const timed=await timerState;assert.ok(timed.room.retro.round.endsAt>Date.now());assert.ok(timed.serverNow);
  const guest=clients[2],added=waitMessage(host,m=>m.type==='state'&&m.room.retro?.cards.length===1);guest.send(JSON.stringify({type:'retro-add',column:'good',text:'Nos ayudamos para cruzar.'}));const written=(await added).room;assert.equal(written.retro.cards[0].text,'Nos ayudamos para cruzar.');
  const voting=waitMessage(guest,m=>m.type==='state'&&m.room.retro?.phase==='vote');host.send(JSON.stringify({type:'retro-phase',phase:'vote'}));await voting;
  const voted=waitMessage(host,m=>m.type==='state'&&m.room.retro?.cards[0]?.voters.length===1);guest.send(JSON.stringify({type:'retro-vote',id:written.retro.cards[0].id}));await voted;
  await waitMessage(host,m=>m.type==='state'&&m.room.retro?.saveStatus==='saved');
  const visitor=await open(port);clients.push(visitor);const reopened=waitMessage(visitor,m=>m.type==='state'&&m.room.status==='retro');visitor.send(JSON.stringify({type:'open-archive',id:shared.retro.id,key:shared.retro.key,name:'Visitante'}));assert.equal((await reopened).room.retro.cards.length,1);
  const intruder=await open(port);clients.push(intruder);const blocked=waitMessage(intruder,m=>m.type==='error');intruder.send(JSON.stringify({type:'open-archive',id:shared.retro.id,key:'0'.repeat(64),name:'Sin acceso'}));assert.match((await blocked).message,/acceso/);
});

async function isolatedServer(t){
 const port=32000+Math.floor(Math.random()*10000),clients=[];
 const child=spawn(process.execPath,['server/index.js'],{env:{...process.env,PORT:String(port),NODE_ENV:'production',RETRO_STORE:'memory'},stdio:['ignore','pipe','pipe']});
 t.after(()=>{clients.forEach(ws=>ws.terminate());child.kill();});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No arrancó el servidor')),7000);child.stdout.once('data',()=>{clearTimeout(timer);resolve();});child.once('error',reject);});
 return {async connect(){const ws=await open(port);clients.push(ws);return ws;}};
}

test('Crear una retro abre directamente el tablero y admite treinta participantes sin lobby ni juego',async t=>{
 const server=await isolatedServer(t),host=await server.connect();
 const joined=waitMessage(host,m=>m.type==='joined'),initial=waitMessage(host,m=>m.type==='state'&&m.room.status==='retro');
 host.send(JSON.stringify({type:'create-retro',name:'Facilitadora',title:'Retro independiente'}));
 const membership=await joined,{room}=await initial;
 assert.equal(room.players.length,1);assert.equal(room.selfId,room.hostId);assert.equal(room.retro.title,'Retro independiente');assert.match(membership.code,/^R-/);assert.equal(room.retro.phase,'write');
 for(let i=1;i<30;i++){const guest=await server.connect(),ack=waitMessage(guest,m=>m.type==='joined');guest.send(JSON.stringify({type:'open-archive',id:room.retro.id,key:room.retro.key,name:'Persona '+i}));await ack;}
 const extra=await server.connect(),denied=waitMessage(extra,m=>m.type==='error');extra.send(JSON.stringify({type:'open-archive',id:room.retro.id,key:room.retro.key,name:'Persona 31'}));assert.match((await denied).message,/treinta/);
 const timer=waitMessage(host,m=>m.type==='state'&&m.room.retro.round.mode==='running');host.send(JSON.stringify({type:'retro-timer',command:'start'}));assert.equal((await timer).room.players.length,30);
});

test('Navegar del juego a la retro conserva identidades y facilitador aunque otro miembro llegue primero',async t=>{
 const server=await isolatedServer(t),host=await server.connect(),guest=await server.connect();
 const hostAck=waitMessage(host,m=>m.type==='joined');host.send(JSON.stringify({type:'create',name:'Host'}));const h=await hostAck;
 const guestAck=waitMessage(guest,m=>m.type==='joined');guest.send(JSON.stringify({type:'join',code:h.code,name:'Guest'}));const g=await guestAck;
 const board=waitMessage(guest,m=>m.type==='state'&&m.room.status==='retro');host.send(JSON.stringify({type:'open-retro'}));const r=(await board).room;
 const disconnected=waitMessage(guest,m=>m.type==='state'&&m.room.players.some(p=>p.id===h.id&&!p.connected));host.close();await disconnected;
 const nextGuest=await server.connect(),guestBoard=waitMessage(nextGuest,m=>m.type==='state'&&m.room.status==='retro');nextGuest.send(JSON.stringify({type:'open-archive',id:r.retro.id,key:r.retro.key,memberToken:g.token,name:'Guest'}));const gr=(await guestBoard).room;
 assert.equal(gr.hostId,h.id);assert.equal(gr.selfId,g.id);assert.equal(gr.players.length,2);
 const nextHost=await server.connect(),hostBoard=waitMessage(nextHost,m=>m.type==='state'&&m.room.status==='retro');nextHost.send(JSON.stringify({type:'open-archive',id:r.retro.id,key:r.retro.key,memberToken:h.token,name:'Host'}));const hr=(await hostBoard).room;
 assert.equal(hr.hostId,h.id);assert.equal(hr.selfId,h.id);assert.equal(hr.players.length,2);
});
