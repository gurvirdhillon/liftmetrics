import { authenticatedFetch, getAuthenticatedUser, handleAuthRedirect } from "./auth.js";

const state = { month: new Date(new Date().getFullYear(), new Date().getMonth(), 1), selectedDate: localDate(new Date()), entries: [], selectedFood: null, editingEntryId: null, goals: { daily_calories: 2000, daily_protein: 120 } };
const $ = (selector) => document.querySelector(selector);

function localDate(date) { const offset = date.getTimezoneOffset() * 60_000; return new Date(date - offset).toISOString().slice(0, 10); }
function monthKey() { return `${state.month.getFullYear()}-${String(state.month.getMonth() + 1).padStart(2, "0")}`; }
function number(value) { return Number(value || 0); }
function selectedEntries() { return state.entries.filter((entry) => entry.logged_date === state.selectedDate); }
function formatDate(value) { return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }); }
function totals(entries) { return entries.reduce((total, entry) => ({ calories: total.calories + number(entry.calories), protein: total.protein + number(entry.protein_g), carbs: total.carbs + number(entry.carbs_g), fat: total.fat + number(entry.fat_g) }), { calories: 0, protein: 0, carbs: 0, fat: 0 }); }

function renderCalendar() {
  $("#calendar-title").textContent = state.month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const start = new Date(state.month); const firstWeekday = (start.getDay() + 6) % 7;
  const days = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 0).getDate();
  const entriesByDate = new Set(state.entries.map((entry) => entry.logged_date));
  const calendar = $("#nutrition-calendar"); calendar.replaceChildren();
  for (let i = 0; i < firstWeekday; i += 1) calendar.append(document.createElement("span"));
  for (let day = 1; day <= days; day += 1) {
    const date = `${monthKey()}-${String(day).padStart(2, "0")}`; const button = document.createElement("button");
    button.type = "button"; button.textContent = day; button.className = "calendar-day"; button.dataset.date = date;
    button.setAttribute("aria-label", `${formatDate(date)}${entriesByDate.has(date) ? ", has food entries" : ""}`);
    button.classList.toggle("is-selected", date === state.selectedDate); button.classList.toggle("has-entries", entriesByDate.has(date));
    button.addEventListener("click", () => { state.selectedDate = date; render(); }); calendar.append(button);
  }
}

function renderTotalsAndEntries() {
  $("#selected-date").textContent = formatDate(state.selectedDate);
  const dailyTotals = totals(selectedEntries());
  $("#nutrition-totals").innerHTML = `<span><strong>${Math.round(dailyTotals.calories)} / ${state.goals.daily_calories}</strong> kcal</span><span><strong>${dailyTotals.protein.toFixed(1)} / ${state.goals.daily_protein}g</strong> protein</span><span><strong>${dailyTotals.carbs.toFixed(1)}g</strong> carbs</span><span><strong>${dailyTotals.fat.toFixed(1)}g</strong> fat</span>`;
  const list = $("#food-entries"); list.replaceChildren();
  if (!selectedEntries().length) { list.textContent = "No food logged for this day yet."; return; }
  selectedEntries().forEach((entry) => {
    const row = document.createElement("article"); row.className = "food-entry";
    row.innerHTML = `<div><h3></h3><p>${number(entry.calories).toFixed(0)} kcal · P ${number(entry.protein_g).toFixed(1)}g · C ${number(entry.carbs_g).toFixed(1)}g · F ${number(entry.fat_g).toFixed(1)}g</p></div><div class="food-entry-actions"><button class="edit-entry" type="button">Edit</button><button type="button" aria-label="Delete ${entry.food_name}">Delete</button></div>`;
    row.querySelector("h3").textContent = entry.food_name; row.querySelector(".edit-entry").addEventListener("click", () => editEntry(entry)); row.querySelector("[aria-label^=Delete]").addEventListener("click", () => deleteEntry(entry.entry_id)); list.append(row);
  });
}

function render() { renderCalendar(); renderTotalsAndEntries(); }
async function loadEntries() { const [entriesResponse, goalsResponse] = await Promise.all([authenticatedFetch(`/api/food-entries?month=${monthKey()}`), authenticatedFetch("/api/goals")]); const data = await entriesResponse.json(); if (!entriesResponse.ok) throw new Error(data.error); if (goalsResponse.ok) state.goals = (await goalsResponse.json()).goals; state.entries = data.entries; render(); }
function setStatus(message) { $("#food-status").textContent = message; }

