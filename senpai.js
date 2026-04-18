import { db, auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, serverTimestamp, query } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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
let currentUserData = null; // usersコレクションからのデータ
let myPortfolioData = null; // 自分が作成済みのカードデータ
let allPortfolios = [];     // 取得した全カードデータ

// 0. 初期ロード（全員分のポートフォリオを取得）
async function loadAllPortfolios() {
    try {
        const q = query(collection(db, "portfolios")); 
        const snapshot = await getDocs(q);
        
        allPortfolios = []; // 初期化
        myPortfolioData = null; // 初期化

        snapshot.forEach(docSnap => {
            allPortfolios.push({ uid: docSnap.id, ...docSnap.data() });
        });

        renderAllCards();
    } catch (e) {
        console.error("読み込みエラー:", e);
        listContainer.innerHTML = "<p style='text-align:center'>データの読み込みに失敗しました。</p>";
    }
}

// 取得したデータを画面に描画する処理（ログイン状態に応じたボタン出し分けのため分離）
function renderAllCards() {
    listContainer.innerHTML = ""; // 一旦クリア

    if (allPortfolios.length === 0) {
        if (emptyMsg) {
            emptyMsg.textContent = "まだプロフィールカードがありません。";
            emptyMsg.style.display = "block";
            listContainer.appendChild(emptyMsg);
        }
        return;
    }

    if (emptyMsg) emptyMsg.style.display = "none";

    // 更新日時(updatedAt)順にローカルでソート（Firestoreインデックスエラー回避）
    allPortfolios.sort((a, b) => {
        const timeA = a.updatedAt ? a.updatedAt.toMillis() : 0;
        const timeB = b.updatedAt ? b.updatedAt.toMillis() : 0;
        return timeB - timeA; // 新しい順
    });

    allPortfolios.forEach(user => {
        renderSenpaiCard(user);
    });
}


// 1. ログインユーザー情報の取得 & 画面再描画
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const docSnap = await getDoc(doc(db, "users", user.uid));
            if (docSnap.exists()) {
                currentUserData = docSnap.data();
            }
        } catch (e) {
            console.error("ユーザー情報の取得エラー:", e);
        }
    } else {
        currentUserData = null;
    }
    // ログイン状態が確定したら、自分のカードに編集・削除ボタンを付けるために再描画
    renderAllCards();
});

// フォームの開閉と表示切り替え
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

        // ★ 新規作成か編集かで入力欄の初期値を切り替え ★
        if (myPortfolioData) {
            // 既にカードがある場合（編集）
            inName.value = myPortfolioData.nickname || "";
            inGrade.value = myPortfolioData.grade || "";
            inBio.value = myPortfolioData.bio || "";
            inTags.value = myPortfolioData.tags ? myPortfolioData.tags.join(", ") : "";
            addBtn.textContent = "この内容でカードを更新";
        } else {
            // 新規作成の場合（空欄）
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

// 2. 「追加/更新」ボタン → Firestoreへ保存
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

    // アイコンのフォールバック処理
    let icon = "https://placehold.co/50";
    if (myPortfolioData && myPortfolioData.iconUrl) {
        icon = myPortfolioData.iconUrl;
    } else if (currentUserData && currentUserData.iconUrl) {
        icon = currentUserData.iconUrl;
    } else if (auth.currentUser.photoURL) {
        icon = auth.currentUser.photoURL;
    }

    const portfolioData = {
        nickname: name,
        grade: grade,
        bio: bio,
        tags: tags,
        iconUrl: icon,
        updatedAt: serverTimestamp() // 保存日時
    };

    try {
        await setDoc(doc(db, "portfolios", auth.currentUser.uid), portfolioData);
        alert(myPortfolioData ? "プロフィールを更新しました！" : "プロフィールを公開しました！");
        
        // フォームを閉じて再読み込み
        if(isFormOpen) toggleBtn.click();
        await loadAllPortfolios(); // 最新データを取得して画面更新

    } catch (e) {
        console.error(e);
        alert("保存に失敗しました: " + e.message);
    } finally {
        addBtn.disabled = false;
        addBtn.textContent = myPortfolioData ? "この内容でカードを更新" : "この内容でカードを表示";
    }
});

