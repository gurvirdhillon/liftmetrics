import express from "express";
import path from "path";
import { Pool } from "pg";
import cors from "cors";
import { fileURLToPath } from "url";
import authConfig from './auth-config.js'
import dotenv from "dotenv"

dotenv.config();

const app = express();
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
  password: process.env.DB_PASSWORD || undefined,
});

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
      exercises,
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
        water_intake_l || null,
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
            exercise.weight_unit || null,
          ]
        );
      }
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Workout saved successfully",
      session_id: sessionId,
      user_id: user_id,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Database error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});


app.get('/auth-config', (req, res) => {
  res.json({
    domain: process.env.AUTH0_DOMAIN,
    clientId: process.env.AUTH0_CLIENT_ID
  })
})

app.use(express.static(path.join(__dirname, "../src")));

app.listen(port, () => {
  console.log(`server is running at http://localhost:${port}`);
});