const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const db = new sqlite3.Database("./db.sqlite");
const SECRET = "supersecret"; // change this in production

app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));

// Create tables
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY, user_id INTEGER, content TEXT, likes INTEGER DEFAULT 0, dislikes INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
});

// Auth middleware
function auth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Broadcast all posts to connected clients
function broadcastPosts() {
  db.all(
    "SELECT posts.id, posts.content, posts.likes, posts.dislikes, posts.created_at, users.username, posts.user_id FROM posts JOIN users ON posts.user_id = users.id ORDER BY posts.created_at DESC",
    [],
    (err, rows) => {
      io.emit("posts", rows);
    }
  );
}

// Signup
app.post("/api/signup", async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hash], function (err) {
    if (err) return res.status(400).json({ error: "Username already taken" });
    res.json({ success: true });
  });
});

// Login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
    if (!user) return res.status(400).json({ error: "User not found" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid password" });
    const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: "1h" });
    res.cookie("token", token, { httpOnly: true });
    res.json({ success: true, id: user.id, username: user.username });
  });
});

// Logout
app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

// Get posts (public)
app.get("/api/posts", (req, res) => {
  db.all(
    "SELECT posts.id, posts.content, posts.likes, posts.dislikes, posts.created_at, users.username, posts.user_id FROM posts JOIN users ON posts.user_id = users.id ORDER BY posts.created_at DESC",
    [],
    (err, rows) => {
      res.json(rows);
    }
  );
});

// Create post
app.post("/api/posts", auth, (req, res) => {
  const { content } = req.body;
  db.run("INSERT INTO posts (user_id, content) VALUES (?, ?)", [req.user.id, content], function(err){
    if(err) return res.status(500).json({error:"Failed to post"});
    broadcastPosts();
    res.json({ success: true });
  });
});

// Delete post
app.delete("/api/posts/:id", auth, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM posts WHERE id = ? AND user_id = ?", [id, req.user.id], function(err){
    if(this.changes === 0) return res.status(403).json({error:"Not allowed"});
    broadcastPosts();
    res.json({ success: true });
  });
});

// Like post
app.post("/api/posts/:id/like", auth, (req, res) => {
  db.run("UPDATE posts SET likes = likes + 1 WHERE id = ?", [req.params.id], function(err){
    broadcastPosts();
    res.json({ success: true });
  });
});

// Dislike post
app.post("/api/posts/:id/dislike", auth, (req, res) => {
  db.run("UPDATE posts SET dislikes = dislikes + 1 WHERE id = ?", [req.params.id], function(err){
    broadcastPosts();
    res.json({ success: true });
  });
});

// Socket.IO connection
io.on("connection", (socket) => {
  broadcastPosts(); // Send initial posts on connection
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
