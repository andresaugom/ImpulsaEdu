# ImpulsaEdu

A comprehensive educational platform for managing donations to schools and educational initiatives.

## Overview

ImpulsaEdu is a **monorepo** containing:
- **Frontend**: Next.js React application for the public and admin interfaces
- **Microservices**: Backend services for handling donations, donors, schools, and more

**Team**: 5 members | **Lead**: @andresaugom

## Documentation

- **[Quick Reference](docs/QUICK_REFERENCE.md)** - Get started quickly with the development workflow
- **[Contributing Guide](CONTRIBUTING.md)** - Complete contribution guidelines and workflow
- **[GitHub Rulesets Setup](.github/GITHUB_RULESETS_SETUP.md)** - Branch protection and rules configuration
- **[Architecture Documentation](docs/architecture/)** - Technical design and API contracts
- **[Project Plan](docs/initial-plan.md)** - Original project proposal and roadmap

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Development Setup

1. **Clone and enter frontend directory:**
    ```bash
    git clone https://github.com/andresaugom/ImpulsaEdu.git
    cd ImpulsaEdu/frontend
    ```

2. **Install dependencies:**
    ```bash
    npm install
    ```

3. **Run development server:**
    ```bash
    npm run dev
    ```

4. **Open in browser:**
    Navigate to [http://localhost:3000](http://localhost:3000)

## Contributing

We follow a standard collaborative workflow:

1. **Wait for issue assignment** from @andresaugom
2. **Create a feature branch** from `main`
3. **Make changes** and commit with clear messages  
4. **Open a PR** and link the issue
5. **Wait for review** from @andresaugom
6. **Merge when approved** - conflicts handled per-branch

### Branch Protection Rules

- Only @andresaugom can merge to `main`
- All changes require PR and code review
- Each team member works on their own branches
- Direct pushes to `main` are blocked

### Branching Convention

```
<type>/<issue-number>-<brief-description>
```

**Types**: `feature/`, `bugfix/`, `docs/`, `refactor/`, `chore/`

**Examples**:
- `feature/issue-42-donation-form`
- `bugfix/issue-15-login-redirect`
- `docs/issue-18-api-documentation`

**For detailed workflow instructions, see [CONTRIBUTING.md](CONTRIBUTING.md)**

## Repository Structure

```
ImpulsaEdu/
├── frontend/          # Next.js React application
├── docs/             # Project documentation
├── mockup/           # UI mockups and prototypes
├── CONTRIBUTING.md   # Contribution guidelines
└── README.md         # This file
```

## Tech Stack

- **Frontend**: [Next.js](https://nextjs.org) + TypeScript + React
- **Styling**: Material-UI or Tailwind (configured in frontend)
- **Backend**: Microservices architecture
- **Monorepo**: All services in single repository

## Next.js Development Notes

The frontend is bootstrapped with [create-next-app](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

To learn more about Next.js:
- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

## Roles & Permissions

| Role | Responsibilities | Permissions |
|------|-----------------|------------|
| **@andresaugom** (Lead) | Task assignment, PR review, merge to main | Full access, can merge to main |
| **Team Members** (4) | Development on assigned issues | Create branches, push to own branches, open PRs |

## Questions?

- Check [docs/QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md) for quick answers
- Review [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidance
- Ask @andresaugom in issue comments or discussions

---

**Last Updated**: March 2026

