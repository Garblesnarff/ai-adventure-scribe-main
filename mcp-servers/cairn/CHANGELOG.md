# Changelog

All notable changes to the Cairn MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-18

### Added

#### Tools
- `resolve_save` - Saving throw resolution with advantage/disadvantage
- `resolve_attack` - Attack resolution with impaired/enhanced conditions
- `apply_damage` - Damage application with armor reduction
- `resolve_critical_damage` - Critical damage with STR saves and scar rolls
- `roll_scar` - Scar table lookup (d100)
- `add_fatigue` - Fatigue management with inventory tracking
- `resolve_rest` - Short and long rest mechanics

#### Resources
- `cairn://equipment/weapons` - 15 weapons with damage dice and properties
- `cairn://equipment/armor` - 7 armor types with reduction values
- `cairn://equipment/gear` - 20+ adventuring gear items
- `cairn://scars` - Complete d100 scar table
- `cairn://spellbooks` - 100 spellbooks from Cairn SRD
- `cairn://traits` - Character backgrounds and physical traits

#### Prompts
- `cairn_combat` - Combat resolution guide
- `critical_damage` - Critical damage flow guide
- `inventory_management` - 10-slot inventory template

#### Documentation
- README.md with complete API documentation
- EXAMPLES.md with usage scenarios
- Inline code documentation

#### Data
- Comprehensive weapon list (1d4 to 1d10 damage)
- Armor types (1-3 damage reduction)
- Spellbook descriptions
- Character trait tables
- Scar table with mechanical effects

### Features
- Full MCP TypeScript SDK integration
- Stdio transport for easy integration
- JSON-based data storage
- Deterministic dice rolling utilities
- Error handling and validation
- Type-safe implementation

### Technical Details
- TypeScript 5.5.3
- MCP SDK 0.6.1
- Node 16+ compatible
- ESM module format
- Comprehensive type definitions
