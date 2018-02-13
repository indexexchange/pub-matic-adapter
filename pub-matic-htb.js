/**
 * @author:    Partner
 * @license:   UNLICENSED
 *
 * @copyright: Copyright (c) 2017 by Index Exchange. All rights reserved.
 *
 * The information contained within this document is confidential, copyrighted
 * and or a trade secret. No part of this document may be reproduced or
 * distributed in any form or by any means, in whole or in part, without the
 * prior written permission of Index Exchange.
 */

'use strict';

////////////////////////////////////////////////////////////////////////////////
// Dependencies ////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

var BidTransformer = require('bid-transformer.js');
var Browser = require('browser.js');
var Classify = require('classify.js');
var Constants = require('constants.js');
var Partner = require('partner.js');
var Size = require('size.js');
var SpaceCamp = require('space-camp.js');
var System = require('system.js');
var Utilities = require('utilities.js');
var EventsService;
var RenderService;

//? if (DEBUG) {
var ConfigValidators = require('config-validators.js');
var PartnerSpecificValidator = require('pub-matic-htb-validator.js');
var Scribe = require('scribe.js');
var Whoopsie = require('whoopsie.js');
//? }

////////////////////////////////////////////////////////////////////////////////
// Main ////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Partner module template
 *
 * @class
 */
