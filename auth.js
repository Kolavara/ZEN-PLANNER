/* ============================================================
   ZEN PLANNER — Authentication Module
   Handles signup, login, logout, and session management
   ============================================================ */

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
const _authCallbacks = [];

function getCurrentUser() { return currentUser; }
function onAuthChange(cb) { _authCallbacks.push(cb); }
function _notifyAuth(user) { _authCallbacks.forEach(cb => cb(user)); }

async function signUp(email, password) {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) throw error;
    return data;
}

async function signIn(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

async function signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    currentUser = null;
    _notifyAuth(null);
}

function showAuthModal() {
    document.getElementById('auth-overlay').classList.add('visible');
    document.getElementById('app').classList.add('blurred');
}

function hideAuthModal() {
    document.getElementById('auth-overlay').classList.remove('visible');
    document.getElementById('app').classList.remove('blurred');
}

async function initAuth() {
    // Wire up forms first so they don't default submit if network is slow/fails
    _setupAuthForms();

    try {
        // Check for existing session safely
        const res = await supabaseClient.auth.getSession();
        if (res.error) console.error('Session error:', res.error);
        
        const session = res.data?.session;
        if (session?.user) {
            currentUser = session.user;
            hideAuthModal();
            _notifyAuth(currentUser);
        } else {
            showAuthModal();
        }
    } catch (err) {
        console.error('Failed to get session:', err);
        showAuthModal();
    }

    // Listen for auth state changes
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
            currentUser = session.user;
            hideAuthModal();
            _notifyAuth(currentUser);
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            showAuthModal();
            _notifyAuth(null);
        }
    });
}

function _setupAuthForms() {
    const form = document.getElementById('auth-form');
    const toggleLink = document.getElementById('auth-toggle');
    const titleEl = document.getElementById('auth-title');
    const submitBtn = document.getElementById('auth-submit');
    const errorEl = document.getElementById('auth-error');
    const successEl = document.getElementById('auth-success');
    let isSignUp = false;

    toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isSignUp = !isSignUp;
        titleEl.textContent = isSignUp ? 'Create Account' : 'Welcome Back';
        submitBtn.textContent = isSignUp ? 'Create Account' : 'Sign In';
        toggleLink.textContent = isSignUp
            ? 'Already have an account? Sign in'
            : "Don't have an account? Sign up";
        errorEl.textContent = '';
        successEl.textContent = '';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;
        errorEl.textContent = '';
        successEl.textContent = '';
        submitBtn.disabled = true;
        const origText = submitBtn.textContent;
        submitBtn.textContent = 'Loading...';

        try {
            if (isSignUp) {
                const data = await signUp(email, password);
                if (data.user && !data.session) {
                    // Email confirmation required
                    successEl.textContent = '✓ Account created! Check your email to confirm, then sign in.';
                    // Also alert them since they might miss the text
                    alert('Account created! Please check your email inbox to confirm your email before signing in. (Or disable Email Confirmations in your Supabase dashboard for testing)');
                    isSignUp = false;
                    titleEl.textContent = 'Welcome Back';
                    toggleLink.textContent = "Don't have an account? Sign up";
                } else if (data.session) {
                     successEl.textContent = '✓ Logged in automatically!';
                }
            } else {
                await signIn(email, password);
            }
        } catch (err) {
            console.error(err);
            errorEl.textContent = err.message || 'An error occurred. Please try again.';
        }

        submitBtn.disabled = false;
        submitBtn.textContent = isSignUp ? 'Create Account' : 'Sign In';
    });
}
