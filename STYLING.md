# Trickster - Tailwind CSS Styling Dokumentation

## 🎨 Übersicht

Das Styling wurde vollständig von Bootstrap auf **Tailwind CSS** mit einem modernen Aqua/Türkis-Farbschema umgestellt.

---

## 🚀 Setup & Installation

### 1. Dependencies installieren
```bash
npm install
```

### 2. CSS kompilieren
```bash
# Einmalig bauen (production)
npm run build:css

# Entwicklungsmodus mit Auto-Rebuild
npm run watch:css

# Server + CSS Watch gleichzeitig
npm run dev
```

---

## 🎨 Farbpalette (Aqua/Türkis)

In `tailwind.config.js` definiert:

```javascript
aqua: {
  50:  '#ECFEFF',  // Sehr hell (Backgrounds)
  100: '#CFFAFE',
  200: '#A5F3FC',
  300: '#67E8F9',
  400: '#22D3EE',  // Hellblau - Gradient Start
  500: '#06B6D4',  // Haupt-Türkis
  600: '#0891B2',  // Hover/Active - Gradient Ende
  700: '#0E7490',  // CTAs & Fokus-Ringe
  800: '#155E75',
  900: '#164E63'   // Dunkel (Schatten)
}
```

### Verwendung:
- **Globaler Hintergrund**: `bg-gradient-to-b from-aqua-400 to-aqua-600`
- **Container/Karten**: `bg-white text-gray-900` (hoher Kontrast)
- **Buttons**: `bg-aqua-700 hover:bg-aqua-600 text-white`
- **Input-Felder**: `bg-white text-gray-900 border-aqua-200`

---

## 📐 Design-Prinzipien

### Runde Ecken
- Standard: `rounded-2xl` (1rem)
- Extra: `rounded-xxl` (1.25rem, custom)
- Vollrund: `rounded-full` (Buttons)

### Schatten
- Cards: `shadow-2xl shadow-sky-900/20`
- Buttons: `shadow-lg shadow-aqua-900/20`
- Hover: `hover:shadow-xl hover:shadow-aqua-500/20`

### Abstände
- Container-Padding: `p-6 md:p-12`
- Element-Gaps: `gap-3`, `gap-4`, `space-y-6`
- Konsistente Margins: `mb-6`, `mt-6`

---

## ✨ Animationen

Definiert in `tailwind.config.js`:

### fadeIn
```css
animate-fade-in
/* 300ms, translateY(6px) → 0 */
```
**Verwendung**: Alle Views beim Erscheinen (`.view.active`)

### fadeOut
```css
animate-fade-out
/* 250ms, translateY(0) → -6px */
```
**Verwendung**: Views beim Ausblenden (manuell per JS)

### pulseSoft
```css
animate-pulse-soft
/* Sanftes translateY(-2px) Pulsieren */
```
**Verwendung**: "Spiel starten" Button (Call-to-Action)

### Hover/Active States
```css
hover:translate-y-[-2px]
active:scale-[0.98]
transition
```

---

## 🎯 Komponenten-Übersicht

### 1. Buttons (Primary)
```html
<button class="bg-aqua-700 hover:bg-aqua-600 active:bg-aqua-700
               text-white rounded-full px-8 py-4 text-lg font-semibold
               shadow-lg shadow-aqua-900/20 transition
               hover:translate-y-[-2px] hover:shadow-xl active:scale-[0.98]
               focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-aqua-300/60">
  Button Text
</button>
```

### 2. Buttons (Secondary/Zurück)
```html
<button class="bg-white/80 hover:bg-white text-aqua-700
               border-2 border-aqua-600/30 hover:border-aqua-600
               rounded-full px-8 py-4 text-lg font-semibold
               shadow-md transition hover:shadow-lg active:scale-[0.98]
               focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-aqua-300/60">
  Zurück
</button>
```

### 3. Input-Felder
```html
<input class="w-full bg-white text-gray-900 text-center text-lg
              placeholder:text-gray-400 rounded-xxl px-6 py-4
              shadow-md border border-aqua-200
              focus:outline-none focus:border-aqua-500
              focus:ring-4 focus:ring-aqua-300/40 transition"
       placeholder="Platzhalter" />
```

### 4. Textarea (Antwort-Eingabe)
```html
<textarea class="w-full bg-white text-gray-900
                 placeholder:text-gray-400 rounded-xxl px-6 py-4
                 shadow-md border border-aqua-200
                 focus:outline-none focus:border-aqua-500
                 focus:ring-4 focus:ring-aqua-300/40 transition resize-none"
          rows="4"></textarea>
```

### 5. Pill Badge (Spielerliste)
```html
<span class="pill-badge">Spielername</span>
```
CSS in `styles.css`:
```css
.pill-badge {
  @apply inline-flex items-center gap-2 px-4 py-2 rounded-full
         bg-aqua-700 text-white shadow-md
         hover:bg-aqua-600 active:scale-[0.98] transition-all;
}
```

### 6. Timer Chip
```html
<div class="timer-chip">90</div>
```
CSS:
```css
.timer-chip {
  @apply px-6 py-3 rounded-full bg-aqua-700 text-white font-bold
         tracking-wide shadow-lg shadow-aqua-900/20;
}
```

