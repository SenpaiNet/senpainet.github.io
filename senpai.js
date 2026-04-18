import { db, auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, serverTimestamp, query } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const listContainer = document.getElementById("senpaiList");
const toggleBtn = document.getElementById("toggleFormBtn");
const notSenpaiMsg = document.getElementById("notSenpaiMsg");
const formArea = document.getElementById("profileFormArea");
const addBtn = document.getElementById("addCardBtn");
const emptyMsg = document.getElementById("emptyMsg");
const presetTagsArea = document.getElementById("presetTagsArea");

// 入力欄
const inName = document.getElementById("inputName");
const inGrade = document.getElementById("inputGrade");
const inBio = document.getElementById("inputBio");
const inTags = document.getElementById("inputTags");

// 推奨タグのリスト
const PRESET_TAGS = ["理系", "文系", "留学", "体育会系", "サークル", "インターン", "起業", "公務員", "教職", "資格勉強", "一人暮らし"];

let isFormOpen = false;
let currentUserData = null; 
let myPortfolioData = null; 
let allPortfolios = [];     

// 0. 初期ロード
async function loadAllPortfolios() {
    try {
        const q = query(collection(db, "portfolios")); 
        const snapshot = await getDocs(q);
        
        allPortfolios = []; 
        myPortfolioData = null; 

        snapshot.forEach(docSnap => {
            allPortfolios.push({ uid: docSnap.id, ...docSnap.data() });
        });

        renderAllCards();
    } catch (e) {
        console.error("読み込みエラー:", e);
        listContainer.innerHTML = "<p style='text-align:center'>データの読み込みに失敗しました。</p>";
    }
}

function renderAllCards() {
    listContainer.innerHTML = "";
    if (allPortfolios.length === 0) {
        if (emptyMsg) {
            emptyMsg.textContent = "まだプロフィールカードがありません。";
            emptyMsg.style.display = "block";
            listContainer.appendChild(emptyMsg);
        }
        return;
    }
    if (emptyMsg) emptyMsg.style.display = "none";

    allPortfolios.sort((a, b) => {
        const timeA = a.updatedAt ? a.updatedAt.toMillis() : 0;
        const timeB = b.updatedAt ? b.updatedAt.toMillis() : 0;
        return timeB - timeA;
    });

    allPortfolios.forEach(user => renderSenpaiCard(user));
}

// ★ タグ選択機能の実装 ★
function initTagSelector() {
    presetTagsArea.innerHTML = "";
    PRESET_TAGS.forEach(tag => {
        const span = document.createElement("span");
        span.className = "selectable-tag";
        span.textContent = `#${tag}`;
        span.onclick = () => toggleTagSelection(tag, span);
        presetTagsArea.appendChild(span);
    });
}

function toggleTagSelection(tag, element) {
    let currentTags = inTags.value.split(/,|、/).map(t => t.trim()).filter(t => t);
    const index = currentTags.indexOf(tag);

    if (index > -1) {
        // すでに含まれていれば削除
        currentTags.splice(index, 1);
        element.classList.remove("selected");
    } else {
        // なければ追加
        currentTags.push(tag);
        element.classList.add("selected");
    }
    inTags.value = currentTags.join(", ");
}

// 入力欄の変更を検知して選択状態を同期（手入力時用）
inTags.oninput = () => {
    const currentTags = inTags.value.split(/,|、/).map(t => t.trim());
    const spans = presetTagsArea.querySelectorAll(".selectable-tag");
    spans.forEach(span => {
        const tag = span.textContent.replace("#", "");
        if (currentTags.includes(tag)) {
            span.classList.add("selected");
        } else {
            span.classList.remove("selected");
        }
    });
};

// 1. ログインユーザー情報の取得 & 権限チェック
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const docSnap = await getDoc(doc(db, "users", user.uid));
            if (docSnap.exists()) {
                currentUserData = docSnap.data();
                
                // ★ 先輩のみボタンを表示するロジック ★
                if (currentUserData.role === "senpai") {
                    toggleBtn.style.display = "flex";
                    notSenpaiMsg.style.display = "none";
                } else {
                    toggleBtn.style.display = "none";
                    notSenpaiMsg.style.display = "block";
                }
            }
        } catch (e) {
            console.error("権限取得エラー:", e);
        }
    } else {
        currentUserData = null;
        toggleBtn.style.display = "none";
        notSenpaiMsg.style.display = "none";
    }
    renderAllCards();
});

