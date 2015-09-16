/*
 * Copyright 2015 Telefónica Investigación y Desarrollo, S.A.U
 *
 * This file is part of context-adapter
 *
 * context-adapter is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * context-adapter is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with context-adapter.
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[german.torodelvalle@telefonica.com]
 */

'use strict';

var caLogger = require('logops');
var caConfig = require('./context_adapter_configuration');
var caErrors = require('./context_adapter_error');
var caHelper = require('./context_adapter_helper.js');
var hapi = require('hapi');
var boom = require('boom');
var async = require('async');

var server;

var attendedRequests = 0;

/**
 * Checks that every request sent to the Context Adapter includes the required headers
 * @param {object} value Headers object
 * @param {object} options Hapi server header validation configuration object
 * @param {function} next Hapi server header validation continuation function
 */
function validateHeaders(value, options, next) {
  var error, message;

  var context = {
    corr: value[caConfig.UNICA_CORRELATOR_HEADER] || caHelper.getUnicaCorrelator(),
    trans: caHelper.getTransactionId(),
    op: caHelper.getOperationType()
  };

  attendedRequests++;

  if (!value['fiware-service']) {
    message = 'error=child "fiware-service" fails because [fiware-service is required]';
    caLogger.warn(
      context,
      message
    );
    error = boom.badRequest(message);
    error.output.payload.validation = {source: 'headers', keys: ['fiware-service']};
    next(error);
  } else if (!value['fiware-servicepath']) {
    message = 'child "fiware-servicepath" fails because [fiware-servicepath is required]';
    caLogger.warn(
      context,
      message
    );
    error = boom.badRequest(message);
    error.output.payload.validation = {source: 'headers', keys: ['fiware-servicepath']};
    next(error);
  }
  next();
}

/**
 * Handler to manage the requests for the version of the component
 * @param {Object} request The received request
 * @param {Function} reply The reply function to respond to the requester
 * @return {*} Returns the version of the Context Adapter component
 */
function getVersionHandler(request, reply) {
  var message = caHelper.getVersion();
  return reply(message);
}

/**
 * Responds to a valid updateContext request
 * @param {Object} request The request
 * @param {Function} reply The reply() function to respond to the client
 * @param {Object} operationDescriptor The operation descriptor associated to the received request
 * @param {Function} callback Callback function
 */
function respond2UpdateContext(request, reply, operationDescriptor, callback) {
  // The updateContext request is well-formed
  caLogger.info(
    request.contextAdapter.context,
    'Valid updateContext request received: ' +
    request.method.toUpperCase() + ' ' + request.url.path +
    ', payload=' + JSON.stringify(request.payload)
  );
  caLogger.info(
    request.contextAdapter.context,
    'operation descriptor: ' +
    JSON.stringify(operationDescriptor)
  );
  // Respond to the received updateContext request
  var ngsiResponse = caHelper.getNGSIResponse(null, request);
  reply(ngsiResponse);
  callback(null, operationDescriptor);
}

/**
 * Error handler if an error occurs during a new updateContext request reception
 * @param {Object} request The received request
 * @param {Function} reply The reply() function to respond to the client
 * @param {Object} err The error which caused the processing of the request to be cancelled
 */
function updateContexErrortHandler(request, reply, err) {
  caLogger.warn(request.contextAdapter.context, err);
  if (err instanceof caErrors.BadPayload) {
    // Respond to the received updateContext request
    var ngsiResponse = caHelper.getNGSIResponse(err, request);
    reply(ngsiResponse);
  } else {
    // Notify the operation as closed
    caHelper.notifyOperationClosed(
      err,
      request,
      function onNotifyOperationClosed() {
        // TODO Decide how to behave in case of a notification error
      }
    );
  }
}

/**
 * Handler of third party responses
 * @param {Object} request The received updateContext request
 * @param {Object} err Error, if any, when sending the request to the third party
 * @param {Object} response The response, if any, received from the third party
 */
