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
var caPackage = require('../package.json');
var request = require('request');
var revalidator = require('revalidator');

/**
 * Generates a 32 bit integer hash code
 * @param {string} str The seed
 * @return {number} The hash code
 */
function getHashCode(str) {
  var hash = 0, i, chr, len;
  if (str && str.length === 0) {
    return hash;
  }
  for (i = 0, len = str.length; i < len; i++) {
    chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

/**
 * Generates the UNICA correlator based on a request
 * @param {object} request The HTTP request
 * @return {string} The generated UNICA correlator
 */
function getUnicaCorrelator(request) {
  if (!request) {
    return caConfig.UNICA_CORRELATOR.NOT_AVAILABLE;
  } else {
    return getHashCode('from: ' + request.info.remoteAddress +
      ':' + request.info.remotePort +
      ', method: ' + request.method.toUpperCase() +
      ', url: ' + request.url.path);
  }
}

/**
 * Generates the transaction identifier to be used when for logging
 * @return {string} The generated transaction id
 */
function getTransactionId() {
  return new Date().getTime();
}

/**
 * Returns the value of certain attribute included in an attributes array
 * @param {Array} attributes The attributes array to be searched in
 * @param {string} attributeName The name of the attribute to search
 * @return {*} The attribute value, if any
 */
function getAttributeValue(attributes, attributeName) {
  for (var i = 0; i < attributes.length; i++) {
    if (attributes[i].name === attributeName) {
      return attributes[i].value;
    }
  }
}

/**
 * Removes an attribute from an attributes array
 * @param {Array} attributes The attributes array
 * @param {string} attributeName The name of the attribute to remove
 */
function removeAttribute(attributes, attributeName) {
  for (var i = 0; i < attributes.length; i++) {
    if (attributes[i].name === attributeName) {
      attributes.splice(i, 1);
    }
  }
}

/**
 * Updates the value of some attribute in an attributes array
 * @param {Array} attributes The attributes array
 * @param {string} attributeName The name of the attribute whose value should be updated
 * @param {number} newValue Thew new value to set
 */
function setAttribute(attributes, attributeName, newValue) {
  for (var i = 0; i < attributes.length; i++) {
    if (attributes[i].name === attributeName) {
      attributes[i].value = newValue;
    }
  }
}

/**
 * Returns the operation type for a concrete request to be used for logging
 * @param {object} request The request
 * @return {string} The operation type
 */
function getOperationType(request) {
  if (!request) {
    return caConfig.OPERATION_TYPE.SERVER_LOG;
  } else {
    return caConfig.OPERATION_TYPE_PREFIX + request.method.toUpperCase();
  }
}

/**
 * Returns version information about this concrete instance of the
 *  Context Adapter component
 * @return {object} A JSON-formatted object including the version information
 */
function getVersion() {
  var message = {};
  if (caPackage) {
    if (caPackage.version) {
      message.version = caPackage.version;
    }
  }
  if (Object.getOwnPropertyNames(message).length === 0) {
    message.version = 'No version information available';
  }
  return message;
}

/**
 * Sends a queryContext request to the configured Context Broker
 * @param {string} service Service header to be used in the request
 * @param {string} servicePath Service Path header to be used in the request
 * @param {object} payload Payload to be included in the request
 * @param {function} callback Callback to be called informing of any errors or returning
 *  the obtained response
 */
function sendQueryContext(service, servicePath, payload, callback) {
  request({
    method: 'POST',
    uri: 'http://' + caConfig.CB_HOST + ':' + caConfig.CB_PORT + caConfig.CB_PATH + '/queryContext',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Fiware-Service': service || caConfig.SERVICE,
      'Fiware-ServicePath': servicePath || caConfig.SERVICE_PATH
    },
    json: true,
    body: payload
  }, callback);
}

/**
 * Sends a updateContext request to the configured Context Broker
 * @param {string} service Service header to be used in the request
 * @param {string} servicePath Service Path header to be used in the request
 * @param {object} payload Payload to be included in the request
 * @param {function} callback Callback to be called informing of any errors or returning
 *  the obtained response
 */
function sendUpdateContext(service, servicePath, payload, callback) {
  var context = {
    corr: getUnicaCorrelator(),
    trans: getTransactionId(),
    op: getOperationType()
  };
  caLogger.info(
    context,
    'Sending updateContext to CB at ' + 'http://' + caConfig.CB_HOST + ':' + caConfig.CB_PORT + caConfig.CB_PATH + '/updateContext' +
      'with payload: ' + JSON.stringify(payload)
  );
  request({
    method: 'POST',
    uri: 'http://' + caConfig.CB_HOST + ':' + caConfig.CB_PORT + caConfig.CB_PATH + '/updateContext',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Fiware-Service': service || caConfig.SERVICE,
      'Fiware-ServicePath': servicePath || caConfig.SERVICE_PATH
    },
    json: true,
    body: payload
  }, callback);
}

