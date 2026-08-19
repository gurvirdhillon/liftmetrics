import express from "express";
import uuid from "uuid-random";
import path from "path";
import { Pool } from "pg";
import cors from "cors";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { Server } from "socket.io";
import http from "http";
import { validateWorkout } from "./workout-validation.js";
import { generatePlan } from "./plan-generator.js";
import { buildTrainingInsights } from "./training-insights.js";
import { createCoachResponse } from "./ai-coach.js";
import { applyInjurySafety } from "./injury-safety.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const port = 8080;

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || undefined
});

// In-memory chat storage for now
// Later you can move this to PostgreSQL
let messages = [];

// Socket.IO
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("chat message", (data) => {
    if (typeof data.user !== "string" || !data.user.trim() || typeof data.text !== "string" || !data.text.trim()) {
      return;
    }

    const newMessage = {
      id: uuid(),
      user: data.user.trim(),
      text: data.text.trim(),
      time: new Date().toISOString()
    };

    messages.push(newMessage);

    // optional: keep only latest 100
    if (messages.length > 100) {
      messages = messages.slice(-100);
    }

    io.emit("chat message", newMessage);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Chat routes
app.get("/messages", (req, res) => {
  res.json(messages);
});

app.get("/messages/:id", (req, res) => {
  const foundMessage = messages.find((msg) => msg.id === req.params.id);

  if (!foundMessage) {
    return res.status(404).send("No match for id");
  }

  res.json(foundMessage);
});

app.post("/messages", (req, res) => {
  if (typeof req.body.user !== "string" || !req.body.user.trim()) {
    return res.status(401).json({ error: "An authenticated display name is required" });
  }

  const newMessage = {
    id: uuid(),
    user: req.body.user.trim(),
    text: req.body.text || "",
    time: new Date().toISOString()
  };

  if (!newMessage.text.trim()) {
    return res.status(400).json({ error: "Message text is required" });
  }

  messages.push(newMessage);

  if (messages.length > 100) {
    messages = messages.slice(-100);
  }

  io.emit("chat message", newMessage);
  res.status(201).json(newMessage);
});

// Auth config
app.get("/auth-config", (req, res) => {
  res.json({
    domain: process.env.AUTH0_DOMAIN,
    clientId: process.env.AUTH0_CLIENT_ID
  });
});

app.get("/api/usernames", async (req, res) => {
  const userId = req.query.user_id;
  if (typeof userId !== "string" || !userId.trim() || userId.length > 100) {
    return res.status(400).json({ error: "A valid user is required." });
  }

  try {
    const result = await pool.query("SELECT username FROM user_profiles WHERE user_id = $1", [userId.trim()]);
    res.json({ username: result.rows[0]?.username || null });
  } catch (error) {
    console.error("Could not load username:", error);
    res.status(500).json({ error: "Could not load username." });
  }
});

app.put("/api/usernames", async (req, res) => {
  const { user_id: userId, username } = req.body || {};
  if (typeof userId !== "string" || !userId.trim() || userId.length > 100) {
    return res.status(400).json({ error: "A valid user is required." });
  }

  const trimmedUsername = typeof username === "string" ? username.trim() : "";
  if (!/^[A-Za-z0-9_]{3,24}$/.test(trimmedUsername)) {
    return res.status(400).json({ error: "Use 3–24 letters, numbers, or underscores." });
  }

  try {
    await pool.query("INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING", [userId.trim()]);
    const result = await pool.query("UPDATE user_profiles SET username = $1 WHERE user_id = $2 RETURNING username", [trimmedUsername, userId.trim()]);
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

// Your existing workout route can stay here
app.post("/api/workouts", async (req, res) => {
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
      exercises
    } = req.body;

    await client.query("BEGIN");

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
        avg_pace
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
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
        avg_pace ?? null
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
      user_id: user_id
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    console.error("Database error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client?.release();
  }
});

app.get("/api/workouts", async (req, res) => {
  const { user_id: userId, workout_type: workoutType, from, to } = req.query;
  if (typeof userId !== "string" || !userId.trim() || userId.length > 100) {
    return res.status(400).json({ error: "A valid authenticated user ID is required." });
  }

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
      FROM workout_sessions ws
      LEFT JOIN exercise_entries ee ON ee.session_id = ws.session_id
      WHERE ${filters.join(" AND ")}
      GROUP BY ws.session_id
      ORDER BY ws.session_date DESC, ws.created_at DESC
      `,
      values
    );
    res.json({ workouts: result.rows });
  } catch (error) {
    console.error("Workout history retrieval error:", error);
    res.status(500).json({ error: "Could not load workout history." });
  }
});

app.get("/api/insights", async (req, res) => {
  const userId = req.query.user_id;
  if (typeof userId !== "string" || !userId.trim() || userId.length > 100) return res.status(400).json({ error: "A valid authenticated user ID is required." });
  try {
    const result = await pool.query(`SELECT ws.session_id, TO_CHAR(ws.session_date, 'YYYY-MM-DD') AS session_date, ws.feeling_score,
      COALESCE(json_agg(json_build_object('exercise_name', ee.exercise_name, 'sets', ee.sets, 'reps', ee.reps, 'weight_value', ee.weight_value, 'weight_unit', ee.weight_unit)) FILTER (WHERE ee.entry_id IS NOT NULL), '[]'::json) AS exercises
      FROM workout_sessions ws LEFT JOIN exercise_entries ee ON ee.session_id = ws.session_id
      WHERE ws.user_id = $1 GROUP BY ws.session_id ORDER BY ws.session_date DESC, ws.created_at DESC`, [userId.trim()]);
    const injuryResult = await pool.query("SELECT affected_area, status, pain_score, restricted_movements, clinician_guidance FROM user_injury_restrictions WHERE user_id = $1", [userId.trim()]);
    res.json(applyInjurySafety(buildTrainingInsights(result.rows), injuryResult.rows[0]).insights);
  } catch (error) {
    console.error("Insights retrieval error:", error);
    res.status(500).json({ error: "Could not load your training insights." });
  }
});

app.post("/api/coach", async (req, res) => {
  const userId = req.body?.user_id;
  if (typeof userId !== "string" || !userId.trim() || userId.length > 100) return res.status(400).json({ error: "A valid authenticated user ID is required." });
  try {
    const result = await pool.query(`SELECT ws.session_id, TO_CHAR(ws.session_date, 'YYYY-MM-DD') AS session_date, ws.feeling_score,
      COALESCE(json_agg(json_build_object('exercise_name', ee.exercise_name, 'sets', ee.sets, 'reps', ee.reps, 'weight_value', ee.weight_value, 'weight_unit', ee.weight_unit)) FILTER (WHERE ee.entry_id IS NOT NULL), '[]'::json) AS exercises
      FROM workout_sessions ws LEFT JOIN exercise_entries ee ON ee.session_id = ws.session_id
      WHERE ws.user_id = $1 GROUP BY ws.session_id ORDER BY ws.session_date DESC, ws.created_at DESC`, [userId.trim()]);
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
  const userId = req.query.user_id;
  if (typeof userId !== "string" || !userId.trim() || userId.length > 100) return res.status(400).json({ error: "A valid authenticated user ID is required." });
  try {
    const result = await pool.query("SELECT affected_area, status, pain_score, restricted_movements, clinician_guidance FROM user_injury_restrictions WHERE user_id = $1", [userId.trim()]);
    res.json({ injury: result.rows[0] || null });
  } catch (error) { res.status(503).json({ error: "Injury settings are not available yet. Run database migration 003 first." }); }
});

app.put("/api/injury-restrictions", async (req, res) => {
  const { user_id: userId, affected_area: area, status, pain_score: painScore, restricted_movements: restrictedMovements, clinician_guidance: guidance } = req.body || {};
  if (typeof userId !== "string" || !userId.trim() || !["Shoulder", "Back", "Knee", "Hip", "Wrist", "Other"].includes(area) || !["New pain", "Recovering", "Cleared by clinician"].includes(status) || !Number.isInteger(painScore) || painScore < 0 || painScore > 10 || typeof restrictedMovements !== "string" || restrictedMovements.length > 500 || (guidance != null && (typeof guidance !== "string" || guidance.length > 1000))) return res.status(400).json({ error: "Enter a valid injury area, status, pain score, and movements to avoid." });
  try {
    await pool.query("INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING", [userId.trim()]);
    await pool.query(`INSERT INTO user_injury_restrictions (user_id, affected_area, status, pain_score, restricted_movements, clinician_guidance) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (user_id) DO UPDATE SET affected_area = EXCLUDED.affected_area, status = EXCLUDED.status, pain_score = EXCLUDED.pain_score, restricted_movements = EXCLUDED.restricted_movements, clinician_guidance = EXCLUDED.clinician_guidance, updated_at = CURRENT_TIMESTAMP`, [userId.trim(), area, status, painScore, restrictedMovements.trim(), guidance?.trim() || null]);
    res.json({ message: "Injury restrictions saved." });
  } catch (error) { res.status(503).json({ error: "Injury settings are not available yet. Run database migration 003 first." }); }
});

app.delete("/api/injury-restrictions", async (req, res) => {
  const userId = req.query.user_id;
  if (typeof userId !== "string" || !userId.trim()) return res.status(400).json({ error: "A valid authenticated user ID is required." });
  try {
    await pool.query("DELETE FROM user_injury_restrictions WHERE user_id = $1", [userId.trim()]);
    res.status(204).end();
  } catch (error) { res.status(503).json({ error: "Injury settings are not available yet. Run database migration 003 first." }); }
});

app.patch("/api/workouts/:sessionId", async (req, res) => {
  const sessionId = Number(req.params.sessionId);
  const { user_id: userId, session_date: sessionDate, duration_value: durationValue, duration_unit: durationUnit, workout_type: workoutType, feeling_score: feelingScore } = req.body;
  if (!Number.isInteger(sessionId) || sessionId <= 0 || typeof userId !== "string" || !userId.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate || "") || !Number.isFinite(durationValue) || durationValue <= 0 || typeof durationUnit !== "string" || !durationUnit.trim() || typeof workoutType !== "string" || !workoutType.trim() || !Number.isFinite(feelingScore) || feelingScore < 0 || feelingScore > 10) {
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
  const userId = req.query.user_id;
  if (!Number.isInteger(sessionId) || sessionId <= 0 || typeof userId !== "string" || !userId.trim()) {
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
  const { user_id, profile } = req.body;
  const validProfile = profile && ["strength", "weight-loss", "stamina", "wellbeing"].includes(profile.goal) && Array.isArray(profile.days) && profile.days.length && ["30", "45", "60"].includes(profile.timespent) && ["gym", "home", "both"].includes(profile.equipment) && ["beginner", "intermediate", "advanced"].includes(profile.fitness_level);
  if (typeof user_id !== "string" || !user_id.trim() || user_id.length > 100 || !validProfile) {
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

app.get("/api/plans/latest", async (req, res) => {
  const userId = req.query.user_id;
  if (typeof userId !== "string" || !userId.trim()) return res.status(400).json({ error: "A user ID is required." });
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

// IMPORTANT
server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
