let clientPromise;

async function fetchAuthConfig() {
  const response = await fetch("/auth-config");
  if (!response.ok) throw new Error("Could not load authentication settings.");
  return response.json();
}

export async function getAuthClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const config = await fetchAuthConfig();
      const createClient = window.createAuth0Client || window.auth0?.createAuth0Client;
      if (!createClient) throw new Error("Auth0 SDK did not load.");

      const client = await createClient({
        domain: config.domain,
        client_id: config.clientId,
        redirect_uri: `${window.location.origin}/profile.html`,
        cacheLocation: "localstorage"
      });
      window.auth0Client = client;
      return client;
    })().catch((error) => {
      clientPromise = undefined;
      throw error;
    });
  }
  return clientPromise;
}

export async function handleAuthRedirect() {
  const client = await getAuthClient();
  if (window.location.search.includes("code=") && window.location.search.includes("state=")) {
    await client.handleRedirectCallback();
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  return client;
}

export async function getAuthenticatedUser() {
  const client = await getAuthClient();
  return (await client.isAuthenticated()) ? client.getUser() : null;
}

export async function login() {
  const client = await getAuthClient();
  await client.loginWithRedirect({ redirect_uri: `${window.location.origin}/profile.html` });
}

export async function logout() {
  const client = await getAuthClient();
  client.logout({ returnTo: window.location.origin });
}
