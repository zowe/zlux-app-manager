const axios = require('axios');
const https = require('https');
const express = require('express');
const Promise = require('bluebird');
const { getLTPA } = require('../../../../zlux-server-framework/plugins/sso-auth/lib/ltpa');

class DiscoveryDataservice {

  constructor(context) {
    this.context = context;
    let router = express.Router();
    router.use(function noteRequest(req, res, next) {
      context.logger.info('Saw request, method='+req.method);
      next();
    });

    let zosmfHost;
    if (process.env.ZOSMF_HOST) {
      zosmfHost = process.env.ZOSMF_HOST;
    } else if (context.plugin.server.config.user.agent.host) {
      zosmfHost = context.plugin.server.config.user.agent.host;
    } else if (context.plugin.server.config.user.node.mediationLayer) {
      zosmfHost = context.plugin.server.config.user.node.mediationLayer.gatewayHost;
    }
    let zosmfPort;
    if (process.env.ZOSMF_PORT) {
      zosmfPort = process.env.ZOSMF_PORT;
    } else {
      zosmfPort = 443; //this will probably not work
      context.logger.warn('ZOSMF_PORT env var not specified, defaulting to 443');
    }
    

    context.addBodyParseMiddleware(router);
    router.get('/',(req,res)=> {
      getZosmfNavTree(req,res,`https://${zosmfHost}:${zosmfPort}/zosmf`);
    });
    this.router = router;
  }
  
  getRouter() {
    return this.router;
  }
}
module.exports.discoveryRouter = function(context) {
  return new Promise(function(resolve, reject) {
    let dataservice = new DiscoveryDataservice(context);
    resolve(dataservice.getRouter());
  });
}

async function getZosmfNavTree(req, res, zosmfUrl, apimlToken) {
  const ltpa = getLTPA(apimlToken ? {'apimlAuthenticationToken':apimlToken} : req.cookies);
  const client = axios.create({
    baseURL: zosmfUrl,
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    })
  });

  const response = await client.request({
    method: 'GET',
    url: 'NavTreeServlet',
    headers: {
      origin: zosmfUrl,
      referer: zosmfUrl,
      //TODO or when JWT, different cookie name jwtToken
      cookie: `LtpaToken2=${ltpa}`
    }
  });
  res.status(response.status).json(response.data);
  return response;
}


if (require.main === module) {
  (async function () {
    const zosmfUrl = `https://rs28.rocketsoftware.com:11443/zosmf`;
    const apimlToken = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ0czMxMDUiLCJsdHBhIjoiVURBdHBUWHEvMW9JaVpnbDJ2OERJMHB0MnMyMlVieHlmQy8xR0MxbnVSVGwxaGZ5K1lzY210RmZsTnNyejhnTytCUkJMZU9Qa3B2cHFNOTZKZ3U5Lyt3SmJRSkFWeDRBdGxvVXdpNThqNlJTVVAzMlNocXlJQ0hTOUlNait1c0lDTEFaZExHc09BbjdGTWM3emNra3VQVXN2bGtCaTc2c2JVNEJMTDNzeWZLdnlCemZERThlZGxvSkZTUDR6aXBHeXE2c0hXRGxCWS9wU2kvWVpkc2M5K3psZDB4ekczTzZuNit1T3VrbUpLOWF0S2JzYi84NUhkeDZBMkp2Y1FsclFvN3JHbHJtOVEvaHExTzBoMXYzQnIxSkFPdklEU1l4d2tUc2cyczhCYWRwUEFwanNMaXlCVlIvWG5LOHlTVXgiLCJpYXQiOjE2MzQ1MzA4NDksImV4cCI6MTYzNDU1OTY0OSwiaXNzIjoiQVBJTUwiLCJqdGkiOiIwMDI3Zjc1NS1mOTJlLTQ4Y2EtYmRiNC03M2ZmMzkyZDdlNDAifQ.tj9idBF_PFXcv9vQsw958eOVQ9nbDyyRPbEiUH4rqxVVx4bkDInKzIe25M3sv34-0keFGXhg805RSnXLp2b3xZ3rSTq5A17qSqGsOaAAAZatYBw9Xc_QH-Nj5pKqKOYjs5Rmfgpo3GTBoqOj92tzq67tzAg0gEX3m953bTDeDcc87D7nN5Zt51j5BOEy4Sr_XeZLgxAhpcG0SY2ocQ5sDjIsdN48YysNDAGkFdHFt9e2XY9uc5HCw8-wcRPkKmTOLlDuf_O1sxeW8QRddzcBu-t8gw00RrdePH2K9_wavjVOuJJLkxCpoVa_kH14_rKKXn48RMhkYDhvSsEszTN3Nw';
    const response = await getZosmfNavTree(zosmfUrl, apimlToken);
    console.log(response.data);
  })().catch(e => console.error(e));
}
