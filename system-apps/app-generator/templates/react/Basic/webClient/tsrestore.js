const fs = require('fs');

fs.copyFileSync('tsconfig.json.tmp', 'tsconfig.json');
console.log('Reset tsconfig.json');
fs.copyFileSync('tslint.json.tmp', 'tslint.json');
console.log('Reset tslint.json');
fs.unlinkSync('tsconfig.json.tmp');
fs.unlinkSync('tslint.json.tmp');
