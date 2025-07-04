// NoticeBoard Backend Configuration
const GRAPHQL_ENDPOINT = 'https://3gaukjf6ezdkdl3eisa4ufpka4.appsync-api.us-east-1.amazonaws.com/graphql';
const API_KEY = 'da2-ewcwzm2sw5fxlen46lmrzipz7m';

// GraphQL API Helper Function
async function graphqlRequest(query, variables = {}) {
    try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            },
            body: JSON.stringify({
                query,
                variables
            })
        });
        
        const result = await response.json();
        if (result.errors) {
            console.error('GraphQL Errors:', result.errors);
            throw new Error(result.errors[0].message);
        }
        return result.data;
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
}

// Fetch Real Notices from Database
async function fetchNoticesFromDB() {
    const query = `
        query ListNotices {
            listNotices {
                items {
                    id
                    title
                    content
                    category
                    priority
                    author
                    source
                    isPinned
                    requiresSignature
                    createdAt
                    expiresAt
                    tags
                }
            }
        }
    `;
    
    try {
        const data = await graphqlRequest(query);
        return data.listNotices.items;
    } catch (error) {
        console.error('Failed to fetch notices:', error);
        return []; // Fallback to empty array
    }
}

// Create New Notice in Database
async function createNoticeInDB(noticeData) {
    const mutation = `
        mutation CreateNotice($input: CreateNoticeInput!) {
            createNotice(input: $input) {
                id
                title
                content
                category
                priority
                author
                source
                isPinned
                requiresSignature
                createdAt
                expiresAt
                tags
            }
        }
    `;
    
    const variables = {
        input: noticeData
    };
    
    try {
        const data = await graphqlRequest(mutation, variables);
        return data.createNotice;
    } catch (error) {
        console.error('Failed to create notice:', error);
        throw error;
    }
}

// Create Signature in Database
async function createSignatureInDB(signatureData) {
    const mutation = `
        mutation CreateSignature($input: CreateSignatureInput!) {
            createSignature(input: $input) {
                id
                noticeId
                userId
                userName
                timestamp
            }
        }
    `;
    
    const variables = {
        input: signatureData
    };
    
    try {
        const data = await graphqlRequest(mutation, variables);
        return data.createSignature;
    } catch (error) {
        console.error('Failed to create signature:', error);
        throw error;
    }
}

// Fetch Signatures for a Notice
async function fetchSignaturesForNotice(noticeId) {
    const query = `
        query ListSignatures($filter: ModelSignatureFilterInput) {
            listSignatures(filter: $filter) {
                items {
                    id
                    noticeId
                    userId
                    userName
                    timestamp
                }
            }
        }
    `;
    
    const variables = {
        filter: {
            noticeId: {
                eq: noticeId
            }
        }
    };
    
    try {
        const data = await graphqlRequest(query, variables);
        return data.listSignatures.items;
    } catch (error) {
        console.error('Failed to fetch signatures:', error);
        return [];
    }
}

// Notice Management Class
class NoticeManager {
    constructor() {
        this.notices = [];
        this.signatures = new Map(); // Store signatures by noticeId
        this.currentUser = this.getCurrentUser();
        this.init();
    }
    
    getCurrentUser() {
        // Get current user info (you can customize this)
        return {
            id: 'user-' + Math.random().toString(36).substr(2, 9),
            name: 'Current User' // You can make this dynamic
        };
    }
    
    async init() {
        this.showLoadingState();
        await this.loadNotices();
        await this.loadAllSignatures();
        this.render();
        this.setupEventListeners();
        this.hideLoadingState();
    }
    
    showLoadingState() {
        const container = document.getElementById('notices-container');
        if (container) {
            container.innerHTML = '<div class="loading">Loading notices from database...</div>';
        }
    }
    
    hideLoadingState() {
        // Loading state will be replaced by render()
    }
    
