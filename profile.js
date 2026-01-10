import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// === 円形切り抜き用の関数 ===
function getRoundedCanvas(sourceCanvas) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  canvas.width = width;
  canvas.height = height;
  context.imageSmoothingEnabled = true;
  context.drawImage(sourceCanvas, 0, 0, width, height);
  context.globalCompositeOperation = 'destination-in';
  context.beginPath();
  context.arc(width / 2, height / 2, Math.min(width, height) / 2, 0, 2 * Math.PI, true);
  context.fill();
  return canvas;
}

// アイコン生成用
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
let cropper = null; 
let currentFileType = "image/png";

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadUserProfile(user);
      setupEventListeners();
    } else {
      window.location.href = "login.html";
    }
  });

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

async function loadUserProfile(user) {
  try {
    updateDisplay(user.displayName, user.photoURL, user.email);
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      currentUserData = docSnap.data();
    } else {
      currentUserData = {}; 
    }

    const finalName = currentUserData.nickname || user.displayName || "ゲスト";
    // Firestoreのアイコンを優先
    const finalIcon = currentUserData.iconUrl || user.photoURL || fallbackIcon;
    
    updateDisplay(finalName, finalIcon, user.email);
    setText("infoNickname", finalName);
    setText("infoUserType", currentUserData.userType || "-");
    setText("infoGrade", currentUserData.grade || "-");
    
    // Bio表示
    if (currentUserData.bio) {
        document.getElementById("infoBio").textContent = currentUserData.bio;
    }

    // ▼ 通知設定の反映
    const notifToggle = document.getElementById("emailNotifToggle");
    if(notifToggle) {
        // 設定がない場合はfalse（安全側）か、signup時のデフォルトに従う
        // ここでは明示的にtrueの場合のみチェックを入れる
        notifToggle.checked = currentUserData.allowEmailNotification === true;
    }

    selectedIconUrl = finalIcon;
    selectedTags = currentUserData.tags || [];

    const tagsCard = document.getElementById("tagsCard");
    if (currentUserData.userType === "卒業生") {
      if(tagsCard) tagsCard.style.display = "block";
      renderTags(selectedTags);
    } else {
      if(tagsCard) tagsCard.style.display = "none";
    }
  } catch (error) {
    console.error("読み込みエラー:", error);
  }
}

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

