// Firebase SDKのインポート（CDNを利用する場合）
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// TODO: あなたのFirebaseプロジェクトの「プロジェクト設定」からコピーしたconfigに置き換えてください
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// 初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// フォーム送信イベントの処理
const contactForm = document.getElementById('contact-form');
const statusMsg = document.getElementById('form-status');

contactForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // ページのリロードを防ぐ

    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.innerText = "送信中...";

    // データの取得
    const email = document.getElementById('email').value;
    const category = document.getElementById('category').value;
    const message = document.getElementById('message').value;

    try {
        // Firestoreの「inquiries」コレクションに保存
        await addDoc(collection(db, "inquiries"), {
            email: email,
            category: category,
            message: message,
            timestamp: serverTimestamp()
        });

        statusMsg.innerText = "お問い合わせを送信しました。ありがとうございます！";
        statusMsg.style.color = "green";
        contactForm.reset(); // フォームを空にする
    } catch (error) {
        console.error("Error adding document: ", error);
        statusMsg.innerText = "エラーが発生しました。もう一度お試しください。";
        statusMsg.style.color = "red";
    } finally {
        btn.disabled = false;
        btn.innerText = "送信する";
    }
});
