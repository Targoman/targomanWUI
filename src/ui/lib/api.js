import { eval_literal } from './common';

const URL = 'https://targoman.test/TestAPI/';

const AdvertMethods = [
    "getTranslationProvidersList(ssid,type,order)",
    "getNewImage(ssid,order='3',page=null)",
    "getNewText(ssid,order='Rand',page=null,keywords=[])",
    "retrieveURL(ssid,advID,clientIP='127.0.0.10',agent='web')",
    "listAdvertisements(ssid)",
    "listStatistics(ssid,advID)",
    "newAdvertisement(ssid,type,title,description,url,properties=[])",
    "editAdvertisement(ssid,advID,newType=null,newTitle=null,newDescription=null,newUrl=null,newProperties=null,newStatus=null)",
    "testToken(token,args=null)",
    "sessionPrivs(ssid)",
    "listMethods()"
];

const TargomanMethods = [
    "translate(ssid,text,dir,clientIP='127.0.0.10',engine='SMT',detailed=false,dic=false,dicFull=false,tuid=null,class=null)",
    "uploadFileAndConvert2HTML(ssid,clientIP,encoding,data)",
    "getConvertedFile(ssid,tuid)",
    "tts(ssid,base64Text,type='ogg')",
    "lookupDic(ssid,word)",
    "translateArray(ssid,clientIP,dir,array,url)",
    "arrayResponse(ssid,reqID,from)",
    "doSimpleTranslationBySSID(ssid,sourcePhrase,dir,clientIP,engine='NMT')",
    "testToken(token,args=null)",
    "sessionPrivs(ssid)",
    "listMethods()"
];

const CommunityMethods = [
    "getUserSuggestions(ssid)",
    "addAnonymousVote(ssid,sourceText,targetText,vote)",
    "getOverallSuggestionsStats(ssid,justUser=false)",
    "getTranslationSuggestion(ssid,dir)",
    "getVotingPhrase(ssid,dir)",
    "insertTranslation(ssid,suggestionID,Tranlsation)",
    "insertVote(ssid,suggestionID,vote)",
    "insertVoteMulti(ssid,votes=[])",
    "skip(ssid,suggestionID)",
    "getUserDetailedStatistics(ssid)",
    "listTopUsers(ssid,count)",
    "saveSuggestion(ssid,dir,sourceText,suggestion)",
    "testToken(token,args=null)",
    "sessionPrivs(ssid)",
    "listMethods()"
];

function localize(message) {
    return message;
}

class JsonRPC {
    constructor(_url, _namespace) {
        this.url = _url;
        this.namespace = _namespace;
        this.version = '2.0';
        this.id = 1;
        this.cache = true;
    }

    createErrorObject(message) {
        return {
            error: message,
            version: this.version
        };
    }

    createUrlAndData(method, params, blob) {
        let jsonRpcParams = {
            jsonrpc: this.version,
            method: this.namespace ? this.namespace + '::' + method : method,
            id: this.id,
            params: params
        };
        let urlParams, data;
        if (blob) {
            urlParams = '?v2=' + encodeURIComponent(JSON.stringify(jsonRpcParams));
            data = blob;
        } else {
            urlParams = '';
            data = jsonRpcParams;
        }
        return { url: this.url + urlParams, data: data };
    }

    request(method, params, blob) {
        var urlAndData = this.createUrlAndData(method, params, blob);
        var request = fetch(urlAndData.url, {
            method: 'POST',
            cache: this.cache ? "force-cache" : "no-cache",
            headers: { 'Content-Type': blob ? 'application/octet-stream' : 'application/json' },
            mode: "cors",
            credentials: "same-origin",
            body: JSON.stringify(urlAndData.data)
        });
        return request.then(r => r.json()).then(data => {
            if (data === undefined)
                throw Error('Invalid JSON result');
            try {
                if (data.error) {
                    throw Error(`${data.error.message}(${data.error.code})`);
                } else
                    return data;
            } catch (e) {
                throw Error('Invalid JSON result: ' + e.message);
            }
        });
    }
}

class Api {

    static interpretRawMethodDef(rawMethodDef) {
        let result = {};
        let parts = rawMethodDef.match(/^(.*)\((.*)\)$/);
        result.name = parts[1];
        result.params = { text: parts[2], value: [] };
        result.params.value.required = 0;
        let regex = /([\w\d]+)(?:=('[^']*'|"[^"]*"|[^,]+))?(?:,|$)/g;
        while ((parts = regex.exec(result.params.text)) !== null) {
            let item = { name: parts[1], defaultValue: eval_literal(parts[2]) };
            result.params.value.push(item);
            if (item.defaultValue === undefined)
                result.params.value.required++;
        };
        result.params = result.params.value;
        return result;
    }

    static prepareMethodParams(params, methodDef) {
        if (params.length < methodDef.params.required)
            return false;
        for (var i = 0; i < params.length; ++i)
            if (methodDef.params[i].name === 'remoteIP' || methodDef.params[i].name === 'clientIP')
                params[i] = '127.0.0.10';
            else if (methodDef.params[i].name === 'ssid')
                params[i] = 'sSTargomanWUI';
        while (params.length < methodDef.params.length) {
            var index = params.length;
            params.push(methodDef.params[index].defaultValue);
        }
        return true;
    };

    static createApiMethod(api, methodDef) {
        function result(...params) {
            if (!Api.prepareMethodParams(params, methodDef))
                throw Error(localize("Not enough parameters."));
            if (params.length === methodDef.params.length + 1)
                return api.request(methodDef.name, params.slice(0, params.length - 1), params[params.length - 1]);
            else
                return api.request(methodDef.name, params);
        };
        result.info = methodDef;
        return result;
    }

    createThisApiMethods(rawMethodDefs) {
        for (let rawMethodDef of rawMethodDefs) {
            let methodDef = Api.interpretRawMethodDef(rawMethodDef)
            this[methodDef.name] = Api.createApiMethod(
                this.api,
                methodDef
            );
        }
    }

    constructor(url, _class, methodDescriptors) {
        let api = this.api = new JsonRPC(url, _class);
        if (methodDescriptors)
            this.createThisApiMethods(methodDescriptors);
        else {
            api.request('listMethods', {}).then(function (data) {
                this.createThisApiMethods(data.result);
            }, function (data) {
                setTimeout(getMethods, 1000);
            });
        }
    }
}

export const TargomanAPI = new Api(URL, 'Targoman', TargomanMethods);
export const AdvertAPI = new Api(URL, 'Advert', AdvertMethods);
export const CommunityAPI = new Api(URL, 'Community', CommunityMethods);
