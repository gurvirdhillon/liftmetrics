import express from "express";
import uuid from "uuid-random";
import path from "path";
import { Pool } from "pg";
import cors from "cors";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { Server } from "socket.io";
import http from "http";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { requireAuth, verifyAccessToken } from "./auth.js";
import { validateWorkout } from "./workout-validation.js";
import { generatePlan } from "./plan-generator.js";
import { findRestrictedExercises, validateImportedPlan } from "./plan-import.js";
import { buildTrainingInsights } from "./training-insights.js";
import { createCoachResponse } from "./ai-coach.js";
import { applyInjurySafety } from "./injury-safety.js";
import { comparePlanCompletion } from "./plan-completion.js";
import { calculateReadiness, validateWellnessCheckin } from "./wellness.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Render terminates TLS before forwarding requests to this service. Trust its
// proxy hop so rate limits are tracked per visitor rather than per proxy.
app.set("trust proxy", 1);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()).filter(Boolean) || true
  }
});

const port = Number(process.env.PORT || 8080);
const allowedOrigins = process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()).filter(Boolean) || [];
const auth0Origin = `https://${process.env.AUTH0_DOMAIN}`;

if (process.env.NODE_ENV === "production" && !allowedOrigins.length) {
  throw new Error("CORS_ORIGIN must be configured in production.");
}

app.disable("x-powered-by");
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.auth0.com"],
      connectSrc: ["'self'", auth0Origin],
      frameSrc: [auth0Origin],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'", "https:"],
      upgradeInsecureRequests: null
    }
  }
}));
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));
app.use(express.json({ limit: "100kb" }));
const apiRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 1_000, standardHeaders: "draft-8", legacyHeaders: false });
app.use(["/api", "/messages"], apiRateLimit);
const coachRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || undefined,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30_000),
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 5_000)
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string") throw new Error("Missing token");
    const payload = await verifyAccessToken(token);
    socket.data.userId = payload.sub;
    next();
  } catch { next(new Error("Unauthorized")); }
});

io.on("connection", (socket) => {

  socket.on("chat message", async (data) => {
    if (typeof data?.text !== "string" || !data.text.trim() || data.text.trim().length > 1000) {
      return;
    }
    try {
      const username = await pool.query("SELECT username FROM user_profiles WHERE user_id = $1", [socket.data.userId]);
      if (!username.rows[0]?.username) return;
      const result = await pool.query(
        "INSERT INTO messages (message_id, user_id, username, text) VALUES ($1, $2, $3, $4) RETURNING message_id AS id, username AS user, text, created_at AS time",
        [uuid(), socket.data.userId, username.rows[0].username, data.text.trim()]
      );
      io.emit("chat message", result.rows[0]);
    } catch (error) {
      console.error("Could not save chat message", error);
    }
  });
});

// Chat routes
app.get("/healthz", (req, res) => res.status(200).json({ status: "ok" }));
app.get("/readyz", async (req, res) => {
  try { await pool.query("SELECT 1"); res.status(200).json({ status: "ready" }); }
  catch { res.status(503).json({ status: "unavailable" }); }
});

app.use(["/api", "/messages"], requireAuth);

app.get("/messages", async (req, res) => {
  try {
    const result = await pool.query("SELECT message_id AS id, username AS user, text, created_at AS time FROM messages ORDER BY created_at DESC LIMIT 100");
    res.json(result.rows.reverse());
  } catch {
    res.status(503).json({ error: "Messages are not available yet. Run migration 005 first." });
  }
});


// Auth config
app.get("/auth-config", (req, res) => {
  res.json({
    domain: process.env.AUTH0_DOMAIN,
    clientId: process.env.AUTH0_CLIENT_ID,
    audience: process.env.AUTH0_AUDIENCE
  });
});

async function ensureUserProfile(userId) {
  await pool.query("INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING", [userId.trim()]);
}

async function requireTrainer(userId) {
  await ensureUserProfile(userId);
  const result = await pool.query("SELECT account_role FROM user_profiles WHERE user_id = $1", [userId.trim()]);
  if (result.rows[0]?.account_role !== "trainer") throw new Error("Trainer access is required.");
}

