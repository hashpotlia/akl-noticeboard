// Simple Cognito Authentication (No Amplify needed)
class SimpleCognitoAuth {
    constructor() {
        this.clientId = '1n7mfqu9hgg7qplf3j95mbcnus';
        this.currentUser = null;
        this.accessToken = null;
    }

    async signIn(email, password) {
        try {
            console.log('🔐 Attempting sign in...');
            
            const response = await fetch('https://cognito-idp.us-east-1.amazonaws.com/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-amz-json-1.1',
                    'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth'
                },
                body: JSON.stringify({
                    ClientId: this.clientId,
                    AuthFlow: 'USER_PASSWORD_AUTH',
                    AuthParameters: {
                        USERNAME: email,
                        PASSWORD: password
                    }
                })
            });
            
            const result = await response.json();
            console.log('📋 Sign in response:', result);
            
            if (result.AuthenticationResult) {
                // Success - store user info
                this.accessToken = result.AuthenticationResult.AccessToken;
                this.currentUser = {
                    email: email,
                    accessToken: this.accessToken,
                    idToken: result.AuthenticationResult.IdToken,
                    refreshToken: result.AuthenticationResult.RefreshToken
                };
                
                // Store in localStorage for persistence
                localStorage.setItem('akl_auth_user', JSON.stringify(this.currentUser));
                
                console.log('✅ Sign in successful');
                return { success: true, user: this.currentUser };
            }
            
            if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
                // Handle password challenge
                return { 
                    success: false, 
                    challenge: 'NEW_PASSWORD_REQUIRED',
                    session: result.Session,
                    message: 'New password required'
                };
            }
            
            return { 
                success: false, 
                message: result.message || 'Authentication failed' 
            };
            
        } catch (error) {
            console.error('❌ Sign in error:', error);
            return { 
                success: false, 
                message: `Network error: ${error.message}` 
            };
        }
    }

    async setNewPassword(email, newPassword, session) {
        try {
            console.log('🔄 Setting new password...');
            
            const response = await fetch('https://cognito-idp.us-east-1.amazonaws.com/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-amz-json-1.1',
                    'X-Amz-Target': 'AWSCognitoIdentityProviderService.RespondToAuthChallenge'
                },
                body: JSON.stringify({
                    ClientId: this.clientId,
                    ChallengeName: 'NEW_PASSWORD_REQUIRED',
                    Session: session,
                    ChallengeResponses: {
                        USERNAME: email,
                        NEW_PASSWORD: newPassword
                    }
                })
            });
            
            const result = await response.json();
            console.log('📋 Password challenge response:', result);
            
            if (result.AuthenticationResult) {
                // Success - store user info
                this.accessToken = result.AuthenticationResult.AccessToken;
                this.currentUser = {
                    email: email,
                    accessToken: this.accessToken,
                    idToken: result.AuthenticationResult.IdToken,
                    refreshToken: result.AuthenticationResult.RefreshToken
                };
                
                // Store in localStorage
                localStorage.setItem('akl_auth_user', JSON.stringify(this.currentUser));
                
                console.log('✅ Password set and authentication completed');
                return { success: true, user: this.currentUser };
            }
            
            return { 
                success: false, 
                message: result.message || 'Failed to set password' 
            };
            
        } catch (error) {
            console.error('❌ Set password error:', error);
            return { 
                success: false, 
                message: `Network error: ${error.message}` 
            };
        }
    }

    async getCurrentUser() {
        // Check localStorage first
        const storedUser = localStorage.getItem('akl_auth_user');
        if (storedUser) {
            try {
                this.currentUser = JSON.parse(storedUser);
                this.accessToken = this.currentUser.accessToken;
                
                // TODO: Validate token is still valid
                console.log('✅ User restored from storage');
                return this.currentUser;
            } catch (error) {
                console.log('❌ Invalid stored user data');
                localStorage.removeItem('akl_auth_user');
            }
        }
        
        return null;
    }

    signOut() {
        this.currentUser = null;
        this.accessToken = null;
        localStorage.removeItem('akl_auth_user');
        console.log('✅ Signed out');
    }

    isAuthenticated() {
        return this.currentUser !== null && this.accessToken !== null;
    }
	
	// Add these methods to your SimpleCognitoAuth class

async signUp(email, password) {
    try {
        console.log('✨ Attempting sign up...');
        
        const response = await fetch('https://cognito-idp.us-east-1.amazonaws.com/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-amz-json-1.1',
                'X-Amz-Target': 'AWSCognitoIdentityProviderService.SignUp'
            },
            body: JSON.stringify({
                ClientId: this.clientId,
                Username: email,
                Password: password,
                UserAttributes: [
                    {
                        Name: 'email',
                        Value: email
                    }
                ]
            })
        });
        
        const result = await response.json();
        console.log('📋 Sign up response:', result);
        
        if (result.UserSub) {
            console.log('✅ Sign up successful - confirmation needed');
            return { 
                success: true, 
                needsConfirmation: true,
                message: 'Account created! Please check your email for confirmation code.' 
            };
        }
        
        return { 
            success: false, 
            message: result.message || 'Sign up failed' 
        };
        
    } catch (error) {
        console.error('❌ Sign up error:', error);
        return { 
            success: false, 
            message: `Network error: ${error.message}` 
        };
    }
}

async resetPassword(email) {
    try {
        console.log('🔑 Attempting password reset...');
        
        const response = await fetch('https://cognito-idp.us-east-1.amazonaws.com/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-amz-json-1.1',
                'X-Amz-Target': 'AWSCognitoIdentityProviderService.ForgotPassword'
            },
            body: JSON.stringify({
                ClientId: this.clientId,
                Username: email
            })
        });
        
        const result = await response.json();
        console.log('📋 Password reset response:', result);
        
        if (result.CodeDeliveryDetails) {
            console.log('✅ Password reset code sent');
            return { 
                success: true, 
                message: 'Password reset code sent to your email!' 
            };
        }
        
        return { 
            success: false, 
            message: result.message || 'Password reset failed' 
        };
        
    } catch (error) {
        console.error('❌ Password reset error:', error);
        return { 
            success: false, 
            message: `Network error: ${error.message}` 
        };
    }
}

// Add this method to your SimpleCognitoAuth class
async confirmPasswordReset(email, confirmationCode, newPassword) {
    try {
        console.log('🔐 Confirming password reset...');
        
        const response = await fetch('https://cognito-idp.us-east-1.amazonaws.com/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-amz-json-1.1',
                'X-Amz-Target': 'AWSCognitoIdentityProviderService.ConfirmForgotPassword'
            },
            body: JSON.stringify({
                ClientId: this.clientId,
                Username: email,
                ConfirmationCode: confirmationCode,
                Password: newPassword
            })
        });
        
        const result = await response.json();
        console.log('📋 Password reset confirmation response:', result);
        
        if (response.ok && !result.message) {
            console.log('✅ Password reset completed successfully');
            return { 
                success: true, 
                message: 'Password reset successfully! You can now sign in with your new password.' 
            };
        }
        
        return { 
            success: false, 
            message: result.message || 'Password reset confirmation failed' 
        };
        
    } catch (error) {
        console.error('❌ Password reset confirmation error:', error);
        return { 
            success: false, 
            message: `Network error: ${error.message}` 
        };
    }
}

// Add this method to your SimpleCognitoAuth class
async confirmSignUp(email, confirmationCode) {
    try {
        console.log('✅ Confirming sign up...');
        
        const response = await fetch('https://cognito-idp.us-east-1.amazonaws.com/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-amz-json-1.1',
                'X-Amz-Target': 'AWSCognitoIdentityProviderService.ConfirmSignUp'
            },
            body: JSON.stringify({
                ClientId: this.clientId,
                Username: email,
                ConfirmationCode: confirmationCode
            })
        });
        
        const result = await response.json();
        console.log('📋 Sign up confirmation response:', result);
        
        if (response.ok && !result.message) {
            console.log('✅ Account confirmed successfully');
            return { 
                success: true, 
                message: 'Account verified successfully! You can now sign in.' 
            };
        }
        
        return { 
            success: false, 
            message: result.message || 'Account verification failed' 
        };
        
    } catch (error) {
        console.error('❌ Sign up confirmation error:', error);
        return { 
            success: false, 
            message: `Network error: ${error.message}` 
        };
    }
}

// Add resend confirmation code method
async resendConfirmationCode(email) {
    try {
        console.log('📧 Resending confirmation code...');
        
        const response = await fetch('https://cognito-idp.us-east-1.amazonaws.com/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-amz-json-1.1',
                'X-Amz-Target': 'AWSCognitoIdentityProviderService.ResendConfirmationCode'
            },
            body: JSON.stringify({
                ClientId: this.clientId,
                Username: email
            })
        });
        
        const result = await response.json();
        console.log('📋 Resend confirmation response:', result);
        
        if (result.CodeDeliveryDetails) {
            console.log('✅ Confirmation code resent');
            return { 
                success: true, 
                message: 'Verification code sent to your email!' 
            };
        }
        
        return { 
            success: false, 
            message: result.message || 'Failed to resend code' 
        };
        
    } catch (error) {
        console.error('❌ Resend confirmation error:', error);
        return { 
            success: false, 
            message: `Network error: ${error.message}` 
        };
    }
}


	
}

// Initialize the auth system
const cognitoAuth = new SimpleCognitoAuth();


// AWS Backend Integration - Same as main app
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

// Enhanced GraphQL Queries for Admin
async function fetchAllNotices() {
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

async function fetchAllSignatures() {
    const query = `
        query ListAllSignatures {
            listSignatures {
                items {
                    id noticeId userId userName timestamp
                    createdAt updatedAt
                }
            }
        }
    `;
    const data = await graphqlRequest(query);
    return data.listSignatures.items;
}

// Create New Notice in Database
async function createNoticeInDB(noticeData) {
    const mutation = `
        mutation CreateNotice($input: CreateNoticeInput!) {
            createNotice(input: $input) {
                id title content category priority author
                createdAt expiresAt isPinned requiresSignature
                source tags updatedAt
            }
        }
    `;
    
    const variables = {
        input: noticeData
    };
    
    const data = await graphqlRequest(mutation, variables);
    return data.createNotice;
}

// Update Notice in Database - FIXED VERSION
async function updateNoticeInDB(noticeId, updates) {
    const mutation = `
        mutation UpdateNotice($input: UpdateNoticeInput!) {
            updateNotice(input: $input) {
                id title content category priority author
                createdAt expiresAt isPinned requiresSignature
                source tags updatedAt
            }
        }
    `;
    
    // Only include fields that exist in the UpdateNoticeInput schema
    const allowedFields = ['id', 'title', 'content', 'category', 'priority', 'isPinned', 'requiresSignature', 'tags'];
    const filteredUpdates = {};
    
    allowedFields.forEach(field => {
        if (field === 'id') {
            filteredUpdates[field] = noticeId;
        } else if (updates.hasOwnProperty(field)) {
            filteredUpdates[field] = updates[field];
        }
    });
    
    const data = await graphqlRequest(mutation, {
        input: filteredUpdates
    });
    return data.updateNotice;
}


// Delete Notice from Database
async function deleteNoticeFromDB(noticeId) {
    const mutation = `
        mutation DeleteNotice($input: DeleteNoticeInput!) {
            deleteNotice(input: $input) {
                id
            }
        }
    `;
    
    const data = await graphqlRequest(mutation, {
        input: { id: noticeId }
    });
    return data.deleteNotice;
}

// Delete Signature from Database
async function deleteSignatureFromDB(signatureId) {
    const mutation = `
        mutation DeleteSignature($input: DeleteSignatureInput!) {
            deleteSignature(input: $input) {
                id
            }
        }
    `;
    
    const data = await graphqlRequest(mutation, {
        input: { id: signatureId }
    });
    return data.deleteSignature;
}

// AKL Admin Panel - Complete Management System
class AKLAdminPanel {
    constructor() {
        this.notices = [];
        this.signatures = [];
        this.currentTab = 'dashboard';
        this.currentUser = null;
        this.isAuthenticated = false;
        this.autoRefreshInterval = null;
        this.richTextEditor = null;
        
        // Filters
        this.searchQuery = '';
        this.categoryFilter = '';
        this.priorityFilter = '';
        this.statusFilter = '';
        
        // Initialize with simple auth
        this.initializeAuth();
    }

    async initializeAuth() {
        console.log('🔍 Checking authentication status...');
        
        // Check if user is already authenticated
        const user = await cognitoAuth.getCurrentUser();
        if (user) {
            this.currentUser = user;
            this.isAuthenticated = true;
            this.hideLoginModal();
            this.init();
        } else {
            this.showLoginModal();
        }
    }

    // Show login modal
    showLoginModal() {
        console.log('📱 Showing login modal...');
        const loginModal = document.getElementById('login-modal');
        const adminApp = document.getElementById('admin-app');
        
        if (loginModal) {
            loginModal.classList.remove('hidden');
            loginModal.style.display = 'flex';
        }
        if (adminApp) {
            adminApp.style.display = 'none';
        }
        
        this.setupLoginHandlers();
    }

    // Hide login modal
    hideLoginModal() {
        console.log('✅ Hiding login modal...');
        const loginModal = document.getElementById('login-modal');
        const adminApp = document.getElementById('admin-app');
        
        if (loginModal) {
            loginModal.classList.add('hidden');
            loginModal.style.display = 'none';
        }
        if (adminApp) {
            adminApp.style.display = 'flex';
        }
    }

    // Setup login form handlers
setupLoginHandlers() {
    // Setup mode switching
    this.setupAuthModeSwitching();
    
    // Login form
    const loginForm = document.getElementById('login-form');
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleLogin();
    });
    
    // Signup form
    const signupForm = document.getElementById('signup-form');
    signupForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSignup();
    });
    
    // Reset form
    const resetForm = document.getElementById('reset-form');
    resetForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handlePasswordReset();
    });
    
    // NEW: Reset confirmation form
    const resetConfirmForm = document.getElementById('reset-confirm-form');
    resetConfirmForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handlePasswordResetConfirm();
    });
	
	    // NEW: Signup confirmation form
    const signupConfirmForm = document.getElementById('signup-confirm-form');
    signupConfirmForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSignupConfirm();
    });
    
    // NEW: Resend signup code button
    const resendSignupCodeBtn = document.getElementById('resend-signup-code-btn');
    resendSignupCodeBtn?.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.handleResendSignupCode();
    });
}


