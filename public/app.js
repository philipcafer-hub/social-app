const socket = io();
window.currentUser = null;

// Sign up
async function signup() {
  const username = document.getElementById("signup-username").value;
  const password = document.getElementById("signup-password").value;
  const res = await fetch("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.success) {
    alert("Signed up successfully! Please log in.");
  } else {
    alert(data.error);
  }
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
    document.getElementById("login-warning").style.display = "none";
  } else {
    alert(data.error);
  }
}

// Logout
async function logout() {
  await fetch("/api/logout", { method: "POST" });
  window.currentUser = null;
  document.getElementById("auth").style.display = "block";
  document.getElementById("app").style.display = "none";
}

// Create a post
async function createPost() {
  const content = document.getElementById("post-content").value;
  if (!content.trim()) return alert("Post cannot be empty.");
  await fetch("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });
  document.getElementById("post-content").value = "";
}

// Delete a post
async function deletePost(id) {
  await fetch(`/api/posts/${id}`, { method: "DELETE" });
}

// Like a post
async function likePost(id) {
  await fetch(`/api/posts/${id}/like`, { method: "POST" });
}

// Dislike a post
async function dislikePost(id) {
  await fetch(`/api/posts/${id}/dislike`, { method: "POST" });
}

// Real-time feed updates via Socket.IO
socket.on("posts", (posts) => {
  const feed = document.getElementById("feed");
  feed.innerHTML = "";
  posts.forEach(p => {
    const div = document.createElement("div");
    div.className = "post";
    let buttons = "";

    // Delete button for owner
    if (window.currentUser && window.currentUser.id === p.user_id) {
      buttons += `<button onclick="deletePost(${p.id})">Delete</button> `;
    }

    // Like/Dislike buttons for logged-in users
    if (window.currentUser) {
      buttons += `<button onclick="likePost(${p.id})">👍 ${p.likes}</button> `;
      buttons += `<button onclick="dislikePost(${p.id})">👎 ${p.dislikes}</button>`;
    }

    div.innerHTML = `
      <b>@${p.username}</b><br>
      ${p.content}<br>
      <small>${p.created_at}</small><br>
      ${buttons}
    `;
    feed.appendChild(div);
  });

  // Show login warning if not logged in
  if (!window.currentUser) {
    document.getElementById("login-warning").style.display = "block";
  }
});
