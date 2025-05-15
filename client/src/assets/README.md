# Assets Directory

This directory contains various assets used in the Campus Connect application.

## Directory Structure

- `/client/src/assets/` - For CSS files, reusable SVGs, and images used in the React components
- `/client/public/` - For static files like favicons, logos, and other assets directly accessed by URL

## Asset Types

### SVG Files
- UI icons and small graphics should be stored in `src/assets/icons/`
- Larger illustrations should be stored in `src/assets/illustrations/`

### Images
- Background images should be stored in `src/assets/backgrounds/`
- Profile images, thumbnails, and other content images in `src/assets/images/`

### Static Files
- Logo and favicon should be stored in the `public/` directory
- The BRAC University logo (`bracu-logo.svg`) is stored in the `public/` directory

## Adding New Assets

When adding new images or SVG files:

1. Place static assets that need to be directly accessible via URL in the `public/` directory
2. Place assets that will be imported into components in the appropriate subdirectory under `src/assets/`
3. For images or SVGs that may have multiple variations (light/dark mode), use a naming convention like `icon-name-light.svg` and `icon-name-dark.svg`

## Usage

For importing assets in components:
```jsx
// For assets in src/assets
import myIcon from '../assets/icons/my-icon.svg';

// For static assets in public directory, reference directly:
<img src="/bracu-logo.svg" alt="BRAC University" />
``` 