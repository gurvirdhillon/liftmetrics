const express = require("express")
const path = require("path")
const { Pool } = require("pg")
const cors = require("cors")

require("dotenv").config()

const app = express()
const port = 8080

app.use(cors())
app.use(express.json())

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || undefined,
})

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
          duration_value,
          duration_unit,
          workout_type,
          feeling_score,
          avg_bpm,
          max_bpm,
          water_intake_l,
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
              exercise.exercise_name,
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
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(error);
      res.status(500).json({ error: "Failed to save workout" });
    } finally {
      client.release();
    }
  });

app.use(express.static(path.join(__dirname, "../src")))
app.listen(port, () => {
    console.log(`server is running at http://localhost:${port}`)
})