function PubMaticHtb(configs) {
    /* =====================================
     * Data
     * ---------------------------------- */

    /* Private
     * ---------------------------------- */

    /**
     * Reference to the partner base class.
     *
     * @private {object}
     */
    var __baseClass;

    /**
     * Profile for this partner.
     *
     * @private {object}
     */
    var __profile;

    /**
     * Instances of BidTransformer for transforming bids.
     *
     * @private {object}
     */
    var __bidTransformers;

    /* =====================================
     * Functions
     * ---------------------------------- */

    /* Utilities
     * ---------------------------------- */
	function __populateImprObject(returnParcels) {
        let retArr = [],
            impObj = {},
            sizes = [];

        returnParcels.forEach(rp => {
            impObj = {
                id: rp.bid_id || System.generateUniqueId(),
                tagId: rp.xSlotRef.adUnitName,
                bidFloor: _parseSlotParam(Constants.Keys.KADFLOOR, rp.kadfloor),
                ext: {
                    pmZoneId: _parseSlotParam(Constants.Keys.PMZONEID, rp.pmzoneid)
                }
            }
            if (rp.hasOwnProperty(Constants.Keys.XSLOTREF) && 
                rp.xSlotRef.hasOwnProperty(Constants.Keys.SIZES)) {
                sizes = rp.xSlotRef.sizes[0];
                if (sizes.length > 0) {
                    impObj.banner = {
                        w: sizes[0],
                        h: sizes[1]
                    }
                } else {
                    Utilities.logError("PubMatic: Error in sizes array");
                }
            } else {
                Utilities.logError("PubMatic: Error in xSlotRef.sizes");
            }
            retArr.push(impObj);
        });

        return retArr;
    }	
	
	function _parseSlotParam(paramName, paramValue) {
      if (!Utilities.isStr(paramValue)) {
        paramValue && Utilities.logWarn('PubMatic: Ignoring param key: ' + paramName + ', expects string-value, found ' + typeof paramValue);
        return Constants.UNDEFINED;
      }

      switch (paramName) {
        case Constants.Keys.PMZONEID:
          return paramValue.split(',').slice(0, 50).map(id => id.trim()).join();
        case Constants.Keys.KADFLOOR:
          return parseFloat(paramValue) || Constants.UNDEFINED;
        case Constants.Keys.LAT:
          return parseFloat(paramValue) || Constants.UNDEFINED;
        case Constants.Keys.LON:
          return parseFloat(paramValue) || Constants.UNDEFINED;
        case Constants.Keys.YOB:
          return parseInt(paramValue) || Constants.UNDEFINED;
        default:
          return paramValue;
      }
    }
 
    function __populateImprObject(returnParcels) {
        let retArr = [],
            impObj = {},
            sizes = [];

        returnParcels.forEach(rp => {
            impObj = {
                id: rp.bid_id || System.generateUniqueId(),
                tagId: rp.xSlotRef.adUnitName,
                bidFloor: _parseSlotParam(Constants.Keys.KADFLOOR, rp.kadfloor),
                ext: {
                    pmZoneId: _parseSlotParam(Constants.Keys.PMZONEID, rp.pmzoneid)
                }
            }
            if (rp.hasOwnProperty(Constants.Keys.XSLOTREF) && 
                rp.xSlotRef.hasOwnProperty(Constants.Keys.SIZES)) {
                sizes = rp.xSlotRef.sizes[0];
                if (sizes.length > 0) {
                    impObj.banner = {
                        h: sizes[1],
                        w: sizes[0]
                    }
                } else {
                    Utilities.logError("PubMatic: Error in sizes array");
                }
            } else {
                Utilities.logError("PubMatic: Error in xSlotRef.sizes");
            }
            retArr.push(impObj);
        });

        return retArr;
    }

    function __populateSiteObject(publisherId) {
        var retObj = 
        {
            page: Browser.getTopWindowUrl(),
            ref: Browser.getTopWindowReferrer(),
            publisher: {
                id: publisherId, // mandatory
                domain: Browser.getDomain()
            },
            domain: Browser.getDomain()
        }
        return retObj;
    }

    function __populateDeviceInfo(rp) {
        return {
            ua: Browser.getUserAgent(),
            js: 1,
            dnt: Browser.getTrackingInfo(),
            h: Browser.getScreenHeight(),
            w: Browser.getScreenWidth(),
            language: Browser.getLanguage(),
            geo: {
                lat: _parseSlotParam(Constants.Keys.LAT, rp.lat),
                lon: _parseSlotParam(Constants.Keys.LON, rp.lon),
            }
        }
    }

    function __populateUserInfo(rp) {
        return {
            gender: rp.gender ? rp.gender.trim() : Constants.UNDEFINED,
            geo: {
                lat: _parseSlotParam(Constants.Keys.LAT, rp.lat),
                lon: _parseSlotParam(Constants.Keys.LON, rp.lon),
            },
            yob: _parseSlotParam(Constants.Keys.YOB, rp.yob)
        };
    }

    function __populateExtObject(rp) {
        var ext = {};
        ext.wrapper = {};
        ext.wrapper.profile = rp.profile || Constants.UNDEFINED; // remove ? check if mandatory
        ext.wrapper.version = rp.version || Constants.UNDEFINED; // remove ? check if mandatory
        ext.wrapper.wiid = rp.wiid || Constants.UNDEFINED; // 
        ext.wrapper.wv = Constants.REPO_AND_VERSION;
        ext.wrapper.transactionId = rp.transactionId;
        ext.wrapper.wp = 'pbjs' ;
        
        return ext;   
    }    
	/**
     * Generates the request URL and query data to the endpoint for the xSlots
     * in the given returnParcels.
     *
     * @param  {object[]} returnParcels
     *
     * @return {object}
     */
    function __generateRequestObj(returnParcels) {

        /* =============================================================================
         * STEP 2  | Generate Request URL
         * -----------------------------------------------------------------------------
         *
         * Generate the URL to request demand from the partner endpoint using the provided
         * returnParcels. The returnParcels is an array of objects each object containing
         * an .xSlotRef which is a reference to the xSlot object from the partner configuration.
         * Use this to retrieve the placements/xSlots you need to request for.
         *
         * If your partner is MRA, returnParcels will be an array of length one. If your
         * partner is SRA, it will contain any number of entities. In any event, the full
         * contents of the array should be able to fit into a single request and the
         * return value of this function should similarly represent a single request to the
         * endpoint.
         *
         * Return an object containing:
         * queryUrl: the url for the request
         * data: the query object containing a map of the query string paramaters
         *
         * callbackId:
         *
         * arbitrary id to match the request with the response in the callback function. If
         * your endpoint supports passing in an arbitrary ID and returning it as part of the response
         * please use the callbackType: Partner.CallbackTypes.ID and fill out the adResponseCallback.
         * Also please provide this adResponseCallback to your bid request here so that the JSONP
         * response calls it once it has completed.
         *
         * If your endpoint does not support passing in an ID, simply use
         * Partner.CallbackTypes.CALLBACK_NAME and the wrapper will take care of handling request
         * matching by generating unique callbacks for each request using the callbackId.
         *
         * If your endpoint is ajax only, please set the appropriate values in your profile for this,
         * i.e. Partner.CallbackTypes.NONE and Partner.Requesttypes.AJAX. You also do not need to provide
         * a callbackId in this case because there is no callback.
         *
         * The return object should look something like this:
         * {
         *     url: 'http://bidserver.com/api/bids' // base request url for a GET/POST request
         *     data: { // query string object that will be attached to the base url
         *        slots: [
         *             {
         *                 placementId: 54321,
         *                 sizes: [[300, 250]]
         *             },{
         *                 placementId: 12345,
         *                 sizes: [[300, 600]]
         *             },{
         *                 placementId: 654321,
         *                 sizes: [[728, 90]]
         *             }
         *         ],
         *         site: 'http://google.com'
         *     },
         *     callbackId: '_23sd2ij4i1' //unique id used for pairing requests and responses
         * }
         */

        /* ---------------------- PUT CODE HERE ------------------------------------ */
        var payload = {},
        callbackId = System.generateUniqueId(),
        //baseUrl = Browser.getProtocol() + '//hbopenbid.pubmatic.com/translator?';
        baseUrl = '//hbopenbid.pubmatic.com/translator?';
        payload = { 
            id: '' + new Date().getTime(), // str | mandatory
            at: Constants.AUCTION_TYPE, // int | mandatory
            cur: [Constants.CURRENCY], // [str] | opt
            imp: __populateImprObject(returnParcels), // obj | mandatory - pending
            site: __populateSiteObject(returnParcels[0].pubId), //// obj | opt
            device: __populateDeviceInfo(returnParcels[0]), // obj | mandatory
            user: __populateUserInfo(returnParcels[0]), // obj | opt
            ext: __populateExtObject(returnParcels[0]), // not required?? - to be checked
            secure: Browser.isSecure()
        }
        
        /* -------------------------------------------------------------------------- */
        return {
            url: baseUrl,
            data: payload,
            callbackId: callbackId
        };
    }

    /* =============================================================================
     * STEP 3  | Response callback
     * -----------------------------------------------------------------------------
     *
     * This generator is only necessary if the partner's endpoint has the ability
     * to return an arbitrary ID that is sent to it. It should retrieve that ID from
     * the response and save the response to adResponseStore keyed by that ID.
     *
     * If the endpoint does not have an appropriate field for this, set the profile's
     * callback type to CallbackTypes.CALLBACK_NAME and omit this function.
     */
    function adResponseCallback(adResponse) {
        /* get callbackId from adResponse here */
        var callbackId = 0;
        __baseClass._adResponseStore[callbackId] = adResponse;
    }
    /* -------------------------------------------------------------------------- */

    /* Helpers
     * ---------------------------------- */

    /* =============================================================================
     * STEP 5  | Rendering
     * -----------------------------------------------------------------------------
     *
     * This function will render the ad given. Usually need not be changed unless
     * special render functionality is needed.
     *
     * @param  {Object} doc The document of the iframe where the ad will go.
     * @param  {string} adm The ad code that came with the original demand.
     */
    function __render(doc, adm) {
        System.documentWrite(doc, adm);
    }

    /**
     * Parses and extracts demand from adResponse according to the adapter and then attaches it
     * to the corresponding bid's returnParcel in the correct format using targeting keys.
     *
     * @param {string} sessionId The sessionId, used for stats and other events.
     *
     * @param {any} adResponse This is the bid response as returned from the bid request, that was either
     * passed to a JSONP callback or simply sent back via AJAX.
     *
     * @param {object[]} returnParcels The array of original parcels, SAME array that was passed to
     * generateRequestObj to signal which slots need demand. In this funciton, the demand needs to be
     * attached to each one of the objects for which the demand was originally requested for.
     */
    function __parseResponse(sessionId, adResponse, returnParcels) {
        
        /* =============================================================================
         * STEP 4  | Parse & store demand response
         * -----------------------------------------------------------------------------
         *
         * Fill the below variables with information about the bid from the partner, using
         * the adResponse variable that contains your module adResponse.
         */

        /* This an array of all the bids in your response that will be iterated over below. Each of
         * these will be mapped back to a returnParcel object using some criteria explained below.
         * The following variables will also be parsed and attached to that returnParcel object as
         * returned demand.
         *
         * Use the adResponse variable to extract your bid information and insert it into the
         * bids array. Each element in the bids array should represent a single bid and should
         * match up to a single element from the returnParcel array.
         *
         */

         /* ---------- Process adResponse and extract the bids into the bids array ------------*/

        var i = 0,
            targetingType,
            bidDealId,
            sizeKey = "",
            targetingCpm,
            bidCreative,
            pubKitAdId,
            cnt = 0;

        returnParcels.forEach(rp => {
            cnt = 0;
            adResponse.forEach(ar => {
                if (ar.impid === rp.xSlotRef.bid_id) {
                    bidDealId = ar.dealid;
                    targetingCpm = BidTransformer.applyRounding(ar.price);
                    bidCreative = ar.adm;

                    rp.price = BidTransformer.applyRounding(ar.price);
                    rp.targetingType = Constants.SLOT;
                    rp.size = [Number(ar.w), Number(ar.h)];
                    sizeKey = Size.arrayToString(rp.size);
                    
                    rp.adm = bidCreative;
                    rp.targeting = {};
                    if (bidDealId) {
                        rp.targeting[__baseClass._configs.targetingKeys.pmid] = [sizeKey + "_" + bidDealId];
                        rp.targeting[__baseClass._configs.targetingKeys.pm] = [sizeKey + "_" + targetingCpm];
                    } else {
                        rp.targeting[__baseClass._configs.targetingKeys.om] = [sizeKey + "_" + targetingCpm];
                    }
                    rp.targeting[__baseClass._configs.targetingKeys.id] = [rp.requestId];

                    pubKitAdId = RenderService.registerAd(
                        sessionId,
                        __profile.partnerId,
                        __render, [bidCreative],
                        '',
                        __profile.features.demandExpiry.enabled ? (__profile.features.demandExpiry.value + System.now()) : 0
                    );
                    rp.targeting.pubKitAdId = pubKitAdId; //why is this required. not mentioned in the documentation, but is present in the test cases.
                    rp.pass = false;
                } else {
                    cnt++;
                }
                if (cnt === adResponse.length) {
                    //no matching bid found.
                    rp.pass = true;
                }
            });
        });
    }

    /* =====================================
     * Constructors
     * ---------------------------------- */

    (function __constructor() {
        EventsService = SpaceCamp.services.EventsService;
        RenderService = SpaceCamp.services.RenderService;

        /* =============================================================================
         * STEP 1  | Partner Configuration
         * -----------------------------------------------------------------------------
         *
         * Please fill out the below partner profile according to the steps in the README doc.
         */

        /* ---------- Please fill out this partner profile according to your module ------------*/
        __profile = {
            partnerId: Constants.PUBMATIC_PARTNER_ID, // PartnerName
            namespace: Constants.PUBMATIC_PARTNER_ID, // Should be same as partnerName
            statsId: 'PUBM', // Unique partner identifier
            version: '2.2.0',
            targetingType: Constants.SLOT,
            enabledAnalytics: {
                requestTime: !0
            },
            features: {
                demandExpiry: {
                    enabled: !1,
                    value: 0
                },
                rateLimiting: {
                    enabled: !1,
                    value: 0
                },
                prefetchDisabled: {
                    enabled: !0,
                    value: 0
                }
            },
            targetingKeys: { // Targeting keys for demand, should follow format ix_{statsId}_id
                id: 'ix_pubm_id',
                om: 'ix_pubm_cpm',
                pm: 'ix_pubm_cpm',
                pmid: 'ix_pubm_dealid'
            },
            lineItemType: Constants.LineItemTypes.ID_AND_SIZE,
            callbackType: Partner.CallbackTypes.CALLBACK_NAME, // Callback type, please refer to the readme for details
            architecture: Partner.Architectures.SRA, // Request architecture, please refer to the readme for details
            requestType: Partner.RequestTypes.JSONP // Request type, jsonp, ajax, or any.
        };
        /* ---------------------------------------------------------------------------------------*/

        //? if (DEBUG) {
        // What is the need for this: var results = PartnerSpecificValidator(configs);
        var results = PartnerSpecificValidator(configs);
        if (results) {
            throw Whoopsie('INVALID_CONFIG', results);
        }
        //? }

        /*
         * Adjust the below bidTransformerConfigs variable to match the units the adapter
         * sends bids in and to match line item setup. This configuration variable will
         * be used to transform the bids going into DFP.
         */

        /* - Please fill out this bid trasnformer according to your module's bid response format - */
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

        __bidTransformers = bidTransformerConfigs;

        /* --------------------------------------------------------------------------------------- */
        BidTransformer.setConfig(bidTransformerConfigs);

        __baseClass = Partner(__profile, configs, null, {
            parseResponse: __parseResponse,
            generateRequestObj: __generateRequestObj,
            adResponseCallback: adResponseCallback
        });
    })();

    /* =====================================
     * Public Interface
     * ---------------------------------- */

    var derivedClass = {
        /* Class Information
         * ---------------------------------- */

        //? if (DEBUG) {
        __type__: 'PubMaticHtb',
        //? }

        //? if (TEST) {
        __baseClass: __baseClass,
        //? }

        /* Data
         * ---------------------------------- */

        //? if (TEST) {
        profile: __profile,
        //? }

        /* Functions
         * ---------------------------------- */

        //? if (TEST) {
        render: __render,
        parseResponse: __parseResponse,
        generateRequestObj: __generateRequestObj,
        adResponseCallback: adResponseCallback,
        bidTransformer: __bidTransformers
        //? }
    };

    return Classify.derive(__baseClass, derivedClass);
}

////////////////////////////////////////////////////////////////////////////////
// Exports /////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

module.exports = PubMaticHtb;