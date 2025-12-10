const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Baza danych in-memory
const users = [
    { id: 1, username: 'admin', role: 'admin', bio: "Jestem szefem." },
    { id: 2, username: 'user', role: 'user', bio: "Zwykły pracownik." }
];

const secrets = {
    flag1: "FLAG{COOKIE_MONSTER_IS_ADMIN}",
    flag2: "FLAG{IDOR_VIEW_OTHER_ID}",
    flag3: "FLAG{VERB_TAMPERING_BYPASS}",
    flag4: "FLAG{FORCED_BROWSING_URL}",
    flag5: "FLAG{MASS_ASSIGNMENT_ROLE}",
    flag6: "FLAG{REFERER_SPOOFING_TRUST}",
    flag7: "FLAG{CLIENT_SIDE_ONLY_SECURITY}"
};

// Middleware symulujący logowanie (ustawia ciasteczko dla demo)
app.use((req, res, next) => {
    if (!req.cookies.session) {
        // Domyślnie logujemy jako 'user'.
        // Base64 z: {"username":"user","role":"user"}
        // To jest vulnerability helper - normalnie to powinno być podpisane (JWT) lub losowe ID sesji.
        res.cookie('session', 'eyJ1c2VybmFtZSI6InVzZXIiLCJyb2xlIjoidXNlciJ9', { httpOnly: false });
    }
    next();
});

// Helper do dekodowania ciasteczka (podatny, bo ufa klientowi)
function getUserFromCookie(req) {
    try {
        const decoded = Buffer.from(req.cookies.session, 'base64').toString('utf-8');
        return JSON.parse(decoded);
    } catch (e) {
        return { role: 'guest' };
    }
}

/* --- VULNERABILITIES --- */

// 1. Insecure Cookie Handling (Privilege Escalation)
// Atak: Zmień ciasteczko session na base64 z {"role":"admin"}
app.get('/api/admin-panel', (req, res) => {
    const user = getUserFromCookie(req);
    if (user.role === 'admin') {
        return res.json({ msg: "Witaj Adminie!", flag: secrets.flag1 });
    }
    res.status(403).json({ error: "Access Denied. Tylko dla role: admin" });
});

// 2. IDOR (Insecure Direct Object Reference)
// Atak: Zmień parametr id na 1 (profil admina) będąc userem
app.get('/api/profile', (req, res) => {
    const id = parseInt(req.query.id);
    const user = users.find(u => u.id === id);
    
    // BŁĄD: Brak sprawdzenia, czy req.query.id należy do obecnie zalogowanego użytkownika
    if (user) {
        if (user.id === 1) { // Jeśli uda się podejrzeć profil ID 1
             return res.json({ data: user, flag: secrets.flag2 });
        }
        return res.json({ data: user });
    }
    res.status(404).json({ error: "User not found" });
});

// 3. HTTP Verb Tampering (Obejście metody)
// Atak: Endpoint blokuje POST, ale (przez błąd logiczny lub konfiguracyjny) przepuszcza GET lub PUT
// W Express: app.post blokuje, ale app.all lub app.get poniżej może obsłużyć, jeśli nie ma return.
// Tutaj symulacja: ACL sprawdza metodę POST dla /api/delete, ale nie sprawdza GET.
app.all('/api/delete-report', (req, res) => {
    const user = getUserFromCookie(req);
    
    // ACL Middleware symulacja
    if (req.method === 'POST' && user.role !== 'admin') {
        return res.status(403).json({ error: "POST requires admin" });
    }
    
    // BŁĄD: Wykonanie akcji dla innej metody niż POST (np. GET), która ominęła powyższy if
    if (req.method === 'GET') {
         return res.json({ msg: "Report deleted (via GET bypass)", flag: secrets.flag3 });
    }
    
    res.json({ msg: "Method allowed/handled properly for admin" });
});

// 4. Forced Browsing / Security by Obscurity
// Atak: Użytkownik wchodzi na URL, do którego nie ma linku w menu, a który nie ma weryfikacji sesji.
app.get('/admin/hidden-backup', (req, res) => {
    // BŁĄD: Brak jakiegokolwiek sprawdzania getUserFromCookie(req)
    res.json({ msg: "Znalazłeś ukryty backup!", flag: secrets.flag4 });
});

// 5. Mass Assignment (Nadpisywanie obiektów)
// Atak: Wysłanie JSON z polem "role": "admin" podczas aktualizacji profilu
app.post('/api/update-user', (req, res) => {
    const user = getUserFromCookie(req); // Aktualny user
    const newData = req.body;

    // BŁĄD: Przepisujemy wszystko co przysłał klient do obiektu (w tym pole role)
    // Zamiast: user.bio = newData.bio
    const updatedUser = { ...user, ...newData };

    if (updatedUser.role === 'admin' && user.role !== 'admin') {
        return res.json({ msg: "Privilege Escalated via Mass Assignment!", flag: secrets.flag5 });
    }
    res.json({ msg: "User updated", user: updatedUser });
});

// 6. Header Based Trust (Spoofing)
// Atak: Dodanie nagłówka X-Custom-Role: admin
app.get('/api/internal-logs', (req, res) => {
    // BŁĄD: Ufanie nagłówkom, które może wysłać klient
    if (req.headers['x-custom-role'] === 'admin') {
        return res.json({ logs: "System OK...", flag: secrets.flag6 });
    }
    res.status(403).json({ error: "Internal access only" });
});

// 7. Client-Side Access Control
// Atak: API jest otwarte, ale przycisk jest ukryty w HTML/CSS. Wywołanie API bezpośrednio.
app.post('/api/emergency-stop', (req, res) => {
    // BŁĄD: Brak weryfikacji po stronie serwera, zakładamy że skoro user nie widzi przycisku, to nie kliknie.
    return res.json({ msg: "Emergency Stop Triggered!", flag: secrets.flag7 });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});