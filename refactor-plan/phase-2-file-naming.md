# Phase 2: File Naming Conventions

Rename all files and directories to follow consistent, descriptive naming patterns.

---

## **Goals**

- Enforce **kebab-case** for all filenames (e.g., `campaign-wizard.tsx`)
- Use **kebab-case** for directory names
- Use **camelCase** for functions
- Use **PascalCase** for classes
- Use **UPPER_SNAKE_CASE** for constants
- Improve clarity and consistency across the codebase

---

## **Steps**

1. **Identify all files** with PascalCase or camelCase names.
2. **Rename files** to kebab-case, e.g.:
   - `CampaignWizard.tsx` → `campaign-wizard.tsx`
   - `CharacterWizard.tsx` → `character-wizard.tsx`
   - `AgentMessagingService.ts` → `agent-messaging-service.ts`
   - `DMResponseGenerator.ts` → `dm-response-generator.ts`
   - `useAgentSystem.ts` → `use-agent-system.ts`
3. **Rename directories** if needed to kebab-case.
4. **Update all import statements** across the codebase to reflect new filenames.
5. **Verify imports** by running the build or type checker.
6. For **constants**, ensure they use `UPPER_SNAKE_CASE`.
7. For **classes**, ensure PascalCase.
8. For **functions and variables**, ensure camelCase.

---

## **Tips**

- Use your IDE's **rename/symbol refactor** features to avoid breaking imports.
- Rename **incrementally** to avoid large, error-prone diffs.
- Commit after each batch of renames.

---

## **Outcome**

A codebase with **clear, consistent, and descriptive naming**, improving readability and LLM compatibility.
