const socket = io();
window.currentUser = null;

// Auth
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
  } else {
    alert(data.error);
  }
}

async function logout() {
  await fetch("/api/logout", { method: "POST" });
  window.currentUser = null;
  document.getElementById("auth").style.display = "block";
  document.getElementById("app").style.display = "none";
}

// Posts
async function createPost() {
  const content = document.getElementById("post-content").value;
  await fetch("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });
  document.getElementById("post-content").value = "";
}

async function deletePost(id) {
  await fetch(`/api/posts/${id}`, { method: "DELETE" });
}

async function likePost(id) {
  await fetch(`/api/posts/${id}/like`, { method: "POST" });
}

async function dislikePost(id) {
  await fetch(`/api/posts/${id}/dislike`, { method: "POST" });
