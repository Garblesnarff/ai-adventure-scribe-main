# Contributing to InfiniteRealms

Thank you for your interest in contributing to InfiniteRealms! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Commit Message Guidelines](#commit-message-guidelines)
6. [Pull Request Process](#pull-request-process)
7. [Testing Requirements](#testing-requirements)
8. [Documentation](#documentation)
9. [Issue Guidelines](#issue-guidelines)
10. [Community](#community)

---

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Examples of positive behavior:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior:**
- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could be considered inappropriate

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported to the project team. All complaints will be reviewed and investigated promptly and fairly.

---

## Getting Started

### Prerequisites

- Node.js 22.x or later
- Git
- A GitHub account
- Basic knowledge of TypeScript, React, and Express.js

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/infinite-realms.git
   cd infinite-realms
   ```

3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/infinite-realms.git
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Set up environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

6. **Run development server:**
   ```bash
   npm run dev
   ```

See [DEVELOPMENT.md](/home/user/ai-adventure-scribe-main/DEVELOPMENT.md) for detailed setup instructions.

---

## Development Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/add-spell-system

# Or a bug fix branch
git checkout -b fix/character-creation-bug
```

**Branch naming conventions:**
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/changes

### 2. Make Changes

- Write clean, maintainable code
- Follow coding standards (see below)
- Add tests for new functionality
- Update documentation as needed
- Run linter and formatter frequently

```bash
# Format code
npm run format

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### 3. Test Your Changes

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run e2e

# Type check
npm run type-check
```

All tests must pass before submitting a pull request.

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: add spell slot tracking system"
```

See [Commit Message Guidelines](#commit-message-guidelines) below.

### 5. Keep Your Branch Updated

```bash
# Fetch upstream changes
git fetch upstream

# Rebase your branch
git rebase upstream/main

# Resolve any conflicts
# Then continue
git rebase --continue

# Force push to your fork
git push origin feature/add-spell-system --force
```

### 6. Create Pull Request

1. Push your branch to your fork
2. Go to the original repository on GitHub
3. Click "New Pull Request"
4. Select your branch
5. Fill out the PR template
6. Submit the PR

---

## Coding Standards

### TypeScript Guidelines

**Use explicit types:**
```typescript
// Good
function calculateModifier(abilityScore: number): number {
  return Math.floor((abilityScore - 10) / 2);
}

// Bad
function calculateModifier(abilityScore: any) {
  return Math.floor((abilityScore - 10) / 2);
}
```

**Avoid `any` type:**
```typescript
// Good
interface CharacterData {
  name: string;
  level: number;
  class: string;
}

function createCharacter(data: CharacterData): Character {
  // Implementation
}

// Bad
function createCharacter(data: any) {
  // Implementation
}
```

**Use proper error types:**
```typescript
// Good
try {
  await fetchCharacter(id);
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  }
}

// Bad
try {
  await fetchCharacter(id);
} catch (error) {
  console.error(error);
}
```

### React Guidelines

**Use functional components:**
```typescript
// Good
export function CharacterCard({ character }: CharacterCardProps) {
  return <div>{character.name}</div>;
}

// Avoid class components unless necessary
```

**Use hooks properly:**
```typescript
// Good
function CharacterList() {
  const { data: characters, isLoading } = useCharacters();

  useEffect(() => {
    // Effect code
    return () => {
      // Cleanup
    };
  }, [dependency]);

  if (isLoading) return <Spinner />;
  return <div>...</div>;
}

// Bad - missing cleanup
useEffect(() => {
  const subscription = observable.subscribe();
  // Missing: return () => subscription.unsubscribe();
}, []);
```

**Extract complex logic into custom hooks:**
```typescript
// Good
function useCharacterCreation() {
  const [step, setStep] = useState(1);
  // Complex logic here
  return { step, nextStep, prevStep };
}

function CharacterCreationWizard() {
  const { step, nextStep } = useCharacterCreation();
  return <div>...</div>;
}

// Bad - all logic in component
function CharacterCreationWizard() {
  const [step, setStep] = useState(1);
  // 100 lines of logic here
  return <div>...</div>;
}
```

### Code Organization

**File structure:**
```
src/
├── components/
│   ├── CharacterCard/
│   │   ├── CharacterCard.tsx          # Component
│   │   ├── CharacterCard.test.tsx     # Tests
│   │   ├── CharacterCard.stories.tsx  # Storybook (optional)
│   │   └── index.ts                   # Barrel export
```

**Naming conventions:**
- **Components:** PascalCase (`CharacterCard.tsx`)
- **Hooks:** camelCase with "use" prefix (`useCharacterData.ts`)
- **Utilities:** camelCase (`formatDate.ts`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_LEVEL = 20`)
- **Types/Interfaces:** PascalCase (`interface CharacterData`)

**Import order:**
```typescript
// 1. External libraries
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal modules (absolute imports)
import { Button } from '@/components/ui/Button';
import { useCharacters } from '@/hooks/useCharacters';

// 3. Relative imports
import { calculateModifier } from './utils';
import styles from './CharacterCard.module.css';

// 4. Types
import type { Character } from '@/types';
```

### Error Handling

**Always handle errors:**
```typescript
// Good
try {
  const character = await characterService.create(data);
  return character;
} catch (error) {
  if (error instanceof ValidationError) {
    throw new Error(`Invalid character data: ${error.message}`);
  }
  throw error;
}

// Bad
const character = await characterService.create(data);
return character;
```

**Use appropriate HTTP status codes:**
```typescript
// 200 - Success
res.status(200).json({ data: character });

// 201 - Created
res.status(201).json({ data: character });

// 400 - Bad Request (client error)
res.status(400).json({ error: 'Invalid input' });

// 401 - Unauthorized
res.status(401).json({ error: 'Authentication required' });

// 403 - Forbidden
res.status(403).json({ error: 'Access denied' });

// 404 - Not Found
res.status(404).json({ error: 'Character not found' });

// 500 - Internal Server Error
res.status(500).json({ error: 'Internal server error' });
```

### Performance Considerations

**Memoize expensive computations:**
```typescript
const modifier = useMemo(
  () => calculateModifier(abilityScore),
  [abilityScore]
);
```

**Use React.memo for expensive components:**
```typescript
export const CharacterCard = React.memo(({ character }: Props) => {
  return <div>...</div>;
});
```

**Avoid unnecessary re-renders:**
```typescript
// Good - stable reference
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// Bad - new function on every render
const handleClick = () => {
  doSomething(id);
};
```

---

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat:** New feature
- **fix:** Bug fix
- **docs:** Documentation changes
- **style:** Code style changes (formatting, missing semicolons, etc.)
- **refactor:** Code refactoring
- **test:** Adding or updating tests
- **chore:** Maintenance tasks (build, dependencies, etc.)
- **perf:** Performance improvements

### Examples

**Simple commit:**
```
feat: add spell slot tracking

Implements spell slot management for spellcasting classes.
Tracks used slots and allows rest to restore them.
```

**With scope:**
```
fix(combat): correct initiative tie-breaking logic

When two creatures have the same initiative, now correctly uses
dexterity modifier as tiebreaker per D&D 5E rules.

Fixes #123
```

**Breaking change:**
```
feat(api): change character creation endpoint response format

BREAKING CHANGE: The character creation endpoint now returns
a different response format. Update clients accordingly.

Before: { character: {...} }
After: { data: {...}, meta: {...} }
```

### Best Practices

- **Use imperative mood:** "add feature" not "added feature"
- **Be concise:** Keep subject line under 50 characters
- **Be descriptive:** Explain what and why, not how
- **Reference issues:** Use "Fixes #123" or "Closes #456"
- **Separate concerns:** One logical change per commit

---

## Pull Request Process

### Before Submitting

1. **Self-review your code**
2. **Run all tests** - `npm test && npm run e2e`
3. **Check linting** - `npm run lint`
4. **Update documentation** if needed
5. **Rebase on latest main** - `git rebase upstream/main`

### PR Template

Fill out the PR template completely:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests pass locally
- [ ] Dependent changes merged

## Screenshots (if applicable)
Add screenshots of UI changes
```

### Review Process

1. **Automated checks run** (CI)
2. **Code review** by maintainers
3. **Requested changes** addressed
4. **Approval** from at least one maintainer
5. **Merge** to main branch

### Addressing Review Comments

```bash
# Make requested changes
# Commit them
git commit -m "fix: address review comments"

# Push to your branch
git push origin feature/my-feature
```

### After Merge

1. **Delete your branch** on GitHub
2. **Update your local repository:**
   ```bash
   git checkout main
   git pull upstream main
   git branch -d feature/my-feature
   ```

---

## Testing Requirements

### Coverage Requirements

- **Minimum:** 80% coverage for statements, branches, functions, and lines
- **New code:** Should have 100% test coverage when possible
- **Critical paths:** Must have comprehensive tests

### What to Test

**Unit Tests:**
- Utility functions
- Business logic
- Data transformations
- Calculations (modifiers, damage, etc.)

**Integration Tests:**
- API endpoints
- Database operations
- Service interactions

**E2E Tests:**
- Critical user flows
- Authentication
- Character creation
- Game session

### Testing Best Practices

- **Write tests first** (TDD) when fixing bugs
- **Test behavior,** not implementation
- **Use descriptive test names**
- **One assertion per test** when possible
- **Mock external dependencies**
- **Keep tests independent**

### Example Test

```typescript
describe('calculateModifier', () => {
  it('should return correct modifier for ability score 10', () => {
    expect(calculateModifier(10)).toBe(0);
  });

  it('should return correct modifier for ability score 18', () => {
    expect(calculateModifier(18)).toBe(4);
  });

  it('should return correct modifier for ability score 8', () => {
    expect(calculateModifier(8)).toBe(-1);
  });

  it('should handle edge case of ability score 1', () => {
    expect(calculateModifier(1)).toBe(-5);
  });
});
```

See [TESTING.md](/home/user/ai-adventure-scribe-main/TESTING.md) for comprehensive testing guide.

---

## Documentation

### When to Update Docs

Update documentation when:
- Adding new features
- Changing APIs
- Modifying configuration
- Adding dependencies
- Changing architecture

### Documentation Files

- **README.md** - Project overview and quick start
- **ARCHITECTURE.md** - System architecture and design
- **DEVELOPMENT.md** - Development setup and workflow
- **TESTING.md** - Testing guidelines
- **DEPLOYMENT.md** - Deployment instructions
- **SECURITY.md** - Security practices
- **TROUBLESHOOTING.md** - Common issues and solutions

### Code Comments

**When to comment:**
- Complex algorithms
- Non-obvious business logic
- Workarounds or hacks
- Important decisions

**When NOT to comment:**
- Obvious code
- Well-named functions/variables
- Code that explains itself

```typescript
// Good - explains WHY
// Use dexterity modifier for initiative per D&D 5E rules
const initiative = d20Roll + dexterityModifier;

// Bad - explains WHAT (obvious from code)
// Add dexterity modifier to d20 roll
const initiative = d20Roll + dexterityModifier;
```

---

## Issue Guidelines

### Before Creating an Issue

1. **Search existing issues** - Your issue may already exist
2. **Check documentation** - Your question may be answered
3. **Try latest version** - Bug may be fixed

### Bug Reports

Use the bug report template and include:
- **Description** - Clear description of the bug
- **Steps to reproduce** - Exact steps to trigger the bug
- **Expected behavior** - What should happen
- **Actual behavior** - What actually happens
- **Environment** - OS, Node version, browser, etc.
- **Logs** - Error messages and stack traces
- **Screenshots** - If applicable

### Feature Requests

Use the feature request template and include:
- **Problem** - What problem does this solve?
- **Solution** - Proposed solution
- **Alternatives** - Other solutions considered
- **Additional context** - Mockups, examples, etc.

### Questions

- Use GitHub Discussions for questions
- Be specific and include context
- Search first - question may be answered

---

## Community

### Where to Get Help

- **GitHub Discussions** - Questions and community help
- **GitHub Issues** - Bug reports and feature requests
- **Discord** - Real-time chat (if available)

### Contributing Beyond Code

- **Report bugs** - Help us improve quality
- **Suggest features** - Share your ideas
- **Improve documentation** - Fix typos, clarify instructions
- **Help others** - Answer questions in discussions
- **Write tutorials** - Share your knowledge
- **Spread the word** - Blog posts, social media

### Recognition

Contributors are recognized in:
- Release notes
- CONTRIBUTORS.md file
- GitHub contributors page

---

## License

By contributing to InfiniteRealms, you agree that your contributions will be licensed under the same license as the project (see LICENSE file).

---

## Questions?

If you have questions about contributing, please:
1. Check this guide first
2. Search GitHub Discussions
3. Ask in Discord (if available)
4. Open a GitHub Discussion

Thank you for contributing to InfiniteRealms!

---

**Document Version:** 1.0
**Last Updated:** 2025-11-14
**Maintained By:** Development Team
