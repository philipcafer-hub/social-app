const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const db = new sqlite3.Database("./db.sqlite");
const SECRET = "supersecret";

app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));

const upload = multer({ dest: "public/avatars/" });

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    bio TEXT DEFAULT '',
    avatar TEXT DEFAULT '/default-avatar.png'
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    content TEXT,
    likes INTEGER DEFAULT 0,
    dislikes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY,
    post_id INTEGER,
    user_id INTEGER,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER,
    following_id INTEGER,
    UNIQUE(follower_id, following_id)
  )`);
});

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

function broadcastPosts() {
  db.all(
    `SELECT posts.id, posts.content, posts.likes, posts.dislikes, posts.created_at,
            users.username, users.avatar, posts.user_id
     FROM posts
     JOIN users ON posts.user_id = users.id
     ORDER BY posts.created_at DESC`,
    [],
    (err, posts) => {
      if (err) return;
      db.all(
        `SELECT comments.id, comments.post_id, comments.user_id, comments.content,
                comments.created_at, users.username
         FROM comments
         JOIN users ON comments.user_id = users.id`,
        [],
        (err2, comments) => {
          io.emit("posts", { posts, comments });
        }
      );
    }
  );
}

// Auth Routes
app.post("/api/signup", async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  db.run(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, hash],
    function (err) {
      if (err) return res.status(400).json({ error: "Username taken" });
      res.json({ success: true });
    }
  );
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
    if (!user) return res.status(400).json({ error: "User not found" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid password" });
    const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: "1h" });
    res.cookie("token", token, { httpOnly: true });
    res.json({ success: true, id: user.id, username: user.username, avatar: user.avatar });
  });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

// Follow / Unfollow
app.post("/api/follow/:id", auth, (req, res) => {
  const { id } = req.params;
  if (id == req.user.id) return res.json({ error: "Cannot follow yourself" });
  db.run("INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)", [req.user.id, id], () => {
    broadcastPosts();
    res.json({ success: true });
  });
});
app.post("/api/unfollow/:id", auth, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM follows WHERE follower_id = ? AND following_id = ?", [req.user.id, id], () => {
    broadcastPosts();
    res.json({ success: true });
  });
});

// Posts
app.post("/api/posts", auth, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "Post cannot be empty" });
  db.run("INSERT INTO posts (user_id, content) VALUES (?, ?)", [req.user.id, content], () => {
    broadcastPosts();
    res.json({ success: true });
  });
});

app.delete("/api/posts/:id", auth, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM posts WHERE id = ? AND user_id = ?", [id, req.user.id], () => {
    broadcastPosts();
    res.json({ success: true });
  });
});

app.post("/api/posts/:id/like", auth, (req, res) => {
  db.run("UPDATE posts SET likes = likes + 1 WHERE id = ?", [req.params.id], () => {
    broadcastPosts();
    res.json({ success: true });
  });
});

app.post("/api/posts/:id/dislike", auth, (req, res) => {
  db.run("UPDATE posts SET dislikes = dislikes + 1 WHERE id = ?", [req.params.id], () => {
    broadcastPosts();
    res.json({ success: true });
  });
});

// Comments
app.post("/api/posts/:id/comment", auth, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "Comment cannot be empty" });
  db.run(
    "INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)",
    [req.params.id, req.user.id, content],
    () => {
      broadcastPosts();
      res.json({ success: true });
    }
  );
});

// Socket.IO
io.on("connection", (socket) => {
  broadcastPosts();
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
