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

/**
 * The Context Adapter supports 2 ways of configuration:
 *  1. Via environment variables.
 *  2. Vía de config.js file found in the root of the application
 * Any of the supported configuration options can be configured using any of these 2 means.
 * Anyhow, it is important to note that environment variables take precedence over configuration
 *  using the config.js file in case of collisions.
 */
'use strict';

var config = require('../config.js');

var ENV = process.env;

/**
 * Constants exported by the module
 * @type {{ATTRIBUTE_TYPE: {STRING: string}, BUTTON_ENTITY: {TYPE: string, EXTERNAL_ID_ATTR_NAME: string,
 *  CA_EXTERNAL_ID_ATTR_NAME: string, CA_SERVICE_ID_ATTR_NAME: string, CA_OPERATION_ACTION_ATTR_NAME: string,
 *  OPERATION_ACTION: {SYNCHRONOUS: string, ASYNCHRONOUS_CREATE: string}, CA_OPERATION_EXTRA_ATTR_NAME: string,
 *  OPERATION_STATUS_ATTR_NAME: string, IOTA_OPERATION_STATUS_ATTR_NAME: string, CA_OPERATION_STATUS_ATTR_NAME: string,
 *  OPERATION_STATUS: {IN_PROGRESS: string, CLOSED: string, COMPLETED: string}, OPERATION_RESULT_ATTR_NAME: string,
 *  IOTA_OPERATION_RESULT_ATTR_NAME: string, CA_OPERATION_RESULT_ATTR_NAME: string}, SERVICE_ENTITY: {TYPE: string,
 *  ENDPOINT_ATTR_NAME: string, METHOD_ATTR_NAME: string, AUTHENTICATION_ATTR_NAME: string, MAPPING_ATTR_NAME: string,
 *  TIMEOUT_ATTR_NAME: string}, UPDATE_WEB_HOOK_PATH: string, UNICA_CORRELATOR_HEADER: string,
 *  UNICA_CORRELATOR: {NOT_AVAILABLE: string}, OPERATION_TYPE_PREFIX: string, TRANSACTION_ID: {NOT_AVAILABLE: string},
 *  OPERATION_TYPE: {NOT_AVAILABLE: string, STARTUP: string, SHUTDOWN: string, SERVER_START: string,
 *  SERVER_LOG: string, SERVER_STOP: string}}}
 */
module.exports = {
  ATTRIBUTE_TYPE: {
    STRING: 'string'
  },
  BUTTON_ENTITY: {
    TYPE: 'BlackButton',
    EXTERNAL_ID_ATTR_NAME: 'external_id',
    CA_EXTERNAL_ID_ATTR_NAME: 'aux_external_id',
    CA_SERVICE_ID_ATTR_NAME: 'aux_service_id',
    CA_OPERATION_ACTION_ATTR_NAME: 'aux_op_action',
    OPERATION_ACTION: {
      SYNCHRONOUS: 'S',
      ASYNCHRONOUS_CREATE: 'C'
    },
    CA_OPERATION_EXTRA_ATTR_NAME: 'aux_op_extra',
    OPERATION_STATUS_ATTR_NAME: 'op_status',
    IOTA_OPERATION_STATUS_ATTR_NAME: 'lazy_op_status',
    CA_OPERATION_STATUS_ATTR_NAME: 'aux_op_status',
    OPERATION_STATUS: {
      IN_PROGRESS: 'in_progress',
      CLOSED: 'closed',
      COMPLETED: 'completed'
    },
    OPERATION_RESULT_ATTR_NAME: 'op_result',
    IOTA_OPERATION_RESULT_ATTR_NAME: 'lazy_op_result',
    CA_OPERATION_RESULT_ATTR_NAME: 'aux_op_result'
  },
  SERVICE_ENTITY: {
    TYPE: 'service',
    ENDPOINT_ATTR_NAME: 'endpoint',
    METHOD_ATTR_NAME: 'method',
    AUTHENTICATION_ATTR_NAME: 'authentication',
    MAPPING_ATTR_NAME: 'mapping',
    TIMEOUT_ATTR_NAME: 'timeout'
  },
  UPDATE_WEB_HOOK_PATH: '/update',
  UNICA_CORRELATOR_HEADER: 'unica-correlator',
  UNICA_CORRELATOR: {
    NOT_AVAILABLE: 'NA'
  },
  OPERATION_TYPE_PREFIX: 'OP_CA_',
  TRANSACTION_ID: {
    NOT_AVAILABLE: 'NA'
  },
  OPERATION_TYPE: {
    NOT_AVAILABLE: 'NA',
    STARTUP: 'OP_CA_STARTUP',
    SHUTDOWN: 'OP_CA_SHUTDOWN',
    SERVER_START: 'OP_CA_SERVER_START',
    SERVER_LOG: 'OP_CA_SERVER_LOG',
    SERVER_STOP: 'OP_CA_SERVER_STOP'
  }
};

