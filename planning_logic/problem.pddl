(define (problem solve_workout)
  (:domain workout_planner)

(:objects 
bench_press squat treadmill_run shoulder_press leg_press chest_press - exercise
chest back legs shoulders - muscle_group
dumbbells barbell bench treadmill kettlebells cycle - equipment
strength weightloss cardio endurance - goal
low medium high - intensity
)

(:init
(goal strength)
(has_equipment dumbbells)
(has_equipment bench)

(targets bench_press chest)
(targets squat legs)
(targets shoulder_press shoulders)

(requires bench_press bench)
(requires squat barbell)
)

(:goal(and(trained chest)
        ; (trained shoulders)
        ; (trained legs)
        )
    )
)
