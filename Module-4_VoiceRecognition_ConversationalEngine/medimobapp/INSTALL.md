# Installation Commands for Medi Assist Bot

# Step 1: Navigate to project directory
cd c:\Users\arunn\Desktop\medimobapp

# Step 2: Install dependencies
npm install

# Step 3: Start the development server
npm start

# Alternative: Run setup script (PowerShell)
# .\setup.ps1

# ============================================================================
# TESTING ON YOUR PHONE
# ============================================================================

# Option A: Using Expo Go (Recommended for Testing)
# 1. Install "Expo Go" app from Google Play Store
# 2. Open the app and scan the QR code from your terminal
# 3. App will load on your phone
# 4. Grant microphone permission when prompted

# Option B: Using Android Emulator
npm run android

# ============================================================================
# BUILDING APK (After Testing)
# ============================================================================

# Method 1: EAS Build (Easiest)
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo (create free account at expo.dev)
eas login

# Configure EAS
eas build:configure

# Build APK for Android
eas build -p android --profile preview

# Download APK from the link provided after build completes

# ============================================================================
# Method 2: Expo Classic Build
# ============================================================================
expo build:android
# Select "APK" when prompted
# Wait for build to complete
# Download from build.expo.dev

# ============================================================================
# TROUBLESHOOTING
# ============================================================================

# If "npm install" fails, try:
npm cache clean --force
npm install

# If ports are in use:
# Close other Expo/Metro instances and try again

# If expo command not found:
npm install -g expo-cli

# Check Node version (should be 14+):
node --version

# Check npm version:
npm --version

# ============================================================================
# USEFUL COMMANDS
# ============================================================================

# Clear Metro bundler cache
npm start -- --clear

# Reset Expo cache
npx expo start --clear

# Check for outdated packages
npm outdated

# Update Expo SDK (if needed later)
npx expo upgrade

# ============================================================================
# DEVELOPMENT WORKFLOW
# ============================================================================

# 1. Make changes to code
# 2. Save files (app auto-reloads)
# 3. Test on phone/emulator
# 4. Check console for errors
# 5. Iterate and improve

# Hot reload: Changes appear instantly
# Error overlay: Shows errors on phone screen
# Console logs: Visible in terminal

# ============================================================================
# BEFORE BUILDING FINAL APK
# ============================================================================

# 1. Test all features thoroughly
# 2. Test with different languages
# 3. Test emergency scenarios
# 4. Check error handling
# 5. Verify API responses
# 6. Test on multiple devices
# 7. Update app version in app.json
# 8. Add proper app icons to assets/
# 9. Build and test APK
# 10. Share with users!

# ============================================================================
# PROJECT STRUCTURE
# ============================================================================

# medimobapp/
# ├── App.js                    # Main application component
# ├── app.json                  # Expo configuration
# ├── package.json              # Dependencies and scripts
# ├── babel.config.js           # Babel configuration
# ├── services/
# │   ├── sarvamApi.js         # Sarvam AI integration
# │   └── geminiApi.js         # Gemini AI integration
# ├── utils/
# │   └── audioUtils.js        # Audio recording/playback
# ├── assets/                  # App icons and images
# ├── README.md                # Full documentation
# ├── QUICKSTART.md            # Quick start guide
# ├── WORKFLOW.js              # Technical workflow docs
# ├── .gitignore              # Git ignore rules
# └── setup.ps1               # Windows setup script
