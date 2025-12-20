import { db } from "./firebase.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const listContainer = document.getElementById("senpaiList");
const keywordInput = document.getElementById("keywordInput");
const addBtn = document.getElementById("addProfileBtn");
const clearBtn = document.getElementById("clearListBtn");
const emptyMsg = document.getElementById("emptyMsg");

// 既に表示しているユーザーIDを記録（重複表示防止用）
let displayedUserIds = new Set();

addBtn.addEventListener("click", async () => {
    const keyword = keywordInput.value.trim().toLowerCase();
    
    if (!keyword) {
        alert("キーワードを入力してください");
        return;
    }

    addBtn.disabled = true;
    addBtn.textContent = "検索中...";

    try {
        // 卒業生を全件取得してJS側でフィルタリング
        // (※Firestoreの仕様上、部分一致検索には全文検索サービスが必要なため、
        //  小規模なら全件取得→JSフィルタが一番手軽で確実です)
        const q = query(collection(db, "users"), where("userType", "==", "卒業生"));
        const snapshot = await getDocs(q);
        
        const matches = [];
        snapshot.forEach(doc => {
            const u = doc.data();
            // すでに表示されている人は除外
            if (displayedUserIds.has(doc.id)) return;

            // 名前、Bio、タグのいずれかにキーワードが含まれるか
            const textData = [u.nickname, u.bio, ...(u.tags || [])].join(" ").toLowerCase();
            
            if (textData.includes(keyword)) {
                matches.push({ id: doc.id, ...u });
            }
        });

        if (matches.length === 0) {
            alert("該当する先輩が見つかりませんでした（または既に表示されています）");
        } else {
            // 見つかった人を画面に追加
            if(emptyMsg) emptyMsg.style.display = "none";
            clearBtn.style.display = "block";
            
            matches.forEach(user => {
                displayedUserIds.add(user.id);
                renderCard(user);
            });
            
            keywordInput.value = ""; // 入力欄をクリア
        }

    } catch (e) {
        console.error(e);
        alert("エラーが発生しました");
    } finally {
        addBtn.disabled = false;
        addBtn.textContent = "＋ プロフィールを追加";
    }
});

// 表示リセット機能
clearBtn.addEventListener("click", () => {
    listContainer.innerHTML = "";
    if(emptyMsg) {
        emptyMsg.style.display = "block";
        listContainer.appendChild(emptyMsg);
    }
    displayedUserIds.clear();
    clearBtn.style.display = "none";
});

function renderCard(user) {
    const icon = user.iconUrl || "https://placehold.co/50";
    const name = user.nickname || "名無し先輩";
    const bio = user.bio ? (user.bio.length > 50 ? user.bio.substring(0,50)+"..." : user.bio) : "自己紹介なし";
    const tagsHtml = (user.tags || []).map(t => `<span class="tag">#${t}</span>`).join("");

    const html = `
      <article class="post-card" style="cursor: default;">
        <div style="display:flex; align-items:center; margin-bottom:15px; border-bottom:1px solid #f1f5f9; padding-bottom:10px;">
             <img src="${icon}" style="width:40px; height:40px; border-radius:50%; margin-right:10px; object-fit:cover; border:1px solid #eee;">
             <div>
                 <h3 style="margin:0; font-size:1rem; color:#1e3a8a;">${name}</h3>
                 <span style="font-size:0.8rem; color:#999;">${user.grade || ""}</span>
             </div>
        </div>
        
        <p style="font-size:0.9rem; color:#444; min-height:40px;">${bio}</p>
        
        <div class="tags" style="margin-top:auto;">${tagsHtml}</div>
      </article>
    `;
    listContainer.insertAdjacentHTML("afterbegin", html); // 新しい人を上に表示
}
