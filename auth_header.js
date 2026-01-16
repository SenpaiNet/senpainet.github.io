import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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
    position: absolute; top: 120%; right: 0; width: 280px;
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
  
  .dropdown-header {
    padding: 15px; border-bottom: 1px solid var(--border-color, #f1f5f9);
    display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.02);
  }
  
  .dropdown-section-title {
    padding: 10px 16px; background: rgba(0,0,0,0.02); font-size: 0.75rem;
    font-weight: bold; color: var(--text-sub, #94a3b8); border-bottom: 1px solid var(--border-color, #f1f5f9);
    letter-spacing: 0.05em;
  }
  .menu-link {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; color: var(--text-main, #334155); text-decoration: none;
    font-size: 0.95rem; border-bottom: 1px solid var(--border-color, #f1f5f9); transition: background 0.2s;
  }
  .menu-link:hover { background: rgba(59, 130, 246, 0.05); color: #3b82f6; }
  .menu-link:last-child { border-bottom: none; }

  /* 設定トグル */
  .setting-row {
    padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid var(--border-color, #f1f5f9); font-size: 0.9rem;
  }
  .setting-btn-group { display: flex; gap: 5px; }
  .setting-btn {
    padding: 4px 10px; border: 1px solid var(--border-color, #e2e8f0); border-radius: 6px;
    background: transparent; color: var(--text-sub, #64748b); cursor: pointer; font-size: 0.8rem;
    transition: all 0.2s;
  }
  .setting-btn:hover { border-color: #cbd5e1; }
  .setting-btn.active { background: #3b82f6; color: white; border-color: #3b82f6; }

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
// ★スクリプト読み込み時にも即座にチェック
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

      authBtns.forEach(btn => {
        // ボタン置き換え (ドロップダウン機能付きにする)
        const parent = btn.parentNode;
        const wrapper = document.createElement("div");
        wrapper.className = "account-btn-wrapper";
        
        // ヘッダー表示部分 (アイコン + 名前)
        const userInfoBtn = document.createElement("div");
        userInfoBtn.className = "user-info-btn";
        userInfoBtn.innerHTML = `
          <img src="${userIcon}" style="width:32px; height:32px; border-radius:50%; object-fit:cover; border:2px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
          <span class="user-name-disp">${userName}</span>
          <span class="notification-dot" id="headerNotifDot"></span>
          <span style="font-size: 0.8rem; color: #94a3b8;">▼</span>
        `;
        
        // ドロップダウンメニュー
        const dropdown = document.createElement("div");
        dropdown.className = "nav-dropdown";
        dropdown.innerHTML = `
          <div class="dropdown-header">
             <img src="${userIcon}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
             <div style="flex:1; min-width:0;">
                <div style="font-weight:bold; font-size:0.95rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${userName}</div>
                <div style="font-size:0.75rem; color:#94a3b8;">ログイン中</div>
             </div>
          </div>

          <a href="profile.html" class="menu-link" style="font-weight:bold; color:#3b82f6;">
            <span>👤</span> マイページを表示
          </a>
          
          <div class="dropdown-section-title">⚙️ 表示設定</div>
          
          <div class="setting-row">
            <span>🌙 テーマ</span>
            <div class="setting-btn-group">
               <button class="setting-btn ${savedTheme==='light'?'active':''}" onclick="setTheme('light')">☀</button>
               <button class="setting-btn ${savedTheme==='dark'?'active':''}" onclick="setTheme('dark')">🌙</button>
            </div>
          </div>
          
          <div class="setting-row">
            <span>Aa 文字サイズ</span>
            <div class="setting-btn-group">
               <button class="setting-btn ${savedFontSize==='small'?'active':''}" onclick="setFont('small')">小</button>
               <button class="setting-btn ${savedFontSize==='medium'?'active':''}" onclick="setFont('medium')">中</button>
               <button class="setting-btn ${savedFontSize==='large'?'active':''}" onclick="setFont('large')">大</button>
            </div>
          </div>

          <a href="#" class="menu-link logout" id="headerLogoutBtn" style="color:#ef4444; border-top:1px solid var(--border-color, #f1f5f9); margin-top:5px;">
            <span>🚪</span> ログアウト
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
       authBtns.forEach(btn => {
           // まだログインしていない場合の処理（必要に応じて元に戻す）
           // btn.textContent = "ログイン";
           // btn.href = "login.html";
       });
    }
  });
});

// === グローバル設定関数 ===
window.setTheme = (mode) => {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('theme', mode);
    updateSettingBtns();
};

window.setFont = (size) => {
    document.documentElement.setAttribute('data-font-size', size);
    localStorage.setItem('fontSize', size);
    updateSettingBtns();
};

window.setLang = (lang) => {
    localStorage.setItem('lang', lang);
    location.reload(); 
};

function updateSettingBtns() {
    // 設定反映のためリロード
    location.reload();
}

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
