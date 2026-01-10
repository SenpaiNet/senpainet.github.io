import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// === CSS動的追加 (設定メニュー用) ===
const style = document.createElement('style');
style.innerHTML = `
  /* アカウントボタン周り */
  .account-btn-wrapper { position: relative; display: inline-block; }
  .notification-dot {
    position: absolute; top: -3px; right: -3px; width: 14px; height: 14px;
    background-color: #f23f42; border-radius: 50%; border: 2px solid white;
    display: none; z-index: 10;
  }
  .notification-dot.active { display: block; }

  /* ドロップダウンメニュー */
  .nav-dropdown {
    position: absolute; top: 120%; right: 0; width: 320px;
    background: var(--bg-card); border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    border: 1px solid var(--border-color);
    display: none; flex-direction: column; z-index: 9999; overflow: hidden;
    color: var(--text-main);
  }
  .nav-dropdown.show { display: flex; animation: fadeIn 0.2s; }
  
  .dropdown-section-title {
    padding: 10px 16px; background: rgba(0,0,0,0.03); font-size: 0.8rem;
    font-weight: bold; color: var(--text-sub); border-bottom: 1px solid var(--border-color);
  }
  .menu-link {
    display: block; padding: 12px 16px; color: var(--text-main); text-decoration: none;
    font-size: 0.9rem; border-top: 1px solid var(--border-color); transition: background 0.2s;
  }
  .menu-link:hover { background: rgba(0,0,0,0.05); }

  /* 設定トグル */
  .setting-row {
    padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;
    border-top: 1px solid var(--border-color); font-size: 0.9rem;
  }
  .setting-btn-group { display: flex; gap: 5px; }
  .setting-btn {
    padding: 4px 10px; border: 1px solid var(--border-color); border-radius: 4px;
    background: transparent; color: var(--text-main); cursor: pointer; font-size: 0.8rem;
  }
  .setting-btn.active { background: var(--primary-color); color: white; border-color: var(--primary-color); }
`;
document.head.appendChild(style);

// === (78) オフライン表示用Toast ===
const offlineToast = document.createElement("div");
offlineToast.id = "offline-toast";
offlineToast.textContent = "📡 オフラインです。通信環境を確認してください。";
document.body.appendChild(offlineToast);

window.addEventListener('offline', () => offlineToast.classList.add('show'));
window.addEventListener('online', () => offlineToast.classList.remove('show'));

// === 初期設定ロード ===
const savedTheme = localStorage.getItem('theme') || 'light';
const savedFontSize = localStorage.getItem('fontSize') || 'medium';
const savedLang = localStorage.getItem('lang') || 'ja';

document.documentElement.setAttribute('data-theme', savedTheme);
document.documentElement.setAttribute('data-font-size', savedFontSize);
applyLanguage(savedLang);

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    const authBtns = document.querySelectorAll('.account-btn, .account-link');

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
        if (btn.id === 'logoutBtn') return; 

        // ボタン置き換え
        const parent = btn.parentNode;
        const wrapper = document.createElement("div");
        wrapper.className = "account-btn-wrapper";
        
        const newBtn = document.createElement("a");
        newBtn.href = "#"; newBtn.className = btn.className; 
        newBtn.innerHTML = `
          <img src="${userIcon}" style="width:28px; height:28px; border-radius:50%; vertical-align:middle; margin-right:8px; border:2px solid rgba(255,255,255,0.8); object-fit:cover;">
          <span class="user-name-disp">${userName}</span>
          <span class="notification-dot" id="headerNotifDot"></span>
        `;
        
        // 設定メニュー付きドロップダウン
        const dropdown = document.createElement("div");
        dropdown.className = "nav-dropdown";
        dropdown.innerHTML = `
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

           <div class="setting-row">
            <span>🌐 言語</span>
            <div class="setting-btn-group">
               <button class="setting-btn ${savedLang==='ja'?'active':''}" onclick="setLang('ja')">JP</button>
               <button class="setting-btn ${savedLang==='en'?'active':''}" onclick="setLang('en')">EN</button>
            </div>
          </div>

          <div class="dropdown-section-title">👤 アカウント</div>
          <a href="profile.html" class="menu-link" data-i18n="mypage">マイページ編集</a>
          <a href="#" class="menu-link logout" id="headerLogoutBtn" style="color:#ef4444;">ログアウト</a>
        `;

        wrapper.appendChild(newBtn);
        wrapper.appendChild(dropdown);
        parent.replaceChild(wrapper, btn);

        newBtn.addEventListener("click", (e) => {
          e.preventDefault(); e.stopPropagation();
          dropdown.classList.toggle("show");
        });

        wrapper.querySelector("#headerLogoutBtn").addEventListener("click", (e) => {
          e.preventDefault();
          signOut(auth).then(() => window.location.href = "index.html");
        });

        document.addEventListener("click", (e) => {
          if (!wrapper.contains(e.target)) dropdown.classList.remove("show");
        });
      });
    } else {
       authBtns.forEach(btn => {
           btn.textContent = "ログイン";
           btn.href = "login.html";
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
    location.reload(); // 簡易実装としてリロード
};

function updateSettingBtns() {
    // 簡易的にリロードなしでクラスを付け替える処理（省略可だがUXのため）
    const theme = localStorage.getItem('theme');
    const size = localStorage.getItem('fontSize');
    // 実装省略：ボタンのactiveクラスをDOM操作で付け替え
}

// === (79) 多言語対応 (簡易版) ===
const i18nData = {
    ja: {
        "nav.ask": "相談する",
        "nav.archive": "相談を見る",
        "nav.senpai": "先輩一覧",
        "nav.contact": "お問い合わせ",
        "mypage": "マイページ編集"
    },
    en: {
        "nav.ask": "Ask Question",
        "nav.archive": "Archives",
        "nav.senpai": "Senpai List",
        "nav.contact": "Contact",
        "mypage": "Edit Profile"
    }
};

function applyLanguage(lang) {
    const dict = i18nData[lang] || i18nData.ja;
    // ナビゲーションなどの主要テキストを置換
    // 注: 本来は全要素にdata-i18n属性を振るが、ここでは主要リンクのみ対応
    const navLinks = document.querySelectorAll('.navbar-menu a');
    if(navLinks.length >= 4) {
        navLinks[0].textContent = dict["nav.ask"];
        navLinks[1].textContent = dict["nav.archive"];
        navLinks[2].textContent = dict["nav.senpai"];
        navLinks[3].textContent = dict["nav.contact"];
    }
}
