# Linear.app - Homepage Design Analysis

> **Research Date**: April 2026
> **URL**: https://linear.app
> **Note**: Direct HTML fetch returned 403 (anti-scraping). Analysis compiled from search results, design system documentation, public brand guidelines, open-source homepage reconstructions, and design community analysis.

---

## 1. SEO Metadata

| Field | Value |
|-------|-------|
| **Title Tag** | `Linear – The system for product development` |
| **Meta Description** | Linear is a purpose-built tool for planning and building products. Designed for speed, clarity, and a great developer experience. |
| **OG Title** | Linear – The system for product development |
| **Positioning Statement** | "The product development system for teams and agents" (Product Hunt listing) |

---

## 2. Hero Headline

**Primary Headline**: "Purpose-built for planning and building products with AI agents."

**Supporting Text**: "Designed for workflows shared by humans and agents. From drafting PRDs to pushing PRs."

**Social Proof Line**: "Linear powers over 25,000 product teams."

---

## 3. Section Structure (Top to Bottom)

Based on the open-source reconstruction (github.com/frontendfyi/rebuilding-linear.app) and search result analysis:

1. **Navigation Bar** - Minimal top nav with logo, product links, and CTA
2. **Hero Section** - Animated gradient hero with headline, subheadline, CTA, and social proof
3. **Client Logos Section** - Logos of notable companies using Linear
4. **USP / Value Proposition Section** - "Reduces noise and restores momentum to help teams ship with high velocity and focus"
5. **Feature: Linear Asks** - "Capture internal requests and bring them into Linear so the appropriate team can work on them"
6. **Feature: Plan and Navigate** - "Plan and navigate from idea to launch. Align your team with product initiatives, strategic roadmaps, and clear, up-to-date PRDs"
7. **Feature: AI Agents** - "Build and deploy AI agents that work alongside your team. Work on complex tasks together or delegate entire issues end-to-end"
8. **Interactive Keyboard Shortcuts** - Interactive visualization of Linear's keyboard shortcuts
9. **Command Menu** - Functional command interface demonstration
10. **Feature Blocks with Gradients** - Multiple feature cards with distinct gradient treatments
11. **Testimonials / Social Proof** - Customer quotes including "It has the right opinions for fast moving teams" and "Our speed is intense and Linear helps us be action biased"
12. **Final CTA Section** - Sign-up prompt
13. **Footer** - Links, legal, social

---

## 4. Color Palette

### Brand Colors (from FontOfWeb design tokens, brand guidelines, and community analysis)

| Color | Hex | Usage |
|-------|-----|-------|
| **Brand Purple** | `#5E6AD2` | Primary accent, logo, links, interactive elements |
| **Light Purple/Blue** | `#8299FF` | Secondary accent, hover states |
| **Background Dark** | `#222326` | App background, card backgrounds |
| **Near Black** | `#111113` | Homepage/website background |
| **Text Gray** | `#95A2B3` | Secondary text, descriptions |
| **Light Gray** | `#F7F8F8` | Light mode text, contrast elements |
| **White** | `#FFFFFF` | Primary headings on dark backgrounds |

### Gradient Colors (from website hero/feature sections)

The website uses complex multi-stop gradients. Known gradient hex values include:
- `#08AEEA` (cyan)
- `#2AF598` (green)
- `#B5FFFC` (light cyan)
- `#FF5ACD` (pink/magenta)

### Theme System
Linear uses the LCH color space (not HSL) for theme generation. Three variables control each theme:
- **Base color** (background tone)
- **Accent color** (interactive elements)
- **Contrast** (text/foreground brightness)

---

## 5. Typography

| Element | Font | Details |
|---------|------|---------|
| **Headings** | Inter Display | Bold/Semibold, expressive, high contrast |
| **Body Text** | Inter | Regular weight, optimized for readability |
| **Full Font Stack** | `"Inter UI", "SF Pro Display", -apple-system, system-ui, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif` | |

### Typography Style Notes
- Headlines are oversized and bold, following the "Linear design" trend of confidence in type
- Minimal text, high hierarchy contrast between heading and body
- Dark gray sans-serif on near-black backgrounds
- Inter Display was specifically chosen for headings to "add more expression while maintaining readability"

---

## 6. Visual Effects

### Animations & Motion
- **Framer Motion** - Used for scroll-triggered animations and micro-interactions
- **Animated Hero** - "Super detailed animated hero on the homepage" with gradient effects
- **Micro-motion** - Subtle UI animations throughout interactive elements
- **Dynamic streamers** - Flowing light/gradient animations

