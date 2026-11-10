# 🚀 Computer Vision Hub — React Native App (Live Real-Time Phone Preview)

A high-performance React Native (Expo) application dedicated strictly to the **Computer Vision Curriculum** (all 5 Units, 37 Long Q&As, 5 Full Unit Quick Recaps, 5 Short Answer 2-Mark Question Collections, and Master Topic Matrix).

All API and Microservices content has been completely removed from this application.

---

## 📱 How to Run & Change Code in Real-Time on Your Phone

With React Native (Expo Fast Refresh), you can connect your physical Android or iPhone and see your code changes **instantly update on your phone in under 100 milliseconds**!

### Step 1: Install Expo Go on your Phone (Free)
- **Android:** Download [Expo Go on Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **iOS:** Download [Expo Go on Apple App Store](https://apps.apple.com/app/expo-go/id982107779)

---

### Step 2: Start the Development Server
Open PowerShell or your terminal inside this project folder:
```powershell
cd C:\Users\soumy\.gemini\antigravity\scratch\cv_react_native
npm start
```
*(Or `npx expo start`)*

---

### Step 3: Connect Your Phone

#### Option A: Scan QR Code (Same Wi-Fi)
1. Ensure your computer and phone are connected to the same Wi-Fi network.
2. When Metro starts in your terminal, a QR code will be displayed.
3. Open **Expo Go** on Android and tap **"Scan QR Code"**, or open the Camera app on iPhone.
4. The app will immediately load on your phone!

#### Option B: USB Cable Connection (Super Fast & Reliable)
If your Wi-Fi blocks local connections or you are on mobile data:
1. Connect your Android phone via USB with USB Debugging enabled.
2. In terminal, run:
   ```powershell
   adb reverse tcp:8081 tcp:8081
   npx expo start --localhost
   ```
3. Open Expo Go and it connects directly over the USB cable without needing Wi-Fi!

#### Option C: Web Browser Preview on PC
Press `w` in the terminal to immediately open the app in Google Chrome or Microsoft Edge.

---

### Step 4: Change Things in Real Time!
- Open `App.js` or `assets/cv_articles.json`.
- Edit any color, text, title, font size, or component.
- Hit **Save** (`Ctrl+S`).
- **Look at your phone screen:** The screen updates immediately via Fast Refresh without needing to reload or re-install!

---

## 🌟 App Features
- **Strictly Computer Vision:** 5 Units, 48 topics, 0 API-MS content.
- **Figures for Every Topic:** Every single question and recap has an illustrative diagram with tap-to-expand full-screen modal zoom.
- **Reading Progress Tracker:** Live progress bar tracking completed topics.
- **Unit Filtering:** Filter instantly by Unit 1, 2, 3, 4, 5, Recaps, 2-Marks, Saved, or Completed.
- **Theme Switcher:** Light, Dark, and Sepia reading modes.
- **Adjustable Text Size:** `A-` and `A+` buttons for dynamic font scaling.
