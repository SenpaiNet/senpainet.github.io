import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// === CSSを動的に追加 ===
const style = document.createElement('style');
style.innerHTML = `
  /* アカウントボタン周り */
  .account-btn-wrapper { position: relative; display: inline-block; }

  /* 通知バッジ (Discord風の赤丸) */
  .notification-dot {
    position: absolute; top: -3px; right: -3px;
    width: 14px; height: 14px;
    background-color: #f23f42; /* 赤色 */
    border-radius: 50%; border: 2px solid white;
    display: none; z-index: 10;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  .notification-dot.active { display: block; animation: popIn 0.3s; }

  /* ドロップダウンメニュー */
  .nav-dropdown {
    position: absolute; top: 110%; right: 0; width: 340px;
    background: white; border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    border: 1px solid #f1f5f9;
    display: none; flex-direction: column;
    z-index: 9999; overflow: hidden;
  }
  .nav-dropdown.show { display: flex; animation: fadeIn 0.2s ease-out; }

  /* メニュー項目 */
  .dropdown-section-title {
    padding: 12px 16px; background: #f8fafc; font-size: 0.85rem;
    font-weight: bold; color: #64748b; border-bottom: 1px solid #e2e8f0;
  }

  /* 通知リスト */
  .notif-list { max-height: 350px; overflow-y: auto; padding: 0; margin: 0; list-style: none; }
  .notif-item {
    padding: 12px 16px; border-bottom: 1px solid #f1f5f9;
    cursor: pointer; transition: background 0.2s; display: flex; gap: 12px;
    align-items: flex-start; text-decoration: none; color: inherit;
  }
  .notif-item:hover { background: #f1f8ff; }
  .notif-item.unread { background: #e0f2fe; } /* 未読カラー */

  .notif-icon { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 1px solid #eee; flex-shrink: 0;}
  .notif-content { flex: 1; font-size: 0.9rem; line-height: 1.5; }
  .notif-time { font-size: 0.75rem; color: #94a3b8; margin-top: 4px; display: block;}
  .notif-empty { padding: 30px; text-align: center; color: #94a3b8; font-size: 0.9rem; }

  /* メニューリンク */
  .menu-link {
    display: block; padding: 14px 16px; color: #334155;
    text-decoration: none; font-weight: 600; font-size: 0.95rem;
    transition: background 0.2s; border-top: 1px solid #f1f5f9;
  }
  .menu-link:hover { background: #f8fafc; color: #4da6ff; }
  .menu-link.logout { color: #ef4444; }
  .menu-link.logout:hover { background: #fef2f2; }

  /* オフライン通知 (トースト) */
  #offline-toast {
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%) translateY(100px);
    background: #1e293b; color: white; padding: 12px 24px; border-radius: 50px;
    font-size: 0.9rem; font-weight: bold; display: flex; align-items: center; gap: 8px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 10000;
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s;
    opacity: 0; pointer-events: none;
  }
  #offline-toast.show {
    transform: translateX(-50%) translateY(0); opacity: 1; pointer-events: auto;
  }

  @keyframes popIn { 0% { transform: scale(0); } 70% { transform: scale(1.2); } 100% { transform: scale(1); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
`;
document.head.appendChild(style);

const defaultFallbackIcon = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#cccccc"/></svg>')}`;

