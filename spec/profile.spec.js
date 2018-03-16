/**
 * @author:    Index Exchange
 * @license:   UNLICENSED
 *
 * @copyright: Copyright (C) 2017 by Index Exchange. All rights reserved.
 *
 * The information contained within this document is confidential, copyrighted
 *  and or a trade secret. No part of this document may be reproduced or
 * distributed in any form or by any means, in whole or in part, without the
 * prior written permission of Index Exchange.
 */
// jshint ignore: start

'use strict';

/* =====================================
 * Utilities
 * ---------------------------------- */


/* =====================================
 * Testing
 * ---------------------------------- */

describe('Partner Profile', function () {

    /* Setup and Library Stub
     * ------------------------------------------------------------- */
    var inspector = require('schema-inspector'),
    proxyquire = require('proxyquire').noCallThru(),
    libraryStubData = require('./support/libraryStubData.js'),
    partnerModule = proxyquire('../pub-matic-htb.js', libraryStubData),
    partnerConfig = require('./support/mockPartnerConfig.json'),
    expect = require('chai').expect,
    consts = libraryStubData['constants.js'],
    /* -------------------------------------------------------------------- */

    /* Instantiate your partner module */
    partnerModule = partnerModule(partnerConfig),
    partnerProfile = partnerModule.profile,

    /* partner module profile tests */
    profile = partnerProfile;

    /* Simple type checking on the returned objects, should always pass */
    it('should be configured correctly', function () {
        var result = inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                partnerId: {
                    type: 'string',
                    eq: consts.PUBMATIC_PARTNER_ID
                },
                namespace: {
                    type: 'string',
                    eq: profile.partnerId
                },
                statsId: {
                    type: 'string',
                    eq: 'PUBM'
                },
                version: {
                    type: 'string',
                    eq: '2.1.0'
                },
                targetingType: {
                    type: 'string',
                    eq: consts.SLOT
                },
                enabledAnalytics: {
                    type: 'object',
                    properties: {
                        '*': {
                            type: 'boolean'
                        }
                    }
                },
                features: {
                    type: 'object',
                    properties: {
                        '*': {
                            type: 'object',
                            strict: true,
                            properties: {
                                enabled: {
                                    type: 'boolean'
                                },
                                value: {
                                    type: 'any'
                                }
                            }
                        }
                    }
                },
                targetingKeys: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            exec: function (schema, post) {
                                var targetingSplit = post.split('_');

                                if (targetingSplit[0] !== 'ix' ||
                                    targetingSplit[1] !== profile.statsId.toLowerCase() ||
                                    targetingSplit[2] !== 'id') {
                                    this.report('id targeting key should be of the format ix_{PUBM}_id')
                                }
                            }
                        },
                        om: {
                            type: 'string',
                            exec: function (schema, post) {
                                var targetingSplit = post.split('_');

                                if (targetingSplit[0] !== 'ix' ||
                                    targetingSplit[1] !== profile.statsId.toLowerCase() ||
                                    targetingSplit[2] !== 'cpm') {
                                    this.report('om targeting key should be of the format ix_PUBM_cpm')
                                }
                            }
                        },
                        pm: {
                            type: 'string',
                            exec: function (schema, post) {
                                var targetingSplit = post.split('_');

                                if (targetingSplit[0] !== 'ix' ||
                                    targetingSplit[1] !== profile.statsId.toLowerCase() ||
                                    targetingSplit[2] !== 'cpm') {
                                    this.report('pm targeting key should be of the format ix_PUBM_cpm')
                                }
                            }
                        },
                        pmid: {
                            type: 'string',
                            exec: function (schema, post) {
                                var targetingSplit = post.split('_');

                                if (targetingSplit[0] !== 'ix' ||
                                    targetingSplit[1] !== profile.statsId.toLowerCase() ||
                                    targetingSplit[2] !== 'dealid') {
                                    this.report('pmid targeting key should be of the format ix_PUBM_dealid')
                                }
                            }
                        }
                    }
                },
                bidUnitInCents: {
                    type: 'number',
                    gt: 0,
                    exec: function (schema, post) {
                        if ((post > 1 && post % 10 !== 0) || (post < 1 && !/^0\.0*1$/.test(post.toString()))) {
                            this.report('bidUnitInCents should be a multiple of 10')
                        }
                    }
                },
                lineItemType: {
                    type: 'integer',
                    eq: 0
                },
                callbackType: {
                    type: 'integer',
                    eq: [0, 1, 2]
                },
                architecture: {
                    type: 'integer',
                    eq: [0, 1, 2]
                },
                requestType: {
                    type: 'integer',
                    eq: [0, 1, 2]
                }
            }
        }, profile);
        expect(result.valid, result.format()).to.be.true;
    });
});