/**
 * Indicates if certain attribute is included in an attributes array
 * @param {Array} attributes The attributes array
 * @param {string} attributeName The attribute name to find
 * @return {boolean} The result of the search
 */
function isAttributeIncluded(attributes, attributeName) {
  for (var i = 0; i < attributes.length; i++) {
    if (attributes[i].name && attributes[i].name === attributeName) {
      return true;
    }
  }
  return false;
}

/**
 * Checks that an updateContext request sent to the Context Adapter is well-formed
 * @param {object} request The request sent to the Context Adapter
 * @param {function} callback Callback to be called with the result of the check
 * @return {*} boolean True if the updateContext request is valid. False otherwise
 */
function checkUpdateContextRequest(request, callback) {
  var updateContextJSONSchema = {
    properties: {
      payload: {
        id: 'payload',
        type: 'object',
        required: true,
        properties: {
          contextElements: {
            id: 'contextElements',
            type: 'array',
            required: true,
            minItems: 0,
            maxItems: 2,
            items: {
              id: '0',
              type: 'object',
              required: true,
              properties: {
                id: {
                  id: 'id',
                  type: 'string',
                  required: true
                },
                type: {
                  id: 'type',
                  type: 'string',
                  required: true
                },
                isPattern: {
                  id: 'isPattern',
                  type: 'string',
                  required: true,
                  pattern: 'false'
                },
                attributes: {
                  id: 'attributes',
                  type: 'array',
                  required: true,
                  minItems: 4,
                  maxItems: 6,
                  conform: function(attributes) {
                    return isAttributeIncluded(attributes,
                        caConfig.BUTTON_ENTITY.CA_EXTERNAL_ID_ATTR_NAME) &&
                      isAttributeIncluded(attributes,
                        caConfig.BUTTON_ENTITY.CA_SERVICE_ID_ATTR_NAME) &&
                      isAttributeIncluded(attributes,
                        caConfig.BUTTON_ENTITY.CA_OPERATION_ACTION_ATTR_NAME) &&
                      [caConfig.BUTTON_ENTITY.OPERATION_ACTION.SYNCHRONOUS,
                        caConfig.BUTTON_ENTITY.OPERATION_ACTION.ASYNCHRONOUS_CREATE].indexOf(
                        getAttributeValue(
                          attributes,
                          caConfig.BUTTON_ENTITY.CA_OPERATION_ACTION_ATTR_NAME
                        )
                      ) !== -1 &&
                      isAttributeIncluded(attributes,
                        caConfig.BUTTON_ENTITY.CA_OPERATION_EXTRA_ATTR_NAME) &&
                      isAttributeIncluded(attributes,
                        caConfig.BUTTON_ENTITY.CA_OPERATION_STATUS_ATTR_NAME);
                  },
                  message: 'The \'attributes\' array is not valid'
                }
              }
            }
          },
          updateAction: {
            id: 'updateAction',
            type: 'string',
            required: true,
            pattern: 'UPDATE'
          }
        }
      }
    }
  };

  var validation = revalidator.validate(request, updateContextJSONSchema);
  if (validation.valid) {
    return process.nextTick(callback);
  } else {
    var err = new caErrors.BadPayload(request.payload);
    return process.nextTick(callback.bind(null, err));
  }
}

