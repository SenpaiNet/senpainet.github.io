import { db, auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const listContainer = document.getElementById("senpaiList");
const toggleBtn = document.getElementById("toggleFormBtn");
const formArea = document.getElementById("profileFormArea");
const addBtn = document.getElementById("addCardBtn");
const emptyMsg = document.getElementById("emptyMsg");

// 入力欄
const inName = document.getElementById("inputName");
const inGrade = document.getElementById("inputGrade");
const inBio = document.getElementById("inputBio");
const inTags = document.getElementById("inputTags");

let isFormOpen = false;
let currentUserData = null;

// 0. 初期ロード（全員分のポートフォリオを表示）
async function loadAllPortfolios() {
    listContainer.innerHTML = ""; // クリア
    
    try {
        // 更新順（新しい順）で取得したい場合は orderBy('updatedAt', 'desc') を使いますが、
        // インデックス未作成エラーを防ぐため、まずは単純取得にします。
        const q = query(collection(db, "portfolios")); 
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            if(emptyMsg) emptyMsg.style.display = "block";
            return;
        }

        if(emptyMsg) emptyMsg.style.display = "none";

        snapshot.forEach(doc => {
            const data = doc.data();
            // データにIDを含めて描画
            renderSenpaiCard({ uid: doc.id, ...data });
        });

    } catch (e) {
        console.error("読み込みエラー:", e);
        listContainer.innerHTML = "<p style='text-align:center'>読み込みに失敗しました</p>";
    }
}

// ページ読み込み時に実行
loadAllPortfolios();


// 1. ログインユーザー情報の取得 & フォーム制御
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
    }
});

toggleBtn.addEventListener("click", () => {
    if (!auth.currentUser) {
        alert("機能を使用するにはログインが必要です");
        return;
    }

    isFormOpen = !isFormOpen;
    if (isFormOpen) {
        formArea.classList.add("active");
        toggleBtn.textContent = "▲ 閉じる";
        toggleBtn.style.background = "#64748b";

        // 自動入力
        if (currentUserData) {
            if (!inName.value) inName.value = currentUserData.nickname || "";
            if (!inGrade.value) inGrade.value = currentUserData.grade || "";
            if (!inBio.value) inBio.value = currentUserData.bio || "";
            if (!inTags.value && currentUserData.tags && Array.isArray(currentUserData.tags)) {
                inTags.value = currentUserData.tags.join(", ");
            }
        }
    } else {
        formArea.classList.remove("active");
        toggleBtn.textContent = "＋ プロフィールカードを作成";
        toggleBtn.style.background = "#3b82f6";
    }
});

// 2. 「追加」ボタン → Firestoreへ保存
addBtn.addEventListener("click", async () => {
    if (!auth.currentUser) return;

    addBtn.disabled = true;
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

    // 保存するデータ
    const portfolioData = {
        nickname: name,
        grade: grade,
        bio: bio,
        tags: tags,
        iconUrl: icon,
        updatedAt: serverTimestamp() // 保存日時
    };

    try {
        // Firestoreの 'portfolios' コレクションに、自分のUIDをキーにして保存
        // (setDocなので、既に存在すれば上書きされます)
        await setDoc(doc(db, "portfolios", auth.currentUser.uid), portfolioData);
        
        alert("プロフィールを公開しました！");
        
        // フォームを閉じて再読み込み
        toggleBtn.click();
        loadAllPortfolios(); // 画面を更新

    } catch (e) {
        console.error(e);
        alert("保存に失敗しました: " + e.message);
    } finally {
        addBtn.disabled = false;
        addBtn.textContent = "この内容でカードを表示";
    }
});

// カード描画関数
function renderSenpaiCard(user) {
    // 既存の自分のカードがあれば削除（再描画のため）
    const existingCard = document.getElementById(`card-${user.uid}`);
    if (existingCard) existingCard.remove();

    const icon = user.iconUrl || "https://placehold.co/50";
    const name = user.nickname;
    const bioSnippet = user.bio.length > 60 ? user.bio.substring(0, 60) + "..." : user.bio;
    const tagsHtml = (user.tags || []).map(t => `<span class="tag">#${t}</span>`).join("");

    const html = `
      <article id="card-${user.uid}" class="post-card" style="cursor: default; animation: fadeIn 0.5s ease;">
        <div style="display:flex; align-items:center; margin-bottom:15px; border-bottom:1px solid #f1f5f9; padding-bottom:10px;">
             <img src="${icon}" style="width:45px; height:45px; border-radius:50%; margin-right:12px; object-fit:cover; border:1px solid #eee;">
             <div>
                 <h3 style="margin:0; font-size:1.1rem; color:#1e3a8a;">${name}</h3>
                 <span style="font-size:0.85rem; color:#64748b;">${user.grade}</span>
             </div>
        </div>
        
        <div class="tags" style="margin-bottom:12px;">${tagsHtml}</div>
        
        <p style="font-size:0.95rem; color:#334155; line-height:1.6; flex-grow:1;">${bioSnippet}</p>
      </article>
    `;
    
    // 新しい順にしたい場合は prepend (afterbegin), 古い順なら append (beforeend)
    // ここでは単純に上に追加します
    listContainer.insertAdjacentHTML("afterbegin", html);
}
