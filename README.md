# Klidný okamžik

Jednoduchá, klidně laděná webová aplikace pro krátké zastavení ve stresové chvíli. Funguje jako instalovatelná PWA a po prvním načtení je dostupná i offline.

## Cvičení

- **Uzemnění 5–4–3–2–1** – pět kroků, které postupně zapojují zrak, dotyk, sluch, čich a chuť. Tempo si určuje uživatel; jednotlivé kroky lze přeskočit nebo se k nim vrátit.
- **Box breathing** – čtyři kola minutového dechového cvičení: nádech, zadržení dechu, výdech a další zadržení, vždy po čtyřech sekundách. Cvičení lze pozastavit.
- **Balónková relaxace** – samostatná mini-hra s osmi pomalu se vznášejícími 3D balónky. Klepnutím nebo kliknutím je lze nechat prasknout; bez časového limitu, zvuků a skóre.

Rozhraní je v češtině, respektuje systémové nastavení omezení pohybu a pro 3D animace nabízí nenápadné fallbacky, pokud není dostupné WebGL.

## Spuštění lokálně

Projekt nemá sestavovací krok ani závislosti k instalaci. Je ale potřeba jej spustit přes HTTP server – při otevření přes `file://` nefungují JavaScriptové moduly ani service worker.

## Struktura projektu

| Soubor | Účel |
| --- | --- |
| `index.html` | Struktura jednotlivých obrazovek a ovládacích prvků. |
| `styles.css` | Vizuální styl, rozvržení a přístupné chování pro omezený pohyb. |
| `app.js` | Průběh cvičení a hry, ovládání obrazovek, 3D animace a registrace service workeru. |
| `balloon-game.mjs` | Pravidla balónkové hry, oddělená pro deterministické testování. |
| `service-worker.js` | Uložení aplikačního shellu do cache pro práci offline. |
| `manifest.webmanifest` | Metadata pro instalaci jako PWA. |
| `vendor/` | Lokální distribuce Three.js používaná pro 3D dechovou animaci. |

## Technologie

- Čisté HTML, CSS a JavaScript (ES moduly)
- [Three.js](https://threejs.org/) pro 3D animace při box breathing a balónkové relaxaci
- Web App Manifest a Service Worker pro instalaci a offline použití

Herní pravidla lze ověřit vestavěným Node test runnerem: `node --test test/balloon-game.test.mjs`.

## Poznámky k nasazení

Aplikace odkazuje na statické soubory absolutními cestami, například `/app.js` a `/service-worker.js`. Nasaďte ji proto do kořene domény, případně tyto cesty upravte pro zvolený podadresář. Service worker vyžaduje HTTPS; výjimkou je `localhost` při lokálním vývoji.
