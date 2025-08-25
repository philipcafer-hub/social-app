const socket = io();
window.currentUser = null;

// Signup
async function signup() {
  const username = document.getElementById("signup-username").value;
  const password = document.getElementById("signup-password").value;
  const res = await fetch("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  alert(data.success ? "Signed up! Please log in." : data.error);
}

// Login
async function login() {
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.success) {
    window.currentUser = { username: data.username, id: data.id };
    document.getElementById("auth").style.display = "none";
    document.getElementById("app").style.display = "block";
    document.getElementById("welcome").innerText = `Welcome, ${data.username}`;
    document.getElementById("login-warning").style.display = "none";
  } else alert(data.error);
}

// Logout
async function logout() {
  await fetch("/api/logout", { method: "POST" });
  window.currentUser = null;
  document.getElementById("auth").style.display = "block";
  document.getElementById("app").style.display = "none";
  document.getElementById("welcome").innerText = "";
}

// Create post
async function createPost() {
  const content = document.getElementById("post-content").value;
  if (!content.trim()) return alert("Cannot post empty content");
  await fetch("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });
  document.getElementById("post-content").value = "";
}

// Delete post
async function deletePost(id) { await fetch(`/api/posts/${id}`, { method: "DELETE" }); }

// Reactions
async function likePost(id) { await fetch(`/api/posts/${id}/like`, { method: "POST" }); }
async function dislikePost(id) { await fetch(`/api/posts/${id}/dislike`, { method: "POST" }); }

// Comments
async function commentPost(id) {
  const content = prompt("Write a comment:");
  if (!content) return;
  await fetch(`/api/posts/${id}/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });
}

// Real-time feed
socket.on("posts", ({ posts, comments }) => {
  const feed = document.getElementById("feed");
  feed.innerHTML = "";
  posts.forEach(p => {
    const div = document.createElement("div");
    div.className = "post";

    let actions = "";
    if (window.currentUser && window.currentUser.id === p.user_id) {
      actions += `<button onclick="deletePost(${p.id})">Delete</button> `;
    }
    if (window.currentUser) {
      actions += `<button onclick="likePost(${p.id})">👍 ${p.likes}</button> `;
      actions += `<button onclick="dislikePost(${p.id})">👎 ${p.dislikes}</button> `;
      actions += `<button onclick="commentPost(${p.id})">💬 Comment</button>`;
    }

    let commentsHtml = comments
      .filter(c => c.post_id === p.id)
      .map(c => `<div class="comment"><b>@${c.username}</b>: ${c.content}</div>`)
      .join("");

    div.innerHTML = `
      <div class="post-header">
        <img src="${p.avatar || '/default-avatar.png'}" alt="avatar">
        <b>@${p.username}</b> • <small>${p.created_at}</small>
      </div>
      <div class="post-content">${p.content}</div>
      <div class="post-actions">${actions}</div>
      ${commentsHtml}
    `;
    feed.appendChild(div);
  });

  if (!window.currentUser) document.getElementById("login-warning").style.display = "block";
});
