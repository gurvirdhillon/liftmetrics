document.addEventListener("DOMContentLoaded", () => {
    const steps = document.querySelectorAll(".form-step");
    const progressText = document.getElementById("progress-text");
    const activitySlider = document.getElementById("activity-level");
    const activityOutput = document.getElementById("activity-output");
    const form = document.getElementById("onboarding-form");
  
    function showStep(stepId) {
      steps.forEach(step => step.classList.remove("active"));
      document.getElementById(stepId).classList.add("active");
  
      const stepNumber = Number(stepId.split("-")[1]);
      progressText.textContent = `Step ${stepNumber} of 6`;
    }
  
    function validateStep(stepId) {
      if (stepId === "step-1") {
        return document.querySelector('input[name="goal"]:checked');
      }
  
      if (stepId === "step-2") {
        return document.querySelectorAll('input[name="days"]:checked').length > 0;
      }
  
      if (stepId === "step-3") {
        return document.querySelector('input[name="timespent"]:checked');
      }
  
      if (stepId === "step-4") {
        return document.querySelector('input[name="equipment"]:checked');
      }
  
      if (stepId === "step-5") {
        return true;
      }
  
      if (stepId === "step-6") {
        return document.querySelector('input[name="fitness_level"]:checked');
      }
  
      return true;
    }
  
    document.querySelectorAll("[data-next]").forEach(button => {
      button.addEventListener("click", () => {
        const currentStep = button.closest(".form-step").id;
  
        if (!validateStep(currentStep)) {
          alert("Please complete this step first.");
          return;
        }
  
        showStep(button.dataset.next);
      });
    });
  
    document.querySelectorAll("[data-back]").forEach(button => {
      button.addEventListener("click", () => {
        showStep(button.dataset.back);
      });
    });
  
    if (activitySlider && activityOutput) {
      activitySlider.addEventListener("input", () => {
        activityOutput.textContent = activitySlider.value;
      });
    }
  
    form.addEventListener("submit", (e) => {
      e.preventDefault();
  
      if (!validateStep("step-6")) {
        alert("Please select your fitness level.");
        return;
      }
  
      const formData = {
        goal: document.querySelector('input[name="goal"]:checked')?.value,
        days: [...document.querySelectorAll('input[name="days"]:checked')].map(day => day.value),
        timespent: document.querySelector('input[name="timespent"]:checked')?.value,
        equipment: document.querySelector('input[name="equipment"]:checked')?.value,
        activity_level: document.getElementById("activity-level")?.value,
        fitness_level: document.querySelector('input[name="fitness_level"]:checked')?.value
      };
  
      console.log(formData);
  
      // send to backend here
      alert("Plan generated!");
    });
  });