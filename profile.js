import { auth, db, storage } from "./firebase.js";
import { onAuthStateChanged, signOut, updateProfile, deleteUser } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

// === タグのマスターリスト（ここを編集すれば全タグが更新されます） ===
const availableTags = [
    "一般入試", "AO入試", "指定校推薦", "海外大学", "進路",
    "数学", "英語", "理科", "国語", "社会", "理系", "文系",
    "DP", "MYP",
    "部活", "課外活動", "ボランティア", "学校生活",
    "英検", "TOEFL", "IELTS", "模試",
    "教育", "その他"
];

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
                // データがない場合の新規作成などの処理が必要ならここへ
            }
        } catch(e) {
            console.error("Error fetching user data:", e);
        }
    });

    // ログアウトボタン
    const logoutBtn = document.getElementById("logoutBtn");
    if(logoutBtn) {
        logoutBtn.addEventListener("click", () => signOut(auth));
    }
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
        
        // interestedTags を優先表示（なければ tags）
        const currentTags = data.interestedTags || data.tags || [];
        
        if(currentTags.length > 0) {
            currentTags.forEach(t => {
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

    // === 通知設定の表示 ===
    // バックエンドに合わせて 'allowAnswerNotification' を使用
    const notifToggle = document.getElementById("emailNotifToggle");
    if(notifToggle) {
        // 設定がない(undefined)場合は「ON(true)」とみなす
        if (data.allowAnswerNotification === false) {
            notifToggle.checked = false;
        } else {
            notifToggle.checked = true;
        }
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

    async function saveIcon(dataUrl) {
        try {
            let finalUrl = dataUrl;
            // Base64データならStorageにアップロード
            if(dataUrl.startsWith("data:image")) {
                const storageRef = ref(storage, `icons/${currentUser.uid}_${Date.now()}.png`);
                await uploadString(storageRef, dataUrl, 'data_url');
                finalUrl = await getDownloadURL(storageRef);
            }

            await updateProfile(currentUser, { photoURL: finalUrl });
            await updateDoc(doc(db, "users", currentUser.uid), { iconUrl: finalUrl });
            alert("アイコンを更新しました！");
            window.location.reload();
        } catch(e) { 
            console.error(e); 
            alert("保存失敗: " + e.message); 
        }
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
        
        // 通知用(interestedTags)優先、なければ旧データ(tags)
        let selectedTags = currentUserData.interestedTags || currentUserData.tags || [];

        tagsEditBtn.addEventListener("click", () => {
             tagsView.style.display = "none";
             tagsEditArea.classList.add("active");
             tagsEditBtn.classList.add("editing");
             tagsEditBtn.disabled = true;

             renderTagButtons(); // ボタンを再描画
        });

        // ボタン生成ロジック
        function renderTagButtons() {
            const container = document.getElementById("tagSelectionContainer");
            container.innerHTML = "";
            
            // availableTags（上部で定義したリスト）を使ってボタンを作る
            availableTags.forEach(tag => {
                const btn = document.createElement("button");
                btn.className = "tag-option-btn";
                btn.textContent = "#" + tag;
                btn.dataset.tag = tag;
                
                if(selectedTags.includes(tag)) {
                    btn.classList.add("selected");
                }
                
                btn.addEventListener("click", () => {
                    if(selectedTags.includes(tag)) {
                        selectedTags = selectedTags.filter(item => item !== tag);
                        btn.classList.remove("selected");
                    } else {
                        if(selectedTags.length < 10) {
                            selectedTags.push(tag);
                            btn.classList.add("selected");
                        } else {
                            alert("タグは最大10個までです。");
                        }
                    }
                });
                container.appendChild(btn);
            });
        }

        document.getElementById("tagsCancelBtn").addEventListener("click", () => {
            tagsView.style.display = "block";
            tagsEditArea.classList.remove("active");
            tagsEditBtn.classList.remove("editing");
            tagsEditBtn.disabled = false;
            // キャンセル時は元の状態に戻す
            selectedTags = currentUserData.interestedTags || currentUserData.tags || [];
        });

        document.getElementById("tagsSaveBtn").addEventListener("click", async () => {
            try {
                // 通知用(interestedTags) と 表示用(tags) 両方を更新
                await updateDoc(doc(db, "users", currentUser.uid), { 
                    tags: selectedTags,
                    interestedTags: selectedTags 
                });
                alert("得意分野タグを保存しました！\n関連する相談が投稿されるとメール通知が届きます。");
                window.location.reload();
            } catch (e) { console.error(e); alert("更新失敗: " + e.message); }
        });
    }

    // === E. 通知設定 (バックエンド連携用に修正) ===
    const notifToggle = document.getElementById("emailNotifToggle");
    if(notifToggle) {
        notifToggle.addEventListener("change", async (e) => {
            try {
                // バックエンドの仕様に合わせて 'allowAnswerNotification' を更新する
                await updateDoc(doc(db, "users", currentUser.uid), { 
                    allowAnswerNotification: e.target.checked 
                });
                console.log("通知設定を保存しました: " + e.target.checked);
            } catch (err) {
                console.error(err);
                alert("設定の保存に失敗しました。");
                // エラー時はスイッチを元に戻す
                e.target.checked = !e.target.checked;
            }
        });
    }

    // === F. アカウント削除 ===
    const deleteBtn = document.getElementById("deleteAccountBtn");
    if(deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
            if(!confirm("本当にアカウントを削除しますか？\nこの操作は元に戻せません。")) return;
            if(!confirm("投稿したコンテンツの作者名は「不明」となりますがよろしいですか？")) return;

            try {
                // Firestoreのユーザーデータを削除
                await deleteDoc(doc(db, "users", currentUser.uid));
                // Authのユーザーを削除
                await deleteUser(currentUser);
                
                alert("アカウントを削除しました。ご利用ありがとうございました。");
                window.location.href = "index.html";
            } catch(e) {
                console.error(e);
                if(e.code === 'auth/requires-recent-login') {
                    alert("セキュリティのため、再ログインしてからもう一度お試しください。");
                } else {
                    alert("削除に失敗しました: " + e.message);
                }
            }
        });
    }
}
