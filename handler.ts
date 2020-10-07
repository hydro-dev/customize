import {
    BadRequestError, InvalidTokenError, PermissionError,
} from 'hydrooj/dist/error';
import {
    Handler, Route, param, Types,
} from 'hydrooj/dist/service/server';
import * as token from 'hydrooj/dist/model/token';
import * as system from 'hydrooj/dist/model/system';
import * as problem from 'hydrooj/dist/model/problem';
import * as user from 'hydrooj/dist/model/user';
import { PERM, PRIV, CONSTANT } from 'hydrooj/dist/model/builtin';
import { isTitle, isPid, isContent } from 'hydrooj/dist/lib/validator';
import paginate from 'hydrooj/dist/lib/paginate';
import moment from 'moment';
import AlipaySdk from 'alipay-sdk';
import AlipayFormData from 'alipay-sdk/lib/form';
import './model';

const TOKEN_TYPE_VIP = 15122;
const TOKEN_TYPE_TRADE = 15123;

const sdk = new AlipaySdk({
    appId: '2021000116694381',
    privateKey: 'MIIEogIBAAKCAQEAiN2rH4rs3MyqxakzFex6BLT8kuboCDYJE2WpRBwzSiroZinAn/SFnBotRVQBTpYdoeYcs+cFzpgQoDKlrWnnyyAWVdYPl1Zw5ocb5URrj/8Y82+cu9AXR1D8xo1oEa16yJSV8zPDXapo8atYvUVwp475wLMP4wYPXgcE8/qb6/fPdeiccQyMG6lVsu2a0ZDu7Dq0fH/X2I2U7rfNF4uYHfWTjYZFP91I+y0Aq42F0yh4dKEapqhoJ4uCovCcq+M95I+5T8O1vICQxVi2IQny9XMQ10mV58L3YZ4vD1OQdO3Tj9kpiGhp0JftwNqRco5nYNt14a4VqkHDjqZ49SmEMQIDAQABAoIBAAI2KsS4tvkeaYgGIugwyQv4bLhm+MrhLKZelyydlAqXxOeZtx4ekmYiWibro5XEgTgTgtU5X3OmK2abSugRdQhoPVQnwFq+r9ZZyo6a224ZPir427yBMU8atOr0cAERH5HMLNwgMwD5dvaowSdVzus2OTzu58vQVkE7tc3Hd+uJMIcSAY7VG/yOtnZG6EgIlIz1Tfr4GvbjSSBSWm+gr0/RkuLhkOzGtAwaxkxPWIQjqYG6uJLwRHBqjTK3RXHMqAQvxl+ViLZO7K09hotATbog2GnijK9ltGBruPgKTMAB0S1xfRXciebeDV18BS5xUtx9jYnjhdsIVI5jWw3pYFECgYEAxafF9nzetWCFib4hAYWruU+UM5xSQxrCB9cbc6LjEiygHFEyq5yrOrMOSqSJh3zTSOw9H1vZsWYkQrzv7cTIxCSZ1FNoleA0K2yfl4zOHiMZAu//BbvY90Tz6lAO6YA8TpTE7q8BFnzYIZwVvkJnIbK1xemD23ITV6Gs9e3tk20CgYEAsUQ3SSpon+/pSqERmctTDwuklZlUCIkJMNfq+QHNw/KR+LJtRW4aaH8JlSFzef1Ui8gneVHbMWSUEHQH5YSxH2DEM/J3k+7CICt4JOsN6A5n8a91dGJz2G/MgEWb+FjgnRdxaaljg9F2vIruPip4qgvXW38KI1yjhZ4whWGKNVUCgYBBaNwiTgCFlYObqcfScSH7GVK6Iak3e8tqPM1g3y61/P6fYF+cWyRvMIIyQXEh3TUulL9FeWf5RQwK6euci9rEzjf6BABAWQnqtO+7f2VWo9bLGhETHK8YZUEy8Xt92moatzDUrCV4A6iitrybUe4/QJzW+gggvweXoHFUkYBloQKBgDC9A8JfIaMP0IHPZUp2x+B0IA1tudga7Wb7hsRuBYghkpbhX//d9O7UNutE5j4dM/i20Huf0Pd0ou0fKeimIhjxfyCVQuFunPtBWGg2JH2wME4YIuAcDaPtoTmHagnPTfqDLpCRnSXqGo5eWIDJJqICXXTvqfbtCpy7ULXripd9AoGAbOl32W99pLHd5UUlgM84UfMoRcr701iLLcl6y/LmeRzJfz24hjiM80bF2rYd4YVtCtBNktr1wxIc9hWPq/PQdkGgz0y9ZNtfSRhgiiVREqB02XIojsB3SOP0susAt7f0T+IabAy78ozYjgroszjbJKzqT1qKSf3GCdTbqBD8hTw=',
    encryptKey: 'd0Eg3wz3EjjKzJq7548E5A==',
    gateway: 'https://openapi.alipaydev.com/gateway.do',
});

