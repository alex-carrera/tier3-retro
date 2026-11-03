import {writeFile,mkdir} from 'node:fs/promises';
import {legacyRedirect} from '../src/common/routes.js';
const root='https://alex-carrera.github.io/tier3-retro/';
const html=`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Tier 3 Retro · Nueva dirección</title><meta name="referrer" content="no-referrer"><link rel="canonical" href="${root}"><body><h1>Ahora estamos en Tier 3 Retro.</h1><p>Estamos abriendo tu tablero o partida en la nueva dirección.</p><a href="${root}">Ir a Tier 3 Retro</a><script>const redirect=${legacyRedirect.toString()};location.replace(redirect(location.href,${JSON.stringify(root)}));</script></body></html>`;
await mkdir(new URL('../compat/juntos-retro/',import.meta.url),{recursive:true});
for(const file of ['index.html','404.html'])await writeFile(new URL('../compat/juntos-retro/'+file,import.meta.url),html);
await writeFile(new URL('../compat/juntos-retro/.nojekyll',import.meta.url),'');
