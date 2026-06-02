const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showLoginBtn = document.getElementById('showLoginBtn');
const showRegisterBtn = document.getElementById('showRegisterBtn');
const userPanel = document.getElementById('userPanel');
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const logoutBtn = document.getElementById('logoutBtn');
const adminLink = document.getElementById('adminLink');
const shareSection = document.getElementById('shareSection');
const loginRequired = document.getElementById('loginRequired');
const form = document.getElementById('shareForm');
const postsContainer = document.getElementById('posts');
const statusEl = document.getElementById('status');
const loginStatus = document.getElementById('loginStatus');
const registerStatus = document.getElementById('registerStatus');

let currentUser = null;

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

async function loadCurrentUser() {
  try {
    const response = await fetch('/api/users/me');
    const data = await response.json();
    currentUser = data.user;
    updateAuthUI();
  } catch (err) {
    currentUser = null;
    updateAuthUI();
  }
}

function updateAuthUI() {
  if (currentUser) {
    userPanel.classList.remove('hidden');
    shareSection.classList.remove('hidden');
    loginRequired.classList.add('hidden');
    document.getElementById('authForms').classList.add('hidden');
    userName.textContent = currentUser.name;
    userRole.textContent = currentUser.role;
    adminLink.classList.toggle('hidden', currentUser.role !== 'admin');
  } else {
    userPanel.classList.add('hidden');
    shareSection.classList.add('hidden');
    loginRequired.classList.remove('hidden');
    document.getElementById('authForms').classList.remove('hidden');
    setActiveTab(true);
  }
}

async function loadPosts() {
  try {
    const response = await fetch('/api/posts');
    const posts = await response.json();
    renderPosts(posts);
  } catch (err) {
    postsContainer.innerHTML = '<p class="error">無法載入貼文，請稍後再試。</p>';
  }
}

function renderPosts(posts) {
  if (!posts.length) {
    postsContainer.innerHTML = '<p class="empty">尚未有貼文，快來分享第一則文章！</p>';
    return;
  }

  postsContainer.innerHTML = posts
    .map(post => {
      const imageHtml = post.image
        ? `<div class="post-image"><img src="${post.image}" alt="貼文圖片" /></div>`
        : '';

      const canManage = currentUser && (currentUser.role === 'admin' || currentUser.id === post.authorId);
      const actionsHtml = canManage
        ? `<div class="post-actions">
            <button type="button" class="button-secondary edit-post" data-id="${post.id}">編輯</button>
            <button type="button" class="button-danger delete-post" data-id="${post.id}">刪除</button>
          </div>`
        : '';

      const commentsHtml = (post.comments || []).map(comment => {
        const canDeleteComment = currentUser && (currentUser.role === 'admin' || currentUser.id === comment.authorId);
        return `
          <div class="comment-card">
            <div class="comment-meta">${escapeHtml(comment.authorName)} · ${new Date(comment.createdAt).toLocaleString()}</div>
            <div class="comment-text">${escapeHtml(comment.text)}</div>
            ${canDeleteComment ? `<button type="button" class="button-danger delete-comment" data-post-id="${post.id}" data-comment-id="${comment.id}">刪除留言</button>` : ''}
          </div>
        `;
      }).join('');

      const commentFormHtml = currentUser
        ? `<form class="comment-form" data-post-id="${post.id}">
             <label>留言</label>
             <textarea name="text" rows="2" placeholder="寫下你的留言..." required></textarea>
             <button type="submit">送出留言</button>
           </form>`
        : '<p class="empty">請登入後才能留言。</p>';

      return `
        <article class="post-card">
          <div class="post-meta">${escapeHtml(post.authorName)} · ${new Date(post.createdAt).toLocaleString()}</div>
          <div class="post-text">${escapeHtml(post.text)}</div>
          ${imageHtml}
          ${actionsHtml}
          <div class="comment-list">
            ${commentsHtml}
          </div>
          ${commentFormHtml}
        </article>
      `;
    })
    .join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br>');
}

