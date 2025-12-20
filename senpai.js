import { db, auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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
let currentUserData = null; // 自分のデータを保持

// 0. ログインユーザーの情報を取得しておく
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const docSnap = await getDoc(doc(db, "users", user.uid));
            if (docSnap.exists()) {
                currentUserData = docSnap.data();
            }
        } catch (e) {
            console.error("ユーザーデータ取得エラー:", e);
        }
    }
});

// 1. フォームの開閉 (開くときにデータを自動入力)
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

// 2. カードを追加して表示
addBtn.addEventListener("click", () => {
    // ログインチェック
    if (!auth.currentUser) return;

    // 入力値を取得
    const name = inName.value.trim() || "名無し先輩";
    const grade = inGrade.value.trim() || "卒業生";
    const bio = inBio.value.trim() || "自己紹介なし";
    const tagsStr = inTags.value.trim();
    
    // タグを配列化
    let tags = [];
    if (tagsStr) {
        tags = tagsStr.split(/,|、/).map(t => t.trim()).filter(t => t);
    }

    const icon = currentUserData ? (currentUserData.iconUrl || auth.currentUser.photoURL) : "https://placehold.co/50";

    const user = {
        uid: auth.currentUser.uid, // ★IDを追加（これで同一人物か判定します）
        nickname: name,
        grade: grade,
        bio: bio,
        tags: tags,
        iconUrl: icon
    };

    renderSenpaiCard(user);

    // フォームを閉じる
    toggleBtn.click(); 
    
    if(emptyMsg) emptyMsg.style.display = "none";
});

// カード描画関数
function renderSenpaiCard(user) {
    // ★【修正ポイント】既に同じユーザーのカードがあれば削除する（置き換え）
    const existingCard = document.getElementById(`card-${user.uid}`);
    if (existingCard) {
        existingCard.remove();
    }

    const icon = user.iconUrl || "https://placehold.co/50";
    const name = user.nickname;
    const bioSnippet = user.bio.length > 60 ? user.bio.substring(0, 60) + "..." : user.bio;
    
    const tagsHtml = user.tags.map(t => `<span class="tag">#${t}</span>`).join("");

    // ★ articleタグに id="card-ユーザーID" を付与
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
    
    // リストの先頭に追加
    listContainer.insertAdjacentHTML("afterbegin", html);
}
