// post_script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Firebase設定
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
// 1. タグ選択機能（クリックで色が変わるようにする）
// ---------------------------------------------------
const tagOptions = document.querySelectorAll('.tag-option');
let selectedTags = [];

tagOptions.forEach(tag => {
    tag.addEventListener('click', () => {
        const tagName = tag.getAttribute('data-tag');
        
        // クラスの切り替え（CSSで .selected { background: ... } を作ると色がつく）
        tag.classList.toggle('selected');
        
        // 配列への追加・削除
        if (selectedTags.includes(tagName)) {
            selectedTags = selectedTags.filter(t => t !== tagName);
            tag.style.background = ""; // 選択解除時の色（CSSがあれば不要）
            tag.style.color = "";
        } else {
            selectedTags.push(tagName);
            tag.style.background = "#4ecdc4"; // 選択時の色（仮）
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
    e.preventDefault(); // ★ここで画面リロードを阻止！

    const user = auth.currentUser;
    if (!user) {
      alert("投稿するにはログインが必要です 🙇‍♂️");
      return;
    }

    // HTMLのIDに合わせて取得
    const titleVal = document.getElementById('title').value;
    const contentVal = document.getElementById('content').value;

    if (!titleVal || !contentVal) {
        alert("タイトルと内容を入力してください");
        return;
    }

    try {
      // Firebaseに保存
      await addDoc(collection(db, "posts"), {
        title: titleVal,
        content: contentVal,
        tags: selectedTags, // 選択したタグも保存
        authorName: user.displayName || "名無しユーザー",
        authorId: user.uid,
        createdAt: serverTimestamp()
      });
      
      alert("投稿しました！🎉");
      window.location.href = "archive.html"; // 一覧ページへ移動
    } catch (error) {
      console.error("投稿エラー:", error);
      alert("エラーが発生しました: " + error.message);
    }
  });
}