function editEntry(entry) {
  state.editingEntryId = entry.entry_id; state.selectedFood = null;
  $("#food-name").value = entry.food_name; $("#food-quantity").value = entry.quantity; $("#food-calories").value = entry.calories; $("#food-protein").value = entry.protein_g; $("#food-carbs").value = entry.carbs_g; $("#food-fat").value = entry.fat_g; $("#food-source").value = entry.source; $("#food-source-id").value = ""; $("#save-food-entry").textContent = "Save changes"; setStatus(`Editing ${entry.food_name}.`); $("#food-name").focus();
}

function fillFood(food) {
  $("#food-name").value = food.name; $("#food-quantity").value = food.quantity || 100; $("#food-unit").textContent = food.unit || "g";
  $("#food-calories").value = food.calories; $("#food-protein").value = food.protein; $("#food-carbs").value = food.carbs; $("#food-fat").value = food.fat;
  state.selectedFood = food; $("#food-source").value = "usda"; $("#food-source-id").value = food.id; $("#food-results").replaceChildren(); setStatus("Food selected. Adjust the serving or values if needed.");
}

$("#food-quantity").addEventListener("input", () => {
  if (!state.selectedFood) return;
  const multiplier = number($("#food-quantity").value) / number(state.selectedFood.quantity || 100);
  $("#food-calories").value = (state.selectedFood.calories * multiplier).toFixed(1);
  $("#food-protein").value = (state.selectedFood.protein * multiplier).toFixed(1);
  $("#food-carbs").value = (state.selectedFood.carbs * multiplier).toFixed(1);
  $("#food-fat").value = (state.selectedFood.fat * multiplier).toFixed(1);
});

let searchTimeout;
$("#food-search").addEventListener("input", () => {
  clearTimeout(searchTimeout); const query = $("#food-search").value.trim(); state.selectedFood = null; $("#food-source").value = "manual"; $("#food-source-id").value = "";
  if (query.length < 2) return $("#food-results").replaceChildren();
  searchTimeout = setTimeout(async () => {
    try {
      const response = await authenticatedFetch(`/api/foods/search?q=${encodeURIComponent(query)}`); const data = await response.json(); if (!response.ok) throw new Error(data.error);
      const results = $("#food-results"); results.replaceChildren();
      data.foods.forEach((food) => { const button = document.createElement("button"); button.type = "button"; button.innerHTML = `<strong></strong><span>${food.brand ? `${food.brand} · ` : ""}${Math.round(food.calories)} kcal per ${food.servingLabel || "100g"}</span>`; button.querySelector("strong").textContent = food.name; button.addEventListener("click", () => fillFood(food)); results.append(button); });
      if (!data.foods.length) results.textContent = "No matching foods found. Add it manually below.";
    } catch (error) { $("#food-results").textContent = error.message; }
  }, 300);
});

$("#food-entry-form").addEventListener("submit", async (event) => {
  event.preventDefault(); const entryForm = event.currentTarget; const form = new FormData(entryForm); const quantity = number(form.get("quantity"));
  const payload = { loggedDate: state.selectedDate, foodName: form.get("foodName"), quantity, calories: number(form.get("calories")), protein: number(form.get("protein")), carbs: number(form.get("carbs")), fat: number(form.get("fat")), source: $("#food-source").value, sourceFoodId: $("#food-source-id").value, servingLabel: `${quantity} ${$("#food-unit").textContent}` };
  try { setStatus("Saving…"); const endpoint = state.editingEntryId ? `/api/food-entries/${state.editingEntryId}` : "/api/food-entries"; const response = await authenticatedFetch(endpoint, { method: state.editingEntryId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); if (state.editingEntryId) state.entries = state.entries.map((entry) => entry.entry_id === data.entry.entry_id ? data.entry : entry); else state.entries.unshift(data.entry); entryForm.reset(); state.selectedFood = null; state.editingEntryId = null; $("#food-quantity").value = 100; $("#food-unit").textContent = "g"; $("#save-food-entry").textContent = "Add to this day"; setStatus("Saved to your food log."); render(); }
  catch (error) { setStatus(error.message); }
});

async function deleteEntry(entryId) { try { const response = await authenticatedFetch(`/api/food-entries/${entryId}`, { method: "DELETE" }); if (!response.ok) throw new Error("Could not delete that entry."); state.entries = state.entries.filter((entry) => entry.entry_id !== entryId); render(); } catch (error) { setStatus(error.message); } }

$("#previous-month").addEventListener("click", async () => { state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1); state.selectedDate = `${monthKey()}-01`; await loadEntries(); });
$("#next-month").addEventListener("click", async () => { state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1); state.selectedDate = `${monthKey()}-01`; await loadEntries(); });

window.addEventListener("load", async () => { try { await handleAuthRedirect(); if (!await getAuthenticatedUser()) { window.location.assign("index.html"); return; } await loadEntries(); } catch (error) { setStatus(error.message || "Could not load your food log."); } });
