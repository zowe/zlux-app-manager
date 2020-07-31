
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Response, Request } from "express";
import { Router } from "express-serve-static-core";

import { Project } from './models/project';
import { ProjectCtrl } from './controller/project';

const express = require('express');
const bodyParser = require('body-parser');
const Promise = require('bluebird');

class appGenDataservice {
  private router: Router;
  private projectCtrl: ProjectCtrl;

  constructor(private context: any) {
    this.context = context;
    this.projectCtrl = new ProjectCtrl(this.context);
    let router = express.Router();
    let self = this;

    router.use(bodyParser.urlencoded({ extended: true }));
    router.use(bodyParser.json());

    router.get('/project/get', function (req: Request, res: Response) {
      self.projectCtrl.get()
        .then((projects: Project[]) => {
          res.status(200).json(projects);
        })
        .catch(err => {
          res.status(500).json(err);
        })
    });
    
    router.post('/project/create', function (req: Request, res: Response) {
      self.projectCtrl.create(req.body)
        .then((project: Project) => {
          res.status(200).json(project);
        })
        .catch(err => {
          res.status(500).json(err);
        })
    });

    router.put('/project/edit', function (req: Request, res: Response) {
      self.projectCtrl.edit(req.body)
        .then((project: Project) => {
          res.status(200).json(project);
        })
        .catch(err => {
          res.status(500).json(err);
        })
    });

    router.delete('/project/delete/:id', function (req: Request, res: Response) {
      self.projectCtrl.delete(req.params.id)
        .then((success: boolean) => {
          res.status(200).json(success);
        })
        .catch(err => {
          res.status(500).json(err);
        })
    });

    this.router = router;
  }

  getRouter(): Router {
    return this.router;
  }

}

exports.genRouter = function (context): Router {
  return new Promise(function (resolve, reject) {
    let dataservice = new appGenDataservice(context);
    resolve(dataservice.getRouter());
  });
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