async function loginUser(event) {
  event.preventDefault();
  loginStatus.textContent = '';
  const formData = new FormData(loginForm);

  try {
    const response = await fetch('/api/users/login', {
      method: 'POST',
      body: new URLSearchParams(formData)
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(loginStatus, data.error || '登入失敗', 'error');
      return;
    }
    currentUser = data.user;
    updateAuthUI();
    setStatus(loginStatus, '登入成功！', 'success');
    loginForm.reset();
    loadPosts();
  } catch (err) {
    setStatus(loginStatus, '網路錯誤，請稍後再試。', 'error');
  }
}

async function registerUser(event) {
  event.preventDefault();
  registerStatus.textContent = '';
  const formData = new FormData(registerForm);

  try {
    const response = await fetch('/api/users/register', {
      method: 'POST',
      body: new URLSearchParams(formData)
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(registerStatus, data.error || '註冊失敗', 'error');
      return;
    }
    currentUser = data.user;
    updateAuthUI();
    setStatus(registerStatus, '註冊成功！', 'success');
    registerForm.reset();
    loadPosts();
  } catch (err) {
    setStatus(registerStatus, '網路錯誤，請稍後再試。', 'error');
  }
}

async function logoutUser() {
  try {
    await fetch('/api/users/logout', { method: 'POST' });
  } catch (err) {
    // ignore
  }
  currentUser = null;
  updateAuthUI();
  loadPosts();
}

async function submitPost(event) {
  event.preventDefault();
  clearStatus();
  const formData = new FormData(form);

  try {
    const response = await fetch('/api/posts', {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(statusEl, data.error || '貼文送出失敗。', 'error');
      return;
    }
    form.reset();
    setStatus(statusEl, '分享成功！', 'success');
    loadPosts();
  } catch (err) {
    setStatus(statusEl, '網路錯誤，請稍後再試。', 'error');
  }
}

async function handleEditPost(postId, currentText) {
  const text = window.prompt('編輯貼文內容', currentText);
  if (text === null) return;
  const trimmed = text.trim();
  if (!trimmed) {
    return alert('貼文內容不可為空');
  }

  try {
    const response = await fetch(`/api/posts/${postId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed })
    });
    const data = await response.json();
    if (!response.ok) {
      return alert(data.error || '無法更新貼文');
    }
    loadPosts();
  } catch (err) {
    alert('網路錯誤，請稍後再試。');
  }
}

async function handleDeletePost(postId) {
  if (!window.confirm('確定要刪除這則貼文嗎？')) return;
  try {
    const response = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) {
      return alert(data.error || '刪除失敗');
    }
    loadPosts();
  } catch (err) {
    alert('網路錯誤，請稍後再試。');
  }
}

async function handleAddComment(postId, textArea) {
  const text = (textArea.value || '').trim();
  if (!text) {
    return alert('留言內容不可為空');
  }

  try {
    const response = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await response.json();
    if (!response.ok) {
      return alert(data.error || '無法新增留言');
    }
    textArea.value = '';
    loadPosts();
  } catch (err) {
    alert('網路錯誤，請稍後再試。');
  }
}

async function handleDeleteComment(postId, commentId) {
  if (!window.confirm('確定要刪除這則留言嗎？')) return;
  try {
    const response = await fetch(`/api/posts/${postId}/comments/${commentId}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) {
      return alert(data.error || '刪除失敗');
    }
    loadPosts();
  } catch (err) {
    alert('網路錯誤，請稍後再試。');
  }
}

postsContainer.addEventListener('click', event => {
  if (event.target.matches('.edit-post')) {
    const postId = event.target.dataset.id;
    const postCard = event.target.closest('.post-card');
    const currentText = postCard.querySelector('.post-text').textContent;
    handleEditPost(postId, currentText);
  }

  if (event.target.matches('.delete-post')) {
    handleDeletePost(event.target.dataset.id);
  }

  if (event.target.matches('.delete-comment')) {
    handleDeleteComment(event.target.dataset.postId, event.target.dataset.commentId);
  }
});

postsContainer.addEventListener('submit', event => {
  if (!event.target.matches('.comment-form')) return;
  event.preventDefault();
  const postId = event.target.dataset.postId;
  const textArea = event.target.querySelector('textarea[name="text"]');
  handleAddComment(postId, textArea);
});

showLoginBtn.addEventListener('click', () => setActiveTab(true));
showRegisterBtn.addEventListener('click', () => setActiveTab(false));
loginForm.addEventListener('submit', loginUser);
registerForm.addEventListener('submit', registerUser);
logoutBtn.addEventListener('click', logoutUser);
form.addEventListener('submit', submitPost);

loadCurrentUser();
loadPosts();
