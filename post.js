import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
// EmailJSを初期化
emailjs.init("2O4UoTxHcvDAfpIoV");

// 1. ログイン監視 & ロード画面制御
onAuthStateChanged(auth, (user) => {
  const loader = document.getElementById("global-loader");
  
  if (user) {
    if (loader) {
      loader.style.opacity = "0";
      setTimeout(() => { loader.style.display = "none"; }, 500);
    }
  } else {
    // 未ログイン時はアラートを出さずにログイン画面へ飛ばす方がスムーズですが、
    // ここは「なぜ飛ばされたか」わかるように残すか、削除してもOKです。
    // 今回は「成功ポップアップ」の削除依頼なので、エラー系は残しておきます。
    alert("相談を投稿するにはログインが必要です。");
    window.location.href = "login.html";
  }
});

// 2. 投稿処理
const postForm = document.getElementById("postForm");
if (postForm) {
  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const title = document.getElementById("title").value;
    const content = document.getElementById("content").value;
    const tags = [...document.querySelectorAll(".tag-option.selected")].map(el => el.dataset.tag);

    try {
      await addDoc(collection(db, "posts"), {
        title, content, tags,
        authorId: user.uid,
        authorName: user.displayName,
        authorIcon: user.photoURL,
        createdAt: serverTimestamp(),
        replies: 0
      });
      // ▼▼▼ ここから追加（メール通知機能） ▼▼▼

      // 1. タグが一致する先輩を探す
      const q = query(
          collection(db, "users"),
          where("role", "==", "graduate"),
          where("tags", "array-contains-any", tags) // あなたの変数名「tags」
      );

      const querySnapshot = await getDocs(q);

      // 2. メールを送る
      querySnapshot.forEach((doc) => {
          const senpai = doc.data();
          
          // 自分以外に送信
          if (senpai.email && senpai.email !== user.email) {
              emailjs.send(
                  "service_9c8mqrk",   // Service ID
                  "template_tcokpqj",  // Template ID
                  {
                      to_name: senpai.name || "先輩",
                      to_email: senpai.email,
                      title: title,
                      tags: tags.join(", "),
                      link: window.location.origin + "/archive.html"
                  }
              );
              console.log("通知送信:", senpai.email);
          }
      });

      // ▲▲▲ ここまで追加 ▲▲▲
      // アラート削除: 即移動
      window.location.href = "archive.html";
    } catch (err) {
      console.error(err);
      alert("投稿失敗: " + err.message);
    }
  });
}

// 3. タグ選択
document.querySelectorAll("#tagSelect .tag-option").forEach(tag => {
  tag.addEventListener("click", () => tag.classList.toggle("selected"));
});
