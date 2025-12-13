// 1. 統一した firebase.js から auth と db を読み込む (これで競合を防ぐ)
import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// アイコン生成用データ
function createColorIcon(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${color}"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
const iconColors = ["#4da6ff", "#ff6b6b", "#4ecdc4", "#ffbe0b", "#9b5de5"];
const defaultIcons = iconColors.map(createColorIcon);
const fallbackIcon = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#cccccc"/></svg>')}`;

// 状態管理変数
let currentUser = null;
let currentUserData = {}; // Firestoreのデータを格納
let selectedIconUrl = null;
let selectedTags = [];

// === メイン処理開始 ===
document.addEventListener("DOMContentLoaded", () => {
  
  // 認証状態の監視
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // ログイン中
      console.log("ログイン確認:", user.uid);
      currentUser = user;
      
      // プロフィール読み込み実行
      await loadUserProfile(user);
      
      // イベントリスナー（編集ボタン等）のセットアップ
      setupEventListeners();
      
    } else {
      // 未ログイン -> ログイン画面へ
      window.location.href = "login.html";
    }
  });

  // ログアウトボタン
  const logoutBtn = document.getElementById("logoutBtn");
  if(logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      signOut(auth).then(() => {
        localStorage.removeItem("senpaiNet_hasAccount");
        window.location.href = "index.html";
      });
    });
  }
});

// === データ読み込み関数 (ここを頑丈にしました) ===
async function loadUserProfile(user) {
  try {
    // 1. まずAuth情報で最低限の表示をする (これで真っ白は防げる)
    updateDisplay(user.displayName, user.photoURL, user.email);

    // 2. Firestoreから詳細データを取得
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      currentUserData = docSnap.data();
      console.log("Firestoreデータ取得成功:", currentUserData);
    } else {
      console.warn("Firestoreにデータがありません。新規作成扱いで進めます。");
      currentUserData = {}; 
    }

    // 3. Firestoreのデータがあれば上書き表示
    const finalName = currentUserData.nickname || user.displayName || "ゲスト";
    const finalIcon = currentUserData.iconUrl || user.photoURL || fallbackIcon;
    
    updateDisplay(finalName, finalIcon, user.email);

    // 詳細項目の表示
    setText("infoNickname", finalName);
    setText("infoUserType", currentUserData.userType || "-");
    setText("infoGrade", currentUserData.grade || "-");

    // 編集用の一時変数にもセット
    selectedIconUrl = finalIcon;
    selectedTags = currentUserData.tags || [];

    // 卒業生タグエリアの表示制御
    const tagsCard = document.getElementById("tagsCard");
    if (currentUserData.userType === "卒業生") {
      if(tagsCard) tagsCard.style.display = "block";
      renderTags(selectedTags);
    } else {
      if(tagsCard) tagsCard.style.display = "none";
    }

  } catch (error) {
    console.error("読み込みエラー:", error);
    alert("データの読み込みに失敗しました: " + error.message);
  }
}

// 画面表示更新ヘルパー
function updateDisplay(name, icon, email) {
  const nameEl = document.getElementById("dispName");
  const iconEl = document.getElementById("dispIcon");
  const emailEl = document.getElementById("dispEmail");
  
  if(nameEl) nameEl.textContent = name || "読み込み中...";
  if(iconEl) iconEl.src = icon || fallbackIcon;
  if(emailEl) emailEl.textContent = email || "";
}

function setText(id, text) {
  const el = document.getElementById(id);
  if(el) el.textContent = text;
}

function renderTags(tags) {
  const dispTags = document.getElementById("dispTags");
  if(!dispTags) return;
  
  if (tags && tags.length > 0) {
    dispTags.innerHTML = tags.map(tag => `<span class="tag-badge">#${tag}</span>`).join("");
  } else {
    dispTags.innerHTML = "<span style='color:#999;'>タグは設定されていません</span>";
  }
}

