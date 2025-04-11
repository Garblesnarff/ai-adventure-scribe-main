# Phase 7: Implementation Notes and References

Add design notes, rationale, and reference links throughout the codebase.

---

## **Goals**

- Explain **why** code is written a certain way
- Document **non-obvious design decisions**
- Help future developers and LLMs understand context
- Link related files for easier navigation

---

## **Steps**

### 1. Add Implementation Notes

- Before or inside complex logic blocks
- Explain:
  - **Why** a certain approach was chosen
  - **Trade-offs** or limitations
  - **Workarounds** or known issues
  - **Performance considerations**

**Example:**

```typescript
// Note: We debounce this API call to avoid rate limiting issues.
// This was necessary because rapid user input caused 429 errors.
```

---

### 2. Add Reference Links

- When referencing related code, add comments like:

```typescript
// See: src/utils/validation.ts for input validation helpers
// See: src/agents/services/response/ResponseCoordinator.ts for response generation
```

- Helps LLMs and humans trace dependencies quickly.

---

### 3. Review and Verify

- Ensure all **non-trivial code** has context-providing comments.
- Avoid redundant or obvious comments.
- Focus on **explaining intent and reasoning**.

---

## **Outcome**

A codebase with **rich contextual documentation**, making it easier to understand, maintain, and extend.
