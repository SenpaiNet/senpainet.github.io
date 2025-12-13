import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// アイコン設定
function createColorIcon(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${color}"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
const iconColors = ["#4da6ff", "#ff6b6b", "#4ecdc4", "#ffbe0b", "#9b5de5"];
const defaultIcons = iconColors.map(createColorIcon);
const fallbackIcon = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#cccccc"/></svg>')}`;

let currentUser = null;
let currentUserData = {};
let selectedIconUrl = null;
let selectedTags = [];

document.addEventListener("DOMContentLoaded", () => {
  const loadingOverlay = document.getElementById("loadingOverlay");

  // ★安全装置: 3秒経っても消えなければ強制的に消す
  setTimeout(() => {
    if (loadingOverlay && loadingOverlay.style.display !== "none") {
      console.warn("ロードが遅いため強制表示します");
      loadingOverlay.style.display = "none";
    }
  }, 3000);

  // 1. ログイン状態監視
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      try {
        await loadUserProfile(user.uid);
      } catch (err) {
        console.error("プロフィール読み込みエラー:", err);
      } finally {
        // 成功しても失敗しても必ずロード画面を消す
        if(loadingOverlay) loadingOverlay.style.display = "none";
        setupEventListeners();
      }
    } else {
      window.location.href = "login.html";
    }
  });

  // ログアウト処理
  const logoutBtn = document.getElementById("logoutBtn");
  if(logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
          e.preventDefault();
          signOut(auth).then(() => {
              localStorage.removeItem("senpaiNet_hasAccount");
              alert("ログアウトしました。");
              window.location.href = "index.html";
          });
      });
  }
});

// === プロフィール読み込み関数 ===
async function loadUserProfile(uid) {
  // 要素があるかチェック
  const nameEl = document.getElementById("dispName");
  const iconEl = document.getElementById("dispIcon");
  const emailEl = document.getElementById("dispEmail");
  
  if (!nameEl || !iconEl) return; // HTML要素がない場合は終了

  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      currentUserData = docSnap.data();
    } else {
      console.log("Firestoreにユーザーデータがありません (古いアカウントの可能性)");
      currentUserData = {}; // 空オブジェクトで続行
    }

    // 表示の更新 (データがない場合はAuth情報やデフォルト値を使う)
    const iconUrl = currentUserData.iconUrl || currentUser.photoURL || fallbackIcon;
    const nickName = currentUserData.nickname || currentUser.displayName || "ゲストユーザー";
    
    iconEl.src = iconUrl;
    nameEl.textContent = nickName;
    if(emailEl) emailEl.textContent = currentUser.email;
    
    selectedIconUrl = iconUrl; 

    // 基本情報エリア
    setText("infoNickname", nickName);
    setText("infoUserType", currentUserData.userType || "-");
    setText("infoGrade", currentUserData.grade || "-");

    // タグエリア (卒業生のみ)
    const tagsCard = document.getElementById("tagsCard");
    if (currentUserData.userType === "卒業生") {
      if(tagsCard) tagsCard.style.display = "block";
      const dispTags = document.getElementById("dispTags");
      selectedTags = currentUserData.tags || [];
      
      if (dispTags) {
          if (selectedTags.length > 0) {
              dispTags.innerHTML = selectedTags.map(tag => `<span class="tag-badge">#${tag}</span>`).join("");
          } else {
              dispTags.innerHTML = "<span style='color:#999;'>タグは設定されていません</span>";
          }
      }
    } else {
      if(tagsCard) tagsCard.style.display = "none";
    }

  } catch (error) {
    console.error("データ取得詳細エラー:", error);
    throw error; // 上のcatchに投げる
  }
}

// ヘルパー関数: 要素があればテキストセット
function setText(id, text) {
    const el = document.getElementById(id);
    if(el) el.textContent = text;
}

// === イベントリスナー設定 ===
function setupEventListeners() {
    // --- A. アイコン編集 ---
    const iconTrigger = document.getElementById("iconEditTrigger");
    const iconArea = document.getElementById("iconEditArea");
    const iconContainer = document.getElementById("iconSelectionContainer");
    
    if(iconTrigger && iconArea) {
        iconTrigger.addEventListener("click", () => {
            iconArea.classList.add("active");
            iconTrigger.style.display = "none";
            
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
                await updateProfile(currentUser, { photoURL: selectedIconUrl });
                await updateDoc(doc(db, "users", currentUser.uid), { iconUrl: selectedIconUrl }, { merge: true })
                      .catch(() => setDoc(doc(db, "users", currentUser.uid), { iconUrl: selectedIconUrl }, { merge: true })); // ドキュメントがない場合は作成
                
                document.getElementById("dispIcon").src = selectedIconUrl;
                iconArea.classList.remove("active");
                iconTrigger.style.display = "flex";
                alert("アイコンを更新しました！");
            } catch (e) { console.error(e); alert("更新失敗: " + e.message); }
        });
    }

    // --- B. 基本情報編集 ---
    const basicEditBtn = document.getElementById("basicInfoEditBtn");
    const basicView = document.getElementById("basicInfoViewMode");
    const basicEditArea = document.getElementById("basicInfoEditArea");

    if(basicEditBtn && basicView && basicEditArea) {
        basicEditBtn.addEventListener("click", () => {
            basicView.style.display = "none";
            basicEditArea.classList.add("active");
            basicEditBtn.classList.add("editing");
            basicEditBtn.disabled = true;

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
                if(newType === "在校生") updateData.tags = [];

                // updateDocはドキュメントが存在しないとエラーになるため、存在確認が必要だが、setDoc(..., {merge:true})なら安全
                const { setDoc } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
                await setDoc(doc(db, "users", currentUser.uid), updateData, { merge: true });

                window.location.reload(); // 簡単のためリロードして反映
            } catch (e) { console.error(e); alert("更新失敗: " + e.message); }
        });
    }
    
    // --- C. タグ編集 ---
    const tagsEditBtn = document.getElementById("tagsEditBtn");
    const tagsView = document.getElementById("tagsViewMode");
    const tagsEditArea = document.getElementById("tagsEditArea");
    
    if(tagsEditBtn && tagsView && tagsEditArea) {
        tagsEditBtn.addEventListener("click", () => {
            tagsView.style.display = "none";
            tagsEditArea.classList.add("active");
            tagsEditBtn.classList.add("editing");
            tagsEditBtn.disabled = true;
            
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
            selectedTags = currentUserData.tags || [];
        });

        document.getElementById("tagsSaveBtn").addEventListener("click", async () => {
            try {
                const { setDoc } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
                await setDoc(doc(db, "users", currentUser.uid), { tags: selectedTags }, { merge: true });
                window.location.reload();
            } catch (e) { console.error(e); alert("更新失敗: " + e.message); }
        });
    }
}
