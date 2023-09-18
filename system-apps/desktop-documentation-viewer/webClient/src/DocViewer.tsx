import React, { useEffect, useState, useReducer } from 'react';
import { withTranslation } from 'react-i18next';
import { debounce } from 'debounce';

import {
  getDocsByPluginIdentifier,
  getDocsDetailsByPluginIdentifier,
} from './utils';
import PluginCard from './PluginCard';

const styles = require('./DocViewer.css');

const initalState = {
  allDocs: {},
  allFiles: {},
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_DOCS_DETAILS':
      return {
        ...state,
        allDocs: action.data,
      };
    case 'FETCH_DOCS_FILES':
      return {
        ...state,
        allFiles: action.data,
      };
    default:
      return state;
  }
};

const DocViewer = (props: any) => {
  const { t: any } = props;
  const log: ZLUX.ComponentLogger = props.resources.logger;
  const [{ allDocs, allFiles }, dispatch] = useReducer(reducer, initalState);

  const [allPlugins, setAllPlugins] = useState(
    ZoweZLUX.pluginManager.loadPlugins('application', false)
      .__zone_symbol__value
  );
  const [loading, setLoading] = useState(true);
  const [filteredPlugins, setFilteredPlugins] = useState(allFiles);
  const [searchText, setSearchText] = useState('');

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
          const icon =
            plugin._definition.webContent &&
            ZoweZLUX.uriBroker.pluginResourceUri(
              plugin,
              plugin._definition.webContent.launchDefinition.imageSrc
            );

          if (pluginName && !(pluginName in allDocs)) {
            const docs = await getDocsByPluginIdentifier(
              BASEURL,
              plugin.identifier
            );

            updatedDocs[pluginName] = { docs, identifier, icon };
            return;
          }
        })
      ).then(() => {
        dispatch({ type: 'FETCH_DOCS_DETAILS', data: updatedDocs });
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
            docs?.map(async (doc) => {
              const fileName = doc[0];
              const pathName = doc[1];
              const deconstructedPath = pathName.split('/');
              const topFolderPath =
                deconstructedPath.length > 2
                  ? `/${deconstructedPath[1]}`
                  : '[root folder]';
              let language = deconstructedPath;
              language = language[language.length - 1];
              language = language.split('.')[1];

              const code = await getDocsDetailsByPluginIdentifier(
                BASEURL,
                identifier,
                pathName
              );

              const updatedFile = {
                filePath: pathName,
                fileName,
                code,
                language,
              };

              if (pluginName in updatedCodes) {
                if (topFolderPath in updatedCodes[pluginName]) {
                  updatedCodes[pluginName] = {
                    ...updatedCodes[pluginName],
                    [topFolderPath]: [
                      ...updatedCodes[pluginName][topFolderPath],
                      updatedFile,
                    ],
                  };
                } else {
                  updatedCodes[pluginName] = {
                    ...updatedCodes[pluginName],
                    [topFolderPath]: [updatedFile],
                  };
                }
              } else {
                updatedCodes[pluginName] = {
                  [topFolderPath]: [updatedFile],
                };
              }
              return;
            })
          ).then(() => {
            dispatch({ type: 'FETCH_DOCS_FILES', data: updatedCodes });
            setLoading(false);
          });
        }
      });
    }
  }, [allDocs]);

  const handleOnChange = debounce((text) => {
    if (text !== '') {
      const filteredNames = Object.keys(allFiles).filter((plugin) =>
        plugin.toLowerCase().includes(text.toLowerCase())
      );
      let filtered = {};
      filteredNames.forEach((plugin) => (filtered[plugin] = allFiles[plugin]));
      setFilteredPlugins(filtered);
      setSearchText(text);
    } else {
      setFilteredPlugins(allFiles);
      setSearchText('');
    }
  }, 1000);

  return loading ? (
    <div>Loading spinner???</div>
  ) : (
    <div className={styles.mainContainer}>
      <div className={styles.header}>
        <div className={styles.docViewerTitle}>Installed Plugins</div>
        <div className={styles.searchContainer}>
          <div className={styles.searchText}>Search:</div>
          <input
            className={styles.searchBox}
            placeholder='eg. Sample React App'
            onChange={(e) => {
              e.persist();
              handleOnChange(e.target.value);
            }}
          />
        </div>
      </div>
      <div className={styles.pluginsWrapper}>
        {Object.keys(
          Object.keys(filteredPlugins).length > 0 ? filteredPlugins : allDocs
        ).map((plugin) => {
          const files = filteredPlugins[plugin] ?? allFiles[plugin];
          const options =
            files !== undefined
              ? Object.keys(files).map((topFolderPath) => {
                  return {
                    value: topFolderPath,
                    label: `${topFolderPath} (${files[topFolderPath].length})`,
                  };
                })
              : [];
          return (
            (filteredPlugins[plugin] ?? allFiles[plugin]) && (
              <PluginCard
                plugin={plugin}
                files={files}
                options={options}
                text={searchText}
                icon={allDocs[plugin].icon}
              />
            )
          );
        })}
      </div>
    </div>
  );
};

export default withTranslation('translation')(DocViewer);
