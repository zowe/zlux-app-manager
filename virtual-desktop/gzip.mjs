/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

const GZIP_SIZE_MIN = 50000; //50 KB
const GZIP_ATTEMPT_MAX = 1000000000; //1 GB. Don't try compressing large files, these likely are incompressible binary.
const KEEP_RATIO = 0.85; // Items not compressed below this will not be kept as compressed

function recurse(directory) {
  const listing = fs.readdirSync(directory, {withFileTypes: true});
  listing.forEach((dirent)=> {
    let itemPath = path.join(directory, dirent.name);
    if (dirent.isDirectory()) {
      recurse(itemPath);
    } else {
      let stat = fs.statSync(itemPath);
      if ((stat.size >= GZIP_SIZE_MIN) && (stat.size <= GZIP_ATTEMPT_MAX)) {
        execSync('gzip -k '+dirent.name, {cwd: directory});
        let itemPathGz = path.join(directory, dirent.name+'.gz');
        let statGz = fs.statSync(itemPathGz);
        //keep only one file: compressed file is kept if meaningfully smaller.
        if ((stat.size*KEEP_RATIO) < statGz.size) {
          fs.unlinkSync(itemPathGz);
        } else {
          fs.unlinkSync(itemPath);
        }
      }
    }
  });
}

try {
  const listing = fs.readdirSync('web');  
} catch (e) {
  console.log('Could not read web directory, run build first.');
  process.exit(1);
}

recurse('web');