async function requireClientRelationship(trainerId, clientId) {
  const result = await pool.query("SELECT 1 FROM trainer_clients WHERE trainer_id = $1 AND client_id = $2", [trainerId.trim(), clientId]);
  if (!result.rowCount) throw new Error("That client is not connected to your trainer account.");
}

app.put("/api/account-role", async (req, res) => {
  const role = req.body?.role;
  if (!["client", "trainer"].includes(role)) return res.status(400).json({ error: "Choose client or trainer." });
  try {
    await ensureUserProfile(req.auth.userId);
    await pool.query("UPDATE user_profiles SET account_role = $1 WHERE user_id = $2", [role, req.auth.userId.trim()]);
    res.json({ role });
  } catch (error) { console.error("Account role error:", error); res.status(500).json({ error: "Could not update account role." }); }
});

app.get("/api/account-role", async (req, res) => {
  try { await ensureUserProfile(req.auth.userId); const result = await pool.query("SELECT account_role AS role FROM user_profiles WHERE user_id = $1", [req.auth.userId.trim()]); res.json(result.rows[0]); }
  catch (error) { res.status(500).json({ error: "Could not load account role." }); }
});

app.post("/api/trainer/invites", async (req, res) => {
  const userId = req.auth.userId;
  try {
    await requireTrainer(userId);
    const inviteCode = uuid().replace(/-/g, "").slice(0, 12).toUpperCase();
    await pool.query("INSERT INTO trainer_invites (invite_id, trainer_id, invite_code, expires_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '7 days')", [uuid(), userId.trim(), inviteCode]);
    res.status(201).json({ inviteCode });
  } catch (error) { console.error("Trainer invite error:", error); res.status(error.message === "Trainer access is required." ? 403 : 500).json({ error: error.message === "Trainer access is required." ? error.message : "Could not create trainer invite." }); }
});

