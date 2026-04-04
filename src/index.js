// const getButton = document.querySelector("#log_btn")
// getButton.addEventListener("click", () => {
//     window.location.href = "lift.html"
// });


// const workoutData = {
//     user_id: document.querySelector('[name="user_id"]').value,
//     date: document.querySelector('[name="date"]').value,
//     exercise: document.querySelector('[name="exercise"]').value,
//     sets: document.querySelector('[name="sets"]').value,
//     reps: document.querySelector('[name="reps"]').value,
//     weight_kg: document.querySelector('[name="weight_kg"]').value,
//     session_duration_hr: document.querySelector('[name="session_duration_hr"]').value,
//     calories_burned: document.querySelector('[name="calories_burned"]').value,
//     avg_bpm: document.querySelector('[name="avg_bpm"]').value,
//     max_bpm: document.querySelector('[name="max_bpm"]').value,
//     water_intake_l: document.querySelector('[name="water_intake_l"]').value,
//     workout_type: document.querySelector('[name="workout_type"]').value,
//     workout_difficulty: document.querySelector('[name="workout_difficulty"]').value,
//     workout_category: document.querySelector('[name="workout_category"]').value
//   };

// console.log(workoutData)

// const getButton = document.querySelector("#log_btn")
// getButton.addEventListener("click", () => {
//     window.location.href = "lift.html"
// });


// const workoutData = {
//     user_id: document.querySelector('[name="user_id"]').value,
//     date: document.querySelector('[name="date"]').value,
//     exercise: document.querySelector('[name="exercise"]').value,
//     sets: document.querySelector('[name="sets"]').value,
//     reps: document.querySelector('[name="reps"]').value,
//     weight_kg: document.querySelector('[name="weight_kg"]').value,
//     session_duration_hr: document.querySelector('[name="session_duration_hr"]').value,
//     calories_burned: document.querySelector('[name="calories_burned"]').value,
//     avg_bpm: document.querySelector('[name="avg_bpm"]').value,
//     max_bpm: document.querySelector('[name="max_bpm"]').value,
//     water_intake_l: document.querySelector('[name="water_intake_l"]').value,
//     workout_type: document.querySelector('[name="workout_type"]').value,
//     workout_difficulty: document.querySelector('[name="workout_difficulty"]').value,
//     workout_category: document.querySelector('[name="workout_category"]').value
//   };

// console.log(workoutData)

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

  console.log("AUTH CONFIG:", config);

  auth0 = await createAuth0Client({
    domain: config.domain,
    client_id: config.clientId,
    redirect_uri: window.location.origin,
  });
}

async function updateAuthUI() {
  const isAuthenticated = await auth0.isAuthenticated();
  document.getElementById('login').disabled = isAuthenticated;
  document.getElementById('logout').disabled = !isAuthenticated;
}

async function login() {
  await auth0.loginWithRedirect({
    redirect_uri: window.location.origin + '/profile.html'
  });
}

function logout() {
  auth0.logout({
    returnTo: window.location.origin,
  });
}

async function handleAuth0Redirect() {
  const query = window.location.search;

  if (query.includes('state=')) {
    try {
      await auth0.handleRedirectCallback();

      window.history.replaceState({}, document.title, '/profile.html');
      window.location.href = '/profile.html';
      return;

    } catch (e) {
      window.alert(e.message || 'authentication error, sorry');
      logout();
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