/**
 * Processes and returns the requested operation information
 * @param {object} request The updateContext request received
 * @param {function} callback Callback to be called with the result of the operation
 */
function getOperationDescriptor(request, callback) {
  /*checkUpdateContextRequest(request, function(err) {
    if (err) {
      return process.nextTick(callback.bind(null, err));
    } else {
      var operationDescriptor = {
        buttonId: request.payload.contextElements[0].id
      };
      request.payload.contextElements[0].attributes.forEach(function(attribute) {
        switch (attribute.name) {
          case caConfig.BUTTON_ENTITY.CA_EXTERNAL_ID_ATTR_NAME:
            operationDescriptor.externalButtonId = attribute.value;
            break;
          case caConfig.BUTTON_ENTITY.CA_SERVICE_ID_ATTR_NAME:
            operationDescriptor.serviceId = attribute.value;
            break;
          case caConfig.BUTTON_ENTITY.CA_OPERATION_ACTION_ATTR_NAME:
            operationDescriptor.action = attribute.value;
            break;
          case caConfig.BUTTON_ENTITY.CA_OPERATION_EXTRA_ATTR_NAME:
            operationDescriptor.extra = attribute.value;
            break;
        }
      });
      operationDescriptor.externalButtonId = 'ZZZ';
      operationDescriptor.serviceId = 'THIRD PARTY DEMO SERVICE';
      request.contextAdapter.operationDescriptor = operationDescriptor;
      return process.nextTick(callback.bind(null, null, operationDescriptor));
    }
  });*/
  var operationDescriptor = {
    buttonId: request.payload.contextElements[0].id
  };
  request.payload.contextElements[0].attributes.forEach(function(attribute) {
    switch (attribute.name) {
      case caConfig.BUTTON_ENTITY.CA_EXTERNAL_ID_ATTR_NAME:
        operationDescriptor.externalButtonId = attribute.value;
        break;
      case caConfig.BUTTON_ENTITY.CA_SERVICE_ID_ATTR_NAME:
        operationDescriptor.serviceId = attribute.value;
        break;
      case caConfig.BUTTON_ENTITY.CA_OPERATION_ACTION_ATTR_NAME:
        operationDescriptor.action = attribute.value;
        break;
      case caConfig.BUTTON_ENTITY.CA_OPERATION_EXTRA_ATTR_NAME:
        operationDescriptor.extra = attribute.value;
        break;
    }
  });
  operationDescriptor.externalButtonId = 'ZZZ';
  operationDescriptor.serviceId = '<service-id>';
  request.contextAdapter.operationDescriptor = operationDescriptor;
  return process.nextTick(callback.bind(null, null, operationDescriptor));
}

/**
 * Checks that an queryContext response returned by the Context Adapter to get
 *  service information is well-formed
 * @param {object} response The response received from the Context Adapter
 * @param {string} serviceId The identifier of the service whose information was retrieved
 * @param {function} callback Callback to be called with the result of the check
 * @return {*} True if the queryContextResponse is valid. False otherwise.
 */