app.post("/api/trainer/invites/accept", async (req, res) => {
  const inviteCode = String(req.body?.inviteCode || "").trim();
  if (!inviteCode) return res.status(400).json({ error: "An invite code is required." });
  const clientId = req.auth.userId;
  let client;
  try {
    client = await pool.connect(); await client.query("BEGIN");
    await client.query("INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING", [clientId.trim()]);
    const invite = await client.query("SELECT invite_id, trainer_id FROM trainer_invites WHERE invite_code = $1 AND accepted_at IS NULL AND expires_at > CURRENT_TIMESTAMP FOR UPDATE", [inviteCode]);
    if (!invite.rowCount) { await client.query("ROLLBACK"); return res.status(404).json({ error: "That trainer invite is invalid or has expired." }); }
    if (invite.rows[0].trainer_id === clientId.trim()) { await client.query("ROLLBACK"); return res.status(400).json({ error: "You cannot accept your own trainer invite." }); }
    await client.query("INSERT INTO trainer_clients (trainer_id, client_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [invite.rows[0].trainer_id, clientId.trim()]);
    await client.query("UPDATE trainer_invites SET accepted_at = CURRENT_TIMESTAMP WHERE invite_id = $1", [invite.rows[0].invite_id]);
    await client.query("COMMIT"); res.status(201).json({ connected: true });
  } catch (error) { if (client) await client.query("ROLLBACK"); console.error("Trainer invite acceptance error:", error); res.status(500).json({ error: "Could not accept trainer invite." }); } finally { client?.release(); }
});

app.get("/api/trainer/clients", async (req, res) => {
  const trainerId = req.auth.userId;
  try {
    await requireTrainer(trainerId);
    const result = await pool.query(`SELECT tc.client_id, up.username, COUNT(ws.session_id)::int AS workout_count, MAX(ws.session_date) AS last_workout_date FROM trainer_clients tc JOIN user_profiles up ON up.user_id = tc.client_id LEFT JOIN workout_sessions ws ON ws.user_id = tc.client_id WHERE tc.trainer_id = $1 GROUP BY tc.client_id, up.username ORDER BY last_workout_date DESC NULLS LAST`, [trainerId.trim()]);
    res.json({ clients: result.rows });
  } catch (error) { console.error("Trainer clients error:", error); res.status(error.message === "Trainer access is required." ? 403 : 500).json({ error: error.message === "Trainer access is required." ? error.message : "Could not load clients." }); }
});

app.get("/api/trainer/clients/:clientId", async (req, res) => {
  const trainerId = req.auth.userId; const clientId = req.params.clientId;
  try {
    await requireTrainer(trainerId); await requireClientRelationship(trainerId, clientId);
    const [client, workouts, notes] = await Promise.all([
      pool.query("SELECT up.username, COUNT(ws.session_id)::int AS workout_count, MAX(ws.session_date) AS last_workout_date FROM user_profiles up LEFT JOIN workout_sessions ws ON ws.user_id = up.user_id WHERE up.user_id = $1 GROUP BY up.username", [clientId]),
      pool.query("SELECT session_date, workout_type, duration_value, duration_unit, feeling_score FROM workout_sessions WHERE user_id = $1 ORDER BY session_date DESC LIMIT 10", [clientId]),
      pool.query("SELECT body, created_at FROM trainer_notes WHERE trainer_id = $1 AND client_id = $2 ORDER BY created_at DESC LIMIT 20", [trainerId.trim(), clientId])
    ]);
    res.json({ client: { client_id: clientId, ...client.rows[0] }, workouts: workouts.rows, notes: notes.rows });
  } catch (error) { console.error("Trainer client detail error:", error); res.status(error.message.includes("access") || error.message.includes("connected") ? 403 : 500).json({ error: error.message || "Could not load client." }); }
});

app.post("/api/trainer/clients/:clientId/notes", async (req, res) => {
  const body = String(req.body?.body || "").trim(); if (!body || body.length > 2000) return res.status(400).json({ error: "A note of up to 2,000 characters is required." });
  try { await requireTrainer(req.auth.userId); await requireClientRelationship(req.auth.userId, req.params.clientId); await pool.query("INSERT INTO trainer_notes (note_id, trainer_id, client_id, body) VALUES ($1, $2, $3, $4)", [uuid(), req.auth.userId.trim(), req.params.clientId, body]); res.status(201).json({ saved: true }); }
  catch (error) { console.error("Trainer note error:", error); res.status(403).json({ error: error.message || "Could not save note." }); }
});

app.post("/api/trainer/clients/:clientId/plans", async (req, res) => {
  try {
    await requireTrainer(req.auth.userId); await requireClientRelationship(req.auth.userId, req.params.clientId);
    const plan = validateImportedPlan(req.body?.plan); plan.source = "trainer-assigned"; plan.adaptation.note = "This plan was assigned by your trainer.";
    await pool.query("INSERT INTO generated_plans (user_id, goal, profile, plan) VALUES ($1, $2, $3, $4)", [req.params.clientId, "trainer-assigned", { assignedBy: req.auth.userId.trim() }, plan]);
    res.status(201).json({ assigned: true });
  } catch (error) { console.error("Trainer plan assignment error:", error); res.status(error.message.includes("required") || error.message.includes("connected") ? 403 : 400).json({ error: error.message || "Could not assign plan." }); }
});

app.get("/api/usernames", async (req, res) => {
  const userId = req.auth.userId;

  try {
    const result = await pool.query("SELECT username FROM user_profiles WHERE user_id = $1", [userId.trim()]);
    res.json({ username: result.rows[0]?.username || null });
  } catch (error) {
    console.error("Could not load username:", error);
    res.status(500).json({ error: "Could not load username." });
  }
});

app.put("/api/usernames", async (req, res) => {
  const { username } = req.body || {};
  const userId = req.auth.userId;

  const trimmedUsername = typeof username === "string" ? username.trim() : "";
  if (!/^[A-Za-z0-9_]{3,24}$/.test(trimmedUsername)) {
    return res.status(400).json({ error: "Use 3–24 letters, numbers, or underscores." });
  }

  try {
    await pool.query("INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING", [userId.trim()]);
    const result = await pool.query(
      "UPDATE user_profiles SET username = $1 WHERE user_id = $2 AND username IS NULL RETURNING username",
      [trimmedUsername, userId.trim()]
    );
    if (!result.rows.length) {
      return res.status(409).json({ error: "Your username has already been set and cannot be changed." });
    }
    res.json({ username: result.rows[0].username });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "That username is already taken." });
    }
    console.error("Could not save username:", error);
    res.status(500).json({ error: "Could not save username." });
  }
});

