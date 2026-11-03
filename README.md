# Morrow Coffee

A warm, editorial-style coffee shop landing page for Morrow Coffee, a small-batch roastery and café in Portland, Oregon.

This project is a static, single-page website with rich motion, smooth scrolling, café menu sections, roast details, and a storefront/contact experience.

## Preview

Open `index.html` in a browser to view the site locally.

Or run a simple local server:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## Project structure

```text
.
├── assets/          # Images, fonts, and favicon
├── vendor/          # Local libraries (GSAP, Lenis, ScrollTrigger)
├── index.html       # Main page structure
├── style.css        # Styling and layout
├── script.js        # Interactions, scroll effects, mobile nav, and open-status logic
├── README.md        # Project documentation
└── .gitignore       # Git ignore rules (if present in the repo)
```

## Features

- Responsive café landing page
- Animated hero and scroll reveals
- Mobile navigation menu
- Open/closed status based on Portland time
- Brand-forward sections for story, menu, roast, and visit
- Local asset usage with no external dependency required for core design

## Tech stack

- HTML5
- CSS3
- Vanilla JavaScript
- GSAP + ScrollTrigger
- Lenis smooth scrolling

## Notes

The site uses local assets and vendor scripts instead of CDN-hosted dependencies, which keeps the project self-contained and easy to run from a static file setup.

## License

This project does not currently include a license file. If you plan to publish or share it publicly, consider adding one.

## Author

Designed and built for Morrow Coffee.
Creator : Mr_First
