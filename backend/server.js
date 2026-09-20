require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const profileRoutes = require("./routes/profile.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const trackingRoutes = require("./routes/tracking.routes");
const chatbotRoutes = require("./routes/chatbot.routes");
const reminderRoutes = require("./routes/reminder.routes");
const nutritionRoutes = require("./routes/nutrition.routes");
const mealRoutes = require("./routes/meal.routes");
const favoriteRoutes = require("./routes/favorite.routes");
const progressPhotoRoutes = require("./routes/progressPhoto.routes");
const fastingRoutes = require("./routes/fasting.routes");
const exerciseRoutes = require("./routes/exercise.routes");
const workoutSessionRoutes = require("./routes/workoutSession.routes");
const scheduledSessionRoutes = require("./routes/scheduledSession.routes");

const { notFound, errorHandler } = require("./middlewares/error.middleware");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.json({ message: "API FitNova opérationnelle" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/nutrition", nutritionRoutes);
app.use("/api/meals", mealRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/progress-photos", progressPhotoRoutes);
app.use("/api/fasting", fastingRoutes);

// Module Sport
app.use("/api/exercises", exerciseRoutes); // catalogue d'exercices (wger)
app.use("/api/sessions", workoutSessionRoutes); // séances d'entraînement
app.use("/api/calendar", scheduledSessionRoutes); // planning + historique des séances

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});