    async loadNotices() {
        try {
            this.notices = await fetchNoticesFromDB();
            console.log('Loaded notices from database:', this.notices);
            
            // Sort notices: pinned first, then by creation date
            this.notices.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
        } catch (error) {
            console.error('Failed to load notices:', error);
            this.notices = this.getSampleNotices();
        }
    }
    
    async loadAllSignatures() {
        // Load signatures for all notices
        for (const notice of this.notices) {
            if (notice.requiresSignature) {
                const signatures = await fetchSignaturesForNotice(notice.id);
                this.signatures.set(notice.id, signatures);
            }
        }
    }
    
    async addNotice(noticeData) {
        try {
            // Prepare data for database
            const dbNoticeData = {
                title: noticeData.title,
                content: noticeData.content,
                category: noticeData.category,
                priority: noticeData.priority,
                author: noticeData.author,
                source: noticeData.source || 'Web Interface',
                isPinned: noticeData.isPinned || false,
                requiresSignature: noticeData.requiresSignature || false,
                tags: noticeData.tags || []
            };
            
            if (noticeData.expiresAt) {
                dbNoticeData.expiresAt = noticeData.expiresAt;
            }
            
            // Create notice in database
            const newNotice = await createNoticeInDB(dbNoticeData);
            
            // Add to local array
            this.notices.unshift(newNotice);
            
            // Re-render
            this.render();
            
            console.log('Notice created successfully:', newNotice);
            return newNotice;
        } catch (error) {
            console.error('Failed to create notice:', error);
            alert('Failed to create notice. Please try again.');
            throw error;
        }
    }
    
    async signNotice(noticeId) {
        try {
            const signatureData = {
                noticeId: noticeId,
                userId: this.currentUser.id,
                userName: this.currentUser.name,
                timestamp: new Date().toISOString()
            };
            
            // Create signature in database
            const newSignature = await createSignatureInDB(signatureData);
            
            // Update local signatures
            if (!this.signatures.has(noticeId)) {
                this.signatures.set(noticeId, []);
            }
            this.signatures.get(noticeId).push(newSignature);
            
            // Re-render
            this.render();
            
            console.log('Signature created successfully:', newSignature);
            return newSignature;
        } catch (error) {
            console.error('Failed to sign notice:', error);
            alert('Failed to sign notice. Please try again.');
            throw error;
        }
    }
    
    hasUserSigned(noticeId) {
        const signatures = this.signatures.get(noticeId) || [];
        return signatures.some(sig => sig.userId === this.currentUser.id);
    }
    
    getSignatureCount(noticeId) {
        const signatures = this.signatures.get(noticeId) || [];
        return signatures.length;
    }
    
