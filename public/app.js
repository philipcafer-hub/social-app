const socket = io();
window.currentUser = null;

// Signup
async function signup() {
  const username = document.getElementById("signup-username").value;
  const password = document.getElementById("signup-password").value;
  const res = await fetch("/api/signup", {
    method:"POST", headers:{"Content-Type":"application/json"},
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
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({username,password})
  });
  const data = await res.json();
  if(data.success){
    window.currentUser = {id:data.id, username:data.username};
    document.getElementById("auth").style.display="none";
    document.getElementById("app").style.display="block";
    document.getElementById("welcome").innerText=`Welcome, ${data.username}`;
  } else alert(data.error);
}

// Logout
async function logout(){
  await fetch("/api/logout",{method:"POST"});
  window.currentUser=null;
  document.getElementById("auth").style.display="block";
  document.getElementById("app").style.display="none";
  document.getElementById("welcome").innerText="";
}

// Create post
async function createPost(){
  const content = document.getElementById("post-content").value;
  if(!content.trim()) return alert("Cannot post empty content");
  await fetch("/api/posts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content})});
  document.getElementById("post-content").value="";
}

// Delete post
async function deletePost(id){ await fetch(`/api/posts/${id}`,{method:"DELETE"}); }

// Like / Dislike
async function likePost(id){ await fetch(`/api/posts/${id}/like`,{method:"POST"}); }
async function dislikePost(id){ await fetch(`/api/posts/${id}/dislike`,{method:"POST"}); }

// Feed
socket.on("posts",({posts})=>{
  const feed=document.getElementById("feed"); feed.innerHTML="";
  posts.forEach(p=>{
    const div=document.createElement("div"); div.className="post";
    let actions="";
    if(window.currentUser && window.currentUser.id===p.user_id) actions+=`<button onclick="deletePost(${p.id})">Delete</button>`;
    if(window.currentUser) actions+=` <button onclick="likePost(${p.id})">👍 ${p.likes}</button> <button onclick="dislikePost(${p.id})">👎 ${p.dislikes}</button>`;
    div.innerHTML=`<b>@${p.username}</b>: ${p.content}<br>${actions}`;
    feed.appendChild(div);
  });
});
