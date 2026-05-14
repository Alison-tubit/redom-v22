# DLRMS Firebase QR Information System

## File Structure

```text
index.html
admin.html
details.html
assets/
  css/
    index.css
    admin.css
    details.css
  js/
    date.js
    common-ui.js
    chatbot.js
    index.js
    admin.js
    details.js
    firebase/
      config.js
      database.js
  images/
    README.md
    .gitkeep
```

## Firebase Setup

Firebase configuration is already added in:

```text
assets/js/firebase/config.js
```

Realtime Database path used by this system:

```text
khatian_records
```

## Image Setup

All images must be placed inside:

```text
assets/images/
```

Use these filenames so the existing design works without changing HTML:

- `logo.png`
- `download (1).png`
- `lmap_logo (1).png`
- `g-play.png`
- `softbd.png`

## Recommended Firebase Realtime Database Rules for Testing

For testing only:

```json
{
  "rules": {
    "khatian_records": {
      ".read": true,
      ".write": true
    }
  }
}
```

For production, protect admin write access with Firebase Authentication.


## Fixed in this version

- `details.html` now loads date, cart/menu and chatbot from separate normal JS files.
- Firebase details loading is isolated in `assets/js/details.js`, so Firebase/module errors cannot stop the chatbot or date system.
- `details.js` imports are placed at the top correctly for browser ES modules.