// === イベントリスナー設定 ===
function setupEventListeners() {
    
    // -------------------------
    // A. アイコン編集
    // -------------------------
    const iconTrigger = document.getElementById("iconEditTrigger");
    const iconArea = document.getElementById("iconEditArea");
    const iconContainer = document.getElementById("iconSelectionContainer");
    
    if(iconTrigger && iconArea) {
        iconTrigger.addEventListener("click", () => {
            iconArea.classList.add("active");
            iconTrigger.style.display = "none";
            
            // アイコン候補生成 (初回のみ)
            if(iconContainer && iconContainer.children.length === 0) {
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
                    iconContainer.appendChild(img);
                });
            }
        });

        document.getElementById("iconCancelBtn").addEventListener("click", () => {
            iconArea.classList.remove("active");
            iconTrigger.style.display = "flex";
            selectedIconUrl = currentUserData.iconUrl || currentUser.photoURL; 
        });

        document.getElementById("iconSaveBtn").addEventListener("click", async () => {
            try {
                // AuthとFirestore両方更新
                await updateProfile(currentUser, { photoURL: selectedIconUrl });
                await setDoc(doc(db, "users", currentUser.uid), { iconUrl: selectedIconUrl }, { merge: true });
                
                document.getElementById("dispIcon").src = selectedIconUrl;
                iconArea.classList.remove("active");
                iconTrigger.style.display = "flex";
            } catch (e) { console.error(e); alert("更新失敗: " + e.message); }
        });
    }

    // -------------------------
    // B. 基本情報編集
    // -------------------------
    const basicEditBtn = document.getElementById("basicInfoEditBtn");
    const basicView = document.getElementById("basicInfoViewMode");
    const basicEditArea = document.getElementById("basicInfoEditArea");

    if(basicEditBtn && basicView && basicEditArea) {
        basicEditBtn.addEventListener("click", () => {
            basicView.style.display = "none";
            basicEditArea.classList.add("active");
            basicEditBtn.classList.add("editing");
            basicEditBtn.disabled = true;

            // フォームに現在の値をセット
            document.getElementById("editNickname").value = document.getElementById("infoNickname").textContent;
            document.getElementById("editUserType").value = currentUserData.userType || "在校生";
            document.getElementById("editGrade").value = currentUserData.grade || "";
        });

        document.getElementById("basicInfoCancelBtn").addEventListener("click", () => {
            basicView.style.display = "block";
            basicEditArea.classList.remove("active");
            basicEditBtn.classList.remove("editing");
            basicEditBtn.disabled = false;
        });

        document.getElementById("basicInfoSaveBtn").addEventListener("click", async () => {
            const newName = document.getElementById("editNickname").value;
            const newType = document.getElementById("editUserType").value;
            const newGrade = document.getElementById("editGrade").value;

            try {
                if(newName !== currentUser.displayName) {
                    await updateProfile(currentUser, { displayName: newName });
                }
                
                const updateData = { nickname: newName, userType: newType, grade: newGrade };
                // 在校生になったらタグを消す
                if(newType === "在校生") updateData.tags = [];

                await setDoc(doc(db, "users", currentUser.uid), updateData, { merge: true });
                
                // リロードして反映 (一番確実)
                window.location.reload(); 
            } catch (e) { console.error(e); alert("更新失敗: " + e.message); }
        });
    }
    
    // -------------------------
    // C. タグ編集
    // -------------------------
    const tagsEditBtn = document.getElementById("tagsEditBtn");
    const tagsView = document.getElementById("tagsViewMode");
    const tagsEditArea = document.getElementById("tagsEditArea");
    
    if(tagsEditBtn && tagsView && tagsEditArea) {
        tagsEditBtn.addEventListener("click", () => {
            tagsView.style.display = "none";
            tagsEditArea.classList.add("active");
            tagsEditBtn.classList.add("editing");
            tagsEditBtn.disabled = true;
            
            // 既存タグを選択状態にする
            document.querySelectorAll(".tag-option-btn").forEach(btn => {
                btn.classList.toggle("selected", selectedTags.includes(btn.dataset.tag));
            });
        });

        document.querySelectorAll(".tag-option-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const tag = btn.dataset.tag;
                if (selectedTags.includes(tag)) {
                    selectedTags = selectedTags.filter(t => t !== tag);
                    btn.classList.remove("selected");
                } else {
                    if (selectedTags.length < 3) {
                        selectedTags.push(tag);
                        btn.classList.add("selected");
                    } else {
                        alert("タグは最大3つまでです。");
                    }
                }
            });
        });

        document.getElementById("tagsCancelBtn").addEventListener("click", () => {
            tagsView.style.display = "block";
            tagsEditArea.classList.remove("active");
            tagsEditBtn.classList.remove("editing");
            tagsEditBtn.disabled = false;
            // リセット
            selectedTags = currentUserData.tags || [];
        });

        document.getElementById("tagsSaveBtn").addEventListener("click", async () => {
            try {
                await setDoc(doc(db, "users", currentUser.uid), { tags: selectedTags }, { merge: true });
                window.location.reload();
            } catch (e) { console.error(e); alert("更新失敗: " + e.message); }
        });
    }
}
