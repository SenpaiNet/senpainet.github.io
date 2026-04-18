import { db, auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, serverTimestamp, query } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const listContainer = document.getElementById("senpaiList");
const toggleBtn = document.getElementById("toggleFormBtn");
const formArea = document.getElementById("profileFormArea");
const addBtn = document.getElementById("addCardBtn");
const emptyMsg = document.getElementById("emptyMsg");

// フォーム内の要素
const formTitle = document.getElementById("formTitle");
const editCardIdInput = document.getElementById("editCardId");
const inName = document.getElementById("inputName");
const inGrade = document.getElementById("inputGrade");
const inBio = document.getElementById("inputBio");
const inTags = document.getElementById("inputTags");

let isFormOpen = false;
let currentUserData = null;
let loadedPortfolios = []; // 編集時にデータを参照するための配列
let authInitialized = false;

// 1. ログイン状態の監視（ロード時の制御）
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const docSnap = await getDoc(doc(db, "users", user.uid));
            if (docSnap.exists()) {
                currentUserData = docSnap.data();
            }
        } catch (e) {
            console.error(e);
        }
    } else {
        currentUserData = null;
    }

    // 初回認証チェック完了後にリストを読み込む（編集・削除ボタンの判定にログイン情報が必要なため）
    if (!authInitialized) {
        authInitialized = true;
        loadAllPortfolios();
    } else {
        // ログイン状態が変わった場合も再読み込み
        loadAllPortfolios();
    }
});

// 2. ポートフォリオ一覧の取得と表示
async function loadAllPortfolios() {
    listContainer.innerHTML = ""; // クリア
    loadedPortfolios = []; // データ配列もクリア
    
    try {
        const q = query(collection(db, "portfolios")); 
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            if(emptyMsg) emptyMsg.style.display = "block";
            return;
        }

        if(emptyMsg) emptyMsg.style.display = "none";

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const portfolioData = { uid: docSnap.id, ...data };
            loadedPortfolios.push(portfolioData); // ローカルに保持
            renderSenpaiCard(portfolioData);
        });

    } catch (e) {
        console.error("読み込みエラー:", e);
        listContainer.innerHTML = "<p style='text-align:center'>読み込みに失敗しました</p>";
    }
}

// 3. フォームの開閉制御
toggleBtn.addEventListener("click", () => {
    if (!auth.currentUser) {
        alert("機能を使用するにはログインが必要です");
        return;
    }

    if (!isFormOpen) {
        // 新規作成モードとして開く（空欄を表示）
        openFormForNew();
    } else {
        // 閉じる
        closeForm();
    }
});

function openFormForNew() {
    isFormOpen = true;
    editCardIdInput.value = ""; // 編集IDをクリア
    formTitle.textContent = "新規プロフィール作成";
    addBtn.textContent = "この内容でカードを表示";

    // 新規作成時は空欄にする
    inName.value = "";
    inGrade.value = "";
    inBio.value = "";
    inTags.value = "";

    formArea.classList.add("active");
    toggleBtn.textContent = "▲ 閉じる";
    toggleBtn.style.background = "#64748b";
}

