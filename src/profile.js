let auth0 = null;
let currentUser = null;

const STEP_COUNT = 6;

function getStorageKey(user) {
  return `liftmetrics_onboarding_${user.sub}`;
}

function getStepKey(user) {
  return `liftmetrics_onboarding_step_${user.sub}`;
}

async function fetchAuthConfig() {
  const res = await fetch("/auth-config");
  if (!res.ok) {
    throw new Error("Failed to load Auth0 config");
  }
  return res.json();
}

async function initAuth0Client() {
  const config = await fetchAuthConfig();

  auth0 = await createAuth0Client({
    domain: config.domain,
    client_id: config.clientId,
    redirect_uri: window.location.origin + "/profile.html"
  });
}

async function login() {
  await auth0.loginWithRedirect({
    redirect_uri: window.location.origin + "/profile.html"
  });
}

function logout() {
  auth0.logout({
    returnTo: window.location.origin
  });
}

document.addEventListener("DOMContentLoaded", async () => {
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
    document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach((input) => {
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
    loggedInActions.style.display = "block";
    form.style.display = "block";
    summarySection.style.display = "none";

    loginBtn.disabled = true;
    logoutBtn.disabled = false;
  }

  function showSummaryState(profile) {
    renderSummary(profile);

    loadingState.style.display = "none";
    loggedOutView.style.display = "none";
    loggedInActions.style.display = "block";
    form.style.display = "none";
    summarySection.style.display = "block";

    loginBtn.disabled = true;
    logoutBtn.disabled = false;
  }

  async function setupPage() {
    try {
      await initAuth0Client();

      if (
        window.location.search.includes("code=") &&
        window.location.search.includes("state=")
      ) {
        await auth0.handleRedirectCallback();
        window.history.replaceState({}, document.title, "/profile.html");
      }

      const isAuthenticated = await auth0.isAuthenticated();

      if (!isAuthenticated) {
        showLoggedOutState();
        return;
      }

      currentUser = await auth0.getUser();

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

  logoutBtn?.addEventListener("click", () => {
    logout();
  });

  editProfileBtn?.addEventListener("click", () => {
    loadFromLocalStorage();
    showFormState();
    loadSavedStep();
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

  document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach((input) => {
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

        alert("Profile saved! Your plan can now be generated.");
      } catch (error) {
        console.error("Error saving profile:", error);
        alert("Something went wrong while saving your profile.");
      }
    });
  }

  await setupPage();
});