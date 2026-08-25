import { authenticatedFetch, getAuthClient, handleAuthRedirect, login, logout } from "./auth.js";

let auth0 = null;
let currentUser = null;

const STEP_COUNT = 6;

function getStorageKey(user) {
  return `liftmetrics_onboarding_${user.sub}`;
}

function getStepKey(user) {
  return `liftmetrics_onboarding_step_${user.sub}`;
}

async function initAuth0Client() {
  auth0 = await getAuthClient();
}

document.addEventListener("DOMContentLoaded", async () => {
  const inviteFromLink = new URLSearchParams(window.location.search).get("invite");
  if (inviteFromLink) sessionStorage.setItem("liftmetrics_pending_trainer_invite", inviteFromLink);
  const steps = document.querySelectorAll(".form-step");
  const progressText = document.getElementById("progress-text");
  const activitySlider = document.getElementById("activity-level");
  const activityOutput = document.getElementById("activity-output");
  const form = document.getElementById("onboarding-form");

  const loadingState = document.getElementById("loading-state");
  const loggedOutView = document.getElementById("logged-out-view");
  const loggedInActions = document.getElementById("logged-in-actions");
  const summarySection = document.getElementById("profile-summary");

  const loginBtn = document.getElementById("login");
  const logoutBtn = document.getElementById("logout");
  const editProfileBtn = document.getElementById("edit-profile-btn");
  const generatePlanBtn = document.getElementById("generate-plan-btn");
  const askCoachBtn = document.getElementById("ask-coach-btn");
  const injuryForm = document.getElementById("injury-form");
  const clearInjuryBtn = document.getElementById("clear-injury-btn");
  const usernameForm = document.getElementById("username-form");
  const usernameInput = document.getElementById("chat-username");
  const usernameStatus = document.getElementById("username-status");
  const saveUsernameBtn = document.getElementById("save-username-btn");
  const accountRoleForm = document.getElementById("account-role-form");
  const goalsForm = document.getElementById("goals-form");
  const settingsToggle = document.getElementById("settings-toggle");
  const settingsDrawer = document.getElementById("settings-drawer");
  const settingsOverlay = document.getElementById("settings-overlay");
  const settingsClose = document.getElementById("settings-close");

  function setSettingsDrawer(isOpen) {
    settingsDrawer.hidden = !isOpen;
    settingsOverlay.hidden = !isOpen;
    document.body.classList.toggle("settings-open", isOpen);
    settingsToggle.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) settingsClose.focus();
    else settingsToggle.focus();
  }

  async function acceptTrainerInvite() {
    const code = new URLSearchParams(window.location.search).get("invite") || sessionStorage.getItem("liftmetrics_pending_trainer_invite");
    if (!code || !currentUser?.sub) return;
    const response = await authenticatedFetch("/api/trainer/invites/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inviteCode: code }) });
    const data = await response.json();
    if (!response.ok) return alert(data.error || "Could not accept trainer invite.");
    sessionStorage.removeItem("liftmetrics_pending_trainer_invite");
    window.history.replaceState({}, document.title, "profile.html");
    alert("Trainer invite accepted. Your trainer can now review your progress.");
  }

  async function loadInjuryRestrictions() {
    if (!currentUser?.sub) return;
    try {
      const response = await authenticatedFetch("/api/injury-restrictions");
      const data = await response.json();
      if (!response.ok || !data.injury) return;
      document.getElementById("injury-area").value = data.injury.affected_area;
      document.getElementById("injury-status").value = data.injury.status;
      document.getElementById("injury-pain").value = data.injury.pain_score;
      document.getElementById("injury-movements").value = data.injury.restricted_movements;
      document.getElementById("injury-guidance").value = data.injury.clinician_guidance || "";
    } catch (error) { console.error("Could not load injury restrictions", error); }
  }

  function getFormData() {
    return {
      goal: document.querySelector('input[name="goal"]:checked')?.value || "",
      days: [...document.querySelectorAll('input[name="days"]:checked')].map((day) => day.value),
      timespent: document.querySelector('input[name="timespent"]:checked')?.value || "",
      equipment: document.querySelector('input[name="equipment"]:checked')?.value || "",
      activity_level: document.getElementById("activity-level")?.value || "",
      fitness_level: document.querySelector('input[name="fitness_level"]:checked')?.value || "",
      completed: false
    };
  }

  function resetFormSelections() {
    document.querySelectorAll('#onboarding-form input[type="radio"], #onboarding-form input[type="checkbox"]').forEach((input) => {
      input.checked = false;
    });

    if (activitySlider) {
      activitySlider.value = 3;
    }

    if (activityOutput) {
      activityOutput.textContent = "3";
    }
  }

  function saveToLocalStorage(currentStep = null) {
    if (!currentUser) return;

    const data = getFormData();
    localStorage.setItem(getStorageKey(currentUser), JSON.stringify(data));

    if (currentStep) {
      localStorage.setItem(getStepKey(currentUser), currentStep);
    }
  }

  function saveCompletedProfile() {
    if (!currentUser) return;

    const data = {
      ...getFormData(),
      completed: true
    };

    localStorage.setItem(getStorageKey(currentUser), JSON.stringify(data));
    localStorage.setItem(getStepKey(currentUser), "step-1");
  }

  function getSavedProfile() {
    if (!currentUser) return null;

    const saved = localStorage.getItem(getStorageKey(currentUser));
    if (!saved) return null;

    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error("Could not parse saved profile:", error);
      return null;
    }
  }

  async function hasCurrentPlan() {
    if (sessionStorage.getItem("liftmetrics_current_plan")) return true;
    try {
      const response = await authenticatedFetch("/api/plans/latest");
      return response.ok;
    } catch (error) {
      console.warn("Could not check for an existing plan:", error);
      return false;
    }
  }

  function loadFromLocalStorage() {
    const data = getSavedProfile();
    if (!data) return;

    resetFormSelections();

    if (data.goal) {
      const goalInput = document.querySelector(`input[name="goal"][value="${data.goal}"]`);
      if (goalInput) goalInput.checked = true;
    }

    if (Array.isArray(data.days)) {
      data.days.forEach((day) => {
        const dayInput = document.querySelector(`input[name="days"][value="${day}"]`);
        if (dayInput) dayInput.checked = true;
      });
    }

    if (data.timespent) {
      const timeInput = document.querySelector(`input[name="timespent"][value="${data.timespent}"]`);
      if (timeInput) timeInput.checked = true;
    }

    if (data.equipment) {
      const equipmentInput = document.querySelector(`input[name="equipment"][value="${data.equipment}"]`);
      if (equipmentInput) equipmentInput.checked = true;
    }

    if (data.activity_level && activitySlider) {
      activitySlider.value = data.activity_level;
      if (activityOutput) {
        activityOutput.textContent = data.activity_level;
      }
    }

    if (data.fitness_level) {
      const fitnessInput = document.querySelector(`input[name="fitness_level"][value="${data.fitness_level}"]`);
      if (fitnessInput) fitnessInput.checked = true;
    }
  }

  function showStep(stepId) {
    steps.forEach((step) => step.classList.remove("active"));

    const targetStep = document.getElementById(stepId);
    if (targetStep) {
      targetStep.classList.add("active");

      const stepNumber = Number(stepId.split("-")[1]);
      if (progressText) {
        progressText.textContent = `Step ${stepNumber} of ${STEP_COUNT}`;
      }

      if (currentUser) {
        localStorage.setItem(getStepKey(currentUser), stepId);
      }
    }
  }

  function loadSavedStep() {
    if (!currentUser) {
      showStep("step-1");
      return;
    }

    const savedStep = localStorage.getItem(getStepKey(currentUser));
    if (savedStep && document.getElementById(savedStep)) {
      showStep(savedStep);
    } else {
      showStep("step-1");
    }
  }

  function validateStep(stepId) {
    if (stepId === "step-1") {
      return !!document.querySelector('input[name="goal"]:checked');
    }

    if (stepId === "step-2") {
      return document.querySelectorAll('input[name="days"]:checked').length > 0;
    }

    if (stepId === "step-3") {
      return !!document.querySelector('input[name="timespent"]:checked');
    }

    if (stepId === "step-4") {
      return !!document.querySelector('input[name="equipment"]:checked');
    }

    if (stepId === "step-5") {
      return true;
    }

    if (stepId === "step-6") {
      return !!document.querySelector('input[name="fitness_level"]:checked');
    }

    return true;
  }

  function formatGoal(value) {
    const map = {
      "weight-loss": "Weight loss",
      "strength": "Gain strength",
      "stamina": "Stamina",
      "wellbeing": "General wellbeing"
    };
    return map[value] || value || "-";
  }

  function formatTimeSpent(value) {
    const map = {
      "30": "30 mins",
      "45": "45 mins",
      "60": "60+ mins"
    };
    return map[value] || value || "-";
  }

  function formatEquipment(value) {
    const map = {
      "gym": "Gym",
      "home": "Home",
      "both": "Both"
    };
    return map[value] || value || "-";
  }

  function formatFitnessLevel(value) {
    const map = {
      "beginner": "Beginner",
      "intermediate": "Intermediate",
      "advanced": "Advanced"
    };
    return map[value] || value || "-";
  }

  function renderSummary(profile) {
    document.getElementById("summary-goal").textContent = formatGoal(profile.goal);
    document.getElementById("summary-days").textContent = profile.days?.length ? profile.days.join(", ") : "-";
    document.getElementById("summary-timespent").textContent = formatTimeSpent(profile.timespent);
    document.getElementById("summary-equipment").textContent = formatEquipment(profile.equipment);
    document.getElementById("summary-activity").textContent = profile.activity_level ? `${profile.activity_level} days / week` : "-";
    document.getElementById("summary-fitness").textContent = formatFitnessLevel(profile.fitness_level);
  }

  async function loadGoals() {
    try {
      const response = await authenticatedFetch("/api/goals"); const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load goals.");
      document.getElementById("goal-calories").value = data.goals.daily_calories;
      document.getElementById("goal-protein").value = data.goals.daily_protein;
      document.getElementById("goal-workouts").value = data.goals.weekly_workouts;
    } catch (error) { document.getElementById("goals-status").textContent = error.message; }
  }

  async function loadUsername() {
    if (!currentUser?.sub || !usernameInput) return;
    try {
      const response = await authenticatedFetch("/api/usernames");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load username.");
      usernameInput.value = data.username || "";
      if (data.username) {
        usernameInput.disabled = true;
        saveUsernameBtn.disabled = true;
        usernameStatus.textContent = "Username locked.";
      }
    } catch (error) {
      usernameStatus.textContent = error.message;
    }
  }

  function formatWorkoutDate(value) {
    const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
    if (!year || !month || !day) return "Recent workout";
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
      .format(new Date(Date.UTC(year, month - 1, day)));
  }

  function renderWorkoutHistory(workouts) {
    const status = document.getElementById("workout-history-status");
    const list = document.getElementById("workout-history-preview");
    list.replaceChildren();

    if (!workouts.length) {
      status.textContent = "No workouts logged yet. Your completed sessions will appear here.";
      return;
    }

    status.textContent = "";
    const cards = workouts.slice(0, 3).map((workout) => {
      const card = document.createElement("article");
      card.className = "workout-preview-card";
      const date = document.createElement("p");
      date.className = "workout-preview-date";
      date.textContent = formatWorkoutDate(workout.session_date);
      const title = document.createElement("h4");
      title.textContent = workout.workout_type || "Workout";
      const details = document.createElement("div");
      details.className = "workout-preview-details";
      const duration = document.createElement("span");
      duration.textContent = `${workout.duration_value} ${workout.duration_unit}`;
      const effort = document.createElement("span");
      effort.textContent = `Effort ${workout.feeling_score}/10`;
      details.append(duration, effort);
      card.append(date, title, details);
      return card;
    });
    list.append(...cards);
  }

  async function loadWorkoutHistoryPreview() {
    const status = document.getElementById("workout-history-status");
    if (!currentUser?.sub) return;
    status.textContent = "Loading recent workouts…";
    try {
      const response = await authenticatedFetch("/api/workouts?limit=3");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load recent workouts.");
      renderWorkoutHistory(data.workouts || []);
    } catch (error) {
      status.textContent = error.message;
    }
  }

  function renderInsights(insights) {
    const status = document.getElementById("insight-status");
    const readiness = document.getElementById("readiness-card");
    status.textContent = "";
    readiness.hidden = false;
    document.getElementById("readiness-label").textContent = `${insights.recommendation.status.toUpperCase()} • ${insights.sessionsThisWeek} session${insights.sessionsThisWeek === 1 ? "" : "s"} this week`;
    document.getElementById("readiness-title").textContent = insights.recommendation.title;
    document.getElementById("readiness-detail").textContent = insights.recommendation.detail;
    document.getElementById("quality-score").textContent = `${insights.qualityScore}/100 quality`;
    document.getElementById("weekly-review").textContent = insights.weeklyReview;
    const fillList = (id, items, text) => {
      const list = document.getElementById(id); list.replaceChildren();
      if (!items.length) { const item = document.createElement("li"); item.textContent = "Log a strength workout to see this."; list.append(item); return; }
      items.slice(0, 5).forEach((item) => { const element = document.createElement("li"); element.textContent = text(item); list.append(element); });
    };
    fillList("progression-list", insights.progressions, (item) => `${item.exercise}: ${item.suggestion}`);
    fillList("advanced-progression-list", insights.progressions, (item) => `${item.exercise}: estimated 1-rep maximum ${item.estimated_1rm} ${item.weight_unit}. This is an estimate based on your logged working sets, not a target to test.`);
    fillList("muscle-balance-list", insights.muscleBalance, (item) => `${item.muscle}: ${item.sets} sets`);
  }

  async function loadInsights() {
    if (!currentUser?.sub) return;
    try {
      const response = await authenticatedFetch("/api/insights");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load training guidance.");
      renderInsights(data);
    } catch (error) { document.getElementById("insight-status").textContent = error.message; }
  }

  function showLoggedOutState() {
    loadingState.style.display = "none";
    loggedOutView.style.display = "block";
    loggedInActions.style.display = "none";
    form.style.display = "none";
    summarySection.style.display = "none";

    loginBtn.disabled = false;
    logoutBtn.disabled = true;
  }

  function showFormState() {
    loadingState.style.display = "none";
    loggedOutView.style.display = "none";
    loggedInActions.style.display = "flex";
    form.style.display = "block";
    summarySection.style.display = "none";

    loginBtn.disabled = true;
    logoutBtn.disabled = false;
  }

  function showSummaryState(profile) {
    renderSummary(profile);
    loadWorkoutHistoryPreview();
    loadInsights();
    loadInjuryRestrictions();
    loadUsername();
    loadGoals();

    loadingState.style.display = "none";
    loggedOutView.style.display = "none";
    loggedInActions.style.display = "flex";
    form.style.display = "none";
    summarySection.style.display = "block";

    loginBtn.disabled = true;
    logoutBtn.disabled = false;
  }

  async function setupPage() {
    try {
      await initAuth0Client();

      await handleAuthRedirect();

      const isAuthenticated = await auth0.isAuthenticated();

      if (!isAuthenticated) {
        showLoggedOutState();
        return;
      }

      currentUser = await auth0.getUser();

      await acceptTrainerInvite();

      const roleResponse = await authenticatedFetch("/api/account-role");
      if (roleResponse.ok) {
        const { role } = await roleResponse.json();
        document.getElementById("account-role").checked = role === "trainer";
        if (role === "trainer" && !new URLSearchParams(window.location.search).has("clientView")) {
          window.location.replace("trainer.html");
          return;
        }
      }

      loadFromLocalStorage();

      const savedProfile = getSavedProfile();

      if (savedProfile?.completed) {
        showSummaryState(savedProfile);
      } else {
        showFormState();
        loadSavedStep();
      }
    } catch (error) {
      console.error("Profile page setup failed:", error);
      loadingState.innerHTML = "<p>Something went wrong loading the page.</p>";
    }
  }

  loginBtn?.addEventListener("click", async () => {
    await login();
  });

  settingsToggle?.addEventListener("click", () => setSettingsDrawer(true));
  settingsClose?.addEventListener("click", () => setSettingsDrawer(false));
  settingsOverlay?.addEventListener("click", () => setSettingsDrawer(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !settingsDrawer.hidden) setSettingsDrawer(false);
  });

  accountRoleForm?.addEventListener("change", async () => {
    const status = document.getElementById("account-role-status");
    const selectedRole = document.getElementById("account-role").checked ? "trainer" : "client";
    const response = await authenticatedFetch("/api/account-role", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: selectedRole }) });
    const data = await response.json();
    status.textContent = response.ok ? `Role saved as ${data.role}.` : data.error || "Could not save role.";
    if (response.ok && data.role === "trainer") window.location.assign("trainer.html");
  });

  logoutBtn?.addEventListener("click", () => {
    logout();
  });

  usernameForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = usernameInput.value.trim();
    if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) {
      usernameStatus.textContent = "Use 3–24 letters, numbers, or underscores.";
      return;
    }

    try {
      const response = await authenticatedFetch("/api/usernames", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save username.");
      usernameInput.value = data.username;
      usernameInput.disabled = true;
      saveUsernameBtn.disabled = true;
      usernameStatus.textContent = "Username saved.";
    } catch (error) {
      usernameStatus.textContent = error.message;
    }
  });

  askCoachBtn?.addEventListener("click", async () => {
    if (!currentUser?.sub) return;
    askCoachBtn.disabled = true;
    askCoachBtn.textContent = "Thinking…";
    try {
      const response = await authenticatedFetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Coach is unavailable.");
      const coach = data.coach;
      document.getElementById("coach-headline").textContent = coach.headline;
      document.getElementById("coach-recommendation").textContent = coach.recommendation;
      document.getElementById("coach-why").textContent = coach.why;
      document.getElementById("coach-alternative").textContent = coach.alternative;
      document.getElementById("coach-safety").textContent = coach.safety_note;
      document.getElementById("coach-response").hidden = false;
    } catch (error) { alert(error.message); }
    finally { askCoachBtn.disabled = false; askCoachBtn.textContent = "Ask LiftMetrics Coach"; }
  });

  injuryForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.getElementById("injury-status-message");
    try {
      const response = await authenticatedFetch("/api/injury-restrictions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ affected_area: document.getElementById("injury-area").value, status: document.getElementById("injury-status").value, pain_score: Number(document.getElementById("injury-pain").value), restricted_movements: document.getElementById("injury-movements").value, clinician_guidance: document.getElementById("injury-guidance").value }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save restrictions.");
      status.textContent = "Restrictions saved. Refreshing your guidance…";
      await loadInsights();
    } catch (error) { status.textContent = error.message; }
  });

  clearInjuryBtn?.addEventListener("click", async () => {
    if (!currentUser?.sub || !confirm("Clear your saved injury restrictions?")) return;
    const status = document.getElementById("injury-status-message");
    try {
      const response = await authenticatedFetch("/api/injury-restrictions", { method: "DELETE" });
      if (!response.ok && response.status !== 204) throw new Error("Could not clear restrictions.");
      injuryForm.reset();
      document.getElementById("injury-pain").value = 0;
      status.textContent = "Restrictions cleared. Refreshing your guidance…";
      await loadInsights();
    } catch (error) { status.textContent = error.message; }
  });

  goalsForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.getElementById("goals-status");
    try {
      status.textContent = "Saving…";
      const response = await authenticatedFetch("/api/goals", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dailyCalories: Number(document.getElementById("goal-calories").value), dailyProtein: Number(document.getElementById("goal-protein").value), weeklyWorkouts: Number(document.getElementById("goal-workouts").value) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not save goals.");
      status.textContent = "Goals saved.";
    } catch (error) { status.textContent = error.message; }
  });

  editProfileBtn?.addEventListener("click", () => {
    loadFromLocalStorage();
    showFormState();
    loadSavedStep();
  });

  generatePlanBtn?.addEventListener("click", async () => {
    const profile = getSavedProfile();
    if (!profile?.completed || !currentUser?.sub) {
      alert("Please complete your profile before generating a plan.");
      return;
    }
    if (await hasCurrentPlan() && !confirm("Generate a new plan?\n\nThis will replace the plan shown as your current plan. Your existing plan will no longer be available from the current-plan screen, and this app does not yet provide a way to restore it.")) {
      return;
    }
    generatePlanBtn.disabled = true;
    generatePlanBtn.textContent = "Generating...";
    try {
      const response = await authenticatedFetch("/api/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not generate your plan.");
      sessionStorage.setItem("liftmetrics_current_plan", JSON.stringify({ plan: data.plan, planId: data.plan_id }));
      window.location.href = "plan.html";
    } catch (error) {
      alert(error.message);
    } finally {
      generatePlanBtn.disabled = false;
      generatePlanBtn.textContent = "Generate a new plan";
    }
  });

  document.querySelectorAll("[data-next]").forEach((button) => {
    button.addEventListener("click", () => {
      const currentStep = button.closest(".form-step").id;

      if (!validateStep(currentStep)) {
        alert("Please complete this step first.");
        return;
      }

      saveToLocalStorage(currentStep);
      showStep(button.dataset.next);
    });
  });

  document.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", () => {
      saveToLocalStorage(button.dataset.back);
      showStep(button.dataset.back);
    });
  });

  document.querySelectorAll('#onboarding-form input[type="radio"], #onboarding-form input[type="checkbox"]').forEach((input) => {
    input.addEventListener("change", () => {
      const activeStep = document.querySelector(".form-step.active")?.id || "step-1";
      saveToLocalStorage(activeStep);
    });
  });

  if (activitySlider && activityOutput) {
    activityOutput.textContent = activitySlider.value;

    activitySlider.addEventListener("input", () => {
      activityOutput.textContent = activitySlider.value;

      const activeStep = document.querySelector(".form-step.active")?.id || "step-1";
      saveToLocalStorage(activeStep);
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!validateStep("step-6")) {
        alert("Please select your fitness level.");
        return;
      }

      const formData = getFormData();
      console.log("Saved onboarding data:", formData);

      try {
        saveCompletedProfile();
        const savedProfile = getSavedProfile();
        showSummaryState(savedProfile);

        alert("Profile saved! Use Generate a new plan to create your programme.");
      } catch (error) {
        console.error("Error saving profile:", error);
        alert("Something went wrong while saving your profile.");
      }
    });
  }

  await setupPage();
});
