var partnerStub = require('./partnerStub.js');
var openRtbStub = require('./openRtbStub.js');
/* Instantiate mock browser objects */
var MockBrowser = require('mock-browser').mocks.MockBrowser;
var mock = new MockBrowser();

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
        getProtocol: function () {
            return this.topWindow.location.protocol;
            //return "https:";
        },
        getReferrer: function () {
            return this.topWindow.document.referrer;
            //return 'localhost';
        },
        getPageUrl: function () {
            return this.topWindow.location.href; 
            //'http://localhost';
        },
        getUserAgent: function () {
            return this.topWindow.navigator.userAgent;
            //return 'Mozilla/5.0 (Windows; U; Windows NT 6.1; rv:2.2) Gecko/20110201';
        },
        getLanguage: function () {
            return this.topWindow.navigator.language;
            //return 'en-US';
        },
        getScreenWidth: function () {
            return 1024;
        },
        getScreenHeight: function () {
            return 768;
        },
        topWindow: mock.getWindow(),
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
        }
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