// Static files
app.use(express.static(path.join(__dirname, "../src")));

function formatWellnessCheckin(row) {
  if (!row) return null;
  return { ...row, readiness_score: calculateReadiness(row) };
}

app.get("/api/wellness/today", async (req, res) => {
  try {
    const result = await pool.query("SELECT TO_CHAR(checkin_date, 'YYYY-MM-DD') AS checkin_date, sleep_hours, sleep_quality, energy_score, soreness_score, stress_score, notes FROM daily_wellness_checkins WHERE user_id = $1 AND checkin_date = CURRENT_DATE", [req.auth.userId.trim()]);
    res.json({ checkin: formatWellnessCheckin(result.rows[0]) });
  } catch (error) { console.error("Wellness load error:", error); res.status(503).json({ error: "Wellness is not available yet. Run migration 008 first." }); }
});

app.put("/api/wellness/today", async (req, res) => {
  if (!validateWellnessCheckin(req.body)) return res.status(400).json({ error: "Enter sleep from 0–24 hours and choose each score." });
  const userId = req.auth.userId.trim();
  try {
    await ensureUserProfile(userId);
    const result = await pool.query(
      `INSERT INTO daily_wellness_checkins (user_id, checkin_date, sleep_hours, sleep_quality, energy_score, soreness_score, stress_score, notes)
       VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, checkin_date) DO UPDATE SET sleep_hours = EXCLUDED.sleep_hours, sleep_quality = EXCLUDED.sleep_quality, energy_score = EXCLUDED.energy_score, soreness_score = EXCLUDED.soreness_score, stress_score = EXCLUDED.stress_score, notes = EXCLUDED.notes, updated_at = CURRENT_TIMESTAMP
       RETURNING TO_CHAR(checkin_date, 'YYYY-MM-DD') AS checkin_date, sleep_hours, sleep_quality, energy_score, soreness_score, stress_score, notes`,
      [userId, Number(req.body.sleep_hours), Number(req.body.sleep_quality), Number(req.body.energy_score), Number(req.body.soreness_score), Number(req.body.stress_score), String(req.body.notes || "").trim() || null]
    );
    res.json({ checkin: formatWellnessCheckin(result.rows[0]) });
  } catch (error) { console.error("Wellness save error:", error); res.status(503).json({ error: "Could not save your check-in. Run migration 008 if it has not been applied." }); }
});

