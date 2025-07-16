class UserPortal {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.notices = [];
        this.userSignatures = [];
        // Filtering state
        this.filterSearch = '';
        this.filterCategory = '';
        this.filterPriority = '';
        this.ackFilter = '';
        // Sorting state
        this.sortOption = 'date-desc';
        // Pagination state
        this.currentPage = 1;
        this.itemsPerPage = 8;
        // Error state
        this.loadError = null;
        this.lastNoticeIds = [];
        this.autoRefreshInterval = null;
        this.language = 'en';
        this.translations = {
            en: {
                profile: 'Profile',
                logout: 'Logout',
                loading: 'Loading...',
                verifying: 'Verifying your access...',
                companyNotices: 'Company Notices',
                reviewAcknowledge: 'Review and acknowledge important company notices below.',
                noNotices: 'No Notices Found',
                noNoticesDesc: 'There are no notices matching your current filters.',
                searchPlaceholder: 'Search notices...',
                allNotices: 'All Notices',
                needToAcknowledge: 'Need to Acknowledge',
                alreadyAcknowledged: 'Already Acknowledged',
                allCategories: 'All Categories',
                allPriorities: 'All Priorities',
                newestFirst: 'Newest First',
                oldestFirst: 'Oldest First',
                priorityHighLow: 'Priority (Critical-Low)',
                priorityLowHigh: 'Priority (Low-Critical)',
                acknowledge: 'Acknowledge',
                acknowledged: 'Acknowledged',
                pending: 'Pending',
                acknowledgmentRequired: 'Acknowledgment Required',
                updateProfile: 'Update Profile',
                userProfile: 'User Profile',
                name: 'Name',
                email: 'Email',
                department: 'Department',
                changePassword: 'Change Password',
                leaveBlank: 'Leave blank to keep current password',
                ackHistory: 'Acknowledgment History',
                noAcks: 'No acknowledgments yet.',
                errorLoading: 'Error Loading Notices',
                retry: 'Retry',
                newNotice: 'new notice',
                newNotices: 'new notices',
            },
            es: {
                profile: 'Perfil',
                logout: 'Cerrar sesión',
                loading: 'Cargando...',
                verifying: 'Verificando su acceso...',
                companyNotices: 'Avisos de la empresa',
                reviewAcknowledge: 'Revise y reconozca los avisos importantes a continuación.',
                noNotices: 'No se encontraron avisos',
                noNoticesDesc: 'No hay avisos que coincidan con sus filtros actuales.',
                searchPlaceholder: 'Buscar avisos...',
                allNotices: 'Todos los avisos',
                needToAcknowledge: 'Necesitan reconocimiento',
                alreadyAcknowledged: 'Ya reconocidos',
                allCategories: 'Todas las categorías',
                allPriorities: 'Todas las prioridades',
                newestFirst: 'Más recientes primero',
                oldestFirst: 'Más antiguos primero',
                priorityHighLow: 'Prioridad (Crítica-Baja)',
                priorityLowHigh: 'Prioridad (Baja-Crítica)',
                acknowledge: 'Reconocer',
                acknowledged: 'Reconocido',
                pending: 'Pendiente',
                acknowledgmentRequired: 'Reconocimiento requerido',
                updateProfile: 'Actualizar perfil',
                userProfile: 'Perfil de usuario',
                name: 'Nombre',
                email: 'Correo electrónico',
                department: 'Departamento',
                changePassword: 'Cambiar contraseña',
                leaveBlank: 'Deje en blanco para mantener la contraseña actual',
                ackHistory: 'Historial de reconocimientos',
                noAcks: 'Aún no hay reconocimientos.',
                errorLoading: 'Error al cargar avisos',
                retry: 'Reintentar',
                newNotice: 'nuevo aviso',
                newNotices: 'nuevos avisos',
            }
        };
    }

    t(key) {
        return this.translations[this.language][key] || key;
    }

    async init() {
        console.log('🚀 Initializing User Portal...');
        
        const isAuth = await this.checkAuthStatus();
        
        if (!isAuth) {
            console.log('❌ No valid USER session, redirecting to manager portal...');
            this.redirectToManagerPortal();
            return;
        }

        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';

        await this.loadUserData();
        if (this.loadError) {
            this.renderLoadError();
            return;
        }
        this.renderNotices();
        this.setupEventListeners();
        this.setupFilterListeners();
        this.startAutoRefresh();
        this.updateStatusBar();
        
        console.log('✅ User Portal initialized');
    }

    startAutoRefresh() {
        if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
        this.autoRefreshInterval = setInterval(() => {
            this.refreshData(true);
        }, 60000); // 1 minute
    }

    async refreshData(showSuccessToast = false) {
        const prevIds = this.notices.map(n => n.id);
        await this.loadUserData();
        if (this.loadError) {
            this.renderLoadError();
            return;
        }
        this.renderNotices();
        this.updateStatusBar();
        // Check for new notices
        const newIds = this.notices.map(n => n.id);
        const newNoticeIds = newIds.filter(id => !prevIds.includes(id));
        if (newNoticeIds.length > 0) {
            this.showToast(`${newNoticeIds.length} new notice${newNoticeIds.length > 1 ? 's' : ''} posted!`, 'info');
        } else if (showSuccessToast) {
            this.showToast('Data refreshed successfully!', 'success');
        }
    }

    async checkAuthStatus() {
        try {
            // Old project logic: Only check userSession
            let storedSession = sessionStorage.getItem('userSession') || localStorage.getItem('userSession');
            if (storedSession) {
                const sessionData = JSON.parse(storedSession);
                if (sessionData.email && sessionData.userRole === 'USER') {
                    // Use existing getUserByEmail from admin-script.js
                    const userRecord = await getUserByEmail(sessionData.email);
                    if (userRecord && userRecord.isActive && userRecord.role === 'USER') {
                        this.currentUser = {
                            email: sessionData.email,
                            accessToken: sessionData.accessToken,
                            dbUser: userRecord
                        };
                        this.isAuthenticated = true;
                        this.updateUserInfo();
                        // Update cognitoAuth
                        if (window.cognitoAuth) {
                            window.cognitoAuth.currentUser = { email: sessionData.email };
                            window.cognitoAuth.accessToken = sessionData.accessToken;
                        }
                        sessionStorage.removeItem('userSession');
                        return true;
                    }
                }
            }
            return false;
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    }

    redirectToManagerPortal() {
        window.location.href = '../index.html';
    }

    updateUserInfo() {
        if (this.currentUser?.dbUser) {
            document.getElementById('user-name-pill').textContent = this.currentUser.dbUser.name;
            document.getElementById('user-role-pill').textContent = this.currentUser.dbUser.role || 'USER';
            document.getElementById('user-department-pill').textContent = this.currentUser.dbUser.department || 'General';
        }
    }

    async loadUserData() {
        try {
            this.loadError = null;
            console.log('📊 Loading user data...');
            // Fetch all notices and all signatures
            const [notices, allSignatures] = await Promise.all([
                fetchAllNotices(),
                fetchAllSignatures()
            ]);
            this.notices = notices.filter(n => n.isActive !== false);
            this.allSignatures = allSignatures;
            // Current user's signatures for convenience
            const userId = this.currentUser.dbUser?.id || this.currentUser.id;
            this.userSignatures = allSignatures.filter(sig => sig.userId === userId);
            console.log('✅ User data loaded:', {
                notices: this.notices.length,
                allSignatures: this.allSignatures.length,
                userSignatures: this.userSignatures.length
            });
        } catch (error) {
            console.error('Failed to load user data:', error);
            this.notices = [];
            this.allSignatures = [];
            this.userSignatures = [];
            this.loadError = error.message || 'Failed to load data from server.';
        }
    }

    // Fetch all signatures from backend
    async fetchAllSignatures() {
        const query = `
            query ListAllSignatures {
                listSignatures {
                    items {
                        id
                        noticeId
                        userId
                        userName
                        timestamp
                        createdAt
                        updatedAt
                    }
                }
            }
        `;
        const data = await graphqlRequest(query);
        return data.listSignatures.items;
    }

    // Fetch all notices from backend
    async fetchAllNotices() {
        const query = `
            query ListAllNotices {
                listNotices {
                    items {
                        id title content category priority author
                        createdAt expiresAt isPinned requiresSignature
                        source tags updatedAt
                    }
                }
            }
        `;
        const data = await graphqlRequest(query);
        return data.listNotices.items;
    }

    async createSignature(signatureData) {
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

        const uniqueId = 'sig-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        const variables = {
            input: {
                id: uniqueId,
                noticeId: signatureData.noticeId,
                noticeID: signatureData.noticeId, // Add capital D for backend compatibility
                userId: signatureData.userId,
                userName: signatureData.userName,
                timestamp: signatureData.timestamp
            }
        };

        // Debug log
        console.log('[DEBUG] createSignature input:', JSON.stringify(variables, null, 2));

        const data = await graphqlRequest(mutation, variables);
        return data.createSignature;
    }

    renderNotices() {
        const container = document.getElementById('notices-container');
        let filtered = this.notices;
        // Apply search filter
        if (this.filterSearch) {
            filtered = filtered.filter(notice =>
                (notice.title && notice.title.toLowerCase().includes(this.filterSearch)) ||
                (notice.content && notice.content.toLowerCase().includes(this.filterSearch)) ||
                (notice.author && notice.author.toLowerCase().includes(this.filterSearch))
            );
        }
        // Apply category filter
        if (this.filterCategory) {
            filtered = filtered.filter(notice => notice.category === this.filterCategory);
        }
        // Apply priority filter
        if (this.filterPriority) {
            filtered = filtered.filter(notice => notice.priority === this.filterPriority);
        }
        // Apply acknowledgment filter
        if (this.ackFilter) {
            filtered = filtered.filter(notice => {
                if (!notice.requiresSignature) return false; // Only show notices that require signature
                
                // Check if current user has acknowledged this notice
                const userSignature = this.userSignatures.find(sig => sig.noticeId === notice.id);
                const isAcknowledged = !!userSignature;
                
                if (this.ackFilter === 'need-ack') {
                    return !isAcknowledged; // Show notices that need acknowledgment
                } else if (this.ackFilter === 'acknowledged') {
                    return isAcknowledged; // Show notices that are already acknowledged
                }
                return true;
            });
        }
        // Sorting
        filtered = this.sortNotices(filtered);
        // Pagination logic
        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage) || 1;
        if (this.currentPage > totalPages) this.currentPage = totalPages;
        if (this.currentPage < 1) this.currentPage = 1;
        const startIdx = (this.currentPage - 1) * this.itemsPerPage;
        const endIdx = startIdx + this.itemsPerPage;
        const paginated = filtered.slice(startIdx, endIdx);
        // Render notices
        if (paginated.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="text-6xl mb-4">📭</div>
                    <h3 class="text-xl font-semibold mb-2">${this.t('noNotices')}</h3>
                    <p class="text-slate-400">${this.t('noNoticesDesc')}</p>
                </div>
            `;
            this.renderPagination(totalItems, totalPages);
            return;
        }
        container.innerHTML = paginated.map(notice => {
            // All signatures for this notice
            const noticeSignatures = this.allSignatures.filter(sig => sig.noticeId === notice.id);
            const ackCount = noticeSignatures.length;
            // Current user's signature for this notice
            const userSignature = noticeSignatures.find(sig => sig.userId === (this.currentUser.dbUser?.id || this.currentUser.id));
            const isAcknowledged = !!userSignature;
            // Priority pill (main board style)
            const priorityIcons = { critical: '🚨', high: '⚠️', medium: '📋', low: '💡' };
            const priority = notice.priority || 'medium';
            const priorityIcon = priorityIcons[priority] || '📋';
            const priorityPill = `<span class="priority-badge priority-${priority}">${priorityIcon} ${priority.toUpperCase()}</span>`;
            // Category pill (main board style)
            const categoryIcons = { Safety: '🦺', Operations: '⚙️', Policy: '📜', HR: '👥', Feedback: '💬', Training: '🎓', Maintenance: '🔧', coffee: '☕' };
            const category = notice.category || '';
            const categoryIcon = categoryIcons[category] || '📋';
            const categoryPill = category ? `<span class="category-badge">${categoryIcon} ${category}</span>` : '';
            // Tag pills (main board style)
            const tagPills = notice.tags && notice.tags.length > 0 ? `
                <div class="flex flex-wrap gap-2 mb-4">
                    ${notice.tags.map(tag => `<span class="bg-slate-700 text-slate-300 px-2 py-1 rounded-full text-xs font-medium">#${tag}</span>`).join('')}
                </div>
            ` : '';
            // Pinned indicator (main board style)
            const pinnedClass = notice.isPinned ? 'notice-pinned' : '';
            // Expired
            const isExpired = notice.expiresAt && new Date(notice.expiresAt) < new Date();
            // Date formatting
            const createdAt = new Date(notice.createdAt);
            const timeAgo = (() => {
                const now = new Date();
                const diff = (now - createdAt) / 1000;
                if (diff < 60) return 'Just now';
                if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
                if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
                if (diff < 604800) return `${Math.floor(diff/86400)}d ago`;
                return createdAt.toLocaleDateString();
            })();
            const fullDateTime = createdAt.toLocaleString('en-NZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Pacific/Auckland' });
            // Department/Source
            const department = notice.department ? `<span>🏢 ${notice.department}</span>` : '';
            // Signature/acknowledgment section (main board style, mobile responsive)
            let signatureSection = '';
            if (notice.requiresSignature) {
                if (isAcknowledged) {
                    signatureSection = `
                        <div class="signature-section signature-completed mt-4">
                            <div class="flex items-center space-x-2 text-green-400">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <span class="font-medium">Acknowledged by ${userSignature.userName}</span>
                                <span class="ml-3 text-xs text-green-200">(${ackCount} user${ackCount === 1 ? '' : 's'} acknowledged)</span>
                            </div>
                            <div class="text-sm text-slate-400 mt-1">${this.formatDate(userSignature.timestamp)}</div>
                        </div>
                    `;
                } else {
                    signatureSection = `
                        <div class="signature-section signature-required mt-4">
                            <div class="flex items-center space-x-2 text-amber-400">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"></path></svg>
                                <span class="font-medium">${this.t('acknowledgmentRequired')}</span>
                                <span class="ml-3 text-xs text-amber-200">(${ackCount} user${ackCount === 1 ? '' : 's'} acknowledged)</span>
                            </div>
                            <div class="text-sm text-slate-400 mt-1">Please acknowledge this notice</div>
                            <button onclick="userPortal.acknowledgeNotice('${notice.id}')" class="sign-btn mt-3">✍️ ${this.t('acknowledge')}</button>
                        </div>
                    `;
                }
            }
            // Main notice card (main board style, with pills, meta, tags, and content, mobile responsive)
            return `
                <div class="notice-card notice-${priority} ${pinnedClass} ${isExpired ? 'opacity-60' : ''}" data-notice-id="${notice.id}">
                    <div class="flex flex-col md:flex-row md:justify-between md:items-start mb-4 gap-2">
                        <div class="flex-1">
                            <div class="flex flex-wrap items-center gap-3 mb-2">
                                ${priorityPill}
                                ${categoryPill}
                                ${notice.isPinned ? '<span class="text-amber-400 text-sm font-medium">📌 PINNED</span>' : ''}
                            </div>
                            <h3 class="text-xl font-bold text-slate-100 mb-2">${notice.title}</h3>
                            <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-slate-400 space-y-1 sm:space-y-0">
                                <span>👤 ${notice.author}</span>
                                <span title="${fullDateTime}">📅 ${timeAgo}</span>
                                ${department}
                            </div>
                        </div>
                    </div>
                    <div class="mb-4 notice-content">
                        ${notice.content}
                    </div>
                    ${tagPills}
                    ${signatureSection}
                </div>
            `;
        }).join('');
        this.renderPagination(totalItems, totalPages);
        this.updateStatusBar();
    }

    renderLoadError() {
        const container = document.getElementById('notices-container');
        if (!container) return;
        container.innerHTML = `
            <div class="text-center py-16">
                <div class="text-6xl mb-4">❌</div>
                <h3 class="text-xl font-bold text-red-400 mb-2">${this.t('errorLoading')}</h3>
                <p class="text-slate-400 mb-6">${this.loadError || 'An unknown error occurred while loading data.'}</p>
                <button id="retry-load-btn" class="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">${this.t('retry')}</button>
            </div>
        `;
        document.getElementById('pagination-container').classList.add('hidden');
        const retryBtn = document.getElementById('retry-load-btn');
        if (retryBtn) {
            retryBtn.onclick = async () => {
                container.innerHTML = '<div class="text-center py-16 text-slate-400">' + this.t('loading') + '</div>';
                await this.loadUserData();
                if (this.loadError) {
                    this.renderLoadError();
                } else {
                    this.renderNotices();
                }
            };
        }
    }

    renderPagination(totalItems, totalPages) {
        const container = document.getElementById('pagination-container');
        if (!container) return;
        if (totalItems <= this.itemsPerPage) {
            container.classList.add('hidden');
            container.innerHTML = '';
            return;
        }
        // Smart page numbers
        const pageNumbers = this.generatePageNumbers(totalPages);
        const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);
        container.innerHTML = `
            <div class="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                <div class="text-sm text-slate-400">
                    Showing <span class="font-medium text-slate-200">${startItem}</span> to 
                    <span class="font-medium text-slate-200">${endItem}</span> of 
                    <span class="font-medium text-slate-200">${totalItems}</span> notices
                </div>
                <div class="flex items-center space-x-2">
                    <button class="pagination-btn ${this.currentPage === 1 ? 'disabled' : ''}" ${this.currentPage === 1 ? 'disabled' : ''} onclick="userPortal.previousPage()">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                        Previous
                    </button>
                    <div class="flex items-center space-x-1">
                        ${pageNumbers.map(page => {
                            if (page === '...') {
                                return '<span class="px-3 py-2 text-slate-400">...</span>';
                            }
                            return `<button onclick="userPortal.goToPage(${page})" class="pagination-number ${page === this.currentPage ? 'active' : ''}">${page}</button>`;
                        }).join('')}
                    </div>
                    <button class="pagination-btn ${this.currentPage === totalPages ? 'disabled' : ''}" ${this.currentPage === totalPages ? 'disabled' : ''} onclick="userPortal.nextPage()">
                        Next
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </div>
            </div>
        `;
        container.classList.remove('hidden');
    }

    generatePageNumbers(totalPages) {
        const pages = [];
        const current = this.currentPage;
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (current <= 4) {
                for (let i = 1; i <= 5; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            } else if (current >= totalPages - 3) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = current - 1; i <= current + 1; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    }

    goToPage(page) {
        if (page >= 1 && page <= Math.ceil(this.notices.filter(n => {
            let match = true;
            if (this.filterSearch) match = match && ((n.title && n.title.toLowerCase().includes(this.filterSearch)) || (n.content && n.content.toLowerCase().includes(this.filterSearch)) || (n.author && n.author.toLowerCase().includes(this.filterSearch)));
            if (this.filterCategory) match = match && n.category === this.filterCategory;
            if (this.filterPriority) match = match && n.priority === this.filterPriority;
            return match;
        }).length / this.itemsPerPage)) {
            this.currentPage = page;
            this.renderNotices();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.notices.filter(n => {
            let match = true;
            if (this.filterSearch) match = match && ((n.title && n.title.toLowerCase().includes(this.filterSearch)) || (n.content && n.content.toLowerCase().includes(this.filterSearch)) || (n.author && n.author.toLowerCase().includes(this.filterSearch)));
            if (this.filterCategory) match = match && n.category === this.filterCategory;
            if (this.filterPriority) match = match && n.priority === this.filterPriority;
            return match;
        }).length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderNotices();
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderNotices();
        }
    }

    async acknowledgeNotice(noticeId) {
        if (!this.isAuthenticated) {
            this.redirectToManagerPortal();
            return;
        }
        const userId = this.currentUser.dbUser?.id || this.currentUser.id;
        const userName = this.currentUser.dbUser?.name || this.currentUser.name;
        // Strengthen userId check: must be present and not a random string
        if (!userId || userId.startsWith('user_')) {
            this.showToast('User session invalid. Please log in again.', 'error');
            this.redirectToManagerPortal();
            return;
        }
        if (!userName) {
            this.showToast('User name missing. Please log in again.', 'error');
            this.redirectToManagerPortal();
            return;
        }
        try {
            await this.createSignature({
                noticeId: noticeId,
                userId: userId,
                userName: userName,
                timestamp: new Date().toISOString()
            });
            // Re-fetch all signatures after ACK
            this.allSignatures = await this.fetchAllSignatures();
            this.userSignatures = this.allSignatures.filter(sig => sig.userId === userId);
            this.renderNotices();
            this.updateStatusBar();
            this.showToast('Notice acknowledged successfully!', 'success');
        } catch (error) {
            console.error('Failed to acknowledge notice:', error);
            this.showToast('Failed to acknowledge notice. Please try again.', 'error');
        }
    }

    setupEventListeners() {
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        const profileBtn = document.getElementById('profile-btn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => this.openProfileModal());
        }
        // Home button
        const homeBtn = document.getElementById('home-btn');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                window.location.href = '../index.html';
            });
        }
        // Language selector
        const langSelect = document.getElementById('lang-select');
        if (langSelect) {
            langSelect.value = this.language;
            langSelect.addEventListener('change', (e) => {
                this.language = e.target.value;
                this.renderNotices();
                this.updateStaticText();
            });
        }
        // Refresh button for live update bar
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshData(true);
            });
        }
    }

    updateStaticText() {
        // Update static UI text for i18n
        document.getElementById('profile-btn').textContent = '👤 ' + this.t('profile');
        document.getElementById('logout-btn').textContent = '🚪 ' + this.t('logout');
        document.getElementById('main-title').textContent = 'AKL NoticeBoard';
        document.getElementById('portal-desc').textContent = this.t('userProfile');
        document.getElementById('notice-search').placeholder = this.t('searchPlaceholder');
        document.getElementById('ack-filter').options[0].text = this.t('allNotices');
        document.getElementById('ack-filter').options[1].text = this.t('needToAcknowledge');
        document.getElementById('ack-filter').options[2].text = this.t('alreadyAcknowledged');
        document.getElementById('category-filter').options[0].text = this.t('allCategories');
        document.getElementById('priority-filter').options[0].text = this.t('allPriorities');
        document.getElementById('sort-filter').options[0].text = '🕒 ' + this.t('newestFirst');
        document.getElementById('sort-filter').options[1].text = '🕒 ' + this.t('oldestFirst');
        document.getElementById('sort-filter').options[2].text = '⬆️ ' + this.t('priorityHighLow');
        document.getElementById('sort-filter').options[3].text = '⬇️ ' + this.t('priorityLowHigh');
        document.querySelector('h2.text-2xl.font-bold.mb-2').textContent = '📢 ' + this.t('companyNotices');
        document.querySelector('p.text-slate-400').textContent = this.t('reviewAcknowledge');
    }

    openProfileModal() {
        const template = document.getElementById('profile-modal-template');
        if (!template) return;
        const modal = template.content.cloneNode(true);
        const modalContainer = document.getElementById('modal-container');
        modalContainer.innerHTML = '';
        modalContainer.appendChild(modal);
        // Populate user info
        setTimeout(() => {
            document.getElementById('profile-name').value = this.currentUser?.dbUser?.name || '';
            document.getElementById('profile-email').value = this.currentUser?.dbUser?.email || '';
            document.getElementById('profile-department').value = this.currentUser?.dbUser?.department || '';
            // Ack history
            this.renderAckHistory();
            // Close modal
            document.getElementById('close-profile-modal').onclick = () => {
                modalContainer.innerHTML = '';
            };
            // Profile form submit
            document.getElementById('profile-form').onsubmit = (e) => {
                e.preventDefault();
                this.updateProfile();
            };
        }, 0);
    }

    renderAckHistory() {
        const ackHistoryEl = document.getElementById('ack-history');
        if (!ackHistoryEl) return;
        // Show most recent first
        const sorted = [...this.userSignatures].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        if (sorted.length === 0) {
            ackHistoryEl.innerHTML = '<div class="text-slate-400">No acknowledgments yet.</div>';
            return;
        }
        ackHistoryEl.innerHTML = sorted.map(sig => {
            const notice = this.notices.find(n => n.id === sig.noticeId);
            return `<div class="bg-slate-700 rounded p-3 flex flex-col">
                <span class="font-semibold text-white">${notice ? notice.title : 'Notice'}</span>
                <span class="text-xs text-slate-400">${this.formatDate(sig.timestamp)}</span>
            </div>`;
        }).join('');
    }

    async updateProfile() {
        const name = document.getElementById('profile-name').value.trim();
        const department = document.getElementById('profile-department').value.trim();
        const password = document.getElementById('profile-password').value;
        // Update name/department in DB (simulate with updateUserInDB if available)
        try {
            if (window.updateUserInDB && this.currentUser?.dbUser?.id) {
                await window.updateUserInDB(this.currentUser.dbUser.id, { name, department });
                this.currentUser.dbUser.name = name;
                this.currentUser.dbUser.department = department;
                this.updateUserInfo();
                this.showToast('Profile updated!', 'success');
            } else {
                this.showToast('Profile update not available in demo.', 'warning');
            }
            // Password change (placeholder)
            if (password) {
                this.showToast('Password change is not implemented in this demo.', 'info');
            }
            // Close modal after short delay
            setTimeout(() => {
                document.getElementById('modal-container').innerHTML = '';
            }, 1200);
        } catch (e) {
            this.showToast('Failed to update profile.', 'error');
        }
    }

    setupFilterListeners() {
        const searchInput = document.getElementById('notice-search');
        const ackSelect = document.getElementById('ack-filter');
        const categorySelect = document.getElementById('category-filter');
        const prioritySelect = document.getElementById('priority-filter');
        const sortSelect = document.getElementById('sort-filter');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterSearch = e.target.value.toLowerCase();
                this.currentPage = 1;
                this.renderNotices();
            });
        }
        if (ackSelect) {
            ackSelect.addEventListener('change', (e) => {
                this.ackFilter = e.target.value;
                this.currentPage = 1;
                this.renderNotices();
            });
        }
        if (categorySelect) {
            categorySelect.addEventListener('change', (e) => {
                this.filterCategory = e.target.value;
                this.currentPage = 1;
                this.renderNotices();
            });
        }
        if (prioritySelect) {
            prioritySelect.addEventListener('change', (e) => {
                this.filterPriority = e.target.value;
                this.currentPage = 1;
                this.renderNotices();
            });
        }
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortOption = e.target.value;
                this.currentPage = 1;
                this.renderNotices();
            });
        }
    }

    async logout() {
        persistDebugInfo({ step: 'logout', time: new Date().toISOString() });
        // Clear all session/local user data
        sessionStorage.removeItem('userSession');
        localStorage.removeItem('userSession');
        localStorage.removeItem('akl_auth_user');
        this.isAuthenticated = false;
        this.currentUser = null;
        // Cognito sign out if available
        if (window.cognitoAuth && typeof window.cognitoAuth.signOut === 'function') {
            await window.cognitoAuth.signOut();
        }
        // Redirect to login page (admin.html)
        window.location.href = 'admin.html';
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white z-50 ${
            type === 'success' ? 'bg-green-600' : 
            type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        }`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
        // If message is for new notices, translate
        if (message && message.includes('new notice')) {
            const count = parseInt(message);
            if (!isNaN(count)) {
                message = `${count} ${count === 1 ? this.t('newNotice') : this.t('newNotices')}!`;
            }
        }
    }

    sortNotices(notices) {
        const priorityOrder = { critical: 1, high: 2, medium: 3, low: 4 };
        // Always show pinned notices at the top, then sort non-pinned by selected option
        let pinned = notices.filter(n => n.isPinned);
        let others = notices.filter(n => !n.isPinned);
        switch (this.sortOption) {
            case 'date-asc':
                others.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'date-desc':
                others.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'priority-asc':
                // Low to Critical
                others.sort((a, b) => (priorityOrder[b.priority] || 5) - (priorityOrder[a.priority] || 5));
                break;
            case 'priority-desc':
                // Critical to Low
                others.sort((a, b) => (priorityOrder[a.priority] || 5) - (priorityOrder[b.priority] || 5));
                break;
            default:
                break;
        }
        return [...pinned, ...others];
    }

    updateStatusBar() {
        const totalNoticesEl = document.getElementById('total-notices');
        const unsignedCountEl = document.getElementById('unsigned-count');
        const userAckedCountEl = document.getElementById('user-acked-count');
        const lastUpdatedEl = document.getElementById('last-updated');
        if (totalNoticesEl) totalNoticesEl.textContent = this.notices.length;
        // Notices needing acknowledgment for this user
        const unsignedCount = this.notices.filter(n => n.requiresSignature && !this.userSignatures.some(sig => sig.noticeId === n.id)).length;
        if (unsignedCountEl) unsignedCountEl.textContent = unsignedCount;
        // Notices acknowledged by this user
        const userAckedCount = this.userSignatures.length;
        if (userAckedCountEl) userAckedCountEl.textContent = userAckedCount;
        // Last updated time
        if (lastUpdatedEl) {
            const now = new Date();
            lastUpdatedEl.textContent = 'Last updated: ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
    }
}

// Persistent debug log helper
function persistDebugInfo(info) {
    try {
        localStorage.setItem('akl_userportal_debug', JSON.stringify(info));
    } catch (e) {
        // ignore
    }
}

// Pure filter function for testing
function filterNotices(notices, { search = '', category = '', priority = '' } = {}) {
    let filtered = notices;
    if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(notice =>
            (notice.title && notice.title.toLowerCase().includes(s)) ||
            (notice.content && notice.content.toLowerCase().includes(s)) ||
            (notice.author && notice.author.toLowerCase().includes(s))
        );
    }
    if (category) {
        filtered = filtered.filter(notice => notice.category === category);
    }
    if (priority) {
        filtered = filtered.filter(notice => notice.priority === priority);
    }
    return filtered;
}

// For Jest tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports.filterNotices = filterNotices;
}

// Initialize
const userPortal = new UserPortal();
document.addEventListener('DOMContentLoaded', () => {
    userPortal.init();
});
