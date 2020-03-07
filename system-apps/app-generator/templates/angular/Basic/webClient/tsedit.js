if (process.env.MVD_DESKTOP_DIR == null) {
  throw new Error('You must specify MVD_DESKTOP_DIR in your environment');
}

const fs = require('fs');

fs.copyFileSync('tsconfig.json', 'tsconfig.json.tmp');
fs.copyFileSync('tslint.json', 'tslint.json.tmp');
let tsconfig = fs.readFileSync('tsconfig.json', {encoding: 'utf8'});
let tslint = fs.readFileSync('tslint.json', {encoding: 'utf8'});
tsconfig = tsconfig.replace(/\$\{MVD_DESKTOP_DIR\}/g, process.env.MVD_DESKTOP_DIR);
fs.writeFileSync('tsconfig.json',tsconfig);
console.log('Set MVD_DESKTOP_DIR references into tsconfig.json');

tslint = tslint.replace(/\$\{MVD_DESKTOP_DIR\}/g, process.env.MVD_DESKTOP_DIR);
fs.writeFileSync('tslint.json',tslint);

console.log('Set MVD_DESKTOP_DIR references in tslint.json');