async handleSignup() {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const signupBtn = document.getElementById('signup-btn');
    const errorDiv = document.getElementById('login-error');
    
    if (!email || !password || !confirmPassword) {
        this.showError('Please fill in all fields', errorDiv);
        return;
    }
    
    if (password !== confirmPassword) {
        this.showError('Passwords do not match', errorDiv);
        return;
    }
    
    if (password.length < 8) {
        this.showError('Password must be at least 8 characters long', errorDiv);
        return;
    }
    
    try {
        signupBtn.textContent = '✨ Creating Account...';
        signupBtn.disabled = true;
        errorDiv.classList.add('hidden');
        
        const result = await cognitoAuth.signUp(email, password);
        
        if (result.success) {
            this.showSuccess(result.message, errorDiv);
            
            // Store email and password for confirmation step
            this.signupEmail = email;
            this.signupPassword = password;
            
            // Switch to confirmation form after short delay
            setTimeout(() => {
                this.switchAuthMode('signup-confirm');
            }, 2000);
        } else {
            this.showError(result.message, errorDiv);
        }
        
    } catch (error) {
        console.error('❌ Signup error:', error);
        this.showError('Signup failed. Please try again.', errorDiv);
    } finally {
        signupBtn.textContent = '✨ Create Account';
        signupBtn.disabled = false;
    }
}


async handlePasswordReset() {
    const email = document.getElementById('reset-email').value;
    const resetBtn = document.getElementById('reset-btn');
    const errorDiv = document.getElementById('login-error');
    
    if (!email) {
        this.showError('Please enter your email address', errorDiv);
        return;
    }
    
    try {
        resetBtn.textContent = '📧 Sending...';
        resetBtn.disabled = true;
        errorDiv.classList.add('hidden');
        
        const result = await cognitoAuth.resetPassword(email);
        
        if (result.success) {
            // Show success and switch to confirmation form
            this.showSuccess(result.message, errorDiv);
            
            // Store email for confirmation step
            this.resetEmail = email;
            
            // Switch to confirmation form after short delay
            setTimeout(() => {
                this.switchAuthMode('reset-confirm');
            }, 2000);
        } else {
            this.showError(result.message, errorDiv);
        }
        
    } catch (error) {
        console.error('❌ Password reset error:', error);
        this.showError('Password reset failed. Please try again.', errorDiv);
    } finally {
        resetBtn.textContent = '📧 Send Reset Link';
        resetBtn.disabled = false;
    }
}


showSuccess(message, errorDiv) {
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.className = 'mt-4 p-3 bg-green-900/50 border border-green-500 rounded-lg text-green-300 text-sm';
        errorDiv.classList.remove('hidden');
    }
}


    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const loginBtn = document.getElementById('login-btn');
        const errorDiv = document.getElementById('login-error');
        
        if (!email || !password) {
            this.showError('Please enter both email and password', errorDiv);
            return;
        }
        
        try {
            loginBtn.textContent = '🔄 Signing in...';
            loginBtn.disabled = true;
            errorDiv.classList.add('hidden');
            
            const result = await cognitoAuth.signIn(email, password);
            
            if (result.success) {
                console.log('✅ Login successful');
                this.currentUser = result.user;
                this.isAuthenticated = true;
                this.hideLoginModal();
                this.init();
                
            } else if (result.challenge === 'NEW_PASSWORD_REQUIRED') {
                // Handle password challenge
                const newPassword = prompt('🔐 Please enter a new password (minimum 8 characters):');
                
                if (newPassword && newPassword.length >= 8) {
                    loginBtn.textContent = '🔄 Setting password...';
                    
                    const passwordResult = await cognitoAuth.setNewPassword(email, newPassword, result.session);
                    
                    if (passwordResult.success) {
                        console.log('✅ Password set and login successful');
                        this.currentUser = passwordResult.user;
                        this.isAuthenticated = true;
                        
                        // Update password field
                        document.getElementById('login-password').value = newPassword;
                        
                        this.hideLoginModal();
                        this.init();
                    } else {
                        this.showError(passwordResult.message, errorDiv);
                    }
                } else {
                    this.showError('Password must be at least 8 characters long', errorDiv);
                }
                
            } else {
                this.showError(result.message, errorDiv);
            }
            
        } catch (error) {
            console.error('❌ Login error:', error);
            this.showError('Login failed. Please try again.', errorDiv);
        } finally {
            loginBtn.textContent = '🔐 Sign In';
            loginBtn.disabled = false;
        }
    }

    showError(message, errorDiv) {
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
        }
    }

