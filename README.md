# Aramis Jones Portfolio

A modern, interactive portfolio website showcasing my work, projects, and blog posts. Built with Astro, featuring smooth animations, a responsive design, and a minimalist aesthetic inspired by Disney's Three Caballeros.

## ✨ Features

- **Interactive Hero Section** - Animated snake game and dynamic content
- **About Me Section** - Grid-based layout showcasing projects and experience
- **Project Showcases** - Interactive cards for various projects including:
  - D&D Initiative Tracker
  - Minesweeper Demo
  - Appraise CSV Parser
  - RPG Soundboard
  - Goblin Scribe (D&D Campaign Manager)
- **Dev Blog** - Technical blog posts with code examples and interactive demos
- **Resume** - Professional experience and tech stack
- **Smooth Animations** - GSAP-powered scroll-triggered and hover animations
- **Theme Toggle** - Light/dark mode with smooth transitions
- **Responsive Design** - Mobile-first approach with adaptive layouts

## 🛠️ Tech Stack

- **Framework**: [Astro](https://astro.build/) - Static site generator
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- **Animations**: [GSAP](https://greensock.com/gsap/) - High-performance animation library
- **Smooth Scrolling**: [Lenis](https://lenis.studio/) - Smooth scroll library
- **Language**: TypeScript
- **Build Tool**: Vite

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ajones119/AramisJonesPortfolio.git
cd AramisJonesPortfolio
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The site will be available at `http://localhost:4321`

## 📜 Available Scripts

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |

## 📁 Project Structure

```
/
├── public/                 # Static assets (favicon, etc.)
├── src/
│   ├── assets/            # Images, SVGs, and other media
│   ├── components/        # Astro components
│   │   ├── AboutMe/      # About section and project cards
│   │   ├── Blog/         # Blog post components
│   │   ├── Hero/         # Hero section
│   │   └── ...
│   ├── layouts/          # Page layouts
│   ├── pages/            # Route pages
│   │   ├── blog/         # Blog post pages
│   │   ├── index.astro   # Home page
│   │   └── resume.astro  # Resume page
│   ├── scripts/          # Client-side scripts
│   ├── styles/           # Global styles
│   └── utils/            # Utility functions
├── astro.config.mjs      # Astro configuration
└── package.json          # Dependencies and scripts
```

## 🎨 Design Philosophy

The portfolio follows a minimalist aesthetic inspired by Disney's Three Caballeros, featuring:
- Clean, grid-based layouts
- Smooth, purposeful animations
- Theme-aware color palettes
- Interactive project cards with hover effects
- Responsive design that works on all devices

## 📝 Blog Posts

The blog section includes technical posts covering:
- Canvas animations (Snowfall, Rainfall)
- CSS techniques (3D transforms, gradients)
- Interactive demos with code examples
- Development practices and patterns

## 🚢 Deployment

The site can be deployed to any static hosting service:

- **Vercel**: Connect your GitHub repo for automatic deployments
- **Netlify**: Drag and drop the `dist` folder or connect via Git
- **GitHub Pages**: Use GitHub Actions to build and deploy

Build the production site:
```bash
npm run build
```

The output will be in the `dist/` directory.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔗 Links

- **Portfolio**: [aramisjones.com](https://aramisjones.com)
- **GitHub**: [@ajones119](https://github.com/ajones119)
- **LinkedIn**: [Aramis Jones](https://www.linkedin.com/in/aramis-jones-904b2b1ba/)

## 🙏 Acknowledgments

- Built with [Astro](https://astro.build/)
- Animations powered by [GSAP](https://greensock.com/gsap/)
- Design inspiration from Disney's Three Caballeros aesthetic
