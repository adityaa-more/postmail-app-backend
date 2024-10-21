// Import dependencies
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const bodyParser = require("body-parser");
const fs = require("fs");
require("dotenv").config();
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(bodyParser.json()); // To handle JSON requests

app.use(
  cors({
    origin: "http://localhost:3000", // React frontend URL
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_secret_key", // Use environment variable for better security
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

const emailHistoryFile = "emailHistory.json";

const readEmailHistory = () => {
  if (fs.existsSync(emailHistoryFile)) {
    const data = fs.readFileSync(emailHistoryFile);
    console.log("Email history data read from file:", data.toString()); // Log raw data
    return JSON.parse(data);
  } else {
    console.log("Email history file does not exist.");
    return [];
  }
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/auth/google/callback",
    },
    (accessToken, refreshToken, profile, done) => {
      const userEmail = profile.emails[0].value; // Extract email from Google profile
      return done(null, { email: userEmail }); // Pass user's email to done
    }
  )
);

// Serialize user into the session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from the session
passport.deserializeUser((user, done) => {
  done(null, user);
});

// Route: Google OAuth Login
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Route: Google OAuth Callback
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "http://localhost:3000/login",
  }),
  (req, res) => {
    // Redirect to mailhistory page after login
    res.redirect("http://localhost:3000/mails");
  }
);

// Route: Fetch authenticated user's email
app.get("/auth/user", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ email: req.user.email });
  } else {
    res.status(401).json({ message: "User not authenticated" });
  }
});

// Route: Get Communication History (Emails)
// Route: Get Communication History (Emails)
app.get("/communication-history", (req, res) => {
  if (req.isAuthenticated()) {
    // Read email history from the JSON file without filtering by user email
    const emailHistory = readEmailHistory();

    // Simply return all email history
    res.json(emailHistory);
  } else {
    res.status(401).json({ message: "User not authenticated" });
  }
});

// Route: Get mail by ID
app.get("/mail/:id", (req, res) => {
  const mailId = req.params.id;
  const emailHistory = readEmailHistory(); // Function to read email history from JSON

  // Find the mail by its messageId
  const mail = emailHistory.find((mail) => mail.id === mailId);

  if (mail) {
    res.json(mail);
  } else {
    res.status(404).json({ message: "Mail not found" });
  }
});

// Route: Logout
app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.send("Logged out successfully");
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
