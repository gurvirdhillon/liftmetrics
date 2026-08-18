# LiftMetrics

Track your performance. Build your strength.

# Overview

This application is data driven, inspired by the idea of turning your gym data into something meaningful, something useful. Something in which you can track your progress overtime and be apart of a wider community. This helps to identify areas of improvement, when to de-load weight and to also know when an increase is the right thing to do according to the difficulty level.


## Table of content

- <a href="#overview">Overview</a>
- <a href="#features">Features</a>
- <a href="">Tech stack</a>
- <a href="#installation-instructions">Installation Instructions</a>
- <a href="">Data model</a>
- <a href="">Usage</a>
- <a href="">Testing</a>
- <a href="#license">License</a>
- <a href="#contact">Contact</a>


## Features

<table>
  <tr>
    <th>Feature</th>
    <th>Description</th>
    <th>Usage</th>
    <th>Technology used</th>
  </tr>
  <tr>
    <td>Auth0</td>
    <td>Used to authenticate the user instead of requiring a login page and handling the data via another database page etc... This uses a token instead to ensure that the person is a genuine user.</td>
    <td>Planned to be used to uniquely identify the user as well as maybe future integration on sending promotional content? - needs more research</td>
    <td>Auth0 authentication API integration</td>
  </tr>
  <tr>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
</table>

## Installation Instructions

Required technologies

- [ ] NodeJS
- [ ] NPM
- [ ] Python3
- [ ] pip
- [ ] PostgreSQL
- [ ] ExpressJS
- [ ] Git

```
git clone https://github.com/gurvirdhillon/fitness-tracker.git
```

```
cd fitness-tracker
```

```
npm install
```

```
pip install -r requirements.txt
```

```
npm start
```

To use the private Streamlit insights dashboard, copy `.streamlit/secrets.toml.example` to `.streamlit/secrets.toml`, then set the Auth0 client values and a strong `cookie_secret`. In Auth0, add `http://localhost:8501/oauth2callback` as an Allowed Callback URL. The dashboard uses the authenticated Auth0 `sub` to query only that user's PostgreSQL records.

If you already created the PostgreSQL schema before updating this project, apply the database migrations once:

```
psql "$DATABASE_URL" -f SQL/migrations/001_add_cardio_workout_fields.sql
psql "$DATABASE_URL" -f SQL/migrations/002_create_generated_plans.sql
psql "$DATABASE_URL" -f SQL/migrations/003_create_injury_restrictions.sql
```


## Usage



## Testing


## License

This project is licensed under the MIT License.


## Contact

- GitHub: <a href="https://github.com/gurvirdhillon" target="_blank">Gurvir Dhillon GitHub</a>
- LinkedIn: <a href="https://www.linkedin.com/in/gurvirdhillon1/" target="_blank">Gurvir Dhillon LinkedIn</a>
- Email: gurvirsinghdhillon@outlook.com
- Portfolio Page: <a href="https://gurvirdhillon.github.io/portfolio/" target="_blank">Portfolio Website</a>
