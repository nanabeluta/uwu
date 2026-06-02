const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showLoginBtn = document.getElementById('showLoginBtn');
const showRegisterBtn = document.getElementById('showRegisterBtn');
const userPanel = document.getElementById('userPanel');
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const logoutBtn = document.getElementById('logoutBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const importCsvBtn = document.getElementById('importCsvBtn');
const importCsvInput = document.getElementById('importCsvInput');
const shareSection = document.getElementById('shareSection');
const loginRequired = document.getElementById('loginRequired');
const adminSection = document.getElementById('adminSection');
const adminUsers = document.getElementById('adminUsers');
const form = document.getElementById('shareForm');
const postsContainer = document.getElementById('posts');
const statusEl = document.getElementById('status');
const loginStatus = document.getElementById('loginStatus');
const registerStatus = document.getElementById('registerStatus');

const POSTS_KEY = 'uwu-life-journal-posts';
const USERS_KEY = 'uwu-life-journal-users';
const CURRENT_USER_KEY = 'uwu-life-journal-current-user';

let currentUser = null;

function getUsers() {
  const stored = localStorage.getItem(USERS_KEY);
  try {
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  try {
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveCurrentUser(user) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function clearCurrentUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

function getPosts() {
  const stored = localStorage.getItem(POSTS_KEY);
  try {
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function savePosts(posts) {
  localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
}

function createDefaultAdmin() {
  const users = getUsers();
  if (!users.some(user => user.role === 'admin')) {
    users.push({
      id: 'admin',
      name: '管理者',
      email: 'admin@uwu.local',
      password: 'admin123',
      role: 'admin',
      createdAt: new Date().toISOString()
    });
    saveUsers(users);
  }
}

function findUserByEmail(email) {
  return getUsers().find(user => user.email === email.toLowerCase());
}

function setActiveTab(isLogin) {
  showLoginBtn.classList.toggle('active', isLogin);
  showRegisterBtn.classList.toggle('active', !isLogin);
  loginForm.classList.toggle('hidden', !isLogin);
  registerForm.classList.toggle('hidden', isLogin);
}

function setStatus(element, message, type) {
  element.textContent = message;
  element.className = `status ${type}`;
}

function clearStatus() {
  statusEl.textContent = '';
  statusEl.className = 'status';
}

function updateAuthUI() {
  if (currentUser) {
    userPanel.classList.remove('hidden');
    shareSection.classList.remove('hidden');
    loginRequired.classList.add('hidden');
    document.getElementById('authForms').classList.add('hidden');
    userName.textContent = currentUser.name;
    userRole.textContent = currentUser.role === 'admin' ? '管理者' : '一般使用者';
    adminSection.classList.toggle('hidden', currentUser.role !== 'admin');
  } else {
    userPanel.classList.add('hidden');
    shareSection.classList.add('hidden');
    loginRequired.classList.remove('hidden');
    document.getElementById('authForms').classList.remove('hidden');
    setActiveTab(true);
    adminSection.classList.add('hidden');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br>');
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function getVisiblePosts(posts) {
  return posts.filter(post => {
    if (post.private) {
      return currentUser && (currentUser.role === 'admin' || currentUser.id === post.authorId);
    }
    return true;
  });
}

function renderPosts(posts) {
  const visiblePosts = getVisiblePosts(posts);

  if (!visiblePosts.length) {
    postsContainer.innerHTML = '<p class="empty">目前沒有可見的便利貼。</p>';
    return;
  }

  postsContainer.innerHTML = visiblePosts
    .map(post => {
      const imageHtml = post.image
        ? `<div class="post-image"><img src="${post.image}" alt="生活圖片" /></div>`
        : '';

      const canDelete = currentUser && (currentUser.role === 'admin' || currentUser.id === post.authorId);
      const deleteButton = canDelete
        ? `<button type="button" class="button-danger delete-post" data-id="${post.id}">刪除</button>`
        : '';

      const authorHtml = post.authorName
        ? `<div class="post-author">${escapeHtml(post.authorName)} 的便利貼</div>`
        : '';

      const moodHtml = post.mood
        ? `<div class="post-detail">心情：${escapeHtml(post.mood)}</div>`
        : '';

      const privacyHtml = post.private
        ? `<div class="post-detail post-private">私人便利貼</div>`
        : `<div class="post-detail post-public">公開便利貼</div>`;

      return `
        <article class="post-card" style="background:${post.color || '#fef192'}">
          <div class="post-meta">${new Date(post.createdAt).toLocaleString()}</div>
          ${authorHtml}
          ${moodHtml}
          ${privacyHtml}
          <div class="post-text">${escapeHtml(post.text)}</div>
          ${imageHtml}
          ${deleteButton}
        </article>
      `;
    })
    .join('');
}

function renderAdminUsers() {
  const users = getUsers();
  if (!users.length) {
    adminUsers.innerHTML = '<p>目前沒有使用者資料。</p>';
    return;
  }

  adminUsers.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>名稱</th>
          <th>信箱</th>
          <th>角色</th>
          <th>註冊時間</th>
          <th>動作</th>
        </tr>
      </thead>
      <tbody>
        ${users
          .map(user => `
            <tr>
              <td>${escapeHtml(user.name)}</td>
              <td>${escapeHtml(user.email)}</td>
              <td>${user.role === 'admin' ? '管理者' : '使用者'}</td>
              <td>${new Date(user.createdAt).toLocaleString()}</td>
              <td>${user.id !== currentUser.id ? `<button type="button" class="button-danger delete-user" data-id="${user.id}">刪除</button>` : ''}</td>
            </tr>
          `)
          .join('')}
      </tbody>
    </table>
  `;
}

function initializeApp() {
  createDefaultAdmin();
  currentUser = getCurrentUser();
  updateAuthUI();
  renderPosts(getPosts());
  if (currentUser && currentUser.role === 'admin') {
    renderAdminUsers();
  }
}

function loginUser(event) {
  event.preventDefault();
  loginStatus.textContent = '';

  const email = loginForm.email.value.trim().toLowerCase();
  const password = loginForm.password.value;
  const user = findUserByEmail(email);

  if (!user || user.password !== password) {
    setStatus(loginStatus, '信箱或密碼不正確。', 'error');
    return;
  }

  currentUser = user;
  saveCurrentUser(user);
  updateAuthUI();
  loginForm.reset();
  renderPosts(getPosts());
  if (currentUser.role === 'admin') renderAdminUsers();
  setStatus(loginStatus, '登入成功！', 'success');
}

function registerUser(event) {
  event.preventDefault();
  registerStatus.textContent = '';

  const name = registerForm.name.value.trim();
  const email = registerForm.email.value.trim().toLowerCase();
  const password = registerForm.password.value;

  if (!name || !email || !password) {
    setStatus(registerStatus, '請完整填寫所有欄位。', 'error');
    return;
  }

  if (findUserByEmail(email)) {
    setStatus(registerStatus, '此信箱已被使用。', 'error');
    return;
  }

  const users = getUsers();
  const newUser = {
    id: Date.now().toString(),
    name,
    email,
    password,
    role: 'user',
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  saveUsers(users);
  currentUser = newUser;
  saveCurrentUser(newUser);
  registerForm.reset();
  updateAuthUI();
  renderPosts(getPosts());
  setStatus(registerStatus, '註冊成功，已登入。', 'success');
}

function logoutUser() {
  clearCurrentUser();
  currentUser = null;
  updateAuthUI();
  renderPosts(getPosts());
}

async function submitPost(event) {
  event.preventDefault();
  statusEl.textContent = '';

  if (!currentUser) {
    statusEl.textContent = '請先登入再新增便利貼。';
    statusEl.className = 'status error';
    return;
  }

  const text = form.text.value.trim();
  if (!text) {
    statusEl.textContent = '請輸入生活記事內容。';
    statusEl.className = 'status error';
    return;
  }

  const mood = form.mood.value;
  const color = form.color.value;
  const privacy = form.privacy.value === 'private';
  let image = null;
  const file = form.image.files[0];
  if (file) {
    try {
      image = await readFileAsDataUrl(file);
    } catch (err) {
      statusEl.textContent = '圖片讀取失敗，請重試。';
      statusEl.className = 'status error';
      return;
    }
  }

  const posts = getPosts();
  posts.unshift({
    id: Date.now().toString(),
    authorId: currentUser.id,
    authorName: currentUser.name,
    text,
    mood,
    color,
    private: privacy,
    image,
    createdAt: new Date().toISOString()
  });
  savePosts(posts);

  form.reset();
  statusEl.textContent = '已儲存便利貼！';
  statusEl.className = 'status success';
  renderPosts(posts);
}

function deletePost(postId) {
  const posts = getPosts();
  const target = posts.find(post => post.id === postId);
  if (!target) return;
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.id !== target.authorId)) {
    return;
  }
  const nextPosts = posts.filter(post => post.id !== postId);
  savePosts(nextPosts);
  renderPosts(nextPosts);
}

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map(header => header.trim());
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    const item = {};
    headers.forEach((header, index) => {
      item[header] = values[index] || '';
    });
    return item;
  });
}

function convertPostsToCsv(posts) {
  const headers = ['日期', '作者', '心情', '隱私', '顏色', '文字', '是否有圖片'];
  const rows = posts.map(post => [
    new Date(post.createdAt).toLocaleString(),
    post.authorName || '',
    post.mood || '',
    post.private ? '私人' : '公開',
    post.color || '',
    post.text.replace(/\r?\n/g, ' '),
    post.image ? '是' : '否'
  ]);

  const escapeCsv = value => {
    const text = String(value).replace(/"/g, '""');
    return `"${text}"`;
  };

  return [headers, ...rows].map(row => row.map(escapeCsv).join(',')).join('\n');
}

function exportCsv() {
  const posts = getVisiblePosts(getPosts());
  if (!posts.length) {
    setStatus(statusEl, '目前沒有可匯出的便利貼。', 'error');
    return;
  }

  const csv = convertPostsToCsv(posts);
  downloadCsv('uwu-life-journal.csv', csv);
  setStatus(statusEl, '試算表資料已準備下載。', 'success');
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });
}

async function importCsv(event) {
  if (!currentUser) {
    setStatus(statusEl, '請先登入再匯入試算表。', 'error');
    return;
  }

  const file = event.target.files[0];
  if (!file) return;

  let content;
  try {
    content = await readFileAsText(file);
  } catch (err) {
    setStatus(statusEl, '讀取 CSV 檔案失敗。', 'error');
    return;
  }

  const rows = parseCsv(content);
  if (!rows.length) {
    setStatus(statusEl, 'CSV 檔案格式不正確或內容為空。', 'error');
    return;
  }

  const posts = getPosts();
  const importedPosts = rows.map(row => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    authorId: currentUser.id,
    authorName: row['作者'] || currentUser.name,
    text: row['文字'] || '',
    mood: row['心情'] || '',
    color: row['顏色'] || '#fef192',
    private: row['隱私'] === '私人',
    image: null,
    createdAt: row['日期'] ? new Date(row['日期']).toISOString() : new Date().toISOString()
  }));

  savePosts([...importedPosts, ...posts]);
  form.reset();
  importCsvInput.value = '';
  renderPosts(getPosts());
  setStatus(statusEl, `已匯入 ${importedPosts.length} 筆便利貼。`, 'success');
}

function deleteUser(userId) {
  if (!currentUser || currentUser.role !== 'admin' || userId === currentUser.id) return;
  const users = getUsers().filter(user => user.id !== userId);
  saveUsers(users);
  renderAdminUsers();
}

postsContainer.addEventListener('click', event => {
  if (event.target.matches('.delete-post')) {
    deletePost(event.target.dataset.id);
  }
});

adminUsers.addEventListener('click', event => {
  if (event.target.matches('.delete-user')) {
    deleteUser(event.target.dataset.id);
  }
});

showLoginBtn.addEventListener('click', () => setActiveTab(true));
showRegisterBtn.addEventListener('click', () => setActiveTab(false));
loginForm.addEventListener('submit', loginUser);
registerForm.addEventListener('submit', registerUser);
logoutBtn.addEventListener('click', logoutUser);
exportCsvBtn.addEventListener('click', exportCsv);
importCsvBtn.addEventListener('click', () => importCsvInput.click());
importCsvInput.addEventListener('change', importCsv);
form.addEventListener('submit', submitPost);

initializeApp();