function setupEventListeners() {
    // === A. アイコン編集 ===
    const iconTrigger = document.getElementById("iconEditTrigger");
    const iconArea = document.getElementById("iconEditArea");
    const iconContainer = document.getElementById("iconSelectionContainer");
    const fileInput = document.getElementById("iconFileInput");
    
    const cropperModal = document.getElementById("cropperModal");
    const cropperImage = document.getElementById("cropperImage");
    const cropperCancel = document.getElementById("cropperCancelBtn");
    const cropperConfirm = document.getElementById("cropperConfirmBtn");

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

        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                currentFileType = file.type || "image/png";
                const reader = new FileReader();
                reader.onload = (evt) => {
                    cropperImage.src = evt.target.result;
                    cropperModal.style.display = "flex";
                    if (cropper) cropper.destroy();
                    // viewMode: 1 で画像が枠内に収まるように
                    cropper = new Cropper(cropperImage, { aspectRatio: 1, viewMode: 1, background: false });
                };
                reader.readAsDataURL(file);
            }
            fileInput.value = "";
        });

        cropperCancel.addEventListener("click", () => {
            cropperModal.style.display = "none";
            if(cropper) cropper.destroy();
        });

        cropperConfirm.addEventListener("click", () => {
            if(!cropper) return;
            // 1. 通常の四角い切り抜きを取得
            const croppedCanvas = cropper.getCroppedCanvas({ width: 300, height: 300 });
            // 2. それを円形に加工する関数を通す
            const roundedCanvas = getRoundedCanvas(croppedCanvas);
            
            // PNGで書き出し（透過維持）
            selectedIconUrl = roundedCanvas.toDataURL("image/png");
            
            document.getElementById("dispIcon").src = selectedIconUrl;
            cropperModal.style.display = "none";
            if(cropper) cropper.destroy();
            document.querySelectorAll(".icon-option").forEach(el => el.classList.remove("selected"));
        });

        document.getElementById("iconCancelBtn").addEventListener("click", () => {
            iconArea.classList.remove("active");
            iconTrigger.style.display = "flex";
            selectedIconUrl = currentUserData.iconUrl || currentUser.photoURL; 
            document.getElementById("dispIcon").src = selectedIconUrl; 
        });

        document.getElementById("iconSaveBtn").addEventListener("click", async () => {
            try {
                // Firestoreのみ更新（容量制限回避）
                await setDoc(doc(db, "users", currentUser.uid), { iconUrl: selectedIconUrl }, { merge: true });
                
                document.getElementById("dispIcon").src = selectedIconUrl;
                iconArea.classList.remove("active");
                iconTrigger.style.display = "flex";
                
                // ★アラート削除: ここには何も書かず、静かに終了
                
            } catch (e) { 
                console.error(e); 
                alert("更新失敗: " + e.message); 
            }
        });
    }

    // === B. 基本情報編集 ===
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
                await setDoc(doc(db, "users", currentUser.uid), updateData, { merge: true });
                window.location.reload(); 
            } catch (e) { console.error(e); alert("更新失敗: " + e.message); }
        });
    }

    // === C. Bio編集 (追加) ===
    const bioEditBtn = document.getElementById("bioEditBtn");
    const bioView = document.getElementById("bioViewMode");
    const bioEditArea = document.getElementById("bioEditArea");

    if (bioEditBtn && bioView && bioEditArea) {
        bioEditBtn.addEventListener("click", () => {
            bioView.style.display = "none";
            bioEditArea.classList.add("active");
            bioEditBtn.classList.add("editing");
            bioEditBtn.disabled = true;
            document.getElementById("editBio").value = currentUserData.bio || "";
        });

        document.getElementById("bioCancelBtn").addEventListener("click", () => {
            bioView.style.display = "block";
            bioEditArea.classList.remove("active");
            bioEditBtn.classList.remove("editing");
            bioEditBtn.disabled = false;
        });

        document.getElementById("bioSaveBtn").addEventListener("click", async () => {
            const newBio = document.getElementById("editBio").value;
            try {
                await setDoc(doc(db, "users", currentUser.uid), { bio: newBio }, { merge: true });
                window.location.reload();
            } catch (e) {
                console.error(e);
                alert("更新失敗: " + e.message);
            }
        });
    }
    
    // === D. タグ編集 ===
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
                await setDoc(doc(db, "users", currentUser.uid), { tags: selectedTags }, { merge: true });
                window.location.reload();
            } catch (e) { console.error(e); alert("更新失敗: " + e.message); }
        });
    }

    // === E. 通知設定 (追加) ===
    const notifToggle = document.getElementById("emailNotifToggle");
    if(notifToggle) {
        notifToggle.addEventListener("change", async (e) => {
            try {
                // チェック状態が変わったら即座に保存
                await updateDoc(doc(db, "users", currentUser.uid), { 
                    allowEmailNotification: e.target.checked 
                });
                console.log("通知設定を更新しました:", e.target.checked);
            } catch (err) {
                console.error(err);
                alert("設定の保存に失敗しました。");
                // エラー時は見た目を元に戻す
                e.target.checked = !e.target.checked;
            }
        });
    }
}
document.getElementById("deleteAccountBtn")?.addEventListener("click", async () => {
    if (confirm("本当に退会しますか？この操作は取り消せません。")) {
        const user = auth.currentUser;
        try {
            await deleteDoc(doc(db, "users", user.uid));
            await user.delete();
            alert("削除完了しました。");
            window.location.href = "index.html";
        } catch (e) {
            alert("セキュリティ保護のため、一度再ログインしてから削除を実行してください。");
        }
    }
});