// Enhanced logout method
logout() {
    console.log('🚪 Logging out user...');
    
    // Clear authentication
    cognitoAuth.signOut();
    this.isAuthenticated = false;
    this.currentUser = null;
    
    // Clear any intervals
    if (this.autoRefreshInterval) {
        clearInterval(this.autoRefreshInterval);
        this.autoRefreshInterval = null;
    }
    
    // Clear any modals
    this.closeAllModals();
    
    // Show success message
    this.showToast('Successfully logged out!', 'success');
    
    // Small delay to show the toast, then redirect to login
    setTimeout(() => {
        this.showLoginModal();
    }, 1000);
    
    console.log('✅ Logout completed');
}


    // Modified init method
    async init() {
        if (!this.isAuthenticated) {
            this.showLoginModal();
            return;
        }

        console.log('🚀 Initializing AKL Admin Panel...');
        
        this.setupEventListeners();
        await this.loadAllData();
        this.renderCurrentTab();
        this.startAutoRefresh();
        
        // Set admin name
        const adminNameEl = document.getElementById('admin-name');
        if (adminNameEl) {
            adminNameEl.textContent = this.currentUser.email || 'Manager';
        }
		
		this.setupLogoutButton();
        
        console.log('✅ AKL Admin Panel initialized successfully');
    }







    // Setup all event listeners
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileNav = document.getElementById('mobile-nav');
        if (mobileMenuBtn && mobileNav) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileNav.classList.toggle('hidden');
            });
        }

        // Search and filters
        const searchInput = document.getElementById('notice-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.renderNoticeManagement();
            });
        }

        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.categoryFilter = e.target.value;
                this.renderNoticeManagement();
            });
        }

        const priorityFilter = document.getElementById('priority-filter');
        if (priorityFilter) {
            priorityFilter.addEventListener('change', (e) => {
                this.priorityFilter = e.target.value;
                this.renderNoticeManagement();
            });
        }

        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.statusFilter = e.target.value;
                this.renderNoticeManagement();
            });
        }

        // Select all notices checkbox
        const selectAllCheckbox = document.getElementById('select-all-notices');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                const checkboxes = document.querySelectorAll('.notice-checkbox');
                checkboxes.forEach(cb => cb.checked = e.target.checked);
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'n':
                        e.preventDefault();
                        this.showPostNoticeModal();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.refreshData();
                        break;
                    case '1':
                        e.preventDefault();
                        this.switchTab('dashboard');
                        break;
                    case '2':
                        e.preventDefault();
                        this.switchTab('notices');
                        break;
                    case '3':
                        e.preventDefault();
                        this.switchTab('acknowledgments');
                        break;
                    case '4':
                        e.preventDefault();
                        this.switchTab('analytics');
                        break;
                }
            }
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    // Load all data for admin panel
    async loadAllData() {
        try {
            const [notices, signatures] = await Promise.all([
                fetchAllNotices(),
                fetchAllSignatures()
            ]);
            
            this.notices = notices || [];
            this.signatures = signatures || [];
            
            console.log('✅ Admin data loaded:', {
                notices: this.notices.length,
                signatures: this.signatures.length
            });
        } catch (error) {
            console.error('❌ Failed to load admin data:', error);
            this.showToast('Failed to load data from server', 'error');
            // Load sample data for demo
            this.loadSampleData();
        }
    }

    // Load sample data for development/demo
    loadSampleData() {
        this.notices = [
            {
                id: 'notice_001',
                title: 'Critical: New Safety Protocol Implementation',
                content: 'All DCO technicians must complete the new safety training module by EOD Friday.',
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
                content: 'Scheduled maintenance on all AKL cluster systems this Saturday 2AM-6AM NZST.',
                category: 'Operations',
                priority: 'high',
                author: 'DCEO Manager',
                createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                isPinned: true,
                requiresSignature: false,
                source: 'TacOps Update',
                tags: ['maintenance', 'weekend', 'systems']
            }
        ];

        this.signatures = [
            {
                id: 'sig_001',
                noticeId: 'notice_001',
                userId: 'user_001',
                userName: 'John Smith',
                timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
            }
        ];
    }

    // Calculate comprehensive statistics
    calculateStats() {
        const stats = {
            totalNotices: this.notices.length,
            criticalNotices: this.notices.filter(n => n.priority === 'critical').length,
            totalSignatures: this.signatures.length,
            pendingAcks: 0,
            overallComplianceRate: 0,
            totalUsers: new Set(this.signatures.map(s => s.userId)).size,
            overdueAcks: 0
        };

        // Calculate pending and overdue acknowledgments
        const requiresAckNotices = this.notices.filter(n => n.requiresSignature);
        const uniqueUsers = new Set(this.signatures.map(s => s.userId));
        
        requiresAckNotices.forEach(notice => {
            const noticeSignatures = this.signatures.filter(s => s.noticeId === notice.id);
            const expectedAcks = Math.max(uniqueUsers.size, 1); // At least 1 expected
            const actualAcks = noticeSignatures.length;
            const pending = Math.max(0, expectedAcks - actualAcks);
            stats.pendingAcks += pending;

            // Check for overdue (notices older than 24 hours without full acknowledgment)
            const noticeAge = Date.now() - new Date(notice.createdAt).getTime();
            if (noticeAge > 24 * 60 * 60 * 1000 && pending > 0) {
                stats.overdueAcks += pending;
            }
        });

        // Calculate compliance rate
        if (requiresAckNotices.length > 0 && uniqueUsers.size > 0) {
            const totalExpectedAcks = requiresAckNotices.length * uniqueUsers.size;
            const totalActualAcks = this.signatures.length;
            stats.overallComplianceRate = Math.round((totalActualAcks / totalExpectedAcks) * 100);
        }

        return stats;
    }

    // Calculate acknowledgment rate for a specific notice
    calculateNoticeAckRate(noticeId) {
        const notice = this.notices.find(n => n.id === noticeId);
        if (!notice || !notice.requiresSignature) return 100;

        const noticeSignatures = this.signatures.filter(s => s.noticeId === noticeId);
        const uniqueUsers = new Set(this.signatures.map(s => s.userId));
        
        if (uniqueUsers.size === 0) return 0;
        return Math.round((noticeSignatures.length / uniqueUsers.size) * 100);
    }

    // Calculate response time
    calculateResponseTime(noticeCreated, signatureTime) {
        const created = new Date(noticeCreated);
        const signed = new Date(signatureTime);
        const diffMs = signed - created;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffHours < 1) {
            return { hours: 0, text: `${diffMinutes}m` };
        } else if (diffHours < 24) {
            return { hours: diffHours, text: `${diffHours}h ${diffMinutes}m` };
        } else {
            const days = Math.floor(diffHours / 24);
            const remainingHours = diffHours % 24;
            return { hours: diffHours, text: `${days}d ${remainingHours}h` };
        }
    }

    // Tab management
    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update tab buttons
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll(`[data-tab="${tabName}"]`).forEach(tab => {
            tab.classList.add('active');
        });
        
        // Update content
        document.querySelectorAll('.admin-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const targetContent = document.getElementById(`${tabName}-content`);
        if (targetContent) {
            targetContent.classList.add('active');
        }
        
        this.renderCurrentTab();
    }

    // Render current tab content
    renderCurrentTab() {
        switch(this.currentTab) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'notices':
                this.renderNoticeManagement();
                break;
            case 'acknowledgments':
                this.renderAcknowledmentTracking();
                break;
            case 'analytics':
                this.renderAnalytics();
                break;
        }
    }

    // Render dashboard
    renderDashboard() {
        const stats = this.calculateStats();
        
        // Update metric cards
        const elements = {
            'total-notices-count': stats.totalNotices,
            'pending-acks-count': stats.pendingAcks,
            'critical-notices-count': stats.criticalNotices,
            'ack-rate': `${stats.overallComplianceRate}%`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });

        this.renderRecentActivity();
    }

    // Render recent activity
    renderRecentActivity() {
        const recentActivityEl = document.getElementById('recent-activity');
        if (!recentActivityEl) return;

        // Get recent signatures (last 10)
        const recentSignatures = this.signatures
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);

        // Get recent notices (last 5)
        const recentNotices = this.notices
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        const activities = [];

        // Add signature activities
        recentSignatures.forEach(sig => {
            const notice = this.notices.find(n => n.id === sig.noticeId);
            if (notice) {
                activities.push({
                    type: 'signature',
                    timestamp: sig.timestamp,
                    text: `${sig.userName} acknowledged "${notice.title}"`,
                    icon: '✍️'
                });
            }
        });

        // Add notice creation activities
        recentNotices.forEach(notice => {
            activities.push({
                type: 'notice',
                timestamp: notice.createdAt,
                text: `New ${notice.priority} notice posted: "${notice.title}"`,
                icon: this.getPriorityIcon(notice.priority)
            });
        });

        // Sort by timestamp and take top 10
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        activities.splice(10);

        recentActivityEl.innerHTML = activities.length > 0 ? activities.map(activity => `
            <div class="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg">
                <span class="text-lg">${activity.icon}</span>
                <div class="flex-1">
                    <p class="text-sm text-slate-300">${activity.text}</p>
                    <p class="text-xs text-slate-500">${this.getTimeAgo(activity.timestamp)}</p>
                </div>
            </div>
        `).join('') : `
            <div class="text-center text-slate-400 py-8">
                <p>No recent activity</p>
            </div>
        `;
    }

    // Render notice management
    renderNoticeManagement() {
        const tbody = document.getElementById('notices-table-body');
        if (!tbody) return;

        let filteredNotices = [...this.notices];

        // Apply filters
        if (this.searchQuery) {
            filteredNotices = filteredNotices.filter(notice => 
                notice.title.toLowerCase().includes(this.searchQuery) ||
                notice.content.toLowerCase().includes(this.searchQuery) ||
                notice.author.toLowerCase().includes(this.searchQuery)
            );
        }

        if (this.categoryFilter) {
            filteredNotices = filteredNotices.filter(notice => notice.category === this.categoryFilter);
        }

        if (this.priorityFilter) {
            filteredNotices = filteredNotices.filter(notice => notice.priority === this.priorityFilter);
        }

        if (this.statusFilter) {
            filteredNotices = filteredNotices.filter(notice => {
                switch(this.statusFilter) {
                    case 'active':
                        return !notice.expiresAt || new Date(notice.expiresAt) > new Date();
                    case 'expired':
                        return notice.expiresAt && new Date(notice.expiresAt) < new Date();
                    case 'pinned':
                        return notice.isPinned;
                    default:
                        return true;
                }
            });
        }

        // Sort notices (pinned first, then by creation date)
        filteredNotices.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        tbody.innerHTML = filteredNotices.map(notice => {
            const ackRate = this.calculateNoticeAckRate(notice.id);
            const isExpired = notice.expiresAt && new Date(notice.expiresAt) < new Date();
            
            return `
                <tr class="table-row ${isExpired ? 'opacity-60' : ''}">
                    <td class="table-cell">
                        <input type="checkbox" class="notice-checkbox rounded" value="${notice.id}">
                    </td>
                    <td class="table-cell">
                        <div class="flex items-center space-x-2">
                            ${notice.isPinned ? '<span class="text-amber-400">📌</span>' : ''}
                            <span class="font-medium text-white">${this.truncateText(notice.title, 50)}</span>
                        </div>
                    </td>
                    <td class="table-cell">
                        <span class="category-badge">${this.getCategoryIcon(notice.category)} ${notice.category}</span>
                    </td>
                    <td class="table-cell">
                        <span class="priority-badge priority-${notice.priority}">${this.getPriorityIcon(notice.priority)} ${notice.priority.toUpperCase()}</span>
                    </td>
                    <td class="table-cell">${notice.author}</td>
                    <td class="table-cell">${this.formatDate(notice.createdAt)}</td>
                    <td class="table-cell">
                        ${notice.requiresSignature ? `
                            <div class="flex items-center space-x-2">
                                <div class="progress-bar-small">
                                    <div class="progress-fill" style="width: ${ackRate}%"></div>
                                </div>
                                <span class="text-sm font-medium">${ackRate}%</span>
                            </div>
                        ` : '<span class="text-slate-400 text-sm">N/A</span>'}
                    </td>
                    <td class="table-cell">
                        <div class="flex items-center space-x-2">
                            <button class="action-btn edit" onclick="window.adminPanel.editNotice('${notice.id}')" title="Edit Notice">
                                ✏️
                            </button>
                            <button class="action-btn view" onclick="window.adminPanel.viewNoticeDetails('${notice.id}')" title="View Details">
                                👁️
                            </button>
                            <button class="action-btn delete" onclick="window.adminPanel.deleteNotice('${notice.id}')" title="Delete Notice">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Render acknowledgment tracking
    renderAcknowledmentTracking() {
        const stats = this.calculateStats();
        
        // Update quick stats
        const elements = {
            'overall-compliance-text': `${stats.overallComplianceRate}%`,
            'total-users-count': stats.totalUsers,
            'overdue-count': stats.overdueAcks
        };

        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });

        // Update compliance bar
        const complianceBar = document.getElementById('overall-compliance-bar');
        if (complianceBar) {
            complianceBar.style.width = `${stats.overallComplianceRate}%`;
        }

        // Render notice acknowledgment list
        const requiresAckNotices = this.notices.filter(n => n.requiresSignature);
        const noticeAckList = document.getElementById('notice-ack-list');
        
        if (noticeAckList) {
            noticeAckList.innerHTML = requiresAckNotices.map(notice => {
                const signatures = this.signatures.filter(s => s.noticeId === notice.id);
                const ackRate = this.calculateNoticeAckRate(notice.id);
                const uniqueUsers = new Set(this.signatures.map(s => s.userId));
                const pending = Math.max(0, uniqueUsers.size - signatures.length);

                return `
                    <div class="ack-notice-card">
                        <div class="flex items-center justify-between mb-2">
                            <h4 class="font-semibold text-white">${this.truncateText(notice.title, 40)}</h4>
                            <span class="priority-badge priority-${notice.priority}">${notice.priority}</span>
                        </div>
                        <div class="grid grid-cols-3 gap-4 text-sm mb-3">
                            <div>
                                <span class="text-slate-400">Acknowledged:</span>
                                <span class="text-green-400 font-bold">${signatures.length}</span>
                            </div>
                            <div>
                                <span class="text-slate-400">Pending:</span>
                                <span class="text-amber-400 font-bold">${pending}</span>
                            </div>
                            <div>
                                <span class="text-slate-400">Rate:</span>
                                <span class="text-white font-bold">${ackRate}%</span>
                            </div>
                        </div>
                        <div class="progress-bar mb-2">
                            <div class="progress-fill" style="width: ${ackRate}%"></div>
                        </div>
                        <button class="text-blue-400 text-sm hover:text-blue-300 transition-colors" 
                                onclick="window.adminPanel.viewNoticeAcknowledgments('${notice.id}')">
                            View Details →
                        </button>
                    </div>
                `;
            }).join('');
        }

        // Render detailed acknowledgment table
        this.renderAcknowledmentTable();
    }

    // Render acknowledgment table
    renderAcknowledmentTable() {
        const tbody = document.getElementById('acknowledgment-table-body');
        if (!tbody) return;

        const acknowledgments = this.signatures.map(sig => {
            const notice = this.notices.find(n => n.id === sig.noticeId);
            const responseTime = this.calculateResponseTime(notice?.createdAt, sig.timestamp);
            
            return {
                ...sig,
                noticeTitle: notice?.title || 'Unknown Notice',
                noticePriority: notice?.priority || 'medium',
                responseTime
            };
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        tbody.innerHTML = acknowledgments.map(ack => `
            <tr class="table-row">
                <td class="table-cell">
                    <div class="flex items-center space-x-2">
                        <span class="priority-badge priority-${ack.noticePriority} text-xs">${ack.noticePriority}</span>
                        <span class="font-medium">${this.truncateText(ack.noticeTitle, 30)}</span>
                    </div>
                </td>
                <td class="table-cell">
                    <span class="font-medium text-white">${ack.userName}</span>
                </td>
                <td class="table-cell">
                    <div>
                        <div class="text-sm">${this.formatDate(ack.timestamp)}</div>
                        <div class="text-xs text-slate-400">${this.getTimeAgo(ack.timestamp)}</div>
                    </div>
                </td>
                <td class="table-cell">
                    <span class="text-sm ${ack.responseTime.hours > 24 ? 'text-red-400' : 'text-green-400'}">${ack.responseTime.text}</span>
                </td>
                <td class="table-cell">
                    <span class="status-active">✅ Acknowledged</span>
                </td>
            </tr>
        `).join('');
    }

    // Render analytics
    renderAnalytics() {
        // Category breakdown
        const categoryBreakdown = document.getElementById('category-breakdown');
        if (categoryBreakdown) {
            const categories = {};
            this.notices.forEach(notice => {
                if (!categories[notice.category]) {
                    categories[notice.category] = { count: 0, ackRate: 0 };
                }
                categories[notice.category].count++;
            });

            // Calculate acknowledgment rates for each category
            Object.keys(categories).forEach(category => {
                const categoryNotices = this.notices.filter(n => n.category === category && n.requiresSignature);
                if (categoryNotices.length > 0) {
                    const totalAckRate = categoryNotices.reduce((sum, notice) => sum + this.calculateNoticeAckRate(notice.id), 0);
                    categories[category].ackRate = Math.round(totalAckRate / categoryNotices.length);
                } else {
                    categories[category].ackRate = 100; // No acknowledgment required
                }
            });

            categoryBreakdown.innerHTML = Object.entries(categories).map(([category, data]) => `
                <div class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <div class="flex items-center space-x-3">
                        <span class="text-lg">${this.getCategoryIcon(category)}</span>
                        <div>
                            <span class="font-medium text-white">${category}</span>
                            <div class="text-xs text-slate-400">${data.count} notices</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm font-bold text-white">${data.ackRate}%</div>
                        <div class="text-xs text-slate-400">ack rate</div>
                    </div>
                </div>
            `).join('');
        }

        // User performance
        const userPerformance = document.getElementById('user-performance');
        if (userPerformance) {
            const userStats = {};
            this.signatures.forEach(sig => {
                if (!userStats[sig.userName]) {
                    userStats[sig.userName] = { count: 0, avgResponseTime: 0 };
                }
                userStats[sig.userName].count++;
            });

            const topUsers = Object.entries(userStats)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 10);

            userPerformance.innerHTML = topUsers.map(([userName, stats]) => `
                <div class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <div class="flex items-center space-x-3">
                        <span class="text-lg">👤</span>
                        <span class="font-medium text-white">${userName}</span>
                    </div>
                    <div class="text-right">
                        <div class="text-sm font-bold text-white">${stats.count}</div>
                        <div class="text-xs text-slate-400">acknowledgments</div>
                    </div>
                </div>
            `).join('');
        }
    }

    // CRUD Operations
    // Enhanced delete notice with ONLY custom confirmation
    async deleteNotice(noticeId) {
        const notice = this.notices.find(n => n.id === noticeId);
        if (!notice) {
            this.showToast('Notice not found', 'error');
            return;
        }

        const signatures = this.signatures.filter(s => s.noticeId === noticeId);
        const additionalInfo = signatures.length > 0 
            ? `This notice has ${signatures.length} acknowledgment(s) that will also be deleted.`
            : 'No acknowledgments to delete.';

        // ONLY use custom confirmation - NO browser confirm()
        const confirmed = await this.showDeleteConfirmation('Notice', notice.title, additionalInfo);
        
        if (!confirmed) return;

        try {
            // Delete from database
            await deleteNoticeFromDB(noticeId);
            
            // Delete associated signatures
            const signaturesToDelete = this.signatures.filter(s => s.noticeId === noticeId);
            for (const sig of signaturesToDelete) {
                try {
                    await deleteSignatureFromDB(sig.id);
                } catch (error) {
                    console.warn('Failed to delete signature:', sig.id, error);
                }
            }

            // Remove from local arrays
            this.notices = this.notices.filter(n => n.id !== noticeId);
            this.signatures = this.signatures.filter(s => s.noticeId !== noticeId);
            
            this.renderCurrentTab();
            this.showToast('Notice deleted successfully!', 'success');
            
        } catch (error) {
            console.error('Failed to delete notice:', error);
            this.showToast('Failed to delete notice', 'error');
        }
    }



    async updateNotice(noticeId, updates) {
        try {
            const updatedNotice = await updateNoticeInDB(noticeId, updates);

            // Update local array
            const index = this.notices.findIndex(n => n.id === noticeId);
            if (index !== -1) {
                this.notices[index] = updatedNotice;
            }

            this.renderCurrentTab();
            this.showToast('Notice updated successfully!', 'success');
            
        } catch (error) {
            console.error('Failed to update notice:', error);
            this.showToast('Failed to update notice', 'error');
        }
    }

    // Edit notice
    editNotice(noticeId) {
        const notice = this.notices.find(n => n.id === noticeId);
        if (!notice) return;

        this.showEditNoticeModal(notice);
    }

    // View notice details
    viewNoticeDetails(noticeId) {
        const notice = this.notices.find(n => n.id === noticeId);
        if (!notice) return;

        this.showNoticeDetailsModal(notice);
    }

    // View notice acknowledgments
    viewNoticeAcknowledgments(noticeId) {
        const notice = this.notices.find(n => n.id === noticeId);
        if (!notice) return;

        const signatures = this.signatures.filter(s => s.noticeId === noticeId);
        this.showAcknowledgmentDetailsModal(notice, signatures);
    }

    // Show post notice modal
    showPostNoticeModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content w-full max-w-4xl">
                <!-- Modal Header -->
                <div class="modal-header">
                    <h2 class="text-xl font-bold text-slate-100">📝 Post New Notice</h2>
                </div>
                
                <!-- Modal Body - Scrollable -->
                <div class="modal-body">
                    <form id="post-notice-form" class="space-y-4">
                        <div class="form-group">
                            <label class="form-label">Your Name/Alias *</label>
                            <input type="text" name="author" class="form-input" required 
                                   placeholder="Enter your name or alias" 
                                   value="${this.currentUser.name}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Title *</label>
                            <input type="text" name="title" class="form-input" required 
                                   placeholder="Enter notice title">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Content *</label>
                            <div id="rich-text-editor" class="rich-text-editor"></div>
                            <input type="hidden" name="content" id="hidden-content">
                            <p class="text-xs text-slate-400 mt-2">
                                💡 Use the toolbar above to format your content with headers, lists, bold text, and more!
                            </p>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <input type="text" name="tags" class="form-input" 
                                   placeholder="safety, training, mandatory">
                            <p class="text-xs text-slate-400 mt-1">
                                Add tags to help categorize and search for this notice
                            </p>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Expiry Date (optional)</label>
                            <input type="datetime-local" name="expiresAt" class="form-input">
                            <p class="text-xs text-slate-400 mt-1">
                                Leave blank for no expiry
                            </p>
                        </div>
                        <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
                            <label class="flex items-center space-x-2">
                                <input type="checkbox" name="isPinned" class="rounded">
                                <span class="text-sm">📌 Pin this notice to the top</span>
                            </label>
                            <label class="flex items-center space-x-2">
                                <input type="checkbox" name="requiresSignature" class="rounded">
                                <span class="text-sm">✍️ Requires acknowledgment</span>
                            </label>
                        </div>
                    </form>
                </div>
                
                <!-- Modal Footer -->
                <div class="modal-footer">
                    <button onclick="window.adminPanel.closeAllModals()" 
                            class="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button onclick="window.adminPanel.submitNotice()" 
                            class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors">
                        📝 Post Notice
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('modal-container').appendChild(modal);
        
        // Initialize rich text editor
        setTimeout(() => {
            this.initializeRichTextEditor();
            const authorInput = modal.querySelector('input[name="author"]');
            if (authorInput && !authorInput.value) {
                authorInput.focus();
            }
        }, 100);
    }

    // Show edit notice modal
    showEditNoticeModal(notice) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content w-full max-w-4xl">
                <!-- Modal Header -->
                <div class="modal-header">
                    <h2 class="text-xl font-bold text-slate-100">✏️ Edit Notice</h2>
                </div>
                
                <!-- Modal Body - Scrollable -->
                <div class="modal-body">
                    <form id="edit-notice-form" class="space-y-4">
                        <input type="hidden" name="noticeId" value="${notice.id}">
                        <div class="form-group">
                            <label class="form-label">Title *</label>
                            <input type="text" name="title" class="form-input" required 
                                   value="${notice.title}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Content *</label>
                            <div id="edit-rich-text-editor" class="rich-text-editor"></div>
                            <input type="hidden" name="content" id="edit-hidden-content" value="${notice.content}">
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="form-group">
                                <label class="form-label">Category *</label>
                                <select name="category" class="form-select" required>
                                    <option value="Safety" ${notice.category === 'Safety' ? 'selected' : ''}>🦺 Safety</option>
                                    <option value="Operations" ${notice.category === 'Operations' ? 'selected' : ''}>⚙️ Operations</option>
                                    <option value="Policy" ${notice.category === 'Policy' ? 'selected' : ''}>📜 Policy</option>
                                    <option value="HR" ${notice.category === 'HR' ? 'selected' : ''}>👥 HR</option>
                                    <option value="Training" ${notice.category === 'Training' ? 'selected' : ''}>🎓 Training</option>
                                    <option value="Maintenance" ${notice.category === 'Maintenance' ? 'selected' : ''}>🔧 Maintenance</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Priority *</label>
                                <select name="priority" class="form-select" required>
                                    <option value="critical" ${notice.priority === 'critical' ? 'selected' : ''}>🚨 Critical</option>
                                    <option value="high" ${notice.priority === 'high' ? 'selected' : ''}>⚠️ High</option>
                                    <option value="medium" ${notice.priority === 'medium' ? 'selected' : ''}>📋 Medium</option>
                                    <option value="low" ${notice.priority === 'low' ? 'selected' : ''}>💡 Low</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Tags (comma-separated)</label>
                            <input type="text" name="tags" class="form-input" 
                                   value="${notice.tags ? notice.tags.join(', ') : ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Expiry Date</label>
                            <input type="datetime-local" name="expiresAt" class="form-input" 
                                   value="${notice.expiresAt ? new Date(notice.expiresAt).toISOString().slice(0, 16) : ''}">
                        </div>
                        <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
                            <label class="flex items-center space-x-2">
                                <input type="checkbox" name="isPinned" class="rounded" ${notice.isPinned ? 'checked' : ''}>
                                <span class="text-sm">📌 Pin this notice to the top</span>
                            </label>
                            <label class="flex items-center space-x-2">
                                <input type="checkbox" name="requiresSignature" class="rounded" ${notice.requiresSignature ? 'checked' : ''}>
                                <span class="text-sm">✍️ Requires acknowledgment</span>
                            </label>
                        </div>
                    </form>
                </div>
                
                <!-- Modal Footer -->
                <div class="modal-footer">
                    <button onclick="window.adminPanel.closeAllModals()" 
                            class="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button onclick="window.adminPanel.submitEditNotice()" 
                            class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                        ✏️ Update Notice
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('modal-container').appendChild(modal);
        
        // Initialize rich text editor with existing content
        setTimeout(() => {
            this.initializeEditRichTextEditor(notice.content);
        }, 100);
    }

    // Show notice details modal
    showNoticeDetailsModal(notice) {
        const signatures = this.signatures.filter(s => s.noticeId === notice.id);
        const ackRate = this.calculateNoticeAckRate(notice.id);
        const isExpired = notice.expiresAt && new Date(notice.expiresAt) < new Date();

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content w-full max-w-4xl">
                <!-- Modal Header -->
                <div class="modal-header">
                    <div class="flex items-center justify-between w-full">
                        <h2 class="text-xl font-bold text-slate-100">👁️ Notice Details</h2>
                        <div class="flex items-center space-x-2">
                            <span class="priority-badge priority-${notice.priority}">${this.getPriorityIcon(notice.priority)} ${notice.priority.toUpperCase()}</span>
                            ${notice.isPinned ? '<span class="text-amber-400">📌 PINNED</span>' : ''}
                            ${isExpired ? '<span class="text-red-400">⚠️ EXPIRED</span>' : ''}
                        </div>
                    </div>
                </div>
                
                <!-- Modal Body - Scrollable -->
                <div class="modal-body">
                    <div class="space-y-6">
                        <!-- Notice Info -->
                        <div>
                            <h3 class="text-2xl font-bold text-white mb-4">${notice.title}</h3>
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                                <div>
                                    <span class="text-slate-400">Author:</span>
                                    <span class="text-white font-medium">${notice.author}</span>
                                </div>
                                <div>
                                    <span class="text-slate-400">Category:</span>
                                    <span class="text-white font-medium">${this.getCategoryIcon(notice.category)} ${notice.category}</span>
                                </div>
                                <div>
                                    <span class="text-slate-400">Created:</span>
                                    <span class="text-white font-medium">${this.formatDate(notice.createdAt)}</span>
                                </div>
                                <div>
                                    <span class="text-slate-400">Source:</span>
                                    <span class="text-white font-medium">${notice.source}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Content -->
                        <div>
                            <h4 class="text-lg font-semibold text-white mb-2">Content</h4>
                            <div class="bg-slate-700/50 rounded-lg p-4 notice-content">
                                ${this.renderRichTextContent(notice.content)}
                            </div>
                        </div>

                        <!-- Tags -->
                        ${notice.tags && notice.tags.length > 0 ? `
                            <div>
                                <h4 class="text-lg font-semibold text-white mb-2">Tags</h4>
                                <div class="flex flex-wrap gap-2">
                                    ${notice.tags.map(tag => `
                                        <span class="bg-slate-700 text-slate-300 px-2 py-1 rounded-full text-xs font-medium">
                                            #${tag}
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <!-- Acknowledgment Status -->
                        ${notice.requiresSignature ? `
                            <div>
                                <h4 class="text-lg font-semibold text-white mb-2">Acknowledgment Status</h4>
                                <div class="bg-slate-700/50 rounded-lg p-4">
                                    <div class="flex items-center justify-between mb-3">
                                        <span class="text-slate-300">Acknowledgment Rate</span>
                                        <span class="text-white font-bold text-lg">${ackRate}%</span>
                                    </div>
                                    <div class="progress-bar mb-3">
                                        <div class="progress-fill" style="width: ${ackRate}%"></div>
                                    </div>
                                    <div class="text-sm text-slate-400">
                                        ${signatures.length} out of ${new Set(this.signatures.map(s => s.userId)).size} users have acknowledged this notice
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Recent Acknowledgments -->
                        ${signatures.length > 0 ? `
                            <div>
                                <h4 class="text-lg font-semibold text-white mb-2">Recent Acknowledgments</h4>
                                <div class="bg-slate-700/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                                    ${signatures.slice(0, 10).map(sig => `
                                        <div class="flex items-center justify-between py-2 border-b border-slate-600 last:border-b-0">
                                            <span class="font-medium text-white">${sig.userName}</span>
                                            <span class="text-sm text-slate-400">${this.getTimeAgo(sig.timestamp)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Modal Footer -->
                <div class="modal-footer">
                    <button onclick="window.adminPanel.closeAllModals()" 
                            class="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors">
                        Close
                    </button>
                    <button onclick="window.adminPanel.editNotice('${notice.id}')" 
                            class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                        ✏️ Edit Notice
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('modal-container').appendChild(modal);
    }

    // Initialize rich text editor
    initializeRichTextEditor() {
        const editorContainer = document.getElementById('rich-text-editor');
        if (!editorContainer || typeof Quill === 'undefined') return;

        this.richTextEditor = new Quill('#rich-text-editor', {
            theme: 'snow',
            placeholder: 'Write your notice content here...',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'indent': '-1'}, { 'indent': '+1' }],
                    ['blockquote', 'code-block'],
                    ['link'],
                    [{ 'align': [] }],
                    ['clean']
                ]
            }
        });

        // Set dark theme colors
        this.applyEditorDarkTheme(editorContainer);
    }

    // Initialize edit rich text editor
    initializeEditRichTextEditor(content) {
        const editorContainer = document.getElementById('edit-rich-text-editor');
        if (!editorContainer || typeof Quill === 'undefined') return;

        this.editRichTextEditor = new Quill('#edit-rich-text-editor', {
            theme: 'snow',
            placeholder: 'Write your notice content here...',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'indent': '-1'}, { 'indent': '+1' }],
                    ['blockquote', 'code-block'],
                    ['link'],
                    [{ 'align': [] }],
                    ['clean']
                ]
            }
        });

        // Set existing content
        this.editRichTextEditor.root.innerHTML = content;

        // Set dark theme colors
        this.applyEditorDarkTheme(editorContainer);
    }

    // Apply dark theme to editor
    applyEditorDarkTheme(editorContainer) {
        const toolbar = editorContainer.querySelector('.ql-toolbar');
        const container = editorContainer.querySelector('.ql-container');
        
        if (toolbar) {
            toolbar.style.backgroundColor = '#1e293b';
            toolbar.style.borderColor = '#374151';
        }
        
        if (container) {
            container.style.backgroundColor = '#0f172a';
            container.style.borderColor = '#374151';
            container.style.color = '#e5e7eb';
        }
    }



    // Submit edit notice
    async submitEditNotice() {
        const form = document.getElementById('edit-notice-form');
        const formData = new FormData(form);
        const noticeId = formData.get('noticeId');
        
        // Get rich text content
        let content = '';
        if (this.editRichTextEditor) {
            content = this.editRichTextEditor.root.innerHTML;
            const textContent = this.editRichTextEditor.getText().trim();
            if (!textContent) {
                this.showToast('Please enter notice content', 'error');
                return;
            }
        } else {
            content = formData.get('content');
            if (!content || content.trim() === '') {
                this.showToast('Please enter notice content', 'error');
                return;
            }
        }
        
        const updates = {
            title: formData.get('title'),
            content: content,
            category: formData.get('category'),
            priority: formData.get('priority'),
            isPinned: formData.get('isPinned') === 'on',
            requiresSignature: formData.get('requiresSignature') === 'on',
            tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()) : [],
            expiresAt: formData.get('expiresAt') ? new Date(formData.get('expiresAt')).toISOString() : null,
            updatedAt: new Date().toISOString()
        };
        
        await this.updateNotice(noticeId, updates);
        this.closeAllModals();
    }

    // Auto refresh functionality
    startAutoRefresh() {
        this.autoRefreshInterval = setInterval(() => {
            this.refreshData();
        }, 60000); // Refresh every 1 minute
    }

    async refreshData() {
        try {
            await this.loadAllData();
            this.renderCurrentTab();
            this.showToast('Data refreshed successfully!', 'success');
        } catch (error) {
            this.showToast('Failed to refresh data', 'error');
        }
    }

    // Utility functions
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
            Maintenance: '🔧'
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

    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('en-NZ', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Pacific/Auckland'
        });
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    renderRichTextContent(content) {
        if (content && (content.includes('<') || content.includes('&'))) {
            return content;
        }
        return content ? content.replace(/\n/g, '<br>') : '';
    }

    // Toast notifications
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

    closeAllModals() {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) modalContainer.innerHTML = '';
    }
	
	    // ============================================================================
    // MISSING METHODS
    // ============================================================================

    // Post critical notice with pre-filled critical priority
    postCriticalNotice() {
        this.showPostNoticeModal(true); // Pass true for critical
    }

    // Enhanced showPostNoticeModal with critical option
    showPostNoticeModal(isCritical = false) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content w-full max-w-4xl">
                <!-- Modal Header -->
                <div class="modal-header">
                    <h2 class="text-xl font-bold text-slate-100">
                        ${isCritical ? '🚨 Post Critical Notice' : '📝 Post New Notice'}
                    </h2>
                </div>
                
                <!-- Modal Body - Scrollable -->
                <div class="modal-body">
                    <form id="post-notice-form" class="space-y-4">
                        <div class="form-group">
                            <label class="form-label">Your Name/Alias *</label>
                            <input type="text" name="author" class="form-input" required 
                                   placeholder="Enter your name or alias" 
                                   value="${this.currentUser.name}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Title *</label>
                            <input type="text" name="title" class="form-input" required 
                                   placeholder="Enter notice title">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Content *</label>
                            <div id="rich-text-editor" class="rich-text-editor"></div>
                            <input type="hidden" name="content" id="hidden-content">
                            <p class="text-xs text-slate-400 mt-2">
                                💡 Use the toolbar above to format your content with headers, lists, bold text, and more!
                            </p>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="form-group">
                                <label class="form-label">Category *</label>
                                <select name="category" class="form-select" required>
                                    <option value="">Select Category</option>
                                    <option value="Safety" ${isCritical ? 'selected' : ''}>🦺 Safety</option>
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
                                    <option value="critical" ${isCritical ? 'selected' : ''}>🚨 Critical</option>
                                    <option value="high">⚠️ High</option>
                                    <option value="medium">📋 Medium</option>
                                    <option value="low">💡 Low</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Tags (comma-separated)</label>
                            <input type="text" name="tags" class="form-input" 
                                   placeholder="safety, training, mandatory"
                                   value="${isCritical ? 'critical, safety, urgent' : ''}">
                            <p class="text-xs text-slate-400 mt-1">
                                Add tags to help categorize and search for this notice
                            </p>
                        </div>
                        <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
                            <label class="flex items-center space-x-2">
                                <input type="checkbox" name="isPinned" class="rounded" ${isCritical ? 'checked' : ''}>
                                <span class="text-sm">📌 Pin this notice to the top</span>
                            </label>
                            <label class="flex items-center space-x-2">
                                <input type="checkbox" name="requiresSignature" class="rounded" ${isCritical ? 'checked' : ''}>
                                <span class="text-sm">✍️ Requires acknowledgment</span>
                            </label>
                        </div>
                    </form>
                </div>
                
                <!-- Modal Footer -->
                <div class="modal-footer">
                    <button onclick="this.closest('.modal').remove()" 
                            class="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button onclick="submitNotice()" 
                            class="px-4 py-2 ${isCritical ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-600 hover:bg-amber-500'} text-white rounded-lg transition-colors">
                        ${isCritical ? '🚨 Post Critical Notice' : '📝 Post Notice'}
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('modal-container').appendChild(modal);
        
        // Initialize rich text editor
        setTimeout(() => {
            this.initializeRichTextEditor();
            const authorInput = modal.querySelector('input[name="author"]');
            if (authorInput && !authorInput.value) {
                authorInput.focus();
            }
        }, 100);
    }

    // Submit new notice
    async submitNotice() {
        const form = document.getElementById('post-notice-form');
        const formData = new FormData(form);
        
        const authorName = formData.get('author');
        if (!authorName || authorName.trim() === '') {
            this.showToast('Please enter your name/alias', 'error');
            return;
        }

        // Get rich text content
        let content = '';
        if (this.richTextEditor) {
            content = this.richTextEditor.root.innerHTML;
            const textContent = this.richTextEditor.getText().trim();
            if (!textContent) {
                this.showToast('Please enter notice content', 'error');
                return;
            }
        } else {
            content = formData.get('content');
            if (!content || content.trim() === '') {
                this.showToast('Please enter notice content', 'error');
                return;
            }
        }
        
        const notice = {
            title: formData.get('title'),
            content: content,
            category: formData.get('category'),
            priority: formData.get('priority'),
            author: authorName.trim(),
            source: 'Manager Portal',
            isPinned: formData.get('isPinned') === 'on',
            requiresSignature: formData.get('requiresSignature') === 'on',
            tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()) : []
        };
        
        // Update current user name if different
        if (authorName.trim() !== this.currentUser.name) {
            this.saveCurrentUser({
                ...this.currentUser,
                name: authorName.trim()
            });
        }
        
        try {
            const uniqueId = 'notice-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            const noticeWithId = {
                id: uniqueId,
                ...notice,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            };

            const awsNotice = await createNoticeInDB(noticeWithId);
            this.notices.unshift(awsNotice);
            this.renderCurrentTab();
            this.closeAllModals();
            this.showToast('Notice posted successfully!', 'success');
        } catch (error) {
            console.log('AWS save failed, saving locally:', error);
            const localNotice = {
                id: 'notice_' + Date.now(),
                ...notice,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            };
            this.notices.unshift(localNotice);
            this.renderCurrentTab();
            this.closeAllModals();
            this.showToast('Notice posted locally!', 'warning');
        }
    }

    // Edit notice
    editNotice(noticeId) {
        const notice = this.notices.find(n => n.id === noticeId);
        if (!notice) {
            this.showToast('Notice not found', 'error');
            return;
        }

        this.showEditNoticeModal(notice);
    }

    // Show edit notice modal
    showEditNoticeModal(notice) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content w-full max-w-4xl">
                <!-- Modal Header -->
                <div class="modal-header">
                    <h2 class="text-xl font-bold text-slate-100">✏️ Edit Notice</h2>
                </div>
                
                <!-- Modal Body - Scrollable -->
                <div class="modal-body">
                    <form id="edit-notice-form" class="space-y-4">
                        <input type="hidden" name="noticeId" value="${notice.id}">
                        <div class="form-group">
                            <label class="form-label">Title *</label>
                            <input type="text" name="title" class="form-input" required 
                                   value="${notice.title}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Content *</label>
                            <div id="edit-rich-text-editor" class="rich-text-editor"></div>
                            <input type="hidden" name="content" id="edit-hidden-content">
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="form-group">
                                <label class="form-label">Category *</label>
                                <select name="category" class="form-select" required>
                                    <option value="Safety" ${notice.category === 'Safety' ? 'selected' : ''}>🦺 Safety</option>
                                    <option value="Operations" ${notice.category === 'Operations' ? 'selected' : ''}>⚙️ Operations</option>
                                    <option value="Policy" ${notice.category === 'Policy' ? 'selected' : ''}>📜 Policy</option>
                                    <option value="HR" ${notice.category === 'HR' ? 'selected' : ''}>👥 HR</option>
                                    <option value="Training" ${notice.category === 'Training' ? 'selected' : ''}>🎓 Training</option>
                                    <option value="Maintenance" ${notice.category === 'Maintenance' ? 'selected' : ''}>🔧 Maintenance</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Priority *</label>
                                <select name="priority" class="form-select" required>
                                    <option value="critical" ${notice.priority === 'critical' ? 'selected' : ''}>🚨 Critical</option>
                                    <option value="high" ${notice.priority === 'high' ? 'selected' : ''}>⚠️ High</option>
                                    <option value="medium" ${notice.priority === 'medium' ? 'selected' : ''}>📋 Medium</option>
                                    <option value="low" ${notice.priority === 'low' ? 'selected' : ''}>💡 Low</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Tags (comma-separated)</label>
                            <input type="text" name="tags" class="form-input" 
                                   value="${notice.tags ? notice.tags.join(', ') : ''}">
                        </div>
                        <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
                            <label class="flex items-center space-x-2">
                                <input type="checkbox" name="isPinned" class="rounded" ${notice.isPinned ? 'checked' : ''}>
                                <span class="text-sm">📌 Pin this notice to the top</span>
                            </label>
                            <label class="flex items-center space-x-2">
                                <input type="checkbox" name="requiresSignature" class="rounded" ${notice.requiresSignature ? 'checked' : ''}>
                                <span class="text-sm">✍️ Requires acknowledgment</span>
                            </label>
                        </div>
                    </form>
                </div>
                
                <!-- Modal Footer -->
                <div class="modal-footer">
                    <button onclick="this.closest('.modal').remove()" 
                            class="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button onclick="submitEditNotice()" 
                            class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                        ✏️ Update Notice
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('modal-container').appendChild(modal);
        
        // Initialize rich text editor with existing content
        setTimeout(() => {
            this.initializeEditRichTextEditor(notice.content);
        }, 100);
    }

    // Initialize rich text editor for editing
    initializeEditRichTextEditor(existingContent = '') {
        const editorContainer = document.getElementById('edit-rich-text-editor');
        if (!editorContainer || typeof Quill === 'undefined') return;

        this.editRichTextEditor = new Quill('#edit-rich-text-editor', {
            theme: 'snow',
            placeholder: 'Write your notice content here...',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'indent': '-1'}, { 'indent': '+1' }],
                    ['blockquote', 'code-block'],
                    ['link'],
                    [{ 'align': [] }],
                    ['clean']
                ]
            }
        });

        // Set existing content
        if (existingContent) {
            this.editRichTextEditor.root.innerHTML = existingContent;
        }

        // Set dark theme colors
        const toolbar = editorContainer.querySelector('.ql-toolbar');
        const container = editorContainer.querySelector('.ql-container');
        
        if (toolbar) {
            toolbar.style.backgroundColor = '#1e293b';
            toolbar.style.borderColor = '#374151';
        }
        
        if (container) {
            container.style.backgroundColor = '#0f172a';
            container.style.borderColor = '#374151';
            container.style.color = '#e5e7eb';
        }
    }



    // View notice acknowledgments
    viewNoticeAcknowledgments(noticeId) {
        const notice = this.notices.find(n => n.id === noticeId);
        if (!notice) {
            this.showToast('Notice not found', 'error');
            return;
        }

        const signatures = this.signatures.filter(s => s.noticeId === noticeId);
        const ackRate = this.calculateNoticeAckRate(noticeId);

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content w-full max-w-4xl">
                <!-- Modal Header -->
                <div class="modal-header">
                    <h2 class="text-xl font-bold text-slate-100">✍️ Acknowledgment Details</h2>
                </div>
                
                <!-- Modal Body -->
                <div class="modal-body">
                    <!-- Notice Info -->
                    <div class="bg-slate-700/50 rounded-lg p-4 mb-6">
                        <h3 class="text-lg font-bold text-white mb-2">${notice.title}</h3>
                        <div class="flex items-center space-x-4 text-sm text-slate-400">
                            <span class="priority-badge priority-${notice.priority}">${notice.priority}</span>
                            <span>${notice.category}</span>
                            <span>By ${notice.author}</span>
                            <span>${this.formatDate(notice.createdAt)}</span>
                        </div>
                    </div>

                    <!-- Acknowledgment Stats -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div class="bg-green-900/30 border border-green-500 rounded-lg p-4">
                            <div class="text-2xl font-bold text-white">${signatures.length}</div>
                            <div class="text-green-400 text-sm">Acknowledged</div>
                        </div>
                        <div class="bg-amber-900/30 border border-amber-500 rounded-lg p-4">
                            <div class="text-2xl font-bold text-white">${Math.max(0, new Set(this.signatures.map(s => s.userId)).size - signatures.length)}</div>
                            <div class="text-amber-400 text-sm">Pending</div>
                        </div>
                        <div class="bg-blue-900/30 border border-blue-500 rounded-lg p-4">
                            <div class="text-2xl font-bold text-white">${ackRate}%</div>
                            <div class="text-blue-400 text-sm">Completion Rate</div>
                        </div>
                    </div>

                    <!-- Acknowledgment List -->
                    <div class="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                        <div class="p-4 border-b border-slate-700">
                            <h4 class="text-lg font-bold text-white">Acknowledgment Log</h4>
                        </div>
                        <div class="max-h-64 overflow-y-auto">
                            ${signatures.length > 0 ? signatures.map(sig => `
                                <div class="flex items-center justify-between p-4 border-b border-slate-700 last:border-b-0">
                                    <div class="flex items-center space-x-3">
                                        <div class="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                            ${sig.userName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div class="font-medium text-white">${sig.userName}</div>
                                            <div class="text-xs text-slate-400">User ID: ${sig.userId}</div>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-sm text-white">${this.formatDate(sig.timestamp)}</div>
                                        <div class="text-xs text-slate-400">${this.getTimeAgo(sig.timestamp)}</div>
                                    </div>
                                </div>
                            `).join('') : `
                                <div class="p-8 text-center text-slate-400">
                                    <div class="text-4xl mb-2">📝</div>
                                    <p>No acknowledgments yet</p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
                
                <!-- Modal Footer -->
                <div class="modal-footer">
                    <button onclick="this.closest('.modal').remove()" 
                            class="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors">
                        Close
                    </button>
                    <button onclick="exportAcknowledgmentReport()" 
                            class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                        📊 Export Report
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('modal-container').appendChild(modal);
    }

    // View notice details
    viewNoticeDetails(noticeId) {
        const notice = this.notices.find(n => n.id === noticeId);
        if (!notice) {
            this.showToast('Notice not found', 'error');
            return;
        }

        const signatures = this.signatures.filter(s => s.noticeId === noticeId);
        const ackRate = this.calculateNoticeAckRate(noticeId);
        const isExpired = notice.expiresAt && new Date(notice.expiresAt) < new Date();

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content w-full max-w-4xl">
                <!-- Modal Header -->
                <div class="modal-header">
                    <h2 class="text-xl font-bold text-slate-100">👁️ Notice Details</h2>
                </div>
                
                <!-- Modal Body -->
                <div class="modal-body">
                    <!-- Notice Header -->
                    <div class="bg-slate-700/50 rounded-lg p-6 mb-6">
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex-1">
                                <h3 class="text-2xl font-bold text-white mb-2">${notice.title}</h3>
                                <div class="flex flex-wrap items-center gap-3 mb-3">
                                    <span class="priority-badge priority-${notice.priority}">${this.getPriorityIcon(notice.priority)} ${notice.priority.toUpperCase()}</span>
                                    <span class="category-badge">${this.getCategoryIcon(notice.category)} ${notice.category}</span>
                                    ${notice.isPinned ? '<span class="text-amber-400 text-sm font-medium">📌 PINNED</span>' : ''}
                                    ${isExpired ? '<span class="text-red-400 text-sm font-medium">⚠️ EXPIRED</span>' : ''}
                                </div>
                            </div>
                        </div>
                        
                        <!-- Metadata -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span class="text-slate-400">Author:</span>
                                <span class="text-white font-medium ml-2">${notice.author}</span>
                            </div>
                            <div>
                                <span class="text-slate-400">Source:</span>
                                <span class="text-white font-medium ml-2">${notice.source}</span>
                            </div>
                            <div>
                                <span class="text-slate-400">Created:</span>
                                <span class="text-white font-medium ml-2">${this.formatDate(notice.createdAt)}</span>
                            </div>
                            ${notice.expiresAt ? `
                                <div>
                                    <span class="text-slate-400">Expires:</span>
                                    <span class="text-white font-medium ml-2">${this.formatDate(notice.expiresAt)}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Notice Content -->
                    <div class="bg-slate-800 rounded-lg p-6 mb-6">
                        <h4 class="text-lg font-bold text-white mb-4">📄 Content</h4>
                        <div class="notice-content text-slate-300 leading-relaxed">
                            ${this.renderRichTextContent(notice.content)}
                        </div>
                    </div>

                    <!-- Tags -->
                    ${notice.tags && notice.tags.length > 0 ? `
                        <div class="bg-slate-800 rounded-lg p-6 mb-6">
                            <h4 class="text-lg font-bold text-white mb-4">🏷️ Tags</h4>
                            <div class="flex flex-wrap gap-2">
                                ${notice.tags.map(tag => `
                                    <span class="bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-sm font-medium">
                                        #${tag}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Acknowledgment Status -->
                    ${notice.requiresSignature ? `
                        <div class="bg-slate-800 rounded-lg p-6">
                            <h4 class="text-lg font-bold text-white mb-4">✍️ Acknowledgment Status</h4>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div class="text-center">
                                    <div class="text-2xl font-bold text-green-400">${signatures.length}</div>
                                    <div class="text-sm text-slate-400">Acknowledged</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-2xl font-bold text-amber-400">${Math.max(0, new Set(this.signatures.map(s => s.userId)).size - signatures.length)}</div>
                                    <div class="text-sm text-slate-400">Pending</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-2xl font-bold text-blue-400">${ackRate}%</div>
                                    <div class="text-sm text-slate-400">Completion</div>
                                </div>
                            </div>
                            <div class="progress-bar mb-4">
                                <div class="progress-fill" style="width: ${ackRate}%"></div>
                            </div>
                            <button class="btn-secondary" onclick="viewNoticeAcknowledgments('${notice.id}')">
                                View Acknowledgment Details →
                            </button>
                        </div>
                    ` : `
                        <div class="bg-slate-800 rounded-lg p-6">
                            <div class="text-center text-slate-400">
                                <div class="text-4xl mb-2">ℹ️</div>
                                <p>This notice does not require acknowledgment</p>
                            </div>
                        </div>
                    `}
                </div>
                
                <!-- Modal Footer -->
                <div class="modal-footer">
                    <button onclick="this.closest('.modal').remove()" 
                            class="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors">
                        Close
                    </button>
                    <button onclick="editNotice('${notice.id}')" 
                            class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                        ✏️ Edit Notice
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('modal-container').appendChild(modal);
    }

    // Show bulk actions modal
    // Enhanced bulk actions modal with custom confirmations
    showBulkActionsModal() {
        const selectedNotices = this.getSelectedNoticeIds();
        
        if (selectedNotices.length === 0) {
            this.showToast('Please select notices to perform bulk actions', 'warning');
            return;
        }

        // Get details about selected notices
        const selectedNoticeDetails = selectedNotices.map(id => this.notices.find(n => n.id === id)).filter(Boolean);
        const pinnedCount = selectedNoticeDetails.filter(n => n.isPinned).length;
        const unpinnedCount = selectedNoticeDetails.length - pinnedCount;
        const requiresSignatureCount = selectedNoticeDetails.filter(n => n.requiresSignature).length;
        const noSignatureCount = selectedNoticeDetails.length - requiresSignatureCount;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content w-full max-w-2xl">
                <!-- Modal Header -->
                <div class="modal-header">
                    <h2 class="text-xl font-bold text-slate-100">📦 Bulk Actions</h2>
                    <p class="text-slate-400 text-sm">${selectedNotices.length} notice(s) selected</p>
                </div>
                
                <!-- Modal Body -->
                <div class="modal-body">
                    <!-- Selection Summary -->
                    <div class="bg-slate-700/50 rounded-lg p-4 mb-6">
                        <h3 class="text-lg font-bold text-white mb-3">📊 Selection Summary</h3>
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span class="text-slate-400">Pinned:</span>
                                <span class="text-amber-400 font-bold ml-2">${pinnedCount}</span>
                            </div>
                            <div>
                                <span class="text-slate-400">Unpinned:</span>
                                <span class="text-slate-400 font-bold ml-2">${unpinnedCount}</span>
                            </div>
                            <div>
                                <span class="text-slate-400">Requires Ack:</span>
                                <span class="text-green-400 font-bold ml-2">${requiresSignatureCount}</span>
                            </div>
                            <div>
                                <span class="text-slate-400">No Ack Required:</span>
                                <span class="text-slate-400 font-bold ml-2">${noSignatureCount}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Bulk Actions -->
                    <div class="space-y-3">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <button class="bulk-action-btn bg-blue-600 hover:bg-blue-500" 
                                    onclick="window.adminPanel.handleBulkPin()" 
                                    ${pinnedCount === selectedNotices.length ? 'disabled' : ''}>
                                📌 Pin Selected (${unpinnedCount} notices)
                            </button>
                            <button class="bulk-action-btn bg-slate-600 hover:bg-slate-500" 
                                    onclick="window.adminPanel.handleBulkUnpin()" 
                                    ${pinnedCount === 0 ? 'disabled' : ''}>
                                📌 Unpin Selected (${pinnedCount} notices)
                            </button>
                            <button class="bulk-action-btn bg-green-600 hover:bg-green-500" 
                                    onclick="window.adminPanel.handleBulkRequireSignature()" 
                                    ${requiresSignatureCount === selectedNotices.length ? 'disabled' : ''}>
                                ✍️ Require Acknowledgment (${noSignatureCount} notices)
                            </button>
                            <button class="bulk-action-btn bg-purple-600 hover:bg-purple-500" 
                                    onclick="window.adminPanel.handleBulkRemoveSignature()" 
                                    ${requiresSignatureCount === 0 ? 'disabled' : ''}>
                                ✍️ Remove Ack Requirement (${requiresSignatureCount} notices)
                            </button>
                        </div>
                        
                        <!-- Dangerous Actions -->
                        <div class="border-t border-slate-600 pt-4">
                            <p class="text-red-400 text-sm font-medium mb-3">⚠️ Dangerous Actions</p>
                            <button class="bulk-action-btn bg-red-600 hover:bg-red-500 w-full" 
                                    onclick="window.adminPanel.handleBulkDelete()">
                                🗑️ Delete Selected Notices (${selectedNotices.length} notices)
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Modal Footer -->
                <div class="modal-footer">
                    <button onclick="this.closest('.modal').remove()" 
                            class="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button onclick="window.adminPanel.clearNoticeSelections(); this.closest('.modal').remove()" 
                            class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                        Clear Selection & Close
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('modal-container').appendChild(modal);
    }


    // Export functions
    exportComplianceReport() {
        const stats = this.calculateStats();
        const requiresAckNotices = this.notices.filter(n => n.requiresSignature);
        
        const reportData = {
            generatedAt: new Date().toISOString(),
            summary: {
                totalNotices: stats.totalNotices,
                criticalNotices: stats.criticalNotices,
                totalUsers: stats.totalUsers,
                overallComplianceRate: stats.overallComplianceRate,
                pendingAcknowledgments: stats.pendingAcks,
                overdueAcknowledgments: stats.overdueAcks
            },
            noticeDetails: requiresAckNotices.map(notice => ({
                id: notice.id,
                title: notice.title,
                priority: notice.priority,
                category: notice.category,
                author: notice.author,
                createdAt: notice.createdAt,
                acknowledgmentRate: this.calculateNoticeAckRate(notice.id),
                totalAcknowledgments: this.signatures.filter(s => s.noticeId === notice.id).length
            }))
        };

        this.downloadJSON(reportData, `compliance-report-${new Date().toISOString().split('T')[0]}.json`);
        this.showToast('Compliance report exported successfully!', 'success');
    }

    exportUserReport() {
        const userStats = {};
        this.signatures.forEach(sig => {
            if (!userStats[sig.userName]) {
                userStats[sig.userName] = {
                    userId: sig.userId,
                    userName: sig.userName,
                    totalAcknowledgments: 0,
                    acknowledgments: []
                };
            }
            userStats[sig.userName].totalAcknowledgments++;
            userStats[sig.userName].acknowledgments.push({
                noticeId: sig.noticeId,
                noticeTitle: this.notices.find(n => n.id === sig.noticeId)?.title || 'Unknown',
                timestamp: sig.timestamp
            });
        });

        const reportData = {
            generatedAt: new Date().toISOString(),
            totalUsers: Object.keys(userStats).length,
            users: Object.values(userStats)
        };

        this.downloadJSON(reportData, `user-activity-report-${new Date().toISOString().split('T')[0]}.json`);
        this.showToast('User activity report exported successfully!', 'success');
    }

    exportNoticeReport() {
        const reportData = {
            generatedAt: new Date().toISOString(),
            totalNotices: this.notices.length,
            notices: this.notices.map(notice => ({
                ...notice,
                acknowledgmentRate: notice.requiresSignature ? this.calculateNoticeAckRate(notice.id) : null,
                totalAcknowledgments: this.signatures.filter(s => s.noticeId === notice.id).length
            }))
        };

        this.downloadJSON(reportData, `notice-summary-report-${new Date().toISOString().split('T')[0]}.json`);
        this.showToast('Notice summary report exported successfully!', 'success');
    }

    exportFullDatabase() {
        const reportData = {
            generatedAt: new Date().toISOString(),
            version: '1.0',
            notices: this.notices,
            signatures: this.signatures,
            statistics: this.calculateStats()
        };

        this.downloadJSON(reportData, `akl-noticeboard-full-export-${new Date().toISOString().split('T')[0]}.json`);
        this.showToast('Full database exported successfully!', 'success');
    }

    exportAcknowledgmentReport() {
        const reportData = {
            generatedAt: new Date().toISOString(),
            totalSignatures: this.signatures.length,
            signatures: this.signatures.map(sig => ({
                ...sig,
                noticeTitle: this.notices.find(n => n.id === sig.noticeId)?.title || 'Unknown Notice',
                noticePriority: this.notices.find(n => n.id === sig.noticeId)?.priority || 'unknown'
            }))
        };

        this.downloadJSON(reportData, `acknowledgment-report-${new Date().toISOString().split('T')[0]}.json`);
        this.showToast('Acknowledgment report exported successfully!', 'success');
    }

    // Helper function to download JSON
    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Helper function to render rich text content
    renderRichTextContent(content) {
        if (content && (content.includes('<') || content.includes('&'))) {
            return content;
        }
        return content ? content.replace(/\n/g, '<br>') : '';
    }

    // Close all modals
    closeAllModals() {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) modalContainer.innerHTML = '';
    }

    // Show toast notification
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

    // Helper functions
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
            Maintenance: '🔧'
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

    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('en-NZ', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Pacific/Auckland'
        });
    }

    calculateResponseTime(noticeCreated, signatureTime) {
        const created = new Date(noticeCreated);
        const signed = new Date(signatureTime);
        const diffMs = signed - created;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours < 1) {
            return { hours: 0, text: `${minutes}m` };
        } else if (hours < 24) {
            return { hours, text: `${hours}h ${minutes}m` };
        } else {
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            return { hours, text: `${days}d ${remainingHours}h` };
        }
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // Auto refresh
    startAutoRefresh() {
        this.autoRefreshInterval = setInterval(() => {
            this.refreshData();
        }, 60000); // Refresh every 1 minute
    }

    async refreshData() {
        try {
            await this.loadAllData();
            this.renderCurrentTab();
            this.showToast('Data refreshed successfully!', 'success');
        } catch (error) {
            this.showToast('Failed to refresh data', 'error');
        }
    }
	
	    // ============================================================================
    // BULK ACTION METHODS
    // ============================================================================

    // Get selected notice IDs
    getSelectedNoticeIds() {
        return Array.from(document.querySelectorAll('.notice-checkbox:checked')).map(cb => cb.value);
    }

    // Bulk pin notices
    // ============================================================================
    // FIXED BULK ACTION METHODS - NO MORE BROWSER CONFIRMS!
    // ============================================================================

    // ============================================================================
    // DEBUG VERSIONS OF BULK ACTION METHODS
    // ============================================================================

    // Enhanced bulk pin with debug logs
    async bulkPin() {
        const selectedIds = this.getSelectedNoticeIds();
        
        if (selectedIds.length === 0) {
            this.showToast('No notices selected', 'warning');
            return;
        }

        const unpinnedNotices = selectedIds.filter(id => {
            const notice = this.notices.find(n => n.id === id);
            return notice && !notice.isPinned;
        });
        

        if (unpinnedNotices.length === 0) {
            this.showToast('All selected notices are already pinned', 'info');
            return;
        }

        const confirmed = await this.showBulkActionConfirmation('pin', unpinnedNotices.length, 
            `${unpinnedNotices.length} notice(s) will be pinned to the top of the notice board.`);
        
        if (!confirmed) return;

        let successCount = 0;
        let errorCount = 0;

        for (const noticeId of unpinnedNotices) {
            try {
                await this.updateNotice(noticeId, { isPinned: true });
                successCount++;
            } catch (error) {
                console.error(`Failed to pin notice ${noticeId}:`, error);
                errorCount++;
            }
        }

        this.renderCurrentTab();
        
        if (errorCount === 0) {
            this.showToast(`Successfully pinned ${successCount} notice(s)! 📌`, 'success');
        } else {
            this.showToast(`Pinned ${successCount} notice(s), ${errorCount} failed`, 'warning');
        }

        this.clearNoticeSelections();
    }

    // Enhanced bulk unpin with ONLY custom confirmation
    async bulkUnpin() {
        const selectedIds = this.getSelectedNoticeIds();
        if (selectedIds.length === 0) {
            this.showToast('No notices selected', 'warning');
            return;
        }

        const pinnedNotices = selectedIds.filter(id => {
            const notice = this.notices.find(n => n.id === id);
            return notice && notice.isPinned;
        });

        if (pinnedNotices.length === 0) {
            this.showToast('No pinned notices selected', 'info');
            return;
        }

        // ONLY use custom confirmation - NO browser confirm()
        const confirmed = await this.showBulkActionConfirmation('unpin', pinnedNotices.length,
            `${pinnedNotices.length} notice(s) will be unpinned and moved to normal position.`);
        
        if (!confirmed) return;

        let successCount = 0;
        let errorCount = 0;

        for (const noticeId of pinnedNotices) {
            try {
                await this.updateNotice(noticeId, { isPinned: false });
                successCount++;
            } catch (error) {
                console.error(`Failed to unpin notice ${noticeId}:`, error);
                errorCount++;
            }
        }

        this.renderCurrentTab();
        
        if (errorCount === 0) {
            this.showToast(`Successfully unpinned ${successCount} notice(s)! 📌`, 'success');
        } else {
            this.showToast(`Unpinned ${successCount} notice(s), ${errorCount} failed`, 'warning');
        }

        this.clearNoticeSelections();
    }

    // Enhanced bulk require signature with ONLY custom confirmation
    async bulkRequireSignature() {
        const selectedIds = this.getSelectedNoticeIds();
        if (selectedIds.length === 0) {
            this.showToast('No notices selected', 'warning');
            return;
        }

        const noSignatureNotices = selectedIds.filter(id => {
            const notice = this.notices.find(n => n.id === id);
            return notice && !notice.requiresSignature;
        });

        if (noSignatureNotices.length === 0) {
            this.showToast('All selected notices already require acknowledgment', 'info');
            return;
        }

        // ONLY use custom confirmation - NO browser confirm()
        const confirmed = await this.showBulkActionConfirmation('requireSignature', noSignatureNotices.length,
            `${noSignatureNotices.length} notice(s) will require user acknowledgment before being marked as read.`);
        
        if (!confirmed) return;

        let successCount = 0;
        let errorCount = 0;

        for (const noticeId of noSignatureNotices) {
            try {
                await this.updateNotice(noticeId, { requiresSignature: true });
                successCount++;
            } catch (error) {
                console.error(`Failed to require signature for notice ${noticeId}:`, error);
                errorCount++;
            }
        }

        this.renderCurrentTab();
        
        if (errorCount === 0) {
            this.showToast(`Successfully updated ${successCount} notice(s) to require acknowledgment! ✍️`, 'success');
        } else {
            this.showToast(`Updated ${successCount} notice(s), ${errorCount} failed`, 'warning');
        }

        this.clearNoticeSelections();
    }

    // Enhanced bulk remove signature with ONLY custom confirmation
    async bulkRemoveSignature() {
        const selectedIds = this.getSelectedNoticeIds();
        if (selectedIds.length === 0) {
            this.showToast('No notices selected', 'warning');
            return;
        }

        const signatureNotices = selectedIds.filter(id => {
            const notice = this.notices.find(n => n.id === id);
            return notice && notice.requiresSignature;
        });

        if (signatureNotices.length === 0) {
            this.showToast('No notices with acknowledgment requirement selected', 'info');
            return;
        }

        // ONLY use custom confirmation - NO browser confirm()
        const confirmed = await this.showBulkActionConfirmation('removeSignature', signatureNotices.length,
            `${signatureNotices.length} notice(s) will no longer require user acknowledgment.`);
        
        if (!confirmed) return;

        let successCount = 0;
        let errorCount = 0;

        for (const noticeId of signatureNotices) {
            try {
                await this.updateNotice(noticeId, { requiresSignature: false });
                successCount++;
            } catch (error) {
                console.error(`Failed to remove signature requirement for notice ${noticeId}:`, error);
                errorCount++;
            }
        }

        this.renderCurrentTab();
        
        if (errorCount === 0) {
            this.showToast(`Successfully removed acknowledgment requirement for ${successCount} notice(s)! ✍️`, 'success');
        } else {
            this.showToast(`Updated ${successCount} notice(s), ${errorCount} failed`, 'warning');
        }

        this.clearNoticeSelections();
    }

    // Enhanced bulk delete with ONLY custom confirmation
    async bulkDelete() {
        const selectedIds = this.getSelectedNoticeIds();
        if (selectedIds.length === 0) {
            this.showToast('No notices selected', 'warning');
            return;
        }

        // Get details about what will be deleted
        const selectedNotices = selectedIds.map(id => this.notices.find(n => n.id === id)).filter(Boolean);
        const totalSignatures = this.signatures.filter(s => selectedIds.includes(s.noticeId)).length;
        
        const details = `
            • ${selectedNotices.length} notice(s) will be permanently deleted
            • ${totalSignatures} acknowledgment(s) will be permanently deleted
            • Critical notices: ${selectedNotices.filter(n => n.priority === 'critical').length}
            • Pinned notices: ${selectedNotices.filter(n => n.isPinned).length}
        `;

        // ONLY use custom confirmation - NO browser confirm()
        const confirmed = await this.showBulkActionConfirmation('delete', selectedIds.length, details);
        
        if (!confirmed) return;

        let successCount = 0;
        let errorCount = 0;

        for (const noticeId of selectedIds) {
            try {
                // Delete from database
                await deleteNoticeFromDB(noticeId);
                
                // Delete associated signatures
                const signaturesToDelete = this.signatures.filter(s => s.noticeId === noticeId);
                for (const sig of signaturesToDelete) {
                    try {
                        await deleteSignatureFromDB(sig.id);
                    } catch (error) {
                        console.warn('Failed to delete signature:', sig.id, error);
                    }
                }

                // Remove from local arrays
                this.notices = this.notices.filter(n => n.id !== noticeId);
                this.signatures = this.signatures.filter(s => s.noticeId !== noticeId);
                
                successCount++;
            } catch (error) {
                console.error(`Failed to delete notice ${noticeId}:`, error);
                errorCount++;
            }
        }

        this.renderCurrentTab();
        
        if (errorCount === 0) {
            this.showToast(`Successfully deleted ${successCount} notice(s)! 🗑️`, 'success');
        } else {
            this.showToast(`Deleted ${successCount} notice(s), ${errorCount} failed`, 'warning');
        }

        this.clearNoticeSelections();
    }


    // Helper function to clear all notice selections
    clearNoticeSelections() {
        document.querySelectorAll('.notice-checkbox').forEach(cb => cb.checked = false);
        const selectAllCheckbox = document.getElementById('select-all-notices');
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
    }

    // Enhanced bulk actions modal with better UX
    showBulkActionsModal() {
        const selectedNotices = this.getSelectedNoticeIds();
        
        if (selectedNotices.length === 0) {
            this.showToast('Please select notices to perform bulk actions', 'warning');
            return;
        }

        // Get details about selected notices
        const selectedNoticeDetails = selectedNotices.map(id => this.notices.find(n => n.id === id)).filter(Boolean);
        const pinnedCount = selectedNoticeDetails.filter(n => n.isPinned).length;
        const unpinnedCount = selectedNoticeDetails.length - pinnedCount;
        const requiresSignatureCount = selectedNoticeDetails.filter(n => n.requiresSignature).length;
        const noSignatureCount = selectedNoticeDetails.length - requiresSignatureCount;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content w-full max-w-2xl">
                <!-- Modal Header -->
                <div class="modal-header">
                    <h2 class="text-xl font-bold text-slate-100">📦 Bulk Actions</h2>
                    <p class="text-slate-400 text-sm">${selectedNotices.length} notice(s) selected</p>
                </div>
                
                <!-- Modal Body -->
                <div class="modal-body">
                    <!-- Selection Summary -->
                    <div class="bg-slate-700/50 rounded-lg p-4 mb-6">
                        <h3 class="text-lg font-bold text-white mb-3">📊 Selection Summary</h3>
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span class="text-slate-400">Pinned:</span>
                                <span class="text-amber-400 font-bold ml-2">${pinnedCount}</span>
                            </div>
                            <div>
                                <span class="text-slate-400">Unpinned:</span>
                                <span class="text-slate-400 font-bold ml-2">${unpinnedCount}</span>
                            </div>
                            <div>
                                <span class="text-slate-400">Requires Ack:</span>
                                <span class="text-green-400 font-bold ml-2">${requiresSignatureCount}</span>
                            </div>
                            <div>
                                <span class="text-slate-400">No Ack Required:</span>
                                <span class="text-slate-400 font-bold ml-2">${noSignatureCount}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Bulk Actions -->
                    <div class="space-y-3">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <button class="bulk-action-btn bg-blue-600 hover:bg-blue-500" onclick="bulkPin()" ${pinnedCount === selectedNotices.length ? 'disabled' : ''}>
                                📌 Pin Selected (${unpinnedCount} notices)
                            </button>
                            <button class="bulk-action-btn bg-slate-600 hover:bg-slate-500" onclick="bulkUnpin()" ${pinnedCount === 0 ? 'disabled' : ''}>
                                📌 Unpin Selected (${pinnedCount} notices)
                            </button>
                            <button class="bulk-action-btn bg-green-600 hover:bg-green-500" onclick="bulkRequireSignature()" ${requiresSignatureCount === selectedNotices.length ? 'disabled' : ''}>
                                ✍️ Require Acknowledgment (${noSignatureCount} notices)
                            </button>
                            <button class="bulk-action-btn bg-purple-600 hover:bg-purple-500" onclick="bulkRemoveSignature()" ${requiresSignatureCount === 0 ? 'disabled' : ''}>
                                ✍️ Remove Ack Requirement (${requiresSignatureCount} notices)
                            </button>
                        </div>
                        
                        <!-- Dangerous Actions -->
                        <div class="border-t border-slate-600 pt-4">
                            <p class="text-red-400 text-sm font-medium mb-3">⚠️ Dangerous Actions</p>
                            <button class="bulk-action-btn bg-red-600 hover:bg-red-500 w-full" onclick="bulkDelete()">
                                🗑️ Delete Selected Notices (${selectedNotices.length} notices)
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Modal Footer -->
                <div class="modal-footer">
                    <button onclick="this.closest('.modal').remove()" 
                            class="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button onclick="window.adminPanel.clearNoticeSelections(); this.closest('.modal').remove()" 
                            class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                        Clear Selection & Close
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('modal-container').appendChild(modal);
    }
	
	    // ============================================================================
    // CUSTOM CONFIRMATION MODALS
    // ============================================================================

    // Show custom confirmation modal
    showConfirmationModal(options) {
        return new Promise((resolve) => {
            const {
                title = 'Confirm Action',
                message = 'Are you sure you want to proceed?',
                details = null,
                warning = null,
                confirmText = 'Confirm',
                cancelText = 'Cancel',
                type = 'danger', // 'danger', 'warning', 'info'
                icon = '⚠️'
            } = options;

            const modal = document.createElement('div');
            modal.className = 'confirmation-modal';
            modal.innerHTML = `
                <div class="confirmation-content ${type}">
                    <!-- Header -->
                    <div class="confirmation-header ${type}">
                        <div class="icon">${icon}</div>
                        <div>
                            <h2 class="text-xl font-bold text-white">${title}</h2>
                        </div>
                    </div>
                    
                    <!-- Body -->
                    <div class="confirmation-body">
                        <p class="confirmation-message">${message}</p>
                        
                        ${details ? `
                            <div class="confirmation-details">
                                <h4 class="text-sm font-semibold text-slate-300 mb-2">Details:</h4>
                                <div class="text-sm text-slate-400">${details}</div>
                            </div>
                        ` : ''}
                        
                        ${warning ? `
                            <div class="confirmation-warning">
                                <span class="text-xl">⚠️</span>
                                <span>${warning}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Footer -->
                    <div class="confirmation-footer">
                        <button class="confirm-btn cancel" onclick="this.closest('.confirmation-modal').remove(); window.confirmationResolve(false);">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                            ${cancelText}
                        </button>
                        <button class="confirm-btn confirm ${type}" onclick="this.closest('.confirmation-modal').remove(); window.confirmationResolve(true);">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            ${confirmText}
                        </button>
                    </div>
                </div>
            `;
            
            // Store resolve function globally
            window.confirmationResolve = resolve;
            
            document.body.appendChild(modal);
            
            // Auto-focus on cancel button for keyboard navigation
            setTimeout(() => {
                const cancelBtn = modal.querySelector('.confirm-btn.cancel');
                if (cancelBtn) cancelBtn.focus();
            }, 100);
            
            // Handle ESC key
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    resolve(false);
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        });
    }

    // Show delete confirmation modal
    async showDeleteConfirmation(itemType, itemName, additionalInfo = null) {
        return await this.showConfirmationModal({
            title: `Delete ${itemType}`,
            message: `Are you sure you want to delete "${itemName}"?`,
            details: additionalInfo,
            warning: 'This action cannot be undone and will permanently remove all associated data.',
            confirmText: 'Delete Forever',
            cancelText: 'Keep It',
            type: 'danger',
            icon: '🗑️'
        });
    }

    // Show bulk action confirmation modal
    // debug version of showBulkActionConfirmation
    async showBulkActionConfirmation(action, count, details = null) {
        
        const actionConfig = {
            pin: {
                title: 'Pin Notices',
                message: `Pin ${count} notice(s) to the top?`,
                confirmText: 'Pin Notices',
                icon: '📌',
                type: 'warning'
            },
            unpin: {
                title: 'Unpin Notices',
                message: `Remove pin from ${count} notice(s)?`,
                confirmText: 'Unpin Notices',
                icon: '📌',
                type: 'warning'
            },
            requireSignature: {
                title: 'Require Acknowledgment',
                message: `Require acknowledgment for ${count} notice(s)?`,
                confirmText: 'Require Acknowledgment',
                icon: '✍️',
                type: 'warning'
            },
            removeSignature: {
                title: 'Remove Acknowledgment Requirement',
                message: `Remove acknowledgment requirement from ${count} notice(s)?`,
                confirmText: 'Remove Requirement',
                icon: '✍️',
                type: 'warning'
            },
            delete: {
                title: 'Delete Multiple Notices',
                message: `Delete ${count} notice(s) permanently?`,
                confirmText: 'Delete All',
                icon: '🗑️',
                type: 'danger',
                warning: 'This will permanently delete all selected notices and their acknowledgments. This action cannot be undone.'
            }
        };

        const config = actionConfig[action];
        if (!config) {
            console.error('❌ Unknown action:', action);
            return false;
        }

        
        const result = await this.showConfirmationModal({
            ...config,
            details: details,
            cancelText: 'Cancel'
        });
        
        return result;
    }


    // ============================================================================
    // BULK ACTION HANDLERS
    // ============================================================================

    // Handler for bulk pin - closes modal first, then shows confirmation

    // ============================================================================
    // DIRECT CALL BULK ACTION HANDLERS
    // ============================================================================

    // Handler for bulk pin - closes modal first, then shows confirmation
    async handleBulkPin() {
        // Close the bulk actions modal first
        this.closeAllModals();
        
        // Call directly - no delay needed
        await this.bulkPin();
    }

    // Handler for bulk unpin - closes modal first, then shows confirmation
    async handleBulkUnpin() {
        // Close the bulk actions modal first
        this.closeAllModals();
        
        // Call directly - no delay needed
        await this.bulkUnpin();
    }

    // Handler for bulk require signature - closes modal first, then shows confirmation
    async handleBulkRequireSignature() {
        // Close the bulk actions modal first
        this.closeAllModals();
        
        // Call directly - no delay needed
        await this.bulkRequireSignature();
    }

    // Handler for bulk remove signature - closes modal first, then shows confirmation
    async handleBulkRemoveSignature() {
        // Close the bulk actions modal first
        this.closeAllModals();
        
        // Call directly - no delay needed
        await this.bulkRemoveSignature();
    }

    // Handler for bulk delete - closes modal first, then shows confirmation
    async handleBulkDelete() {
        // Close the bulk actions modal first
        this.closeAllModals();
        
        // Call directly - no delay needed
        await this.bulkDelete();
    }


// Add this method to your AKLAdminPanel class

setupAuthModeSwitching() {
    // Show signup form
    document.getElementById('show-signup')?.addEventListener('click', () => {
        this.switchAuthMode('signup');
    });
    
    // Show reset form
    document.getElementById('show-reset')?.addEventListener('click', () => {
        this.switchAuthMode('reset');
    });
    
    // Back to login buttons
    document.getElementById('back-to-login')?.addEventListener('click', () => {
        this.switchAuthMode('login');
    });
    
    document.getElementById('back-to-login-2')?.addEventListener('click', () => {
        this.switchAuthMode('login');
    });
	
	    // NEW: Back to login from reset confirm
    document.getElementById('back-to-login-3')?.addEventListener('click', () => {
        this.switchAuthMode('login');
    });
    
    // NEW: Back to reset from confirm
    document.getElementById('back-to-reset')?.addEventListener('click', () => {
        this.switchAuthMode('reset');
    });
	
	    // NEW: Back to login from signup confirm
    document.getElementById('back-to-login-4')?.addEventListener('click', () => {
        this.switchAuthMode('login');
    });
    
    // NEW: Back to signup from confirm
    document.getElementById('back-to-signup')?.addEventListener('click', () => {
        this.switchAuthMode('signup');
    });
    
}

switchAuthMode(mode) {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const signupConfirmForm = document.getElementById('signup-confirm-form'); // NEW
    const resetForm = document.getElementById('reset-form');
    const resetConfirmForm = document.getElementById('reset-confirm-form');
    const subtitle = document.getElementById('auth-subtitle');
    
    const loginSwitcher = document.getElementById('login-mode-switcher');
    const signupSwitcher = document.getElementById('signup-mode-switcher');
    const signupConfirmSwitcher = document.getElementById('signup-confirm-mode-switcher'); // NEW
    const resetSwitcher = document.getElementById('reset-mode-switcher');
    const resetConfirmSwitcher = document.getElementById('reset-confirm-mode-switcher');
    
    const errorDiv = document.getElementById('login-error');
    
    // Hide all forms and switchers
    [loginForm, signupForm, signupConfirmForm, resetForm, resetConfirmForm].forEach(form => form?.classList.add('hidden'));
    [loginSwitcher, signupSwitcher, signupConfirmSwitcher, resetSwitcher, resetConfirmSwitcher].forEach(switcher => switcher?.classList.add('hidden'));
    errorDiv?.classList.add('hidden');
    
    // Show appropriate form and switcher
    switch(mode) {
        case 'signup':
            signupForm?.classList.remove('hidden');
            signupSwitcher?.classList.remove('hidden');
            subtitle.textContent = 'Create your account';
            break;
        case 'signup-confirm': // NEW
            signupConfirmForm?.classList.remove('hidden');
            signupConfirmSwitcher?.classList.remove('hidden');
            subtitle.textContent = 'Verify your account';
            break;
        case 'reset':
            resetForm?.classList.remove('hidden');
            resetSwitcher?.classList.remove('hidden');
            subtitle.textContent = 'Reset your password';
            break;
        case 'reset-confirm':
            resetConfirmForm?.classList.remove('hidden');
            resetConfirmSwitcher?.classList.remove('hidden');
            subtitle.textContent = 'Enter verification code';
            break;
        default: // login
            loginForm?.classList.remove('hidden');
            loginSwitcher?.classList.remove('hidden');
            subtitle.textContent = 'Please sign in to continue';
    }
}



// logout class
setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        // Remove any existing listeners to prevent duplicates
        logoutBtn.replaceWith(logoutBtn.cloneNode(true));
        
        // Get the new button reference and add listener
        const newLogoutBtn = document.getElementById('logout-btn');
        newLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🚪 Logout button clicked');
            this.logout();
        });
        
        console.log('✅ Logout button event listener attached');
    } else {
        console.warn('⚠️ Logout button not found');
    }
}

async handlePasswordResetConfirm() {
    const confirmationCode = document.getElementById('reset-code').value;
    const newPassword = document.getElementById('reset-new-password').value;
    const confirmPassword = document.getElementById('reset-confirm-password').value;
    const confirmBtn = document.getElementById('reset-confirm-btn');
    const errorDiv = document.getElementById('login-error');
    
    if (!confirmationCode || !newPassword || !confirmPassword) {
        this.showError('Please fill in all fields', errorDiv);
        return;
    }
    
    if (newPassword !== confirmPassword) {
        this.showError('Passwords do not match', errorDiv);
        return;
    }
    
    if (newPassword.length < 8) {
        this.showError('Password must be at least 8 characters long', errorDiv);
        return;
    }
    
    try {
        confirmBtn.textContent = '🔐 Resetting...';
        confirmBtn.disabled = true;
        errorDiv.classList.add('hidden');
        
        const result = await cognitoAuth.confirmPasswordReset(
            this.resetEmail, 
            confirmationCode, 
            newPassword
        );
        
        if (result.success) {
            this.showSuccess(result.message, errorDiv);
            
            // Auto-fill login form and switch back
            setTimeout(() => {
                this.switchAuthMode('login');
                document.getElementById('login-email').value = this.resetEmail;
                document.getElementById('login-password').value = newPassword;
            }, 2000);
        } else {
            this.showError(result.message, errorDiv);
        }
        
    } catch (error) {
        console.error('❌ Password reset confirmation error:', error);
        this.showError('Password reset failed. Please try again.', errorDiv);
    } finally {
        confirmBtn.textContent = '🔐 Reset Password';
        confirmBtn.disabled = false;
    }
}

async handleSignupConfirm() {
    const confirmationCode = document.getElementById('signup-code').value;
    const confirmBtn = document.getElementById('signup-confirm-btn');
    const errorDiv = document.getElementById('login-error');
    
    if (!confirmationCode) {
        this.showError('Please enter the verification code', errorDiv);
        return;
    }
    
    try {
        confirmBtn.textContent = '✅ Verifying...';
        confirmBtn.disabled = true;
        errorDiv.classList.add('hidden');
        
        const result = await cognitoAuth.confirmSignUp(
            this.signupEmail, 
            confirmationCode
        );
        
        if (result.success) {
            this.showSuccess(result.message, errorDiv);
            
            // Auto-fill login form and switch back
            setTimeout(() => {
                this.switchAuthMode('login');
                document.getElementById('login-email').value = this.signupEmail;
                document.getElementById('login-password').value = this.signupPassword;
            }, 2000);
        } else {
            this.showError(result.message, errorDiv);
        }
        
    } catch (error) {
        console.error('❌ Signup confirmation error:', error);
        this.showError('Account verification failed. Please try again.', errorDiv);
    } finally {
        confirmBtn.textContent = '✅ Verify Account';
        confirmBtn.disabled = false;
    }
}

async handleResendSignupCode() {
    const resendBtn = document.getElementById('resend-signup-code-btn');
    const errorDiv = document.getElementById('login-error');
    
    try {
        resendBtn.textContent = '📧 Sending...';
        resendBtn.disabled = true;
        
        const result = await cognitoAuth.resendConfirmationCode(this.signupEmail);
        
        if (result.success) {
            this.showSuccess(result.message, errorDiv);
        } else {
            this.showError(result.message, errorDiv);
        }
        
    } catch (error) {
        console.error('❌ Resend code error:', error);
        this.showError('Failed to resend code. Please try again.', errorDiv);
    } finally {
        resendBtn.textContent = '📧 Resend Code';
        resendBtn.disabled = false;
    }
}



}

// Global helper functions for admin panel
function postCriticalNotice() {
    if (window.adminPanel) {
        window.adminPanel.showPostNoticeModal();
        // Pre-fill critical priority
        setTimeout(() => {
            const prioritySelect = document.querySelector('select[name="priority"]');
            if (prioritySelect) {
                prioritySelect.value = 'critical';
            }
            const requiresSignature = document.querySelector('input[name="requiresSignature"]');
            if (requiresSignature) {
                requiresSignature.checked = true;
            }
        }, 200);
    }
}

function showBulkActionsModal() {
    if (window.adminPanel) {
        window.adminPanel.showToast('Bulk actions feature coming soon!', 'info');
    }
}

function exportComplianceReport() {
    if (window.adminPanel) {
        const stats = window.adminPanel.calculateStats();
        const reportData = {
            generatedAt: new Date().toISOString(),
            totalNotices: stats.totalNotices,
            criticalNotices: stats.criticalNotices,
            overallComplianceRate: stats.overallComplianceRate,
            pendingAcknowledgments: stats.pendingAcks,
            overdueAcknowledgments: stats.overdueAcks,
            totalUsers: stats.totalUsers
        };
        
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `akl-compliance-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        window.adminPanel.showToast('Compliance report exported!', 'success');
    }
}

function exportAcknowledgmentReport() {
    if (window.adminPanel) {
        const acknowledgments = window.adminPanel.signatures.map(sig => {
            const notice = window.adminPanel.notices.find(n => n.id === sig.noticeId);
            return {
                noticeTitle: notice?.title || 'Unknown',
                noticeCategory: notice?.category || 'Unknown',
                noticePriority: notice?.priority || 'medium',
                userName: sig.userName,
                userId: sig.userId,
                acknowledgedAt: sig.timestamp,
                responseTime: window.adminPanel.calculateResponseTime(notice?.createdAt, sig.timestamp)
            };
        });
        
        const csvContent = [
            ['Notice Title', 'Category', 'Priority', 'User Name', 'User ID', 'Acknowledged At', 'Response Time'],
            ...acknowledgments.map(ack => [
                ack.noticeTitle,
                ack.noticeCategory,
                ack.noticePriority,
                ack.userName,
                ack.userId,
                ack.acknowledgedAt,
                ack.responseTime.text
            ])
        ].map(row => row.join(',')).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `akl-acknowledgment-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        window.adminPanel.showToast('Acknowledgment report exported!', 'success');
    }
}

function exportUserReport() {
    if (window.adminPanel) {
        window.adminPanel.showToast('User report export feature coming soon!', 'info');
    }
}

function exportNoticeReport() {
    if (window.adminPanel) {
        window.adminPanel.showToast('Notice report export feature coming soon!', 'info');
    }
}

function exportFullDatabase() {
    if (window.adminPanel) {
        const fullData = {
            exportedAt: new Date().toISOString(),
            notices: window.adminPanel.notices,
            signatures: window.adminPanel.signatures,
            stats: window.adminPanel.calculateStats()
        };
        
        const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `akl-full-database-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        window.adminPanel.showToast('Full database exported!', 'success');
    }
}

// ============================================================================
// GLOBAL FUNCTIONS
// ============================================================================

// Global function for posting notices
function showPostNoticeModal() {
    if (window.adminPanel) {
        window.adminPanel.showPostNoticeModal();
    }
}

// Global function for posting critical notices
function postCriticalNotice() {
    if (window.adminPanel) {
        window.adminPanel.postCriticalNotice();
    }
}

// Global function for editing notices
function editNotice(noticeId) {
    if (window.adminPanel) {
        window.adminPanel.editNotice(noticeId);
    }
}

// Global function for viewing notice details
function viewNoticeDetails(noticeId) {
    if (window.adminPanel) {
        window.adminPanel.viewNoticeDetails(noticeId);
    }
}

// Global function for deleting notices
function deleteNotice(noticeId) {
    if (window.adminPanel) {
        window.adminPanel.deleteNotice(noticeId);
    }
}

// Global function for viewing acknowledgments
function viewNoticeAcknowledgments(noticeId) {
    if (window.adminPanel) {
        window.adminPanel.viewNoticeAcknowledgments(noticeId);
    }
}

// Global function for bulk actions
function showBulkActionsModal() {
    if (window.adminPanel) {
        window.adminPanel.showBulkActionsModal();
    }
}

// Global function for exporting compliance report
function exportComplianceReport() {
    if (window.adminPanel) {
        window.adminPanel.exportComplianceReport();
    }
}

// Global function for exporting user report
function exportUserReport() {
    if (window.adminPanel) {
        window.adminPanel.exportUserReport();
    }
}

// Global function for exporting notice report
function exportNoticeReport() {
    if (window.adminPanel) {
        window.adminPanel.exportNoticeReport();
    }
}

// Global function for exporting full database
function exportFullDatabase() {
    if (window.adminPanel) {
        window.adminPanel.exportFullDatabase();
    }
}

// Global function for exporting acknowledgment report
function exportAcknowledgmentReport() {
    if (window.adminPanel) {
        window.adminPanel.exportAcknowledgmentReport();
    }
}

// Global function for submitting edited notice
function submitEditNotice() {
    if (window.adminPanel) {
        window.adminPanel.submitEditNotice();
    }
}

// Global function for submitting new notice
function submitNotice() {
    if (window.adminPanel) {
        window.adminPanel.submitNotice();
    }
}

// ============================================================================
// UPDATED BULK ACTION GLOBAL FUNCTIONS
// ============================================================================

// Bulk pin notices - now uses handler
function bulkPin() {
    if (window.adminPanel) {
        window.adminPanel.handleBulkPin();
    }
}

// Bulk unpin notices - now uses handler
function bulkUnpin() {
    if (window.adminPanel) {
        window.adminPanel.handleBulkUnpin();
    }
}

// Bulk require signature - now uses handler
function bulkRequireSignature() {
    if (window.adminPanel) {
        window.adminPanel.handleBulkRequireSignature();
    }
}

// Bulk remove signature requirement - now uses handler
function bulkRemoveSignature() {
    if (window.adminPanel) {
        window.adminPanel.handleBulkRemoveSignature();
    }
}

// Bulk delete notices - now uses handler
function bulkDelete() {
    if (window.adminPanel) {
        window.adminPanel.handleBulkDelete();
    }
}



// Initialize the admin panel
window.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AKLAdminPanel();
});
