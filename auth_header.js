import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// === CSSを動的に追加 (赤丸バッジとドロップダウン用) ===
const style = document.createElement('style');
style.innerHTML = `
  /* アカウントボタン周りの調整 */
  .account-btn-wrapper {
    position: relative;
    display: inline-block;
  }

  /* Discord風の赤い● (通知バッジ) */
  .notification-dot {
    position: absolute;
    top: 0px;
    right: 0px;
    width: 12px;
    height: 12px;
    background-color: #f23f42; /* Discordの赤色 */
    border-radius: 50%;
    border: 2px solid white;
    display: none; /* 未読がない時は非表示 */
    z-index: 10;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
  }
  .notification-dot.active { display: block; animation: popIn 0.3s; }

  /* ドロップダウンメニュー */
  .nav-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    width: 320px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.15);
    border: 1px solid #eee;
    margin-top: 12px;
    display: none;
    flex-direction: column;
    z-index: 9999;
    overflow: hidden;
  }
  .nav-dropdown.show { display: flex; animation: fadeIn 0.2s ease-out; }

  /* メニュー内のセクション */
  .dropdown-section-title {
    padding: 10px 16px;
    background: #f8fafc;
    font-size: 0.8rem;
    font-weight: bold;
    color: #64748b;
    border-bottom: 1px solid #f1f5f9;
  }

  /* 通知リスト */
  .notif-list {
    max-height: 300px;
    overflow-y: auto;
    padding: 0;
    margin: 0;
    list-style: none;
  }
  
  /* 通知アイテム */
  .notif-item {
    padding: 12px 16px;
    border-bottom: 1px solid #f1f5f9;
    cursor: pointer;
    transition: background 0.2s;
    display: flex;
    gap: 12px;
    align-items: start;
    text-decoration: none;
    color: inherit;
  }
  .notif-item:hover { background: #f8fafc; }
  .notif-item.unread { background: #eff6ff; } /* 未読は青白く */

  .notif-icon { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid #eee; flex-shrink: 0;}
  .notif-content { flex: 1; font-size: 0.9rem; line-height: 1.4; }
  .notif-time { font-size: 0.75rem; color: #94a3b8; margin-top: 4px; display: block;}
  .notif-empty { padding: 20px; text-align: center; color: #94a3b8; font-size: 0.9rem; }

  /* プロフィール・ログアウトリンク */
  .menu-link {
    display: block;
    padding: 12px 16px;
    color: #334155;
    text-decoration: none;
    font-weight: 500;
    transition: background 0.2s;
    border-top: 1px solid #f1f5f9;
  }
  .menu-link:hover { background: #f1f5f9; color: #4da6ff; }
  .menu-link.logout { color: #ef4444; }
  .menu-link.logout:hover { background: #fef2f2; }

  @keyframes popIn { 0% { transform: scale(0); } 70% { transform: scale(1.2); } 100% { transform: scale(1); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
`;
document.head.appendChild(style);