// Your existing workout route can stay here
app.post("/api/workouts", async (req, res) => {
  req.body = { ...req.body, user_id: req.auth.userId };
  const validationErrors = validateWorkout(req.body);
  if (validationErrors.length) {
    return res.status(400).json({ errors: validationErrors });
  }

  let client;

  try {
    client = await pool.connect();
    const {
      user_id,
      session_date,
      duration_value,
      duration_unit,
      workout_type,
      feeling_score,
      avg_bpm,
      max_bpm,
      water_intake_l,
      distance_value,
      distance_unit,
      calories_burned,
      avg_pace,
      exercises,
      plan_id: planId,
      plan_session_index: planSessionIndex
    } = req.body;

    await client.query("BEGIN");

    let plannedSession = null;
    let validPlanId = null;
    if (planId != null || planSessionIndex != null) {
      if (!Number.isInteger(planId) || !Number.isInteger(planSessionIndex) || planSessionIndex < 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "The selected plan session is invalid." });
      }
      const planResult = await client.query("SELECT plan FROM generated_plans WHERE plan_id = $1 AND user_id = $2", [planId, user_id.trim()]);
      plannedSession = planResult.rows[0]?.plan?.sessions?.[planSessionIndex] || null;
      if (!plannedSession) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "That plan session is no longer available." });
      }
      validPlanId = planId;
    }

    await client.query(
      `
      INSERT INTO user_profiles (
        user_id
      )
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
      `,
      [user_id]
    );

    const sessionResult = await client.query(
      `
      INSERT INTO workout_sessions (
        user_id,
        session_date,
        duration_value,
        duration_unit,
        workout_type,
        feeling_score,
        avg_bpm,
        max_bpm,
        water_intake_l,
        distance_value,
        distance_unit,
        calories_burned,
        avg_pace,
        plan_id,
        planned_session
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING session_id
      `,
      [
        user_id.trim(),
        session_date,
        duration_value,
        duration_unit || null,
        workout_type || null,
        feeling_score ?? null,
        avg_bpm ?? null,
        max_bpm ?? null,
        water_intake_l ?? null,
        distance_value ?? null,
        distance_unit || null,
        calories_burned ?? null,
        avg_pace ?? null,
        validPlanId,
        plannedSession
      ]
    );

    const sessionId = sessionResult.rows[0].session_id;

    if (Array.isArray(exercises)) {
      for (const exercise of exercises) {
        await client.query(
          `
          INSERT INTO exercise_entries (
            session_id,
            exercise_name,
            sets,
            reps,
            weight_value,
            weight_unit
          )
          VALUES ($1,$2,$3,$4,$5,$6)
          `,
          [
            sessionId,
            exercise.exercise_name || null,
            exercise.sets ?? null,
            exercise.reps ?? null,
            exercise.weight_value ?? null,
            exercise.weight_unit || null
          ]
        );
      }
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Workout saved successfully",
      session_id: sessionId,
      user_id: user_id,
      completion: plannedSession ? comparePlanCompletion(plannedSession, exercises) : null
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    console.error("Database error:", error);
    res.status(500).json({ error: "Could not save workout." });
  } finally {
    client?.release();
  }
});

app.get("/api/workouts", async (req, res) => {
  const { workout_type: workoutType, from, to } = req.query;
  const userId = req.auth.userId;
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 25, 1), 100);
  const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);

  const values = [userId.trim()];
  const filters = ["ws.user_id = $1"];
  if (typeof workoutType === "string" && workoutType.trim()) {
    values.push(workoutType.trim());
    filters.push(`ws.workout_type = $${values.length}`);
  }
  if (typeof from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    values.push(from);
    filters.push(`ws.session_date >= $${values.length}`);
  }
  if (typeof to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    values.push(to);
    filters.push(`ws.session_date <= $${values.length}`);
  }

  try {
    const result = await pool.query(
      `
      SELECT
        ws.session_id,
        TO_CHAR(ws.session_date, 'YYYY-MM-DD') AS session_date,
        ws.duration_value,
        ws.duration_unit,
        ws.workout_type,
        ws.feeling_score,
        ws.calories_burned,
        ws.distance_value,
        ws.distance_unit,
        ws.avg_pace,
        ws.avg_bpm,
        ws.max_bpm,
        ws.water_intake_l,
        COALESCE(
          json_agg(
            json_build_object(
              'entry_id', ee.entry_id,
              'exercise_name', ee.exercise_name,
              'sets', ee.sets,
              'reps', ee.reps,
              'weight_value', ee.weight_value,
              'weight_unit', ee.weight_unit
            )
          ) FILTER (WHERE ee.entry_id IS NOT NULL),
          '[]'::json
        ) AS exercises
      FROM (SELECT * FROM workout_sessions WHERE ${filters.map((filter) => filter.replace("ws.", "")).join(" AND ")} ORDER BY session_date DESC, created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}) ws
      LEFT JOIN exercise_entries ee ON ee.session_id = ws.session_id
      GROUP BY
        ws.session_id,
        ws.session_date,
        ws.duration_value,
        ws.duration_unit,
        ws.workout_type,
        ws.feeling_score,
        ws.calories_burned,
        ws.distance_value,
        ws.distance_unit,
        ws.avg_pace,
        ws.avg_bpm,
        ws.max_bpm,
        ws.water_intake_l,
        ws.created_at
      ORDER BY ws.session_date DESC, ws.created_at DESC
      `,
      [...values, limit, offset]
    );
    res.json({ workouts: result.rows, pagination: { limit, offset, hasMore: result.rows.length === limit } });
  } catch (error) {
    console.error("Workout history retrieval error:", error);
    res.status(500).json({ error: "Could not load workout history." });
  }
});

