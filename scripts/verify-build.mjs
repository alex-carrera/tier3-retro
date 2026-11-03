import {readFile,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
const base=resolve('dist'),manifest=JSON.parse(await readFile(resolve(base,'.vite/manifest.json'),'utf8'));
const retro=manifest['index.html'],game=manifest['juego/index.html'];assert.ok(retro&&game,'Deben existir las dos entradas');
const seen=new Set();async function visit(key){if(seen.has(key))return;seen.add(key);const entry=manifest[key];assert.ok(entry);assert.notEqual(entry.file,game.file,'La retro no debe cargar el juego');const source=await readFile(resolve(base,entry.file),'utf8');assert.ok(!source.includes('Phaser'),'La retro no debe incluir Phaser');for(const dependency of[...(entry.imports||[]),...(entry.dynamicImports||[])])await visit(dependency);}
await visit('index.html');
for(const path of ['index.html','juego/index.html']){const html=await readFile(resolve(base,path),'utf8');for(const match of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css))"/g)){const asset=resolve(base,dirname(path),match[1]);assert.ok(asset.startsWith(base+'/'));assert.ok((await stat(asset)).isFile(),`Recurso inexistente: ${match[1]}`);}}
console.log('Verificación: dos entradas recargables; retro independiente sin Phaser; recursos relativos válidos.');
