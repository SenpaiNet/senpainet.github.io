import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut, updateProfile, deleteUser } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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

let currentUser = null;
let currentUserData = null;
let cropper = null;

document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "login.html";
            return;
        }
        currentUser = user;
        
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if(userDoc.exists()) {
                currentUserData = userDoc.data();
                renderProfile();
                setupEditLogics();
            } else {
                console.error("User data not found in Firestore");
            }
        } catch(e) {
            console.error("Error fetching user data:", e);
        }
    });
});

function renderProfile() {
    const data = currentUserData;
    
    // アイコン・名前
    document.getElementById("dispIcon").src = data.iconUrl || currentUser.photoURL || "https://placehold.co/120";
    document.getElementById("dispName").textContent = data.nickname || currentUser.displayName || "名無し";
    document.getElementById("dispEmail").textContent = currentUser.email;

    // 基本情報
    document.getElementById("infoNickname").textContent = data.nickname || "-";
    document.getElementById("infoUserType").textContent = data.userType || "-";
    document.getElementById("infoGrade").textContent = data.grade || "-";

    // 経歴
    document.getElementById("infoBio").textContent = data.bio || "未設定";

    // タグ (卒業生のみ)
    if(data.userType === "卒業生") {
        document.getElementById("tagsCard").style.display = "block";
        const tagsDiv = document.getElementById("dispTags");
        tagsDiv.innerHTML = "";
        if(data.tags && data.tags.length > 0) {
            data.tags.forEach(t => {
                const sp = document.createElement("span");
                sp.className = "tag-badge";
                sp.textContent = "#" + t;
                tagsDiv.appendChild(sp);
            });
        } else {
            tagsDiv.innerHTML = "<span style='color:#999;'>タグなし</span>";
        }
    } else {
        document.getElementById("tagsCard").style.display = "none";
    }

    // 通知設定
    const notifToggle = document.getElementById("emailNotifToggle");
    if(notifToggle) {
        notifToggle.checked = !!data.allowEmailNotification;
    }
}

