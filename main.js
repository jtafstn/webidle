function loadPage(page) {
  let content = "";

  if (page === "page1") {
    content = `
      <h2>資源頁面</h2>
    `;
  }

  else if (page === "page2") {
    content = `
      <h2>建造頁面</h2>
      <p>可以建造的項目：</p>
      <ul>
        <li>1</li>
        <li>2</li>
        <li>3</li>
      </ul>
    `;
  }

  else if (page === "page3") {
    content = `
      <h2>商店頁面</h2>
      <p>你可以</p>
    `;
  }

  // 將內容塞進右邊容器
  document.getElementById("contentArea").innerHTML = content;
}