app.get("/api/insights", async (req, res) => {
  const userId = req.auth.userId;
  try {
    const result = await pool.query(`SELECT ws.session_id, TO_CHAR(ws.session_date, 'YYYY-MM-DD') AS session_date, ws.feeling_score,
      COALESCE(json_agg(json_build_object('exercise_name', ee.exercise_name, 'sets', ee.sets, 'reps', ee.reps, 'weight_value', ee.weight_value, 'weight_unit', ee.weight_unit)) FILTER (WHERE ee.entry_id IS NOT NULL), '[]'::json) AS exercises
      FROM (SELECT * FROM workout_sessions WHERE user_id = $1 ORDER BY session_date DESC, created_at DESC LIMIT 100) ws LEFT JOIN exercise_entries ee ON ee.session_id = ws.session_id
      GROUP BY ws.session_id, ws.session_date, ws.feeling_score, ws.created_at
      ORDER BY ws.session_date DESC, ws.created_at DESC`, [userId]);
    const injuryResult = await pool.query("SELECT affected_area, status, pain_score, restricted_movements, clinician_guidance FROM user_injury_restrictions WHERE user_id = $1", [userId.trim()]);
    res.json(applyInjurySafety(buildTrainingInsights(result.rows), injuryResult.rows[0]).insights);
  } catch (error) {
    console.error("Insights retrieval error:", error);
    res.status(500).json({ error: "Could not load your training insights." });
  }
});

app.post("/api/coach", coachRateLimit, async (req, res) => {
  const userId = req.auth.userId;
  try {
    const result = await pool.query(`SELECT ws.session_id, TO_CHAR(ws.session_date, 'YYYY-MM-DD') AS session_date, ws.feeling_score,
      COALESCE(json_agg(json_build_object('exercise_name', ee.exercise_name, 'sets', ee.sets, 'reps', ee.reps, 'weight_value', ee.weight_value, 'weight_unit', ee.weight_unit)) FILTER (WHERE ee.entry_id IS NOT NULL), '[]'::json) AS exercises
      FROM (SELECT * FROM workout_sessions WHERE user_id = $1 ORDER BY session_date DESC, created_at DESC LIMIT 100) ws LEFT JOIN exercise_entries ee ON ee.session_id = ws.session_id
      GROUP BY ws.session_id, ws.session_date, ws.feeling_score, ws.created_at
      ORDER BY ws.session_date DESC, ws.created_at DESC`, [userId]);
    const injuryResult = await pool.query("SELECT affected_area, status, pain_score, restricted_movements, clinician_guidance FROM user_injury_restrictions WHERE user_id = $1", [userId.trim()]);
    const { insights, safety } = applyInjurySafety(buildTrainingInsights(result.rows), injuryResult.rows[0]);
    const coach = await createCoachResponse(insights, safety);
    res.json({ coach });
  } catch (error) {
    console.error("AI coach error:", error.message);
    const status = error.message === "AI coaching is not configured." ? 503 : 502;
    res.status(status).json({ error: "LiftMetrics Coach is unavailable right now. Your regular training guidance is still available." });
  }
});

app.get("/api/injury-restrictions", async (req, res) => {
  const userId = req.auth.userId;
  try {
    const result = await pool.query("SELECT affected_area, status, pain_score, restricted_movements, clinician_guidance FROM user_injury_restrictions WHERE user_id = $1", [userId.trim()]);
    res.json({ injury: result.rows[0] || null });
  } catch (error) { res.status(503).json({ error: "Injury settings are not available yet. Run database migration 003 first." }); }
});

