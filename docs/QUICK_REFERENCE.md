# ImpulsaEdu Development Quick Reference

**This is a quick reference guide. For detailed information, see [CONTRIBUTING.md](../CONTRIBUTING.md)**

## Quick Start

### 1. Get an Issue
- Wait for @andresaugom to assign you an issue
- Read the issue description and **success criteria** carefully

### 2. Create a Branch
```bash
git checkout main
git pull origin main
git checkout -b feature/issue-123-brief-description
```

### 3. Make Changes
- Commit frequently with clear messages
- Test your changes
- Ensure success criteria are met

### 4. Open a PR
```bash
git push origin feature/issue-123-brief-description
```
- Go to GitHub and click "Compare & pull request"
- Fill out the PR template
- Link the issue number (e.g., "Closes #123")
- Wait for review

### 5. Address Feedback
- Respond to review comments
- Make requested changes
- Push updates (PR auto-updates)

### 6. Merged!
- @andresaugom merges your PR
- Delete your branch locally: `git branch -d feature/issue-123-brief-description`
- Move on to your next issue

---

## Branch Naming Convention

```
<type>/<issue-number>-<description>
```

**Types:**
- `feature/` - New features
- `bugfix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code cleanup
- `chore/` - Maintenance

**Examples:**
- `feature/issue-42-add-donation-form`
- `bugfix/issue-15-fix-login-redirect`
- `docs/issue-18-update-api-docs`

---

## What You Can & Can't Do

### You CAN:
- Create branches from `main`
- Push to your own branches
- Open PRs
- Review others' PRs

### You CAN'T:
- Push directly to `main` (use PR instead)
- Push to others' branches
- Merge PRs to `main` (only @andresaugom can)
- Delete the `main` branch

---

## PR Checklist Before Opening

- [ ] I branched from latest `main`
- [ ] My code is tested
- [ ] All success criteria are met
- [ ] Commit messages are clear
- [ ] PR template is filled out
- [ ] Issue is linked in PR description

---

## Handling Merge Conflicts

After your PR is merged and `main` has changed:

```bash
git fetch origin
git rebase origin/main
# Fix any conflicts in your editor
git add .
git rebase --continue
git push origin your-branch --force
```

---

## Common Questions

**Q: Can I delete the main branch?**  
A: No, it's protected.

**Q: Can I push directly to main?**  
A: No, all changes go through reviewed PRs.

**Q: Can I work on someone else's branch?**  
A: No, each person works on their own branches.

**Q: What if I need help?**  
A: Ask @andresaugom or the team in the issue comments.

**Q: Can I merge my own PR?**  
A: No, only @andresaugom merges to main.

---

## Full Documentation

- [CONTRIBUTING.md](../CONTRIBUTING.md) - Complete workflow guide
- [.github/GITHUB_RULESETS_SETUP.md](.github/GITHUB_RULESETS_SETUP.md) - Rule configuration details

---

**Team**: 5 members | **Lead**: @andresaugom | **Updated**: March 2026

