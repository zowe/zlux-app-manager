This program and the accompanying materials are
made available under the terms of the Eclipse Public License v2.0 which accompanies
this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

SPDX-License-Identifier: EPL-2.0

Copyright Contributors to the Zowe Project.

## non-Angular package information
* Any package described as generic does not depend upon Angular
##### Redux
* @angular-redux/store
    * Angular redux wrapper
    * https://github.com/angular-redux/store 
* redux-logger
    * generic
    * logger: development only
    * https://github.com/evgenyrodionov/redux-logger
* redux
    * generic
    * https://github.com/reactjs/redux
##### Other
* @angular/animations
    * google package
    * required by PrimeNG
* angular-split
    * Angular window splitting
    * https://github.com/bertrandg/angular-split    
* bootstrap
    * generic
    * twitter bootstrap
    * https://v4-alpha.getbootstrap.com/
* font-awesome
    * generic
    * https://github.com/FortAwesome/Font-Awesome 
* primeng 
    * Angular charting/trees, etc.
    * https://www.primefaces.org/primeng/#/
    
## package installation
    npm i --save @angular-redux/store @angular/animations angular-split bootstrap@next font-awesome primeng@latest redux redux-logger
    npm i --save-dev @types/redux-logger
      
## package.json script changes
    "scripts": {
        "start": "ng serve --proxy-config proxy.conf.json",
        "build": "ng build -aot",
      }  
