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
        xSlots: {
            "1": {
                "adUnitName": "/43743431/DMDemo",
                "sizes": [ [300, 250] ]
            },
            "2": {
                "adUnitName": "/43743431/DMDemo1",
                "sizes": [ [728, 90] ]
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
    expect(request.query.source).toEqual("index-client");
    expect(request.host).toEqual("hbopenbid.pubmatic.com");
    var body = request.body;
    if (body !== undefined) {
        body = JSON.parse(body);
        expect(body.id).toBeDefined();
    }
}

function getValidResponse(request, creative) {
    var body = JSON.parse(request.body);
    var response = {
        cur: "USD",
        id: "4E733404-CC2E-48A2-BC83-4DD5F38FE9BB",
        seatbid: [{
            seat: "12345",
            bid: [{
                "id": "4E733404-CC2E-48A2-BC83-4DD5F38FE9BB",
                "impid": body.imp[0].id,
                "price": 2,
                "adm": creative,
                "adomain": ["mystartab.com"],
                "cid": "16981",
                "h": 250,
                "w": 300,
                "ext": {
                    "dspid": 6
                }
            },
            {
                "id": "4E733404-CC2E-48A2-BC83-4DD5F38FE9BC",
                "impid": body.imp[1].id,
                "price": 2,
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
    var isObjEmpty = Object.keys(targetingMap).length === 0 && targetingMap.constructor === Object;
        if (!isObjEmpty) {
        expect(targetingMap).toEqual(jasmine.objectContaining({
            ix_pubm_om: jasmine.arrayContaining([jasmine.any(String), jasmine.any(String)]),
            ix_pubm_id: jasmine.arrayContaining([jasmine.any(String), jasmine.any(String)])
        }));
    }
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