function onThirdPartyResponse(request, err, response) {
  if (err) {
    // Error when sending the synchronous request to the third party
    caLogger.warn(
      request.contextAdapter.context,
      'Error when synchronous request from third party: ' +
      err.code + ' - ' + err.message
    );
    // Notify the operation as closed
    caHelper.notifyOperationClosed(
      err,
      request,
      function onNotifyOperationClosed() {
        // TODO Decide how to behave in case of a notification error
      }
    );
  } else {
    // The third party responded to the synchronous request successfully
    caLogger.info(
      request.contextAdapter.context,
      'Synchronous request from third party response: ' +
      JSON.stringify(response)
    );
    if (request.contextAdapter.operationDescriptor.action ===
          caConfig.BUTTON_ENTITY.OPERATION_ACTION.SYNCHRONOUS) {
      // Notify the operation as completed
      caHelper.notifyOperationCompleted(
        request,
        response,
        function onNotifyOperationCompleted() {
          // TODO Decide how to behave in case of a notification error
        }
      );
    } else if (request.contextAdapter.operationDescriptor.action ===
                caConfig.BUTTON_ENTITY.OPERATION_ACTION.ASYNCHRONOUS_CREATE) {
      // Notify the operation as in progress
      caHelper.notifyOperationInProgress(
        request,
        response,
        function onNotifyOperationInProgress() {
          // TODO Decide how to behave in case of a notification error
        }
      );
    } else {
      // Notify the operation as completed
      caLogger.info(
        request.contextAdapter.context,
        'Notifying the Context Broker that the request has been completed: ' +
        JSON.stringify(response)
      );
      // Add a delay before notifying the Context Broker
      setTimeout(function() {
        caHelper.notifyOperationCompleted(
          request,
          response,
          function onNotifyOperationCompleted(err, response, body) {
            // TODO Decide how to behave in case of a notification error
            caLogger.info(
              request.contextAdapter.context,
              'Context Broker response: ' +
              'err: ' + err + ', body: ' + JSON.stringify(body)
            );
          }
        );
      }, caConfig.THIRD_PARTY_NOTIFICATION_DELAY);
    }
  }
}

/**
 * Processes a valid operation request
 * @param {Object} request The updateContext request received
 * @param {Object} serviceDescriptor The service descriptor associated to the received request
 */
function processOperationRequest(request, serviceDescriptor) {
  // Valid service description retrieved
  caLogger.info(
    request.contextAdapter.context,
    'service descriptor: ' +
      JSON.stringify(serviceDescriptor)
  );

  // Check the type of action to be accomplished
  switch (request.contextAdapter.operationDescriptor.action) {
    case caConfig.BUTTON_ENTITY.OPERATION_ACTION.SYNCHRONOUS:
      // The requested operation is a synchronous action
      // Send a synchronous request to the third party
      caHelper.sendThirdPartyRequest(request, onThirdPartyResponse.bind(null, request));
      break;
    case caConfig.BUTTON_ENTITY.OPERATION_ACTION.ASYNCHRONOUS_CREATE:
      // The requested operation is an asynchronous action
      // Send a synchronous request to the third party to get the external request id
      caHelper.sendThirdPartyRequest(request, onThirdPartyResponse.bind(null, request));
      break;
    default:
      caHelper.sendThirdPartyRequest(request, onThirdPartyResponse.bind(null, request));
      break;
  }
}

/**
 * Returns the logging context associated to a request
 * @param {Object} request The updateContext request received
 * @return {Object} The context to be used for logging
 */
function getContext(request) {
  return {
    corr: request.headers[caConfig.UNICA_CORRELATOR_HEADER] ||
            caHelper.getUnicaCorrelator(request),
    trans: caHelper.getTransactionId(),
    op: caHelper.getOperationType(request)
  };
}

/**
 * Handler to manage updateContext requests
 * @param {Object} request The received request
 * @param {Function} reply The reply function to respond to the requester
 */
