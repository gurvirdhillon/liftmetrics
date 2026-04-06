async function fetchAuthConfig() {
  const res = await fetch('/auth-config');
  if (res.ok) {
    return res.json();
  }
  throw res;
}

let auth0 = null;

async function initAuth0Client() {
  const config = await fetchAuthConfig();

  auth0 = await createAuth0Client({
    domain: config.domain,
    client_id: config.clientId,
    authorizationParams: {
      redirect_uri: window.location.origin + '/profile.html'
    },
    cacheLocation: 'localstorage'
  });
}

async function login() {
  await auth0.loginWithRedirect({
    redirect_uri: window.location.origin + '/profile.html'
  });
}

function logout() {
  auth0.logout({
    returnTo: window.location.origin
  });
}

async function updateAuthUI() {
  const isAuthenticated = await auth0.isAuthenticated();
  document.getElementById('login').disabled = isAuthenticated;
  document.getElementById('logout').disabled = !isAuthenticated;
}


async function handleAuth0Redirect() {
  const query = window.location.search;

  if (query.includes('code=') && query.includes('state=')) {
    try {
      await auth0.handleRedirectCallback();
      window.history.replaceState({}, document.title, '/profile.html');
      await updateAuthUI();
      return;
    } catch (e) {
      console.error(e);
      window.alert(e.message || 'authentication error, sorry');
      return;
    }
  }

  await updateAuthUI();
}

function setupListeners() {
  document.getElementById('login').addEventListener('click', login);
  document.getElementById('logout').addEventListener('click', logout);
}

async function init() {
  await initAuth0Client();
  setupListeners();
  await handleAuth0Redirect();
}

window.addEventListener('load', init);
