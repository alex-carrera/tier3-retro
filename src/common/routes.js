export function appRoot(href){
  const url=new URL(href);
  url.pathname=url.pathname.replace(/\/juego(?:\/index\.html)?\/?$/,'/').replace(/\/index\.html$/,'/');
  if(!url.pathname.endsWith('/'))url.pathname+='/';
  url.search='';url.hash='';return url;
}
export function retroURL(href,board){const url=appRoot(href);if(board)url.hash='retro='+board.id+'.'+board.key;return url.href;}
export function gameURL(href,code){const url=new URL('juego/',appRoot(href));if(code)url.searchParams.set('sala',code);return url.href;}
export function boardRef(href){
  try{const raw=new URLSearchParams(new URL(href).hash.slice(1)).get('retro')||'';const match=raw.match(/^([a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})\.([a-f\d]{64})$/i);return match?{id:match[1],key:match[2]}:null;}catch{return null;}
}
export function legacyRedirect(href,targetRoot){
  const source=new URL(href),target=new URL(targetRoot);
  if(!new URLSearchParams(source.hash.slice(1)).has('retro')&&source.searchParams.has('sala'))target.pathname=target.pathname.replace(/\/?$/,'/')+'juego/';
  target.search=source.search;target.hash=source.hash;return target.href;
}
