import { db, auth } from "./firebase.js";
import { 
    collection, addDoc, onSnapshot, query, orderBy, 
    deleteDoc, doc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const senpaiList = document.getElementById("senpaiList");
const profileFormArea = document.getElementById("profileFormArea");
const toggleFormBtn = document.getElementById("toggleFormBtn");
const addCardBtn = document.getElementById("addCardBtn");
const formTitle = document.getElementById("formTitle");
const editCardId = document.getElementById("editCardId");

// 入力フィールド
const inputName = document.getElementById("inputName");
const inputGrade = document.getElementById("inputGrade");
const inputBio = document.getElementById("inputBio");
const inputTags = document.getElementById("inputTags");

let currentUser = null;

// 認証状態の監視
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    renderCards();
});

// フォームの表示/非表示（新規作成モードにリセット）
toggleFormBtn.addEventListener("click", () => {
    profileFormArea.classList.toggle("active");
    if (profileFormArea.classList.contains("active")) {
        // 新規作成用にリセット
        editCardId.value = "";
        inputName.value = "";
        inputGrade.value = "";
        inputBio.value = "";
        inputTags.value = "";
        formTitle.innerText = "プロフィールカードを作成";
        addCardBtn.innerText = "この内容でカードを表示";
    }
});

// カードの保存・更新
addCardBtn.addEventListener("click", async () => {
    if (!currentUser) return alert("ログインが必要です");

    const data = {
        name: inputName.value,
        grade: inputGrade.value,
        bio: inputBio.value,
        tags: inputTags.value.split(",").map(t => t.trim()).filter(t => t),
        uid: currentUser.uid,
        updatedAt: new Date()
    };

    try {
        if (editCardId.value) {
            // 更新処理
            await updateDoc(doc(db, "senpai_cards", editCardId.value), data);
        } else {
            // 新規作成
            data.createdAt = new Date();
            await addDoc(collection(db, "senpai_cards"), data);
        }
        profileFormArea.classList.remove("active");
    } catch (e) {
        console.error("Error saving document: ", e);
    }
});

// カード一覧の取得と表示
function renderCards() {
    const q = query(collection(db, "senpai_cards"), orderBy("updatedAt", "desc"));
    
    onSnapshot(q, (snapshot) => {
        senpaiList.innerHTML = "";
        if (snapshot.empty) {
            senpaiList.innerHTML = `<p id="emptyMsg" style="...">ボタンを押して追加してください</p>`;
            return;
        }

        snapshot.forEach((d) => {
            const card = d.data();
            const isOwner = currentUser && currentUser.uid === card.uid;
            
            const cardEl = document.createElement("div");
            cardEl.className = "senpai-card fade-up"; // 既存のCSSクラス
            
            // カードHTMLの組み立て
            let html = `
                <div class="card-header">
                    <img src="https://api.dicebear.com/7.x/bottts/svg?seed=${card.name}" class="avatar">
                    <div>
                        <div class="name">${card.name}</div>
                        <div class="grade">${card.grade}</div>
                    </div>
                </div>
                <div class="tags">
                    ${card.tags.map(t => `<span class="tag">#${t}</span>`).join("")}
                </div>
                <div class="bio">${card.bio}</div>
            `;

            // 自分のカードならアクションボタンを追加
            if (isOwner) {
                html += `
                    <div class="card-actions">
                        <button class="edit-btn" data-id="${d.id}">編集</button>
                        <button class="delete-btn" data-id="${d.id}">削除</button>
                    </div>
                `;
            }

            cardEl.innerHTML = html;
            senpaiList.appendChild(cardEl);

            // ボタンへのイベント登録
            if (isOwner) {
                cardEl.querySelector(".edit-btn").addEventListener("click", () => startEdit(d.id, card));
                cardEl.querySelector(".delete-btn").addEventListener("click", () => deleteCard(d.id));
            }
        });
    });
}

// 編集モード開始
function startEdit(id, data) {
    editCardId.value = id;
    inputName.value = data.name;
    inputGrade.value = data.grade;
    inputBio.value = data.bio;
    inputTags.value = data.tags.join(", ");
    
    formTitle.innerText = "カードの内容を編集";
    addCardBtn.innerText = "更新する";
    profileFormArea.classList.add("active");
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 削除処理
async function deleteCard(id) {
    if (confirm("このプロフィールカードを削除してもよろしいですか？")) {
        await deleteDoc(doc(db, "senpai_cards", id));
    }
}
