
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Project } from '../models/project';
import { ProjectService } from '../service/project';

export class ProjectCtrl {
  private projectService:ProjectService;
  
  constructor(private context:any) {
    this.projectService = new ProjectService(this.context);      
  }
  get():Promise<Project[]> {
    this.context.logger.info('Getting projects');
    return this.projectService.get();
  }
  create(options: Project): Promise<Project> {
    this.context.logger.info('Creating project=',options.identifier);
    return this.projectService.create(options);
  }
  edit(options: Project): Promise<Project> {
    this.context.logger.info('Editing project=',options.identifier);
    return this.projectService.edit(options);
  }
  delete(id:string): Promise<boolean> {
    this.context.logger.info('Deleting project=',id);
    return this.projectService.delete(id); 
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