const parseNodes = (content: string) => content.replace(/\r/gmi, '').split('\n\n').map((node) => {
    const lines = node.split('\n');
    const [title, image] = lines[0].split(' ');
    lines.shift();
    return {
        title,
        image,
        url: lines.map((line) => line.split(' ')),
    };
});

class VipPurchaseHandler extends Handler {
    async get() {
        const [tid] = await token.add(TOKEN_TYPE_TRADE, 24 * 3600, { uid: this.user._id });
        const total_amount = 0.01;
        const formData = new AlipayFormData();
        formData.addField('returnUrl', `${system.get('server.url')}/vip/callback`);
        formData.addField('bizContent', {
            out_trade_no: tid,
            product_code: 'FAST_INSTANT_TRADE_PAY',
            total_amount,
            subject: 'VIP',
            timeout_express: '30m',
        });
        const result = await sdk.exec('alipay.trade.page.pay', {}, { formData });
        this.response.body = result;
        this.response.type = 'text/html';
    }
}

class VipCallbackHandler extends Handler {
    // eslint-disable-next-line class-methods-use-this
    async get() {
        // TODO: handle alipay cb
    }
}

class VipActivateHandler extends Handler {
    async get(args: any) {
        // @ts-ignore
        if (args.code) this.post(args);
        else this.response.template = 'vip_activate.html';
    }

    @param('code', Types.String)
    async post(domainId: string, code: string) {
        const doc = await token.get(code, TOKEN_TYPE_VIP);
        if (!doc) throw new InvalidTokenError(code);
        const { vipLevel, vipDuration } = doc;
        if (this.user.vipLevel < vipLevel) {
            const vipExpire = moment().add(vipDuration, 'months').toDate().getTime();
            await user.setById(this.user._id, { vipLevel, vipExpire });
        } else if (this.user.vipLevel === vipLevel) {
            const now = new Date().getTime();
            const vipExpire = moment(Math.max(this.user.vipExpire, now)).add(vipDuration, 'months').toDate().getTime();
            await user.setById(this.user._id, { vipLevel, vipExpire });
        } else throw new BadRequestError('You\'ve already have a higher level vip!');
        await token.del(code, TOKEN_TYPE_VIP);
        this.response.redirect = '/';
    }
}

class CreateVIPCodeHandler extends Handler {
    @param('level', Types.UnsignedInt)
    @param('duration', Types.UnsignedInt)
    async get(domainId: string, vipLevel: number, vipDuration: number) {
        console.log(1);
        const [tokenId] = await token.add(TOKEN_TYPE_VIP, 1111111111, { vipLevel, vipDuration });
        this.response.body = { tokenId };
    }
}

class CourseMainHandler extends Handler {
    @param('page', Types.PositiveInt, true)
    async get(domainId: string, page = 1) {
        const [tdocs, tpcount] = await paginate(
            problem.getMulti(domainId, { isCourse: true }),
            page,
            CONSTANT.TRAINING_PER_PAGE,
        );
        const path = [
            ['Hydro', 'homepage'],
            ['课程', null],
        ];
        this.response.template = 'course_main.html';
        for (const tdoc of tdocs) {
            tdoc.content = parseNodes(tdoc.content);
        }
        this.response.body = {
            tdocs, page, tpcount, path,
        };
    }
}

