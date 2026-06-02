const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const uploadsDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, 'data');
const postsFile = path.join(dataDir, 'posts.json');
const usersFile = path.join(dataDir, 'users.json');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(postsFile)) fs.writeFileSync(postsFile, '[]', 'utf8');
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, '[]', 'utf8');

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'uwu-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

function readJson(file) {
  const content = fs.readFileSync(file, 'utf8');
  return JSON.parse(content || '[]');
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function getUserByEmail(email) {
  const users = readJson(usersFile);
  return users.find(user => user.email === email.toLowerCase());
}

function getUserById(id) {
  const users = readJson(usersFile);
  return users.find(user => user.id === id);
}

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

function createDefaultAdmin() {
  const users = readJson(usersFile);
  if (users.some(user => user.role === 'admin')) return;
  const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = bcrypt.hashSync(defaultPassword, 10);
  users.push({
    id: Date.now().toString(),
    name: 'admin',
    email: 'admin@uwu.local',
    passwordHash: hash,
    role: 'admin',
    createdAt: new Date().toISOString()
  });
  writeJson(usersFile, users);
}

createDefaultAdmin();

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: '請先登入' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.session.userRole !== 'admin') {
    return res.status(403).json({ error: '管理者權限不足' });
  }
  next();
}

app.get('/api/users/me', (req, res) => {
  if (!req.session.userId) {
    return res.json({ user: null });
  }
  const user = getUserById(req.session.userId);
  res.json({ user: sanitizeUser(user) });
});

app.post('/api/users/register', (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (!name || !email || !password) {
      return res.status(400).json({ error: '姓名、信箱與密碼皆為必填' });
    }

    if (getUserByEmail(email)) {
      return res.status(400).json({ error: '此信箱已被使用' });
    }

    const users = readJson(usersFile);
    const passwordHash = bcrypt.hashSync(password, 10);
    const user = {
      id: Date.now().toString(),
      name,
      email,
      passwordHash,
      role: 'user',
      createdAt: new Date().toISOString()
    };

    users.push(user);
    writeJson(usersFile, users);

    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.userName = user.name;

    res.status(201).json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ error: '無法完成註冊' });
  }
});

app.post('/api/users/login', (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';
    const user = getUserByEmail(email);

    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ error: '信箱或密碼不正確' });
    }

    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.userName = user.name;

    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ error: '無法完成登入' });
  }
});

app.post('/api/users/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: '無法登出' });
    }
    res.json({ success: true });
  });
});

function readPosts() {
  const posts = readJson(postsFile);
  return posts.map(post => ({ ...post, comments: post.comments || [] }));
}

function writePosts(posts) {
  writeJson(postsFile, posts);
}

app.get('/api/posts', (req, res) => {
  try {
    const posts = readPosts();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: '無法讀取貼文資料' });
  }
});

app.post('/api/posts', requireAuth, upload.single('image'), (req, res) => {
  try {
    const text = (req.body.text || '').trim();
    if (!text) {
      return res.status(400).json({ error: '請輸入文字內容' });
    }

    const user = getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: '使用者不存在' });
    }

    const posts = readPosts();
    const post = {
      id: Date.now().toString(),
      authorId: user.id,
      authorName: user.name,
      text,
      image: req.file ? `/uploads/${req.file.filename}` : null,
      createdAt: new Date().toISOString(),
      comments: []
    };

    posts.unshift(post);
    writePosts(posts);

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: '無法建立貼文' });
  }
});

function findPost(posts, postId) {
  return posts.find(post => post.id === postId);
}

function isPostOwnerOrAdmin(req, post) {
  return req.session.userRole === 'admin' || post.authorId === req.session.userId;
}

app.put('/api/posts/:id', requireAuth, upload.single('image'), (req, res) => {
  try {
    const postId = req.params.id;
    const text = (req.body.text || '').trim();
    const posts = readPosts();
    const post = findPost(posts, postId);

    if (!post) {
      return res.status(404).json({ error: '貼文不存在' });
    }
    if (!isPostOwnerOrAdmin(req, post)) {
      return res.status(403).json({ error: '沒有編輯權限' });
    }
    if (!text) {
      return res.status(400).json({ error: '貼文內容不可為空' });
    }

    post.text = text;
    if (req.file) {
      post.image = `/uploads/${req.file.filename}`;
    }
    writePosts(posts);
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: '無法更新貼文' });
  }
});

app.delete('/api/posts/:id', requireAuth, (req, res) => {
  try {
    const postId = req.params.id;
    const posts = readPosts();
    const post = findPost(posts, postId);

    if (!post) {
      return res.status(404).json({ error: '貼文不存在' });
    }
    if (!isPostOwnerOrAdmin(req, post)) {
      return res.status(403).json({ error: '沒有刪除權限' });
    }

    const nextPosts = posts.filter(p => p.id !== postId);
    writePosts(nextPosts);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '無法刪除貼文' });
  }
});

app.post('/api/posts/:id/comments', requireAuth, (req, res) => {
  try {
    const postId = req.params.id;
    const text = (req.body.text || '').trim();
    if (!text) {
      return res.status(400).json({ error: '留言內容不可空白' });
    }

    const posts = readPosts();
    const post = findPost(posts, postId);
    if (!post) {
      return res.status(404).json({ error: '貼文不存在' });
    }

    const user = getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: '使用者不存在' });
    }

    const comment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      authorId: user.id,
      authorName: user.name,
      text,
      createdAt: new Date().toISOString()
    };

    post.comments = post.comments || [];
    post.comments.push(comment);
    writePosts(posts);
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: '無法新增留言' });
  }
});

app.delete('/api/posts/:postId/comments/:commentId', requireAuth, (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const posts = readPosts();
    const post = findPost(posts, postId);
    if (!post) {
      return res.status(404).json({ error: '貼文不存在' });
    }

    const comment = (post.comments || []).find(c => c.id === commentId);
    if (!comment) {
      return res.status(404).json({ error: '留言不存在' });
    }
    if (req.session.userRole !== 'admin' && comment.authorId !== req.session.userId) {
      return res.status(403).json({ error: '沒有刪除留言權限' });
    }

    post.comments = (post.comments || []).filter(c => c.id !== commentId);
    writePosts(posts);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '無法刪除留言' });
  }
});

app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  const users = readJson(usersFile).map(user => sanitizeUser(user));
  res.json(users);
});

app.delete('/api/admin/users/:id', requireAuth, requireAdmin, (req, res) => {
  const userId = req.params.id;
  const users = readJson(usersFile);
  if (!users.some(user => user.id === userId)) {
    return res.status(404).json({ error: '使用者不存在' });
  }

  const nextUsers = users.filter(user => user.id !== userId);
  writeJson(usersFile, nextUsers);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`分享網站已啟動: http://localhost:${PORT}`);
});
