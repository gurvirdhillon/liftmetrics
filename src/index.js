async function fetchAuthConfig() {
  const res = await fetch('/auth-config');
  if (!res.ok) throw new Error('Failed to load auth config');
  return res.json();
}

let auth0Client = null;

async function initAuth0Client() {
  const config = await fetchAuthConfig();

  if (!window.auth0) {
    throw new Error("Auth0 SDK did not load");
  }

  auth0Client = await window.auth0.createAuth0Client({
    domain: config.domain,
    clientId: config.clientId,
    authorizationParams: {
      redirect_uri: `${window.location.origin}/profile.html`
    },
    cacheLocation: 'localstorage'
  });

  window.auth0Client = auth0Client;
}

async function login() {
  await auth0Client.loginWithRedirect({
    authorizationParams: {
      redirect_uri: `${window.location.origin}/profile.html`
    }
  });
}

function logout() {
  auth0Client.logout({
    logoutParams: {
      returnTo: window.location.origin
    }
  });
}

async function updateAuthUI() {
  if (!auth0Client) return;

  const loginBtn = document.getElementById('login');
  const logoutBtn = document.getElementById('logout');

  const isAuthenticated = await auth0Client.isAuthenticated();

  if (loginBtn) loginBtn.disabled = isAuthenticated;
  if (logoutBtn) logoutBtn.disabled = !isAuthenticated;

  const user = isAuthenticated ? await auth0Client.getUser() : null;

  const nameEl = document.getElementById('user-name');
  if (nameEl) {
    nameEl.textContent = user?.name || user?.nickname || user?.email || 'Guest';
  }
}

async function handleAuth0Redirect() {
  const query = window.location.search;

  if (query.includes('code=') && query.includes('state=')) {
    try {
      await auth0Client.handleRedirectCallback();
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (e) {
      console.error('Auth0 callback error:', e);
      alert(e.message || 'Authentication error');
    }
  }
}

function setupListeners() {
  const loginBtn = document.getElementById('login');
  const logoutBtn = document.getElementById('logout');

  if (loginBtn) loginBtn.addEventListener('click', login);
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
}

async function init() {
  await initAuth0Client();
  setupListeners();
  await handleAuth0Redirect();
  await updateAuthUI();
}

window.addEventListener('load', init);