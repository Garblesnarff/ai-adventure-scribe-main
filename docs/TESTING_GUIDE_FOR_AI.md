# TESTING GUIDE FOR AI CODERS

## Test Organization

**By type:**
- Unit tests: Single function/component in isolation
- Integration tests: Multiple parts working together
- E2E tests: Full user workflows

**Our structure:**
- Unit tests: Keep alongside component files or in __tests__/unit/
- Integration tests: In __tests__/integration/
- E2E tests: In e2e/

## Writing Character-Related Tests

**Template: Unit test for character save function**
```typescript
describe('saveCharacter', () => {
  it('should save character with all required fields', async () => {
    // Setup
    const character = {
      name: 'Aragorn',
      race: { id: 'human', name: 'Human' },
      class: { id: 'fighter', name: 'Fighter' }
    };

    // Execute
    const saved = await saveCharacter(character);

    // Assert: Character saved with correct data
    expect(saved.id).toBeDefined();
    expect(saved.name).toBe('Aragorn');
    expect(saved.race.id).toBe('human');
  });

  it('should reject character without name', async () => {
    const character = {
      name: '',  // Empty name invalid
      race: { id: 'human' },
      class: { id: 'fighter' }
    };

    // Assert: Should throw or return error
    await expect(saveCharacter(character)).rejects.toThrow('name is required');
  });
});
```

**Template: Integration test for full workflow**
```typescript
describe('Character creation workflow', () => {
  it('should create character from UI through database', async () => {
    // Setup: Mock user login
    const user = { id: 'user_123', email: 'test@example.com' };

    // Execute: Full wizard flow
    await createCharacter(user, {
      name: 'Legolas',
      race: 'elf',
      class: 'ranger'
    });

    // Verify: Character in database
    const saved = await getCharacterById(user.id, 'legolas_id');
    expect(saved).toBeDefined();

    // Verify: User can load character
    const characters = await listUserCharacters(user.id);
    expect(characters).toContainEqual(expect.objectContaining({ name: 'Legolas' }));
  });
});
```

## Mocking Strategy

**Mock Supabase for unit tests:**
```typescript
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      }))
    }))
  }))
}));
```

**Use real Supabase for integration tests** (or detailed mock).

## What to Test

**Critical paths (MUST TEST):**
- [ ] Character save with valid data → Success
- [ ] Character save with missing required field → Error
- [ ] User quota enforcement → Free user max 5 characters
- [ ] User authentication → Invalid token rejected
- [ ] Data isolation → User can't see other users' characters

**Good to test:**
- [ ] Edge cases (very long name, special characters)
- [ ] Concurrent operations (two saves at same time)
- [ ] Error recovery (retry after transient failure)

**Lower priority:**
- [ ] UI animation timing
- [ ] Button hover states
- [ ] Perfect pixel alignment

## Running Tests

```bash
# All tests
npm run server:test

# Specific file
npm run server:test -- server/tests/payment.test.ts

# With coverage
npm run server:test -- --coverage

# Watch mode (re-run on file change)
npm run server:test -- --watch
```