// カード描画＆機能付与関数
function renderSenpaiCard(user) {
    const isMyCard = auth.currentUser && auth.currentUser.uid === user.uid;
    
    // 自分のカードを見つけたら変数に保持し、ヘッダーのボタンテキストを変える
    if (isMyCard) {
        myPortfolioData = user;
        if (!isFormOpen) {
            toggleBtn.textContent = "＋ プロフィールを編集";
        }
    }

    const icon = user.iconUrl || "https://placehold.co/50";
    const name = user.nickname || "名無し先輩";
    // 制限文字数を撤廃し、全文を改行込みで表示できるようにする
    const bioText = user.bio || ""; 
    const tagsHtml = (user.tags || []).map(t => `<span class="tag">#${t}</span>`).join("");

    // HTMLの文字列ではなく、DOM要素として作成（イベントリスナーを安全に付けるため）
    const article = document.createElement("article");
    article.id = `card-${user.uid}`;
    article.className = "post-card";
    // 既存のデザインを崩さないインラインスタイル
    article.style.cssText = "cursor: default; animation: fadeIn 0.5s ease; position: relative; display: flex; flex-direction: column;";

    let innerHTML = `
      <div style="display:flex; align-items:center; margin-bottom:15px; border-bottom:1px solid #f1f5f9; padding-bottom:10px;">
           <img src="${icon}" style="width:45px; height:45px; border-radius:50%; margin-right:12px; object-fit:cover; border:1px solid #eee;">
           <div>
               <h3 style="margin:0; font-size:1.1rem; color:#1e3a8a;">${name}</h3>
               <span style="font-size:0.85rem; color:#64748b;">${user.grade}</span>
           </div>
      </div>
      
      <div class="tags" style="margin-bottom:12px;">${tagsHtml}</div>
      
      <p style="font-size:0.95rem; color:#334155; line-height:1.6; flex-grow:1; white-space: pre-wrap; margin-bottom:15px;">${bioText}</p>
    `;

    // ★ 自分のカードの場合のみ「編集」「削除」ボタンを追加 ★
    if (isMyCard) {
        innerHTML += `
            <div style="margin-top: auto; padding-top: 15px; border-top: 1px dashed #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
                <button class="edit-btn" style="background: #f8fafc; color: #3b82f6; border: 1px solid #cbd5e1; padding: 6px 16px; border-radius: 6px; font-size: 0.85rem; cursor: pointer; font-weight: bold; transition: 0.2s;">✏️ 編集</button>
                <button class="delete-btn" style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; padding: 6px 16px; border-radius: 6px; font-size: 0.85rem; cursor: pointer; font-weight: bold; transition: 0.2s;">🗑 削除</button>
            </div>
        `;
    }

    article.innerHTML = innerHTML;
    listContainer.appendChild(article);

    // ★ 自分のカードに追加したボタンに機能を付与 ★
    if (isMyCard) {
        const editBtn = article.querySelector('.edit-btn');
        const deleteBtn = article.querySelector('.delete-btn');

        // 編集ボタンの処理
        editBtn.addEventListener('click', () => {
            if (!isFormOpen) {
                toggleBtn.click(); // フォームを開く（自動的に入力欄にデータが入ります）
            }
            window.scrollTo({ top: 0, behavior: 'smooth' }); // 画面一番上へスクロール
        });

        // 削除ボタンの処理
        deleteBtn.addEventListener('click', async () => {
            const confirmed = confirm("本当にプロフィールカードを削除しますか？\n（この操作は取り消せません）");
            if (confirmed) {
                deleteBtn.disabled = true;
                deleteBtn.textContent = "削除中...";
                try {
                    await deleteDoc(doc(db, "portfolios", auth.currentUser.uid));
                    alert("プロフィールカードを削除しました。");
                    myPortfolioData = null; // 保持データをリセット
                    if (isFormOpen) toggleBtn.click(); // フォームが開いていれば閉じる
                    toggleBtn.textContent = "＋ プロフィールカードを作成"; // ボタン表記をリセット
                    await loadAllPortfolios(); // 画面をリロード
                } catch(e) {
                    console.error("削除エラー:", e);
                    alert("削除に失敗しました: " + e.message);
                    deleteBtn.disabled = false;
                    deleteBtn.textContent = "🗑 削除";
                }
            }
        });
    }
}

// ページ読み込み時に実行
loadAllPortfolios();
