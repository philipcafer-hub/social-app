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
    document.getElementById("auth").style.display = "none";
    document.getElementById("app").style.display = "block";
    loadPosts();
  } else {
    alert(data.error);
  }
}

async function logout() {
  await fetch("/api/logout", { method: "POST" });
  document.getElementById("auth").style.display = "block";
  document.getElementById("app").style.display = "none";
}

async function loadPosts() {
  const res = await fetch("/api/posts");
  const posts = await res.json();
  const feed = document.getElementById("feed");
  feed.innerHTML = "";
  posts.forEach(p => {
    const div = document.createElement("div");
    div.className = "post";
    div.innerHTML = `<b>@${p.username}</b> <br> ${p.content} <br><small>${p.created_at}</small>`;
    feed.appendChild(div);
  });
}

async function createPost() {
  const content = document.getElementById("post-content").value;
  const res = await fetch("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });
  const data = await res.json();
  if (!data.error) {
    loadPosts();
    document.getElementById("post-content").value = "";
  } else {
    alert(data.error);
  }
}
