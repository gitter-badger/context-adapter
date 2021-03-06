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

var contextAdapter = require('../../lib/context_adapter');
var caConfig = require('../../lib/context_adapter_configuration');
var caHelper = require('../../lib/context_adapter_helper');
var testHelper = require('./context_adapter_test_helper');
var hapi = require('hapi');
var request = require('request');

console.log('*** Running the Context Adapter unit tests with the following configuration:');
console.log(caConfig);

describe('Context Adapter server:', function() {
  it('should stop the Context Adapter although not started:', function(done) {
    contextAdapter.stop(function(err) {
      expect(err).to.equal(undefined);
      done();
    });
  });

  it('should start the Context Adapter:', function(done) {
    contextAdapter.start(function(err) {
      expect(err).to.equal(undefined);
      expect(contextAdapter.server.hapiServer).to.be.an.instanceof(hapi.Server);
      done();
    });
  });

  it ('should stop the Context Adapter when started:', function(done) {
    contextAdapter.stop(function(err) {
      expect(err).to.equal(undefined);
      expect(contextAdapter.server.hapiServer.info.started).to.equal(0);
      done();
    });
  });

  it('should stop the Context Adapter server although not started', function(done) {
    contextAdapter.server.stop(function(err) {
      expect(err).to.equal(undefined);
      done();
    });
  });

  it('should start the Context Adapter server', function(done) {
    contextAdapter.server.start(caConfig.CA_HOST, caConfig.CA_PORT, function(err, hapiServer) {
      expect(err).to.equal(undefined);
      expect(hapiServer).to.be.an.instanceof(hapi.Server);
      expect(hapiServer).to.be.equal(contextAdapter.server.hapiServer);
      done();
    });
  });

  describe('HTTP methods:', function() {
    it('should respond with 404 - Not Found if invalid HTTP method', function(done) {
      request(
        testHelper.getRequestOptions(
          {
            method: 'PUT'
          }
        ),
        function(err, response, body) {
          expect(err).to.equal(null);
          expect(response.statusCode).to.equal(404);
          expect(body.statusCode).to.equal(404);
          expect(body.error).to.equal('Not Found');
          done();
        }
      );
    });

  });

  describe('Headers:', function() {
    it('should respond with 400 - Bad Request if missing Fiware-Service header', function(done) {
      request(
        testHelper.getRequestOptions(
          {
            headers: ['Fiware-Service']
          }
        ),
        function(err, response, body) {
          expect(err).to.equal(null);
          expect(response.statusCode).to.equal(400);
          expect(body.statusCode).to.equal(400);
          expect(body.error).to.equal('Bad Request');
          done();
        }
      );
    });

    it('should respond with 400 - Bad Request if missing Fiware-ServicePath header', function(done) {
      request(
        testHelper.getRequestOptions(
          {
            headers: ['Fiware-ServicePath']
          }
        ),
        function(err, response, body) {
          expect(err).to.equal(null);
          expect(response.statusCode).to.equal(400);
          expect(body.statusCode).to.equal(400);
          expect(body.error).to.equal('Bad Request');
          done();
        }
      );
    });
  });

  describe('Routes:', function() {
    it('should respond with 404 - Not Found if invalid route', function(done) {
      request(
        testHelper.getRequestOptions(
          {
            uri: 'http://' + caConfig.CA_HOST + ':' + caConfig.CA_PORT +
            caConfig.CA_PATH + '/invalidPath'
          }
        ),
        function(err, response, body) {
          expect(err).to.equal(null);
          expect(response.statusCode).to.equal(404);
          expect(body.statusCode).to.equal(404);
          expect(body.error).to.equal('Not Found');
          done();
        }
      );
    });
  });

  describe('updateContext requests:', function() {
    it('should respond with a 400 code and BAD_PAYLOAD reasonPhrase if empty payload', function(done) {
      request(
        testHelper.getRequestOptions(),
        function(err, response, body) {
          expect(err).to.equal(null);
          expect(response.statusCode).to.equal(200);
          expect(body.contextResponses[0].statusCode.code).to.equal('400');
          expect(body.contextResponses[0].statusCode.reasonPhrase.indexOf('BAD_PAYLOAD')).to.equal(0);
          done();
        }
      );
    });

    it('should respond with a 400 code and BAD_PAYLOAD reasonPhrase if no contextElement\'s id',
      function(done) {
        request(
          testHelper.getRequestOptions(
            {
              body: testHelper.getUpdateContextPayload({
                contextElements: {
                  id: false
                }
              })
            }
          ),
          function(err, response, body) {
            expect(err).to.equal(null);
            expect(response.statusCode).to.equal(200);
            expect(body.contextResponses[0].statusCode.code).to.equal('400');
            expect(body.contextResponses[0].statusCode.reasonPhrase.indexOf('BAD_PAYLOAD')).to.equal(0);
            done();
          }
        );
      });

    it('should respond with a 400 code and BAD_PAYLOAD reasonPhrase if no contextElement\'s type',
      function(done) {
        request(
          testHelper.getRequestOptions(
            {
              body: testHelper.getUpdateContextPayload({
                contextElements: {
                  type: false
                }
              })
            }
          ),
          function(err, response, body) {
            expect(err).to.equal(null);
            expect(response.statusCode).to.equal(200);
            expect(body.contextResponses[0].statusCode.code).to.equal('400');
            expect(body.contextResponses[0].statusCode.reasonPhrase.indexOf('BAD_PAYLOAD')).to.equal(0);
            done();
          }
        );
      });

    it('should respond with a 400 code and BAD_PAYLOAD reasonPhrase if no contextElement\'s isPattern',
      function(done) {
        request(
          testHelper.getRequestOptions(
            {
              body: testHelper.getUpdateContextPayload({
                contextElements: {
                  isPattern: false
                }
              })
            }
          ),
          function(err, response, body) {
            expect(err).to.equal(null);
            expect(response.statusCode).to.equal(200);
            expect(body.contextResponses[0].statusCode.code).to.equal('400');
            expect(body.contextResponses[0].statusCode.reasonPhrase.indexOf('BAD_PAYLOAD')).to.equal(0);
            done();
          }
        );
      });

    it('should respond with a 400 code and BAD_PAYLOAD reasonPhrase if no contextElement\'s ' +
      caConfig.BUTTON_ENTITY.CA_INTERACTION_TYPE_ATTR_NAME + ' attribute', function(done) {
      request(
        testHelper.getRequestOptions(
          {
            body: testHelper.getUpdateContextPayload({
              contextElements: {
                attributes: [caConfig.BUTTON_ENTITY.CA_INTERACTION_TYPE_ATTR_NAME]
              }
            })
          }
        ),
        function(err, response, body) {
          expect(err).to.equal(null);
          expect(response.statusCode).to.equal(200);
          expect(body.contextResponses[0].statusCode.code).to.equal('400');
          expect(body.contextResponses[0].statusCode.reasonPhrase.indexOf('BAD_PAYLOAD')).to.equal(0);
          done();
        }
      );
    });

    it('should respond with a 400 code and BAD_PAYLOAD reasonPhrase if no contextElement\'s ' +
      caConfig.BUTTON_ENTITY.CA_SERVICE_ID_ATTR_NAME + ' attribute', function(done) {
      request(
        testHelper.getRequestOptions(
          {
            body: testHelper.getUpdateContextPayload({
              contextElements: {
                attributes: [caConfig.BUTTON_ENTITY.CA_SERVICE_ID_ATTR_NAME]
              }
            })
          }
        ),
        function(err, response, body) {
          expect(err).to.equal(null);
          expect(response.statusCode).to.equal(200);
          expect(body.contextResponses[0].statusCode.code).to.equal('400');
          expect(body.contextResponses[0].statusCode.reasonPhrase.indexOf('BAD_PAYLOAD')).to.equal(0);
          done();
        }
      );
    });

    it('should respond with a 400 code and BAD_PAYLOAD reasonPhrase if no contextElement\'s ' +
      caConfig.BUTTON_ENTITY.CA_OPERATION_ACTION_ATTR_NAME + ' attribute', function(done) {
      request(
        testHelper.getRequestOptions(
          {
            body: testHelper.getUpdateContextPayload({
              contextElements: {
                attributes: [caConfig.BUTTON_ENTITY.CA_OPERATION_ACTION_ATTR_NAME]
              }
            })
          }
        ),
        function(err, response, body) {
          expect(err).to.equal(null);
          expect(response.statusCode).to.equal(200);
          expect(body.contextResponses[0].statusCode.code).to.equal('400');
          expect(body.contextResponses[0].statusCode.reasonPhrase.indexOf('BAD_PAYLOAD')).to.equal(0);
          done();
        }
      );
    });

    it('should respond with a 400 code and BAD_PAYLOAD reasonPhrase if no contextElement\'s ' +
      caConfig.BUTTON_ENTITY.CA_OPERATION_EXTRA_ATTR_NAME + ' attribute', function(done) {
      var updateContextPayload = testHelper.getUpdateContextPayload({
        contextElements: {
          attributes: [caConfig.BUTTON_ENTITY.CA_OPERATION_EXTRA_ATTR_NAME]
        }
      });
      caHelper.setAttribute(
        updateContextPayload.contextElements[0].attributes,
        caConfig.BUTTON_ENTITY.CA_INTERACTION_TYPE_ATTR_NAME,
        caConfig.BUTTON_ENTITY.INTERACTION_TYPES.SYNCHRONOUS
      );

      request(
        testHelper.getRequestOptions(
          {
            body: updateContextPayload
          }
        ),
        function(err, response, body) {
          expect(err).to.equal(null);
          expect(response.statusCode).to.equal(200);
          expect(body.contextResponses[0].statusCode.code).to.equal('400');
          expect(body.contextResponses[0].statusCode.reasonPhrase.indexOf('BAD_PAYLOAD')).to.equal(0);
          done();
        }
      );
    });

    it('should respond with a 200 code and OK reasonPhrase if no contextElement\'s ' +
      caConfig.BUTTON_ENTITY.CA_OPERATION_STATUS_ATTR_NAME + ' attribute and synchronous ' +
      'button operation', function(done) {
      var updateContextPayload = testHelper.getUpdateContextPayload({
        contextElements: {
          attributes: [caConfig.BUTTON_ENTITY.CA_OPERATION_STATUS_ATTR_NAME]
        }
      });
      caHelper.setAttribute(
        updateContextPayload.contextElements[0].attributes,
        caConfig.BUTTON_ENTITY.CA_INTERACTION_TYPE_ATTR_NAME,
        caConfig.BUTTON_ENTITY.INTERACTION_TYPES.SYNCHRONOUS
      );

      request(
        testHelper.getRequestOptions(
          {
            body: updateContextPayload
          }
        ),
        function(err, response, body) {
          expect(err).to.equal(null);
          expect(response.statusCode).to.equal(200);
          expect(body.contextResponses[0].statusCode.code).to.equal('200');
          expect(body.contextResponses[0].statusCode.reasonPhrase).to.equal('OK');
          done();
        }
      );
    });

    it('should respond with a 400 code and BAD_PAYLOAD reasonPhrase if no contextElement\'s ' +
      caConfig.BUTTON_ENTITY.CA_OPERATION_STATUS_ATTR_NAME + ' attribute and asynchronous ' +
      'button operation',  function(done) {
      var updateContextPayload = testHelper.getUpdateContextPayload({
        contextElements: {
          attributes: [caConfig.BUTTON_ENTITY.CA_OPERATION_STATUS_ATTR_NAME]
        }
      });
      caHelper.setAttribute(
        updateContextPayload.contextElements[0].attributes,
        caConfig.BUTTON_ENTITY.CA_INTERACTION_TYPE_ATTR_NAME,
        caConfig.BUTTON_ENTITY.INTERACTION_TYPES.ASYNCHRONOUS
      );

      request(
        testHelper.getRequestOptions(
          {
            body: updateContextPayload
          }
        ),
        function(err, response, body) {
          expect(err).to.equal(null);
          expect(response.statusCode).to.equal(200);
          expect(body.contextResponses[0].statusCode.code).to.equal('400');
          expect(body.contextResponses[0].statusCode.reasonPhrase.indexOf('BAD_PAYLOAD')).to.equal(0);
          done();
        }
      );
    });

    describe('Synchronous button operation requests:', function() {
      var updateContextPayload = testHelper.getUpdateContextPayload();

      beforeEach(function() {
        caHelper.setAttribute(
          updateContextPayload.contextElements[0].attributes,
          caConfig.BUTTON_ENTITY.CA_INTERACTION_TYPE_ATTR_NAME,
          caConfig.BUTTON_ENTITY.INTERACTION_TYPES.SYNCHRONOUS);
      });

      describe('Synchronous third party service:',
        testHelper.operationTestSuite.bind(
          null,
          updateContextPayload,
          caConfig.SERVICE_ENTITY.INTERACTION_TYPES.SYNCHRONOUS
        )
      );

      describe('Asynchronous third party service:',
        testHelper.operationTestSuite.bind(
          null,
          updateContextPayload,
          caConfig.SERVICE_ENTITY.INTERACTION_TYPES.ASYNCHRONOUS
        )
      );
    });

    describe('Asynchronous button operation requests:', function() {
      var updateContextPayload = testHelper.getUpdateContextPayload();

      beforeEach(function() {
        caHelper.setAttribute(
          updateContextPayload.contextElements[0].attributes,
          caConfig.BUTTON_ENTITY.CA_INTERACTION_TYPE_ATTR_NAME,
          caConfig.BUTTON_ENTITY.INTERACTION_TYPES.ASYNCHRONOUS);
      });

      describe('Synchronous third party service:',
        testHelper.operationTestSuite.bind(
          null,
          updateContextPayload,
          caConfig.SERVICE_ENTITY.INTERACTION_TYPES.SYNCHRONOUS
        )
      );

      describe('Asynchronous third party service:',
        testHelper.operationTestSuite.bind(
          null,
          updateContextPayload,
          caConfig.SERVICE_ENTITY.INTERACTION_TYPES.ASYNCHRONOUS
        )
      );
    });
  });
});
