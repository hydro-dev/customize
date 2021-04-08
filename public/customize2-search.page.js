(() => {
    const { $ } = window.node_modules;
    const { AutoloadPage } = window.Hydro;
    const { tpl } = window.Hydro.utils;

    const page = new AutoloadPage('head_search', () => {
        const ele = $(tpl`
        <li class="nav__list-item">
            <style>.b-input{margin-top:.36em} .b-text{color:#000000 !important}</style>
            <label class="b-input inverse material textbox">
                <input class="b-text" type="text" name="q" placeholder="搜索" onkeyup="cb()">
            </label>
        </li>`)[0];
        const header = document.getElementsByClassName('nav__list--main')[0];
        header.appendChild(ele);
        window.cb = () => {
            if (event.keyCode === 13) {
                const val = $('.b-text').val();
                window.location.href = `${UiContext.searchUrl}?q=${val}`;
            }
        };
    });

    window.Hydro.extraPages.push(page);
})();
