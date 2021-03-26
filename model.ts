import {
    DomainUserSetting, FLAG_DISABLED, FLAG_HIDDEN, Setting,
} from 'hydrooj/dist/model/setting';
import user from 'hydrooj/dist/model/user';
import domain from 'hydrooj/dist/model/domain';
import { STATUS } from 'hydrooj/dist/model/builtin';
import * as bus from 'hydrooj/dist/service/bus';
import db from 'hydrooj/dist/service/db';
import { BadRequestError } from 'hydrooj/dist/error';

DomainUserSetting(
    Setting('setting_storage', 'coin', 20, 'number', 'Coin count', '', FLAG_HIDDEN | FLAG_DISABLED),
);

interface SolutionBoughtDoc {
    domainId: string,
    uid: number,
    pid: number,
}

declare module 'hydrooj/dist/interface' {
    interface Collections {
        'solution.bought': SolutionBoughtDoc
    }
}

const coll = db.collection('solution.bought');
bus.on('app/started', () => coll.createIndex({ domainId: 1, uid: 1 }, { unique: true }));

export async function buy(domainId: string, uid: number, pid: number) {
    const udoc = await user.getById(domainId, uid);
    udoc.coin = udoc.coin ?? 20;
    if (udoc.coin >= 4) {
        return await Promise.all([
            coll.insertOne({ domainId, uid, pid }),
            domain.incUserInDomain(domainId, uid, 'coin', -4),
        ]);
    }
    throw new BadRequestError('你没有足够的图灵币。');
}

export async function bought(domainId: string, uid: number, pid: number) {
    return !!await coll.findOne({ domainId, uid, pid });
}

export async function accept(domainId: string, uid: number, pid: number) {
    if (await bought(domainId, uid, pid)) {
        await coll.insertOne({ domainId, uid, pid });
    }
}

bus.on('record/judge', async (rdoc, updated) => {
    if (rdoc.status === STATUS.STATUS_ACCEPTED && updated) {
        const dudoc = await domain.getDomainUser(rdoc.domainId, { _id: rdoc.uid, priv: 1 });
        const coin = dudoc.coin ?? 20 + 2;
        await domain.setUserInDomain(rdoc.domainId, rdoc.uid, { coin });
        await (global.Hydro.handler.judge as any).next({
            domainId: rdoc.domainId,
            rid: rdoc._id,
            message: `恭喜您首次通过本题，获得 2 图灵币，当前共有 ${coin} 个。`,
        });
    }
});
