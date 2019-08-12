/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

export const BaseLogger = ZoweZLUX.logger.makeComponentLogger('org.zowe.zlux.ng2desktop'); //the one hardcoded place
BaseLogger.info(`App framework initializing. User agent=${navigator.userAgent}`);
