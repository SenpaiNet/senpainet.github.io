import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// === CSS動的追加 (設定メニュー & オフライン通知用) ===
const style = document.createElement('style');
style.innerHTML = `
  /* アカウントボタン周り */
  .account-btn-wrapper { position: relative; display: inline-flex; align-items: center; cursor: pointer; }
  .user-info-btn {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 12px; border-radius: 50px;
    transition: background 0.2s ease;
    text-decoration: none; color: inherit;
    border: 1px solid transparent;
  }
  .user-info-btn:hover { background: rgba(0,0,0,0.05); }
  
  .user-name-disp {
    font-weight: 700; font-size: 0.95rem; color: var(--text-main, #334155);
    max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  /* 通知ドット */
  .notification-dot {
    position: absolute; top: 0; right: 0; width: 10px; height: 10px;
    background-color: #f23f42; border-radius: 50%; border: 2px solid white;
    display: none; z-index: 10;
  }
  .notification-dot.active { display: block; }

  /* ドロップダウンメニュー */
  .nav-dropdown {
    position: absolute; top: 120%; right: 0; width: 240px; /* 少し幅を調整 */
    background: var(--bg-card, white); border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    border: 1px solid var(--border-color, #f1f5f9);
    display: none; flex-direction: column; z-index: 9999; overflow: hidden;
    color: var(--text-main, #334155); transform-origin: top right;
    animation: dropdownFadeIn 0.2s ease forwards;
  }
  .nav-dropdown.show { display: flex; }

  @keyframes dropdownFadeIn {
    from { opacity: 0; transform: scale(0.95) translateY(-10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  .menu-link {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 20px; color: var(--text-main, #334155); text-decoration: none;
    font-size: 0.95rem; border-bottom: 1px solid var(--border-color, #f1f5f9); transition: background 0.2s;
  }
  .menu-link:hover { background: rgba(59, 130, 246, 0.05); color: #3b82f6; }
  .menu-link:last-child { border-bottom: none; }
  
  .menu-icon { font-size: 1.1rem; width: 24px; text-align: center; }

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
`;
document.head.appendChild(style);

// === オフライン表示用Toast ===
const offlineToast = document.createElement("div");
offlineToast.id = "offline-toast";
offlineToast.innerHTML = "<span>📡</span> オフラインです。通信環境を確認してください。";
document.body.appendChild(offlineToast);

// 状態監視関数 (即時実行対応)
const updateOnlineStatus = () => {
  if (navigator.onLine) {
    offlineToast.classList.remove('show');
  } else {
    offlineToast.classList.add('show');
  }
};

// イベントリスナー登録
window.addEventListener('offline', updateOnlineStatus);
window.addEventListener('online', updateOnlineStatus);
updateOnlineStatus(); 

// === 初期設定ロード ===
const savedTheme = localStorage.getItem('theme') || 'light';
const savedFontSize = localStorage.getItem('fontSize') || 'medium';
const savedLang = localStorage.getItem('lang') || 'ja';

