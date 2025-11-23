import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
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

// ---------------------------------------------------
// 1. 画面の制御（ローディングとフォーム）
// ---------------------------------------------------
const loader = document.getElementById('global-loader');
const postWrapper = document.querySelector('.post-wrapper'); // 投稿フォーム全体

// 念の為の保存設定
setPersistence(auth, browserLocalPersistence).catch(console.error);

let currentUser = null;

// ★★★ ここが修正ポイント ★★★
// 「勝手に飛ばさない」。ダメなら「ダメです」と表示するだけにする。
onAuthStateChanged(auth, (user) => {
  // まずローディングを消す
  if(loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.style.display = 'none', 500);
  }

  if (user) {
    // 【ログインOK】
    currentUser = user;
    console.log("ログイン確認OK:", user.displayName);
    // フォームを表示する
    if(postWrapper) postWrapper.style.display = 'block';
    
  } else {
    // 【未ログイン】
    console.log("未ログインです");
    
    // 1. フォームを隠す（投稿させない）
    if(postWrapper) postWrapper.style.display = 'none';

    // 2. 「ログインしてください」というメッセージを画面に出す
    // alert() や location.href で飛ばすとループするので、画面にボタンを出すのが正解
    const loginMsg = document.createElement('div');
    loginMsg.innerHTML = `
      <div style="
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          text-align: center; width: 90%; max-width: 400px;
      ">
        <h2 style="color:#333; margin-bottom:1rem;">🔒 ログインが必要です</h2>
        <p style="color:#666; margin-bottom:2rem;">相談を投稿するにはログインしてください。</p>
        <a href="login.html" style="
            background: #ff6b6b; color: white; padding: 12px 30px; 
            border-radius: 25px; text-decoration: none; font-weight: bold;
            box-shadow: 0 4px 10px rgba(255, 107, 107, 0.3);
        ">ログインページへ</a>
        <br><br>
        <a href="archive.html" style="color:#888; font-size:0.9rem;">相談一覧に戻る</a>
      </div>
    `;
    document.body.appendChild(loginMsg);
  }
});

// ---------------------------------------------------
// 2. タグ選択機能
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

    // 念の為のチェック
    if (!currentUser) {
      alert("ログイン状態が確認できませんでした。");
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
