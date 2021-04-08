import * as bus from 'hydrooj/dist/service/bus';
import { ProblemSolutionHandler } from 'hydrooj/dist/handler/problem';
import { bought, buy } from './model';

async function postBuy({ domainId }) {
    await buy(domainId, this.user._id, this.pdoc.docId);
    this.back();
}

declare module 'hydrooj/dist/handler/problem' {
    interface ProblemSolutionHandler {
        postBuy: typeof postBuy
    }
}

ProblemSolutionHandler.prototype.postBuy = postBuy;

bus.on('handler/init', async (thisArg) => {
    thisArg.UiContext.searchUrl = thisArg.url.call(thisArg, 'problem_main');
});

bus.on('handler/solution/get', async (thisArg) => {
    if (!await bought(thisArg.domainId, thisArg.user._id, thisArg.pdoc.docId)) {
        thisArg.response.body.psdocs.length = 0;
        thisArg.UiContext.requireBuy = true;
    }
});
