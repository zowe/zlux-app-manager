import * as esbuild from 'esbuild';
import * as fs from 'fs/promises';

await fs.copyFile('./src/index.html', './web/index.html');

//CDK has so many modules. which ones do we use?
//Material has so many modules. which ones do we use?

await esbuild.build({
  entryPoints: [
    './src/main.ts',
    './node_modules/@angular/animations/fesm2022/animations.mjs',
    './node_modules/@angular/core/fesm2022/core.mjs',
    './node_modules/@angular/core/fesm2022/primitives/signals.mjs',
    './node_modules/@angular/common/fesm2022/common.mjs',
    './node_modules/@angular/common/fesm2022/http.mjs',
    './node_modules/@angular/compiler/fesm2022/compiler.mjs',
    './node_modules/@angular/localize/fesm2022/init.mjs', 
    './node_modules/@angular/localize/fesm2022/localize.mjs', 
    './node_modules/@angular/platform-browser-dynamic/fesm2022/platform-browser-dynamic.mjs',
    './node_modules/@angular/router/fesm2022/router.mjs',
    './node_modules/rxjs/dist/esm/index.js'
  ],
  bundle: true,
  outdir: './web',
  entryNames: '[dir]/[name]',
  format: 'esm',
  sourcemap: true,
  tsconfig: './tsconfig.json',
  loader: { '.css': 'text', '.html': 'text' },
  external: [
  '@angular/animations',
  '@angular/cdk',
  '@angular/core',
  '@angular/core/primitives/signals',
  '@angular/common',
  '@angular/common/http',
  '@angular/compiler',
  '@angular/forms',
  '@angular/localize',
  '@angular/localize/init',
  '@2angular/material',
  '@angular/router',
  '@angular/platform-browser-dynamic']
})