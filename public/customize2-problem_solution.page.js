const { _ } = window.node_modules;
const NamedPage = window.Hydro.NamedPage;
const { ConfirmDialog, Notification } = window.Hydro.components;
const { request, tpl, delay, i18n } = window.Hydro.utils;

const page = new NamedPage('problem_solution', () => {
    async function buy() {
        const action = await new ConfirmDialog({
            $body: tpl`
        <div class="typo">
          <p>您还没有通过本题或购买本题的题解。</p>
          <p>点击确认键花费 4 图灵币购买该题题解。</p>
        </div>`,
        }).open();
        if (action !== 'yes') window.history.go(-1);
        try {
            await request.post('', { operation: 'buy', });
            Notification.success(i18n('题解购买成功。'));
            await delay(1000);
            window.location.reload();
        } catch (error) {
            Notification.error(error.message);
        }
    }

    if (UiContext.requireBuy) buy();
});

window.Hydro.extraPages.push(page);
