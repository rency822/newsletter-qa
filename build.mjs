import {build} from 'esbuild';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';

const out = await build({entryPoints: ['src/ui.js'], bundle: true, format: 'iife', write: false, minify: true});
// Neutralize any "</script" in the bundle so it cannot close the inline tag early.
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const page = readFileSync('src/page.html', 'utf8');
if (!page.includes('/*SCRIPT*/')) throw new Error('src/page.html is missing /*SCRIPT*/');
mkdirSync('dist', {recursive: true});
writeFileSync('dist/checker.html', page.replace('/*SCRIPT*/', () => js));
console.log('built dist/checker.html');