// === メイン処理 ===
document.addEventListener("DOMContentLoaded", () => {
  // 1. オフライン通知の初期化
  const offlineToast = document.createElement("div");
  offlineToast.id = "offline-toast";
  offlineToast.innerHTML = "<span>📡</span> オフラインです。通信環境を確認してください。";
  document.body.appendChild(offlineToast);

  const updateOnlineStatus = () => {
    if (navigator.onLine) {
      offlineToast.classList.remove('show');
    } else {
      offlineToast.classList.add('show');
    }
  };
  window.addEventListener('offline', updateOnlineStatus);
  window.addEventListener('online', updateOnlineStatus);
  updateOnlineStatus(); // 初期チェック

  // 2. 認証状態の監視
  onAuthStateChanged(auth, async (user) => {
    const authBtns = document.querySelectorAll('.account-btn, .account-link');

    if (user) {
      localStorage.setItem("senpaiNet_hasAccount", "true");

      // Firestoreから最新のアイコンと名前を取得
      let userIcon = user.photoURL || defaultFallbackIcon;
      let userName = user.displayName || "ユーザー";

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.iconUrl) userIcon = data.iconUrl;
            if (data.nickname) userName = data.nickname;
        }
      } catch (e) { console.error("ユーザー情報取得エラー", e); }

      authBtns.forEach(btn => {
        if (btn.id === 'logoutBtn') return; // 既存ログアウトボタンは無視

        // === ボタンを書き換え ===
        const parent = btn.parentNode;
        const wrapper = document.createElement("div");
        wrapper.className = "account-btn-wrapper";
        
        // 新しいボタン
        const newBtn = document.createElement("a");
        newBtn.href = "#"; 
        newBtn.className = btn.className; 
        newBtn.setAttribute("style", btn.getAttribute("style")); 
        
        newBtn.innerHTML = `
          <img src="${userIcon}" style="width:28px; height:28px; border-radius:50%; vertical-align:middle; margin-right:8px; border:2px solid rgba(255,255,255,0.8); object-fit:cover;">
          <span style="vertical-align:middle;">${userName}</span>
          <span class="notification-dot" id="headerNotifDot"></span>
        `;
        
        // ドロップダウンメニュー
        const dropdown = document.createElement("div");
        dropdown.className = "nav-dropdown";
        dropdown.innerHTML = `
          <div class="dropdown-section-title">🔔 お知らせ</div>
          <ul class="notif-list" id="headerNotifList">
            <li class="notif-empty">読み込み中...</li>
          </ul>
          
          <div class="dropdown-section-title">👤 アカウント</div>
          <a href="profile.html" class="menu-link">マイページ編集</a>
          <a href="#" class="menu-link logout" id="headerLogoutBtn">ログアウト</a>
        `;

        wrapper.appendChild(newBtn);
        wrapper.appendChild(dropdown);
        parent.replaceChild(wrapper, btn);

        // === イベント設定 ===
        // 開閉
        newBtn.addEventListener("click", (e) => {
          e.preventDefault(); e.stopPropagation();
          dropdown.classList.toggle("show");
        });

        // ログアウト
        wrapper.querySelector("#headerLogoutBtn").addEventListener("click", (e) => {
          e.preventDefault();
          if(confirm("ログアウトしますか？")) {
            signOut(auth).then(() => {
              localStorage.removeItem("senpaiNet_hasAccount");
              window.location.href = "index.html";
            });
          }
        });

        // 閉じる処理
        document.addEventListener("click", (e) => {
          if (!wrapper.contains(e.target)) dropdown.classList.remove("show");
        });

        // 通知監視
        setupNotificationObserver(user, wrapper);
      });

    } else {
      // 未ログイン時
      authBtns.forEach(btn => {
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

// === 通知ロジック ===
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

    // 赤丸制御
    if (unreadCount > 0) dot.classList.add("active");
    else dot.classList.remove("active");

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
        const postTitle = n.postTitle || "投稿";

        li.innerHTML = `
          <img src="${icon}" class="notif-icon">
          <div class="notif-content">
            <div><b>${fromName}</b>さんが<b>「${postTitle}」</b>に回答しました</div>
            <span class="notif-time">${timeStr}</span>
          </div>
        `;

        // クリックで詳細ページへ
        li.addEventListener("click", async () => {
           if(!n.isRead) {
             try {
               await updateDoc(doc(db, "users", user.uid, "notifications", n.id), { isRead: true });
             } catch(e) { console.error(e); }
           }
           window.location.href = `detail2.html?id=${n.postId}`;
        });

        list.appendChild(li);
      });
    }
  });
}
