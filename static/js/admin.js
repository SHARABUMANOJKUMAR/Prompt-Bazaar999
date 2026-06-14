/**
 * Admin Dashboard - Prompt Bazaar
 * Handles Prompts and Users dynamic data
 */

// --- Configuration ---
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? window.location.origin
    : "https://prompt-bazaar999.onrender.com";

const GAS_PROMPTS_URL = "https://script.google.com/macros/s/AKfycbx17A9cGKQk70Uf1ysoYqBjjBxfDcyMywNtA7-PaAflmff_hFp9C3mQjS4K7qZk_Wsb/exec";
const GAS_USERS_URL = "https://script.google.com/macros/s/AKfycby92lgxoV3RgYwn6hIj1A7ErMlqXwxAyCSXajDO2Zc4x9a9jR-wnU9DQWdUxdMVDtTn/exec";
const GAS_PAYMENTS_URL = "https://script.google.com/macros/s/AKfycbyifHkwPbUjkptWjhWT--FmcKBivrsJEGarfEALgf6GLY_S-8y8VvtehVSlSjy7DWs_/exec";

const CACHE_TTL = 60 * 1000; // 60 seconds
const REFRESH_INTERVAL = 30 * 1000; // 30 seconds
const PAGE_SIZE = 10;

// --- Global State ---
let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
let sortConfig = { key: 'created_at', direction: 'desc' };
let refreshTimer = null;
let allPrompts = [];

window.editingPromptId = null;

// Charts instances
let revenueChartInstance = null;
let categoryChartInstance = null;
let paymentChartInstance = null;

function convertDriveLink(url) {
    if (!url) return '';
    if (url.includes('lh3.googleusercontent.com') || url.includes('drive.google.com/uc')) {
        return url;
    }
    const regex1 = /\/file\/d\/([a-zA-Z0-9_-]+)/;
    const regex2 = /[?&]id=([a-zA-Z0-9_-]+)/;
    
    let match = url.match(regex1);
    if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    
    match = url.match(regex2);
    if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    
    return url;
}

document.addEventListener('DOMContentLoaded', () => {
    // Navigation Logic
    const navItems = document.querySelectorAll('[data-target]');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            
            // Reset edit state when manually toggling sections
            if (targetId === 'add-prompt' && !window.editingPromptId) {
                const form = document.getElementById('promptForm');
                if (form) form.reset();
                const previewContainer = document.getElementById('image-preview-container');
                if (previewContainer) previewContainer.style.display = 'none';
                
                const header = document.querySelector('#add-prompt h2');
                if (header) header.textContent = 'Add New Prompt';
                
                const submitBtn = document.querySelector('#promptForm button[type="submit"]');
                if (submitBtn) {
                    submitBtn.querySelector('.btn-text').textContent = 'Add Prompt';
                }
            } else if (targetId !== 'add-prompt') {
                window.editingPromptId = null;
            }

            switchSection(targetId);
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Form Submission Binding
    const addPromptForm = document.getElementById('promptForm');
    if (addPromptForm) {
        addPromptForm.addEventListener('submit', submitPromptForm);
    }

    // Image Preview Logic (URL input)
    const imageUrlInput = document.getElementById('image_url');
    if (imageUrlInput) {
        imageUrlInput.addEventListener('input', function () {
            const url = this.value.trim();
            const imagePreview = document.getElementById('image-preview');
            const previewContainer = document.getElementById('image-preview-container');
            if (url) {
                imagePreview.src = convertDriveLink(url);
                previewContainer.style.display = 'block';
            } else {
                previewContainer.style.display = 'none';
            }
        });
    }

    // --- Users Section Event Listeners ---
    const refreshBtn = document.getElementById('refresh-users-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            fetchUsers(true);
            showToast('Refreshing users data...', 'success');
        });
    }

    const searchInput = document.getElementById('user-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            handleSearch(e.target.value);
        });
    }

    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    if (prevPageBtn) prevPageBtn.addEventListener('click', () => changePage(currentPage - 1));
    if (nextPageBtn) nextPageBtn.addEventListener('click', () => changePage(currentPage + 1));

    // Sortable headers
    const headers = document.querySelectorAll('#users-table th.sortable');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const key = header.getAttribute('data-sort');
            handleSort(key);
        });
    });

    // --- Payments Section Event Listeners ---
    const refreshPaymentsBtn = document.getElementById('refresh-payments-btn');
    if (refreshPaymentsBtn) {
        refreshPaymentsBtn.addEventListener('click', () => {
            loadPayments(true);
            showToast('Refreshing payment data...', 'success');
        });
    }

    const paymentSearch = document.getElementById('payment-search');
    if (paymentSearch) {
        paymentSearch.addEventListener('input', (e) => {
            filterPaymentTable(e.target.value);
        });
    }

    // Start Real-time sync
    initRealtimeSync();
});

