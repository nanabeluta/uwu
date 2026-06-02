const adminStatus = document.getElementById('adminStatus');
const adminContent = document.getElementById('adminContent');
const usersTable = document.getElementById('usersTable');
const adminPosts = document.getElementById('adminPosts');

function setAdminStatus(message, type) {
  adminStatus.textContent = message;
  adminStatus.className = `status ${type}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function fetchCurrentUser() {
  try {
    const response = await fetch('/api/users/me');
    return response.ok ? await response.json() : { user: null };
  } catch (err) {
    return { user: null };
  }
}

async function loadAdmin() {
  const current = await fetchCurrentUser();
  if (!current.user || current.user.role !== 'admin') {
    setAdminStatus('只有管理者可以使用此頁面。', 'error');
    return;
  }

  adminContent.classList.remove('hidden');
  setAdminStatus('歡迎，管理者。', 'success');
  loadUsers();
  loadPosts();
}

async function loadUsers() {
  try {
    const response = await fetch('/api/admin/users');
    const users = await response.json();
    usersTable.innerHTML = users
      .map(user => `
        <tr>
          <td>${escapeHtml(user.name)}</td>
          <td>${escapeHtml(user.email)}</td>
          <td>${escapeHtml(user.role)}</td>
          <td>${new Date(user.createdAt).toLocaleString()}</td>
          <td><button class="button-danger admin-delete-user" data-id="${user.id}">刪除</button></td>
        </tr>
      `)
      .join('');
  } catch (err) {
    setAdminStatus('無法讀取使用者資料。', 'error');
  }
}

async function loadPosts() {
  try {
    const response = await fetch('/api/posts');
    const posts = await response.json();
    adminPosts.innerHTML = posts
      .map(post => `
        <div class="comment-card">
          <div class="comment-meta">${escapeHtml(post.authorName)} · ${new Date(post.createdAt).toLocaleString()}</div>
          <div class="comment-text">${escapeHtml(post.text)}</div>
          <button class="button-danger admin-delete-post" data-id="${post.id}">刪除貼文</button>
        </div>
      `)
      .join('');
  } catch (err) {
    setAdminStatus('無法讀取貼文資料。', 'error');
  }
}

async function deleteUser(userId) {
  if (!window.confirm('確定要刪除這位使用者嗎？')) return;
  try {
    const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) {
      setAdminStatus(data.error || '刪除使用者失敗', 'error');
      return;
    }
    setAdminStatus('已刪除使用者', 'success');
    loadUsers();
  } catch (err) {
    setAdminStatus('網路錯誤，請稍後再試。', 'error');
  }
}

async function deletePost(postId) {
  if (!window.confirm('確定要刪除這則貼文嗎？')) return;
  try {
    const response = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) {
      setAdminStatus(data.error || '刪除貼文失敗', 'error');
      return;
    }
    setAdminStatus('已刪除貼文', 'success');
    loadPosts();
  } catch (err) {
    setAdminStatus('網路錯誤，請稍後再試。', 'error');
  }
}

adminContent.addEventListener('click', event => {
  if (event.target.matches('.admin-delete-user')) {
    deleteUser(event.target.dataset.id);
  }
  if (event.target.matches('.admin-delete-post')) {
    deletePost(event.target.dataset.id);
  }
});

loadAdmin();