function openFormForEdit(data) {
    isFormOpen = true;
    editCardIdInput.value = data.uid; // 編集対象のUIDをセット
    formTitle.textContent = "プロフィール情報を編集";
    addBtn.textContent = "更新する";

    // 既存のデータを入力欄にセット
    inName.value = data.nickname || "";
    inGrade.value = data.grade || "";
    inBio.value = data.bio || "";
    inTags.value = (data.tags || []).join(", ");

    formArea.classList.add("active");
    toggleBtn.textContent = "▲ 閉じる";
    toggleBtn.style.background = "#64748b";
    
    // スムーズにフォームへスクロール
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeForm() {
    isFormOpen = false;
    editCardIdInput.value = "";
    formArea.classList.remove("active");
    toggleBtn.textContent = "＋ プロフィールカードを作成";
    toggleBtn.style.background = "#3b82f6";
}

// 4. 「追加 / 更新」ボタン → Firestoreへ保存
addBtn.addEventListener("click", async () => {
    if (!auth.currentUser) return;

    addBtn.disabled = true;
    const isEditing = editCardIdInput.value !== "";
    addBtn.textContent = "保存中...";

    const name = inName.value.trim() || "名無し先輩";
    const grade = inGrade.value.trim() || "卒業生";
    const bio = inBio.value.trim() || "自己紹介なし";
    const tagsStr = inTags.value.trim();
    
    let tags = [];
    if (tagsStr) {
        tags = tagsStr.split(/,|、/).map(t => t.trim()).filter(t => t);
    }

    const icon = currentUserData ? (currentUserData.iconUrl || auth.currentUser.photoURL) : "https://placehold.co/50";

    const portfolioData = {
        nickname: name,
        grade: grade,
        bio: bio,
        tags: tags,
        iconUrl: icon,
        updatedAt: serverTimestamp()
    };

    try {
        // UIDをキーにして保存（新規作成も編集も上書きで対応可能）
        await setDoc(doc(db, "portfolios", auth.currentUser.uid), portfolioData);
        
        alert(isEditing ? "プロフィールを更新しました！" : "プロフィールを公開しました！");
        
        closeForm();
        loadAllPortfolios(); // 画面を更新

    } catch (e) {
        console.error(e);
        alert("保存に失敗しました: " + e.message);
    } finally {
        addBtn.disabled = false;
    }
});

// 5. カード描画関数
function renderSenpaiCard(user) {
    const existingCard = document.getElementById(`card-${user.uid}`);
    if (existingCard) existingCard.remove();

    const icon = user.iconUrl || "https://placehold.co/50";
    const name = user.nickname;
    const bioSnippet = user.bio.length > 60 ? user.bio.substring(0, 60) + "..." : user.bio;
    const tagsHtml = (user.tags || []).map(t => `<span class="tag">#${t}</span>`).join("");

    // 自分のカードの場合のみ編集・削除ボタンを追加
    let actionsHtml = "";
    if (auth.currentUser && auth.currentUser.uid === user.uid) {
        actionsHtml = `
            <div class="card-actions">
                <button class="edit-btn" data-uid="${user.uid}">編集</button>
                <button class="delete-btn" data-uid="${user.uid}">削除</button>
            </div>
        `;
    }

    const html = `
      <article id="card-${user.uid}" class="post-card" style="cursor: default; animation: fadeIn 0.5s ease; display: flex; flex-direction: column;">
        <div style="display:flex; align-items:center; margin-bottom:15px; border-bottom:1px solid #f1f5f9; padding-bottom:10px;">
             <img src="${icon}" style="width:45px; height:45px; border-radius:50%; margin-right:12px; object-fit:cover; border:1px solid #eee;">
             <div>
                 <h3 style="margin:0; font-size:1.1rem; color:#1e3a8a;">${name}</h3>
                 <span style="font-size:0.85rem; color:#64748b;">${user.grade}</span>
             </div>
        </div>
        
        <div class="tags" style="margin-bottom:12px;">${tagsHtml}</div>
        
        <p style="font-size:0.95rem; color:#334155; line-height:1.6; flex-grow:1;">${bioSnippet}</p>
        
        ${actionsHtml}
      </article>
    `;
    
    listContainer.insertAdjacentHTML("afterbegin", html);
}

// 6. 編集・削除ボタンのイベントハンドリング（イベントデリゲーション）
listContainer.addEventListener("click", async (e) => {
    const target = e.target;
    
    // 削除ボタンの処理
    if (target.classList.contains("delete-btn")) {
        const uid = target.getAttribute("data-uid");
        if (confirm("本当にあなたのプロフィールカードを削除しますか？")) {
            try {
                target.textContent = "削除中...";
                target.disabled = true;
                
                // Firestoreから削除
                await deleteDoc(doc(db, "portfolios", uid));
                
                // 画面から要素を削除
                const cardToRemove = document.getElementById(`card-${uid}`);
                if (cardToRemove) cardToRemove.remove();
                
                alert("プロフィールを削除しました。");
                
                // 全て削除された場合は空メッセージを表示
                if (listContainer.querySelectorAll('.post-card').length === 0) {
                    if (emptyMsg) emptyMsg.style.display = "block";
                }
                
                // もし編集中に削除したらフォームも閉じる
                if (editCardIdInput.value === uid) {
                    closeForm();
                }
                
            } catch (err) {
                console.error("削除エラー:", err);
                alert("削除に失敗しました: " + err.message);
                target.textContent = "削除";
                target.disabled = false;
            }
        }
    }
    
    // 編集ボタンの処理
    if (target.classList.contains("edit-btn")) {
        const uid = target.getAttribute("data-uid");
        const portfolioData = loadedPortfolios.find(p => p.uid === uid);
        
        if (portfolioData) {
            openFormForEdit(portfolioData);
        } else {
            alert("データが見つかりませんでした。画面を更新してください。");
        }
    }
});