app.put("/api/injury-restrictions", async (req, res) => {
  const { affected_area: area, status, pain_score: painScore, restricted_movements: restrictedMovements, clinician_guidance: guidance } = req.body || {};
  const userId = req.auth.userId;
  if (!["Shoulder", "Back", "Knee", "Hip", "Wrist", "Other"].includes(area) || !["New pain", "Recovering", "Cleared by clinician"].includes(status) || !Number.isInteger(painScore) || painScore < 0 || painScore > 10 || typeof restrictedMovements !== "string" || restrictedMovements.length > 500 || (guidance != null && (typeof guidance !== "string" || guidance.length > 1000))) return res.status(400).json({ error: "Enter a valid injury area, status, pain score, and movements to avoid." });
  try {
    await pool.query("INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING", [userId.trim()]);
    await pool.query(`INSERT INTO user_injury_restrictions (user_id, affected_area, status, pain_score, restricted_movements, clinician_guidance) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (user_id) DO UPDATE SET affected_area = EXCLUDED.affected_area, status = EXCLUDED.status, pain_score = EXCLUDED.pain_score, restricted_movements = EXCLUDED.restricted_movements, clinician_guidance = EXCLUDED.clinician_guidance, updated_at = CURRENT_TIMESTAMP`, [userId.trim(), area, status, painScore, restrictedMovements.trim(), guidance?.trim() || null]);
    res.json({ message: "Injury restrictions saved." });
  } catch (error) { res.status(503).json({ error: "Injury settings are not available yet. Run database migration 003 first." }); }
});

app.delete("/api/injury-restrictions", async (req, res) => {
  const userId = req.auth.userId;
  try {
    await pool.query("DELETE FROM user_injury_restrictions WHERE user_id = $1", [userId.trim()]);
    res.status(204).end();
  } catch (error) { res.status(503).json({ error: "Injury settings are not available yet. Run database migration 003 first." }); }
});

app.patch("/api/workouts/:sessionId", async (req, res) => {
  const sessionId = Number(req.params.sessionId);
  const { session_date: sessionDate, duration_value: durationValue, duration_unit: durationUnit, workout_type: workoutType, feeling_score: feelingScore } = req.body;
  const userId = req.auth.userId;
  if (!Number.isInteger(sessionId) || sessionId <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate || "") || !Number.isFinite(durationValue) || durationValue <= 0 || typeof durationUnit !== "string" || !durationUnit.trim() || typeof workoutType !== "string" || !workoutType.trim() || !Number.isFinite(feelingScore) || feelingScore < 0 || feelingScore > 10) {
    return res.status(400).json({ error: "Enter a valid date, duration, workout type, and feeling score." });
  }

  try {
    const result = await pool.query(
      "UPDATE workout_sessions SET session_date = $1, duration_value = $2, duration_unit = $3, workout_type = $4, feeling_score = $5 WHERE session_id = $6 AND user_id = $7 RETURNING session_id",
      [sessionDate, durationValue, durationUnit.trim(), workoutType.trim(), feelingScore, sessionId, userId.trim()]
    );
    if (!result.rowCount) return res.status(404).json({ error: "Workout not found." });
    res.json({ message: "Workout updated." });
  } catch (error) {
    console.error("Workout update error:", error);
    res.status(500).json({ error: "Could not update workout." });
  }
});

app.delete("/api/workouts/:sessionId", async (req, res) => {
  const sessionId = Number(req.params.sessionId);
  const userId = req.auth.userId;
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ error: "A valid workout and user ID are required." });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const session = await client.query("SELECT session_id FROM workout_sessions WHERE session_id = $1 AND user_id = $2 FOR UPDATE", [sessionId, userId.trim()]);
    if (!session.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Workout not found." });
    }
    await client.query("DELETE FROM exercise_entries WHERE session_id = $1", [sessionId]);
    await client.query("DELETE FROM workout_sessions WHERE session_id = $1", [sessionId]);
    await client.query("COMMIT");
    res.status(204).end();
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    console.error("Workout deletion error:", error);
    res.status(500).json({ error: "Could not delete workout." });
  } finally {
    client?.release();
  }
});

