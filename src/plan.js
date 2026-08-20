import { authenticatedFetch, getAuthenticatedUser } from "./auth.js";

function renderPlan(plan) {
  document.getElementById("plan-title").textContent = plan.title;
  document.getElementById("plan-focus").textContent = plan.durationMinutes ? `${plan.focus} ${plan.durationMinutes} minutes per session.` : plan.focus;
  document.getElementById("plan-adaptation").textContent = plan.adaptation?.note || "Progress gradually and adjust any movement that causes pain.";
  const safety = plan.safety?.restrictedExercises?.length ? ` Safety flag: ${plan.safety.restrictedExercises.join(", ")}. ${plan.safety.note}` : "";
  document.getElementById("plan-adaptation").textContent += safety;
  const sessions = document.getElementById("plan-sessions");
  sessions.replaceChildren(...plan.sessions.map((session) => {
    const card = document.createElement("section");
    card.className = "plan-card";
    const title = document.createElement("h2");
    title.textContent = `${session.day} · ${session.name}`;
    const list = document.createElement("ul");
    session.exercises.forEach((exercise) => {
      const item = document.createElement("li");
      item.textContent = `${exercise.name} — ${exercise.prescription} (${exercise.rest})`;
      list.appendChild(item);
    });
    card.append(title, list);
    return card;
  }));
}

async function loadPlan() {
  try {
    const cachedPlan = sessionStorage.getItem("liftmetrics_current_plan");
    if (cachedPlan) return renderPlan(JSON.parse(cachedPlan));
    const user = await getAuthenticatedUser();
    if (!user?.sub) throw new Error("Please log in from your profile to view your plan.");
    const response = await authenticatedFetch("/api/plans/latest");
    const data = await response.json();
    if (response.status === 404) throw new Error("You do not have a saved plan yet. Return to your profile and choose Generate a new plan.");
    if (!response.ok) throw new Error(data.error || "Could not load your plan.");
    renderPlan(data.plan);
  } catch (error) {
    document.getElementById("plan-title").textContent = "Your plan is unavailable";
    document.getElementById("plan-focus").textContent = error.message;
  }
}

loadPlan();
