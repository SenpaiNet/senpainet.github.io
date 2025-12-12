import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const id = new URL(location.href).searchParams.get("id");

async function loadDetail() {
  const snap = await getDoc(doc(db, "posts", id));

  if (!snap.exists()) {
    document.getElementById("detailTitle").textContent = "投稿が見つかりません";
    return;
  }

  const p = snap.data();

  document.getElementById("detailTitle").textContent = p.title;
  document.getElementById("detailContent").textContent = p.content;
}

loadDetail();
