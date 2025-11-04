// モバイルメニュー開閉
document.getElementById("mobile-menu-btn").addEventListener("click", () => {
  document.getElementById("mobile-menu").classList.toggle("hidden");
});

// フォーム送信（ダミー動作）
document.getElementById("contact-form").addEventListener("submit", (e) => {
  e.preventDefault();
  document.getElementById("form-msg").textContent = "送信が完了しました（ダミー）";
  e.target.reset();
  setTimeout(() => {
    document.getElementById("form-msg").textContent = "";
  }, 4000);
});
