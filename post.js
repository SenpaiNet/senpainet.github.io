import { db } from "./firebase.js";
import { collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

document.getElementById("postForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value;
  const content = document.getElementById("content").value;

  const tagElems = document.querySelectorAll(".tag-option.selected");
  const tags = [...tagElems].map(t => t.dataset.tag);

  try {
    await addDoc(collection(db, "posts"), {
      title,
      content,
      tags,
      createdAt: Timestamp.now(),
      replies: 0
    });

    alert("投稿が完了しました！");
    window.location.href = "archive.html";

  } catch (error) {
    console.error("Error:", error);
    alert("投稿に失敗しました…");
  }
});

