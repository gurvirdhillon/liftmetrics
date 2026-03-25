function limitDate() {
    const today = new Date().toISOString().split("T")[0];
    document.querySelector("#DateInput").setAttribute("max", today)
}

// limits the date to either today or before today^

const form = document.querySelector("#workoutForm")

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
        user_id: 1,
        session_date: document.getElementById("DateInput").value,
        duration_value: document.querySelector('input[name="session_duration_hr"]').value,
        duration_unit: document.querySelector('select[name="duration_metric"]').value,
        workout_type: document.querySelector('select[name="workout_type"]').value,
        feeling_score: document.getElementById("feelingRange").value,
        avg_bpm: document.querySelector('input[name="avg_bpm"]').value || null,
        max_bpm: document.querySelector('input[name="max_bpm"]').value || null,
        water_intake_l: document.querySelector('input[name="water_intake"]').value || null,
        exercises: [
          {
            exercise_name: document.querySelector('select[name="exercise"]').value,
            sets: document.querySelector('input[name="sets"]').value || null,
            reps: document.querySelector('input[name="reps"]').value || null,
            weight_value: document.querySelector('input[name="weight"]').value || null,
            weight_unit: document.querySelector('select[name="weight_metric"]').value || null
          }
        ]
      };
    
      try {
        const response = await fetch("http://localhost:8080/api/workouts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
    
        const data = await response.json();
    
        if (response.ok) {
          alert("Workout saved successfully");
          console.log(data);
          form.reset();
        } else {
          alert(data.error || "Failed to save workout");
          console.error(data);
        }
      } catch (error) {
        console.error("Error submitting workout:", error);
        alert("Server error. Could not save workout.");
      }
})

function allFunctions() {
    limitDate()
}

window.addEventListener('load', allFunctions)

