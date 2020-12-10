/* eslint-disable no-await-in-loop */
import { ObjectID } from 'mongodb';
import AdmZip from 'adm-zip';
import { filter } from 'lodash';
import { safeLoad } from 'js-yaml';
import { streamToBuffer } from 'hydrooj/dist/utils';
import { Logger } from 'hydrooj/dist/logger';
import { PRIV } from 'hydrooj/dist/model/builtin';
import * as user from 'hydrooj/dist/model/user';
import * as record from 'hydrooj/dist/model/record';
import * as file from 'hydrooj/dist/model/file';
import * as contest from 'hydrooj/dist/model/contest';
import * as domain from 'hydrooj/dist/model/domain';
import * as problem from 'hydrooj/dist/model/problem';
import {
    Types, param, Handler, Route,
} from 'hydrooj/dist/service/server';
import { ContestNotFoundError } from 'hydrooj/dist/error';

const extMap = {
    cpp: 'cc',
    cc: 'cc',
    pas: 'pas',
};
const logger = new Logger('contest-submit');

class ContestSubmitManyHandler extends Handler {
    @param('tid', Types.ObjectID)
    @param('ufid', Types.ObjectID)
    async get(domainId: string, tid: ObjectID, ufid: ObjectID) {
        const tdoc = await contest.get(domainId, tid);
        if (!tdoc) throw new ContestNotFoundError(domainId, tid);
        let pidMap = {};
        let config = {};
        try {
            config = safeLoad(tdoc.content);
        } catch { /* ignore */ }
        if (typeof config !== 'object') config = {};
        for (const pid of tdoc.pids) {
            const pdoc = await problem.get(domainId, pid);
            pidMap[pdoc.pid] = pdoc.docId;
            pidMap[pdoc.title] = pdoc.docId;
            pidMap[pdoc.docId] = pdoc.docId;
        }
        pidMap = { ...pidMap, ...config };
        const zip = new AdmZip(await streamToBuffer(await file.get(ufid)));
        const files = filter(zip.getEntries(), (entry) => !entry.isDirectory);
        logger.info('Total %d', files.length);
        (async () => {
            for (const i in files) {
                const entry = files[i];
                if (!(+i % 100)) logger.info('Current %d, Total %d', i, files.length);
                const [uname, arg0, arg1] = entry.entryName.split('/');
                const [pid, ext, extra] = arg1 ? [arg0, arg1.split('.')[1]] : arg0.split('.');
                if (extra || !pidMap[pid] || !extMap[ext]) continue;
                const lang = extMap[ext];
                const code = entry.getData().toString();
                // Ignore big files.
                if (code.length > 10 * 1024 * 1024) continue;
                const udoc = await user.getByUname(domainId, uname);
                const uid = udoc ? udoc._id : await user.create(`${uname}@hydro.local`, uname, Math.random().toString());
                const tsdoc = await contest.getStatus(domainId, tid, uid);
                if (tsdoc?.attend !== 1) await contest.attend(domainId, tid, uid);
                const rid = await record.add(domainId, pidMap[pid], uid, lang, code, true, {
                    type: tdoc.docType as any,
                    tid,
                });
                logger.debug('%s/%s submitted to %s with id %s', uname, arg0, pid, rid.toHexString());
                await Promise.all([
                    problem.inc(domainId, pidMap[pid], 'nSubmit', 1),
                    domain.incUserInDomain(domainId, uid, 'nSubmit'),
                    contest.updateStatus(domainId, tdoc.docId, uid, rid, pidMap[pid]),
                ]);
            }
        })().catch(logger.error);
        this.response.redirect = this.url('record_main', { tid });
    }
}

export async function apply() {
    Route('contest_submit_many', '/contest/:tid/submit', ContestSubmitManyHandler, PRIV.PRIV_MANAGE_ALL_DOMAIN);
}

global.Hydro.handler.contestSubmitMany = apply;
