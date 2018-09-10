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
        system = utils['system.js'],
        xSlotRef;

    for (htSlotName in partnerConfig.mapping) {
        xSlotsArray = partnerConfig.mapping[htSlotName];
        htSlot = {
            id: htSlotName, //htSlotID-1 / htSlotID-2
            getId: function () {
                return this.id;
            }
        }
        for (i = 0; i < xSlotsArray.length; i++) {
            xSlotName = xSlotsArray[i];
            xSlotRef = partnerConfig.xSlots[xSlotName];
            //for (var ii=0; ii<xSlotRef.sizes.length; ii++) {
                returnParcels.push({
                    partnerId: profile.partnerId,
                    htSlot: htSlot,
                    ref: "", // how is this populated?
                    xSlotName: xSlotName,
                    xSlotRef: {
                        adUnitName: xSlotRef.adUnitName,
                        sizes: xSlotRef.sizes
                    },
                    requestId: system.generateUniqueId(),
                });
            //}
        }
    }
    return returnParcels;
}

/**
 * Returns an array of adEntries based on mock response data
 *
 * @param {object[]} mockData - mock response data
 */
function getExpectedAdEntry(mockData) {
    var expectedAdEntry = [];

    for(var i = 0; i < mockData.length; i++) {
        expectedAdEntry[i] = {};

        expectedAdEntry[i].price = mockData[i].price;
        expectedAdEntry[i].dealId = mockData[i].dealid;
    }

    return expectedAdEntry;
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
    var expect = require('chai').expect;
    var Size = libraryStubData['size.js'];
    var fs = require('fs');
    var parseJson = require('parse-json');
    var path = require('path');
    var chai = require('chai');
    var sinon = require('sinon');
    var sinonChai = require("sinon-chai");
    var expect = chai.expect;
    chai.use(sinonChai);
    /* -------------------------------------------------------------------- */

    /* Instantiate your partner module */
    var partnerModule = partnerModule(partnerConfig);
    var partnerProfile = partnerModule.profile;

    /* Generate dummy return parcels based on MRA partner profile */
    var returnParcels;
    var result, expectedValue, mockData, returnParcels, responseData;
    var registerAd;

    describe('should correctly parse bids:', function () {

        beforeEach(function () {
            /* spy on RenderService.registerAd function, so that we can test it is called */
            registerAd = sinon.spy(libraryStubData["space-camp.js"].services.RenderService, 'registerAd');

            returnParcels = generateReturnParcels(partnerModule.profile, partnerConfig);

            /* Get mock response data from our responseData file */
            responseData = JSON.parse(fs.readFileSync(path.join(__dirname, './support/mockResponseData.json')));
            mockData = responseData;
        });

        afterEach(function () {
            registerAd.restore();
        });

        /* Simple type checking on the returned objects, should always pass */
        it('each parcel should have the required fields set', function () {
            /* IF SRA, parse all parcels at once */
            if (partnerProfile.architecture) partnerModule.parseResponse(1, responseData, returnParcels);

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
                i, j;
            returnParcels = generateReturnParcels(partnerModule.profile, partnerConfig);

            /* Get mock response data from our responseData file */
            mockData = responseData;

            /* IF SRA, parse all parcels at once */
            if (partnerProfile.architecture) partnerModule.parseResponse(1, mockData, returnParcels);

            //reset mockdata here
            mockData = JSON.parse(fs.readFileSync(path.join(__dirname, './support/mockResponseData.json')));
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
                    if (currBid.impid === currRp.htSlot.getId()) {
                        expect(currRp.price).to.equal(currBid.price);
                        expect(currRp.targetingType).to.equal('slot');
                        expect(currRp.adm).to.equal(currBid.adm);
                        expect(currRp.targeting).to.not.equal(undefined);
                        expect(currRp.targeting[partnerModule.profile.targetingKeys.id][0]).to.equal(currRp.requestId);
                        var tempValue,
                            sizeKey = Size.arrayToString([currBid.w, currBid.h]),
                            bidDealId = currBid.dealid,
                            targetingCpm = currBid.price,
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

        it('registerAd should be called with correct adEntry', function () {
            var i, expectedAdEntry = [];

            /* IF SRA, parse all parcels at once */
            if (partnerProfile.architecture === 1 || partnerProfile.architecture === 2) {
                expectedAdEntry = getExpectedAdEntry(mockData);

                partnerModule.parseResponse(1, mockData, returnParcels);

                for (var i = 0; i < expectedAdEntry.length; i++){
                    if(expectedAdEntry[i].dealid)
                    expect(registerAd).to.have.been.calledWith(sinon.match(expectedAdEntry[i]));
                }
            } else if (partnerProfile.architecture === 0) {
                /* IF MRA, parse one parcel at a time */
                for (var i = 0; i < mockData.length; i++) {
                    expectedAdEntry[i] = getExpectedAdEntry(mockData[i]);

                    partnerModule.parseResponse(1, mockData[i], [returnParcels[i]]);

                    for (var j = 0; j < expectedAdEntry[i].length; j++) {
                        expect(registerAd).to.have.been.calledWith(sinon.match(expectedAdEntry[i][j]));
                    }
                }
            }
        });
        /* -----------------------------------------------------------------------*/
    });

    describe('should correctly parse passes: ', function () {
        beforeEach(function () {
            /* spy on RenderService.registerAd function, so that we can test it is called */
            registerAd = sinon.spy(libraryStubData["space-camp.js"].services.RenderService, 'registerAd');
            returnParcels = generateReturnParcels(partnerModule.profile, partnerConfig);

            /* Get mock response data from our responseData file */
            responseData = JSON.parse(fs.readFileSync(path.join(__dirname, './support/mockResponseData.json')));
            mockData = responseData;
        });

        afterEach(function () {
            registerAd.restore();
        });

        //debugger;
        it('each parcel should have the required fields set', function () {

          // As we are expecting no matching bid, change the bid id so it doesn't match
          //mockData.seatbid[0].bid[0].impid = mockData.seatbid[0].bid[0].impid + "1";
          for (var i=0;i <mockData.seatbid[0].bid.length; i++) {
            mockData.seatbid[0].bid[i].impid = mockData.seatbid[0].bid[i].impid + "1";
          }
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

        it('registerAd should not be called', function () {
            var i, expectedAdEntry = {};

            // As we are expecting no matching bid, change the bid id so it doesn't match
            for (var i=0;i <mockData.seatbid[0].bid.length; i++) {
                mockData.seatbid[0].bid[i].impid = mockData.seatbid[0].bid[i].impid + "1";
            }

            /* IF SRA, parse all parcels at once */
            if (partnerProfile.architecture === 1 || partnerProfile.architecture === 2) {
                partnerModule.parseResponse(1, mockData, returnParcels);

                expect(registerAd).to.not.have.been.called;
            } else if (partnerProfile.architecture === 0) {
                /* IF MRA, parse one parcel at a time */
                for (i = 0; i < returnParcels.length; i++) {
                    partnerModule.parseResponse(1, mockData[i], [returnParcels[i]]);

                    expect(registerAd).to.not.have.been.called;
                }
            }
        });
        /* -----------------------------------------------------------------------*/
    });

    describe('should correctly parse deals: ', function () {

        beforeEach(function () {
            /* spy on RenderService.registerAd function, so that we can test it is called */
            registerAd = sinon.spy(libraryStubData["space-camp.js"].services.RenderService, 'registerAd');
            returnParcels = generateReturnParcels(partnerModule.profile, partnerConfig);

            /* Get mock response data from our responseData file */
            responseData = JSON.parse(fs.readFileSync(path.join(__dirname, './support/mockResponseData.json')));
            mockData = responseData;
        });

        afterEach(function () {
            registerAd.restore();
        });

        /* Simple type checking on the returned objects, should always pass */
        it('each parcel should have the required fields set', function () {
            returnParcels = generateReturnParcels(partnerModule.profile, partnerConfig);
            /* Get mock response data from our responseData file */
            mockData = responseData;
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

        it('registerAd should be called with correct adEntry', function () {
            var i, expectedAdEntry = [];

            /* IF SRA, parse all parcels at once */
            if (partnerProfile.architecture === 1 || partnerProfile.architecture === 2) {
                expectedAdEntry = getExpectedAdEntry(mockData);

                partnerModule.parseResponse(1, mockData, returnParcels);

                for (var i = 0; i < expectedAdEntry.length; i++){
                    if(expectedAdEntry[i].dealid)
                    expect(registerAd).to.have.been.calledWith(sinon.match(expectedAdEntry[i]));
                }
            } else if (partnerProfile.architecture === 0) {
                /* IF MRA, parse one parcel at a time */
                for (var i = 0; i < mockData.length; i++) {
                    expectedAdEntry[i] = getExpectedAdEntry(mockData[i]);

                    partnerModule.parseResponse(1, mockData[i], [returnParcels[i]]);

                    for (var j = 0; j < expectedAdEntry[i].length; j++) {
                        expect(registerAd).to.have.been.calledWith(sinon.match(expectedAdEntry[i][j]));
                    }
                }
            }
        });
        /* -----------------------------------------------------------------------*/
    });

    describe('should correctly parse dealid when no price was sent back: ', function () {

        beforeEach(function () {
            /* spy on RenderService.registerAd function, so that we can test it is called */
            registerAd = sinon.spy(libraryStubData["space-camp.js"].services.RenderService, 'registerAd');
            returnParcels = generateReturnParcels(partnerModule.profile, partnerConfig);

            /* Get mock response data from our responseData file */
            responseData = JSON.parse(fs.readFileSync(path.join(__dirname, './support/mockResponseData.json')));
            mockData = responseData.dealid;
        });

        afterEach(function () {
            registerAd.restore();
        });

        it('registerAd should be called with correct adEntry', function () {
            var i, expectedAdEntry = [];

            /* IF SRA, parse all parcels at once */
            if (partnerProfile.architecture === 1 || partnerProfile.architecture === 2) {
                if(mockData) {
                    expectedAdEntry = getExpectedAdEntry(mockData);

                    partnerModule.parseResponse(1, mockData, returnParcels);

                    for (var i = 0; i < expectedAdEntry.length; i++){
                        if(expectedAdEntry[i].dealid)
                        expect(registerAd).to.have.been.calledWith(sinon.match(expectedAdEntry[i]));
                    }
                }
            } else if (partnerProfile.architecture === 0) {
                /* IF MRA, parse one parcel at a time */
                for (var i = 0; i < mockData.length; i++) {
                    expectedAdEntry[i] = getExpectedAdEntry(mockData[i]);

                    partnerModule.parseResponse(1, mockData[i], [returnParcels[i]]);

                    for (var j = 0; j < expectedAdEntry[i].length; j++) {
                        expect(registerAd).to.have.been.calledWith(sinon.match(expectedAdEntry[i][j]));
                    }
                }
            }
        });
    });
});
