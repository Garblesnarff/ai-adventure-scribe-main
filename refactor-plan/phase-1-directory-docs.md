# Phase 1: Directory Documentation

Create comprehensive `README.md` files for all key directories and subdirectories to improve project navigation and understanding.

---

## **Goals**

- Explain the **purpose** of each directory
- List **important files/components** with brief descriptions
- Describe **interactions** between components/services
- Provide **usage examples** where relevant

---

## **Target Directories**

- `src/agents/` and subfolders
- `src/components/` and subfolders
- `src/hooks/`
- `src/utils/`
- `src/contexts/`
- `src/data/`
- `src/integrations/`
- `src/types/`

---

## **Steps**

1. For each directory:
   - Create a `README.md` file if missing.
   - Include:
     - **Purpose** of the directory
     - **List of important files** with 1-2 sentence descriptions
     - **How components/services interact**
     - **Usage examples** (code snippets or explanations)
2. For subdirectories (e.g., `components/campaign-creation/`):
   - Add a focused README explaining that feature/module.
3. Use consistent formatting and clear language.
4. Link to related directories or files where helpful.

---

## **Example Outline**

```markdown
# Campaign Creation Components

Components for the multi-step campaign creation wizard.

## Files

- `campaign-wizard.tsx`: Container component managing wizard state
- `step-one.tsx`: Step 1 UI and logic
- `step-two.tsx`: Step 2 UI and logic

## Interaction

`campaign-wizard.tsx` composes all steps and manages navigation.

## Usage

Import `CampaignWizard` and render inside a page or modal.
```

---

## **Outcome**

A well-documented directory structure that accelerates onboarding and improves LLM understanding.
