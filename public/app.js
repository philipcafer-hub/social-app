const socket = io();
window.currentUser = null;

// Signup
async function signup() {
  const username = document.getElementById("signup-username").value;
  const password = document.getElementById("signup-password").value;
  const res = await fetch("/api/signup", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({username,password})
  });
  const data = await res.json();
  alert(data.success ? "Signed up! Log in now." : data.error);
}

// Login
async function login() {
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;
  const res = await fetch("/api/login", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({username,password})
  });
  const data = await res.json();
  if(data.success){
    window.currentUser = {id:data.id, username:data.username};
    document.getElementById("auth").style.display="none";
    document.getElementById("app").style.display="block";
    document.getElementById("welcome").innerText=`Welcome, ${data.username}`;
    socket.emit("requestPosts"); // update feed
  } else alert(data.error);
}

// Logout
async function logout() {
  await fetch("/api/logout",{method:"POST"});
  window.currentUser=null;
  document.getElementById("auth").style.display="block";
  document.getElementById("app").style.display="none";
  document.getElementById("welcome").innerText="";
  socket.emit("requestPosts"); // force feed re-render to hide delete buttons
}

// Create post
async function createPost(){
  const content = document.getElementById("post-content").value;
  if(!content.trim()) return alert("Cannot post empty content");
  await fetch("/api/posts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content})});
  document.getElementById("post-content").value="";
}

// Delete post
async function deletePost(id){ 
  await fetch(`/api/posts/${id}`,{method:"DELETE"});
}

// Feed rendering
socket.on("posts", ({ posts }) => {
  const feed = document.getElementById("feed");
  feed.innerHTML = "";

  posts.forEach(p => {
    const div = document.createElement("div");
    div.className = "post";

    // Delete button only for logged-in owner
    let actions = "";
    if (window.currentUser && window.currentUser.id === p.user_id) {
      actions += `<button onclick="deletePost(${p.id})">Delete</button>`;
    }

    // Timestamp
    const date = new Date(p.created_at);
    const timestamp = date.toLocaleString();

    div.innerHTML = `<b>@${p.username}</b> <small>${timestamp}</small>:<br>${p.content}<br>${actions}`;
    feed.appendChild(div);
  });
});
