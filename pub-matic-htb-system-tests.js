'use strict';

function getPartnerId() {
    return 'PubmaticHtb';
}

function getStatsId() {
    return 'PUBM';
}

function getCallbackType() {
    return 'NONE';
}

function getArchitecture() {
    return 'SRA';
}

function getConfig() {
    return {
        timeout: 1000,
        publisherId: "5890",
        lat:"40.712775",
        lon:"-74.005973",
        yob:"1982",
        gender:"M",
        kadfloor:"1.75",
        profile: 593,
        version: 8,
        xSlots: {
            "1": {
                "adUnitName": "pubmatic_test2",
                "sizes": [ [300, 250], [728, 90] ]
            },
            "2": {
                "adUnitName": "pubmatic_test3",
                "sizes": [ [300, 600], [160, 600], [300, 250] ]
            }
        }
    };
}

function getBidRequestRegex() {
    return {
        method: 'POST',
        urlRegex: /hbopenbid\.pubmatic\.com\/translator\?source=index-client/
    };
}

function validateBidRequest(request) {
    //console.log("##### Manasi in validateBidRequest " + request.query);
    expect(request.query.source).toEqual("index-client");
    expect(request.host).toEqual("hbopenbid.pubmatic.com");
    var body = request.body;
    if (body !== undefined) {
        body = JSON.parse(body);
        expect(body.id).toBeDefined();
        //expect()
    }
}

function getValidResponse(request, creative) {
    //console.log("##### Manasi in getValidResponse " + JSON.stringify(request) + " and creative = " + JSON.stringify(creative));
    var body = JSON.parse(request.body);
    var response = {
        cur: "USD",
        id: "4E733404-CC2E-48A2-BC83-4DD5F38FE9BB",
        seatbid: [{
            seat: "12345",
            bid: [{
                "id": "4E733404-CC2E-48A2-BC83-4DD5F38FE9BB",
                "impid": "_4r5yag141",
                "price": 2.676619,
                "adm": creative,
                "adomain": ["mystartab.com"],
                "cid": "16981",
                "h": 90,
                "w": 728,
                "ext": {
                    "dspid": 6
                }
            }]
        }]
    };

    return JSON.stringify(response);
}

function validateTargeting(targetingMap) {
    //console.log("##### Manasi in validateTargeting targetingMap = " + JSON.stringify(targetingMap));
   /*expect(targetingMap).toEqual(jasmine.objectContaining({
        ix_pubm_cpm: jasmine.arrayContaining(['300x250_200', '300x250_200']),
        ix_pubm_id: jasmine.arrayContaining([jasmine.any(String), jasmine.any(String)])
    }));*/
}

function getPassResponse() {
    return JSON.stringify({ bids: [] });
}

function validateBidRequestWithPrivacy(request) {
    var r = JSON.parse(request.query.r);

    expect(r.regs).toEqual(jasmine.objectContaining({
        ext: {
            gdpr: 1
        }
    }));

    expect(r.user).toEqual(jasmine.objectContaining({
        ext: {
            consent: 'TEST_GDPR_CONSENT_STRING'
        }
    }));
}

function validateBidRequestWithAdSrvrOrg(request) {
    //console.log("Manasi in validateBidRequestWithAdSrvrOrg");
    var body = JSON.parse(request.body);
    expect(body.user.eids.source).toEqual("adserver.org");
    expect(body.user.eids.uids).toEqual(jasmine.arrayContaining([{
        id: 'TEST_ADSRVR_ORG_STRING',
        ext: {
            rtiPartner: 'TDID'
        }
    }]));
}

module.exports = {
    getPartnerId: getPartnerId,
    getStatsId: getStatsId,
    getCallbackType: getCallbackType,
    getArchitecture: getArchitecture,
    getConfig: getConfig,
    getBidRequestRegex: getBidRequestRegex,
    validateBidRequest: validateBidRequest,
    getValidResponse: getValidResponse,
    validateTargeting: validateTargeting,
    getPassResponse: getPassResponse,
    validateBidRequestWithAdSrvrOrg
};
