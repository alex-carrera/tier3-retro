import '../style.css';
import {PALETTE} from '../../shared/profile.js';
import {openRetro,applyRetroAction} from '../../shared/retro.js';
import {mountRetro} from '../retro-board.js';
import {appRoot,retroURL,gameURL,boardRef} from '../common/routes.js';
import {loadProfile,saveProfile,storedRetros,rememberBoard,forgetBoard,retroMember,RETRO_SESSION} from '../common/profile.js';
import {serverURL} from '../common/transport.js';

const app=document.querySelector('#app'),$=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let profile=loadProfile(),archiveRef=boardRef(location.href),state=null,ws=null,boardUI=null,memberToken=null;
let pendingAction=null,retry=0,reconnectTimer=null,connectionTimer=null,leaving=false,offset=0,demo=false;
function notify(message){$('.toast')?.remove();const node=document.createElement('div');node.className='toast';node.role='status';node.textContent=message;document.body.append(node);setTimeout(()=>node.remove(),6500);}
function shell(content){app.innerHTML=`<div class="wrap retro-app"><header class="header"><a class="brand" href="${appRoot(location.href).href}" aria-label="Tier 3 Retro, inicio"><span class="brand-icon"><i></i><i></i></span><span class="brand-name">tier <b>3</b> retro<small>UN ESPACIO PARA MEJORAR JUNTOS</small></span></a><a class="secondary optional-game" href="${gameURL(location.href)}">Juego cooperativo ↗</a></header>${content}<footer class="footer"><span>Un espacio para escuchar, aprender y actuar.</span><span>Sin cuentas · Tableros con enlace privado</span></footer></div>`;$('.brand').onclick=e=>{if(state){e.preventDefault();confirmLeave();}};}
function landing(){
  boardUI?.destroy();boardUI=null;state=null;demo=false;
  shell(`<main class="retro-landing"><section class="retro-welcome"><div class="eyebrow">TIER 3 RETRO · EL EQUIPO TIENE LA PALABRA</div><h1>Una pausa para<br><em>mejorar juntos.</em></h1><p>Lo que funcionó, lo que podemos mejorar y lo que haremos después. Un tablero compartido para convertir la conversación en próximos pasos.</p><div class="retro-benefits"><span>☀ Escribir con calma</span><span>◷ Cinco minutos por punto</span><span>♫ Música para concentrarse</span><span>↗ Acuerdos con responsable</span></div><div class="retro-preview" aria-hidden="true"><div><b>☀ Lo que funcionó</b><p>Nos ayudamos cuando alguien se quedó atrás.</p></div><div><b>↗ Podemos mejorar</b><p>Hacer espacio para todas las voces.</p></div><div><b>✳ Próximos pasos</b><p>Una mejora concreta para el siguiente ciclo.</p></div></div><p class="retro-independent">Puedes usar esta retro por sí sola. Si quieren empezar con una aventura, el <a href="${gameURL(location.href)}">juego cooperativo</a> es opcional.</p></section><section class="entry-card retro-entry"><div class="step-kicker">${archiveRef?'TU SQUAD TE ESPERA':'TU PRÓXIMA CONVERSACIÓN'}</div><h2>${archiveRef?'Entra a la retrospectiva.':'Preparen su espacio.'}</h2><p class="sub">${archiveRef?'Entrarás al tablero del enlace compartido.':'Crea un tablero y comparte su enlace con el equipo.'}</p><form id="retro-entry-form"><label class="field-label" for="retro-name">¿Cómo te llamas?</label><input id="retro-name" maxlength="16" autocomplete="nickname" placeholder="Tu nombre" value="${esc(profile.name)}" required/>${archiveRef?'':'<label class="field-label" for="retro-board-name">Nombre de la retro</label><input id="retro-board-name" maxlength="80" value="Retro Squad · Soporte Tier 3" required/>'}<button class="primary wide" id="open-retro" type="submit">${archiveRef?'Entrar a la retro →':'Crear una retro →'}</button></form><p class="retro-entry-note">${archiveRef?'El enlace privado permite participar en este tablero.':'Hasta 30 participantes. Notas e historial guardados.'}</p>${archiveRef?'':`<form class="retro-invitation" id="retro-invite-form"><label class="field-label" for="retro-invite">¿Ya tienes una invitación?</label><input id="retro-invite" type="text" placeholder="Pega el enlace privado de la retro" required/><button class="secondary wide" type="submit">Abrir invitación ↗</button></form>`}<button class="preview-link" id="retro-history">Mis retrospectivas guardadas ↗</button><button class="preview-link" id="retro-demo">Ver una demo del tablero ↗</button></section></main>`);
  $('#retro-entry-form').onsubmit=e=>{e.preventDefault();profile.name=$('#retro-name').value.trim();if(!profile.name)return $('#retro-name').focus();saveProfile(profile);pendingAction=archiveRef?archiveAction():{type:'create-retro',...profile,title:$('#retro-board-name').value.trim()};connect();};
  $('#retro-name').oninput=e=>{profile.name=e.target.value;saveProfile(profile);};
  $('#retro-invite-form')?.addEventListener('submit',e=>{e.preventDefault();const ref=boardRef($('#retro-invite').value.trim());if(!ref)return notify('Pega el enlace completo de una retrospectiva.');openBoard(ref);});
  $('#retro-history').onclick=showHistory;$('#retro-demo').onclick=startDemo;
}
function busy(value){const button=$('#open-retro');if(button){button.disabled=value;button.textContent=value?'Conectando con el equipo…':archiveRef?'Entrar a la retro →':'Crear una retro →';}}
function send(message){if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(message));}
function archiveAction(){return {type:'open-archive',...archiveRef,memberToken:memberToken||retroMember(archiveRef.id),...profile};}
function disconnect(){leaving=true;clearTimeout(reconnectTimer);clearTimeout(connectionTimer);if(ws){ws.onclose=null;ws.close();ws=null;}}
function connect(){
  disconnect();leaving=false;busy(true);
  try{ws=new WebSocket(serverURL());}catch(e){busy(false);notify(e.message);return;}
  connectionTimer=setTimeout(()=>{if(ws?.readyState===WebSocket.CONNECTING){ws.close();busy(false);notify('El servidor está despertando. Intenta de nuevo en un momento.');}},90000);
  ws.onopen=()=>{clearTimeout(connectionTimer);retry=0;send(pendingAction||archiveAction());pendingAction=null;boardUI?.setConnected(true);};
  ws.onmessage=e=>{
    let message;try{message=JSON.parse(e.data);}catch{return;}
    if(message.type==='joined'){memberToken=message.token;busy(false);}
    if(message.type==='state'){
      if(message.room.status!=='retro')return;
      if(Number.isFinite(message.serverNow))offset=message.serverNow-Date.now();
      const previous=state?.retro?.id;state=message.room;archiveRef={id:state.retro.id,key:state.retro.key};
      rememberBoard(state.retro,memberToken);history.replaceState(null,'',retroURL(location.href,state.retro));
      if(previous!==state.retro.id||!boardUI)renderBoard();boardUI.setConnected(true);boardUI.update();
    }
    if(message.type==='error'){busy(false);boardUI?.onError();notify(message.message);}
    if(message.type==='left')goHome();
  };
  ws.onclose=e=>{clearTimeout(connectionTimer);boardUI?.setConnected(false);if(leaving)return;if(e.code===4001){goHome();notify('Este tablero se abrió en otra pestaña.');return;}if(archiveRef&&state){reconnectTimer=setTimeout(connect,Math.min(10000,1000*2**retry++));notify('Reconectando con tu equipo…');}else{busy(false);notify('No pudimos conectar. Intenta de nuevo.');}};
  ws.onerror=()=>{};
}
function renderBoard(){
  boardUI?.destroy();shell('<main id="retro-page"></main>');
  boardUI=mountRetro($('#retro-page'),{getState:()=>state,getNow:()=>Date.now()+(demo?0:offset),dispatch(message){if(demo){try{applyRetroAction(state,state.players[0],message);boardUI.update();}catch(e){boardUI.onError();notify(e.message);}}else send(message);},notify,share:async()=>{if(demo)return notify('La demo es local. Crea una retro para compartirla.');try{await navigator.clipboard.writeText(retroURL(location.href,state.retro));notify('Enlace privado copiado.');}catch{notify('Puedes copiar el enlace desde la barra del navegador.');}},leave:confirmLeave,showHistory});
}
function openBoard(ref){disconnect();boardUI?.destroy();boardUI=null;state=null;archiveRef=ref;memberToken=null;history.replaceState(null,'',retroURL(location.href,ref));landing();if(profile.name||retroMember(ref.id)){pendingAction=archiveAction();connect();}}
function showHistory(){
  const entries=storedRetros(),layer=document.createElement('div');layer.className='modal-layer';
  layer.innerHTML=`<div class="modal retro-history" role="dialog" aria-modal="true" aria-label="Tus retrospectivas"><h2>Tus retrospectivas</h2><p>Enlaces guardados en este navegador. Los tableros se conservan en la nube. Quitar un enlace de esta lista no borra su tablero; guarda el enlace privado si quieres volver a abrirlo.</p><div class="history-list">${entries.map((b,i)=>`<div class="history-row"><button class="history-entry" data-board="${i}"><strong>${esc(b.title||'Retro Squad')}</strong><span>${esc(new Date(b.createdAt).toLocaleDateString('es',{timeZone:'America/Guayaquil'}))} · Abrir →</span></button><button class="ghost" data-forget="${i}" aria-label="Quitar enlace local de ${esc(b.title||'Retro Squad')}">Quitar de esta lista</button></div>`).join('')||'<p>Aún no hay tableros guardados.</p>'}</div><button class="secondary" id="close-history">Cerrar</button></div>`;
  document.body.append(layer);$('#close-history').onclick=()=>layer.remove();layer.querySelectorAll('[data-board]').forEach(button=>button.onclick=()=>{layer.remove();openBoard(entries[Number(button.dataset.board)]);});layer.querySelectorAll('[data-forget]').forEach(button=>button.onclick=()=>{try{forgetBoard(entries[Number(button.dataset.forget)].id);button.closest('.history-row').remove();}catch{notify('No pudimos actualizar la lista de este navegador.');}});
}
function confirmLeave(){
  const layer=document.createElement('div');layer.className='modal-layer';layer.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-label="Salir de la retro"><h2>¿Salimos de la retro?</h2><p>${demo?'Esta demo contiene notas locales.':'El tablero seguirá disponible con su enlace privado. Si aún se está guardando, espera a ver «Historial guardado».'}</p><div class="modal-actions"><button class="secondary" id="stay-retro">Quedarme</button><button class="primary" id="leave-retro">Salir</button></div></div>`;document.body.append(layer);$('#stay-retro').onclick=()=>layer.remove();$('#leave-retro').onclick=()=>{layer.remove();if(demo)goHome();else {leaving=true;send({type:'leave'});}};
}
function goHome(){disconnect();boardUI?.destroy();boardUI=null;archiveRef=null;memberToken=null;sessionStorage.removeItem(RETRO_SESSION);history.replaceState(null,'',appRoot(location.href));landing();}
function startDemo(){
  disconnect();demo=true;memberToken=null;archiveRef=null;history.replaceState(null,'',appRoot(location.href));
  state={selfId:'you',hostId:'you',players:[{id:'you',name:profile.name||'Tú',color:profile.color,connected:true,input:{}},...['Luna','Nico'].map((name,i)=>({id:'demo'+i,name,color:PALETTE[i+1],connected:true,input:{}}))]};
  openRetro(state,{id:crypto.randomUUID(),key:'demo',persistence:'demo'});renderBoard();
}
const query=new URLSearchParams(location.search);
if(query.has('sala')&&!archiveRef)location.replace(gameURL(location.href,query.get('sala')));
else {landing();if(query.get('demo')==='retro')startDemo();else if(archiveRef&&(profile.name||retroMember(archiveRef.id))){pendingAction=archiveAction();connect();}else if(query.has('historial'))showHistory();}
