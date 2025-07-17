class UserProfile {
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
                loadingProfile: 'Loading your profile...',
                userProfile: 'User Profile',
                fullName: 'Full Name',
                email: 'Email',
                department: 'Department',
                changePassword: 'Change Password',
                leaveBlank: 'Leave blank to keep current password',
                updateProfile: 'Update Profile',
                ackHistory: 'Recent Acknowledgments',
                noAcks: 'No acknowledgments yet.',
                activityTimeline: 'Activity Timeline',
                totalNotices: 'Total Notices',
                acknowledged: 'Acknowledged',
                pending: 'Pending',
                complianceRate: 'Compliance Rate',
                lastUpdated: 'Last updated',
                errorLoading: 'Error Loading Profile',
                retry: 'Retry',
                profileUpdated: 'Profile updated successfully!',
                profileUpdateFailed: 'Failed to update profile.',
                passwordChangeNotImplemented: 'Password change is not implemented in this demo.',
                home: 'Home',
                role: 'Role',
                departmentLabel: 'Department'
            },
            es: {
                profile: 'Perfil',
                logout: 'Cerrar sesión',
                loading: 'Cargando...',
                loadingProfile: 'Cargando tu perfil...',
                userProfile: 'Perfil de Usuario',
                fullName: 'Nombre Completo',
                email: 'Correo Electrónico',
                department: 'Departamento',
                changePassword: 'Cambiar Contraseña',
                leaveBlank: 'Deje en blanco para mantener la contraseña actual',
                updateProfile: 'Actualizar Perfil',
                ackHistory: 'Reconocimientos Recientes',
                noAcks: 'Aún no hay reconocimientos.',
                activityTimeline: 'Línea de Tiempo de Actividad',
                totalNotices: 'Total de Avisos',
                acknowledged: 'Reconocidos',
                pending: 'Pendientes',
                complianceRate: 'Tasa de Cumplimiento',
                lastUpdated: 'Última actualización',
                errorLoading: 'Error al Cargar Perfil',
                retry: 'Reintentar',
                profileUpdated: '¡Perfil actualizado exitosamente!',
                profileUpdateFailed: 'Error al actualizar perfil.',
                passwordChangeNotImplemented: 'El cambio de contraseña no está implementado en esta demo.',
                home: 'Inicio',
                role: 'Rol',
                departmentLabel: 'Departamento'
            }
        };
    }

    t(key) {
        return this.translations[this.language][key] || key;
    }

    async init() {
        console.log('🚀 Initializing User Profile...');
        
        const isAuth = await this.checkAuthStatus();
        
        if (!isAuth) {
            console.log('❌ No valid USER session, redirecting to main noticeboard...');
            this.redirectToMainNoticeboard();
            return;
        }

        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';

        await this.loadUserData();
        if (this.loadError) {
            this.renderLoadError();
            return;
        }
        
        this.renderProfile();
        this.setupEventListeners();
        this.updateStaticText();
        this.startAutoRefresh();
        
        console.log('✅ User Profile initialized');
    }

    startAutoRefresh() {
        if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
        this.autoRefreshInterval = setInterval(() => {
            this.refreshData(true);
        }, 60000); // 1 minute
    }

    async refreshData(showSuccessToast = false) {
        await this.loadUserData();
        if (this.loadError) {
            this.renderLoadError();
            return;
        }
        this.renderProfile();
        if (showSuccessToast) {
            this.showToast('Profile data refreshed successfully!', 'success');
        }
    }

    async checkAuthStatus() {
        try {
            // Check for valid USER session
            let storedSession = sessionStorage.getItem('userSession') || localStorage.getItem('userSession');
            if (storedSession) {
                const sessionData = JSON.parse(storedSession);
                if (sessionData.email && sessionData.userRole === 'USER') {
                    const userRecord = await getUserByEmail(sessionData.email);
                    if (userRecord && userRecord.isActive && userRecord.role === 'USER') {
                        this.currentUser = {
                            email: sessionData.email,
                            accessToken: sessionData.accessToken,
                            dbUser: userRecord
                        };
                        this.isAuthenticated = true;
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

    redirectToMainNoticeboard() {
        window.location.href = '../index.html';
    }

    async loadUserData() {
        try {
            this.loadError = null;
            console.log('📊 Loading user profile data...');
            
            // Fetch all notices and signatures for statistics
            const [notices, allSignatures] = await Promise.all([
                this.fetchAllNotices(),
                this.fetchAllSignatures()
            ]);
            
            this.notices = notices.filter(n => n.isActive !== false);
            this.allSignatures = allSignatures;
            
            // Current user's signatures for statistics
            const userId = this.currentUser.dbUser?.id || this.currentUser.id;
            this.userSignatures = allSignatures.filter(sig => sig.userId === userId);
            
            console.log('✅ User profile data loaded:', {
                notices: this.notices.length,
                allSignatures: this.allSignatures.length,
                userSignatures: this.userSignatures.length
            });
        } catch (error) {
            console.error('Failed to load user profile data:', error);
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

    renderProfile() {
        this.updateUserInfo();
        this.updateStatistics();
        this.renderAckHistory();
        this.renderActivityTimeline();
        this.updateLastUpdated();
    }

    updateUserInfo() {
        if (this.currentUser?.dbUser) {
            const user = this.currentUser.dbUser;
            
            // Update user name
            document.getElementById('user-name').textContent = user.name || 'Unknown User';
            
            // Update user avatar (first letter of name)
            const avatar = document.getElementById('user-avatar');
            if (user.name) {
                avatar.textContent = user.name.charAt(0).toUpperCase();
            } else {
                avatar.textContent = '👤';
            }
            
            // Update user pills
            document.getElementById('user-role-pill').textContent = `${this.t('role')}: ${user.role || 'USER'}`;
            document.getElementById('user-department-pill').textContent = `${this.t('departmentLabel')}: ${user.department || 'General'}`;
            document.getElementById('user-email-pill').textContent = user.email || 'No email';
            
            // Populate profile form
            document.getElementById('profile-name').value = user.name || '';
            document.getElementById('profile-email').value = user.email || '';
            document.getElementById('profile-department').value = user.department || '';
        }
    }

    updateStatistics() {
        const totalNotices = this.notices.length;
        const acknowledgedCount = this.userSignatures.length;
        const pendingCount = this.notices.filter(n => 
            n.requiresSignature && !this.userSignatures.some(sig => sig.noticeId === n.id)
        ).length;
        const complianceRate = totalNotices > 0 ? Math.round((acknowledgedCount / totalNotices) * 100) : 0;

        document.getElementById('total-notices-stat').textContent = totalNotices;
        document.getElementById('acknowledged-stat').textContent = acknowledgedCount;
        document.getElementById('pending-stat').textContent = pendingCount;
        document.getElementById('compliance-rate').textContent = `${complianceRate}%`;
    }

    renderAckHistory() {
        const ackHistoryEl = document.getElementById('ack-history');
        if (!ackHistoryEl) return;

        // Show most recent first
        const sorted = [...this.userSignatures].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        if (sorted.length === 0) {
            ackHistoryEl.innerHTML = `
                <div class="text-center text-slate-400 py-8">
                    <div class="text-4xl mb-2">📝</div>
                    <p>${this.t('noAcks')}</p>
                </div>
            `;
            return;
        }

        ackHistoryEl.innerHTML = sorted.slice(0, 10).map(sig => {
            const notice = this.notices.find(n => n.id === sig.noticeId);
            const date = new Date(sig.timestamp);
            const formattedDate = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            return `
                <div class="bg-slate-700 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-2">
                        <span class="font-semibold text-white">${notice ? notice.title : 'Notice'}</span>
                        <span class="text-xs text-green-400">✅ Acknowledged</span>
                    </div>
                    <div class="flex items-center justify-between text-xs text-slate-400">
                        <span>${notice ? notice.category : 'Unknown Category'}</span>
                        <span>${formattedDate}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderActivityTimeline() {
        const timelineEl = document.getElementById('activity-timeline');
        if (!timelineEl) return;

        // Create activity timeline from user signatures
        const sorted = [...this.userSignatures].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        if (sorted.length === 0) {
            timelineEl.innerHTML = `
                <div class="text-center text-slate-400 py-8">
                    <div class="text-4xl mb-2">📊</div>
                    <p>No activity data available</p>
                </div>
            `;
            return;
        }

        timelineEl.innerHTML = sorted.slice(0, 15).map((sig, index) => {
            const notice = this.notices.find(n => n.id === sig.noticeId);
            const date = new Date(sig.timestamp);
            const timeAgo = this.getTimeAgo(date);
            
            return `
                <div class="flex items-start space-x-4">
                    <div class="flex-shrink-0 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        ${index + 1}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                            <p class="text-sm font-medium text-white">Acknowledged: ${notice ? notice.title : 'Notice'}</p>
                            <span class="text-xs text-slate-400">${timeAgo}</span>
                        </div>
                        <p class="text-xs text-slate-400">${date.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }

    renderLoadError() {
        const container = document.getElementById('main-content');
        if (!container) return;
        
        container.innerHTML = `
            <div class="text-center py-16">
                <div class="text-6xl mb-4">❌</div>
                <h3 class="text-xl font-bold text-red-400 mb-2">${this.t('errorLoading')}</h3>
                <p class="text-slate-400 mb-6">${this.loadError || 'An unknown error occurred while loading profile data.'}</p>
                <button id="retry-load-btn" class="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">${this.t('retry')}</button>
            </div>
        `;
        
        const retryBtn = document.getElementById('retry-load-btn');
        if (retryBtn) {
            retryBtn.onclick = async () => {
                container.innerHTML = '<div class="text-center py-16 text-slate-400">' + this.t('loading') + '</div>';
                await this.loadUserData();
                if (this.loadError) {
                    this.renderLoadError();
                } else {
                    this.renderProfile();
                }
            };
        }
    }

    setupEventListeners() {
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        
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
                this.updateStaticText();
                this.renderProfile();
            });
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshData(true);
            });
        }
        
        // Profile form
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateProfile();
            });
        }
    }

    updateStaticText() {
        // Update static UI text for i18n
        document.getElementById('logout-btn').textContent = this.t('logout');
        document.getElementById('home-btn').textContent = this.t('home');
        document.getElementById('main-title').textContent = 'AKL NoticeBoard';
        document.getElementById('portal-desc').textContent = this.t('userProfile');
        
        // Update form labels
        const nameLabel = document.querySelector('label[for="profile-name]');
        if (nameLabel) nameLabel.textContent = this.t('fullName');
        
        const emailLabel = document.querySelector('label[for="profile-email]');
        if (emailLabel) emailLabel.textContent = this.t('email');
        
        const deptLabel = document.querySelector('label[for="profile-department]');
        if (deptLabel) deptLabel.textContent = this.t('department');
        
        const pwdLabel = document.querySelector('label[for="profile-password]');
        if (pwdLabel) pwdLabel.textContent = this.t('changePassword');
        
        const pwdInput = document.getElementById('profile-password');
        if (pwdInput) pwdInput.placeholder = this.t('leaveBlank');
        
        const submitBtn = document.querySelector('#profile-form button[type="submit]');
        if (submitBtn) submitBtn.textContent = this.t('updateProfile');
    }

    async updateProfile() {
        const name = document.getElementById('profile-name').value.trim();
        const department = document.getElementById('profile-department').value.trim();
        const password = document.getElementById('profile-password').value;
        
        try {
            if (window.updateUserInDB && this.currentUser?.dbUser?.id) {
                await window.updateUserInDB(this.currentUser.dbUser.id, { name, department });
                this.currentUser.dbUser.name = name;
                this.currentUser.dbUser.department = department;
                this.updateUserInfo();
                this.showToast(this.t('profileUpdated'), 'success');
            } else {
                this.showToast('Profile update not available in demo.', 'warning');
            }
            
            // Password change (placeholder)
            if (password) {
                this.showToast(this.t('passwordChangeNotImplemented'), 'info');
            }
            
            // Clear password field
            document.getElementById('profile-password').value = '';
        } catch (e) {
            this.showToast(this.t('profileUpdateFailed'), 'error');
        }
    }

    async logout() {
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
        
        // Redirect to main noticeboard
        window.location.href = '../index.html';
    }

    updateLastUpdated() {
        const now = new Date();
        const lastUpdatedEl = document.getElementById('last-updated');
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = now.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
            });
        }
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
const userProfile = new UserProfile();
document.addEventListener('DOMContentLoaded', () => {
    userProfile.init();
});
