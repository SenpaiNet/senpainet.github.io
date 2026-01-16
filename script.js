import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot, getDocs, where } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

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
// 1. ログイン状態の監視
// ---------------------------------------------------
onAuthStateChanged(auth, (user) => {
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (user) {
    // 【ログイン中】
    console.log("ログイン中:", user.displayName);
    if(logoutBtn) {
        logoutBtn.innerHTML = "🚪 ログアウト";
        logoutBtn.href = "#"; // リンク無効化（JSで処理するため）
    }
  } else {
    // 【未ログイン】
    console.log("ゲスト閲覧中");
    
    if(logoutBtn) {
        logoutBtn.innerHTML = "🔑 ログイン";
        logoutBtn.href = "login.html"; // ボタンを押したらログイン画面へ
    }
  }
});

// ---------------------------------------------------
// 2. ログアウト処理
// ---------------------------------------------------
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    // ログイン中の場合のみ、ログアウト処理を実行
    if (auth.currentUser) {
        e.preventDefault();
        signOut(auth).then(() => {
          alert("ログアウトしました 👋");
          window.location.href = "login.html";
        }).catch((error) => {
          console.error("ログアウトエラー:", error);
        });
    }
  });
}

// ---------------------------------------------------
// 3. 投稿一覧の表示 (存在する場合のみ実行)
// ---------------------------------------------------
const postList = document.getElementById('postList');
const keywordInput = document.getElementById('keywordInput');
const searchBtn = document.getElementById('searchBtn');

if (postList) {
    let allPosts = []; 

    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
      allPosts = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        allPosts.push({
          id: doc.id,
          ...data
        });
      });
      renderPosts(allPosts);
    });

    function renderPosts(posts) {
      postList.innerHTML = "";

      if (posts.length === 0) {
        postList.innerHTML = "<p>投稿が見つかりませんでした。</p>";
        return;
      }
      posts.sort((a, b) => {
        const aReplies = a.replies ? a.replies.length : 0;
        const bReplies = b.replies ? b.replies.length : 0;
        return bReplies - aReplies;
      });

      posts.forEach(post => {
        const dateStr = post.createdAt ? post.createdAt.toDate().toLocaleDateString() : "日付不明";
        const snippet = post.content.length > 60 ? post.content.substring(0, 60) + "..." : post.content;
        
        let tagsHtml = "";
        if (post.tags && Array.isArray(post.tags)) {
            tagsHtml = post.tags.map(tag => `<span style="font-size:0.8em; background:#eee; padding:2px 5px; margin-right:5px; border-radius:4px;">#${tag}</span>`).join("");
        }

        const html = `
          <article class="post-card" onclick="location.href='detail2.html?id=${post.id}'" style="cursor: pointer;">
            <div class="post-header">
                <h3 class="post-title">${post.title}</h3>
                <span class="post-date">${dateStr}</span>
            </div>
            <div class="post-meta">
                <span class="author-name">👤 ${post.authorName || "匿名"}</span>
                <div style="margin-top:5px;">${tagsHtml}</div>
            </div>
            <p class="post-content">${snippet}</p>
            <div class="card-footer">
                <span class="read-more">回答を見る・相談に乗る &rarr;</span>
            </div>
          </article>
        `;

        postList.insertAdjacentHTML('beforeend', html);
      });
    }

    // 検索ボタン
    if(searchBtn) {
        searchBtn.addEventListener('click', () => {
          const keyword = keywordInput.value.toLowerCase();
          if (!keyword) {
            renderPosts(allPosts);
            return;
          }
          const filtered = allPosts.filter(post => 
            (post.title && post.title.toLowerCase().includes(keyword)) || 
            (post.content && post.content.toLowerCase().includes(keyword))
          );
          renderPosts(filtered);
        });
    }
}

// ---------------------------------------------------
// 4. 実績カウンター (DB連動版)
// ---------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  const counters = document.querySelectorAll(".achievement-number");
  
  if (counters.length === 0) return; // 実績セクションがないページでは終了

  // --- データベースから件数を取得 ---
  try {
      // 1. 相談投稿数
      const postsSnap = await getDocs(collection(db, "posts"));
      const postsCount = postsSnap.size;

      // 2. 登録在学生数
      const studentsQuery = query(collection(db, "users"), where("userType", "==", "在校生"));
      const studentsSnap = await getDocs(studentsQuery);
      const studentsCount = studentsSnap.size;

      // 3. 登録卒業生数
      const graduatesQuery = query(collection(db, "users"), where("userType", "==", "卒業生"));
      const graduatesSnap = await getDocs(graduatesQuery);
      const graduatesCount = graduatesSnap.size;

      // HTML要素の data-target 属性を更新 (要素の順番に依存)
      // index.html の並び順: [0]投稿数, [1]在学生, [2]卒業生, [3]運営
      if(counters[0]) counters[0].dataset.target = postsCount;
      if(counters[1]) counters[1].dataset.target = studentsCount;
      if(counters[2]) counters[2].dataset.target = graduatesCount;
      // counters[3] (運営メンバー) はDBにフラグがないため固定値または手動更新

  } catch(e) {
      console.error("実績データの取得に失敗しました:", e);
  }

  // --- カウントアップアニメーション ---
  const startCount = (counter) => {
    const target = +counter.dataset.target; // 更新されたtargetを取得
    let current = 0;

    // 数値が大きい場合はスピード調整
    const increment = Math.max(1, Math.floor(target / 60));

    const update = () => {
      current += increment;
      if (current >= target) {
        counter.textContent = target;
      } else {
        counter.textContent = current;
        requestAnimationFrame(update);
      }
    };

    update();
  };

  // 画面に入ったらスタート（IntersectionObserver）
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          startCount(entry.target);
          observer.unobserve(entry.target); // 1回だけ実行
        }
      });
    },
    { threshold: 0.6 }
  );

  counters.forEach((counter) => observer.observe(counter));
});
