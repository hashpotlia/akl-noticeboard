// AWS Backend Integration - ADD THIS AT THE TOP
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
        return [];
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

// Create Signature in Database (CORRECT RELATIONSHIP FIELDS)
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
    
    // Generate a unique ID
    const uniqueId = 'sig-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    const variables = {
        input: {
            id: uniqueId,
            noticeId: signatureData.noticeId,     // Regular field (lowercase d)
            noticeID: signatureData.noticeId,     // Relationship field (uppercase D) - THIS WAS MISSING!
            userId: signatureData.userId,
            userName: signatureData.userName,
            timestamp: signatureData.timestamp
        }
    };
    
    console.log('Creating signature with both noticeId fields:', variables);
    
    try {
        const data = await graphqlRequest(mutation, variables);
        console.log('Signature created successfully with relationship:', data);
        return data.createSignature;
    } catch (error) {
        console.error('Signature creation failed:', error);
        console.error('Input data was:', variables);
        throw error;
    }
}





// AKL NoticeBoard - Complete Application Logic
class AKLNoticeBoard {
    constructor() {
        this.notices = [];
        this.signatures = new Map();
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.currentUser = this.getCurrentUser();
        this.autoRefreshInterval = null;
        this.isAdmin = false;
        this.apiEndpoint = 'https://api.github.com/repos/your-username/akl-noticeboard-data/contents/notices.json';
        
        this.init();
    }

    // Initialize the application
    async init() {
        console.log('🚀 Initializing AKL NoticeBoard...');
        
        this.setupEventListeners();
        await this.loadData();
        this.render();
        this.startAutoRefresh();
        
        console.log('✅ AKL NoticeBoard initialized successfully');
    }

    // Get current user (in production, this would come from authentication)
    getCurrentUser() {
        return {
            id: 'user_' + Math.random().toString(36).substr(2, 9),
            name: localStorage.getItem('akl_user_name') || 'DCO Tech',
            email: localStorage.getItem('akl_user_email') || 'dco.tech@amazon.com',
            role: localStorage.getItem('akl_user_role') || 'technician'
        };
    }

