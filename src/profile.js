const STORAGE_KEY = "liftmetrics_onboarding";
const STEP_KEY = "liftmetrics_onboarding_step";

document.addEventListener("DOMContentLoaded", () => {
  const steps = document.querySelectorAll(".form-step");
  const progressText = document.getElementById("progress-text");
  const activitySlider = document.getElementById("activity-level");
  const activityOutput = document.getElementById("activity-output");
  const form = document.getElementById("onboarding-form");

  function getFormData() {
    return {
      goal: document.querySelector('input[name="goal"]:checked')?.value || "",
      days: [...document.querySelectorAll('input[name="days"]:checked')].map(day => day.value),
      timespent: document.querySelector('input[name="timespent"]:checked')?.value || "",
      equipment: document.querySelector('input[name="equipment"]:checked')?.value || "",
      activity_level: document.getElementById("activity-level")?.value || "",
      fitness_level: document.querySelector('input[name="fitness_level"]:checked')?.value || ""
    };
  }

  function saveToLocalStorage(currentStep = null) {
    const data = getFormData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    if (currentStep) {
      localStorage.setItem(STEP_KEY, currentStep);
    }
  }

  function loadFromLocalStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    const data = JSON.parse(saved);

    if (data.goal) {
      const goalInput = document.querySelector(`input[name="goal"][value="${data.goal}"]`);
      if (goalInput) goalInput.checked = true;
    }

    if (data.days && Array.isArray(data.days)) {
      data.days.forEach(day => {
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
        activityOutput.textContent = `${data.activity_level} days / week`;
      }
    }

    if (data.fitness_level) {
      const fitnessInput = document.querySelector(`input[name="fitness_level"][value="${data.fitness_level}"]`);
      if (fitnessInput) fitnessInput.checked = true;
    }
  }

  function showStep(stepId) {
    steps.forEach(step => step.classList.remove("active"));

    const targetStep = document.getElementById(stepId);
    if (targetStep) {
      targetStep.classList.add("active");

      const stepNumber = Number(stepId.split("-")[1]);
      if (progressText) {
        progressText.textContent = `Step ${stepNumber} of 6`;
      }

      localStorage.setItem(STEP_KEY, stepId);
    }
  }

  function loadSavedStep() {
    const savedStep = localStorage.getItem(STEP_KEY);
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

  loadFromLocalStorage();
  loadSavedStep();

  document.querySelectorAll("[data-next]").forEach(button => {
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

  document.querySelectorAll("[data-back]").forEach(button => {
    button.addEventListener("click", () => {
      saveToLocalStorage(button.dataset.back);
      showStep(button.dataset.back);
    });
  });

  document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
    input.addEventListener("change", () => {
      const activeStep = document.querySelector(".form-step.active")?.id || "step-1";
      saveToLocalStorage(activeStep);
    });
  });

  if (activitySlider && activityOutput) {
    activityOutput.textContent = `${activitySlider.value} days / week`;

    activitySlider.addEventListener("input", () => {
      activityOutput.textContent = `${activitySlider.value} days / week`;

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
      console.log(formData);

      try {
        // Example backend call:
        // const response = await fetch("/plans", {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify(formData)
        // });
        //
        // if (!response.ok) {
        //   throw new Error("Failed to save plan");
        // }

        localStorage.removeItem(STEP_KEY);

        alert("Plan generated!");
      } catch (error) {
        console.error("Error generating plan:", error);
        alert("Something went wrong while generating your plan.");
      }
    });
  }
});
