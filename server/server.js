import express from "express";
import uuid from "uuid-random";
import path from "path";
import { Pool } from "pg";
import cors from "cors";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { Server } from "socket.io";
import http from "http";

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
    const newMessage = {
      id: uuid(),
      user: data.user || "User",
      text: data.text || "",
      time: new Date().toISOString()
    };

    if (!newMessage.text.trim()) {
      return;
    }

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
  const newMessage = {
    id: uuid(),
    user: req.body.user || "User",
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

// Static files
app.use(express.static(path.join(__dirname, "../src")));

// Your existing workout route can stay here
app.post("/api/workouts", async (req, res) => {
  const client = await pool.connect();

  try {
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
      exercises
    } = req.body;

    await client.query("BEGIN");

    await client.query(
      `
      INSERT INTO user_profiles (
        user_id,
        age,
        gender,
        height_m,
        weight_kg,
        experience_level,
        workout_frequency_days_week,
        fat_percentage
      )
      VALUES ($1, 25, 'Unknown', 1.70, 70.00, 'Beginner', 3, NULL)
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
        water_intake_l
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING session_id
      `,
      [
        user_id,
        session_date,
        duration_value || null,
        duration_unit || null,
        workout_type || null,
        feeling_score || null,
        avg_bpm || null,
        max_bpm || null,
        water_intake_l || null
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
            exercise.sets || null,
            exercise.reps || null,
            exercise.weight_value || null,
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
    await client.query("ROLLBACK");
    console.error("Database error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// IMPORTANT
server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});