// 取得右側顯示區域
const contentArea = document.getElementById("content");

// 左側按鈕綁定事件
document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => {
        let page = button.dataset.page;
        loadPage(page);
    });
});

// 動態載入外部 HTML 頁面
function loadPage(pageName) {
    fetch(`pages/${pageName}.html`)
        .then(res => res.text())
        .then(html => {
            contentArea.innerHTML = html;
        })
        .catch(err => {
            contentArea.innerHTML = `<p style="color:red">載入失敗：${err}</p>`;
        });
}