app.post("/api/plans/generate", async (req, res) => {
  const { profile } = req.body;
  const user_id = req.auth.userId;
  const validProfile = profile && ["strength", "weight-loss", "stamina", "wellbeing"].includes(profile.goal) && Array.isArray(profile.days) && profile.days.length && ["30", "45", "60"].includes(profile.timespent) && ["gym", "home", "both"].includes(profile.equipment) && ["beginner", "intermediate", "advanced"].includes(profile.fitness_level);
  if (!validProfile) {
    return res.status(400).json({ error: "Complete your profile with a valid authenticated user before generating a plan." });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query("INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING", [user_id.trim()]);
    const recentEffort = await client.query("SELECT feeling_score FROM workout_sessions WHERE user_id = $1 ORDER BY session_date DESC, created_at DESC LIMIT 3", [user_id.trim()]);
    const efforts = recentEffort.rows.map((row) => Number(row.feeling_score)).filter(Number.isFinite);
    const plan = generatePlan(profile, { reduceVolume: efforts.length >= 2 && efforts.reduce((sum, score) => sum + score, 0) / efforts.length >= 8 });
    const result = await client.query(
      "INSERT INTO generated_plans (user_id, goal, profile, plan) VALUES ($1, $2, $3, $4) RETURNING plan_id, created_at",
      [user_id.trim(), profile.goal, profile, plan]
    );
    await client.query("COMMIT");
    res.status(201).json({ ...result.rows[0], plan });
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    console.error("Plan generation error:", error);
    res.status(500).json({ error: "Could not generate your plan." });
  } finally {
    client?.release();
  }
});

app.post("/api/plans/import", async (req, res) => {
  const userId = req.auth.userId;
  let plan;
  try {
    plan = validateImportedPlan(req.body?.plan);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query("INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING", [userId.trim()]);
    const restrictions = await client.query("SELECT restricted_movements FROM user_injury_restrictions WHERE user_id = $1", [userId.trim()]);
    const restrictedExercises = findRestrictedExercises(plan, restrictions.rows[0]?.restricted_movements);
    if (restrictedExercises.length) {
      plan.safety = { restrictedExercises, note: "Some imported exercises match movements in your saved injury restrictions. Check with a qualified professional before performing them." };
    }
    const result = await client.query(
      "INSERT INTO generated_plans (user_id, goal, profile, plan) VALUES ($1, $2, $3, $4) RETURNING plan_id, created_at",
      [userId.trim(), "imported", { source: "uploaded" }, plan]
    );
    await client.query("COMMIT");
    res.status(201).json({ ...result.rows[0], plan });
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    console.error("Plan import error:", error);
    res.status(500).json({ error: "Could not save your imported plan." });
  } finally {
    client?.release();
  }
});

app.get("/api/plans/latest", async (req, res) => {
  const userId = req.auth.userId;
  try {
    const result = await pool.query("SELECT plan_id, created_at, plan FROM generated_plans WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1", [userId.trim()]);
    if (!result.rowCount) return res.status(404).json({ error: "No saved plan found." });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Plan retrieval error:", error);
    if (error.code === "42P01") {
      return res.status(503).json({ error: "Plan storage is not set up yet. Run the generated-plans database migration first." });
    }
    res.status(500).json({ error: "Could not load your plan." });
  }
});

app.get("/api/plans/history", async (req, res) => {
  try {
    const result = await pool.query("SELECT plan_id, goal, plan->>'title' AS title, created_at FROM generated_plans WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20", [req.auth.userId.trim()]);
    res.json({ plans: result.rows });
  } catch (error) { console.error("Plan history error:", error); res.status(500).json({ error: "Could not load plan history." }); }
});

app.post("/api/plans/:planId/restore", async (req, res) => {
  const planId = Number(req.params.planId);
  if (!Number.isInteger(planId)) return res.status(400).json({ error: "A valid plan is required." });
  try {
    const saved = await pool.query("SELECT goal, profile, plan FROM generated_plans WHERE plan_id = $1 AND user_id = $2", [planId, req.auth.userId.trim()]);
    if (!saved.rowCount) return res.status(404).json({ error: "Plan not found." });
    const result = await pool.query("INSERT INTO generated_plans (user_id, goal, profile, plan) VALUES ($1, $2, $3, $4) RETURNING plan_id, plan", [req.auth.userId.trim(), saved.rows[0].goal, saved.rows[0].profile, saved.rows[0].plan]);
    res.status(201).json(result.rows[0]);
  } catch (error) { console.error("Plan restore error:", error); res.status(500).json({ error: "Could not restore plan." }); }
});

// IMPORTANT
server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received; shutting down.`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
