var partnerStub = require('./partnerStub.js');
var openRtbStub = require('./openRtbStub.js');
var libraryStubData = {
    'bid-transformer.js': function (config) {
        return {
            apply: function (price) {
                switch (config.roundingType) {
                    case 'FLOOR':
                        return Math.floor(price);
                    case 'NONE':
                    default:
                        return Math.round(price);
                }
            }
        }
    },
    'browser.js': {
        getDomain: function() {
            //return window.location.hostname;
            return "ebay.com";
        },
        getTrackingInfo: function() {
            return 0;
            /*return (navigator.doNotTrack == 'yes' || 
                    navigator.doNotTrack == '1' || 
                    navigator.msDoNotTrack == '1') 
                    ? 1 : 0;*/
        },
        getProtocol: function () {
            //return window.location.protocol;
            return 'http:';
        },
        getReferrer: function () {
            //return document.referrer;
            return 'localhost';
        },
        getPageUrl: function () {
            //return window.location.href;
            return 'http://localhost';
        },
        getUserAgent: function () {
            //return navigator.userAgent;
            return 'Mozilla/5.0 (Windows; U; Windows NT 6.1; rv:2.2) Gecko/20110201';
        },
        getLanguage: function () {
            //return window.navigator.language;
            return 'en-US';
        },
        getTopWindowLocation: function () {
            /*let location;
            try {
                // force an exception in x-domain enviornments. #1509
                window.top.location.toString();
                location = window.top.location;
            } catch (e) {
                location = window.location;
            }*/
            location = "http://localhost"
            return location;
        },
        getTopWindowUrl: function () {
            /*let href;
            try {
                href = this.getTopWindowLocation().href;
            } catch (e) {
                href = mock.getLocation();
            }
            href = mock.getNavigator().userAgent;*/
            href = "http://ebay.com/inte/123.html?pwtv=8\u0026pwtvc=1\u0026profileid=593";
            return href;
        },
        getTopWindowReferrer: function() {
          /*try {
            return window.top.document.referrer;
          } catch (e) {
            return document.referrer;
          }*/
          return "";
        },
        getScreenHeight: function(win) {
            if(win) {
                var screenHeight = -1;
                win.innerHeight ? (screenHeight = win.innerHeight) : win.document && win.document.documentElement && win.document.documentElement.clientHeight ? (screenHeight = win.document.documentElement.clientHeight) : win.document.body && (screenHeight = win.document.body.clientHeight);
                return screenHeight;
            } else {
                return 0;
            }
        },
        getScreenWidth: function(win) {
            if (win) {
                var screenWidth = -1;
                win.innerHeight ? (screenWidth = win.innerWidth) : win.document && win.document.documentElement && win.document.documentElement.clientWidth ? (screenWidth = win.document.documentElement.clientWidth) : win.document.body && (screenWidth = win.document.body.clientWidth);
                return screenWidth;
            } else {
                return 0;
            }
        },
        isSecure: function () {
            return this.getProtocol() === "https:" ? 1 : 0;
        }
    },
    'classify.js': {
        derive: function (baseClass, derivedClass) {
            return derivedClass;
        },
    },
    'constants.js': {
        LineItemTypes: {
            ID_AND_SIZE: 0,
            ID_AND_PRICE: 1
        },
        Keys: {
            PLACEMENTID: "placementId",
            XSLOTREF: "xSlotRef",
            SIZES: "sizes",
            PMZONEID: 'pmzoneid',
            KADFLOOR: 'kadfloor',
            LAT: 'lat', 
            LON: 'lon',
            YOB: 'yob'
        },
        AUCTION_TYPE: 1,
        PUBMATIC_PARTNER_ID: "PubMaticHtb",
        CURRENCY: 'USD',
        UNDEFINED: undefined,
        SLOT: 'slot'
    },
    'partner.js': partnerStub,
    'openrtb.js': openRtbStub,
    'size.js': {
        arrayToString: function (arr) {
            return arr[0] + 'x' + arr[1];
        },
    },
    'network.js': {
        isXhrSupported: function () {
            return true;
        }
    },
    'space-camp.js': {
        services: {
            EventsService: {
                emit: function (eventName, data) {
                    return;
                }
            },
            RenderService: {
                registerAdByIdAndSize: function () {
                    return;
                },
                registerAdByIdAndPrice: function () {
                    return;
                },
                registerAd: function () {
                    return '_' + Math.random().toString(36).substr(2, 9);
                }
            }
        },
    },
    'system.js': {
        generateUniqueId: function () {
            return '_' + Math.random().toString(36).substr(2, 9);
        },
        documentWrite: function (doc, adm) {
            return adm;
        },
    },
    'utilities.js': {
        isA: function (object, _t) {
          return toString.call(object) === '[object ' + _t + ']';
        },
        isStr: function(object) {
            return this.isA(object, "String");
        },
        logWarn: function (msg) {
          if (debugTurnedOn()) {
            console.warn('WARNING: ' + msg);
          }
        },
        logInfo: function (msg) {
          if (debugTurnedOn()) {
            console.warn('INFO: ' + msg);
          }  
        },
        debugTurnedOn: function() {
            return false;
        }
    },
    'whoopsie.js': function () {
        return null;
    },
    'config-validators.js': {
        partnerBaseConfig: function () {
            return null;
        },
    },
    'scribe.js': {
        info: function () {
            return;
        },
    },
    'pub-matic-htb-validator.js': function () {
        return null;
    }
};
module.exports = libraryStubData;
