import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
// ★ onAuthStateChanged を確実にインポート
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCwPtYMU_xiM5YgcqfNsCFESkj-Y4ICD5E",
  authDomain: "senpainet-84a24.firebaseapp.com",
  projectId: "senpainet-84a24",
  storageBucket: "senpainet-84a24.firebasestorage.app",
  messagingSenderId: "1053589632945",
  appId: "1:1053589632945:web:413919be47760675e4ef90",
  measurementId: "G-1GPKNSMMFZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ---------------------------------------------------
// 0. ログイン状態を常に監視する（これが重要！）
// ---------------------------------------------------
let currentUser = null; // ここにユーザー情報を保存する

onAuthStateChanged(auth, (user) => {
  if (user) {
    // ログイン情報が復元されたらここに来る
    currentUser = user;
    console.log("ログイン確認済み:", user.displayName);
    // ユーザーに安心させるため、どこかに名前を出してもOK（今回はアラートなしにするだけ）
  } else {
    // 本当にログアウトしている場合
    currentUser = null;
    console.log("未ログイン状態です");
    // 必要ならログインページへ飛ばす処理をここに書いてもよい
    // window.location.href = "login.html"; 
  }
});

// ---------------------------------------------------
// 1. タグ選択機能
// ---------------------------------------------------
const tagOptions = document.querySelectorAll('.tag-option');
let selectedTags = [];

tagOptions.forEach(tag => {
    tag.addEventListener('click', () => {
        const tagName = tag.getAttribute('data-tag');
        tag.classList.toggle('selected');
        
        if (selectedTags.includes(tagName)) {
            selectedTags = selectedTags.filter(t => t !== tagName);
            tag.style.background = ""; 
            tag.style.color = "";
        } else {
            selectedTags.push(tagName);
            tag.style.background = "#4ecdc4"; 
            tag.style.color = "white";
        }
    });
});

// ---------------------------------------------------
// 2. 投稿ボタンの処理
// ---------------------------------------------------
const postForm = document.getElementById('postForm');

if (postForm) {
  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // ★修正ポイント：auth.currentUser を直接見ずに、監視済みの変数を見る
    // ただし念の為 auth.currentUser も確認（ロード完了後なら入っているはず）
    const user = currentUser || auth.currentUser;

    if (!user) {
      alert("ログイン情報の確認ができませんでした。\n少し待ってからもう一度押すか、ログインし直してください。");
      return;
    }

    const titleVal = document.getElementById('title').value;
    const contentVal = document.getElementById('content').value;

    if (!titleVal || !contentVal) {
        alert("タイトルと内容を入力してください");
        return;
    }

    try {
      await addDoc(collection(db, "posts"), {
        title: titleVal,
        content: contentVal,
        tags: selectedTags,
        authorName: user.displayName || "名無しユーザー",
        authorId: user.uid,
        createdAt: serverTimestamp()
      });
      
      alert("投稿しました！🎉");
      window.location.href = "archive.html"; 
    } catch (error) {
      console.error("投稿エラー:", error);
      alert("エラーが発生しました: " + error.message);
    }
  });
}
