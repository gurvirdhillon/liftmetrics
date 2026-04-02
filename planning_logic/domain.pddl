(define (domain workout_planner)
  (:requirements :typing)

  (:types
    exercise
    muscle_group
    equipment
    goal
    intensity
  )

  (:predicates
    (targets ?e - exercise ?m - muscle_group)
    (has_equipment ?eq - equipment)
    (requires ?e - exercise ?eq - equipment)
    (goal ?g - goal)
    (sore-muscle ?m - muscle_group)
    (trained-recently ?m - muscle_group)
    (done ?e - exercise)
    (trained ?m - muscle_group)
  )
(:action do-exercise
  :parameters (?e - exercise ?m - muscle_group ?eq - equipment)
  :precondition (and
    (targets ?e ?m)
    (requires ?e ?eq)
    (has_equipment ?eq)
    (not (done ?e))
    (not (sore-muscle ?m))
    (not (trained-recently ?m))
  )
  :effect (and
    (done ?e)
    (trained ?m)
  )
)

)