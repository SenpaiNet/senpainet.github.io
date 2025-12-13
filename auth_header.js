import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// === CSSを動的に追加 (通知ベル用) ===
const style = document.createElement('style');
style.innerHTML = `
  /* 通知エリアのコンテナ */
  .notification-wrapper { position: relative; display: flex; align-items: center; margin-right: 15px; }
  
  /* ベルアイコン */
  .notification-bell {
    font-size: 1.5rem; cursor: pointer; color: #64748b;
    transition: color 0.2s; position: relative;
    user-select: none;
  }
  .notification-bell:hover { color: #4da6ff; }
  
  /* 未読バッジ (赤丸) */
  .notification-badge {
    position: absolute; top: -2px; right: -2px;
    background: #ff6b6b; color: white; border-radius: 50%;
    width: 16px; height: 16px; font-size: 0.7rem; font-weight: bold;
    display: flex; align-items: center; justify-content: center;
    border: 2px solid white;
    display: none; /* 初期は非表示 */
  }
  .notification-badge.active { display: flex; animation: popIn 0.3s; }
  
  /* ドロップダウンメニュー */
  .notification-dropdown {
    position: absolute; top: 100%; right: -10px; width: 320px;
    background: white; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,0.15);
    border: 1px solid #eee; z-index: 1000;
    display: none; flex-direction: column;
    margin-top: 10px; overflow: hidden;
  }
  .notification-dropdown.active { display: flex; animation: fadeIn 0.2s; }
  
  /* ドロップダウンのヘッダー */
  .notif-header {
    padding: 12px 16px; border-bottom: 1px solid #eee;
    font-weight: bold; color: #333; background: #f8fafc;
    display: flex; justify-content: space-between; align-items: center;
  }
  
  /* 通知リスト */
  .notif-list { max-height: 350px; overflow-y: auto; padding: 0; margin: 0; list-style: none; }
  .notif-item {
    padding: 12px 16px; border-bottom: 1px solid #f1f5f9;
    cursor: pointer; transition: background 0.2s; display: flex; gap: 10px;
  }
  .notif-item:hover { background: #f1f8ff; }
  .notif-item.unread { background: #e0f2fe; } /* 未読は青背景 */
  
  .notif-icon { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
  .notif-content { flex: 1; font-size: 0.9rem; color: #333; }
  .notif-time { font-size: 0.75rem; color: #999; margin-top: 4px; }
  
  .notif-empty { padding: 20px; text-align: center; color: #999; font-size: 0.9rem; }
  
  @keyframes popIn { 0% { transform: scale(0); } 70% { transform: scale(1.2); } 100% { transform: scale(1); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
`;
document.head.appendChild(style);

const defaultFallbackIcon = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#cccccc"/></svg>')}`;

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    const authBtns = document.querySelectorAll('.account-btn, .account-link');
    const navbarMenu = document.querySelector('.navbar-menu');

    if (user) {
      localStorage.setItem("senpaiNet_hasAccount", "true");

      // === 1. 通知ベルの設置 ===
      // すでに設置済みでなければ追加
      if (!document.getElementById("notifWrapper") && navbarMenu) {
        const wrapper = document.createElement("div");
        wrapper.id = "notifWrapper";
        wrapper.className = "notification-wrapper";
        
        wrapper.innerHTML = `
          <div class="notification-bell" id="notifBell">🔔
            <div class="notification-badge" id="notifBadge">0</div>
          </div>
          <div class="notification-dropdown" id="notifDropdown">
            <div class="notif-header">
               <span>お知らせ</span>
            </div>
            <ul class="notif-list" id="notifList">
               <li class="notif-empty">読み込み中...</li>
            </ul>
          </div>
        `;
        
        // ログインボタン(authBtns)の手前に挿入
        if(authBtns.length > 0) {
            authBtns[0].parentElement.insertBefore(wrapper, authBtns[0]); // <a>タグとして挿入されている場合
        } else {
            navbarMenu.appendChild(wrapper);
        }
        
        // イベント設定
        setupNotificationLogic(user, wrapper);
      }

      // === 2. ログインボタンの表示変更 ===
      authBtns.forEach(btn => {
        const iconUrl = user.photoURL || defaultFallbackIcon;
        btn.innerHTML = `
          <img src="${iconUrl}" style="width:24px; height:24px; border-radius:50%; vertical-align:middle; margin-right:8px; border:1px solid rgba(255,255,255,0.8);">
          <span style="vertical-align:middle;">${user.displayName || "ユーザー"}</span>
        `;
        btn.href = "profile.html"; 
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
      
      // 通知ベルがあれば消す
      const wrapper = document.getElementById("notifWrapper");
      if(wrapper) wrapper.remove();
    }
  });
});

// === 通知機能のロジック ===
function setupNotificationLogic(user, wrapper) {
    const bell = document.getElementById("notifBell");
    const badge = document.getElementById("notifBadge");
    const dropdown = document.getElementById("notifDropdown");
    const list = document.getElementById("notifList");
    
    // ベルクリックで開閉
    bell.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("active");
    });
    
    // 外側クリックで閉じる
    document.addEventListener("click", (e) => {
        if(!wrapper.contains(e.target)) {
            dropdown.classList.remove("active");
        }
    });

    // Firestore監視
    const notifRef = collection(db, "users", user.uid, "notifications");
    // 新しい順に取得
    const q = query(notifRef, orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        const notifications = [];
        let unreadCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            notifications.push({ id: doc.id, ...data });
            if (!data.isRead) unreadCount++;
        });

        // バッジ更新
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 9 ? "9+" : unreadCount;
            badge.classList.add("active");
        } else {
            badge.classList.remove("active");
        }

        // リスト更新
        if (notifications.length === 0) {
            list.innerHTML = '<li class="notif-empty">お知らせはありません</li>';
        } else {
            list.innerHTML = "";
            notifications.forEach(n => {
                const li = document.createElement("li");
                li.className = `notif-item ${n.isRead ? "" : "unread"}`;
                
                const timeStr = n.createdAt ? n.createdAt.toDate().toLocaleString() : "";
                const icon = n.fromIcon || defaultFallbackIcon;
                
                li.innerHTML = `
                    <img src="${icon}" class="notif-icon">
                    <div class="notif-content">
                        <div><b>${n.fromName}</b>さんが<b>「${n.postTitle || "投稿"}」</b>に回答しました</div>
                        <div class="notif-time">${timeStr}</div>
                    </div>
                `;
                
                // クリック時の処理 (既読にして遷移)
                li.addEventListener("click", async () => {
                    // 既読にする
                    if(!n.isRead) {
                        const nDoc = doc(db, "users", user.uid, "notifications", n.id);
                        await updateDoc(nDoc, { isRead: true });
                    }
                    // 詳細ページへ移動
                    window.location.href = `detail2.html?id=${n.postId}`;
                });
                
                list.appendChild(li);
            });
        }
    });
}
