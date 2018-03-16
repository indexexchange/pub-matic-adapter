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
var Network = require('network.js');
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
     var __populateImprObject = returnParcels => {
        let retArr = [],
            impObj = {},
            sizes = [];

        returnParcels.forEach(rp => {
            impObj = {
                id: rp.bid_id || System.generateUniqueId(),
                tagId: rp.xSlotRef.adUnitName,
                bidFloor: _parseSlotParam('kadfloor', rp.kadfloor),
                ext: {
                    pmZoneId: _parseSlotParam('pmzoneid', rp.pmzoneid)
                }
            }
            sizes = rp.xSlotRef.sizes[0];
            if (sizes.length > 0) {
                impObj.banner = {
                    w: sizes[0],
                    h: sizes[1]
                }
            } else {
                console.log("PubMatic: Error in sizes array");
            }
            retArr.push(impObj);
        });

        return retArr;
    }	
	
	var _parseSlotParam = (paramName, paramValue) => {
      if (!Utilities.isStr(paramValue)) {
        paramValue && console.log('PubMatic: Ignoring param key: ' + paramName + ', expects string-value, found ' + typeof paramValue);
        return undefined;
      }

      switch (paramName) {
        case 'pmzoneid':
          return paramValue.split(',').slice(0, 50).map(id => id.trim()).join();
        case 'kadfloor':
        case 'lat':
        case 'lon':
          return parseFloat(paramValue) || undefined;
        case 'yob':
          return parseInt(paramValue) || undefined;
        default:
          return paramValue;
      }
    }
 
    var __populateImprObject = returnParcels => {
        let retArr = [],
            impObj = {},
            sizes = [];

        returnParcels.forEach(rp => {
            impObj = {
                id: rp.bid_id || System.generateUniqueId(),
                tagId: rp.xSlotRef.adUnitName,
                bidFloor: _parseSlotParam('kadfloor', rp.kadfloor),
                ext: {
                    pmZoneId: _parseSlotParam('pmzoneid', rp.pmzoneid)
                }
            }
            sizes = rp.xSlotRef.sizes[0];
            if (sizes.length > 0) {
                impObj.banner = {
                    h: sizes[1],
                    w: sizes[0]
                }
            } else {
                console.log("PubMatic: Error in sizes array");
            }
            retArr.push(impObj);
        });

        return retArr;
    }

    var __populateSiteObject = publisherId => {
        var retObj = 
        {
            page: Browser.topWindow.href,
            ref: Browser.topWindow.document.referrer,
            publisher: {
                id: publisherId, // mandatory
                domain: Browser.topWindow.location.hostname
            },
            domain: Browser.topWindow.location.hostname
        }
        return retObj;
    }

    var __populateDeviceInfo = rp => {
        var dnt = (Browser.topWindow.navigator.doNotTrack == 'yes' || 
                    Browser.topWindow.navigator.doNotTrack == '1' || 
                    Browser.topWindow.navigator.msDoNotTrack == '1') 
                    ? 1 : 0;
        return {
            ua: Browser.getUserAgent(),
            js: 1,
            dnt: dnt,
            h: Browser.getScreenHeight(),
            w: Browser.getScreenWidth(),
            language: Browser.getLanguage(),
            geo: {
                lat: _parseSlotParam('lat', rp.lat),
                lon: _parseSlotParam('lon', rp.lon),
            }
        }
    }

    var __populateUserInfo = rp => {
        return {
            gender: rp.gender ? rp.gender.trim() : undefined,
            geo: {
                lat: _parseSlotParam('lat', rp.lat),
                lon: _parseSlotParam('lon', rp.lon),
            },
            yob: _parseSlotParam('yob', rp.yob)
        };
    }

    var __populateExtObject = rp => {
        var ext = {};
        ext.wrapper = {};
        ext.wrapper.profile = rp.profile || undefined; // remove ? check if mandatory
        ext.wrapper.version = rp.version || undefined; // remove ? check if mandatory
        ext.wrapper.wiid = rp.wiid || undefined; // 
        //ext.wrapper.wv = Constants.REPO_AND_VERSION;
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
            at: 1, // int | mandatory
            cur: ['USD'], // [str] | opt
            imp: __populateImprObject(returnParcels), // obj | mandatory - pending
            site: __populateSiteObject(returnParcels[0].pubId), //// obj | opt
            device: __populateDeviceInfo(returnParcels[0]), // obj | mandatory
            user: __populateUserInfo(returnParcels[0]), // obj | opt
            ext: __populateExtObject(returnParcels[0]), // not required?? - to be checked
            secure: Browser.getProtocol() === "https:" ? 1 : 0
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
     * STEP 5  | Rendering Pixel
     * -----------------------------------------------------------------------------
     *
    */

     /**
     * This function will render the pixel given.
     * @param  {string} pixelUrl Tracking pixel img url.
     */
    function __renderPixel(pixelUrl) {
        if (pixelUrl){
            Network.img({
                url: decodeURIComponent(pixelUrl),
                method: 'GET',
            });
        }
    }

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

        var unusedReturnParcels = returnParcels.slice();

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

        var bids = adResponse;

        /* --------------------------------------------------------------------------------- */

        for (var j = 0; j < returnParcels.length; j++) {

            var curReturnParcel = returnParcels[j];

            var headerStatsInfo = {};
            var htSlotId = curReturnParcel.htSlot.getId();
            headerStatsInfo[htSlotId] = {};
            headerStatsInfo[htSlotId][curReturnParcel.requestId] = [curReturnParcel.xSlotName];

            var curBid;

            for (var i = 0; i < bids.length; i++) {

                /**
                 * This section maps internal returnParcels and demand returned from the bid request.
                 * In order to match them correctly, they must be matched via some criteria. This
                 * is usually some sort of placements or inventory codes. Please replace the someCriteria
                 * key to a key that represents the placement in the configuration and in the bid responses.
                 */
                if (bids[i].impid === curReturnParcel.xSlotRef.bid_id) {
                    curBid = bids[i];
                    bids.splice(i, 1);
                    break;
                }
            }

            /* No matching bid found so its a pass */
            if (!curBid) {
                if (__profile.enabledAnalytics.requestTime) {
                    __baseClass._emitStatsEvent(sessionId, 'hs_slot_pass', headerStatsInfo);
                }
                curReturnParcel.pass = true;
                continue;
            }

            /* ---------- Fill the bid variables with data from the bid response here. ------------*/

            /* Using the above variable, curBid, extract various information about the bid and assign it to
             * these local variables */

            /* the bid price for the given slot */
            var bidPrice = curBid.price;

            /* the size of the given slot */
            var bidSize = [Number(curBid.width), Number(curBid.height)];

            /* the creative/adm for the given slot that will be rendered if is the winner.
             * Please make sure the URL is decoded and ready to be document.written.
             */
            var bidCreative = curBid.adm;

            var bidPrice = curBid.price; /* the bid price for the given slot */
            var bidSize = [Number(curBid.w), Number(curBid.h)]; /* the size of the given slot */
            var bidCreative = curBid.adm; /* the creative/adm for the given slot that will be rendered if is the winner. */
            var bidDealId = curBid.dealid; /* the dealId if applicable for this slot. */
            /* explicitly pass */
            var bidIsPass = bidPrice <= 0 ? true : false;

            /* OPTIONAL: tracking pixel url to be fired AFTER rendering a winning creative.
            * If firing a tracking pixel is not required or the pixel url is part of the adm,
            * leave empty;
            */
            var pixelUrl = '';
            /* ---------------------------------------------------------------------------------------*/

            curBid = null;
            if (bidIsPass) {
                //? if (DEBUG) {
                Scribe.info(__profile.partnerId + ' returned pass for { id: ' + adResponse.id + ' }.');
                //? }
                if (__profile.enabledAnalytics.requestTime) {
                    __baseClass._emitStatsEvent(sessionId, 'hs_slot_pass', headerStatsInfo);
                }
                curReturnParcel.pass = true;
                continue;
            }

            if (__profile.enabledAnalytics.requestTime) {
                __baseClass._emitStatsEvent(sessionId, 'hs_slot_bid', headerStatsInfo);
            }

            curReturnParcel.size = bidSize;
            curReturnParcel.targetingType = 'slot';
            curReturnParcel.targeting = {};

            var targetingCpm = '';

            //? if (FEATURES.GPT_LINE_ITEMS) {
            var targetingCpm = __bidTransformers.targeting.apply(bidPrice);
            var sizeKey = Size.arrayToString(curReturnParcel.size);

            if (bidDealId) {
                curReturnParcel.targeting[__baseClass._configs.targetingKeys.pmid] = [sizeKey + '_' + bidDealId];
                curReturnParcel.targeting[__baseClass._configs.targetingKeys.pm] = [sizeKey + '_' + targetingCpm];
            } else {
                curReturnParcel.targeting[__baseClass._configs.targetingKeys.om] = [sizeKey + '_' + targetingCpm];
            }
            curReturnParcel.targeting[__baseClass._configs.targetingKeys.id] = [curReturnParcel.requestId];
            //? }

            //? if (FEATURES.RETURN_CREATIVE) {
            curReturnParcel.adm = bidCreative;
            if (pixelUrl) {
                curReturnParcel.winNotice = __renderPixel.bind(null, pixelUrl);
            }
            //? }

            //? if (FEATURES.RETURN_PRICE) {
            curReturnParcel.price = Number(__bidTransformers.price.apply(bidPrice));
            //? }

            var pubKitAdId = RenderService.registerAd({
                sessionId: sessionId,
                partnerId: __profile.partnerId,
                adm: bidCreative,
                requestId: curReturnParcel.requestId,
                size: curReturnParcel.size,
                price: targetingCpm,
                dealId: bidDealId || undefined,
                timeOfExpiry: __profile.features.demandExpiry.enabled ? (__profile.features.demandExpiry.value + System.now()) : 0,
                auxFn: __renderPixel,
                auxArgs: [pixelUrl]
            });

            //? if (FEATURES.INTERNAL_RENDER) {
            curReturnParcel.targeting.pubKitAdId = pubKitAdId;
            //? }
        }
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
            partnerId: 'PubMaticHtb', // PartnerName
            namespace: 'PubMaticHtb', // Should be same as partnerName
            statsId: 'PUBM', // Unique partner identifier
            version: '2.1.0',
            targetingType: 'slot',
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
            bidUnitInCents: 1, // The bid price unit (in cents) the endpoint returns, please refer to the readme for details
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
                outputPrecision: 0, // With 0 decimal places
                roundingType: 'FLOOR', // jshint ignore:line
                floor: 0,
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
        if (configs.bidTransformer) {
            //? if (FEATURES.GPT_LINE_ITEMS) {
            bidTransformerConfigs.targeting = configs.bidTransformer;
            //? }
            //? if (FEATURES.RETURN_PRICE) {
            bidTransformerConfigs.price.inputCentsMultiplier = configs.bidTransformer.inputCentsMultiplier;
            //? }
        }

        __bidTransformers = {};

        //? if (FEATURES.GPT_LINE_ITEMS) {
        __bidTransformers.targeting = BidTransformer(bidTransformerConfigs.targeting);
        //? }
        //? if (FEATURES.RETURN_PRICE) {
        __bidTransformers.price = BidTransformer(bidTransformerConfigs.price);
        //? }
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