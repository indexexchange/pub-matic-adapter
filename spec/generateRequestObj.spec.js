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
        utils = require('./support/libraryStubData.js'),
        system = utils['system.js'],
        xSlotName,
        xSlotsArray,
        htSlot,
        htSlotName;

    for (htSlotName in partnerConfig.mapping) {
        xSlotsArray = partnerConfig.mapping[htSlotName];
        htSlot = {
            id: htSlotName,
            getId: function () {
                return this.id;

            }
        }

        for (var i = 0; i < xSlotsArray.length; i++) {
            xSlotName = xSlotsArray[i];
            returnParcels.push({
                pubId: partnerConfig.publisherId,
                partnerId: profile.partnerId,
                partnerStatsId: profile.statsId,
                htSlot: htSlot,
                ref: "", // how is this populated?
                xSlotName: xSlotName,
                xSlotRef: partnerConfig.xSlots[xSlotName],
                requestId: system.generateUniqueId(),
                bid_id: partnerConfig.xSlots[xSlotName].bid_id,
                
                /* Pubmatic specific values. required in the api request */
                lat: partnerConfig.lat || undefined, 
                lon: partnerConfig.lon || undefined,
                yob: partnerConfig.yob || undefined,
                gender: partnerConfig.gender || undefined,
                kadfloor: partnerConfig.kadfloor || undefined,
                profile: partnerConfig.profile || undefined,
                version: partnerConfig.version || undefined
            });
        }
    }
    return returnParcels;
}

/* =====================================
 * Testing
 * ---------------------------------- */

