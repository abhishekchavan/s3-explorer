# Mac App Store Submission Guide

## Prerequisites

1. **Apple Developer Account** ($99/year)
   - Enroll at: https://developer.apple.com/programs/

2. **Xcode** (latest version from Mac App Store)

3. **Certificates & Provisioning Profile**
   - Sign in to https://developer.apple.com/account
   - Create the following in Certificates, Identifiers & Profiles:

## Step 1: Create App ID

1. Go to **Identifiers** → **App IDs** → **+**
2. Select **App IDs** → Continue
3. Select **App** → Continue
4. Fill in:
   - Description: `S3 Browser Downloader`
   - Bundle ID: `com.yourcompany.s3browserdownloader` (Explicit)
5. Enable capabilities:
   - ✅ App Groups (if using shared containers)
6. Click **Continue** → **Register**

## Step 2: Create Certificates

### Mac App Distribution Certificate
1. Go to **Certificates** → **+**
2. Select **Mac App Distribution** → Continue
3. Follow CSR instructions using Keychain Access
4. Download and install the certificate

### Mac Installer Distribution Certificate
1. Go to **Certificates** → **+**
2. Select **Mac Installer Distribution** → Continue
3. Follow CSR instructions
4. Download and install the certificate

## Step 3: Create Provisioning Profile

1. Go to **Profiles** → **+**
2. Select **Mac App Store** → Continue
3. Select your App ID → Continue
4. Select your Mac App Distribution certificate → Continue
5. Name it: `S3 Browser Downloader MAS`
6. Download and save as: `build/embedded.provisionprofile`

## Step 4: Update Configuration

### Update package.json
Replace placeholders with your actual values:

```json
{
  "build": {
    "appId": "com.YOURCOMPANY.s3browserdownloader",
    ...
  }
}
```

### Update entitlements.mas.plist
Replace `yourcompany` with your actual company identifier:

```xml
<string>$(TeamIdentifierPrefix)com.YOURCOMPANY.s3browserdownloader</string>
```

### Update Info.plist
Replace "Your Company Name" with your actual company name.

## Step 5: Build for Mac App Store

```bash
# Set your Apple Team ID (find in Apple Developer account)
export APPLE_TEAM_ID="YOUR_TEAM_ID"

# Build MAS package
npm run package:mas
```

The build will create:
- `dist/mas/S3 Browser Downloader-1.0.0-mas.pkg`

## Step 6: Create App in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. **My Apps** → **+** → **New App**
3. Fill in:
   - Platform: macOS
   - Name: S3 Browser Downloader
   - Primary Language: English
   - Bundle ID: Select your App ID
   - SKU: `s3browserdownloader` (unique identifier)

## Step 7: Prepare App Store Listing

### Required Assets
- **App Icon**: 1024x1024 PNG and generated `build/icon.icns` (must be added before release)
- **Screenshots**: At least one screenshot
  - Size: 1280x800 or 1440x900 or 2560x1600 or 2880x1800

### App Information
- **Category**: Developer Tools
- **Subtitle**: Browse and download from S3 buckets
- **Promotional Text**: (optional, can be updated without new build)
- **Description**:
  ```
  S3 Browser Downloader is a native macOS app for browsing and managing your Amazon S3 buckets.

  Features:
  • Connect using AWS profiles or manual credentials
  • Browse buckets and folders with an intuitive interface
  • Preview files directly in the app
  • Download files and folders
  • Upload files via drag and drop
  • Generate presigned URLs for sharing
  • Bookmark frequently accessed locations
  • Dark mode support

  Your credentials are stored securely using macOS Keychain.
  ```

- **Keywords**: S3, AWS, Amazon, cloud storage, file browser, download, upload
- **Support URL**: Your support website
- **Privacy Policy URL**: Required - link to your privacy policy

### Privacy Policy Requirements
You must have a privacy policy that covers:
- What data is collected (AWS credentials stored locally)
- How data is used (connecting to AWS services)
- Third-party services (AWS)

## Step 8: Upload Build

### Using Transporter
1. Download **Transporter** from Mac App Store
2. Open Transporter
3. Drag your `.pkg` file into Transporter
4. Sign in with Apple ID
5. Click **Deliver**

### Using xcrun (command line)
```bash
xcrun altool --upload-app \
  --type macos \
  --file "dist/mas/S3 Browser Downloader-1.0.0-mas.pkg" \
  --username "your@apple.id" \
  --password "@keychain:AC_PASSWORD"
```

## Step 9: Submit for Review

1. In App Store Connect, go to your app
2. Select the build you uploaded
3. Fill in **Export Compliance**:
   - Uses encryption: YES (HTTPS/TLS for S3 API)
   - Qualifies for exemption: YES (standard encryption)
4. Fill in **Content Rights**
5. Add **Age Rating** (likely 4+)
6. **Submit for Review**

## Common Rejection Reasons & Fixes

### 1. Sandbox Violations
- Ensure all file access goes through Open/Save panels
- Don't access files outside user-selected locations
- In MAS builds, avoid reading `~/.aws/credentials` and `~/.aws/config` directly

### 2. Missing Privacy Descriptions
- Already added in Info.plist

### 3. Hardcoded Paths
- Don't use hardcoded paths like `/Users/...`
- Use proper APIs for app support directories

### 4. Network Access Without Purpose String
- Already covered by entitlements

### 5. Keychain Access Issues
- electron-store uses safeStorage which is MAS compliant

## Testing Before Submission

```bash
# Build MAS development version (doesn't require provisioning profile)
npm run package:mas-dev

# Test the app runs in sandbox
# Look for sandbox violations in Console.app
```

## Troubleshooting

### Build Fails - No Provisioning Profile
Ensure `build/embedded.provisionprofile` exists and matches your App ID.

### Signing Fails
Check you have both certificates installed:
```bash
security find-identity -v -p codesigning
```

### Upload Fails
- Ensure bundle version is incremented for each upload
- Check all entitlements match provisioning profile