// --- Core Logic ---

function switchSection(sectionName) {
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(s => s.classList.remove('active'));

    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    if (sectionName === 'manage-prompts') {
        loadPrompts();
    } else if (sectionName === 'users') {
        fetchUsers();
    } else if (sectionName === 'payments') {
        loadPayments();
    }
}

// --- Users Management ---

/**
 * Robust CSV Parser
 */
function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return [];

    // Header mapping (cleaning up potential BOM or whitespace)
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    return lines.slice(1).filter(line => line.trim()).map(line => {
        // Handle commas inside quotes
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        const obj = {};
        headers.forEach((header, index) => {
            let val = values[index] || '';
            // Strip surrounding quotes
            val = val.replace(/^"|"$/g, '');
            obj[header.toLowerCase().replace(/\s+/g, '_')] = val;
        });
        return obj;
    });
}

function fetchUsers(force = true) { syncAdminData(force); }

function processAndRenderUsers() {
    applyFilters();
    applySorting();
    updateUserStats();
    renderUsersTable();
}

function formatSheetDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return sanitize(dateStr);
    
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }) + ' ' + d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function formatDateOnly(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return sanitize(dateStr);
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function handleSearch(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
        filteredUsers = [...allUsers];
    } else {
        filteredUsers = allUsers.filter(u => 
            (u.full_name || '').toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q) ||
            (u.mobile_number || '').toLowerCase().includes(q) ||
            (u.login_provider || '').toLowerCase().includes(q) ||
            (u.user_id || '').toLowerCase().includes(q)
        );
    }
    currentPage = 1;
    renderUsersTable();
}

function handleSort(key) {
    if (sortConfig.key === key) {
        sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortConfig.key = key;
        sortConfig.direction = 'asc';
    }

    // Update UI headers
    document.querySelectorAll('#users-table th.sortable').forEach(th => {
        th.classList.remove('asc', 'desc');
        if (th.getAttribute('data-sort') === key) {
            th.classList.add(sortConfig.direction);
        }
    });

    applySorting();
    renderUsersTable();
}

