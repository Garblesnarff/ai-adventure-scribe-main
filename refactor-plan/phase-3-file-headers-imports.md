# Phase 3: File Headers and Import Organization

Add standardized file headers and organize imports in every file.

---

## **Goals**

- Improve code clarity and maintainability
- Make files self-describing for humans and LLMs
- Enforce consistent import grouping and ordering

---

## **Steps**

### 1. Add File Headers

For **every file**, add a comment block at the top with:

- **File purpose**
- **Main classes/functions contained**
- **Dependencies** (internal and external)
- **Author information**
- **Any important notes**

**Example:**

```typescript
/**
 * Campaign Wizard Component
 * 
 * Multi-step wizard for creating campaigns.
 * 
 * Dependencies:
 * - React
 * - Campaign context (src/contexts/CampaignContext.tsx)
 * - Step components (src/components/campaign-creation/steps/)
 * 
 * @author AI Dungeon Master Team
 */
```

---

### 2. Organize Imports

- **Group imports** into:
  - SDK/library imports (React, Supabase, etc.)
  - Project modules (contexts, hooks, components)
  - Utilities/helpers
- **Sort imports alphabetically within groups**
- **Add comments** separating groups

**Example:**

```typescript
// SDK imports
import React from 'react';
import { useState } from 'react';

// Project modules
import { CampaignContext } from '@/contexts/CampaignContext';
import { StepOne } from './steps/StepOne';

// Utilities
import { formatDate } from '@/utils/dateUtils';
```

---

### 3. Verify

- Ensure **all files** have headers and organized imports.
- Use your IDE or linters to help enforce ordering.

---

## **Outcome**

A codebase with **clear, consistent file documentation** and **well-organized imports**, improving readability and LLM understanding.
