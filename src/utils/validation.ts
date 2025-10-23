/**
 * VALIDATE CHARACTER NAME
 *
 * BUSINESS RULE:
 * - Name is required (player must name their character for immersion)
 * - Must be 1-50 characters (balance between flexibility and UI fit)
 * - Can contain spaces and common punctuation
 *
 * WHY THESE LIMITS:
 * - Min 1: Empty name breaks character sheet display
 * - Max 50: UI character card truncates at 50 chars, looks ugly over
 * - Allowed chars: A-Z, a-z, spaces, hyphen, apostrophe (common in fantasy names)
 *
 * DISALLOWED CHARS:
 * - SQL injection: '; DROP TABLE--  (sanitize with parameterized queries)
 * - XSS: <script>alert('xss')</script>  (escape when rendering)
 * - Control chars: \n, \t  (confuse UI display)
 *
 * VALIDATION:
 * 1. Check: Not empty
 * 2. Check: Not whitespace only
 * 3. Check: Length between 1-50
 * 4. Check: Only allowed characters
 *
 * IF VALIDATION FAILS:
 * - Return error with clear message: "Character name must be 1-50 characters"
 * - Show hint: "Spaces, hyphens, and apostrophes allowed"
 * - Do NOT reject on database - reject in UI/validation layer
 *
 * TESTING:
 * - Valid: "Aragorn", "Gandalf the Grey", "R'ghn'llk", "X-Force"
 * - Invalid: "", "   ", "A"*51, "<XSS>", "'; DROP--", "\n\t"
 */
export function validateCharacterName(name: string): { valid: boolean; error?: string } {
  if (!name || !name.trim()) {
    return { valid: false, error: 'Name is required' };
  }

  if (name.length > 50) {
    return { valid: false, error: 'Name must be 50 characters or less' };
  }

  if (!/^[a-zA-Z\s\-']+$/.test(name)) {
    return { valid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
  }

  return { valid: true };
}

/**
 * Validates if a string is a valid UUID
 * @param {string} uuid - The string to validate
 * @returns {boolean} - True if the string is a valid UUID
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};