/**
 * Log level configuration property exported by the module
 * @type {string|*}
 */
module.exports.LOGOPS_LEVEL = ENV.LOGOPS_LEVEL || config.logging.level || 'INFO';
if (!isNaN(ENV.PROOF_OF_LIFE_INTERVAL)) {
  /**
   * Proof of life interval configuration property
   * @type {*|string}
   */
  module.exports.PROOF_OF_LIFE_INTERVAL = ENV.PROOF_OF_LIFE_INTERVAL;
} else if (config.logging && !isNaN(config.logging.proofOfLifeInterval)) {
  /**
   * Proof of life interval configuration property
   * @type {*|string}
   */
  module.exports.PROOF_OF_LIFE_INTERVAL = config.logging.proofOfLifeInterval;
} else {
  /**
   * Proof of life interval configuration property
   * @type {*|string}
   */
  module.exports.PROOF_OF_LIFE_INTERVAL = '60';
}

/**
 * Context Broker host configuration property exported by the module
 * @type {*|string}
 */
module.exports.CB_HOST = ENV.CB_HOST || (config.contextBroker && config.contextBroker.host) || 'localhost';
if (!isNaN(ENV.CB_PORT)) {
  /**
   * Context Broker port configuration property exported by the module
   * @type {Number}
   */
  module.exports.CB_PORT = parseInt(ENV.CB_PORT, 10);
} else if (config.contextBroker && !isNaN(config.contextBroker.port)) {
  /**
   * Context Broker port configuration property exported by the module
   * @type {Number}
   */
  module.exports.CB_PORT = parseInt(config.contextBroker.port, 10);
} else {
  /**
   * Context Broker port configuration property exported by the module
   * @type {number}
   */
  module.exports.CB_PORT = 1026;
}
if (ENV.CB_PATH && ENV.CB_PATH.charAt(0) === '/') {
  /**
   * Context Broker path configuration property exported by the module
   * @type {*|string}
   */
  module.exports.CB_PATH = ENV.CB_PATH;
} else if (config.contextBroker && config.contextBroker.path && config.contextBroker.path.charAt(0) === '/') {
  /**
   * Context Broker path configuration property exported by the module
   * @type {string}
   */
  module.exports.CB_PATH = config.contextBroker.path;
} else {
  /**
   * Context Broker path configuration property exported by the module
   * @type {string}
   */
  module.exports.CB_PATH = '/v1';
}

/**
 * Default service configuration property exported by the module
 * @type {string|*}
 */
module.exports.DEFAULT_SERVICE = ENV.DEFAULT_SERVICE || config.server.defaultService || 'blackbutton';
/**
 * Default service path configuration property exported by the module
 * @type {*|string}
 */
module.exports.DEFAULT_SERVICE_PATH = ENV.DEFAULT_SERVICE_PATH ||
  (config.server && config.server.defaultServicePath) || '/';

/**
 * Context Adapter host configuration property exported by the module
 * @type {string|*}
 */
module.exports.CA_HOST = ENV.CA_HOST || config.server.host || 'localhost';
if (!isNaN(ENV.CA_PORT)) {
  /**
   * Context Adapter port configuration property exported by the module
   * @type {Number}
   */
  module.exports.CA_PORT = parseInt(ENV.CA_PORT, 10);
} else if (config.server && !isNaN(config.server.port)) {
  /**
   * Context Adapter port configuration property exported by the module
   * @type {Number}
   */
  module.exports.CA_PORT = parseInt(config.server.port, 10);
} else {
  /**
   * Context Adapter port configuration property exported by the module
   * @type {number}
   */
  module.exports.CA_PORT = 9999;
}
if (ENV.CA_PATH && ENV.CA_PATH.charAt(0) === '/') {
  /**
   * Context Adapter path configuration property exported by the module
   * @type {*|string}
   */
  module.exports.CA_PATH = ENV.CA_PATH;
} else if (config.server && config.server.path && config.server.path.charAt(0) === '/') {
  /**
   * Context Adapter path configuration property exported by the module
   * @type {string}
   */
  module.exports.CA_PATH = config.server.path;
} else {
  /**
   * Context Adapter path configuration property exported by the module
   * @type {string}
   */
  module.exports.CA_PATH = '/v1';
}

module.exports.THIRD_PARTY_METHOD = config.thirdParty.method;
module.exports.THIRD_PARTY_ENDPOINT = config.thirdParty.endpoint;
module.exports.THIRD_PARTY_PAYLOAD = config.thirdParty.payload;
module.exports.THIRD_PARTY_NOTIFICATION_DELAY = config.thirdParty.notificationDelay;