function setupEditLogics() {
    // === A. アイコン編集 ===
    const iconArea = document.getElementById("iconEditArea");
    const iconTrigger = document.getElementById("iconEditTrigger");
    
    iconTrigger.addEventListener("click", () => {
        iconArea.classList.toggle("active");
    });
    document.getElementById("iconCancelBtn").addEventListener("click", () => iconArea.classList.remove("active"));

    // ファイル選択
    const fileInput = document.getElementById("iconFileInput");
    const cropperModal = document.getElementById("cropperModal");
    const cropperImage = document.getElementById("cropperImage");
    
    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if(!file) return;
        
        const reader = new FileReader();
        reader.onload = (evt) => {
            cropperImage.src = evt.target.result;
            cropperModal.style.display = "flex";
            if(cropper) cropper.destroy();
            cropper = new Cropper(cropperImage, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 1,
                restore: false,
                guides: false,
                center: false,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
            });
        };
        reader.readAsDataURL(file);
        // 同じファイルを選んでも発火するように
        fileInput.value = "";
    });

    document.getElementById("cropperCancelBtn").addEventListener("click", () => {
        cropperModal.style.display = "none";
        if(cropper) cropper.destroy();
    });

    // 切り抜き確定 -> アップロード
    document.getElementById("cropperConfirmBtn").addEventListener("click", () => {
        if(!cropper) return;
        const canvas = cropper.getCroppedCanvas({ width: 256, height: 256 });
        const rounded = getRoundedCanvas(canvas);
        const dataUrl = rounded.toDataURL("image/png"); // Base64
        
        // Firestore保存（本来はStorage推奨だが、簡易実装としてFirestoreにBase64保存）
        // ※データ量が大きいとエラーになる場合があるので注意
        saveIcon(dataUrl);
        
        cropperModal.style.display = "none";
        cropper.destroy();
    });

    // 色アイコン選択
    const colorContainer = document.getElementById("iconSelectionContainer");
    colorContainer.innerHTML = "";
    iconColors.forEach(c => {
        const url = createColorIcon(c);
        const img = document.createElement("img");
        img.src = url;
        img.className = "selection-option icon-option";
        img.addEventListener("click", () => saveIcon(url));
        colorContainer.appendChild(img);
    });

    async function saveIcon(url) {
        try {
            await updateProfile(currentUser, { photoURL: url });
            await updateDoc(doc(db, "users", currentUser.uid), { iconUrl: url });
            alert("アイコンを更新しました！");
            window.location.reload();
        } catch(e) { console.error(e); alert("保存失敗: " + e.message); }
    }


    // === B. 基本情報編集 ===
    const basicView = document.getElementById("basicInfoViewMode");
    const basicEditArea = document.getElementById("basicInfoEditArea");
    const basicEditBtn = document.getElementById("basicInfoEditBtn");
    
    basicEditBtn.addEventListener("click", () => {
        if(basicEditBtn.classList.contains("editing")) return;
        basicView.style.display = "none";
        basicEditArea.classList.add("active");
        basicEditBtn.classList.add("editing");
        
        // フォームに初期値をセット
        document.getElementById("editNickname").value = currentUserData.nickname || "";
        document.getElementById("editUserType").value = currentUserData.userType || "在校生";
        document.getElementById("editGrade").value = currentUserData.grade || "";
    });
    
    document.getElementById("basicInfoCancelBtn").addEventListener("click", () => {
        basicView.style.display = "block";
        basicEditArea.classList.remove("active");
        basicEditBtn.classList.remove("editing");
    });
    
    document.getElementById("basicInfoSaveBtn").addEventListener("click", async () => {
        const newNick = document.getElementById("editNickname").value;
        const newType = document.getElementById("editUserType").value;
        const newGrade = document.getElementById("editGrade").value;
        
        try {
            await updateProfile(currentUser, { displayName: newNick });
            await updateDoc(doc(db, "users", currentUser.uid), {
                nickname: newNick, userType: newType, grade: newGrade
            });
            window.location.reload();
        } catch(e) { console.error(e); alert("保存失敗: " + e.message); }
    });

    // === C. 経歴編集 ===
    const bioView = document.getElementById("bioViewMode");
    const bioEditArea = document.getElementById("bioEditArea");
    const bioEditBtn = document.getElementById("bioEditBtn");
    
    bioEditBtn.addEventListener("click", () => {
        if(bioEditBtn.classList.contains("editing")) return;
        bioView.style.display = "none";
        bioEditArea.classList.add("active");
        bioEditBtn.classList.add("editing");
        document.getElementById("editBio").value = currentUserData.bio || "";
    });
    document.getElementById("bioCancelBtn").addEventListener("click", () => {
        bioView.style.display = "block";
        bioEditArea.classList.remove("active");
        bioEditBtn.classList.remove("editing");
    });
    document.getElementById("bioSaveBtn").addEventListener("click", async () => {
        try {
            await updateDoc(doc(db, "users", currentUser.uid), {
                bio: document.getElementById("editBio").value
            });
            window.location.reload();
        } catch(e) { console.error(e); alert("保存失敗: " + e.message); }
    });

    // === D. タグ編集 ===
    if(currentUserData.userType === "卒業生") {
        const tagsView = document.getElementById("tagsViewMode");
        const tagsEditArea = document.getElementById("tagsEditArea");
        const tagsEditBtn = document.getElementById("tagsEditBtn");
        let selectedTags = currentUserData.tags || [];

        tagsEditBtn.addEventListener("click", () => {
             tagsView.style.display = "none";
             tagsEditArea.classList.add("active");
             tagsEditBtn.classList.add("editing");
             tagsEditBtn.disabled = true;

             // タグボタンの状態初期化
             document.querySelectorAll("#tagSelectionContainer .tag-option").forEach(btn => {
                const t = btn.dataset.tag;
                // クラス名をリセットしてから判定
                btn.className = "tag-option-btn"; 
                if(selectedTags.includes(t)) btn.classList.add("selected");
             });
        });

        // タグボタンの生成（HTMLに静的に書かれているものをJSで装飾しなおす、あるいはクリックイベント付与）
        // ここではHTMLの span.tag-option を button.tag-option-btn に置き換えてイベント設定
        const container = document.getElementById("tagSelectionContainer");
        const spans = container.querySelectorAll(".tag-option");
        // 一度クリアして再生成
        const tagList = Array.from(spans).map(s => s.dataset.tag);
        container.innerHTML = "";
        
        tagList.forEach(tag => {
            const btn = document.createElement("button");
            btn.className = "tag-option-btn";
            btn.textContent = "#" + tag;
            btn.dataset.tag = tag;
            if(selectedTags.includes(tag)) btn.classList.add("selected");
            
            container.appendChild(btn);
            
            btn.addEventListener("click", () => {
                const t = btn.dataset.tag;
                if(selectedTags.includes(t)) {
                    selectedTags = selectedTags.filter(item => item !== t);
                    btn.classList.remove("selected");
                } else {
                    if(selectedTags.length < 3) {
                        selectedTags.push(t);
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

    // === E. 通知設定 ===
    const notifToggle = document.getElementById("emailNotifToggle");
    if(notifToggle) {
        notifToggle.addEventListener("change", async (e) => {
            try {
                await updateDoc(doc(db, "users", currentUser.uid), { 
                    allowEmailNotification: e.target.checked 
                });
            } catch (err) {
                console.error(err);
                alert("設定の保存に失敗しました。");
                e.target.checked = !e.target.checked;
            }
        });
    }

    // === F. アカウント削除 (新規追加) ===
    const deleteBtn = document.getElementById("deleteAccountBtn");
    if(deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
            if(!confirm("本当にアカウントを削除しますか？\nこの操作は元に戻せません。")) return;
            if(!confirm("投稿したコンテンツの作者名は「不明」となりますがよろしいですか？")) return;

            try {
                // 1. Firestoreのユーザーデータを削除
                await deleteDoc(doc(db, "users", currentUser.uid));
                
                // 2. Authenticationから削除
                await deleteUser(currentUser);

                alert("アカウントを削除しました。ご利用ありがとうございました。");
                window.location.href = "index.html";
            } catch(e) {
                console.error(e);
                // 再ログインが必要なケースがあるため
                if(e.code === 'auth/requires-recent-login') {
                    alert("セキュリティのため、再ログインしてからもう一度お試しください。");
                } else {
                    alert("削除に失敗しました: " + e.message);
                }
            }
        });
    }
}
