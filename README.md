# DUALFORCE Motorrad

> **Single-Chamber Combustion-Electromagnetic Reluctance Hybrid Powertrain for High-Efficiency Motorcycles**

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Three.js](https://img.shields.io/badge/Three.js-black?style=flat&logo=three.js&logoColor=white)](https://threejs.org/)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![GitHub Pages Ready](https://img.shields.io/badge/GitHub%20Pages-Ready-brightgreen)](https://pages.github.com/)

---

## 🚀 Overview

The **DUALFORCE Architecture** introduces a radical approach to two-wheeler hybrid propulsion. Conventional parallel hybrid systems (e.g., Toyota HSD, Honda e:HEV) introduce substantial mass penalties (+35 to +45 kg) through auxiliary electric motors, planetary gear splitters, and bulky battery banks.

DUALFORCE eliminates auxiliary electric motors entirely by converting the reciprocating internal combustion engine (ICE) piston and cylinder bore directly into a **Linear Variable Reluctance Machine (LVRM)**:
- **Piston Assembly**: Forged aerospace 4032 aluminum crown with embedded laminated Hiperco-50 iron-cobalt reluctance teeth.
- **Cylinder Sleeve**: Non-magnetic Austenitic AISI 316L / Nitronic 50 alloy ($\mu_r \approx 1.006$).
- **Stator Assembly**: Multi-tier Class-220 Litz-wire stator coils wrapped externally around the cylinder sleeve.
- **Thermodynamic Cycle**: Variable Valve Actuation (VVA) executing an over-expanding Atkinson/Miller cycle (12.8:1 expansion ratio vs. 9.2:1 effective compression ratio) with active zero-lift decompression in pure EV mode ($0\text{--}35\text{ km/h}$).
- **Performance**: 348 cc platform delivering **46.5 bhp (34.7 kW)** and **58.0 Nm** peak torque, cutting urban fuel consumption by 62% with a net system mass penalty of only **+8.1 kg**.

---

## 🖥️ Web Platform & Interactive Modules

This repository contains the interactive presentation, 3D simulation engine, and technical dossiers:

| File | Description |
| :--- | :--- |
| **[`index.html`](index.html)** | Interactive landing page & presentation deck with company milestones, powertrain overview, and investor insights. |
| **[`3d-engine.html`](3d-engine.html)** | Full-screen interactive 3D WebGL simulator powered by Three.js. Supports 360° orbit controls, exploded views, cross-section slicing, and animated 4-stroke + reluctance cycles. |
| **[`engine.html`](engine.html)** | Deep-dive powertrain technical showcase: interactive anatomy hotspots, investor rebuttals, technical Q&A, and TCO calculator. |
| **[`models.html`](models.html)** | Commercial motorcycle lineup showcase, featuring the Retro Heritage, Inline-2, and Supersport 650 variants. |
| **[`DUALFORCE_Faculty_Project_Report.md`](DUALFORCE_Faculty_Project_Report.md)** | Full academic and faculty verification report containing complete thermodynamic, electromagnetic, and finite-element equations. |
| **[`DUALFORCE_Investor_Technical_Documentary.html`](DUALFORCE_Investor_Technical_Documentary.html)** | Investor-facing comprehensive technical documentary. |
| **[`DUALFORCE_Engine_Technical_Report.html`](DUALFORCE_Engine_Technical_Report.html)** | Engineering and thermal design audit report. |

---

## 🛠️ Tech Stack & Dependencies

- **Frontend**: HTML5, CSS3 (Modern Flexbox / Grid, Custom CSS Variables), Vanilla JavaScript (ES6+)
- **3D Graphics Engine**: [Three.js](https://threejs.org/) (included locally as `three.min.js` with CDN fallback)
- **Typography**: Google Fonts (Barlow, Barlow Condensed, JetBrains Mono, Crimson Pro)

---

## 💻 Running Locally

No complex build pipeline or package installation is required.

### Option 1: Direct Browser Launch
Double-click `index.html` or `3d-engine.html` to open directly in any modern browser (Chrome, Firefox, Edge, Safari).

### Option 2: Local HTTP Server (Recommended for 3D textures)
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (npx)
npx serve .
```
Then navigate to `http://localhost:8000` in your browser.

---

## 🌐 Deploying to GitHub Pages

1. Push this repository to GitHub.
2. In your repository settings, go to **Settings > Pages**.
3. Under **Build and deployment > Source**, select **Deploy from a branch**.
4. Select the `main` branch and `/ (root)` folder, then click **Save**.
5. Your interactive site will be live at `https://<your-username>.github.io/<repo-name>/`.

---

## 📄 Documentation & Downloads

- **[Materials & Parts Catalog (PDF)](DUALFORCE_Engine_Materials_and_Parts_Catalog.pdf)**
- **[Investor Technical Documentary (PDF)](DUALFORCE_Investor_Technical_Documentary.pdf)**
- **[Faculty Project Verification Report (Markdown)](DUALFORCE_Faculty_Project_Report.md)**
