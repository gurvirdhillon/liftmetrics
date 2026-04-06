# This will be used to track any decisions made along the way



## "How did you feel?"

This is an important metric when it comes to either going up in weight, going down or whether it should be a rest day. This has been included and will play a key metric(hopefully) in the ML recommendations.


## Weight Metric

This was a difficult metric to track and as a small percentage of nulls were present out of 1200, only 63 had null values the decision was made to drop the rows with NA values. 
[Decision made @ 18/03/2026 14:32]

[ ] KEY NOTE - However, this will be revisited in later sections and may be predicted using age, height, gender and the experience level of the individual. [Decision overruled]
Now I have used scikit learn linear regression algorithm to determine the individuals height and their age to determine what their weight will be.



## Database choice

Chose to use postgreSQL to store the data.

presuming the user is in the fitness_track_project folder:

```md
psql -d liftmetrics -f SQL/schema.sql; 
```

this created the schema.


Once data has been entered it will then go straight into the postgreSQL server and the command:
```
psql liftmetrics
```
will help to monitor what is in the database file. From there you can see either "workout_session" details or "exercise_session" details.


## Calories Burned

This metric was kept in as this can be useful later just in case the transition to a weight loss workouts will become a feature in the application.


## Fitness levels - Streamlit page

So according to my research, for maximum strength training Epley Formula which was originally used for evaluating the strength performance of athletes. Which is measured by:

```
1RM = WEIGHT x (1 + REPS / 30)
```

## Domain solving problem

During my Artificial Intelligence masters I learnt about domain problem solving and the power it had to solve complex issues and how it can apply to real world scenarios. 
Today I decided to utilised context given decisions to identify how a user can train given the data provided. For example, what muscle groups were trained before, how tired
is the individual and other factors that may be taken into account before creating a routine such as their goals(are they training to lose weight, competition, to gain muscle,
for health benefits etc).

To test out the running of the code:

```terminal
./run.sh
```

How did i do this?
brew install cmake
build the python document via
```terminal
./build.py
```

After downloading the fast downward installations that can be found on the website. I had then used nano:

```terminal
nano run.sh
```

This will open up a terminal in which this should be pasted

```nano
#!/bin/bash
./downward/fast-downward.py planning_logic/domain.pddl planning_logic/problem.pddl
```

Which should then be saved and entered making a shorthand of "./run.sh"

Alternatively, the following can be used directly if at the root of the folder.

```terminal
./downward/fast-downward.py planning_logic/domain.pddl planning_logic/problem.pddl
```

### Planning/Profile page integration

When designing the profile page there was an element of difficulty to make the page look engaging without it seeming like another online form. Also once the profile is complete the option would seem a bit repetitive to have the goals, profile of the customer show up with no real reason. So I had two choices, either to integrate the two systems together with room for reapplying goals and editing the profiles or the second which was to separate the two applications as HTML pages. 

Due to the reliance of the profile system to use the planner, I had chosen to integrate both the planning and profile page.
