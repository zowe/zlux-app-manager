
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

#ifdef METTLE
#include <metal/metal.h>
#include <metal/stddef.h>
#include <metal/stdio.h>
#include <metal/stdlib.h>
#include <metal/string.h>
#include <metal/stdarg.h>
#include "metalio.h"
#include "qsam.h"
#else
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>
#include <pthread.h>
#endif

#include "zowetypes.h"
#include "alloc.h"
#include "utils.h"
#include "charsets.h"
#include "bpxnet.h"
#include "socketmgmt.h"
#include "httpserver.h"
#include "json.h"
#include "logging.h"
#include "dataservice.h"
#include "http.h"

typedef struct AppStoreServiceData_t
{
  int timesVisited;
  uint64 loggingId;
} AppStoreServiceData;

static jsonPrinter *writeSuccess(HttpResponse *response, int rc, char *type) {
  int convert = TRUE;
  int outCCSID = CCSID_EBCDIC_1047;
  int reasonCode = 0;
  int translationLength = 0;
  char *convertBuffer = safeMalloc(4096, "ConvertBuffer");

  if (!strcmp(type, "tar") || !strcmp(type, "pax")){
    convert = FALSE;
  }

  jsonPrinter *p = respondWithJsonPrinter(response);
    
  setResponseStatus(response, 200, "OK");
  setDefaultJSONRESTHeaders(response);
  writeHeader(response);
    
  jsonStart(p);
  jsonStartMultipartString(p, "output");
  jsonEndMultipartString(p);
  safeFree(convertBuffer, 4096);
  return p;
}

static int appStoreDataService(HttpService *service, HttpResponse *response)
{
  HttpRequest *request = response->request;
  // basically this data is constant throught the whole service irrespective of the request
  AppStoreServiceData *serviceData = service->userPointer;

  serviceData->timesVisited++;

  zowelog(NULL, serviceData->loggingId, ZOWE_LOG_WARNING,
          "Inside appStoreDataService\n");

  if (!strcmp(request->method, methodGET))
  {
    // Checks for the GET method
    jsonPrinter *p = respondWithJsonPrinter(response);

    setResponseStatus(response, 200, "OK");
    setDefaultJSONRESTHeaders(response);
    writeHeader(response);

    jsonStart(p);
    {
      jsonAddString(p, "message", "Get Method for AppStoreDataService");
    }
    jsonEnd(p);
  }
  else if (!strcmp(request->method, methodPOST))
  {
    // Checks for the POST method

    // Get the body of the request
    char *inPtr = request->contentBody;

    // Convert the header for mainframe
    char *nativeBody = copyStringToNative(request->slh, inPtr, strlen(inPtr));
    int inLen = strlen(nativeBody);
    char errBuf[1024];

    // Checks for the validity of the body if the body is not valid then it will return NULL
    Json *body = jsonParseUnterminatedString(
        request->slh, nativeBody, inLen, errBuf, sizeof(errBuf));

    // returns the json object
    JsonObject *inputObject = jsonAsObject(body);

    if (inputObject == NULL)
    {
      respondWithJsonError(response, "Response body has no JSON object", 400, "Bad Request");
      return 0;
    }

    // Get the attributes from the json object
    Json *nameJson = jsonObjectGetPropertyValue(inputObject, "name");
    Json *autoEncodingJson = jsonObjectGetPropertyValue(inputObject, "auto-encoding");

    // We will be using this once the installs fails while installing the support module,
    // This will serve as kind of force command default we will keep it false only
    Json *skipEnableJson = jsonObjectGetPropertyValue(inputObject, "skip-enable");
    Json *registryJson = jsonObjectGetPropertyValue(inputObject, "registry");
    Json *handlerJson = jsonObjectGetPropertyValue(inputObject, "handler");

    char *autoEncoding = NULL;
    bool skipEnable = false;

    if (nameJson == NULL)
    {
      respondWithJsonError(response, "Missing name property from Json Body", 400, "Bad Request");
      return 0;
    }

    if (autoEncodingJson != NULL)
    {
      if (jsonAsBoolean(autoEncodingJson)) {
        char encoding[5];
        strcpy(encoding, "yes");
        autoEncoding = encoding;
      } else {
        char encoding[5];
        strcpy(encoding, "no");
        autoEncoding = encoding;
      }
    }
    else
    {
      // keep the default encoding auto
      char encoding[5];
      strcpy(encoding, "auto");
      autoEncoding = encoding;
    }

    if (skipEnableJson != NULL)
    {
      if (jsonAsBoolean(skipEnableJson)) {
        skipEnable  = true;
      }
    }

    if (registryJson == NULL)
    {
      respondWithJsonError(response, "Missing registry property from Json Body", 400, "Bad Request");
      return 0;
    }

    if (handlerJson == NULL)
    {
      respondWithJsonError(response, "Missing handler property from Json Body", 400, "Bad Request");
      return 0;
    }

    // Convert the json object to string
    char *name = jsonAsString(nameJson);
    char *registry = jsonAsString(registryJson);
    char *handler = jsonAsString(handlerJson);

    char *type = "string";

    char cmd[10280];

    int bufferPos = 0;

    bufferPos += sprintf(cmd + bufferPos, "zwe components install ");

    // Add the component name
    bufferPos += sprintf(cmd + bufferPos, "--component %s ", name);

    // Add the registry
    bufferPos += sprintf(cmd + bufferPos, "--registry %s ", registry);

    // Add the handler
    bufferPos += sprintf(cmd + bufferPos, "--handler %s", handler);

    zowelog(NULL, serviceData->loggingId, ZOWE_LOG_DEBUG,
            "Executing '%s'\n",cmd);

    int retCode = system(cmd);

    zowelog(NULL, serviceData->loggingId, retCode ? ZOWE_LOG_WARNING : ZOWE_LOG_DEBUG,
            "App Store call '%s' ended in rc=%d\n", cmd, retCode);
    
    if (!retCode) {
      jsonPrinter *p = writeSuccess(response, retCode, type);
      jsonAddInt(p, "rc", retCode);

      jsonEnd(p);
    } else {
      jsonPrinter *p = respondWithJsonPrinter(response);
      setResponseStatus(response, 500, "Internal Server Error");
      setDefaultJSONRESTHeaders(response);
      writeHeader(response);

      jsonStart(p);
      jsonAddString(p, "error", "Command failed to execute.\n");
      jsonEnd(p);
    }
  } else {
    jsonPrinter *p = respondWithJsonPrinter(response);
      
    setResponseStatus(response, 405, "Method Not Allowed");
    setDefaultJSONRESTHeaders(response);
    addStringHeader(response, "Allow", "GET, POST");
    writeHeader(response);
    
    jsonStart(p);
    {
      jsonAddString(p, "error", "Only POST requests are supported");
    }
    jsonEnd(p); 
  }

  finishResponse(response);
    
  return 0;

  
}

void appStoreDataServiceInstaller(DataService *dataService, HttpServer *server)
{
  int returnCode = 0;
  int reasonCode = 0;

  HttpService *httpService = makeHttpDataService(dataService, server);
  httpService->authType = SERVICE_AUTH_NATIVE_WITH_SESSION_TOKEN;
  httpService->serviceFunction = appStoreDataService;
  httpService->runInSubtask = TRUE;
  httpService->doImpersonation = TRUE;

  AppStoreServiceData *serviceData = (AppStoreServiceData *)safeMalloc(sizeof(AppStoreServiceData), "AppStoreServiceData");
  serviceData->loggingId = dataService->loggingIdentifier;

  httpService->userPointer = serviceData;
}