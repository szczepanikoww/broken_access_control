const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const fs = require("fs");

const app = express();
const PORT = 3000;

// --- DANE W PAMIĘCI RAM ---

const USERS = [
  {
    id: 1,
    username: "admin",
    password: "admin",
    role: "admin",
    firstName: "System",
    lastName: "Administrator",
    address: "Server Room no. 64",
    phone: "ZmxhZz17UVdFUlRZfQ==",
  },
  {
    id: 2,
    username: "alice@test.com",
    password: "alice",
    role: "user",
    firstName: "Alice",
    lastName: "Wonderland",
    address: "Rabbit Hole 2",
    phone: "123-456-789",
  },
  {
    id: 3,
    username: "bob@test.com",
    password: "bob",
    role: "user",
    firstName: "Bob",
    lastName: "Builder",
    address: "Construction Site 5",
    phone: "987-654-321",
  },
  {
    id: 4,
    username: "charlie@test.com",
    password: "charlie",
    role: "user",
    firstName: "Charlie",
    lastName: "Chocolate",
    address: "32nd Avenue",
    phone: "MZWGCZZ5PNAVURKSKRMX2===",
  },
];

const INVOICES = [
  {
    id: 10,
    owner_id: 1,
    title: "Usługi Chmurowe AWS konta id 85",
    content: "W^7?+J$pk>OhrvWOML",
  },
  {
    id: 11,
    owner_id: 1,
    title: "Raport Audytu Bezpieczeństwa no. 16",
    content: "666C61673D7B44564F52414B7D",
  },
  {
    id: 12,
    owner_id: 1,
    title: "Licencja Enterprise Software",
    content: "Klucz licencyjny: XXXX-YYYY-ZZZZ-AAAA. Ważny do 2026.",
  },
  {
    id: 20,
    owner_id: 2,
    title: "Sprzęt biurowy - Laptop",
    content: "MacBook Pro M2 16GB RAM.",
  },
  {
    id: 21,
    owner_id: 2,
    title: "Zaopatrzenie kuchni",
    content: "Kawa Arabica 20kg.",
  },
  {
    id: 30,
    owner_id: 3,
    title: "Route 62",
    content: "BKqPznkqvmPu153MUvN",
  },
  { id: 31, owner_id: 3, title: "Materiały sypkie", content: "Cement 500kg." },
];

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret: "super-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { httpOnly: false },
  }),
);

// Logger
app.use((req, res, next) => {
  const log = `[${new Date().toISOString()}] IP:${req.ip} METHOD:${req.method} URL:${req.originalUrl} USER_ID:${req.session.userId || "guest"}\n`;
  fs.appendFile("audit.log", log, () => {});
  if (req.query._method) req.method = req.query._method.toUpperCase();
  next();
});

// --- ROUTES ---

app.get("/", (req, res) => res.render("login", { error: null }));

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = USERS.find(
    (u) => u.username === username && u.password === password,
  );
  if (user) {
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.username = user.username;
    return res.redirect("/dashboard");
  }
  res.render("login", { error: "Błędne dane logowania" });
});

app.get("/dashboard", (req, res) => {
  if (!req.session.userId) return res.redirect("/");

  const myInvoices = INVOICES.filter(
    (inv) => inv.owner_id === req.session.userId,
  );
  const me = USERS.find((u) => u.id === req.session.userId);

  let allUsers = [];
  let allInvoices = [];

  if (req.session.role === "admin") {
    allUsers = USERS;
    // Ukrycie faktury 101 z listy (Logic vulnerability simulation)
    allInvoices = INVOICES.filter((inv) => inv.id !== 101);
  }

  // Zabezpieczenie widoku przed błędem "me is undefined" (gdyby jednak coś poszło nie tak z sesją)
  if (!me) {
    req.session.destroy();
    return res.redirect("/");
  }

  res.render("dashboard", {
    user: me,
    invoices: myInvoices,
    allUsers: allUsers,
    allInvoices: allInvoices,
  });
});

// Endpoint JSON z contentem
app.get("/invoice/:id", (req, res) => {
  if (!req.session.userId) return res.status(403).send("Zaloguj się");
  const invoice = INVOICES.find((inv) => inv.id === parseInt(req.params.id));
  if (!invoice) return res.status(404).send("Nie znaleziono");
  res.json(invoice);
});

// IDOR Edit
app.get("/user/edit", (req, res) => {
  if (!req.session.userId) return res.redirect("/");
  const targetId = parseInt(req.query.id);
  const targetUser = USERS.find((u) => u.id === targetId);
  if (!targetUser) return res.status(404).send("User not found");
  res.render("edit-profile", { user: targetUser });
});

// --- FIX: NAPRAWIONY ENDPOINT UPDATE ---
app.post("/user/update", (req, res) => {
  if (!req.session.userId) return res.status(403).send("Brak dostępu");

  // Parsujemy ID do Number, aby znaleźć usera
  const targetId = parseInt(req.body.id);
  const userIndex = USERS.findIndex((u) => u.id === targetId);

  if (userIndex === -1) return res.status(404).send("User error");

  // FIX: Wyciągamy 'id' z danych formularza, aby nie nadpisać go stringiem "2" w bazie.
  // Dzięki temu w bazie zostaje id: 2 (Number), a nie id: "2" (String).
  const { id, ...updateData } = req.body;

  // Podatność Mass Assignment zachowana:
  // updateData zawiera wszystko inne (np. role), więc Object.assign nadal pozwala na atak.
  Object.assign(USERS[userIndex], updateData);

  // CTF Challenge: Detect if admin password is changed by another user
  if (targetId === 1 && req.session.userId !== 1 && updateData.password) {
    return res.send(
      '<script>alert("Congratualsions yo\'re are ours\' 100000000 customer here is the coupon for a new iPhone 58: 9XoU7K9svxQAArTr5r"); window.location.href="/dashboard";</script>',
    );
  }

  // Jeśli edytujemy siebie, aktualizujemy sesję
  if (targetId === req.session.userId) {
    if (updateData.role) req.session.role = USERS[userIndex].role;
    if (updateData.username) req.session.username = USERS[userIndex].username;
  }
  res.redirect("/dashboard");
});

// Admin Actions
app.post("/admin/user/delete", (req, res) => {
  if (req.session.role !== "admin")
    return res.status(403).send("Access Denied");
  const targetId = parseInt(req.body.target_id);
  const index = USERS.findIndex((u) => u.id === targetId);
  if (index !== -1 && USERS[index].id !== req.session.userId)
    USERS.splice(index, 1);
  res.redirect("/dashboard");
});

app.post("/admin/invoice/delete", (req, res) => {
  if (req.session.role !== "admin")
    return res.status(403).send("Access Denied");
  const index = INVOICES.findIndex(
    (inv) => inv.id === parseInt(req.body.invoice_id),
  );
  if (index !== -1) INVOICES.splice(index, 1);
  res.redirect("/dashboard");
});

app.delete("/admin/delete", (req, res) => {
  res.json({ status: "success", flag: "0110011001101100011000010110011100111101011110110100110101000001010011000101010001010010010011110100111001111101" });
});

app.get("/debug/dump", (req, res) => res.json({ users: USERS }));

app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`),
);
