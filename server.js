const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA = path.join(__dirname, "data.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const defaultData = {
  users: [
    {
      id: 1,
      name: "Demo User",
      phone: "",
      balance: 0,
      commission: 0,
      completed: 0,
      totalTasks: 60
    }
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
function save(db) {
  fs.writeFileSync(DATA, JSON.stringify(db, null, 2));
}
function user(db) {
  return db.users[0];
}

app.get("/api/dashboard", (req, res) => {
  const db = load();
  const u = user(db);
  res.json({
    user: u,
    products: db.products,
    activity: db.activity.slice(-20).reverse(),
    demoOnly: true
  });
});

// Demo-only admin endpoint. In production, protect this with real authentication.
app.post("/api/admin/add-demo-amount", (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) {
    return res.status(400).json({ error: "Enter a valid positive demo amount." });
  }
  const db = load();
  const u = user(db);
  u.balance = Number((u.balance + amount).toFixed(2));
  db.activity.push({
    type: "credit",
    amount,
    note: "Demo amount added by admin",
    at: new Date().toISOString()
  });
  save(db);
  res.json({ ok: true, balance: u.balance });
});

app.post("/api/task/start", (req, res) => {
  const db = load();
  const u = user(db);

  if (u.completed >= u.totalTasks) {
    return res.status(400).json({ error: "All demo tasks are completed." });
  }

  const product = db.products[Math.floor(Math.random() * db.products.length)];
  // Demo commission only; no real-money processing occurs.
  const commission = Number((product.price * 0.05).toFixed(2));
  u.completed += 1;
  u.commission = Number((u.commission + commission).toFixed(2));
  u.balance = Number((u.balance + commission).toFixed(2));

  db.activity.push({
    type: "task",
    product: product.name,
    tradeAmount: product.price,
    commission,
    at: new Date().toISOString()
  });
  save(db);

  res.json({
    ok: true,
    product,
    commission,
    user: u
  });
});

app.post("/api/reset-demo", (req, res) => {
  save(JSON.parse(JSON.stringify(defaultData)));
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Demo platform running at http://localhost:${PORT}`);
});