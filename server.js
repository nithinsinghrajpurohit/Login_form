// server.js
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));

const dbFile = "./users.json";
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify([]));

function loadUsers() {
  return JSON.parse(fs.readFileSync(dbFile));
}
function saveUsers(users) {
  fs.writeFileSync(dbFile, JSON.stringify(users, null, 2));
}

// ✅ Reuse your working transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
});

// ===== ROUTES =====

// 🟢 Register route
app.post("/register", async (req, res) => {
  const { fName, lname, email, password } = req.body;
  if (!fName || !lname || !email || !password)
    return res.status(400).send("All fields are required.");

  const users = loadUsers();
  if (users.some(u => u.email === email))
    return res.status(400).send("Email already registered.");

  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ fName, lname, email, password: hashedPassword });
  saveUsers(users);

  // 🟢 Send notification email
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.TO_EMAIL || process.env.EMAIL_USER,
    subject: "New User Registration",
    html: `
      <h2>New User Registered</h2>
      <p><strong>Name:</strong> ${fName} ${lname}</p>
      <p><strong>Email:</strong> ${email}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Registration email sent successfully.");
    res.send("Registration successful.");
  } catch (err) {
    console.error("❌ Error sending registration email:", err.message);
    res.status(500).send("Registration email failed to send.");
  }
});

// 🟢 Login route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const users = loadUsers();

  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).send("Invalid email or password.");

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).send("Invalid email or password.");

  res.send("Login successful.");
});

// 🟢 Recover password route
app.post("/recover", (req, res) => {
  const { email } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).send("Email not found.");

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Password Recovery",
    text: "This is a simulated recovery email. Please reset your password manually.",
  };

  transporter.sendMail(mailOptions)
    .then(() => res.send("Recovery email sent!"))
    .catch(err => {
      console.error("❌ Error sending recovery email:", err.message);
      res.status(500).send("Error sending recovery email.");
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
