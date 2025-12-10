# CTF Shop: Laboratorium Broken Access Control

Witaj w **CTF Shop**. Jest to celowo podatna aplikacja webowa typu Proof-of-Concept (PoC), zaprojektowana do demonstracji najczęstszych błędów kontroli dostępu (Broken Access Control) zgodnie z OWASP Top 10.

Aplikacja działa w oparciu o **Node.js + Express** i wykorzystuje bazę danych **In-Memory** (dane przechowywane są w pamięci RAM procesu, resetują się po restarcie aplikacji).

---

## Instalacja i Uruchomienie

### Wymagania
* Node.js (v14+)
* npm

### Krok po kroku

1. Sklonuj repozytorium:

```bash
git clone https://github.com/szczepanikoww/brocken_access_control.git
```

Przejdź do katalogu wykonawczego:
```bash
cd broken_access_control
```
2. Zainstaluj zależności:
   ```bash
   npm install
   ```

3. Uruchom serwer:
   ```bash
   node server.js
   ```

4. Otwórz przeglądarkę pod adresem:
   `http://localhost:3000`


---

## Zadania CTF (Scenariusze Ataków)

Twoim celem jest wykorzystanie luk w aplikacji, aby zdobyć flagi lub uzyskać nieautoryzowany dostęp do danych.

### Zadanie 1. Horizontal Privilege Escalation (Pozioma Eskalacja Uprawnień)
* **Cel:** Jako zwykły użytkownik, uzyskaj dostęp do prywatnych danych Administratora (np. numeru telefonu).

* **Opis:** Aplikacja weryfikuje sesję, ale ufa parametrowi w URL do wyświetlenia formularza.

<details>
  <summary>Hint</summary>
  
  1. Zaloguj się jako `alice@test.com`.
  2. Wejdź w "Edytuj Dane".
  3. Zmodyfikuj parametr `id` w pasku adresu URL na ID administratora.

</details>

### Zadanie 2. Vertical Privilege Escalation (Pionowa Eskalacja Uprawnień)
* **Cel:** Uzyskaj uprawnienia Administratora (dostęp do czerwonego panelu w Dashboardzie).
* **Podatność:** Mass Assignment (Masowe Przypisanie). Backend kopiuje cały obiekt JSON z żądania do obiektu użytkownika.

<details>
  <summary>Hint</summary>

  1. Przechwyć żądanie wysyłania formularza edycji (Burp Suite lub DevTools Network).
  2. Dodaj do wysyłanych danych parametr: `role` z wartością `admin`.
  3. Wyślij zmodyfikowane żądanie.

</details>

### Zadanie 3. Force Browsing (Wymuszone Przeglądanie)
* **Cel:** Znajdź ukryty endpoint diagnostyczny i dokonaj wycieku całej bazy danych.
* **Opis:** Administrator ukrył link do narzędzia debugującego, ale nie zabezpieczył go autoryzacją.

<details>
  <summary>Hint</summary>
  
  1. Spróbuj odgadnąć ścieżkę do endpointu diagnostycznego (słowa kluczowe: `debug`, `dump`, `api`).
  2. Wejdź bezpośrednio na ten adres.
  3. Otrzymasz JSON z hasłami wszystkich użytkowników.
  </details>

### Zadanie 4. IDOR (Insecure Direct Object Reference)
* **Cel:** Znajdź ukrytą fakturę zawierającą flagę.
* **Opis:** W panelu administratora widoczne są faktury nr 100 i 102. Faktura 101 jest ukryta na liście, ale dostępna przez API.

<details>
  <summary>Hint</summary>
  
  1. Otwórz dowolną dostępną fakturę.
  2. Zmień ID w URL na `101`.
     
</details>

### Zadanie 5. Parameter Tampering (Kradzież Tożsamości)
* **Cel:** Zmień hasło Administratora, nie znając jego starego hasła.
* **Opis:** Aplikacja decyduje, kogo zaktualizować, na podstawie ukrytego pola `input type="hidden" name="id"` w formularzu, a nie na podstawie sesji.

<details>
  <summary>Hint</summary>
  
  1. Będąc zalogowanym jako Alice, otwórz edycję swojego profilu.
  2. W narzędziach developerskich (F12) zmień wartość ukrytego pola `id` z `2` na `1`.
  3. Wpisz nowe hasło i zapisz zmiany.
  4. Wyloguj się i zaloguj na konto `admin` nowym hasłem.

</details>

### Zadanie 6. Misconfigured Access Control
* **Cel:** Pobierz fakturę innego użytkownika.
* **Opis:** Panel użytkownika (Frontend) pokazuje tylko Twoje faktury, ale Backend (API) pozwala pobrać dowolną fakturę, jeśli znasz jej ID.

<details>
  <summary>Hint</summary>
  
Jako `alice`, spróbuj wejść na `/invoice/300` (faktura użytkownika Bob).
</details>

### Zadanie 7. Method Tampering (HTTP Verb Tunneling)
* **Cel:** Wykonaj administracyjną akcję usunięcia danych.
* **Opis:** Firewall lub routing aplikacji blokuje bezpośrednie wywołania, ale backend obsługuje nadpisywanie metod HTTP (Tunneling).

<details>
  <summary>Hint</summary>
  
  1. Wyślij żądanie `POST` na endpoint `/admin/delete`.
  2. Dodaj parametr Query String: `?_method=DELETE`.

</details>

---

## Disclaimer

> Ta aplikacja została stworzona wyłącznie do celów edukacyjnych. Zawiera celowe luki bezpieczeństwa. Nie używaj tego kodu w środowisku produkcyjnym ani nie wystawiaj go publicznie w Internecie.
