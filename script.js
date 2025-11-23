// ===============================
// タグ選択（post.html）
// ===============================
let selectedTags = [];

document.addEventListener("DOMContentLoaded", () => {
  const tagElements = document.querySelectorAll(".tag-option");
  tagElements.forEach(tag => {
    tag.addEventListener("click", () => {
      const tagName = tag.dataset.tag;
      if (selectedTags.includes(tagName)) {
        selectedTags = selectedTags.filter(t => t !== tagName);
        tag.classList.remove("selected");
      } else {
        selectedTags.push(tagName);
        tag.classList.add("selected");
      }
    });
  });
});

// ===============================
// 投稿処理（post.html）
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const postForm = document.getElementById("postForm");
  if (!postForm) return;

  postForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value;
    const content = document.getElementById("content").value;

    const newPost = {
      id: Date.now().toString(),  // ← 文字列にしておくのが重要！
      title,
      content,
      tags: selectedTags,
      created_at: new Date().toISOString()
    };

    const posts = JSON.parse(localStorage.getItem("posts") || "[]");
    posts.push(newPost);
    localStorage.setItem("posts", JSON.stringify(posts));

    showSuccessAnimation();
  });
});

function showSuccessAnimation() {
  const overlay = document.createElement("div");
  overlay.className = "success-overlay";
  overlay.innerHTML = `
    <div class="success-card">
      <div class="checkmark">✅</div>
      <h3>投稿が完了しました！</h3>
      <p>あなたの相談が公開されました。</p>
    </div>
  `;
  document.body.appendChild(overlay);

  setTimeout(() => {
    overlay.classList.add("fade-out");
  }, 2000);
  setTimeout(() => {
    window.location.href = "archive.html"; // ← 一覧ページがarchive.html
  }, 2700);
}

// ===============================
// 投稿一覧（archive.html） + 回答件数バッジ
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const postList = document.getElementById("postList");
  if (!postList) return;

  const posts = JSON.parse(localStorage.getItem("posts") || "[]");
  const comments = JSON.parse(localStorage.getItem("comments") || "[]");

  if (posts.length === 0) {
    postList.innerHTML = "<p style='text-align:center;color:#64748b;'>まだ投稿がありません。</p>";
    return;
  }

  posts.sort((a, b) => Number(b.id) - Number(a.id));

  postList.innerHTML = posts.map(post => {
    // 💬 コメント件数をカウント
    const count = comments.filter(c => c.postId === post.id).length;
    const badge = count > 0
      ? `<span class="comment-badge">💬 ${count}件</span>`
      : `<span class="comment-badge empty">💬 0件</span>`;

    return `
      <div class="post-card" data-id="${post.id}">
        <h3>${post.title}</h3>
        <p>${post.content.slice(0, 80)}...</p>
        <div class="post-meta">
          <span class="tags">${post.tags.map(t => `#${t}`).join(" ")}</span>
          ${badge}
        </div>
      </div>
    `;
  }).join("");

  // 投稿クリック → 詳細ページへ
  postList.addEventListener("click", (e) => {
    const card = e.target.closest(".post-card");
    if (!card) return;
    const id = card.dataset.id;
    window.location.href = `detail.html?id=${id}`;
  });
});


// ===============================
// 投稿カード → 詳細ページへ
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const postList = document.getElementById("postList");
  if (!postList) return;

  postList.addEventListener("click", (e) => {
    const card = e.target.closest(".post-card");
    if (!card) return;
    const postId = card.dataset.id;
    window.location.href = `detail.html?id=${postId}`;
  });
});

// ===============================
// 詳細ページ（detail.html）
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const detailContainer = document.getElementById("postDetail");
  if (!detailContainer) return;

  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get("id");

  const posts = JSON.parse(localStorage.getItem("posts") || "[]");
  const post = posts.find(p => p.id === postId);

  if (!post) {
    detailContainer.innerHTML = "<p>投稿が見つかりません。</p>";
    return;
  }

  const tagsHTML = post.tags.map(tag => `<span class="tag">#${tag}</span>`).join(" ");

  detailContainer.innerHTML = `
    <h2>${post.title}</h2>
    <p>${post.content.replace(/\n/g, "<br>")}</p>
    <div class="tags">${tagsHTML}</div>
    <p style="color:#94a3b8;font-size:0.8rem;margin-top:15px;">
      投稿日: ${new Date(post.created_at).toLocaleString("ja-JP")}
    </p>
  `;
});

// ===============================
// プロフィールページ (profile.html)
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const profileInfo = document.getElementById("profileInfo");
  if (!profileInfo) return;

  const user = JSON.parse(localStorage.getItem("currentUser"));

  // ログインしていない場合
  if (!user) {
    profileInfo.innerHTML = `
      <p>アカウント情報が見つかりません。<br>
      <a href="signup.html" style="color:#2563eb;">アカウントを作成</a>してください。</p>
    `;
    document.getElementById("editBtn").style.display = "none";
    document.getElementById("logoutBtn").style.display = "none";
    return;
  }

  // プロフィール情報を表示
  const tagsHTML = user.tags?.length
    ? user.tags.map(tag => `<span class="tag">#${tag}</span>`).join(" ")
    : "<span style='color:#94a3b8;'>未設定</span>";

  profileInfo.innerHTML = `
    <div class="profile-info-item"><span>ニックネーム：</span>${user.nickname}</div>
    <div class="profile-info-item"><span>属性：</span>${user.userType}</div>
    <div class="profile-info-item"><span>学年：</span>${user.grade}</div>
    <div class="profile-info-item"><span>メール：</span>${user.email}</div>
    <div class="profile-info-item"><span>タグ：</span>${tagsHTML}</div>
  `;

  // 編集ボタン
  document.getElementById("editBtn").addEventListener("click", () => {
    window.location.href = "signup.html";
  });

  // ログアウトボタン
  document.getElementById("logoutBtn").addEventListener("click", () => {
    const confirmLogout = confirm("ログアウトしますか？");
    if (confirmLogout) {
      localStorage.removeItem("currentUser");
      alert("ログアウトしました");
      window.location.href = "archive.html";
    }
  });
});
