import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
// setPersistence も追加して念押しで保存設定をする
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

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

// ★ローディング要素を取得
const loader = document.getElementById('global-loader');

// 0. ログイン永続化の設定（念の為）
setPersistence(auth, browserLocalPersistence).catch(console.error);

// ---------------------------------------------------
// 1. ログイン状態の監視（ここが心臓部）
// ---------------------------------------------------
let currentUser = null;

onAuthStateChanged(auth, (user) => {
  // ここに来た時点で「確認完了」
  
  if (user) {
    // 【ログイン成功】
    currentUser = user;
    console.log("ログイン確認OK:", user.displayName);
    
    // ローディング画面を消す
    if(loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);
    }
    
  } else {
    // 【未ログイン】
    console.log("未ログインです");
    
    // post.html はログイン必須なので、ここで初めて追い出す
    alert("ログインが必要です。ログインページへ移動します。");
    window.location.href = "login.html"; // ←ログインページがある場合
    // もしなければ index.html へ
  }
});

// ---------------------------------------------------
// 2. タグ選択機能（変更なし）
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
// 3. 投稿ボタンの処理
// ---------------------------------------------------
const postForm = document.getElementById('postForm');

if (postForm) {
  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUser) {
      alert("ログイン状態を確認できませんでした。ページを更新してください。");
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
        authorName: currentUser.displayName || "名無しユーザー",
        authorId: currentUser.uid,
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