function updateContextHandler(request, reply) {
  request.contextAdapter = request.contextAdapter || {};
  request.contextAdapter.context = getContext(request);

  caLogger.info(
    request.contextAdapter.context,
    'updateContext request received: ' +
    JSON.stringify(request.payload)
  );

  async.waterfall([
    caHelper.getOperationDescriptor.bind(null, request),
    respond2UpdateContext.bind(null, request, reply),
    caHelper.getServiceDescriptor.bind(null, request),
    processOperationRequest.bind(null, request)
  ], updateContexErrortHandler.bind(null, request, reply));
}

/**
 * Handler to manage update requests received from Third Party's services
 * @param {Object} request The received request
 * @param {Function} reply The reply function to respond to the requester
 */
function thirdPartyUpdateHandler(request, reply) {
  // TODO Validate the request received from the third party

  request.contextAdapter = request.contextAdapter || {};
  request.contextAdapter.context = getContext(request);

  caLogger.info(
    request.contextAdapter.context,
    'Asynchronous update request from third party: ' +
    JSON.stringify(request.payload)
  );

  // Notify the operation as completed
  caHelper.notifyOperationCompleted(
    request,
    null,
    function onNotifyOperationCompleted() {
      // TODO Decide how to behave in case of a notification error
    }
  );
  reply();
}

/**
 * Starts the server asynchronously
 * @param {string} host The Context Adapter server host
 * @param {string} port The Context Adapter server port
 * @param {Function} callback Callback function to notify the result
 *  of the operation
 */
function start(host, port, callback) {
  var context = {
    op: caConfig.OPERATION_TYPE.SERVER_LOG
  };

  server = new hapi.Server();

  server.on('log', function(event, tags) {
    if (tags.load) {
      caLogger.warn(context, 'event=' + JSON.stringify(event));
    }
  });

  server.on('request-internal', function(request, event, tags) {
    if (tags.error) {
      if (tags.auth || tags.handler || tags.state || tags.payload || tags.validation) {
        caLogger.warn(context, request.method.toUpperCase() + ' ' + request.url.path +
            ', event=' + JSON.stringify(event)
        );
      } else {
        caLogger.error(context, request.method.toUpperCase() + ' ' + request.url.path +
            ', event=' + JSON.stringify(event)
        );
      }
    }
  });

  server.connection({
    host: host,
    port: port
  });

  server.route([
    {
      method: 'GET',
      path: '/version',
      handler: getVersionHandler
    },
    {
      method: 'POST',
      path: caConfig.CA_PATH + '/updateContext',
      handler: updateContextHandler,
      config: {
        validate: {
          headers: validateHeaders
        }
      }
    },
    {
      method: 'POST',
      path: caConfig.CA_PATH + caConfig.UPDATE_WEB_HOOK_PATH,
      handler: thirdPartyUpdateHandler,
      config: {
        validate: {
          headers: validateHeaders
        }
      }
    }
  ]);

  // Start the server
  server.start(function(err) {
    return callback(err, server);
  });
}

/**
 * Stops the server asynchronously
 * @param {Function} callback Callback function to notify the result
 *  of the operation
 */
function stop(callback) {
  var context = {
    operationType: caConfig.OPERATION_TYPE.SERVER_STOP
  };

  caLogger.info(context, 'Stopping the Context Adapter server...');
  if (server && server.info && server.info.started) {
    server.stop(function(err) {
      // Server successfully stopped
      caLogger.info(context, 'hapi server successfully stopped');
      callback(err);
    });
  } else {
    caLogger.info(context, 'No hapi server running');
    process.nextTick(callback);
  }
}

/**
 * Returns the server KPIs
 * @return {{attendedRequests: number}}
 */
function getKPIs() {
  return {
    attendedRequests: attendedRequests
  };
}

/**
 * Resets the server KPIs
 */
function resetKPIs() {
  attendedRequests = 0;
}

/**
 * Properties and functions exported by the module
 * @type {{server, startup: startup, exitGracefully: exitGracefully}}
 */
module.exports = {
  get hapiServer() {
    return server;
  },
  start: start,
  stop: stop,
  getKPIs: getKPIs,
  resetKPIs: resetKPIs
};
