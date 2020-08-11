
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import * as Promise from 'bluebird';
import * as path from 'path';
import { Project } from '../models/project'

const fs = require('fs-extra');
const beautify = require('js-beautify');
const unzipper = require('unzipper');
const ZLUX_ROOT_FOLDER = path.join(process.env['PWD'], '../../');
const DESTINATION = process.env['INSTANCE_DIR'] ? path.join(process.env['INSTANCE_DIR'], 'workspace/app-server/devPlugins') : ZLUX_ROOT_FOLDER;
const installApp = require(path.join(ZLUX_ROOT_FOLDER,'zlux-server-framework/utils/install-app'));

export class ProjectService {
  logger: any;
  serverConfig: any;
  
  constructor(private context:any) {
    this.context = context;
    this.logger = context.logger;
    this.serverConfig = context.plugin.server.config.user;
  }

  get():Promise<Project[]>{
    return new Promise((resolve, reject)=> {
      fs.readdir(DESTINATION,(err, pluginFolders)=> {
        if (err) {
          reject(err);
        } else {
          fs.readdir(this.serverConfig.pluginsDir, (err, files)=> {
            if (err) {
              reject(err);
            } else {
              let pluginJsons = files.filter(function(file){
                if (!file.endsWith('.json')) {
                  return false;
                } else {
                  const name = file.substr(0,file.length-5);
                  return pluginFolders.includes(name);
                }
              });
              if (pluginJsons.length == 0){
                return resolve([]);
              }
              let projects:Project[] = [];
              let finishedLength = pluginJsons.length;
              let processed = 0;
              for (let i = 0; i < finishedLength; i++) {
                let folderLocation = path.join(DESTINATION, pluginJsons[i].substr(0,pluginJsons[i].length-5));
                fs.readFile(path.join(folderLocation, 'pluginDefinition.json'),'utf8',(err, content)=> {
                  if (!err) {
                    try {
                      let jsonContent = JSON.parse(content);
                      jsonContent.location = folderLocation;
                      projects.push(jsonContent);
                    } catch (e) {
                      //ignore
                    }
                  }
                  processed++;
                  if (processed == finishedLength) {
                    return resolve(projects);
                  }
                });
              }
            }
          });
        }
      });
    });
  }
  create(options: Project): Promise<Project> {
    let jsonFileName = options.identifier;
    let copyFrom = path.join(__dirname, '../../', `templates/${options.webContent.framework}/${options.template}`);
    const pluginLocation = path.join(DESTINATION, options.identifier);

    return new Promise((resolve, reject) => {
      options.location = pluginLocation;
      this.logger.info(`Installing new plugin into=${pluginLocation}`);
      fs.copy(copyFrom, pluginLocation, (err)=>{
        if (err) {
          console.log('err1',err);
          reject(err);
        }
        // update pluginDefinition
        let copy = Object.assign({},options);
        delete copy.location;
        delete copy.template;
        fs.writeFile(path.join(pluginLocation, 'pluginDefinition.json'), JSON.stringify(copy, null, 2), {encoding:'utf8'})
          .then(() => {
            const installResponse = installApp.addToServer(pluginLocation, this.serverConfig.pluginsDir);
            if (installResponse.success === true) {
              return resolve(options);
            } else {
              console.log('err2',installResponse);
              return reject(installResponse);
            }
            
          })
          .catch(err => {
            console.log('err3',err);
            return reject(err);
          });
      });
    });
  }

  edit(options: Project): Promise<Project> {
    return fs.writeJson(path.join(DESTINATION, options.identifier, 'pluginDefinition.json'), JSON.parse(JSON.stringify(options)))
      .then(() => {
        return options;
      });
  }

  delete(id: string): Promise<boolean> {
    return fs.remove(path.join(DESTINATION, id))
      .then(() => {
        this.logger.info(`Removal of plugin folder ${id} complete`);
        return fs.remove(path.join(this.serverConfig.pluginsDir, `${id}.json`))
      })
      .then(() => {
        this.logger.info(`Removal of plugin locator ${id}.json complete`);
        return true;
      })
      .catch((err) => {
        throw new Error(err.message);
      })
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
