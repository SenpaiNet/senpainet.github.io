// Firebase SDKのインポート（CDNを利用する場合）
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// TODO: あなたのFirebaseプロジェクトの「プロジェクト設定」からコピーしたconfigに置き換えてください
const firebaseConfig = {
  apiKey: "AIzaSyDuDU6ujKlBcxP05XOUwPsGqpxQVqeHgvs",
  authDomain: "senpainet-auth.firebaseapp.com",
  projectId: "senpainet-auth",
  storageBucket: "senpainet-auth.firebasestorage.app",
  messagingSenderId: "694282767766",
  appId: "1:694282767766:web:3e0dd18f697aafb60e61b7",
  measurementId: "G-977F3HXN1F"
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
