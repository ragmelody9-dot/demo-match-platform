const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA = path.join(__dirname, "data.json");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ""; // Set in hosting environment; demo only

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const defaultData = {
  users: [
    { id: 1, name: "Demo User", phone: "+49123", password: "123456", balance: 0, commission: 0, completed: 0, totalTasks: 40, createdAt: new Date().toISOString() }
  ],
  products: [
    { id: 1, name: "Premium Watch", price: 159.99, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80" },
    { id: 2, name: "Wireless Headphones", price: 89.99, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80" },
    { id: 3, name: "Designer Sunglasses", price: 129.99, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80" }
  ],
  activity: []
};

function load() {
  if (!fs.existsSync(DATA)) fs.writeFileSync(DATA, JSON.stringify(defaultData, null, 2));
  return JSON.parse(fs.readFileSync(DATA, "utf8"));
}
function save(db) { fs.writeFileSync(DATA, JSON.stringify(db, null, 2)); }
function findUser(db, id) { return db.users.find(u => u.id === Number(id)); }
function publicUser(u) {
  const { password, ...safe } = u;
  return safe;
}
function isAdmin(req) { return req.headers["x-admin-password"] === ADMIN_PASSWORD; }
function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return res.status(401).json({ error: "Admin authentication required." });
  next();
}
function activityForUser(db, userId, limit=1000) {
  return db.activity.filter(x => Number(x.userId) === Number(userId)).slice(-limit).reverse();
}
function addActivity(db, item) { db.activity.push({ id: crypto.randomUUID(), at: new Date().toISOString(), ...item }); }

app.get("/api/dashboard", (req, res) => {
  const db = load();
  const id = Number(req.query.userId || 1);
  const u = findUser(db, id);
  if (!u) return res.status(404).json({ error: "Member not found." });
  res.json({ user: publicUser(u), products: db.products, activity: activityForUser(db, id, 20), demoOnly: true });
});

app.post("/api/task/start", (req, res) => {
  const db = load();
  const u = findUser(db, req.body.userId || 1);
  if (!u) return res.status(404).json({ error: "Member not found." });
  if (u.completed >= u.totalTasks) return res.status(400).json({ error: "All demo tasks are completed." });
  const product = db.products[Math.floor(Math.random() * db.products.length)];
  const commission = Number((product.price * 0.05).toFixed(2));
  u.completed += 1;
  u.commission = Number((u.commission + commission).toFixed(2));
  u.balance = Number((u.balance + commission).toFixed(2));
  addActivity(db, { userId: u.id, type: "task", product: product.name, tradeAmount: product.price, commission, note: "Virtual demo task completed" });
  save(db);
  res.json({ ok: true, product, commission, user: publicUser(u) });
});

// Simulated demo withdrawal: records the action and sets the virtual balance to zero.
app.post("/api/withdraw", (req, res) => {
  const db = load();
  const u = findUser(db, req.body.userId || 1);
  if (!u) return res.status(404).json({ error: "Member not found." });
  if (u.balance <= 0) return res.status(400).json({ error: "No virtual balance available." });
  const amount = u.balance;
  u.balance = 0;
  addActivity(db, { userId: u.id, type: "withdraw", amount, note: "Simulated demo withdrawal; no cash was transferred" });
  save(db);
  res.json({ ok: true, amount, user: publicUser(u), demoOnly: true });
});

// ----- Admin API (demo only) -----
app.post("/api/admin/login", (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: "Admin password is not configured. Set ADMIN_PASSWORD in hosting environment." });
  if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Incorrect admin password." });
  res.json({ ok: true });
});

app.get("/api/admin/members", requireAdmin, (req, res) => {
  const db = load();
  res.json({ users: db.users.map(publicUser) });
});

app.post("/api/admin/members", requireAdmin, (req, res) => {
  const db = load();
  const name = String(req.body.name || "").trim();
  const phone = String(req.body.phone || "").trim();
  const password = String(req.body.password || "123456").trim();
  if (!name || !phone || !password) return res.status(400).json({ error: "Name, phone and password are required." });
  if (db.users.some(u => u.phone === phone)) return res.status(400).json({ error: "A member with this phone already exists." });
  const nextId = Math.max(0, ...db.users.map(u => Number(u.id))) + 1;
  const u = { id: nextId, name, phone, password, balance: 0, commission: 0, completed: 0, totalTasks: 40, createdAt: new Date().toISOString() };
  db.users.push(u);
  addActivity(db, { userId: u.id, type: "member_created", note: "Member created by admin" });
  save(db);
  res.json({ ok: true, user: publicUser(u) });
});

app.post("/api/admin/add-demo-amount", requireAdmin, (req, res) => {
  const amount = Number(req.body.amount);
  const u = findUser(load(), req.body.userId || 1);
  if (!u) return res.status(404).json({ error: "Member not found." });
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) return res.status(400).json({ error: "Enter a valid positive demo amount." });
  const db = load();
  const target = findUser(db, u.id);
  target.balance = Number((target.balance + amount).toFixed(2));
  addActivity(db, { userId: target.id, type: "credit", amount, note: "Demo amount added by admin" });
  save(db);
  res.json({ ok: true, user: publicUser(target) });
});

app.post("/api/admin/reset-tasks", requireAdmin, (req, res) => {
  const db = load();
  const u = findUser(db, req.body.userId);
  if (!u) return res.status(404).json({ error: "Member not found." });
  u.completed = 0;
  u.commission = 0;
  addActivity(db, { userId: u.id, type: "task_reset", note: "Task progress and commission reset by admin" });
  save(db);
  res.json({ ok: true, user: publicUser(u) });
});

app.post("/api/admin/reset-password", requireAdmin, (req, res) => {
  const db = load();
  const u = findUser(db, req.body.userId);
  const password = String(req.body.password || "").trim();
  if (!u) return res.status(404).json({ error: "Member not found." });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
  u.password = password;
  addActivity(db, { userId: u.id, type: "password_reset", note: "Member password reset by admin" });
  save(db);
  res.json({ ok: true });
});

app.get("/api/admin/activity", requireAdmin, (req, res) => {
  const db = load();
  const userId = Number(req.query.userId);
  const days = Math.min(3650, Math.max(1, Number(req.query.days || 30)));
  const since = Date.now() - days * 86400000;
  const items = db.activity.filter(x => (!userId || Number(x.userId) === userId) && new Date(x.at).getTime() >= since).reverse();
  res.json({ activity: items });
});

app.post("/api/admin/reset-demo", requireAdmin, (req, res) => {
  save(JSON.parse(JSON.stringify(defaultData)));
  res.json({ ok: true });
});

app.listen(PORT, "0.0.0.0", () => console.log(`Demo platform running on port ${PORT}`));
