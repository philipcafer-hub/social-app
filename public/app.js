const socket = io();
window.currentUser = null;

async function signup() {
  const username = document.getElementById("signup-username").value;
  const password = document.getElementById("signup-password").value;
  const res = await fetch("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  alert((await res.json()).error || "Signed up!");
}

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
    document.getElementById("login-warning").style.display = "none";
    loadPosts();
  } else {
    alert(data.error);
  }
}

async function logout() {
  await fetch("/api/logout", { method: "POST" });
  window.currentUser = null;
  document.getElementById("auth").style.display = "block";
  document.getElementById("app").style.display = "none";
  loadPosts();
}

async function loadPosts() {
  const res = await fetch("/api/posts");
  const posts = await res.json();
  const feed = document.getElementById("feed");
  feed.innerHTML = "";
  posts.forEach(p => {
    const div = document.createElement("div");
    div.className = "post";
    let buttons = "";
    if (window.currentUser && window.currentUser.id === p.user_id) {
      buttons += `<button onclick="deletePost(${p.id})">Delete</button> `;
    }
    if (window.currentUser) {
      buttons += `<button onclick="likePost(${p.id})">👍 ${p.likes}</button> `;
      buttons += `<button onclick="dislikePost(${p.id})">👎 ${p.dislikes}</button>`;
    }
    div.innerHTML = `<b>@${p.username}</b> <br> ${p.content} <br><small>${p.created_at}</small><br>${buttons}`;
    feed.appendChild(div);
  });

  if (!window.currentUser) {
    document.getElementById("login-warning").style.display = "block";
  }
}

async function createPost() {
  const content = document.getElementById("post-content").value;
  await fetch("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });
  document.getElementById("post-content").value = "";
  loadPosts();
}

async function deletePost(id) {
  await fetch(`/api/posts/${id}`, { method: "DELETE" });
  loadPosts();
}

async function likePost(id) {
  await fetch(`/api/posts/${id}/like`, { method: "POST" });
  loadPosts();
}

async function dislikePost(id) {
  await fetch(`/api/posts/${id}/dislike`, { method: "POST" });
  loadPosts();
}

// Load posts on page load
loadPosts();
