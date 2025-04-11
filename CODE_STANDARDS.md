# Coding Standards and Guidelines

This document outlines coding standards designed to optimize our codebase for both human readability and LLM (Large Language Model) assistance. These standards will make our code more maintainable and easier for AI tools to navigate, understand, and modify.

## File Size and Organization

1. **Maximum File Length**: 
   - Keep files under 200 lines of code
   - If a file grows beyond this limit, consider refactoring into smaller, focused modules

2. **Single Responsibility Principle**:
   - Each file should handle one specific concept or functionality
   - Functions should do one thing and do it well
   - Classes should represent a single, coherent entity or system

3. **Logical Grouping**:
   - Group related files into directories based on functionality
   - Avoid deeply nested directory structures (aim for max 3-4 levels deep)
   - Use clear, descriptive directory names

## Documentation Requirements

1. **Directory Documentation**:
   - Every directory MUST have a README.md file
   - The README should explain:
     - Purpose of the directory
     - List of important files with brief descriptions
     - How components in this directory interact
     - Usage examples where appropriate

2. **File Headers**:
   - Each file should begin with a comment block describing:
     - File purpose
     - Main functions/classes contained
     - Dependencies
     - Author information

3. **Function Documentation**:
   - Document each function with:
     - Description of purpose
     - Parameters and their types
     - Return values
     - Side effects (if any)
     - Example usage for complex functions

## Naming Conventions

1. **Descriptive Names**:
   - Use descriptive, self-explanatory variable and function names
   - Avoid abbreviations except for widely understood ones
   - Use consistent naming patterns across the codebase

2. **Naming Format**:
   - Files: kebab-case.js (e.g., entity-spawner.js)
   - Directories: kebab-case (e.g., game-systems)
   - Functions: camelCase (e.g., spawnEntity)
   - Classes: PascalCase (e.g., ResourceManager)
   - Constants: UPPER_SNAKE_CASE (e.g., MAX_PLAYERS)

## Code Structure

1. **Import Organization**:
   - Group imports by type (HYTOPIA SDK, project modules, utilities)
   - Sort imports alphabetically within groups
   - Add comments to separate import groups

2. **Function Length**:
   - Keep functions under 30 lines where possible
   - Extract complex logic into helper functions with descriptive names

3. **Consistent Formatting**:
   - Use consistent indentation (2 spaces recommended)
   - Add blank lines between logical sections
   - Use consistent brace style

## LLM-Specific Optimizations

1. **Code Segmentation**:
   - Use clear comment headers to mark different sections of code
   - Add context-providing comments before complex logic

2. **Type Information**:
   - Include type information in comments or use JSDoc
   - Describe object structures and function parameters explicitly

3. **State Management**:
   - Document state mutations clearly
   - Keep state changes localized and explicit

4. **Reference Linking**:
   - Add comments with file paths when referencing functionality in other files
   - Use consistent reference format: `// See: /path/to/file.js`

5. **Implementation Notes**:
   - Explain WHY code is written a certain way, not just WHAT it does
   - Document any non-obvious design decisions or optimizations

## Example Structure

Every component should follow this general documentation pattern:

```javascript
/**
 * COMPONENT_NAME - Brief description
 * 
 * Detailed explanation of what this component does and its role in the system.
 * Include any important notes about usage or limitations.
 * 
 * Dependencies:
 * - List dependencies
 * 
 * @author Your Name
 */

// Imports grouped and commented
// HYTOPIA SDK imports
import { Entity, World } from 'hytopia';

// Project modules
import { ResourceType } from '../constants/resource-types.js';
import { createItemDrop } from '../utils/item-factory.js';

// ====================================
// Constants and configuration
// ====================================
const MAX_SPAWN_COUNT = 10;

// ====================================
// Main functionality
// ====================================

/**
 * Creates a resource entity at the specified position
 * 
 * @param {World} world - The game world instance
 * @param {Object} position - Position coordinates
 * @param {number} position.x - X coordinate
 * @param {number} position.y - Y coordinate
 * @param {number} position.z - Z coordinate
 * @param {ResourceType} resourceType - Type of resource to spawn
 * @returns {Entity} The created resource entity
 */
function spawnResource(world, position, resourceType) {
  // Implementation...
}

// Export functions
export {
  spawnResource
};
```

Following these standards will help ensure our codebase remains clean, maintainable, and optimal for both human and AI assistance.