    // Setup all event listeners
    setupEventListeners() {
        // Navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.setFilter(filter);
            });
        });

        // Search functionality
        const searchInput = document.getElementById('search-notices');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.render();
            });
        }

        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileNav = document.getElementById('mobile-nav');
        if (mobileMenuBtn && mobileNav) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileNav.classList.toggle('hidden');
            });
        }

        // Admin/Post Notice button
        const adminBtn = document.getElementById('admin-btn');
        if (adminBtn) {
            adminBtn.addEventListener('click', () => {
                this.showPostNoticeModal();
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshData();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'k':
                        e.preventDefault();
                        if (searchInput) searchInput.focus();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.showPostNoticeModal();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.refreshData();
                        break;
                }
            }
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    // MODIFIED: Load data from AWS API first, fallback to sample data
    async loadData() {
        try {
            // Try to load from AWS API first
            const awsNotices = await fetchNoticesFromDB();
            if (awsNotices && awsNotices.length > 0) {
                this.notices = awsNotices;
                console.log('✅ Loaded notices from AWS database:', this.notices);
            } else {
                throw new Error('No AWS data available');
            }
        } catch (error) {
            console.log('📡 AWS API not available, trying GitHub API...');
            try {
                // Try GitHub API as fallback
                const response = await fetch(this.apiEndpoint);
                if (response.ok) {
                    const data = await response.json();
                    this.notices = JSON.parse(atob(data.content));
                    console.log('✅ Loaded notices from GitHub API');
                } else {
                    throw new Error('GitHub API not available');
                }
            } catch (githubError) {
                console.log('📡 GitHub API also not available, loading sample data...');
                this.loadSampleData();
            }
        }

        // Load signatures from localStorage
        const savedSignatures = localStorage.getItem('akl_signatures');
        if (savedSignatures) {
            this.signatures = new Map(JSON.parse(savedSignatures));
        }

        this.updateLastUpdated();
    }

    // Load sample data for development/demo (YOUR ORIGINAL SAMPLE DATA)
    loadSampleData() {
        this.notices = [
            {
                id: 'notice_001',
                title: 'Critical: New Safety Protocol Implementation',
                content: 'All DCO technicians must complete the new safety training module by EOD Friday. This includes updated lockout/tagout procedures and emergency response protocols.',
                category: 'Safety',
                priority: 'critical',
                author: 'Safety Manager',
                createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                isPinned: true,
                requiresSignature: true,
                source: 'Management Email',
                tags: ['safety', 'training', 'mandatory']
            },
            {
                id: 'notice_002',
                title: 'System Maintenance Window - This Weekend',
                content: 'Scheduled maintenance on all AKL cluster systems this Saturday 2AM-6AM NZST. All non-critical operations should be completed before maintenance window.',
                category: 'Operations',
                priority: 'high',
                author: 'DCEO',
                createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                isPinned: true,
                requiresSignature: false,
                source: 'TacOps Update',
                tags: ['maintenance', 'weekend', 'systems']
            },
            {
                id: 'notice_003',
                title: 'Updated Badge Access Procedures',
                content: 'New badge access procedures are now in effect. Please ensure you tap your badge at all entry points and report any access issues immediately.',
                category: 'Policy',
                priority: 'medium',
                author: 'Security Team',
                createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                isPinned: false,
                requiresSignature: true,
                source: 'Security Policy',
                tags: ['security', 'access', 'policy']
            },
            {
                id: 'notice_004',
                title: 'TacOps Feedback Summary - Week 47',
                content: 'Great work this week team! Overall performance metrics are up 15%. Special recognition to AKL53 team for zero incidents this week.',
                category: 'Feedback',
                priority: 'low',
                author: 'TacOps Team',
                createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
                expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                isPinned: false,
                requiresSignature: false,
                source: 'TacOps Spreadsheet',
                tags: ['feedback', 'performance', 'recognition']
            },
            {
                id: 'notice_005',
                title: 'System Test',
                content: 'This is Prototype to showcase the System aka AKL NoticeBoard.',
                category: 'coffee',
                priority: 'medium',
                author: 'coffee',
                createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
                expiresAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
                isPinned: false,
                requiresSignature: false,
                source: 'coffee',
                tags: ['BETA', 'test']
            }
        ];
    }

    // Set current filter (YOUR ORIGINAL METHOD)
    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll(`[data-filter="${filter}"]`).forEach(btn => {
            btn.classList.add('active');
        });

        this.render();
    }

    // Get filtered notices (YOUR ORIGINAL METHOD)
    getFilteredNotices() {
        let filtered = [...this.notices];

        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(notice => 
                notice.title.toLowerCase().includes(this.searchQuery) ||
                notice.content.toLowerCase().includes(this.searchQuery) ||
                notice.category.toLowerCase().includes(this.searchQuery) ||
                notice.author.toLowerCase().includes(this.searchQuery) ||
                (notice.tags && notice.tags.some(tag => tag.toLowerCase().includes(this.searchQuery)))
            );
        }

        // Apply category filter
        switch (this.currentFilter) {
            case 'pinned':
                filtered = filtered.filter(notice => notice.isPinned);
                break;
            case 'unsigned':
                filtered = filtered.filter(notice => 
                    notice.requiresSignature && !this.signatures.has(notice.id)
                );
                break;
            case 'categories':
                // Group by categories - we'll handle this in render
                break;
            case 'all':
            default:
                // No additional filtering
                break;
        }

        // Sort: pinned first, then by creation date (newest first)
        filtered.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        return filtered;
    }

    // Render the notice board (YOUR ORIGINAL METHOD)
    render() {
        const filtered = this.getFilteredNotices();
        const noticeBoard = document.getElementById('notice-board');
        const emptyState = document.getElementById('empty-state');

        if (!noticeBoard) return;

        // Update status bar
        this.updateStatusBar(filtered);

        // Render filter pills
        this.renderFilterPills();

        if (filtered.length === 0) {
            noticeBoard.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');

        if (this.currentFilter === 'categories') {
            this.renderByCategories(filtered);
        } else {
            this.renderNoticeList(filtered);
        }
    }

    // Render notices as a list (YOUR ORIGINAL METHOD)
    renderNoticeList(notices) {
        const noticeBoard = document.getElementById('notice-board');
        
        noticeBoard.innerHTML = notices.map(notice => this.renderNoticeCard(notice)).join('');
        
        // Add event listeners to signature buttons
        this.attachSignatureListeners();
    }

    // Render notices grouped by categories (YOUR ORIGINAL METHOD)
    renderByCategories(notices) {
        const noticeBoard = document.getElementById('notice-board');
        const categories = {};
        
        // Group notices by category
        notices.forEach(notice => {
            if (!categories[notice.category]) {
                categories[notice.category] = [];
            }
            categories[notice.category].push(notice);
        });

        const categoryHtml = Object.entries(categories).map(([category, categoryNotices]) => `
            <div class="category-section mb-8">
                <div class="flex items-center space-x-3 mb-4">
                    <h2 class="text-2xl font-bold text-slate-100">${this.getCategoryIcon(category)} ${category}</h2>
                    <span class="bg-slate-700 text-slate-300 px-2 py-1 rounded-full text-sm font-medium">
                        ${categoryNotices.length} notice${categoryNotices.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div class="space-y-4">
                    ${categoryNotices.map(notice => this.renderNoticeCard(notice)).join('')}
                </div>
            </div>
        `).join('');

        noticeBoard.innerHTML = categoryHtml;
        this.attachSignatureListeners();
    }

    // Complete the renderNoticeCard method (YOUR ORIGINAL METHOD)
    renderNoticeCard(notice) {
        const isExpired = notice.expiresAt && new Date(notice.expiresAt) < new Date();
        const isSigned = this.signatures.has(notice.id);
        const timeAgo = this.getTimeAgo(notice.createdAt);
        const expiresIn = notice.expiresAt ? this.getExpiresIn(notice.expiresAt) : '';

        return `
            <div class="notice-card notice-${notice.priority} ${notice.isPinned ? 'notice-pinned' : ''} ${isExpired ? 'opacity-60' : ''}" data-notice-id="${notice.id}">
                <!-- Notice Header -->
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-2">
                            <span class="priority-badge priority-${notice.priority}">
                                ${this.getPriorityIcon(notice.priority)} ${notice.priority.toUpperCase()}
                            </span>
                            <span class="category-badge">
                                ${this.getCategoryIcon(notice.category)} ${notice.category}
                            </span>
                            ${notice.isPinned ? '<span class="text-amber-400 text-sm font-medium">📌 PINNED</span>' : ''}
                        </div>
                        <h3 class="text-xl font-bold text-slate-100 mb-2">${notice.title}</h3>
                        <div class="flex items-center space-x-4 text-sm text-slate-400">
                            <span>👤 ${notice.author}</span>
                            <span>📅 ${timeAgo}</span>
                            <span>📍 ${notice.source}</span>
                            ${isExpired ? '<span class="text-red-400">⚠️ EXPIRED</span>' : (expiresIn ? `<span>⏰ Expires ${expiresIn}</span>` : '')}
                        </div>
                    </div>
                </div>

                <!-- Notice Content -->
                <div class="mb-4">
                    <p class="text-slate-300 leading-relaxed">${notice.content}</p>
                </div>

                <!-- Tags -->
                ${notice.tags && notice.tags.length > 0 ? `
                    <div class="flex flex-wrap gap-2 mb-4">
                        ${notice.tags.map(tag => `
                            <span class="bg-slate-700 text-slate-300 px-2 py-1 rounded-full text-xs font-medium">
                                #${tag}
                            </span>
                        `).join('')}
                    </div>
                ` : ''}

                <!-- Signature Section -->
                ${notice.requiresSignature ? `
                    <div class="signature-section ${isSigned ? 'signature-completed' : 'signature-required'}">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                                ${isSigned ? `
                                    <div class="flex items-center space-x-2 text-green-400">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        <span class="font-medium">Signed by ${this.currentUser.name}</span>
                                    </div>
                                    <div class="text-sm text-slate-400">
                                        ${this.getTimeAgo(this.signatures.get(notice.id).timestamp)}
                                    </div>
                                ` : `
                                    <div class="flex items-center space-x-2 text-amber-400">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"></path>
                                        </svg>
                                        <span class="font-medium">Signature Required</span>
                                    </div>
                                    <div class="text-sm text-slate-400">
                                        Please acknowledge this notice
                                    </div>
                                `}
                            </div>
                            ${!isSigned && !isExpired ? `
                                <button class="sign-btn" data-notice-id="${notice.id}">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                                    </svg>
                                    Sign Notice
                                </button>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Helper methods (YOUR ORIGINAL METHODS)
    getPriorityIcon(priority) {
        const icons = {
            critical: '🚨',
            high: '⚠️',
            medium: '📋',
            low: '💡'
        };
        return icons[priority] || '📋';
    }

    getCategoryIcon(category) {
        const icons = {
            Safety: '🦺',
            Operations: '⚙️',
            Policy: '📜',
            HR: '👥',
            Feedback: '💬',
            Training: '🎓',
            Maintenance: '🔧',
            coffee: '☕'
        };
        return icons[category] || '📋';
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now - time) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return time.toLocaleDateString();
    }

    getExpiresIn(timestamp) {
        const now = new Date();
        const expiry = new Date(timestamp);
        const diffInSeconds = Math.floor((expiry - now) / 1000);
        
        if (diffInSeconds < 0) return 'Expired';
        if (diffInSeconds < 3600) return `in ${Math.floor(diffInSeconds / 60)}m`;
        if (diffInSeconds < 86400) return `in ${Math.floor(diffInSeconds / 3600)}h`;
        if (diffInSeconds < 604800) return `in ${Math.floor(diffInSeconds / 86400)}d`;
        
        return `on ${expiry.toLocaleDateString()}`;
    }

    // Signature handling (YOUR ORIGINAL METHODS)
    attachSignatureListeners() {
        document.querySelectorAll('.sign-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noticeId = e.target.closest('.sign-btn').dataset.noticeId;
                this.signNotice(noticeId);
            });
        });
    }

    // MODIFIED: Sign notice with AWS backend integration
    signNotice(noticeId) {
        const signature = {
            userId: this.currentUser.id,
            userName: this.currentUser.name,
            timestamp: new Date().toISOString()
        };
        
        // Try to save to AWS first
        createSignatureInDB({
            noticeId: noticeId,
            userId: signature.userId,
            userName: signature.userName,
            timestamp: signature.timestamp
        }).then(awsSignature => {
            // Use AWS signature if successful
            this.signatures.set(noticeId, signature);
            this.saveSignatures();
            this.render();
            this.showToast('Notice signed in database!', 'success');
        }).catch(error => {
            // Fallback to local storage
            console.log('AWS signature failed, saving locally:', error);
            this.signatures.set(noticeId, signature);
            this.saveSignatures();
            this.render();
            this.showToast('Notice signed locally!', 'warning');
        });
    }

    saveSignatures() {
        localStorage.setItem('akl_signatures', JSON.stringify([...this.signatures]));
    }

    // Status bar updates (YOUR ORIGINAL METHODS)
    updateStatusBar(filteredNotices) {
        const totalNoticesEl = document.getElementById('total-notices');
        const unsignedCountEl = document.getElementById('unsigned-count');
        
        if (totalNoticesEl) totalNoticesEl.textContent = this.notices.length;
        
        const unsignedCount = this.notices.filter(notice => 
            notice.requiresSignature && !this.signatures.has(notice.id)
        ).length;
        if (unsignedCountEl) unsignedCountEl.textContent = unsignedCount;
        
        // Update new notice indicator
        const indicator = document.getElementById('new-notice-indicator');
        if (indicator) {
            if (unsignedCount > 0) {
                indicator.classList.remove('hidden');
            } else {
                indicator.classList.add('hidden');
            }
        }
    }

    updateLastUpdated() {
        const now = new Date();
        const lastUpdatedEl = document.getElementById('last-updated');
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = `Last updated: ${now.toLocaleTimeString()}`;
        }
    }

    // Filter pills rendering (YOUR ORIGINAL METHOD)
    renderFilterPills() {
        const container = document.getElementById('filter-pills');
        if (!container) return;
        
        const pills = [];
        
        if (this.searchQuery) {
            pills.push(`
                <span class="filter-pill active">
                    🔍 "${this.searchQuery}"
                    <button onclick="clearSearch()" class="ml-2 text-red-400">×</button>
                </span>
            `);
        }
        
        if (this.currentFilter !== 'all') {
            const filterNames = {
                pinned: '📌 Pinned Only',
                unsigned: '✍️ Needs Signature',
                categories: '🏷️ By Category'
            };
            
            pills.push(`
                <span class="filter-pill active">
                    ${filterNames[this.currentFilter]}
                    <button onclick="clearFilter()" class="ml-2 text-red-400">×</button>
                </span>
            `);
        }
        
        container.innerHTML = pills.join('');
    }

    // Auto refresh functionality (YOUR ORIGINAL METHODS)
    startAutoRefresh() {
        this.autoRefreshInterval = setInterval(() => {
            this.refreshData();
        }, 300000); // Refresh every 5 minutes
    }

    async refreshData() {
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) refreshBtn.classList.add('loading');
        
        try {
            await this.loadData();
            this.render();
            this.showToast('Data refreshed successfully!', 'success');
        } catch (error) {
            this.showToast('Failed to refresh data', 'error');
        } finally {
            if (refreshBtn) refreshBtn.classList.remove('loading');
        }
    }

    // Toast notifications (YOUR ORIGINAL METHOD)
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `
            <div class="flex items-center space-x-3">
                <span class="text-lg">${icons[type]}</span>
                <span class="flex-1">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="text-slate-400 hover:text-white">×</button>
            </div>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    // Modal functionality (YOUR ORIGINAL METHOD)
    showPostNoticeModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content w-full max-w-2xl">
                <div class="bg-slate-800 px-6 py-4 border-b border-slate-700">
                    <h2 class="text-xl font-bold text-slate-100">📝 Post New Notice</h2>
                </div>
                <div class="p-6">
                    <form id="post-notice-form" class="space-y-4">
                        <div class="form-group">
                            <label class="form-label">Title *</label>
                            <input type="text" name="title" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Content *</label>
                            <textarea name="content" class="form-textarea" rows="4" required></textarea>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="form-group">
                                <label class="form-label">Category *</label>
                                <select name="category" class="form-select" required>
                                    <option value="">Select Category</option>
                                    <option value="Safety">🦺 Safety</option>
                                    <option value="Operations">⚙️ Operations</option>
                                    <option value="Policy">📜 Policy</option>
                                    <option value="HR">👥 HR</option>
                                    <option value="Training">🎓 Training</option>
                                    <option value="Maintenance">🔧 Maintenance</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Priority *</label>
                                <select name="priority" class="form-select" required>
                                    <option value="">Select Priority</option>
                                    <option value="critical">🚨 Critical</option>
                                    <option value="high">⚠️ High</option>
                                    <option value="medium">📋 Medium</option>
                                    <option value="low">💡 Low</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Tags (comma-separated)</label>
                            <input type="text" name="tags" class="form-input" placeholder="safety, training, mandatory">
                        </div>
                        <div class="flex items-center space-x-4">
                            <label class="flex items-center space-x-2">
                                <input type="checkbox" name="isPinned" class="rounded">
                                <span class="text-sm">📌 Pin this notice</span>
                            </label>
                            <label class="flex items-center space-x-2">
                                <input type="checkbox" name="requiresSignature" class="rounded">
                                <span class="text-sm">✍️ Requires signature</span>
                            </label>
                        </div>
                    </form>
                </div>
                <div class="bg-slate-800 px-6 py-4 border-t border-slate-700 flex justify-end space-x-3">
                    <button onclick="this.closest('.modal').remove()" class="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button onclick="submitNotice()" class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors">
                        📝 Post Notice
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('modal-container').appendChild(modal);
    }

    closeAllModals() {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) modalContainer.innerHTML = '';
    }
}

