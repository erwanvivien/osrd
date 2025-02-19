export const MAIN_API = {
  proxy: process.env.REACT_APP_API_URL,
  proxy_chartis: process.env.REACT_APP_CHARTIS_URL,
  proxy_editoast: process.env.REACT_APP_EDITOAST_URL,
  version: '0.0.1',
  editor: {
    component_identifier: { database: 'gaia', name: 'Test' },
  },
};

export const KEYCLOAK_CONFIG = {
  realm: process.env.REACT_APP_KEYCLOAK_REALM || 'shared', // shared or staging
  url: 'https://keycloak.shared.dgexsol.fr/auth/',
  'ssl-required': 'external',
  resource: 'gateway',
  'public-client': true,
  'confidential-port': 0,
  clientId: 'gateway',
};

export default MAIN_API;
