import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// === アイコン生成用 (signup.jsと同じ) ===
function createColorIcon(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${color}"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
const iconColors = ["#4da6ff", "#ff6b6b", "#4ecdc4", "#ffbe0b", "#9b5de5"];
const defaultIcons = iconColors.map(createColorIcon);
const fallbackIcon = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#cccccc"/></svg>')}`;

let currentUser = null;
let currentUserData = null;
let selectedIconUrl = null;
let selectedTags = [];

document.addEventListener("DOMContentLoaded", () => {
  const loadingOverlay = document.getElementById("loadingOverlay");

  // 1. ログイン状態監視とデータ読み込み
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadUserProfile(user.uid);
      loadingOverlay.style.display = "none"; // ロード完了
      setupEventListeners();
    } else {
      // 未ログインならログインページへ
      window.location.href = "login.html";
    }
  });

  // ログアウト処理
  document.getElementById("logoutBtn").addEventListener("click", (e) => {
      e.preventDefault();
      signOut(auth).then(() => {
          localStorage.removeItem("senpaiNet_hasAccount");
          alert("ログアウトしました。");
          window.location.href = "index.html";
      });
  });
});

// === ユーザープロフィール読み込み表示関数 ===
async function loadUserProfile(uid) {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      currentUserData = docSnap.data();

      // --- ヘッダー表示 ---
      const iconUrl = currentUserData.iconUrl || currentUser.photoURL || fallbackIcon;
      document.getElementById("dispIcon").src = iconUrl;
      document.getElementById("dispName").textContent = currentUserData.nickname || currentUser.displayName || "名無し";
      document.getElementById("dispEmail").textContent = currentUser.email;
      selectedIconUrl = iconUrl; // 編集初期値

      // --- 基本情報表示 ---
      document.getElementById("infoNickname").textContent = currentUserData.nickname || "-";
      document.getElementById("infoUserType").textContent = currentUserData.userType || "-";
      document.getElementById("infoGrade").textContent = currentUserData.grade || "-";

      // --- タグ表示 (卒業生のみ) ---
      const tagsCard = document.getElementById("tagsCard");
      if (currentUserData.userType === "卒業生") {
        tagsCard.style.display = "block";
        const dispTags = document.getElementById("dispTags");
        selectedTags = currentUserData.tags || [];
        
        if (selectedTags.length > 0) {
            dispTags.innerHTML = selectedTags.map(tag => `<span class="tag-badge">#${tag}</span>`).join("");
        } else {
            dispTags.innerHTML = "<span style='color:#999;'>タグは設定されていません</span>";
        }
      } else {
        tagsCard.style.display = "none";
      }

    } else {
      console.error("ユーザーデータが見つかりません in Firestore");
      // Firestoreにデータがない場合のフォールバック表示
      document.getElementById("dispName").textContent = currentUser.displayName;
      document.getElementById("dispIcon").src = currentUser.photoURL || fallbackIcon;
    }
  } catch (error) {
    console.error("データ読み込みエラー:", error);
    alert("データの読み込みに失敗しました。");
  }
}


// === イベントリスナー設定 (編集機能) ===
function setupEventListeners() {
    
    // --- A. アイコン編集 ---
    const iconEditTrigger = document.getElementById("iconEditTrigger");
    const iconEditArea = document.getElementById("iconEditArea");
    const iconSelectionContainer = document.getElementById("iconSelectionContainer");

    // 編集エリアを開く
    iconEditTrigger.addEventListener("click", () => {
        iconEditArea.classList.add("active");
        iconEditTrigger.style.display = "none"; // トリガーを隠す
        
        // アイコン候補を生成 (初回のみ)
        if(iconSelectionContainer.children.length === 0) {
            defaultIcons.forEach(url => {
                const img = document.createElement("img");
                img.src = url;
                img.className = "selection-option icon-option";
                if(url === selectedIconUrl) img.classList.add("selected");
                
                img.addEventListener("click", () => {
                    document.querySelectorAll(".icon-option").forEach(el => el.classList.remove("selected"));
                    img.classList.add("selected");
                    selectedIconUrl = url;
                });
                iconSelectionContainer.appendChild(img);
            });
        }
    });

    // キャンセル
    document.getElementById("iconCancelBtn").addEventListener("click", () => {
        iconEditArea.classList.remove("active");
        iconEditTrigger.style.display = "flex";
        selectedIconUrl = currentUserData.iconUrl || currentUser.photoURL; // 元に戻す
        // 選択状態もリセット
        document.querySelectorAll(".icon-option").forEach(el =>
