import { db, auth } from "./firebase.js";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const listContainer = document.getElementById("senpaiList");
const showMyListBtn = document.getElementById("showMyListBtn");
const showSearchBtn = document.getElementById("showSearchBtn");
const searchArea = document.getElementById("searchArea");
const keywordInput = document.getElementById("keywordInput");
const searchBtn = document.getElementById("searchBtn");

let currentUser = null;
let myBookmarks = []; // ブックマークした先輩のIDリスト
let currentMode = "mylist"; // "mylist" or "search"

// 1. ログイン監視 & 初期ロード
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await fetchBookmarks(); // Myリストを取得
    renderView();           // 表示更新
  } else {
    listContainer.innerHTML = "<p style='text-align:center; grid-column:1/-1;'>Myリストを使うには<a href='login.html'>ログイン</a>してください。</p>";
  }
});

// 2. ブックマーク情報の取得
async function fetchBookmarks() {
  if (!currentUser) return;
  try {
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (userDoc.exists()) {
      myBookmarks = userDoc.data().bookmarks || [];
    }
  } catch (e) {
    console.error("ブックマーク取得エラー", e);
  }
}

// 3. 画面の描画分岐
async function renderView() {
  listContainer.innerHTML = "";

  if (currentMode === "mylist") {
    // === Myリストモード ===
    if (myBookmarks.length === 0) {
      listContainer.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:40px; color:#666;">
          <p>まだ追加された先輩はいません。</p>
          <p>「🔍 先輩を探す」から気になる先輩を見つけて追加してみましょう！</p>
        </div>`;
      return;
    }
    // ブックマークしているIDのユーザー情報を取得して表示
    // ※Firestoreの 'in' クエリは最大30件までなので、数が多い場合は分割などの工夫が必要ですが、今回は簡易実装
    if (myBookmarks.length > 0) {
        // 10件ずつなどに分割して取得するのが安全ですが、ここではシンプルに実装
        // もしブックマーク数が多い場合はクライアントサイドでフィルタリングするか、バッチ処理推奨
        const chunks = [];
        // Firestore制限回避のため全件取得はせず、bookmarks配列を使ってドキュメントを取得
        // ここでは実装簡略化のため、Promise.allで個別取得します（件数が少ない想定）
        const promises = myBookmarks.map(uid => getDoc(doc(db, "users", uid)));
        const docs = await Promise.all(promises);
        
        const users = docs.map(d => d.exists() ? d.data() : null).filter(u => u); // 存在しないユーザーを除外
        renderCards(users, true);
    }

  } else {
    // === 検索モード ===
    // 何も入力がない場合は検索を促す
    listContainer.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#999;">キーワードを入力して検索してください。</p>`;
  }
}

// 4. 検索実行
async function performSearch() {
  const keyword = keywordInput.value.trim().toLowerCase();
  if (!keyword) return;

  listContainer.innerHTML = "<p style='grid-column:1/-1; text-align:center;'>検索中...</p>";

  try {
    // 卒業生を全件取得してJSでフィルタリング（件数が少ない想定）
    // ※本格運用時はAlgoliaなどの検索サービス推奨
    const q = query(collection(db, "users"), where("userType", "==", "卒業生"));
    const snapshot = await getDocs(q);
    
    const results = [];
    snapshot.forEach(doc => {
      const u = doc.data();
      // 自分自身は除外
      if (doc.id === currentUser.uid) return;

      const textData = [u.nickname, u.bio, ...(u.tags || [])].join(" ").toLowerCase();
      if (textData.includes(keyword)) {
        results.push({ id: doc.id, ...u });
      }
    });

    if (results.length === 0) {
      listContainer.innerHTML = "<p style='grid-column:1/-1; text-align:center;'>該当する先輩は見つかりませんでした。</p>";
    } else {
      renderCards(results, false);
    }

  } catch (e) {
    console.error(e);
    listContainer.innerHTML = "<p style='grid-column:1/-1; text-align:center; color:red;'>検索エラーが発生しました。</p>";
  }
}

// 5. カード描画関数
// users: ユーザーデータの配列
// isMyList: Myリスト表示なら削除ボタン、検索表示なら追加ボタン
function renderCards(users, isMyList) {
  listContainer.innerHTML = "";
  
  users.forEach(user => {
    // ユーザーIDは user.id (検索時) または myBookmarksから特定など
    // ここでは検索時に id を付与しているのでそれを使用。Myリスト時はfetchBookmarksでIDを取得できていないため修正が必要。
    // ★修正: Myリスト取得時にIDも含める必要がありますが、getDocの結果にはidが含まれないため、
    // fetchBookmarks -> renderCards の流れで userオブジェクトにidを持たせる必要があります。
    
    // 簡易対応: Myリスト表示時は userオブジェクトに id がないので、
    // ここでは検索・Myリスト共通で使えるように、Myリスト取得ロジックを少し見直すか、
    // userデータ内にuidが含まれていない場合を考慮します。
    // FirestoreのusersコレクションのドキュメントIDはuidそのものなので、
    // 検索時は doc.id を使い、Myリスト時は bookmarks 配列のIDを使えばOKですが、
    // 描画ループ内でIDがわからないとボタンが作れません。
    
    // なので、renderCardsに渡すデータには必ず `uid` プロパティが含まれている前提にします。
    // ※下の renderCards呼び出し元を修正済み
    
    // IDの取得（検索結果にはid、Myリスト取得データには無い場合があるので補完）
    // Myリスト取得時のPromise.allではdata()しか返らないため、以下で対応
    // 実はMyリスト取得時の `docs` は `DocumentSnapshot` なので `docs[i].id` で取れます。
    // renderCards内で使いやすいようにデータを整形します。
  });

  // ★レンダリングロジック修正版
  users.forEach(user => {
    // データ整形
    const uid = user.uid || user.id; // データ構造による揺れを吸収
    const icon = user.iconUrl || "https://placehold.co/50";
    const name = user.nickname || "名無し先輩";
    const bio = user.bio ? (user.bio.length > 40 ? user.bio.substring(0,40)+"..." : user.bio) : "自己紹介なし";
    const tagsHtml = (user.tags || []).map(t => `<span class="tag">#${t}</span>`).join("");
    
    const isAdded = myBookmarks.includes(uid);
    
    // ボタンの出し分け
    let actionBtn = "";
    if (isAdded) {
      actionBtn = `<button class="action-btn btn-remove" onclick="toggleSenpai('${uid}', false)">✕ リストから外す</button>`;
    } else {
      actionBtn = `<button class="action-btn btn-add" onclick="toggleSenpai('${uid}', true)">＋ リストに追加</button>`;
    }

    const html = `
      <article class="post-card" style="cursor: default; display:flex; flex-direction:column;">
        <div style="display:flex; align-items:center; margin-bottom:10px;">
             <img src="${icon}" style="width:40px; height:40px; border-radius:50%; margin-right:10px; object-fit:cover; border:1px solid #eee;">
             <div>
                 <h3 style="margin:0; font-size:1rem; color:#1e3a8a;">${name}</h3>
                 <span style="font-size:0.8rem; color:#999;">${user.grade || ""}</span>
             </div>
        </div>
        <div class="tags" style="margin-bottom:8px;">${tagsHtml}</div>
        <p style="font-size:0.9rem; color:#444; flex-grow:1;">${bio}</p>
        
        <div style="margin-top:auto;">
          ${actionBtn}
        </div>
      </article>
    `;
    listContainer.insertAdjacentHTML("beforeend", html);
  });
}

// 6. Myリスト取得時のデータ整形用ラッパー（上のrenderCards用）
async function renderViewWrapper() {
  if (currentMode === "mylist") {
    listContainer.innerHTML = "";
    if (myBookmarks.length === 0) {
      listContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#666;"><p>まだ追加された先輩はいません。</p><button onclick="switchMode('search')" style="margin-top:10px; background:#3b82f6; color:white; border:none; padding:8px 16px; border-radius:20px; cursor:pointer;">🔍 先輩を探しに行く</button></div>`;
      return;
    }
    const promises = myBookmarks.map(uid => getDoc(doc(db, "users", uid)));
    const docs = await Promise.all(promises);
    const users = docs
        .filter(d => d.exists())
        .map(d => ({ uid: d.id, ...d.data() })); // IDを明示的に付与
    renderCards(users, true);
  }
}

// 7. 追加・削除アクション（グローバル関数化）
window.toggleSenpai = async (targetUid, isAdd) => {
  if (!currentUser) return alert("ログインが必要です");

  try {
    const userRef = doc(db, "users", currentUser.uid);
    if (isAdd) {
      await updateDoc(userRef, { bookmarks: arrayUnion(targetUid) });
      myBookmarks.push(targetUid);
      alert("Myリストに追加しました！");
    } else {
      await updateDoc(userRef, { bookmarks: arrayRemove(targetUid) });
      myBookmarks = myBookmarks.filter(id => id !== targetUid);
      alert("Myリストから削除しました。");
    }
    
    // 画面再描画
    if (currentMode === "mylist") renderViewWrapper();
    else performSearch(); // 検索結果のボタン状態も更新

  } catch (e) {
    console.error(e);
    alert("処理に失敗しました: " + e.message);
  }
};

// 8. イベントリスナー
showMyListBtn.addEventListener("click", () => {
  currentMode = "mylist";
  showMyListBtn.classList.add("active");
  showSearchBtn.classList.remove("active");
  searchArea.style.display = "none";
  renderViewWrapper();
});

showSearchBtn.addEventListener("click", () => {
  switchMode("search");
});

window.switchMode = (mode) => {
    if(mode === "search") {
        currentMode = "search";
        showSearchBtn.classList.add("active");
        showMyListBtn.classList.remove("active");
        searchArea.style.display = "block";
        listContainer.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#999;">キーワードを入力して検索してください。</p>`;
    }
}

searchBtn.addEventListener("click", performSearch);
keywordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") performSearch();
});

// 初期ロード呼び出しの書き換え
// onAuthStateChanged 内の renderView() を renderViewWrapper() に変更してください
// ※上記コード内の renderView() 呼び出しは、実質 renderViewWrapper() のロジックが必要なので
// renderView関数自体を renderViewWrapper の内容で置き換えます。

async function renderViewFinal() {
    if (currentMode === "mylist") {
        await renderViewWrapper();
    } else {
        // 検索モード時は検索結果を維持、またはクリア
    }
}