// フォームの開閉
toggleBtn.addEventListener("click", () => {
    if (!auth.currentUser) return;
    isFormOpen = !isFormOpen;
    
    if (isFormOpen) {
        formArea.classList.add("active");
        toggleBtn.textContent = "▲ 閉じる";
        toggleBtn.style.background = "#64748b";
        initTagSelector(); // タグセレクターを初期化

        if (myPortfolioData) {
            inName.value = myPortfolioData.nickname || "";
            inGrade.value = myPortfolioData.grade || "";
            inBio.value = myPortfolioData.bio || "";
            inTags.value = myPortfolioData.tags ? myPortfolioData.tags.join(", ") : "";
            inTags.oninput(); // 選択状態を反映
            addBtn.textContent = "この内容でカードを更新";
        } else {
            inName.value = "";
            inGrade.value = "";
            inBio.value = "";
            inTags.value = "";
            addBtn.textContent = "この内容でカードを表示";
        }
    } else {
        formArea.classList.remove("active");
        toggleBtn.textContent = myPortfolioData ? "＋ プロフィールを編集" : "＋ プロフィールカードを作成";
        toggleBtn.style.background = "#3b82f6";
    }
});

// 2. 保存処理
addBtn.addEventListener("click", async () => {
    if (!auth.currentUser) return;
    addBtn.disabled = true;
    addBtn.textContent = "保存中...";

    const tags = inTags.value.split(/,|、/).map(t => t.trim()).filter(t => t);
    const portfolioData = {
        nickname: inName.value.trim() || "名無し先輩",
        grade: inGrade.value.trim() || "卒業生",
        bio: inBio.value.trim() || "自己紹介なし",
        tags: tags,
        iconUrl: myPortfolioData?.iconUrl || currentUserData?.iconUrl || auth.currentUser.photoURL || "https://placehold.co/50",
        updatedAt: serverTimestamp()
    };

    try {
        await setDoc(doc(db, "portfolios", auth.currentUser.uid), portfolioData);
        alert("プロフィールを保存しました！");
        if(isFormOpen) toggleBtn.click();
        await loadAllPortfolios();
    } catch (e) {
        alert("エラー: " + e.message);
    } finally {
        addBtn.disabled = false;
        addBtn.textContent = "この内容でカードを表示";
    }
});

// カード描画関数
function renderSenpaiCard(user) {
    const isMyCard = auth.currentUser && auth.currentUser.uid === user.uid;
    if (isMyCard) {
        myPortfolioData = user;
        if (!isFormOpen && toggleBtn.style.display !== "none") {
            toggleBtn.textContent = "＋ プロフィールを編集";
        }
    }

    const article = document.createElement("article");
    article.className = "post-card";
    article.style.cssText = "cursor: default; animation: fadeIn 0.5s ease; position: relative; display: flex; flex-direction: column;";

    let innerHTML = `
      <div style="display:flex; align-items:center; margin-bottom:15px; border-bottom:1px solid #f1f5f9; padding-bottom:10px;">
           <img src="${user.iconUrl || 'https://placehold.co/50'}" style="width:45px; height:45px; border-radius:50%; margin-right:12px; object-fit:cover; border:1px solid #eee;">
           <div>
               <h3 style="margin:0; font-size:1.1rem; color:#1e3a8a;">${user.nickname}</h3>
               <span style="font-size:0.85rem; color:#64748b;">${user.grade}</span>
           </div>
      </div>
      <div class="tags" style="margin-bottom:12px;">${(user.tags || []).map(t => `<span class="tag">#${t}</span>`).join("")}</div>
      <p style="font-size:0.95rem; color:#334155; line-height:1.6; flex-grow:1; white-space: pre-wrap; margin-bottom:15px;">${user.bio}</p>
    `;

    if (isMyCard) {
        innerHTML += `
            <div style="margin-top: auto; padding-top: 15px; border-top: 1px dashed #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
                <button class="edit-btn" style="background: #f8fafc; color: #3b82f6; border: 1px solid #cbd5e1; padding: 6px 16px; border-radius: 6px; font-size: 0.85rem; cursor: pointer; font-weight: bold;">✏️ 編集</button>
                <button class="delete-btn" style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; padding: 6px 16px; border-radius: 6px; font-size: 0.85rem; cursor: pointer; font-weight: bold;">🗑 削除</button>
            </div>
        `;
    }

    article.innerHTML = innerHTML;
    listContainer.appendChild(article);

    if (isMyCard) {
        article.querySelector('.edit-btn').onclick = () => { if(!isFormOpen) toggleBtn.click(); window.scrollTo({top:0, behavior:'smooth'}); };
        article.querySelector('.delete-btn').onclick = async () => {
            if (confirm("プロフィールを削除しますか？")) {
                await deleteDoc(doc(db, "portfolios", auth.currentUser.uid));
                location.reload();
            }
        };
    }
}

loadAllPortfolios();
