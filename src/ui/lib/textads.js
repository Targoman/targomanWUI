import { notify } from './common';
import { AdvertAPI } from './api';


const UPDATE_TEXT_AD_INTERVAL=10000;
const RETRY_INTERVAL=2000;

class TextAdHandler {
    constructor(e, forcedOrder) {
        this.link = e.querySelector('a');
        this.titleSpan = e.querySelector('h2.ad-title');
        this.descPar = e.querySelector('p.ad-desc');
        this.linkPar = e.querySelector('p.ad-link');
        if(!this.link || !this.titleSpan || !this.descPar || !this.linkPar)
            throw Error('A text ad container must have an anchor(<a/>), `h2.ad-title`, `p.ad-desc` and `p.ad-link`.');
        if(forcedOrder !== null)
            this.getAdOrder = () => forcedOrder;
        else {
            this.adOrder = 1;
            this.getAdOrder = this.normalAdOrder;
        }
        this.handleClick = this.handleClick.bind(this);
        this.link.addEventListener('click', this.handleClick);
        this.updateAdContents();
    }

    handleClick() {
        AdvertAPI.retrieveURL('ssid', parseInt(this.link.dataset.advID)).then(
            r => {
                if(r.error) {
                    notify('خطا', 'متأسفانه در دریافت لینک تبلیغات مشکلی پیش آمده است.', 'error');
                    return;
                }
                window.open(r.result, 'targoman-text-ad');
            },
            e => {
                notify('خطا', 'متأسفانه در دریافت لینک تبلیغات مشکلی پیش آمده است.', 'error');
            }
        );
    }

    normalAdOrder() {
        let result = 3;
        if(this.adOrder === 1 || this.adOrder === 2)
            result = this.adOrder;
        if(this.adOrder % 5 === 0)
            result = 5;
        this.adOrder += 1;
        return result;
    }

    updateAdContents() {
        AdvertAPI.getNewText('ssid', this.getAdOrder(), 'Landing').then(
            data => this.applyReceivedAdData(data.result),
            e => setTimeout(() => this.updateAdContents(), RETRY_INTERVAL)
        );
    }

    applyReceivedAdData(adInfo) {
        this.titleSpan.textContent = adInfo.adbTitle;
        this.descPar.textContent = adInfo.adbDesc;
        this.linkPar.textContent = adInfo.adbPrettyURL;
        this.link.dataset.advID = adInfo.adbID;
        setTimeout(() => this.updateAdContents(), UPDATE_TEXT_AD_INTERVAL);
    }
}

class TextAd {
    applyTo(e) {
        return new TextAdHandler(
            e,
            e.dataset.forcedOrder ?
                parseInt(e.dataset.forcedOrder) :
                null
        );
    }
}

let Instance = new TextAd();

export default Instance;