const defaultFallbackIcon = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#cccccc"/></svg>')}`;

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    // ページ内のアカウントボタンを探す
    const authBtns = document.querySelectorAll('.account-btn, .account-link');

    if (user) {
      localStorage.setItem("senpaiNet_hasAccount", "true");

      authBtns.forEach(btn => {
        // ログアウトボタン(ID付き)は除外する（フッター等にある場合用）
        if (btn.id === 'logoutBtn') return;

        // === ボタンをドロップダウン対応に書き換え ===
        // 既存のボタンをラッパーで包むか、構造を作り変える
        
        // アイコンURL
        const iconUrl = user.photoURL || defaultFallbackIcon;
        
        // 親要素を取得
        const parent = btn.parentNode;
        
        // ラッパー作成
        const wrapper = document.createElement("div");
        wrapper.className = "account-btn-wrapper";
        
        // 新しいボタン要素 (aタグだがクリックイベントをジャックする)
        const newBtn = document.createElement("a");
        newBtn.href = "#"; // 遷移しない
        newBtn.className = btn.className; // クラスを引き継ぐ
        // styleを引き継ぐ
        newBtn.setAttribute("style", btn.getAttribute("style")); 
        
        newBtn.innerHTML = `
          <img src="${iconUrl}" style="width:24px; height:24px; border-radius:50%; vertical-align:middle; margin-right:8px; border:1px solid rgba(255,255,255,0.8);">
          <span style="vertical-align:middle;">${user.displayName || "ユーザー"}</span>
          <span class="notification-dot" id="headerNotifDot"></span>
        `;
        
        // ドロップダウンメニュー作成
        const dropdown = document.createElement("div");
        dropdown.className = "nav-dropdown";
        dropdown.innerHTML = `
          <div class="dropdown-section-title">お知らせ</div>
          <ul class="notif-list" id="headerNotifList">
            <li class="notif-empty">読み込み中...</li>
          </ul>
          
          <div class="dropdown-section-title">アカウント</div>
          <a href="profile.html" class="menu-link">👤 マイページ編集</a>
          <a href="#" class="menu-link logout" id="headerLogoutBtn">🚪 ログアウト</a>
        `;

        // 組み立て
        wrapper.appendChild(newBtn);
        wrapper.appendChild(dropdown);
        
        // 既存のボタンと入れ替え
        parent.replaceChild(wrapper, btn);

        // === イベント処理 ===
        
        // 1. ボタンクリックで開閉
        newBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropdown.classList.toggle("show");
        });

        // 2. ログアウト処理
        wrapper.querySelector("#headerLogoutBtn").addEventListener("click", (e) => {
          e.preventDefault();
          signOut(auth).then(() => {
            localStorage.removeItem("senpaiNet_hasAccount");
            window.location.href = "index.html";
          });
        });

        // 3. 画面外クリックで閉じる
        document.addEventListener("click", (e) => {
          if (!wrapper.contains(e.target)) {
            dropdown.classList.remove("show");
          }
        });

        // === 通知監視スタート ===
        setupNotificationObserver(user, wrapper);
      });

    } else {
      // === 未ログイン時 ===
      authBtns.forEach(btn => {
        // 通常のログインボタンに戻す
        if (btn.parentElement.classList.contains("account-btn-wrapper")) {
            // すでに書き換わっている場合は何もしないか、リセットが必要だが
            // ページ遷移なしでログアウトした場合のリセット処理
            // 今回は単純にリロードされるケースが多いため省略、またはテキスト変更のみ
        }
        
        if (btn.id === 'logoutBtn') {
             btn.innerHTML = "🔑 ログイン";
             btn.href = "login.html";
             return;
        }
        btn.textContent = "ログイン";
        btn.href = "login.html";
      });
    }
  });
});

// === Firestore監視ロジック ===
function setupNotificationObserver(user, wrapper) {
  const dot = wrapper.querySelector("#headerNotifDot");
  const list = wrapper.querySelector("#headerNotifList");

  const q = query(
    collection(db, "users", user.uid, "notifications"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snapshot) => {
    const notifications = [];
    let unreadCount = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      notifications.push({ id: doc.id, ...data });
      if (!data.isRead) unreadCount++;
    });

    // 赤丸の制御
    if (unreadCount > 0) {
      dot.classList.add("active");
    } else {
      dot.classList.remove("active");
    }

    // リスト描画
    if (notifications.length === 0) {
      list.innerHTML = '<li class="notif-empty">お知らせはありません</li>';
    } else {
      list.innerHTML = "";
      notifications.forEach(n => {
        const li = document.createElement("li");
        li.className = `notif-item ${n.isRead ? "" : "unread"}`;
        
        const timeStr = n.createdAt ? n.createdAt.toDate().toLocaleDateString() : "";
        const icon = n.fromIcon || defaultFallbackIcon;
        const fromName = n.fromName || "誰か";
        const postTitle = n.postTitle || "あなたの投稿";

        li.innerHTML = `
          <img src="${icon}" class="notif-icon">
          <div class="notif-content">
            <div><b>${fromName}</b>さんが<b>「${postTitle}」</b>に回答しました</div>
            <span class="notif-time">${timeStr}</span>
          </div>
        `;

        // クリックで既読＆遷移
        li.addEventListener("click", async (e) => {
           e.stopPropagation(); // メニューが閉じないようにするならこれ。閉じるなら不要
           
           // 既読化
           if(!n.isRead) {
             await updateDoc(doc(db, "users", user.uid, "notifications", n.id), { isRead: true });
           }
           
           // 遷移
           window.location.href = `detail2.html?id=${n.postId}`;
        });

        list.appendChild(li);
      });
    }
  });
}
