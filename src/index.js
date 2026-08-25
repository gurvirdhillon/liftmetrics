import { authenticatedFetch, getAuthenticatedUser, handleAuthRedirect, login, logout } from "./auth.js";

let isAuthenticated = false;

function startOfWeek() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day + 1);
  return date;
}

function getTodayPlanSession(plan) {
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];
  return plan?.sessions?.find((session) => session.day === day) || plan?.sessions?.[0];
}

async function loadHomeDashboard(user) {
  const greeting = document.getElementById("home-greeting");
  const nextTitle = document.getElementById("next-session-title");
  const nextDetail = document.getElementById("next-session-detail");
  const weeklyCount = document.getElementById("weekly-workout-count");
  const latestWorkout = document.getElementById("latest-workout-label");
  const readiness = document.getElementById("dashboard-readiness");
  const wellnessDetail = document.getElementById("dashboard-wellness-detail");
  const name = (user?.name || user?.nickname || "there").split(" ")[0];
  greeting.textContent = `Welcome back, ${name}`;

  try {
    const [planResponse, workoutsResponse, wellnessResponse] = await Promise.all([
      authenticatedFetch("/api/plans/latest"),
      authenticatedFetch("/api/workouts?limit=25"),
      authenticatedFetch("/api/wellness/today")
    ]);
    const planData = planResponse.status === 404 ? null : await planResponse.json();
    const workoutsData = await workoutsResponse.json();
    if (!workoutsResponse.ok) throw new Error("Could not load workout history.");

    const nextSession = getTodayPlanSession(planData?.plan);
    if (nextSession) {
      nextTitle.textContent = nextSession.name;
      nextDetail.textContent = `${nextSession.day} · ${planData.plan.durationMinutes || "Flexible"} min session`;
    } else {
      nextTitle.textContent = "Build your next session";
      nextDetail.textContent = "Create a personalised plan, or log a workout whenever you are ready.";
    }

    const workouts = workoutsData.workouts || [];
    const weeklyWorkouts = workouts.filter((workout) => new Date(`${workout.session_date}T00:00:00`) >= startOfWeek());
    weeklyCount.textContent = weeklyWorkouts.length;
    latestWorkout.textContent = workouts[0]
      ? new Date(`${workouts[0].session_date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : "None yet";
    const wellnessData = wellnessResponse.ok ? await wellnessResponse.json() : {};
    const score = Number(wellnessData.checkin?.readiness_score);
    if (Number.isFinite(score)) {
      readiness.textContent = score >= 4 ? "Ready" : score >= 2.8 ? "Steady" : "Recover";
      wellnessDetail.textContent = score >= 4 ? "You look set for your planned workout." : score >= 2.8 ? "A normal session is fine—listen to your body." : "Consider lighter activity or rest today.";
    }
  } catch {
    nextTitle.textContent = "Ready when you are";
    nextDetail.textContent = "Start a workout or visit your profile to create a plan.";
    weeklyCount.textContent = "—";
    latestWorkout.textContent = "—";
  }
}

async function updateAuthUI() {
  const loginBtn = document.getElementById("login");
  const logoutBtn = document.getElementById("logout");
  const user = await getAuthenticatedUser();
  const loginPrompt = document.getElementById("login-prompt");
  const dashboard = document.getElementById("home-dashboard");
  const quote = document.getElementById("thequote");
  isAuthenticated = Boolean(user);

  if (loginBtn) loginBtn.disabled = isAuthenticated;
  if (logoutBtn) logoutBtn.disabled = !isAuthenticated;
  if (loginPrompt) loginPrompt.hidden = isAuthenticated;
  if (dashboard) dashboard.hidden = !isAuthenticated;
  if (quote) quote.hidden = isAuthenticated;
  document.querySelectorAll("[data-auth-required]").forEach((link) => {
    link.setAttribute("aria-disabled", String(!isAuthenticated));
    link.toggleAttribute("data-disabled", !isAuthenticated);
    if (!isAuthenticated) link.setAttribute("title", "Log in to use this feature");
    else link.removeAttribute("title");
  });

  const nameEl = document.getElementById("user-name");
  if (nameEl) nameEl.textContent = user?.name || user?.nickname || user?.email || "Guest";
  if (user) await loadHomeDashboard(user);
}

function setupListeners() {
  document.getElementById("login")?.addEventListener("click", login);
  document.getElementById("logout")?.addEventListener("click", logout);

  document.querySelectorAll("[data-auth-required]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (isAuthenticated) return;

      event.preventDefault();
    });
  });
}

window.addEventListener("load", async () => {
  try {
    await handleAuthRedirect();
    setupListeners();
    await updateAuthUI();
  } catch (error) {
    console.error("Auth setup failed:", error);
  }
});