### Gradients
- **Complex multi-color gradients** on hero section and feature blocks
- **Mesh-style gradients** - Multi-point color blending
- **Linear gradients** on feature cards with distinct color treatments per section

### Glassmorphism
- **Frosted glass effects** - `backdrop-filter: blur()` on cards and overlays
- Semi-transparent backgrounds with blur

### Noise/Grain
- Subtle noise texture overlays on gradient sections for depth and tactile quality

### Blur
- Background blur effects on navigation and card components
- Gaussian blur on decorative gradient elements

### Dark Mode Implementation
- Default dark theme for the marketing website
- Near-black backgrounds with carefully calibrated gray text
- High color contrast for readability
- Monochrome base with strategic accent color usage

---

## 7. Image/Video Style

- **Product Screenshots** - Clean, contextual UI screenshots showing the actual product
- **Abstract Gradient Art** - Colorful gradient compositions as section dividers and backgrounds
- **No stock photography** - Purely digital/abstract visual language
- **Minimal illustration** - The design relies on typography and product UI, not illustrations
- **Logo/Icon displays** - Client company logos in grayscale

---

## 8. CTA Text (All Buttons)

| CTA | Location |
|-----|----------|
| **"Sign up free"** | Hero section, primary CTA |
| **"Get started"** | Navigation, secondary placements |
| **"Contact sales"** | Enterprise/pricing sections |
| **"Download"** | App download section |
| **"Open app"** | Returning user navigation |

---

## 9. Tone of Voice

- **Confident and direct** - Short, declarative statements
- **Technical but accessible** - Speaks the language of product teams without being exclusionary
- **Opinionated** - Linear Method positions specific workflow philosophies
- **Concise** - Minimal words, maximum clarity
- **Professional** - No slang, no exclamation marks, no hype
- **Example phrases**: "Reduces noise and restores momentum", "Ship with high velocity and focus"

---

## 10. How They Talk About AI (Without Cliches)

Linear avoids AI hype language entirely. Their approach:

- **"AI agents"** - Not "AI-powered", not "revolutionary AI"
- **"Workflows shared by humans and agents"** - Positions AI as a teammate, not a magic solution
- **"From drafting PRDs to pushing PRs"** - Describes concrete tasks, not abstract capabilities
- **"Build and deploy AI agents that work alongside your team"** - Active, specific, grounded
- **"Work on complex tasks together or delegate entire issues end-to-end"** - Describes real collaboration
- **"Designed for the AI era"** - Contextual framing without hyperbole
- **"Purpose-built for planning and building products with AI agents"** - AI is a natural extension, not the headline feature

**Key pattern**: AI is presented as an integrated capability of an existing workflow tool, not as a standalone selling point. The word "AI" appears naturally alongside "teams" and "humans."

---

## 11. Key Design Takeaways for FlowAI

1. **Ultra-minimal dark theme** with near-black backgrounds and strategic color accents
2. **Typography-first design** - Inter Display headings carry the visual weight
3. **Restrained color usage** - Mostly monochrome with one accent color (purple)
4. **Gradients as art** - Complex, multi-color gradients used decoratively, not functionally
5. **Glassmorphism and blur** - Frosted glass effects add depth without clutter
6. **Product-focused** - Real UI screenshots instead of stock photography
7. **AI as natural integration** - Not a buzzword, but an embedded workflow component
8. **Social proof through numbers** - "25,000 product teams" rather than testimonial walls
9. **Speed and clarity as brand values** - Both in the product and the design
10. **March 2026 refresh** introduced "a calmer, more consistent interface"

---

## Sources

- [Linear Homepage](https://linear.app)
- [Linear Brand Guidelines](https://linear.app/brand)
- [Linear Design Tokens - FontOfWeb](https://fontofweb.com/tokens/linear.app)
- [Rebuilding Linear.app Homepage (GitHub)](https://github.com/frontendfyi/rebuilding-linear.app)
- [Linear Design: The SaaS Design Trend - LogRocket](https://blog.logrocket.com/ux-design/linear-design/)
- [The Rise of Linear Style Design - Medium](https://medium.com/design-bootcamp/the-rise-of-linear-style-design-origins-trends-and-techniques-4fd96aab7646)
- [The Linear Look - Frontend Horse](https://frontend.horse/articles/the-linear-look/)
- [How We Redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Linear Style](https://linear.style/)
- [A Calmer Interface for a Product in Motion](https://linear.app/now/behind-the-latest-design-refresh)
