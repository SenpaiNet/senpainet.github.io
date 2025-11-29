import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const params = new URL(location.href).searchParams;
const id = params.get("id");

async function loadDetail() {
  const snap = await getDoc(doc(db, "posts", id));

  if (!snap.exists()) {
    document.body.innerHTML = "<h2>投稿が見つかりません。</h2>";
    return;
  }

  const post = snap.data();
  document.getElementById("detailTitle").textContent = post.title;
  document.getElementById("detailContent").textContent = post.content;
}

loadDetail();
