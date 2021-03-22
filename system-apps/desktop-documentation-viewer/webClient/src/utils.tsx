export const getDocsByPluginIdentifier = (baseURL: any, identifier: string): any => {
  const url = ZoweZLUX.uriBroker.pluginRESTUri(
    baseURL,
    'plugindetail',
    'docs/' + `${identifier}`
  );
  return fetch(url)
    .then((res) => res.json())
    .then((data) => data.doc);
};

export const getDocsDetailsByPluginIdentifier = (
  baseURL: any,
  identifier: string,
  path: string
): any => {
  const url = ZoweZLUX.uriBroker.pluginRESTUri(
    baseURL,
    'plugindetail',
    `${identifier}`
  );

  return fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      identifier: identifier,
      docLocation: `/doc${path}`,
    }),
  })
    .then((res) => res.text())
    .then((data) => data);
};