import { authenticatedFetch, getAuthenticatedUser } from "./auth.js";

let reviewedPlan = null;
const textInput = document.getElementById("plan-text");
const titleInput = document.getElementById("import-title");
const status = document.getElementById("import-status");
const preview = document.getElementById("import-preview");
const saveButton = document.getElementById("save-plan-btn");

function parseLine(line) {
  const values = line.split("|").map((value) => value.trim());
  if (values.length < 4) throw new Error("Each line needs Day, Session, Exercise, and Sets/reps, separated by |.");
  return { day: values[0], name: values[1], exercise: { name: values[2], prescription: values[3], rest: values[4] || "Not specified" } };
}

function parsePlan(title, text) {
  if (!title.trim()) throw new Error("Enter a plan name.");
  const rows = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map(parseLine);
  if (!rows.length) throw new Error("Add at least one exercise.");
  const sessions = [];
  for (const row of rows) {
    let session = sessions.find((item) => item.day === row.day && item.name === row.name);
    if (!session) { session = { day: row.day, name: row.name, exercises: [] }; sessions.push(session); }
    session.exercises.push(row.exercise);
  }
  return { title: title.trim(), sessions };
}

function parseCsvRow(line) {
  const cells = [];
  let value = ""; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { cells.push(value.trim()); value = ""; }
    else value += character;
  }
  cells.push(value.trim());
  return cells;
}

function renderPreview(plan) {
  preview.replaceChildren(...plan.sessions.map((session) => {
    const card = document.createElement("section"); card.className = "plan-card";
    const heading = document.createElement("h2"); heading.textContent = `${session.day} · ${session.name}`;
    const list = document.createElement("ul");
    session.exercises.forEach((exercise) => { const item = document.createElement("li"); item.textContent = `${exercise.name} — ${exercise.prescription} (${exercise.rest})`; list.appendChild(item); });
    card.append(heading, list); return card;
  }));
}

document.getElementById("preview-plan-btn").addEventListener("click", () => {
  try { reviewedPlan = parsePlan(titleInput.value, textInput.value); renderPreview(reviewedPlan); saveButton.disabled = false; status.textContent = "Review the sessions below, then save when they look right."; }
  catch (error) { reviewedPlan = null; saveButton.disabled = true; status.textContent = error.message; preview.replaceChildren(); }
});

document.getElementById("plan-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const lines = (await file.text()).split(/\r?\n/).filter(Boolean);
  const header = parseCsvRow(lines.shift()).map((value) => value.toLowerCase());
  const required = ["day", "session", "exercise", "prescription"];
  if (!required.every((name) => header.includes(name))) { status.textContent = "CSV needs headers: day, session, exercise, prescription, rest."; return; }
  textInput.value = lines.map((line) => { const cells = parseCsvRow(line); return ["day", "session", "exercise", "prescription", "rest"].map((name) => cells[header.indexOf(name)] || "").join(" | "); }).join("\n");
  status.textContent = "CSV loaded. Preview it before saving.";
});

[titleInput, textInput].forEach((input) => input.addEventListener("input", () => {
  reviewedPlan = null;
  saveButton.disabled = true;
  preview.replaceChildren();
}));

document.getElementById("import-plan-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!reviewedPlan) return;
  try {
    const user = await getAuthenticatedUser(); if (!user?.sub) throw new Error("Please log in before saving a plan.");
    const response = await authenticatedFetch("/api/plans/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: reviewedPlan }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not save your plan.");
    sessionStorage.setItem("liftmetrics_current_plan", JSON.stringify(data.plan)); window.location.href = "plan.html";
  } catch (error) { status.textContent = error.message; }
});
