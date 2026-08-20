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

async function loadPlanHistory() {
  const history = document.getElementById("plan-history");
  try {
    const response = await authenticatedFetch("/api/plans/history"); const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    history.replaceChildren(...data.plans.slice(1).map((saved) => {
      const button = document.createElement("button"); button.type = "button"; button.textContent = `Restore ${saved.title || saved.goal} (${new Date(saved.created_at).toLocaleDateString()})`;
      button.addEventListener("click", async () => { if (!confirm("Restore this plan as your current plan?")) return; const restore = await authenticatedFetch(`/api/plans/${saved.plan_id}/restore`, { method: "POST" }); const result = await restore.json(); if (!restore.ok) return alert(result.error || "Could not restore plan."); sessionStorage.setItem("liftmetrics_current_plan", JSON.stringify(result.plan)); renderPlan(result.plan); loadPlanHistory(); }); return button;
    }));
    if (!data.plans.slice(1).length) history.textContent = "No previous plans yet.";
  } catch (error) { history.textContent = "Plan history is unavailable."; }
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

loadPlan().finally(loadPlanHistory);
