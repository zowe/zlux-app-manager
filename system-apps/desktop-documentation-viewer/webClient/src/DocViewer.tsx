import React, { useEffect, useState } from 'react';
import { withTranslation } from 'react-i18next';

import {
  getDocsByPluginIdentifier,
  getDocsDetailsByPluginIdentifier,
} from './utils';

const DocViewer = (props: any) => {
  const { t: any } = props;
  const log: ZLUX.ComponentLogger = props.resources.logger;

  const [allPlugins, setAllPlugins] = useState(
    ZoweZLUX.pluginManager.loadPlugins('application', false)
      .__zone_symbol__value
  );
  const [allDocs, setAllDocs] = useState({});
  const [allCodes, setAllCodes] = useState({});

  const BASEURL = props.resources.pluginDefinition.getBasePlugin();

  // ComponentDidMount --> Load all plugins
  useEffect(() => {
    let updatedDocs = {};
    if (allPlugins) {
      Promise.all(
        allPlugins.map(async (plugin) => {
          const pluginName =
            plugin._definition.webContent &&
            plugin._definition.webContent.launchDefinition
              .pluginShortNameDefault;
          const { identifier = null } = plugin;

          if (pluginName && !(pluginName in allDocs)) {
            const docs = await getDocsByPluginIdentifier(
              BASEURL,
              plugin.identifier
            );

            updatedDocs[pluginName] = { docs, identifier };
            return;
          }
        })
      ).then(() => {
        setAllDocs(updatedDocs);
      });
    }
  }, []);

  // Load all codes from docs
  useEffect(() => {
    let updatedCodes = {};
    if (Object.keys(allDocs).length > 0) {
      Object.keys(allDocs).map((pluginName) => {
        const { docs, identifier } = allDocs[pluginName];
        if (typeof docs !== 'string') {
          Promise.all(
            docs.map(async (doc) => {
              const fileName = doc[0];
              const pathName = doc[1];
              const deconstructedPath = pathName.split('/');
              const topFolderPath =
                deconstructedPath.length > 2
                  ? `/${deconstructedPath[1]}`
                  : '/doc';
              let language = deconstructedPath;
              language = language[language.length - 1];
              language = language.split('.')[1];

              const code = await getDocsDetailsByPluginIdentifier(
                BASEURL,
                identifier,
                pathName
              );

              if (!(pluginName in updatedCodes)) {
                updatedCodes[pluginName] = {
                  [pathName]: {
                    fileName,
                    code,
                    language,
                    topFolderPath,
                  },
                };
              } else {
                updatedCodes[pluginName] = {
                  ...updatedCodes[pluginName],
                  [pathName]: {
                    fileName,
                    code,
                    language,
                    topFolderPath,
                  },
                };
              }
              return;
            })
          ).then(() => {
            setAllCodes(updatedCodes);
          });
        }
      });
    }
  }, [allDocs]);

  return <div>Available Plugins</div>;
};

export default withTranslation('translation')(DocViewer);