// Global helper functions (YOUR ORIGINAL FUNCTIONS)
function clearSearch() {
    const searchInput = document.getElementById('search-notices');
    if (searchInput) searchInput.value = '';
    if (window.noticeBoard) {
        window.noticeBoard.searchQuery = '';
        window.noticeBoard.render();
    }
}

function clearFilter() {
    if (window.noticeBoard) {
        window.noticeBoard.setFilter('all');
    }
}

function clearAllFilters() {
    clearSearch();
    clearFilter();
}

// MODIFIED: Submit notice with AWS backend integration
function submitNotice() {
    const form = document.getElementById('post-notice-form');
    const formData = new FormData(form);
    
    const notice = {
        id: 'notice_' + Date.now(),
        title: formData.get('title'),
        content: formData.get('content'),
        category: formData.get('category'),
        priority: formData.get('priority'),
        author: window.noticeBoard.currentUser.name,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        isPinned: formData.get('isPinned') === 'on',
        requiresSignature: formData.get('requiresSignature') === 'on',
        source: 'NoticeBoard',
        tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()) : []
    };
    
    // Try to save to AWS first
    createNoticeInDB({
        title: notice.title,
        content: notice.content,
        category: notice.category,
        priority: notice.priority,
        author: notice.author,
        source: notice.source,
        isPinned: notice.isPinned,
        requiresSignature: notice.requiresSignature,
        tags: notice.tags
    }).then(awsNotice => {
        // Use AWS notice if successful
        window.noticeBoard.notices.unshift(awsNotice);
        window.noticeBoard.render();
        window.noticeBoard.closeAllModals();
        window.noticeBoard.showToast('Notice posted to database successfully!', 'success');
    }).catch(error => {
        // Fallback to local storage
        console.log('AWS save failed, saving locally:', error);
        window.noticeBoard.notices.unshift(notice);
        window.noticeBoard.render();
        window.noticeBoard.closeAllModals();
        window.noticeBoard.showToast('Notice posted locally!', 'warning');
    });
}

// Initialize the application (YOUR ORIGINAL INITIALIZATION)
window.addEventListener('DOMContentLoaded', () => {
    window.noticeBoard = new AKLNoticeBoard();
});
