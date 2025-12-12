import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

document.getElementById("postForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value;
  const content = document.getElementById("content").value;

  const tags = [...document.querySelectorAll(".tag-option.selected")]
    .map(el => el.dataset.tag);

  try {
    await addDoc(collection(db, "posts"), {
      title,
      content,
      tags,
      createdAt: serverTimestamp(),
      replies: 0
    });

    alert("投稿が完了しました！");
    window.location.href = "archive.html";

  } catch (err) {
    console.error(err);
    alert("投稿に失敗しました");
  }
});

