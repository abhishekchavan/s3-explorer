# Mac App Store Submission Guide

## Prerequisites

1. **Apple Developer Program membership** ($99/year) - https://developer.apple.com/programs/
2. **Xcode installed** with command line tools

## Step 1: Create App ID

1. Go to https://developer.apple.com/account/resources/identifiers/list
2. Click "+" to create a new identifier
3. Select "App IDs" → "App"
4. Enter:
   - Description: `S3 Explorer`
   - Bundle ID: `com.bezudar.s3downloader.app` (Explicit)
5. Enable capabilities:
   - ✅ Network Extensions (for outgoing connections)
6. Click "Continue" and "Register"

## Step 2: Create Certificates

### 2a. Apple Distribution Certificate (for signing the app)

1. Go to https://developer.apple.com/account/resources/certificates/list
2. Click "+" to create a new certificate
3. Select **"Apple Distribution"** under Software
4. Follow instructions to create a Certificate Signing Request (CSR) using Keychain Access:
   - Open Keychain Access → Certificate Assistant → Request a Certificate From a Certificate Authority
   - Enter your email, select "Saved to disk"
5. Upload the CSR and download the certificate
6. Double-click to install in Keychain

### 2b. Mac Installer Distribution Certificate (for signing the .pkg)

1. Repeat the process above but select **"Mac Installer Distribution"**
2. Download and install

## Step 3: Create Provisioning Profile

1. Go to https://developer.apple.com/account/resources/profiles/list
2. Click "+" to create a new profile
3. Select **"Mac App Store Connect"** under Distribution
4. Select your App ID (`com.bezudar.s3downloader.app`)
5. Select your Apple Distribution certificate
6. Name it: `S3 Explorer MAS`
7. Download the profile
8. Save it to: `build/embedded.provisionprofile`

## Step 4: App Store Connect Setup

1. Go to https://appstoreconnect.apple.com
2. Click "My Apps" → "+" → "New App"
3. Fill in:
   - Platform: macOS
   - Name: S3 Explorer
   - Primary Language: English (U.S.)
   - Bundle ID: Select `com.bezudar.s3downloader.app`
   - SKU: `s3-browser-downloader`
4. Click "Create"

## Step 5: Configure Team ID

Find your Team ID at https://developer.apple.com/account/#/membership

Update `package.json` build config:

```json
"mas": {
  "entitlements": "build/entitlements.mas.plist",
  "entitlementsInherit": "build/entitlements.mas.inherit.plist",
  "hardenedRuntime": false,
  "category": "public.app-category.developer-tools",
  "artifactName": "${productName}-${version}-mas.${ext}",
  "type": "distribution",
  "provisioningProfile": "build/embedded.provisionprofile"
}
```

## Step 6: Build for Mac App Store

```bash
# Build the MAS package
npm run package:mas
```

This creates:
- `dist/mas-arm64/S3 Explorer.app` - The signed app
- `dist/S3 Explorer-1.0.0-mas.pkg` - The installer package

## Step 7: Upload to App Store Connect

### Option A: Using Transporter (recommended)
1. Download Transporter from Mac App Store
2. Open Transporter and sign in with Apple ID
3. Drag the `.pkg` file into Transporter
4. Click "Deliver"

### Option B: Using xcrun
```bash
xcrun altool --upload-app -f "dist/S3 Explorer-1.0.0-mas.pkg" \
  -t macos \
  -u "your-apple-id@email.com" \
  -p "@keychain:AC_PASSWORD"
```

First, add app-specific password to keychain:
```bash
xcrun altool --store-password-in-keychain-item "AC_PASSWORD" \
  -u "your-apple-id@email.com" \
  -p "xxxx-xxxx-xxxx-xxxx"
```

## Step 8: Submit for Review

1. Go to App Store Connect → Your App
2. Fill in App Information:
   - Privacy Policy URL
   - App Category
   - Screenshots (1280x800 or 1440x900)
   - Description
   - Keywords
   - Support URL
3. Select your uploaded build
4. Click "Submit for Review"

## Troubleshooting

### "Cannot find valid identity" error
- Ensure certificates are installed in Keychain Access
- Check certificate hasn't expired
- Verify Team ID matches

### "Provisioning profile" error
- Download fresh profile from developer portal
- Ensure Bundle ID matches exactly
- Place profile at `build/embedded.provisionprofile`

### Sandbox issues
- App must run in sandbox for MAS
- Test with `npm run package:mas-dev` first
- Check entitlements in `build/entitlements.mas.plist`

## App Review Guidelines

Before submitting, ensure:
- [ ] App runs in sandbox without crashes
- [ ] No private API usage
- [ ] No code downloading/execution at runtime
- [ ] Privacy policy URL is valid
- [ ] App description is accurate
- [ ] Screenshots match current app version
- [ ] No placeholder content

## Testing Before Submission

```bash
# Build development version (no signing required)
npm run package:mas-dev

# Test the app runs correctly
open "dist/mas-dev-arm64/S3 Explorer.app"
```

## Environment Variables (Alternative to Keychain)

You can also set these for CI/CD:

```bash
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="certificate-password"
export APPLE_ID="your-apple-id@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
```