function applySorting() {
    filteredUsers.sort((a, b) => {
        let valA = a[sortConfig.key] || '';
        let valB = b[sortConfig.key] || '';

        // Handle dates
        if (sortConfig.key === 'created_at' || sortConfig.key === 'last_login' || sortConfig.key === 'updated_at') {
            valA = new Date(valA).getTime() || 0;
            valB = new Date(valB).getTime() || 0;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
}

function applyFilters() {
    filteredUsers = [...allUsers];
}

function renderUsersTable() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageData = filteredUsers.slice(start, end);

    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-secondary">No matching users found</td></tr>';
        updatePaginationInfo(0, 0, 0);
        return;
    }

    tbody.innerHTML = '';
    pageData.forEach(user => {
        const tr = document.createElement('tr');
        
        // Check if user is "new" (registered in the last 24h)
        const rawDate = user.created_at || user.registration_date;
        const regDate = new Date(rawDate);
        const isNew = (new Date() - regDate) < (24 * 60 * 60 * 1000);
        if (isNew) tr.classList.add('row-new');

        tr.innerHTML = `
            <td><code style="background: rgba(13, 110, 253, 0.05); color: var(--color-primary); padding: 4px 8px; border-radius: 6px; font-weight: 600; font-family: monospace; font-size: 0.85rem;">${sanitize(user.user_id || 'N/A')}</code></td>
            <td>
                <div class="d-flex align-items-center" style="display: flex; align-items: center;">
                    <div class="user-avatar-sm mr-3" style="width: 32px; height: 32px; border-radius: 50%; background: var(--color-bg-tertiary); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600; margin-right: 12px; color: var(--color-primary);">
                        ${(user.full_name || 'U')[0].toUpperCase()}
                    </div>
                    <strong>${sanitize(user.full_name || 'Unknown')}</strong>
                </div>
            </td>
            <td>${sanitize(user.email || 'N/A')}</td>
            <td>${sanitize(user.mobile_number || 'N/A')}</td>
            <td><span class="plan-badge ${user.login_provider?.toLowerCase() === 'google' ? 'premium' : ''}">${sanitize(user.login_provider || 'Email')}</span></td>
            <td class="text-secondary">${formatDateOnly(user.created_at)}</td>
            <td class="text-secondary">${formatSheetDate(user.last_login)}</td>
            <td><span class="status-badge ${user.account_status?.toLowerCase() === 'active' ? 'active' : 'pending'}">${sanitize(user.account_status || 'Pending')}</span></td>
            <td>
                <div class="action-group">
                    <button class="btn-icon" title="View" onclick="viewUser('${sanitize(user.user_id)}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>
                    <button class="btn-icon" title="Edit" onclick="editUser('${sanitize(user.user_id)}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                    <button class="btn-icon delete" title="Delete" onclick="deleteUser('${sanitize(user.user_id)}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    updatePaginationInfo(start + 1, Math.min(end, filteredUsers.length), filteredUsers.length);
    renderPaginationBtns();
}

function renderSkeletons(container) {
    container.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><div class="skeleton skeleton-text"></div></td>
            <td><div class="skeleton skeleton-text"></div></td>
            <td><div class="skeleton skeleton-text"></div></td>
            <td><div class="skeleton skeleton-text"></div></td>
            <td><div class="skeleton skeleton-badge"></div></td>
            <td><div class="skeleton skeleton-text"></div></td>
            <td><div class="skeleton skeleton-text"></div></td>
            <td><div class="skeleton skeleton-badge"></div></td>
            <td><div class="skeleton skeleton-text"></div></td>
        `;
        container.appendChild(tr);
    }
}

function updatePaginationInfo(start, end, total) {
    document.getElementById('page-start').textContent = start;
    document.getElementById('page-end').textContent = end;
    document.getElementById('total-results').textContent = total;
}

function renderPaginationBtns() {
    const container = document.getElementById('page-numbers');
    const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
    
    container.innerHTML = '';
    
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;

    // Show limited page numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('div');
        btn.className = `page-number ${i === currentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.addEventListener('click', () => changePage(i));
        container.appendChild(btn);
    }
}

function changePage(page) {
    currentPage = page;
    renderUsersTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateUserStats() {
    const total = allUsers.length;
    const active = allUsers.filter(u => u.account_status?.toLowerCase() === 'active').length;
    const googleUsers = allUsers.filter(u => u.login_provider?.toLowerCase() === 'google').length;
    
    const today = new Date().toLocaleDateString();
    const newToday = allUsers.filter(u => {
        const d = new Date(u.created_at).toLocaleDateString();
        return d === today;
    }).length;

    animateValue('stat-total-users', total);
    animateValue('summary-total-users', total);
    animateValue('stat-active-users', active);
    animateValue('stat-premium-users', googleUsers);
    animateValue('stat-new-today', newToday);
}

// --- Prompts Management ---

function loadPrompts() { renderPromptsTable(); }

async function submitPromptForm(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const originalText = btnText ? btnText.textContent : 'Add Prompt';

    try {
        if (btnText) btnText.textContent = 'Saving...';
        submitBtn.disabled = true;

        if (window.editingPromptId) {
            // Delete old prompt first
            const deleteRes = await fetch(`${API_BASE_URL}/api/admin/prompts/${window.editingPromptId}`, { method: 'DELETE' });
            if (!deleteRes.ok) throw new Error('Failed to update: old prompt deletion failed.');
        }

        const response = await fetch(`${API_BASE_URL}/api/admin/add-prompt`, { method: 'POST', body: formData });
        const result = await response.json();

        if (result.success) {
            // Invalidate prompt gallery cache
            localStorage.removeItem('bazaar_prompts_cache');
            
            showToast(window.editingPromptId ? 'Prompt updated successfully!' : 'Prompt added successfully!', 'success');
            
            // If it is a new prompt (not an edit), send a push notification alert!
            if (!window.editingPromptId) {
                const title = formData.get('title') || 'New Prompt Added!';
                const price = formData.get('price') || '9';
                const image_url = formData.get('image_url') || 'https://prompt-bazaar.web.app/static/images/logo.png';
                const prompt_id = result.prompt_id || '';

                fetch(`${API_BASE_URL}/send-notification`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: title,
                        price: price,
                        image_url: image_url,
                        prompt_id: prompt_id
                    })
                })
                .then(res => res.json())
                .then(notifRes => {
                    console.log("FCM Push notification broadcast result:", notifRes);
                    if (notifRes.success && notifRes.sent_count > 0) {
                        showToast(`Push notification broadcasted to ${notifRes.sent_count} active devices!`, 'success');
                    }
                })
                .catch(err => {
                    console.error("FCM Push notification broadcast failed:", err);
                });
            }

            form.reset();
            const previewContainer = document.getElementById('image-preview-container');
            if (previewContainer) previewContainer.style.display = 'none';
            
            // Reset Edit State
            window.editingPromptId = null;
            const header = document.querySelector('#add-prompt h2');
            if (header) header.textContent = 'Add New Prompt';
            if (btnText) btnText.textContent = 'Add Prompt';
            
            // Switch to manage prompts
            switchSection('manage-prompts');
            document.querySelectorAll('[data-target]').forEach(n => {
                n.classList.remove('active');
                if (n.getAttribute('data-target') === 'manage-prompts') {
                    n.classList.add('active');
                }
            });
        } else {
            showToast(result.message || 'Failed to save prompt', 'error');
            if (btnText) btnText.textContent = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
        if (btnText) btnText.textContent = originalText;
        submitBtn.disabled = false;
    }
}

window.editPrompt = function(id) {
    const prompt = allPrompts.find(p => (p.prompt_id || p.id).toString() === id.toString());
    if (!prompt) return;

    // Prefill form
    document.getElementById('title').value = prompt.title || '';
    document.getElementById('category').value = prompt.category || 'Men';
    document.getElementById('platform').value = prompt.platform || 'ChatGPT';
    document.getElementById('price').value = prompt.price || 2;
    
    const imageUrlInput = document.getElementById('image_url');
    if (imageUrlInput) {
        imageUrlInput.value = prompt.image_url || '';
        imageUrlInput.dispatchEvent(new Event('input')); // trigger image preview
    }
    
    document.getElementById('prompt_text').value = prompt.prompt_text || '';

    // Update form header and submit button text
    window.editingPromptId = id;
    const header = document.querySelector('#add-prompt h2');
    if (header) header.textContent = 'Edit Prompt';
    
    const submitBtn = document.querySelector('#promptForm button[type="submit"]');
    if (submitBtn) {
        const btnText = submitBtn.querySelector('.btn-text');
        if (btnText) btnText.textContent = 'Save Changes';
    }

    // Switch section
    switchSection('add-prompt');
    
    // Set navbar active chip
    document.querySelectorAll('[data-target]').forEach(n => {
        n.classList.remove('active');
        if (n.getAttribute('data-target') === 'add-prompt') {
            n.classList.add('active');
        }
    });
};

async function deletePrompt(id) {
    if (!confirm('Are you sure?')) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/prompts/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        
        // Invalidate prompt gallery cache
        localStorage.removeItem('bazaar_prompts_cache');
        
        showToast('Prompt deleted!', 'success');
        loadPrompts();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// --- Utilities ---

function startAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
        if (document.getElementById('users').classList.contains('active')) {
            fetchUsers(true);
        }
    }, REFRESH_INTERVAL);
}

function animateValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = parseInt(el.textContent) || 0;
    const duration = 1000;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.floor(start + progress * (value - start));
        el.textContent = current.toLocaleString();
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

function sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : ''}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
}

String.prototype.upperCase = function() {
    return this.toUpperCase();
};

// --- Modal Control Helpers ---
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        // Trigger reflow for animation
        modal.offsetHeight;
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

// --- View, Edit, and Delete Users logic ---
function viewUser(userId) {
    const user = allUsers.find(u => u.user_id === userId);
    if (!user) {
        showToast('User not found', 'error');
        return;
    }

    // Populate details
    document.getElementById('view-user-avatar').textContent = (user.full_name || 'U')[0].toUpperCase();
    document.getElementById('view-user-fullname').textContent = user.full_name || 'Unknown';
    
    const providerSpan = document.getElementById('view-user-provider');
    providerSpan.textContent = user.login_provider || 'Email';
    providerSpan.className = `plan-badge ${user.login_provider?.toLowerCase() === 'google' ? 'premium' : ''}`;
    
    document.getElementById('view-user-id').textContent = user.user_id || 'N/A';
    
    const statusSpan = document.getElementById('view-user-status');
    statusSpan.textContent = user.account_status || 'Pending';
    statusSpan.className = `status-badge ${user.account_status?.toLowerCase() === 'active' ? 'active' : 'pending'}`;
    
    document.getElementById('view-user-email').textContent = user.email || 'N/A';
    document.getElementById('view-user-mobile').textContent = user.mobile_number || 'N/A';
    document.getElementById('view-user-joined').textContent = formatDateOnly(user.created_at);
    document.getElementById('view-user-lastlogin').textContent = formatSheetDate(user.last_login);

    openModal('viewUserModal');
}

function editUser(userId) {
    const user = allUsers.find(u => u.user_id === userId);
    if (!user) {
        showToast('User not found', 'error');
        return;
    }

    // Pre-populate input values
    document.getElementById('edit-user-id').value = user.user_id;
    document.getElementById('edit-user-fullname-input').value = user.full_name || '';
    document.getElementById('edit-user-email-input').value = user.email || '';
    document.getElementById('edit-user-mobile-input').value = user.mobile_number || '';
    document.getElementById('edit-user-provider-input').value = user.login_provider || 'Email';
    document.getElementById('edit-user-status-input').value = user.account_status || 'Active';

    openModal('editUserModal');
}

async function saveUserChanges(event) {
    event.preventDefault();

    const saveBtn = document.getElementById('save-user-btn');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';

    const userId = document.getElementById('edit-user-id').value;
    const fullName = document.getElementById('edit-user-fullname-input').value.trim();
    const email = document.getElementById('edit-user-email-input').value.trim();
    const mobileNumber = document.getElementById('edit-user-mobile-input').value.trim();
    const loginProvider = document.getElementById('edit-user-provider-input').value;
    const accountStatus = document.getElementById('edit-user-status-input').value;

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users/edit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                full_name: fullName,
                email: email,
                mobile_number: mobileNumber,
                login_provider: loginProvider,
                account_status: accountStatus
            })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to update user profile details.');
        }

        showToast('User details updated successfully!', 'success');
        closeModal('editUserModal');
        
        // Refresh users list immediately
        fetchUsers(true);
    } catch (err) {
        console.error(err);
        showToast(err.message || 'An error occurred while saving changes.', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

async function deleteUser(userId) {
    const user = allUsers.find(u => u.user_id === userId);
    if (!user) {
        showToast('User not found', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to permanently delete user "${user.full_name || 'Unknown'}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users/delete/${userId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to delete user.');
        }

        showToast('User deleted successfully!', 'success');
        
        // Refresh users list immediately
        fetchUsers(true);
    } catch (err) {
        console.error(err);
        showToast(err.message || 'An error occurred while deleting user.', 'error');
    }
}

// ===========================================================
// --- PAYMENTS MANAGEMENT ---
// ===========================================================



function loadPayments(forceRefresh = false) { syncAdminData(forceRefresh); }

function renderPaymentsTable(payments) {
    const tbody = document.getElementById('payments-table-body');
    if (!tbody) return;

    if (!payments || payments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 60px; color: var(--color-secondary);">No payments found.</td></tr>`;
        return;
    }

    tbody.innerHTML = payments.map(p => {
        const statusColor = (p.payment_status || '').toLowerCase() === 'success' ? 'var(--color-success)' : '#ef4444';
        const statusLabel = p.payment_status || 'Unknown';
        const shortPayId = p.payment_id ? p.payment_id.slice(0, 20) + (p.payment_id.length > 20 ? '…' : '') : 'N/A';
        const amount = parseFloat(p.amount || 0);
        const dateStr = p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}) : (p.date || 'N/A');

        return `
            <tr>
                <td style="font-family: monospace; font-size: 0.8rem;">
                    <code title="${p.payment_id || ''}" style="background: rgba(13,110,253,0.05); padding: 3px 7px; border-radius: 4px; color: var(--color-primary); font-size: 0.78rem;">${shortPayId}</code>
                </td>
                <td style="font-size: 0.875rem;">${p.user_email || p.user_id || 'N/A'}</td>
                <td style="font-size: 0.875rem; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.prompt_title || ''}">${p.prompt_title || 'N/A'}</td>
                <td><strong style="color: var(--color-success);">₹${isNaN(amount) ? p.amount : amount.toFixed(2)}</strong></td>
                <td><span style="background: rgba(13,110,253,0.08); color: var(--color-primary); padding: 2px 10px; border-radius: 12px; font-size: 0.78rem; font-weight: 600;">${p.payment_method || 'Razorpay'}</span></td>
                <td><span style="color: ${statusColor}; font-weight: 600;">${statusLabel}</span></td>
                <td style="font-size: 0.85rem; color: var(--color-secondary);">${dateStr}</td>
            </tr>
        `;
    }).join('');
}

