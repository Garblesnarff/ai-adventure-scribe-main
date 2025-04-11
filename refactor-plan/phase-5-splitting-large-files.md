# Phase 5: Splitting Large Files and Functions

Break up large files and long functions into smaller, focused modules and helpers.

---

## **Goals**

- Keep files under **200 lines** for readability
- Keep functions under **30 lines** for clarity
- Enforce **single responsibility** principle
- Improve modularity and testability

---

## **Steps**

### 1. Identify Large Files

- Find files **over 200 lines**.
- Examples might include:
  - `dm-response-generator.ts`
  - `campaign-wizard.tsx`
  - `character-wizard.tsx`
  - Large hooks or services

### 2. Split Large Files

- Extract **helper functions** into separate utility files.
- Separate **container components** from **presentational components**.
- Isolate **services** or **API calls** into their own modules.
- Group related small files into **feature folders**.

### 3. Identify Long Functions

- Find functions **over 30 lines**.
- Break them into **smaller private or helper functions**.
- Name helpers descriptively to clarify intent.

### 4. Add Segmentation Comments

- Use clear comment headers to mark:
  - Constants/config
  - State definitions
  - Lifecycle hooks
  - Event handlers
  - Helper functions
  - Main logic

### 5. Verify

- Ensure **each file and function** has a clear, single responsibility.
- Run tests to confirm no regressions.

---

## **Outcome**

A codebase with **small, focused files and functions**, improving maintainability, readability, and LLM compatibility.