    render() {
        const container = document.getElementById('notices-container');
        if (!container) return;
        
        if (this.notices.length === 0) {
            container.innerHTML = `
                <div class="no-notices">
                    <h3>No notices available</h3>
                    <p>Create your first notice using the form above.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.notices.map(notice => this.renderNotice(notice)).join('');
    }
    
    renderNotice(notice) {
        const isExpired = notice.expiresAt && new Date(notice.expiresAt) < new Date();
        const signatureCount = this.getSignatureCount(notice.id);
        const hasUserSigned = this.hasUserSigned(notice.id);
        const tagsHtml = notice.tags && notice.tags.length > 0 
            ? notice.tags.map(tag => `<span class="tag">${tag}</span>`).join('') 
            : '';
        
        return `
            <div class="notice ${notice.isPinned ? 'pinned' : ''} ${isExpired ? 'expired' : ''} priority-${notice.priority?.toLowerCase()}">
                <div class="notice-header">
                    <div class="notice-title-section">
                        ${notice.isPinned ? '<span class="pin-icon">📌</span>' : ''}
                        <h3 class="notice-title">${this.escapeHtml(notice.title)}</h3>
                        <span class="priority-badge priority-${notice.priority?.toLowerCase()}">${notice.priority}</span>
                    </div>
                    <div class="notice-meta">
                        <span class="category">${notice.category}</span>
                        <span class="source">${notice.source}</span>
                    </div>
                </div>
                
                <div class="notice-content">
                    <p>${this.escapeHtml(notice.content)}</p>
                </div>
                
                <div class="notice-footer">
                    <div class="notice-info">
                        <span class="author">By: ${this.escapeHtml(notice.author)}</span>
                        <span class="date">${this.formatDate(notice.createdAt)}</span>
                        ${notice.expiresAt ? `<span class="expires">Expires: ${this.formatDate(notice.expiresAt)}</span>` : ''}
                    </div>
                    
                    ${tagsHtml ? `<div class="tags">${tagsHtml}</div>` : ''}
                    
                    ${notice.requiresSignature ? `
                        <div class="signature-section">
                            <div class="signature-info">
                                <span class="signature-count">${signatureCount} signature${signatureCount !== 1 ? 's' : ''}</span>
                                ${hasUserSigned ? '<span class="signed-indicator">✓ You have signed this</span>' : ''}
                            </div>
                            ${!hasUserSigned && !isExpired ? `
                                <button class="sign-btn" onclick="noticeManager.signNotice('${notice.id}')">
                                    Sign Notice
                                </button>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        const form = document.getElementById('notice-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(form);
                const noticeData = {
                    title: formData.get('title'),
                    content: formData.get('content'),
                    category: formData.get('category'),
                    priority: formData.get('priority'),
                    author: formData.get('author'),
                    source: formData.get('source') || 'Web Interface',
                    isPinned: formData.has('isPinned'),
                    requiresSignature: formData.has('requiresSignature'),
                    tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()) : []
                };
                
                const expiresAt = formData.get('expiresAt');
                if (expiresAt) {
                    noticeData.expiresAt = new Date(expiresAt).toISOString();
                }
                
                try {
                    await this.addNotice(noticeData);
                    form.reset();
                } catch (error) {
                    // Error already handled in addNotice
                }
            });
        }
        
        // Filter functionality
        const categoryFilter = document.getElementById('category-filter');
        const priorityFilter = document.getElementById('priority-filter');
        const searchInput = document.getElementById('search-input');
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.applyFilters());
        }
        if (priorityFilter) {
            priorityFilter.addEventListener('change', () => this.applyFilters());
        }
        if (searchInput) {
            searchInput.addEventListener('input', () => this.applyFilters());
        }
    }
    
    applyFilters() {
        const categoryFilter = document.getElementById('category-filter')?.value;
        const priorityFilter = document.getElementById('priority-filter')?.value;
        const searchTerm = document.getElementById('search-input')?.value.toLowerCase();
        
        const notices = document.querySelectorAll('.notice');
        notices.forEach(notice => {
            const noticeData = this.notices.find(n => notice.innerHTML.includes(n.id));
            if (!noticeData) return;
            
            let show = true;
            
            // Category filter
            if (categoryFilter && categoryFilter !== 'all' && noticeData.category !== categoryFilter) {
                show = false;
            }
            
            // Priority filter
            if (priorityFilter && priorityFilter !== 'all' && noticeData.priority !== priorityFilter) {
                show = false;
            }
            
            // Search filter
            if (searchTerm && !noticeData.title.toLowerCase().includes(searchTerm) && 
                !noticeData.content.toLowerCase().includes(searchTerm)) {
                show = false;
            }
            
            notice.style.display = show ? 'block' : 'none';
        });
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    getSampleNotices() {
        return [
            {
                id: 'sample-1',
                title: 'Sample Notice (Offline Mode)',
                content: 'This is sample data. Backend connection failed, but the app still works!',
                category: 'System',
                priority: 'Low',
                author: 'System',
                source: 'Fallback',
                isPinned: false,
                requiresSignature: false,
                createdAt: new Date().toISOString(),
                tags: ['sample', 'offline']
            }
        ];
    }
}

// Initialize NoticeBoard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.noticeManager = new NoticeManager();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NoticeManager };
}
