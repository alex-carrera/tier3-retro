export function serverURL(configured=import.meta.env?.VITE_MULTIPLAYER_URL,href=location.href){
  const page=new URL(href);if(!configured&&page.hostname.endsWith('.github.io'))throw new Error('El servidor todavía no está configurado. Intenta de nuevo más tarde.');
  const url=new URL(configured||page.origin);url.protocol=['https:','wss:'].includes(url.protocol)?'wss:':'ws:';url.pathname='/ws';url.search='';url.hash='';return url.href;
}
