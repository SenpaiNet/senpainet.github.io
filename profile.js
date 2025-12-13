import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// アイコン生成
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
let currentFileType = "image/png"; // デフォルトはPNG

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
    const finalIcon = currentUserData.iconUrl || user.photoURL || fallbackIcon;
    
    updateDisplay(finalName, finalIcon, user.email);
    setText("infoNickname", finalName);
    setText("infoUserType", currentUserData.userType || "-");
    setText("infoGrade", currentUserData.grade || "-");

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

        // ファイル選択
        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                // ファイルタイプを保存 (JPEGならJPEGで、PNGならPNGで保存するため)
                currentFileType = file.type || "image/png";

                const reader = new FileReader();
                reader.onload = (evt) => {
                    cropperImage.src = evt.target.result;
                    cropperModal.style.display = "flex";
                    
                    if (cropper) cropper.destroy();
                    cropper = new Cropper(cropperImage, {
                        aspectRatio: 1, 
                        viewMode: 1,
                        background: false // 透明背景を見やすくする(市松模様になる)
                    });
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
            const canvas = cropper.getCroppedCanvas({
                width: 300,
                height: 300,
                // 透明背景を維持するためにfillColorは指定しない
            });
            
            // ★重要: 元のファイル形式を尊重するか、PNG(透明維持)にする
            // ここでは容量と画質のバランスで基本PNG推奨だが、元がJPEGならJPEGでも良い
            // 今回は「どんな画像でも対応」なので安全策でPNGにする
            selectedIconUrl = canvas.toDataURL("image/png");
            
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
                await updateProfile(currentUser, { photoURL: selectedIconUrl });
                await setDoc(doc(db, "users", currentUser.uid), { iconUrl: selectedIconUrl }, { merge: true });
                
                document.getElementById("dispIcon").src = selectedIconUrl;
                iconArea.classList.remove("active");
                iconTrigger.style.display = "flex";
                alert("アイコンを更新しました！");
            } catch (e) { console.error(e); alert("更新失敗: " + e.message); }
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
    
    // === C. タグ編集 ===
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
}