class CourseCreateHandler extends Handler {
    async get() {
        const path = [
            ['Hydro', 'homepage'],
            ['创建课程', null],
        ];
        this.response.template = 'course_edit.html';
        this.response.body = { page_name: 'course_create', path };
    }

    @param('title', Types.String, isTitle)
    @param('content', Types.String, isContent)
    async post(domainId: string, title: string, content: string) {
        const tid = await problem.add(domainId, null, title, content, this.user._id);
        await problem.edit(domainId, tid, { isCourse: true });
        this.response.body = { tid };
        this.response.redirect = this.url('course_detail', { tid });
    }
}

class CourseEditHandler extends Handler {
    @param('tid', Types.UnsignedInt)
    async get(domainId: string, tid: number) {
        const path = [
            ['Hydro', 'homepage'],
            ['编辑课程', null],
        ];
        const tdoc = await problem.get(domainId, tid);
        if (tdoc.owner === this.user._id) this.checkPerm(PERM.PERM_EDIT_TRAINING_SELF);
        else this.checkPerm(PERM.PERM_EDIT_TRAINING);
        this.response.template = 'course_edit.html';
        this.response.body = { tdoc, path };
    }

    @param('tid', Types.UnsignedInt)
    @param('title', Types.String, isTitle)
    @param('content', Types.String, isContent)
    async post(domainId: string, tid: number, title: string, content: string) {
        await problem.edit(domainId, tid, { title, content, isCourse: true });
        this.response.body = { tid };
        this.response.redirect = this.url('course_detail', { tid });
    }
}

class CourseDetailHandler extends Handler {
    @param('tid', Types.UnsignedInt)
    async get(domainId: string, tid: number) {
        const tdoc = await problem.get(domainId, tid);
        if (tdoc.vipLevel > this.user.vipLevel) throw new PermissionError(`请先开通VIP ${tdoc.vipLevel}`);
        const path = [
            ['Hydro', 'homepage'],
            ['课程详情', null],
        ];
        const owner = await user.getById(domainId, tdoc.owner);
        this.response.template = 'course_detail.html';
        this.response.body = {
            path, tdoc, owner, nodes: parseNodes(tdoc.content),
        };
    }
}

class LessonCreateHandler extends Handler {
    async get() {
        this.response.template = 'lesson_edit.html';
        this.response.body = {
            path: [
                ['Hydro', 'homepage'],
                ['创建课程', null],
            ],
            page_name: 'lesson_create',
        };
    }

    @param('title', Types.String, isTitle)
    @param('pid', Types.String, isPid, true)
    @param('content', Types.String, isContent)
    async post(domainId: string, title: string, pid: string, content: string) {
        const docId = await problem.add(
            domainId, pid, title, content,
            this.user._id, [], [], null, false,
        );
        await problem.edit(domainId, docId, { isCourse: true });
        this.response.body = { pid: docId };
        this.response.redirect = this.url('lesson_detail', { pid: docId });
    }
}

export async function apply() {
    Route('vip_purchase', '/vip/purchase', VipPurchaseHandler, PRIV.PRIV_USER_PROFILE);
    Route('vip_callback', '/vip/callback', VipCallbackHandler, PRIV.PRIV_USER_PROFILE);
    Route('vip_activate', '/vip/activate', VipActivateHandler, PRIV.PRIV_USER_PROFILE);
    Route('code_create', '/vip/createCode', CreateVIPCodeHandler, PERM.PERM_ADMIN);
    Route('course_main', '/course', CourseMainHandler);
    Route('course_create', '/course/create', CourseCreateHandler, PERM.PERM_CREATE_TRAINING);
    Route('course_detail', '/course/:tid', CourseDetailHandler);
    Route('course_edit', '/course/:tid/edit', CourseEditHandler, PERM.PERM_EDIT_TRAINING);
    Route('lesson_create', '/lesson/create', LessonCreateHandler, PERM.PERM_CREATE_PROBLEM);
    global.Hydro.ui.Nav('@@1@@course_main', {}, 'course_main');
}

global.Hydro.handler.vip = apply;