document.documentElement.setAttribute('data-theme', savedTheme);
document.documentElement.setAttribute('data-font-size', savedFontSize);
applyLanguage(savedLang);

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    // ログアウトボタン以外の account-btn を対象にする
    const authBtns = document.querySelectorAll('.account-btn:not(#logoutBtn), .account-link');

    if (user) {
      // ユーザー情報取得
      let userIcon = user.photoURL || "https://placehold.co/100";
      let userName = user.displayName || "ユーザー";
      try {
          const uDoc = await getDoc(doc(db, "users", user.uid));
          if (uDoc.exists()) {
              const d = uDoc.data();
              if(d.iconUrl) userIcon = d.iconUrl;
              if(d.nickname) userName = d.nickname;
          }
      } catch(e){}

      // 通知チェック (未読があるか監視)
      let hasUnread = false;
      try {
        const notifQ = query(collection(db, "users", user.uid, "notifications"), where("isRead", "==", false));
        onSnapshot(notifQ, (snap) => {
            hasUnread = !snap.empty;
            // ヘッダー内のすべてのドットを更新
            document.querySelectorAll('.notification-dot').forEach(dot => {
                if(hasUnread) dot.classList.add('active');
                else dot.classList.remove('active');
            });
        });
      } catch(e) { console.log("通知チェックエラー:", e); }

      authBtns.forEach(btn => {
        // ボタン置き換え (ドロップダウン機能付きにする)
        const parent = btn.parentNode;
        const wrapper = document.createElement("div");
        wrapper.className = "account-btn-wrapper";
        
        // ヘッダー表示部分 (アイコン + 名前)
        const userInfoBtn = document.createElement("div");
        userInfoBtn.className = "user-info-btn";
        userInfoBtn.innerHTML = `
          <div style="position:relative;">
             <img src="${userIcon}" style="width:32px; height:32px; border-radius:50%; object-fit:cover; border:2px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.1); display:block;">
             <span class="notification-dot" id="headerNotifDot"></span>
          </div>
          <span class="user-name-disp">${userName}</span>
          <span style="font-size: 0.8rem; color: #94a3b8;">▼</span>
        `;
        
        // ドロップダウンメニュー (3項目のみ)
        const dropdown = document.createElement("div");
        dropdown.className = "nav-dropdown";
        dropdown.innerHTML = `
          <a href="#" class="menu-link" id="navNotifBtn">
            <span class="menu-icon">🔔</span> 通知
          </a>
          <a href="profile.html" class="menu-link">
            <span class="menu-icon">👤</span> マイページ
          </a>
          <a href="#" class="menu-link" id="headerLogoutBtn" style="color:#ef4444;">
            <span class="menu-icon">🚪</span> ログアウト
          </a>
        `;

        wrapper.appendChild(userInfoBtn);
        wrapper.appendChild(dropdown);
        parent.replaceChild(wrapper, btn);

        // クリックイベント (ドロップダウン開閉)
        wrapper.addEventListener("click", (e) => {
          e.preventDefault(); e.stopPropagation();
          dropdown.classList.toggle("show");
        });

        // 通知ボタン処理
        const notifBtn = wrapper.querySelector("#navNotifBtn");
        if(notifBtn) {
            notifBtn.addEventListener("click", (e) => {
                e.preventDefault();
                if(hasUnread) {
                    alert("未読の通知があります！（通知一覧ページは準備中です）");
                } else {
                    alert("新しい通知はありません。");
                }
                // 将来的には window.location.href = "notifications.html"; などに変更
            });
        }

        // ログアウト処理
        const logoutBtn = wrapper.querySelector("#headerLogoutBtn");
        if(logoutBtn){
            logoutBtn.addEventListener("click", (e) => {
              e.preventDefault();
              if(confirm("ログアウトしますか？")) {
                  signOut(auth).then(() => window.location.href = "index.html");
              }
            });
        }

        // 外部クリックで閉じる
        document.addEventListener("click", (e) => {
          if (!wrapper.contains(e.target)) dropdown.classList.remove("show");
        });
      });
    } else {
       // 未ログイン時はそのまま
       authBtns.forEach(btn => {
           // 既存のログインボタンとして機能させるため何もしない
       });
    }
  });
});

// === グローバル設定関数 ===
window.setTheme = (mode) => {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('theme', mode);
};

window.setFont = (size) => {
    document.documentElement.setAttribute('data-font-size', size);
    localStorage.setItem('fontSize', size);
};

window.setLang = (lang) => {
    localStorage.setItem('lang', lang);
    location.reload(); 
};

// === 多言語対応 (簡易版) ===
const i18nData = {
    ja: {
        "nav.ask": "相談する",
        "nav.archive": "相談を見る",
        "nav.senpai": "先輩一覧",
        "nav.contact": "お問い合わせ",
        "mypage": "マイページを表示"
    },
    en: {
        "nav.ask": "Ask Question",
        "nav.archive": "Archives",
        "nav.senpai": "Senpai List",
        "nav.contact": "Contact",
        "mypage": "Profile"
    }
};

function applyLanguage(lang) {
    const dict = i18nData[lang] || i18nData.ja;
    const navLinks = document.querySelectorAll('.navbar-menu a');
    if(navLinks.length >= 4) {
        if(navLinks[0]) navLinks[0].textContent = dict["nav.ask"];
        if(navLinks[1]) navLinks[1].textContent = dict["nav.archive"];
        if(navLinks[2]) navLinks[2].textContent = dict["nav.senpai"];
    }
}
