# Contributing to ImpulsaEdu

Thank you for contributing to the ImpulsaEdu project! This document outlines our collaboration workflow, branching strategy, and guidelines for submitting your work.

## Table of Contents

- [Team Overview](#team-overview)
- [Workflow](#workflow)
- [Branching Strategy](#branching-strategy)
- [Making Changes](#making-changes)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Code Review Process](#code-review-process)
- [After Your PR is Merged](#after-your-pr-is-merged)
- [Branch Protection Rules](#branch-protection-rules)

## Team Overview

- **Team Size**: 5 members
- **Project Lead**: @andresaugom (handles task assignment, PR reviews, and merging to main)
- **Repository Type**: Monorepo containing all microservices and frontend application

## Workflow

### 1. **Getting an Issue**
- The project lead (@andresaugom) will assign issues to team members
- Each issue will include clear success criteria that must be met before merging
- Review the issue description fully before starting work

### 2. **Create a Feature Branch**
- Create a new branch from `main` for each issue
- Use descriptive branch names that reference the issue (e.g., `feature/issue-123-user-authentication`)

### 3. **Make Your Changes**
- Work on your branch independently
- Follow the project's code standards and conventions for the microservice/component you're modifying
- Commit frequently with clear, meaningful commit messages

### 4. **Open a Pull Request (PR)**
- Once your changes are complete and meet the issue's success criteria, open a PR
- Use the provided PR template and ensure all information is filled out
- Link the issue in your PR description

### 5. **Wait for Review**
- The project lead will review your PR against the success criteria
- Be ready to address feedback and make requested changes
- Discussions should be respectful and constructive

### 6. **PR Approval and Merge**
- Only the project lead (@andresaugom) can merge PRs to `main`
- Once approved and merged, you'll be notified to resolve any merge conflicts on your branch

## Branching Strategy

### Branch Naming Conventions

Follow this format for branch names:

```
<type>/<issue-number>-<description>
```

Where `<type>` is one of:
- `feature/` - New features or enhancements
- `bugfix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring without feature changes
- `chore/` - Maintenance tasks, dependency updates, etc.

**Examples:**
- `feature/issue-42-donation-form-validation`
- `bugfix/issue-15-fix-login-redirect`
- `docs/issue-18-update-api-contracts`

### Repository Structure

This repository is organized as a monorepo. All microservices and components are stored at the repository root under directories named after each microservice:

```
ImpulsaEdu/
├── frontend/        # React/Next.js frontend
├── microservice-1/  # First microservice
├── microservice-2/  # Second microservice
└── ...
```

**Important**: Always create your branch from the latest `main` branch to avoid conflicts.

## Making Changes

### Code Standards

- Follow existing code conventions in the files you modify
- Ensure your code is clean, readable, and well-commented where necessary
- Write meaningful commit messages:
    ```
    [Issue #123] Brief description of change
    
    More detailed explanation if needed.
    ```

### Testing

- Test your changes thoroughly before opening a PR
- Ensure existing tests still pass
- If you're adding new features, include corresponding tests

## Submitting a Pull Request

### Before Opening a PR

1. Ensure your branch is up to date with `main`
2. Push your commits to your branch
3. Double-check that you've met all the success criteria from the issue
4. Review your own changes to catch obvious issues

### Opening the PR

- Use the PR template provided
- Write a clear title describing what you've done
- Link the issue in the description (e.g., "Closes #42")
- Provide context if needed
- Ensure the PR is opened against the `main` branch

## Code Review Process

### For the Contributor

- Response time: Project lead will review PRs within 1-2 business days
- Feedback may request changes or clarifications
- You're responsible for addressing all comments before merge
- Push changes to the same branch; the PR will update automatically

### For the Project Lead

- Review against issue success criteria
- Check code quality, consistency, and testing
- Approve if all criteria are met
- Merge once approved

## After Your PR is Merged

### Handling Merge Conflicts

If your branch had conflicts when `main` was updated:

1. **Switch to your branch**
     ```bash
     git checkout your-branch
     ```

2. **Fetch and rebase on main**
     ```bash
     git fetch origin
     git rebase origin/main
     ```

3. **Resolve conflicts** in your code editor

4. **Push the resolved changes**
     ```bash
     git push origin your-branch --force
     ```

5. **No new PR needed** - your existing PR will be updated

### Branch Cleanup

Once your PR is merged:
- You can safely delete your feature branch locally and on GitHub
- The branch is no longer needed for future work
- Start fresh with a new branch for the next issue

## Branch Protection Rules

The following rules are enforced on the `main` branch:

- **Only @andresaugom can merge PRs** to `main`
- **No direct pushes** to `main` - all changes must go through PRs
- **All team members can branch from `main`**
- **Team members cannot push/merge to others' branches**

These restrictions ensure code quality and prevent accidental breaking changes.

## Questions?

If you have questions about the contribution process, branching strategy, or anything else, reach out to @andresaugom.

---

**Last Updated**: March 2026

