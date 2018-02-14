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

/**
 * Returns an array of parcels based on all of the xSlot/htSlot combinations defined
 * in the partnerConfig (simulates a session in which all of them were requested).
 *
 * @param {object} profile
 * @param {object} partnerConfig
 * @returns []
 */
function generateReturnParcels(profile, partnerConfig) {
    var returnParcels = [],
        htSlotName,
        xSlotsArray,
        htSlot,
        xSlotName,
        i,
        utils = require('./support/libraryStubData.js'),
        system = utils['system.js'];

    for (htSlotName in partnerConfig.mapping) {
        xSlotsArray = partnerConfig.mapping[htSlotName];
        htSlot = {
            id: htSlotName,
            getId: function () {
                return this.id;
            }
        }
        for (i = 0; i < xSlotsArray.length; i++) {
            xSlotName = xSlotsArray[i];
            returnParcels.push({
                partnerId: profile.partnerId,
                htSlot: htSlot,
                ref: "", // how is this populated?
                xSlotName: xSlotName,
                xSlotRef: partnerConfig.xSlots[xSlotName],
                requestId: system.generateUniqueId(),
            });
        }
    }
    return returnParcels;
}

/* =====================================
 * Testing
 * ---------------------------------- */

describe('parseResponse', function () {

    /* Setup and Library Stub
     * ------------------------------------------------------------- */
    var inspector = require('schema-inspector');
    var proxyquire = require('proxyquire').noCallThru();
    var libraryStubData = require('./support/libraryStubData.js');
    var partnerModule = proxyquire('../pub-matic-htb.js', libraryStubData);
    var partnerConfig = require('./support/mockPartnerConfig.json');
    var responseData = require('./support/mockResponseData.json');
    var expect = require('chai').expect;
    var Size = libraryStubData['size.js'];
    var BidTransformer = libraryStubData['bid-transformer.js'];
    /* -------------------------------------------------------------------- */

    /* Instantiate your partner module */
    var partnerModule = partnerModule(partnerConfig);
    var partnerProfile = partnerModule.profile;

    /* Generate dummy return parcels based on MRA partner profile */
    var returnParcels;
    var result, expectedValue, mockData, returnParcels;

    describe('should correctly parse bids:', function () {
        /* Simple type checking on the returned objects, should always pass */
        it('each parcel should have the required fields set', function () {
            returnParcels = generateReturnParcels(partnerModule.profile, partnerConfig);

            /* Get mock response data from our responseData file */
            mockData = responseData.bid.seatbid[0].bid;
            /* IF SRA, parse all parcels at once */
            if (partnerProfile.architecture) partnerModule.parseResponse(1, mockData, returnParcels);

            for (var i = 0; i < returnParcels.length; i++) {

                /* IF MRA, parse one parcel at a time */
                if (!partnerProfile.architecture) partnerModule.parseResponse(1, mockData[i], [returnParcels[i]]);

                var result = inspector.validate({
                    type: 'object',
                    properties: {
                        targetingType: {
                            type: 'string',
                            eq: 'slot'
                        },
                        targeting: {
                            type: 'object',
                            properties: {
                                [partnerModule.profile.targetingKeys.id]: {
                                    type: 'array',
                                    exactLength: 1,
                                    items: {
                                        type: 'string',
                                        minLength: 1
                                    }
                                },
                                [partnerModule.profile.targetingKeys.om]: {
                                    type: 'array',
                                    exactLength: 1,
                                    items: {
                                        type: 'string',
                                        minLength: 1
                                    }
                                },
                                pubKitAdId: {
                                    type: 'string',
                                    minLength: 1
                                }
                            }
                        },
                        price: {
                            type: 'number'
                        },
                        size: {
                            type: 'array',
                        },
                        adm: {
                            type: 'string',
                            minLength: 1
                        }
                    }
                }, returnParcels[i]);

                expect(result.valid, result.format()).to.be.true;
            }
        });

        /* ---------- ADD MORE TEST CASES TO TEST AGAINST REAL VALUES ------------*/
        it('each parcel should have the correct values set', function () {
            var currRp,
                currBid,
                i, j,
                __bidTransformers;
            returnParcels = generateReturnParcels(partnerModule.profile, partnerConfig);

            var bidTransformerConfigs = {
                //? if (FEATURES.GPT_LINE_ITEMS) {
                targeting: {
                    inputCentsMultiplier: 1, // Input is in cents
                    outputCentsDivisor: 1, // Output as cents
                    outputPrecision: 2, // With 0 decimal places
                    roundingType: 'FLOOR', // jshint ignore:line
                    floor: 1,
                    buckets: [{
                        max: 2000, // Up to 20 dollar (above 5 cents)
                        step: 5 // use 5 cent increments
                    }, {
                        max: 5000, // Up to 50 dollars (above 20 dollars)
                        step: 100 // use 1 dollar increments
                    }]
                },
                //? }
                //? if (FEATURES.RETURN_PRICE) {
                price: {
                    inputCentsMultiplier: 1, // Input is in cents
                    outputCentsDivisor: 1, // Output as cents
                    outputPrecision: 0, // With 0 decimal places
                    roundingType: 'NONE',
                },
                //? }
            };
            if (partnerConfig.bidTransformer) {
                //? if (FEATURES.GPT_LINE_ITEMS) {
                bidTransformerConfigs.targeting = partnerConfig.bidTransformer;
                //? }
                //? if (FEATURES.RETURN_PRICE) {
                bidTransformerConfigs.price.inputCentsMultiplier = partnerConfig.bidTransformer.inputCentsMultiplier;
                //? }
            }

            __bidTransformers = {};

            //? if (FEATURES.GPT_LINE_ITEMS) {
            __bidTransformers.targeting = BidTransformer(bidTransformerConfigs.targeting);
            //? }
            //? if (FEATURES.RETURN_PRICE) {
            __bidTransformers.price = BidTransformer(bidTransformerConfigs.price);

            /* Get mock response data from our responseData file */
            mockData = responseData.bid.seatbid[0].bid;
            /* IF SRA, parse all parcels at once */
            if (partnerProfile.architecture) partnerModule.parseResponse(1, mockData, returnParcels);

            for (i = 0; i < returnParcels.length; i++) {
                currRp = returnParcels[i];
                /* IF MRA, parse one parcel at a time */
                if (!partnerProfile.architecture) partnerModule.parseResponse(1, mockData[i], [returnParcels[i]]);

                /* Add test cases to test against each of the parcel's set fields
                 * to make sure the response was parsed correctly.
                 *
                 * The parcels have already been parsed and should contain all the
                 * necessary demand.
                 */
                for(j=0; j<mockData.length; j++) {
                    currBid = mockData[j];
                    if (currBid.impid === currRp.xSlotRef.bid_id) {
                        expect(currRp.price).to.equal(__bidTransformers.price.apply(currBid.price));
                        expect(currRp.targetingType).to.equal('slot');
                        expect(currRp.adm).to.equal(currBid.adm);
                        expect(currRp.targeting).to.not.equal(undefined);
                        expect(currRp.targeting[partnerModule.profile.targetingKeys.id][0]).to.equal(currRp.requestId);
                        var tempValue,
                            sizeKey = Size.arrayToString([currBid.w, currBid.h]),
                            bidDealId = currBid.dealid,
                            targetingCpm = __bidTransformers.targeting.apply(currBid.price),
                            bidDealId = currBid.dealid;
                        tempValue = sizeKey + "_" + targetingCpm;



                        if(bidDealId) {
                            expect(currRp.targeting[partnerModule.profile.targetingKeys.pm]).to.be.an('array').with.length.above(0);
                            expect(currRp.targeting[partnerModule.profile.targetingKeys.pm][0]).to.be(tempValue);
                            tempValue =  sizeKey + "_" + bidDealId;
                            expect(currRp.targeting[partnerModule.profile.targetingKeys.pmid]).to.be.an('array').with.length.above(0);
                            expect(currRp.targeting[partnerModule.profile.targetingKeys.pmid][0]).to.be(tempValue);    
                        } else {
                            expect(currRp.targeting[partnerModule.profile.targetingKeys.om]).to.be.an('array').with.length.above(0);
                            expect(currRp.targeting[partnerModule.profile.targetingKeys.om][0]).to.equal(tempValue);
                        }
                    }
                }
                expect(returnParcels[i]).to.exist;
            }
        });
        /* -----------------------------------------------------------------------*/
    });

    describe('should correctly parse passes: ', function () {

        return;
        it('each parcel should have the required fields set', function () {
            returnParcels = generateReturnParcels(partnerModule.profile, partnerConfig);

            /* Get mock response data from our responseData file */
            mockData = responseData.pass;

            /* IF SRA, parse all parcels at once */
            if (partnerProfile.architecture) partnerModule.parseResponse(1, mockData, returnParcels);

            for (var i = 0; i < returnParcels.length; i++) {

                /* IF MRA, parse one parcel at a time */
                if (!partnerProfile.architecture) partnerModule.parseResponse(1, mockData[i], [returnParcels[i]]);

                var result = inspector.validate({
                    type: 'object',
                    properties: {
                        pass: {
                            type: 'boolean',
                            eq: true,

                        }
                    }
                }, returnParcels[i]);

                expect(result.valid, result.format()).to.be.true;
            }
        });

        /* ---------- ADD MORE TEST CASES TO TEST AGAINST REAL VALUES ------------*/
        it('each parcel should have the correct values set', function () {
            returnParcels = generateReturnParcels(partnerModule.profile, partnerConfig);

            /* Get mock response data from our responseData file */
            mockData = responseData.pass;

            /* IF SRA, parse all parcels at once */
            if (partnerProfile.architecture) partnerModule.parseResponse(1, mockData, returnParcels);

            for (var i = 0; i < returnParcels.length; i++) {

                /* IF MRA, parse one parcel at a time */
                if (!partnerProfile.architecture) partnerModule.parseResponse(1, mockData[i], [returnParcels[i]]);

                /* Add test cases to test against each of the parcel's set fields
                 * to make sure the response was parsed correctly.
                 *
                 * The parcels have already been parsed and should contain all the
                 * necessary demand.
                 */

                expect(returnParcels[i]).to.exist;
            }
        });
        /* -----------------------------------------------------------------------*/
    });

    describe('should correctly parse deals: ', function () {

        /* Simple type checking on the returned objects, should always pass */
        it('each parcel should have the required fields set', function () {
            returnParcels = generateReturnParcels(partnerModule.profile, partnerConfig);

            /* Get mock response data from our responseData file */
            mockData = responseData.bid.seatbid[0].bid;

            /* IF SRA, parse all parcels at once */
            if (partnerProfile.architecture) partnerModule.parseResponse(1, mockData, returnParcels);

            for (var i = 0; i < returnParcels.length; i++) {
                /* IF MRA, parse one parcel at a time */
                if (!partnerProfile.architecture) partnerModule.parseResponse(1, mockData[i], [returnParcels[i]]);
                var result = inspector.validate({
                    type: 'object',
                    properties: {
                        targetingType: {
                            type: 'string',
                            eq: 'slot'
                        },
                        targeting: {
                            type: 'object',
                            properties: {
                                [partnerModule.profile.targetingKeys.id]: {
                                    type: 'array',
                                    exactLength: 1,
                                    items: {
                                        type: 'string',
                                        minLength: 1
                                    }
                                },
                                [partnerModule.profile.targetingKeys.om]: {
                                    type: 'array',
                                    exactLength: 1,
                                    items: {
                                        type: 'string',
                                        minLength: 1
                                    }
                                },
                                [partnerModule.profile.targetingKeys.pm]: {
                                    type: 'array',
                                    exactLength: 1,
                                    items: {
                                        type: 'string',
                                        minLength: 1
                                    }
                                },
                                pubKitAdId: {
                                    type: 'string',
                                    minLength: 1
                                }
                            }
                        },
                        price: {
                            type: 'number'
                        },
                        size: {
                            type: 'array',
                        },
                        adm: {
                            type: 'string',
                            minLength: 1
                        },
                    }
                }, returnParcels[i]);

                expect(result.valid, result.format()).to.be.true;
            }
        });

        /* ---------- ADD MORE TEST CASES TO TEST AGAINST REAL VALUES ------------*/
        it('each parcel should have the correct values set', function () {
            returnParcels = generateReturnParcels(partnerModule.profile, partnerConfig);

            /* Get mock response data from our responseData file */
            mockData = responseData.deals;

            /* IF SRA, parse all parcels at once */
            if (partnerProfile.architecture) partnerModule.parseResponse(1, mockData, returnParcels);

            for (var i = 0; i < returnParcels.length; i++) {

                /* IF MRA, parse one parcel at a time */
                if (!partnerProfile.architecture) partnerModule.parseResponse(1, mockData[i], [returnParcels[i]]);

                /* Add test cases to test against each of the parcel's set fields
                 * to make sure the response was parsed correctly.
                 *
                 * The parcels have already been parsed and should contain all the
                 * necessary demand.
                 */

                expect(returnParcels[i]).to.exist;
            }
        });
        /* -----------------------------------------------------------------------*/
    });

    describe('render the winning creative: ', function() {
        it('should render the winning creative', function() {
            mockData = responseData.bid.seatbid[0].bid;

            /* IF SRA, parse all parcels at once */
            if (partnerProfile.architecture) partnerModule.parseResponse(1, mockData, returnParcels);

            for (var i = 0; i < returnParcels.length; i++) {

                /* IF MRA, parse one parcel at a time */
                if (!partnerProfile.architecture) partnerModule.parseResponse(1, mockData[i], [returnParcels[i]]);

                /* Add test cases to test against each of the parcel's set fields
                 * to make sure the response was parsed correctly.
                 *
                 * The parcels have already been parsed and should contain all the
                 * necessary demand.
                 */
            }
            partnerModule.render(returnParcels[0].xSlotRef.adUnitName, returnParcels[0].adm);
        });
    });
});