### 7. Answer/Vote Buttons
```html
<button class="answer-btn">Antworttext</button>
```
CSS:
```css
.answer-btn {
  @apply w-full rounded-xxl px-5 py-4 text-left font-semibold
         bg-white text-gray-900 border border-aqua-200
         shadow-lg shadow-sky-900/10
         hover:translate-y-[-2px] hover:shadow-xl hover:shadow-aqua-500/20
         active:scale-[0.98] transition-all
         focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-aqua-300/60;
}
```

### 8. Reveal Cards
```html
<div class="reveal-card">
  <h3 class="reveal-meta">SPIELERNAME</h3>
  <div class="reveal-bubble">
    <p class="reveal-content">Antworttext</p>
  </div>
  <div class="votes">
    <span class="vote-chip">Voter1</span>
    <span class="vote-chip vote-chip-self">Du</span>
  </div>
</div>
```

### 9. Leaderboard Card
Automatisches Styling via `.leaderboard-card` Klasse in `styles.css`.

### 10. Podium Card
Automatisches Styling via `.podium-card` Klasse in `styles.css`.

---

## ♿ Accessibility (A11y)

### Kontraste
- ✅ **Weiß auf aqua-600/700**: WCAG AA konform
- ✅ **Schwarz auf Weiß**: WCAG AAA konform
- ✅ **Fokus-Ringe**: 4px, 60% Opazität, deutlich sichtbar

### Fokus-Management
Alle interaktiven Elemente haben:
```css
focus-visible:outline-none
focus-visible:ring-4
focus-visible:ring-aqua-300/60
```

### Reduced Motion
In `styles.css`:
```css
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in,
  .animate-fade-out,
  .animate-pulse-soft {
    animation: none !important;
  }
  .transition, .transition-all {
    transition: none !important;
  }
}
```

---

## 🔄 Animation Trigger-Punkte (JavaScript)

### Beim Mounten/Erscheinen von Views:
```javascript
// Automatisch durch CSS:
// <section class="view active"> erhält animate-fade-in
```

### Beim Entfernen von Views:
```javascript
// Manuell hinzufügen vor dem Entfernen:
element.classList.add('animate-fade-out');
setTimeout(() => element.remove(), 250); // 250ms = fadeOut Duration
```

### Dynamisch erstellte Elemente:
```javascript
// Pill Badges (Spielerliste)
const badge = document.createElement('span');
badge.className = 'pill-badge animate-fade-in';
badge.textContent = playerName;

// Reveal Cards
const card = document.createElement('div');
card.className = 'reveal-card'; // animate-fade-in ist in .reveal-card enthalten

// Vote Options
const option = document.createElement('div');
option.className = 'vote-option animate-fade-in';
```

---

## 📦 Dateistruktur

```
trickster/
├── tailwind.config.js         # Farben, Animationen, Custom-Klassen
├── postcss.config.js           # PostCSS Setup
├── public/
│   ├── index.html              # Vollständig mit Tailwind überarbeitet
│   ├── styles.css              # Source (Tailwind Direktiven)
│   ├── dist/
│   │   └── styles.css          # Kompiliert (wird ignoriert in Git)
│   └── app.js                  # Keine Änderungen (Logik unberührt)
├── package.json                # + Tailwind Scripts
└── .gitignore                  # dist/ ausgeschlossen
```

---

## 🛠️ Wichtige Hinweise

### Was wurde NICHT geändert:
- ❌ JavaScript-Logik (app.js)
- ❌ DOM-Struktur (IDs, Datenattribute)
- ❌ Event-Listener
- ❌ WebSocket-Kommunikation
- ❌ Server-Code (server.js)

### Was wurde geändert:
- ✅ Alle CSS-Klassen (Bootstrap → Tailwind)
- ✅ Farbschema (Lila/Pink → Aqua/Türkis)
- ✅ Animationen (neu: fadeIn, fadeOut, pulseSoft)
- ✅ Accessibility (Fokus-Ringe, Kontraste, Reduced Motion)
- ✅ Typography (Poppins → Inter)

---

## 🐛 Troubleshooting

### CSS wird nicht angewendet?
```bash
# 1. Neu kompilieren
npm run build:css

# 2. Cache leeren (Browser)
Strg+Shift+R (Hard Refresh)

# 3. Prüfen ob dist/styles.css existiert
ls public/dist/
```

### Farben/Klassen werden nicht erkannt?
```bash
# Tailwind Content-Pfade in tailwind.config.js prüfen:
content: [
  "./public/**/*.{html,js}",
  "./public/index.html"
]
```

### Animationen funktionieren nicht?
- Prüfen ob `animate-fade-in` auf `.view.active` angewendet wird
- Prüfen ob `prefers-reduced-motion` aktiv ist (dann sind Animationen deaktiviert)

---

## 📝 Checkliste für künftige Änderungen

Beim Hinzufügen neuer UI-Elemente:

- [ ] `animate-fade-in` beim Erscheinen
- [ ] `animate-fade-out` beim Entfernen (manuell)
- [ ] Fokus-Ring: `focus-visible:ring-4 focus-visible:ring-aqua-300/60`
- [ ] Hover-State: `hover:translate-y-[-2px]` oder `hover:bg-aqua-600`
- [ ] Active-State: `active:scale-[0.98]`
- [ ] Kontrast prüfen (WCAG AA mindestens)
- [ ] Responsive Klassen: `md:...`, `lg:...`

---

## 📞 Support

Bei Fragen zur Implementierung:
1. Prüfen Sie `tailwind.config.js` für Custom-Klassen
2. Prüfen Sie `public/styles.css` für Component-Styles
3. Konsultieren Sie [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

**✨ Viel Erfolg mit dem neuen Design!**