function updatePaymentSummaryCards(payments) {
    const totalRevEl = document.getElementById('admin-total-revenue');
    const totalTxnEl = document.getElementById('admin-total-txns');
    const avgOrderEl = document.getElementById('admin-avg-order');

    if (!payments || payments.length === 0) {
        if (totalRevEl) totalRevEl.textContent = '₹0';
        if (totalTxnEl) totalTxnEl.textContent = '0';
        if (avgOrderEl) avgOrderEl.textContent = '₹0';
        return;
    }

    const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const avgOrder = payments.length > 0 ? totalRevenue / payments.length : 0;

    if (totalRevEl) totalRevEl.textContent = `₹${totalRevenue.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (totalTxnEl) totalTxnEl.textContent = payments.length.toLocaleString('en-IN');
    if (avgOrderEl) avgOrderEl.textContent = `₹${avgOrder.toFixed(2)}`;

    // Also update dashboard summary revenue card
    const summaryRevEl = document.getElementById('summary-total-revenue');
    if (summaryRevEl) summaryRevEl.textContent = `₹${totalRevenue.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    const summaryTxnEl = document.getElementById('summary-total-sales');
    if (summaryTxnEl) summaryTxnEl.textContent = payments.length.toLocaleString('en-IN');
}

function filterPaymentTable(query) {
    if (!query || !query.trim()) {
        filteredPayments = [...allPayments];
    } else {
        const q = query.toLowerCase();
        filteredPayments = allPayments.filter(p =>
            (p.payment_id || '').toLowerCase().includes(q) ||
            (p.user_email || '').toLowerCase().includes(q) ||
            (p.prompt_title || '').toLowerCase().includes(q) ||
            (p.user_id || '').toLowerCase().includes(q)
        );
    }
    renderPaymentsTable(filteredPayments);
}

// ===========================================================
// --- DATA SYNC FRAMEWORK ---
// ===========================================================

async function initRealtimeSync() {
    // 1. Try to load from cache first
    const cachedData = localStorage.getItem('admin_portal_cache');
    const cacheTime = localStorage.getItem('admin_portal_cache_time');
    
    if (cachedData && cacheTime && (Date.now() - parseInt(cacheTime)) < CACHE_TTL) {
        const data = JSON.parse(cachedData);
        allUsers = data.users || [];
        allPrompts = data.prompts || [];
        allPayments = data.payments || [];
        
        filteredUsers = [...allUsers];
        filteredPayments = [...allPayments];
        
        updateAllUI();
        updateLastSyncTime(parseInt(cacheTime));
    }

    // 2. Fetch fresh data in background
    await syncAdminData();

    // 3. Start 30s polling
    setInterval(() => syncAdminData(false), REFRESH_INTERVAL);
}

async function syncAdminData(showLoader = false) {
    const syncBadge = document.getElementById('sync-badge');
    if (syncBadge) syncBadge.style.opacity = '1';

    if (showLoader) {
        renderSkeletons(document.getElementById('users-table-body'));
        document.getElementById('prompts-table-body').innerHTML = '<tr><td colspan="8" class="text-center">Syncing data...</td></tr>';
        document.getElementById('payments-table-body').innerHTML = '<tr><td colspan="7" class="text-center">Syncing data...</td></tr>';
    }

    try {
        // Dynamically import the centralized sheets API module to handle fallbacks
        const { fetchAllData } = await import('/static/js/sheets-api.js');
        const data = await fetchAllData(showLoader);

        allUsers = data.users || [];
        allPrompts = data.prompts || [];
        allPayments = data.payments || [];
        
        filteredUsers = [...allUsers];
        filteredPayments = [...allPayments];

        // Cache the data
        localStorage.setItem('admin_portal_cache', JSON.stringify({
            users: allUsers,
            prompts: allPrompts,
            payments: allPayments
        }));
        localStorage.setItem('admin_portal_cache_time', Date.now().toString());

        updateAllUI();
        updateLastSyncTime(Date.now());
        
    } catch (err) {
        console.error('Real-time sync failed:', err);
        showToast(`Failed to refresh data: ${err.message}`, 'error');
    } finally {
        if (syncBadge) syncBadge.style.opacity = '0';
    }
}

function updateLastSyncTime(timestamp) {
    const el = document.getElementById('last-updated-time');
    if (el) {
        const d = new Date(timestamp);
        el.textContent = `Last Updated: ${d.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', second:'2-digit'})}`;
    }
}

function updateAllUI() {
    // 1. Users UI
    processAndRenderUsers();
    
    // 2. Prompts UI
    renderPromptsTable();
    
    // 3. Payments UI
    renderPaymentsTable(filteredPayments);
    updatePaymentSummaryCards(allPayments);
    
    // 4. Dashboard KPIs & Analytics
    updateDashboardKPIs();
    renderAnalyticsCharts();
}

// ===========================================================
// --- DASHBOARD & ANALYTICS ---
// ===========================================================

function updateDashboardKPIs() {
    const totalPrompts = allPrompts.length;
    animateValue('summary-total-prompts', totalPrompts);
}

function renderAnalyticsCharts() {
    if (typeof Chart === 'undefined') return;

    // 1. Revenue Trend Data (Last 7 Days)
    const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
    });
    
    // Group payments by day for real data
    const revenueByDay = new Array(7).fill(0);
    const todayStr = new Date().toDateString();
    allPayments.forEach(p => {
        if (!p.created_at && !p.date) return;
        const pDate = new Date(p.created_at || p.date);
        const diffTime = Math.abs(new Date() - pDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if (diffDays <= 7 && diffDays >= 1) {
            revenueByDay[7 - diffDays] += parseFloat(p.amount || 0);
        } else if (pDate.toDateString() === todayStr) {
            revenueByDay[6] += parseFloat(p.amount || 0);
        }
    });

    const ctxTrend = document.getElementById('revenueTrendChart');
    if (ctxTrend) {
        if (revenueChartInstance) revenueChartInstance.destroy();
        revenueChartInstance = new Chart(ctxTrend, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'Revenue (₹)',
                    data: revenueByDay,
                    borderColor: '#0ea5e9',
                    backgroundColor: 'rgba(14, 165, 233, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // 2. Payment Success Rate
    const ctxStatus = document.getElementById('paymentStatusChart');
    if (ctxStatus) {
        const successCount = allPayments.filter(p => (p.payment_status||'').toLowerCase() === 'success').length;
        const failCount = allPayments.length - successCount;
        
        if (paymentChartInstance) paymentChartInstance.destroy();
        paymentChartInstance = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: ['Success', 'Failed'],
                datasets: [{
                    data: [successCount, failCount],
                    backgroundColor: ['#10b981', '#ef4444']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '75%' }
        });
    }

    // 3. Category Sales & Top Prompts
    const categorySales = {};
    const promptSales = {};

    allPayments.forEach(p => {
        if ((p.payment_status||'').toLowerCase() === 'success') {
            const amount = parseFloat(p.amount || 0);
            
            // Map prompt title to category
            const prompt = allPrompts.find(pr => pr.title === p.prompt_title);
            const category = prompt ? prompt.category : 'Other';
            categorySales[category] = (categorySales[category] || 0) + 1;

            // Track prompt revenue
            if (p.prompt_title) {
                if (!promptSales[p.prompt_title]) promptSales[p.prompt_title] = { count: 0, rev: 0 };
                promptSales[p.prompt_title].count += 1;
                promptSales[p.prompt_title].rev += amount;
            }
        }
    });

    const categories = Object.keys(categorySales);
    const catData = Object.values(categorySales);

    const ctxCategory = document.getElementById('categorySalesChart');
    if (ctxCategory) {
        if (categoryChartInstance) categoryChartInstance.destroy();
        categoryChartInstance = new Chart(ctxCategory, {
            type: 'bar',
            data: {
                labels: categories.length > 0 ? categories : ['Men', 'Women', 'Business', 'Midjourney', 'ChatGPT'],
                datasets: [{
                    label: 'Sales',
                    data: catData.length > 0 ? catData : [0, 0, 0, 0, 0],
                    backgroundColor: '#8b5cf6'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    
    // Top Selling Prompts Table
    const topPromptsBody = document.getElementById('top-prompts-body');
    if (topPromptsBody) {
        const sortedPrompts = Object.entries(promptSales).sort((a, b) => b[1].rev - a[1].rev).slice(0, 5);
        if (sortedPrompts.length > 0) {
            topPromptsBody.innerHTML = sortedPrompts.map(([title, stats]) => `
                <tr>
                    <td><strong>${sanitize(title)}</strong></td>
                    <td><span class="badge" style="background:rgba(139, 92, 246, 0.1); color:#8b5cf6;">${stats.count}</span></td>
                    <td><strong style="color:var(--color-success)">₹${stats.rev.toFixed(2)}</strong></td>
                </tr>
            `).join('');
        } else {
            topPromptsBody.innerHTML = '<tr><td colspan="3" class="text-center text-secondary">No successful sales yet.</td></tr>';
        }
    }

    // 4. Update Analytics Stats
    const totalRev = allPayments.reduce((sum, p) => sum + parseFloat(p.amount||0), 0);
    const avgOrder = allPayments.length > 0 ? totalRev / allPayments.length : 0;
    
    const avgOrderEl = document.getElementById('analytics-avg-order-2');
    if (avgOrderEl) avgOrderEl.textContent = `₹${avgOrder.toFixed(2)}`;
    
    // Mock growth for now
    const revGrowthEl = document.getElementById('analytics-revenue-growth');
    if (revGrowthEl) revGrowthEl.textContent = '+14.5%';
    
    const convRateEl = document.getElementById('analytics-conversion-rate');
    if (convRateEl) convRateEl.textContent = '3.2%';
}

function renderPromptsTable() {
    const tbody = document.getElementById('prompts-table-body');
    if (!tbody) return;

    if (allPrompts.length > 0) {
        tbody.innerHTML = '';
        allPrompts.forEach(prompt => {
            const tr = document.createElement('tr');
            const promptTextRaw = prompt.prompt_text || '';
            const preview = promptTextRaw.length > 80 ? promptTextRaw.substring(0, 80) + '...' : promptTextRaw;

            tr.innerHTML = `
                <td><img src="${convertDriveLink(prompt.image_url) || 'https://via.placeholder.com/40'}" class="table-img" alt="Thumbnail"></td>
                <td><strong>${sanitize(prompt.title)}</strong></td>
                <td>${sanitize(prompt.category)}</td>
                <td>${sanitize(prompt.platform)}</td>
                <td><span class="price-badge" style="position:static">₹${prompt.price}</span></td>
                <td class="text-secondary" style="font-size: 0.85rem; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${sanitize(preview)}
                </td>
                <td>${prompt.created_at || new Date().toLocaleDateString()}</td>
                <td>
                    <div class="action-group">
                        <button class="btn-icon" onclick="editPrompt('${prompt.prompt_id || prompt.id}')" title="Edit"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="16 3 21 8 8 21 3 21 3 16 16 3"></polygon></svg></button>
                        <button class="btn-icon delete" onclick="deletePrompt('${prompt.prompt_id || prompt.id}')" title="Delete"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-secondary">No prompts found</td></tr>';
    }
}