describe('generateRequestObj', function () {

    /* Setup and Library Stub
     * ------------------------------------------------------------- */
    var inspector = require('schema-inspector'),
    proxyquire = require('proxyquire').noCallThru(),
    libraryStubData = require('./support/libraryStubData.js'),
    partnerModule = proxyquire('../pub-matic-htb.js', libraryStubData),
    partnerConfig = require('./support/mockPartnerConfig.json'),
    expect = require('chai').expect,
    browser = libraryStubData['browser.js'],
    /* -------------------------------------------------------------------- */

    /* Instantiate your partner module */
    partnerModule = partnerModule(partnerConfig),
    partnerProfile = partnerModule.profile,

    /* Generate dummy return parcels based on MRA partner profile */
    returnParcels,
    requestObject,
    endpoint = "//hbopenbid.pubmatic.com/translator?";

    /* Generate a request object using generated mock return parcels. */
    returnParcels = generateReturnParcels(partnerProfile, partnerConfig);

    /* -------- IF SRA, generate a single request for each parcel -------- */
    if (partnerProfile.architecture) {
        requestObject = partnerModule.generateRequestObj(returnParcels);

        /* Simple type checking, should always pass */
        it('SRA - should return a correctly formatted object', function () {
            var result = inspector.validate({
                type: 'object',
                strict: true,
                properties: {
                    url: {
                        type: 'string',
                        minLength: 1
                    },
                    data: {
                        type: 'object'
                    },
                    callbackId: {
                        type: 'string',
                        minLength: 1
                    }
                }
            }, requestObject);

            expect(result.valid).to.be.true;
        });

        /* Test that the generateRequestObj function creates the correct object by building a URL
            * from the results. This is the bid request url the wrapper will send out to get demand
            * for your module.
            *
            * The url should contain all the necessary parameters for all of the request parcels
            * passed into the function.
            */

        /* ---------- ADD MORE TEST CASES TO TEST AGAINST REAL VALUES ------------*/
        it('request obj should have all required values', function () {
            /* Write unit tests to verify that your bid request url contains the correct
                * request params, url, etc.
                */
            var domain = browser.topWindow.location.hostname;
            var dnt = (browser.topWindow.navigator.doNotTrack == 'yes' || 
                    browser.topWindow.navigator.doNotTrack == '1' || 
                    browser.topWindow.navigator.msDoNotTrack == '1') 
                    ? 1 : 0;
            
            expect(requestObject).to.exist;
            expect(requestObject.url).to.exist;
            expect(requestObject.url).to.equal(endpoint)
            expect(requestObject.callbackId).to.exist;

            var payload = requestObject.data;
            expect(payload).to.exist;
            expect(payload.id).to.exist;
            expect(payload.at).to.equal(1);
            expect(payload.cur).to.be.an('array').with.length.above(0);
            expect(payload.cur[0]).to.equal('USD');

            expect(payload.imp).to.exist.and.to.be.an('array').with.length.above(0);
            
            //test cases for payload.site object
            expect(payload.site).to.exist.and.to.be.an('object');
            expect(payload.site.page).to.and.equal(browser.topWindow.href);
            expect(payload.site.ref).to.exist.and.equal(browser.topWindow.document.referrer);
            expect(payload.site.publisher).to.exist.and.be.an('object');
            expect(payload.site.publisher.id).to.exist.and.to.equal(partnerConfig.publisherId);
            expect(payload.site.publisher.domain).to.exist.and.to.equal(domain);
            expect(payload.site.domain).to.exist.and.to.equal(domain);
            
            //test cases for payload.device object
            expect(payload.device).to.exist.and.to.be.an('object');
            expect(payload.device.ua).to.exist.and.to.equal(browser.getUserAgent());
            expect(payload.device.js).to.exist.and.to.equal(1);
            expect(payload.device.dnt).to.exist.and.to.equal(dnt);
            expect(payload.device.h).to.exist.and.to.equal(browser.getScreenHeight());
            expect(payload.device.w).to.exist.and.to.equal(browser.getScreenWidth());
            expect(payload.device.language).to.exist.and.to.equal(browser.getLanguage());
            expect(payload.device.geo).to.exist.and.to.be.an("object");
            expect(payload.device.geo.lat).to.exist.and.to.equal(parseFloat(partnerConfig.lat));
            expect(payload.device.geo.lon).to.exist.and.to.equal(parseFloat(partnerConfig.lon));

            //test cases for payload.user object
            expect(payload.user).to.exist;
            expect(payload.user.gender).to.exist.and.to.equal(partnerConfig.gender);
            expect(payload.user.geo).to.exist.and.to.be.an('object');
            expect(payload.user.geo.lat).to.exist.and.to.equal(parseFloat(partnerConfig.lat));
            expect(payload.user.geo.lon).to.exist.and.to.equal(parseFloat(partnerConfig.lon));
            expect(payload.user.yob).to.exist.and.to.equal(parseInt(partnerConfig.yob));

            //test cases for payload.ext object
            expect(payload.ext).to.exist;
            expect(payload.ext.wrapper).to.exist.and.to.be.an('object');
            expect(payload.ext.wrapper.profile).to.exist.and.to.equal(partnerConfig.profile);
            expect(payload.ext.wrapper.version).to.exist.and.to.equal(partnerConfig.version);
            expect(payload.ext.wrapper.wp).to.exist.and.to.equal('pbjs');

        });

        it('request object should correctly map return parcels to impr objects', function(){
            //test cases for payload.imp object
            var payload = requestObject.data,
                noMatch = false,
                sizes;
            payload = payload.imp;
            returnParcels = generateReturnParcels(partnerProfile, partnerConfig);

            expect(payload).to.exist.and.to.be.an('array').with.length.above(0);
            expect(payload.length).to.equal(returnParcels.length);
            payload.forEach(obj => {
                noMatch = true;
                returnParcels.forEach(rp => {
                    if(rp.bid_id === obj.id) {
                        noMatch = false;
                        sizes = rp.xSlotRef.sizes[0];
                        expect(obj.tagId).to.equal(rp.xSlotRef.adUnitName);
                        expect(obj.bidFloor).to.equal(parseFloat(rp.kadfloor));
                        expect(obj.ext).to.exist.and.to.be.an('object');
                        expect(obj.banner).to.exist.and.to.be.an('object');
                        sizes = rp.xSlotRef.sizes[0]
                        expect(obj.banner.w).to.exist.and.to.equal(sizes[0]);
                        expect(obj.banner.h).to.exist.and.to.equal(sizes[1]);
                    }
                });
                expect(noMatch).to.equal(false);
            });
        });
        /* -----------------------------------------------------------------------*/

    /* ---------- IF MRA, generate a single request for each parcel ---------- */
    } else {
        for (var i = 0; i < returnParcels.length; i++) {
            requestObject = partnerModule.generateRequestObj([returnParcels[i]]);

            /* Simple type checking, should always pass */
            it('MRA - should return a correctly formatted object', function () {
                var result = inspector.validate({
                    type: 'object',
                    strict: true,
                    properties: {
                        url: {
                            type: 'string',
                            minLength: 1
                        },
                        data: {
                            type: 'object'
                        },
                        callbackId: {
                            type: 'string',
                            minLength: 1
                        }
                    }
                }, requestObject);

                expect(result.valid).to.be.true;
            });

            /* Test that the generateRequestObj function creates the correct object by building a URL
                * from the results. This is the bid request url that wrapper will send out to get demand
                * for your module.
                *
                * The url should contain all the necessary parameters for all of the request parcels
                * passed into the function.
                */

            /* ---------- ADD MORE TEST CASES TO TEST AGAINST REAL VALUES ------------*/
            it('should correctly build a url', function () {
                /* Write unit tests to verify that your bid request url contains the correct
                    * request params, url, etc.
                    */
                expect(requestObject).to.exist;
            });
            /* -----------------------------------------------------------------------*/
        }
    }

});