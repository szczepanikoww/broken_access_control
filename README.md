# CTF Shop: Laboratorium Broken Access Control

Witaj w **CTF Shop**. Jest to celowo podatna aplikacja webowa typu Proof-of-Concept (PoC), zaprojektowana do demonstracji najczęstszych błędów kontroli dostępu (Broken Access Control) zgodnie z OWASP Top 10.

Aplikacja działa w oparciu o **Node.js + Express** i wykorzystuje bazę danych **In-Memory** (dane przechowywane są w pamięci RAM procesu, resetują się po restarcie aplikacji).

---

## Instalacja i Uruchomienie

### Wymagania
* Node.js (v14+)
* npm
* przeglądarka Firefox

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

Do wykonania tego zadania potrzebne będzie skorzystanie z narzędzia "Burp Suite". Najpierw trzeba skonfigurować serwer proxy w przeglądarce: 

1. Wyszukaj w pasku przeglądarki ```bash about:preferences```
2. Znajdź ustawienia serwera proxy
3. Ustaw adres na 127.0.0.1 i port na 8080
4. Wejdź w Burpa, w zakładce proxy włącz funkcję Intercept. 

Jeśli Burp nie będzie działał jako proxy dla przeglądarki Firefox, to w prawym górnym rogu powinna być opcja `Open Browser` - otworzy się wtedy domyślna przeglądarka dla Burp. Tam trzeba ponownie wejść pod adres: `http://localhost:3000`

<details>
  <summary>Hint</summary>

  1. Przechwyć żądanie wysyłania formularza edycji
  2. Znajdź w zapytaniu pole `role` i wpisz wartość `admin`
  3. Wyślij zmodyfikowane żądanie

</details>

### Zadanie 3. Force Browsing (Wymuszone Przeglądanie)
* **Cel:** Znajdź ukryty endpoint diagnostyczny i dokonaj wycieku całej bazy danych.
* **Opis:** Administrator ukrył link do narzędzia debugującego, ale nie zabezpieczył go autoryzacją.

<details>
  <summary>Hint</summary>
  
  1. Spróbuj odgadnąć ścieżkę do endpointu diagnostycznego (słowa kluczowe: `debug`, `dump`, `api` itd.) 
  2. Wejdź bezpośrednio na ten adres.
  3. Otrzymasz JSON z hasłami wszystkich użytkowników.
  </details>

### Zadanie 4. IDOR (Insecure Direct Object Reference)
* **Cel:** Znajdź ukrytą fakturę zawierającą flagę.
* **Opis:** W panelu administratora widoczne są faktury nr 10 i 12. Nie wszystkie faktury muszą być pokazane na liście.

<details>
  <summary>Hint</summary>
  
  1. Otwórz dowolną dostępną fakturę.
  2. Zmień ID w URL na `11`.
     
</details>

### Zadanie 5. Parameter Tampering (Kradzież Tożsamości)
* **Cel:** Zmień hasło Administratora, nie znając jego starego hasła.
* **Opis:** Mechanizm edycji profilu identyfikuje użytkownika na podstawie parametru `id` przesyłanego w żądaniu, ignorując kontekst sesji. Pozwala to na nadpisanie danych dowolnego konta.

<details>
  <summary>Hint</summary>
  
  1. Zaloguj się jako Alice i przejdź do edycji swojego profilu.
  2. Wypełnij formularz zmiany hasła
  3. Użyj **Burp Suite**, aby przechwycić żądanie zmiany hasła
  4. W treści żądania zmień wartość parametru `id`
  5. Wyślij zmodyfikowane żądanie.
  6. Wyloguj się i zaloguj na konto `admin` używając nowego hasła.
</details>

### Zadanie 6. Misconfigured Access Control
* **Cel:** Pobierz fakturę innego użytkownika.
* **Opis:** Panel użytkownika pokazuje tylko Twoje faktury, ale Backend pozwala pobrać dowolną fakturę, jeśli znasz jej ID. Ponieważ identyfikatory mogą nie być oczywiste, ręczne zgadywanie jest nieefektywne – użyj automatyzacji.

<details>
  <summary>Hint</summary>
  
  1. Otwórz w przeglądarce jedną ze swoich faktur (np. `/invoice/20`) i przechwyć to żądanie w **Burp Suite** (Proxy -> HTTP History).
  2. Kliknij prawym przyciskiem myszy na żądanie i wybierz **Send to Intruder**
  3. W zakładce **Positions** wyczyść domyślne znaczniki (`Clear §`), zaznacz ID faktury w URL i kliknij `Add §` (powinno to wyglądać tak: `GET /invoice/§20§`).
  4. W zakładce **Payloads** wybierz typ **Numbers** i skonfiguruj zakres: (np. `From: 1`, `To: 100`, `Step: 1`)
  5. Kliknij **Start Attack**. Po zakończeniu ataku posortuj wyniki po kodzie statusu
</details>

### Zadanie 7. Method Tampering (HTTP Verb Tunneling)
* **Cel:** Wykonaj administracyjną akcję usunięcia danych.
* **Opis:** Firewall lub routing aplikacji blokuje bezpośrednie wywołania, ale backend obsługuje nadpisywanie metod HTTP (Tunneling).

<details>
  <summary>Hint</summary>
  
  1. Włącz Burp Suite w trybie Intercept
  2. Wyślij dowolne zapytanie (GET, POST)
  3. Zamień treść zapytania na `POST /admin/delete`
  4. Dodaj parametr: `?_method=DELETE`

</details>

---

## Disclaimer

> Ta aplikacja została stworzona wyłącznie do celów edukacyjnych. Zawiera celowe luki bezpieczeństwa. Nie używaj tego kodu w środowisku produkcyjnym ani nie wystawiaj go publicznie w Internecie.
