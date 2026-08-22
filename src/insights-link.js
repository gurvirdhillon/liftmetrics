const insightsUrl = window.location.hostname === "localhost"
  ? "http://localhost:8501"
  : "https://liftmetrics-insights.onrender.com";

document.querySelectorAll("[data-insights-link]").forEach((link) => {
  link.href = insightsUrl;
});
