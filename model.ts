import 'hydrooj';
import { NotFoundError, PermissionError } from 'hydrooj/dist/error';
import * as bus from 'hydrooj/dist/service/bus';
import {
    AccountSetting, Setting, FLAG_DISABLED, FLAG_HIDDEN,
} from 'hydrooj/dist/model/setting';

declare module 'hydrooj/dist/interface' {
    interface Pdoc {
        vipLevel?: number,
        isCourse?: boolean,
    }
    interface Udoc {
        vipLevel?: number,
        vipExpire?: number,
    }
    interface User {
        vipLevel?: number,
        /** timestamp */
        vipExpire?: number,
    }
}

AccountSetting(
    Setting('setting_storage', 'vipLevel', null, 0, 'number', 'vipLevel', 'vipLevel', FLAG_DISABLED | FLAG_HIDDEN),
    Setting('setting_storage', 'vipExpire', null, 0, 'number', 'vipExpire', 'vipExpire', FLAG_DISABLED | FLAG_HIDDEN),
);

bus.on('problem/list', (query) => {
    if (!query.$and) query.$and = [];
    query.$and.push(
        { $or: [{ isCourse: { $exists: false } }, { isCourse: false }] },
    );
});

bus.on('problem/get', (pdoc, handler) => {
    if (pdoc.isCourse) throw new NotFoundError(pdoc.pid || pdoc.docId);
    if (pdoc.vipLevel > handler.user.vipLevel) throw new PermissionError(`请先开通VIP ${pdoc.vipLevel}`);
});

bus.on('problem/setting', (update, handler) => {
    update.vipLevel = handler.args['vip level'];
});

bus.on('user/get', (user) => {
    const now = new Date().getTime();
    if (user.vipExpire < now) user.vipLevel = 0;
});