function checkQueryContextResponse(response, serviceId, callback) {
  var queryContextJSONSchema = {
    properties: {
      body: {
        id: 'body',
        type: 'object',
        required: true,
        properties: {
          contextResponses: {
            id: 'contextResponses',
            type: 'array',
            required: true,
            minItems: 0,
            maxItems: 2,
            items: {
              id: '0',
              type: 'object',
              required: true,
              properties: {
                contextElement: {
                  id: 'contextElement',
                  type: 'object',
                  required: true,
                  properties: {
                    id: {
                      id: 'id',
                      type: 'string',
                      required: true
                    },
                    type: {
                      id: 'type',
                      type: 'string',
                      required: true
                    },
                    isPattern: {
                      id: 'isPattern',
                      type: 'string',
                      required: true,
                      pattern: 'false'
                    },
                    attributes: {
                      id: 'attributes',
                      type: 'array',
                      required: true,
                      minItems: 4,
                      maxItems: 6,
                      conform: function(attributes) {
                        return isAttributeIncluded(
                            attributes,
                            caConfig.SERVICE_ENTITY.ENDPOINT_ATTR_NAME) &&
                          isAttributeIncluded(
                            attributes,
                            caConfig.SERVICE_ENTITY.METHOD_ATTR_NAME) &&
                          isAttributeIncluded(
                            attributes,
                            caConfig.SERVICE_ENTITY.AUTHENTICATION_ATTR_NAME) &&
                          isAttributeIncluded(
                            attributes,
                            caConfig.SERVICE_ENTITY.MAPPING_ATTR_NAME) &&
                          isAttributeIncluded(
                            attributes,
                            caConfig.SERVICE_ENTITY.TIMEOUT_ATTR_NAME);
                      },
                      message: 'The \'attributes\' array is not valid'
                    }
                  }
                },
                statusCode: {
                  id: 'statusCode',
                  type: 'object',
                  required: true,
                  properties: {
                    code: {
                      id: 'code',
                      type: 'string',
                      required: true,
                      pattern: '200'
                    },
                    reasonPhrase: {
                      id: 'code',
                      type: 'string',
                      required: true,
                      pattern: 'OK'
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  var validation = revalidator.validate(response, queryContextJSONSchema);
  if (validation.valid) {
    return process.nextTick(callback);
  } else {
    var err = new caErrors.BadService(serviceId);
    return process.nextTick(callback.bind(null, err));
  }
}

/**
 * Returns a service descriptor based on a service unique identifier
 * @param {object} request The received updateContext request
 * @param {object} operationDescriptor The operation descriptor associated to the request
 * @param {function} callback Callback to be called informing of any errors or returning
 *  the required service descriptor
 */
function getServiceDescriptor(request, operationDescriptor, callback) {
  /*var payload = {
    entities: [
      {
        id: operationDescriptor.serviceId,
        type: caConfig.SERVICE_ENTITY.TYPE,
        isPattern: false,
        attributes: [
          caConfig.SERVICE_ENTITY.ENDPOINT_ATTR_NAME,
          caConfig.SERVICE_ENTITY.METHOD_ATTR_NAME,
          caConfig.SERVICE_ENTITY.AUTHENTICATION_ATTR_NAME,
          caConfig.SERVICE_ENTITY.MAPPING_ATTR_NAME,
          caConfig.SERVICE_ENTITY.TIMEOUT_ATTR_NAME
        ]
      }
    ]
  };
  sendQueryContext(
    request.headers['fiware-service'],
    request.headers['fiware-servicepath'],
    payload,
    function(err, response, body) {
      if (err) {
        return process.nextTick(callback.bind(null, err));
      }

      checkQueryContextResponse(response, operationDescriptor.serviceId, function(err) {
        if (err) {
          return process.nextTick(callback.bind(null, err));
        } else {
          var serviceDescription = {
            id: operationDescriptor.serviceId
          };
          body.contextResponses[0].contextElement.attributes.forEach(function(attribute) {
            switch (attribute.name) {
              case caConfig.SERVICE_ENTITY.ENDPOINT_ATTR_NAME:
                serviceDescription.endpoint = attribute.value;
                break;
              case caConfig.SERVICE_ENTITY.METHOD_ATTR_NAME:
                serviceDescription.method = attribute.value;
                break;
              case caConfig.SERVICE_ENTITY.AUTHENTICATION_ATTR_NAME:
                serviceDescription.authentication = attribute.value;
                break;
              case caConfig.SERVICE_ENTITY.MAPPING_ATTR_NAME:
                serviceDescription.mapping = attribute.value;
                break;
              case caConfig.SERVICE_ENTITY.TIMEOUT_ATTR_NAME:
                serviceDescription.timeout = attribute.value;
                break;
            }
          });
          request.contextAdapter.serviceDescriptor = serviceDescription;
          return process.nextTick(callback.bind(null, null, serviceDescription));
        }
      });
    }
  );*/
  var serviceDescription = {
    id: '<service-id>',
    endpoint: caConfig.THIRD_PARTY_ENDPOINT,
    method: caConfig.THIRD_PARTY_METHOD,
    authentication: '<authentication>',
    mapping: '<mapping>',
    timeout: '<timeout>'
  };
  request.contextAdapter.serviceDescriptor = serviceDescription;
  return process.nextTick(callback.bind(null, null, serviceDescription));
}

/**
 * Processes and returns the payload to be sent in the request to a Third Party
 *  based on certain service and operation descriptors
 * @param {object} serviceDescriptor The service descriptor
 * @param {object} operationDescriptor The operation descriptor
 * @return {object} The payload to be sent in the request to a Third Party
 */
function getThirdPartyPayload(serviceDescriptor, operationDescriptor) {
  var payload;
  if (operationDescriptor.action === caConfig.BUTTON_ENTITY.OPERATION_ACTION.SYNCHRONOUS) {
    // TODO For the time being we return the operation descriptor itself
    return operationDescriptor;
  } else if (operationDescriptor.action === caConfig.BUTTON_ENTITY.OPERATION_ACTION.ASYNCHRONOUS_CREATE) {
    payload = {
      operationDescriptor: operationDescriptor,
      webHook: 'http://' + caConfig.CA_HOST + ':' + caConfig.CA_PORT +
      caConfig.CA_PATH + caConfig.UPDATE_WEB_HOOK_PATH
    };
    return payload;
  }
}

/**
 * Generates the result in case of error or from the response obtained from the third party
 * @param {object} err The error, if any
 * @param {object} data The response of the third party or the initial request received from the Context Broker
 * @return {object} The generated operation result
 */
function getResult(err, data) {
  if (err) {
    // TODO For the time being we return '0,<error code>,<details>'
    return '0,' + err.code + ',' + err.message;
  } else {
    // TODO For the time being we return '1' as the result
    if (data.body && data.body.details) {
      return data.body.details.rgb || 'Default rgb';
    } else {
      return 'The Third Party responded with an unknown response format :)'
    }
  }
}

/**
 * Returns the external request id from the response received from the third party
 * @param {object} response The response received from the third party
 * @return {object} The external request id
 */
function getExternalRequestId(response) {
  // TODO For the time being we return the response received from the third party
  return response;
}

/**
 * Sends a synchronous request to the third party
 * @param {object} updateContextRequest The updateContext request received
 * @param {function} callback Callback to be called informing of any errors or returning
 *  the obtained response
 */
function sendThirdPartyRequest(updateContextRequest, callback) {
  /*request({
    method: updateContextRequest.contextAdapter.serviceDescriptor.method,
    uri: updateContextRequest.contextAdapter.serviceDescriptor.endpoint +
          (updateContextRequest.contextAdapter.serviceDescriptor.mapping.path || ''),
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Fiware-Service': updateContextRequest.headers['fiware-service'],
      'Fiware-ServicePath': updateContextRequest.headers['fiware-servicepath']
    },
    json: true,
    body: getThirdPartyPayload(updateContextRequest.contextAdapter.serviceDescriptor,
            updateContextRequest.contextAdapter.operationDescriptor)
  }, callback);*/
  request({
    method: caConfig.THIRD_PARTY_METHOD,
    uri: caConfig.THIRD_PARTY_ENDPOINT,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Fiware-Service': updateContextRequest.headers['fiware-service'],
      'Fiware-ServicePath': updateContextRequest.headers['fiware-servicepath']
    },
    json: true,
    body: caConfig.THIRD_PARTY_PAYLOAD
  }, callback);
}

/**
 * Sends a operation in progress notification to the Context Broker
 * @param {object} request The updateContext request received
 * @param {object} response The response received by the third party
 * @param {function} callback Callback to be called informing of any errors or returning
 *  the result of the notification
 */
function notifyOperationInProgress(request, response, callback) {
  var payload = {
    contextElements: [
      {
        id: request.contextAdapter.operationDescriptor.buttonId,
        type: caConfig.BUTTON_ENTITY.TYPE,
        isPattern: false,
        attributes: [
          {
            name: caConfig.BUTTON_ENTITY.EXTERNAL_ID_ATTR_NAME,
            type: caConfig.ATTRIBUTE_TYPE.STRING,
            value: getExternalRequestId(response)
          },
          {
            name: caConfig.BUTTON_ENTITY.OPERATION_STATUS_ATTR_NAME,
            type: caConfig.ATTRIBUTE_TYPE.STRING,
            value: caConfig.BUTTON_ENTITY.OPERATION_STATUS.IN_PROGRESS
          }
        ]
      }
    ],
    updateAction: 'UPDATE'
  };
  sendUpdateContext(
    request.headers['fiware-service'],
    request.headers['fiware-servicepath'],
    payload,
    callback
  );
}

/**
 * Sends a operation completed notification to the Context Broker
 * @param {object} request The updateContext request received by the Context Adapter
 *   or the update request received from a third party. In the latter case and until
 *   further specified, the request's payload should contain the associated operation descriptor
 * @param {object} response The response received by the third party if the request is
 *  an updateContext request, null if the request is an update request sent by a third party.
 * @param {function} callback Callback to be called informing of any errors or returning
 *  the result of the notification
 */
function notifyOperationCompleted(request, response, callback) {
  var payload = {
    contextElements: [
      {
        id: response ? request.contextAdapter.operationDescriptor.buttonId :
              request.payload.buttonId,
        type: caConfig.BUTTON_ENTITY.TYPE,
        isPattern: false,
        attributes: [
          {
            name: caConfig.BUTTON_ENTITY.OPERATION_STATUS_ATTR_NAME,
            type: caConfig.ATTRIBUTE_TYPE.STRING,
            value: caConfig.BUTTON_ENTITY.OPERATION_STATUS.COMPLETED
          },
          /*{
            name: caConfig.BUTTON_ENTITY.IOTA_OPERATION_STATUS_ATTR_NAME,
            type: caConfig.ATTRIBUTE_TYPE.STRING,
            value: caConfig.BUTTON_ENTITY.OPERATION_STATUS.COMPLETED
          },*/
          {
            name: caConfig.BUTTON_ENTITY.OPERATION_RESULT_ATTR_NAME,
            type: caConfig.ATTRIBUTE_TYPE.STRING,
            value: getResult(null, response || request)
          },
          {
            name: caConfig.BUTTON_ENTITY.IOTA_OPERATION_RESULT_ATTR_NAME,
            type: caConfig.ATTRIBUTE_TYPE.STRING,
            value: getResult(null, response || request)
          }
        ]
      }
    ],
    updateAction: 'UPDATE'
  };
  sendUpdateContext(
    request.headers['fiware-service'],
    request.headers['fiware-servicepath'],
    payload,
    callback
  );
}

/**
 * Sends a operation closed notification to the Context Broker
 * @param {object} err The error which caused the request to be cancelled and closed
 * @param {request} request The received updateContext request
 * @param {function} callback Callback to be called informing of any errors or returning
 *  the result of the notification
 */
function notifyOperationClosed(err, request, callback) {
  var payload = {
    contextElements: [
      {
        id: request.contextAdapter.operationDescriptor.buttonId,
        type: caConfig.BUTTON_ENTITY.TYPE,
        isPattern: false,
        attributes: [
          {
            name: caConfig.BUTTON_ENTITY.OPERATION_STATUS_ATTR_NAME,
            type: caConfig.ATTRIBUTE_TYPE.STRING,
            value: caConfig.BUTTON_ENTITY.OPERATION_STATUS.CLOSED
          },
          {
            name: caConfig.BUTTON_ENTITY.IOTA_OPERATION_STATUS_ATTR_NAME,
            type: caConfig.ATTRIBUTE_TYPE.STRING,
            value: caConfig.BUTTON_ENTITY.OPERATION_STATUS.CLOSED
          },
          {
            name: caConfig.BUTTON_ENTITY.OPERATION_RESULT_ATTR_NAME,
            type: caConfig.ATTRIBUTE_TYPE.STRING,
            value: getResult(err)
          },
          {
            name: caConfig.BUTTON_ENTITY.IOTA_OPERATION_RESULT_ATTR_NAME,
            type: caConfig.ATTRIBUTE_TYPE.STRING,
            value: getResult(err)
          }
        ]
      }
    ],
    updateAction: 'UPDATE'
  };
  sendUpdateContext(
    request.headers['fiware-service'],
    request.headers['fiware-servicepath'],
    payload,
    callback
  );
}

/**
 * Returns the NGSI response for an updateContext request based on the
 *  request itself and on the existence of any error during its processing
 * @param {object} err The error when processing the request, if any
 * @param {object} request The updateContext request
 * @return {object} The composed response
 */
function getNGSIResponse(err, request) {
  var response = {
    contextResponses: []
  };
  var statusCode;
  if (err) {
    statusCode = {
      code: '400',
      reasonPhrase: err.code + ' - ' + err.message
    };
  } else {
    statusCode = {
      code: '200',
      reasonPhrase: 'OK'
    };
  }
  if (request.payload && request.payload.contextElements) {
    request.payload.contextElements.forEach(function(contextElement) {
      var entry = {
        contextElement: contextElement,
        statusCode: statusCode
      };
      response.contextResponses.push(entry);
    });
  } else {
    response.contextResponses.push({
      statusCode: statusCode
    });
  }
  return response;
}

/**
 * Properties and functions exported by the module
 * @type {{getUnicaCorrelator: getUnicaCorrelator, getTransactionId: getTransactionId,
 * getOperationType: getOperationType, getVersion: getVersion, getAttributeValue: getAttributeValue,
 * setAttribute: setAttribute, removeAttribute: removeAttribute, getNGSIResponse: getNGSIResponse,
 * getServiceDescriptor: getServiceDescriptor, getOperationDescriptor: getOperationDescriptor,
 * sendThirdPartyRequest: sendThirdPartyRequest, notifyOperationInProgress: notifyOperationInProgress,
 * notifyOperationCompleted: notifyOperationCompleted, notifyOperationClosed: notifyOperationClosed,
 * getResult: getResult, getExternalRequestId: getExternalRequestId}}
 */
module.exports = {
  getUnicaCorrelator: getUnicaCorrelator,
  getTransactionId: getTransactionId,
  getOperationType: getOperationType,
  getVersion: getVersion,
  getAttributeValue: getAttributeValue,
  setAttribute: setAttribute,
  removeAttribute: removeAttribute,
  getNGSIResponse: getNGSIResponse,
  getServiceDescriptor: getServiceDescriptor,
  getOperationDescriptor: getOperationDescriptor,
  sendThirdPartyRequest: sendThirdPartyRequest,
  notifyOperationInProgress: notifyOperationInProgress,
  notifyOperationCompleted: notifyOperationCompleted,
  notifyOperationClosed: notifyOperationClosed,
  getResult: getResult,
  getExternalRequestId: getExternalRequestId
};
