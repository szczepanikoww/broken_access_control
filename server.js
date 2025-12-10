const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const PORT = 3000;

// --- DANE W PAMIĘCI RAM (Zamiast Bazy Danych) ---
// Proces Node.js alokuje to na stercie (Heap).
// Restart procesu = reset danych.
const USERS = [
    { id: 1, username: 'admin@example.test', password: 'AdminPass123!', role: 'admin' },
    { id: 2, username: 'alice@example.test', password: 'AlicePass123!', role: 'user' }
];

const INVOICES = [
    { id: 1, owner_id: 1, content: 'Faktura Zarządu (Tajne)', flag: 'FLAG-I-1{idor-in-memory}' },
    { id: 2, owner_id: 2, content: 'Rachunek za Internet', flag: null },
    { id: 3, owner_id: 2, content: 'Zakupy biurowe', flag: null }
];

// --- KONFIGURACJA ---
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// LUKA: Brak flagi 'secure: true' (ciastka latają plain-textem), brak rotacji sesji
app.use(session({
    secret: 'super-secret-key', // Hardcoded secret
    resave: false,
    saveUninitialized: true,
    cookie: { httpOnly: false } // LUKA: Pozwala na dostęp do ciastka z poziomu JS (XSS)
}));

// --- MIDDLEWARE LOGUJĄCY (AUDIT) ---
// Zapisuje logi do pliku na dysku (File System), podczas gdy dane są w RAM.
app.use((req, res, next) => {
    const log = `[${new Date().toISOString()}] IP:${req.ip} METHOD:${req.method} URL:${req.originalUrl} USER:${req.session.userId || 'guest'}\n`;
    fs.appendFile('audit.log', log, (err) => { if (err) console.error(err); });
    
    // LUKA: Method Tampering Helper
    // Pozwala nadpisać metodę HTTP parametrem ?_method=DELETE
    if (req.query._method) {
        req.method = req.query._method.toUpperCase();
    }
    next();
});

// --- ENDPOINTY ---

// 1. Login
app.get('/', (req, res) => res.render('login', { error: null }));

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    // Szukanie w tablicy w RAM
    const user = USERS.find(u => u.username === username && u.password === password);
    
    if (user) {
        req.session.userId = user.id;
        req.session.role = user.role;
        req.session.username = user.username;
        return res.redirect('/dashboard');
    }
    res.render('login', { error: 'Błędne dane' });
});

// 2. Dashboard
app.get('/dashboard', (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    
    // Filtrowanie tablicy pod użytkownika (to jest bezpieczne akurat)
    const myInvoices = INVOICES.filter(inv => inv.owner_id === req.session.userId);
    
    res.render('dashboard', { 
        user: req.session, 
        invoices: myInvoices 
    });
});

// 3. IDOR (LUKA)
// Pobiera fakturę po ID, nie sprawdzając czy należy do zalogowanego usera
app.get('/invoice/:id', (req, res) => {
    if (!req.session.userId) return res.status(403).send('Zaloguj się');
    
    const invoiceId = parseInt(req.params.id);
    const invoice = INVOICES.find(inv => inv.id === invoiceId);

    if (!invoice) return res.status(404).send('Nie znaleziono');
    
    // Zwrot danych JSON (w tym flagi)
    res.json(invoice);
});

// 4. Parameter Tampering (LUKA)
// Hacker dodaje pole 'role' do formularza, a serwer bezmyślnie aktualizuje obiekt
app.post('/user/update', (req, res) => {
    if (!req.session.userId) return res.status(403).send('Brak dostępu');

    const userIndex = USERS.findIndex(u => u.id === req.session.userId);
    if (userIndex === -1) return res.status(404).send('User error');

    // VULN: Przepisanie wszystkich pól z body do obiektu użytkownika
    // Jeśli w body jest { username: 'x', role: 'admin' }, to rola zostanie nadpisana
    Object.assign(USERS[userIndex], req.body);
    
    // Aktualizacja sesji żeby od razu widzieć efekt
    req.session.role = USERS[userIndex].role;
    req.session.username = USERS[userIndex].username;

    if (req.session.role === 'admin') {
        return res.send("Profil zaktualizowany. ZDOBYTO FLAGĘ: FLAG-PT-1{admin-role-hacked}");
    }
    res.redirect('/dashboard');
});

// 5. Method Tampering / Vertical Escalation (LUKA)
// Teoretycznie admin only. W praktyce brak checka roli.
// Dostępne przez POST /admin/delete?_method=DELETE
app.delete('/admin/delete', (req, res) => {
    // Brak: if (req.session.role !== 'admin') ...
    
    res.json({ 
        status: 'success', 
        msg: 'System cleaned.', 
        flag: 'FLAG-MT-1{http-verb-tampering}' 
    });
});

// 6. Public Endpoint / Memory Dump (LUKA)
// Endpoint diagnostyczny, o którym zapomniano. Zrzuca stan pamięci.
app.get('/debug/dump', (req, res) => {
    res.json({
        memory_usage: process.memoryUsage(),
        active_users: USERS // Wyciek całej bazy użytkowników
    });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));