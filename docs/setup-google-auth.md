# Guida Setup Google Sign-In — Issue #70

Questa guida descrive i passi manuali che Antonino deve eseguire **prima del deploy** della issue #70.
I passi su codice sono gestiti da Jules — qui ci sono solo le configurazioni su Firebase Console, `.env` e Firestore Rules.

---

## 1. Abilitare Google provider in Firebase Authentication

1. Vai su [Firebase Console](https://console.firebase.google.com) → seleziona il progetto `mantifinance`
2. Menu laterale → **Authentication** → tab **Sign-in method**
3. Clicca su **Google** → abilita il toggle
4. Inserisci il tuo indirizzo email come "Email di supporto del progetto"
5. Clicca **Salva**
6. *(Opzionale ma consigliato)* Nella stessa pagina, **disabilita** il provider **Email/Password** dopo aver verificato che il login Google funziona

---

## 2. Aggiungere il dominio autorizzato

1. Sempre in **Authentication** → tab **Impostazioni** (o Settings)
2. Sezione **Domini autorizzati**
3. Verifica che `mantifinance.web.app` sia presente — se non c'è, aggiungilo
4. Puoi aggiungere anche `localhost` se non è già presente (per sviluppo locale)

---

## 3. Configurare la variabile d'ambiente `.env`

1. Nella root del progetto, apri (o crea) il file `.env`
2. Aggiungi la riga:
   ```
   VITE_ALLOWED_EMAILS=tua.email@gmail.com,email.moglie@gmail.com
   ```
   Sostituisci con i due indirizzi Gmail reali, separati da virgola, senza spazi.
3. Verifica che `.env` sia in `.gitignore` (deve esserlo — non committare mai le email reali)

---

## 4. Configurare la variabile su Firebase Hosting (per il deploy)

Le variabili `VITE_*` vengono iniettate a build-time da Vite — **non** sono variabili runtime di Firebase.
Devi quindi assicurarti che il build in CI/CD le abbia disponibili.

### Se usi GitHub Actions per il deploy:
1. Vai su GitHub → repository `manti_finance_dev` → **Settings** → **Secrets and variables** → **Actions**
2. Clicca **New repository secret**
3. Nome: `VITE_ALLOWED_EMAILS`
4. Valore: `tua.email@gmail.com,email.moglie@gmail.com`
5. Verifica che il workflow `.github/workflows/deploy.yml` (o simile) includa:
   ```yaml
   env:
     VITE_ALLOWED_EMAILS: ${{ secrets.VITE_ALLOWED_EMAILS }}
   ```

### Se fai build e deploy manuale:
   Il file `.env` locale viene letto da Vite al momento del build — non serve altro.

---

## 5. Aggiornare le Firestore Security Rules con le email reali

Dopo il merge di #70, Jules avrà lasciato i placeholder `EMAIL_1_PLACEHOLDER` e `EMAIL_2_PLACEHOLDER` in `firestore.rules`.

1. Apri `firestore.rules` nella root del progetto
2. Sostituisci:
   ```
   'EMAIL_1_PLACEHOLDER'  →  'tua.email@gmail.com'
   'EMAIL_2_PLACEHOLDER'  →  'email.moglie@gmail.com'
   ```
3. Deploya le regole aggiornate:
   ```bash
   firebase deploy --only firestore:rules
   ```
4. ⚠️ **Non committare mai le email reali** nel file `firestore.rules` — modifica il file localmente e deploya direttamente senza push.

---

## 6. Verifica finale

1. Apri `https://mantifinance.web.app/login`
2. Clicca "Accedi con Google"
3. Seleziona il tuo account Gmail autorizzato → accesso riuscito ✅
4. Apri una finestra in incognito, tenta accesso con un account Gmail non autorizzato → pagina "Accesso negato" ✅
5. Verifica che l'accesso email/password non sia più visibile nella UI ✅

---

## Riepilogo checklist manuale

- [ ] Google provider abilitato in Firebase Console
- [ ] Email/Password provider disabilitato in Firebase Console
- [ ] `mantifinance.web.app` nei domini autorizzati
- [ ] `VITE_ALLOWED_EMAILS` configurata in `.env` locale
- [ ] `VITE_ALLOWED_EMAILS` configurata come GitHub Actions secret
- [ ] `firestore.rules` aggiornato con email reali e deployato
- [ ] Test accesso con account autorizzato ✅
- [ ] Test rifiuto con account non autorizzato ✅
