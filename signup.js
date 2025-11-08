// ===============================
// アカウント作成ページ (signup.html)
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  if (!signupForm) return;

  const alumniTags = document.getElementById("alumniTags");
  const tagOptions = document.querySelectorAll(".tag-option");
  let selectedTags = [];

  // ① 卒業生を選んだときだけタグ表示
  const userTypeRadios = document.querySelectorAll('input[name="userType"]');
  userTypeRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      if (radio.value === "卒業生" && radio.checked) {
        alumniTags.classList.remove("hidden");
      } else {
        alumniTags.classList.add("hidden");
        selectedTags = [];
        tagOptions.forEach(t => t.classList.remove("selected"));
      }
    });
  });

  // ② タグ選択処理
  tagOptions.forEach(tag => {
    tag.addEventListener("click", () => {
      const tagName = tag.dataset.tag;
      if (selectedTags.includes(tagName)) {
        selectedTags = selectedTags.filter(t => t !== tagName);
        tag.classList.remove("selected");
      } else if (selectedTags.length < 3) {
        selectedTags.push(tagName);
        tag.classList.add("selected");
      }
    });
  });

  // ③ フォーム送信
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const userType = document.querySelector('input[name="userType"]:checked').value;
    const email = document.getElementById("email").value;
    const nickname = document.getElementById("nickname").value;
    const grade = document.getElementById("grade").value;

    const userData = {
      id: Date.now().toString(),
      userType,
      email,
      nickname,
      grade,
      tags: selectedTags,
      created_at: new Date().toISOString()
    };

    localStorage.setItem("currentUser", JSON.stringify(userData));

    alert(`✅ ${nickname} さんのアカウントを作成しました！`);
    window.location.href = "archive.html";
  });
});
