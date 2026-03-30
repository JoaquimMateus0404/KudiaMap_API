const state = {
  token: localStorage.getItem('adminToken') || '',
  page: 1,
  limit: 10,
  totalPages: 1,
};

const refs = {
  tokenInput: document.getElementById('tokenInput'),
  saveTokenBtn: document.getElementById('saveTokenBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  feedback: document.getElementById('feedback'),
  searchInput: document.getElementById('searchInput'),
  statusFilter: document.getElementById('statusFilter'),
  deletedFilter: document.getElementById('deletedFilter'),
  applyFiltersBtn: document.getElementById('applyFiltersBtn'),
  postsTableBody: document.getElementById('postsTableBody'),
  prevPageBtn: document.getElementById('prevPageBtn'),
  nextPageBtn: document.getElementById('nextPageBtn'),
  pageInfo: document.getElementById('pageInfo'),
  statUsers: document.getElementById('statUsers'),
  statStores: document.getElementById('statStores'),
  statProducts: document.getElementById('statProducts'),
  statPostsPublished: document.getElementById('statPostsPublished'),
};

refs.tokenInput.value = state.token;

const setFeedback = (message, type = '') => {
  refs.feedback.className = `feedback ${type}`.trim();
  refs.feedback.textContent = message;
};

const getHeaders = () => {
  if (!state.token) {
    throw new Error('Conecte um token ADMIN para continuar.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${state.token}`,
  };
};

const apiFetch = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...getHeaders(),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Erro HTTP ${response.status}`);
  }

  return data;
};

const loadStats = async () => {
  const data = await apiFetch('/api/admin/stats');
  refs.statUsers.textContent = data.usersTotal;
  refs.statStores.textContent = data.storesTotal;
  refs.statProducts.textContent = data.productsTotal;
  refs.statPostsPublished.textContent = data.posts?.published || 0;
};

const statusTag = (status) => `<span class="tag">${status}</span>`;

const rowActions = (postId) => `
  <div class="actions">
    <button class="btn" data-action="publish" data-id="${postId}">Publicar</button>
    <button class="btn" data-action="archive" data-id="${postId}">Arquivar</button>
    <button class="btn" data-action="restore" data-id="${postId}">Restaurar</button>
    <button class="btn" data-action="delete" data-id="${postId}">Remover</button>
  </div>
`;

const buildQuery = () => {
  const params = new URLSearchParams({
    page: String(state.page),
    limit: String(state.limit),
  });

  const q = refs.searchInput.value.trim();
  const status = refs.statusFilter.value;
  const includeDeleted = refs.deletedFilter.checked;

  if (q) params.set('q', q);
  if (status) params.set('status', status);
  if (includeDeleted) params.set('includeDeleted', 'true');

  return params.toString();
};

const loadPosts = async () => {
  const data = await apiFetch(`/api/admin/posts?${buildQuery()}`);
  state.totalPages = data.pagination.totalPages;

  refs.pageInfo.textContent = `Página ${data.pagination.page} de ${state.totalPages}`;

  refs.postsTableBody.innerHTML = data.items
    .map(
      (item) => `
      <tr>
        <td>${item.title}</td>
        <td>${item.store?.name || '-'}</td>
        <td>${statusTag(item.status)} ${item.isDeleted ? '<span class="tag">DELETED</span>' : ''}</td>
        <td>${new Date(item.createdAt).toLocaleString('pt-PT')}</td>
        <td>${rowActions(item._id)}</td>
      </tr>
    `
    )
    .join('');

  if (!data.items.length) {
    refs.postsTableBody.innerHTML = '<tr><td colspan="5">Nenhum post encontrado.</td></tr>';
  }
};

const moderatePost = async (postId, action) => {
  await apiFetch(`/api/admin/posts/${postId}/moderate`, {
    method: 'PATCH',
    body: JSON.stringify({ action, reason: `Ação ${action} via painel admin` }),
  });
};

const loadDashboard = async () => {
  try {
    setFeedback('Carregando dados...');
    await Promise.all([loadStats(), loadPosts()]);
    setFeedback('Painel atualizado com sucesso.', 'success');
  } catch (error) {
    setFeedback(error.message, 'error');
  }
};

refs.saveTokenBtn.addEventListener('click', () => {
  state.token = refs.tokenInput.value.trim();
  localStorage.setItem('adminToken', state.token);
  state.page = 1;
  loadDashboard();
});

refs.refreshBtn.addEventListener('click', loadDashboard);

refs.applyFiltersBtn.addEventListener('click', () => {
  state.page = 1;
  loadDashboard();
});

refs.prevPageBtn.addEventListener('click', () => {
  if (state.page <= 1) return;
  state.page -= 1;
  loadDashboard();
});

refs.nextPageBtn.addEventListener('click', () => {
  if (state.page >= state.totalPages) return;
  state.page += 1;
  loadDashboard();
});

refs.postsTableBody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const postId = button.getAttribute('data-id');
  const action = button.getAttribute('data-action');

  try {
    await moderatePost(postId, action);
    setFeedback(`Post atualizado: ${action}.`, 'success');
    await loadDashboard();
  } catch (error) {
    setFeedback(error.message, 'error');
  }
});

if (state.token) {
  loadDashboard();
} else {
  setFeedback('Cole um token ADMIN e clique em Conectar para iniciar.');
}