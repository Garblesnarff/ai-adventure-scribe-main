# LangGraph Migration Rollout Plan

## Executive Summary

This document outlines the gradual migration strategy from the custom messaging system to LangGraph for AI agent interactions. The migration is designed to be:

- **Safe**: Feature-flagged with automatic fallback
- **Gradual**: Phased rollout with monitoring at each step
- **Reversible**: Easy rollback procedures if issues arise
- **Transparent**: Comprehensive monitoring and metrics

## Current State

### Custom Messaging System
- **Location**: `src/agents/messaging/` (34 files)
- **Status**: Production-ready, stable
- **Features**: Message queue, persistence, offline support, connection management
- **Complexity**: High - custom-built solution with many moving parts

### LangGraph System
- **Location**: `src/agents/langgraph/` (18 files)
- **Status**: Feature-complete with 100% test coverage
- **Features**: State management, persistence, streaming, message history
- **Performance**: Comparable to custom system (~5-10ms overhead)
- **Test Results**: 100% pass rate, production-ready

## Migration Architecture

### Dual-System Approach

Both systems run side-by-side during the migration:

```
┌─────────────────────────────────────────────────────────────┐
│                      AIService.chatWithDM                    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Feature Flag Check: VITE_FEATURE_USE_LANGGRAPH        │ │
│  └─────────────────┬──────────────────────────────────────┘ │
│                    │                                         │
│         ┌──────────┴──────────┐                             │
│         │                     │                             │
│    ┌────▼─────┐         ┌────▼──────┐                      │
│    │ LangGraph│         │  Legacy   │                      │
│    │  System  │         │  System   │                      │
│    │          │         │           │                      │
│    │ - DMService        │ - Gemini  │                      │
│    │ - State Mgmt       │ - Custom  │                      │
│    │ - Checkpointer     │   Logic   │                      │
│    └────┬─────┘         └────┬──────┘                      │
│         │                     │                             │
│         │   ┌─────────────────┘                             │
│         │   │                                               │
│         ▼   ▼                                               │
│   ┌─────────────────┐                                      │
│   │  Monitoring     │                                      │
│   │  - Metrics      │                                      │
│   │  - Performance  │                                      │
│   │  - Errors       │                                      │
│   └─────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
```

### Components

1. **Feature Flag**: `VITE_FEATURE_USE_LANGGRAPH`
   - Location: `.env` files
   - Default: `false` (safe default)
   - Enables: LangGraph system

2. **Legacy Compatibility Adapter**: `src/agents/langgraph/adapters/legacy-compatibility.ts`
   - Wraps LangGraph DMService
   - Provides same interface as current AIService
   - Handles format conversions
   - Zero breaking changes

3. **Migration Monitoring**: `src/services/migration-monitoring.ts`
   - Tracks system usage (legacy vs LangGraph)
   - Records performance metrics
   - Monitors error rates
   - Provides comparison data

4. **Automatic Fallback**
   - If LangGraph fails, automatically falls back to legacy
   - Fallback events are logged and monitored
   - No user-facing errors during migration

## Rollout Phases

### Phase 1: Internal Testing (Week 1)
**Goal**: Validate LangGraph in controlled environment

**Actions**:
1. Enable feature flag on development machines
   ```bash
   VITE_FEATURE_USE_LANGGRAPH=true
   ```
2. Run full test suite
3. Manual testing of core workflows:
   - Campaign creation
   - Character interactions
   - Combat scenarios
   - Dice rolling
   - Session persistence
4. Review monitoring metrics
5. Fix any issues found

**Success Criteria**:
- All automated tests pass
- Manual testing shows equivalent functionality
- No critical bugs found
- Performance within acceptable range (< 10% overhead)
- Zero data loss in checkpointing

**Rollback Plan**: Simply disable flag in `.env`

---

### Phase 2: Beta Testing (Week 2-3)
**Goal**: Validate with real users in production

**Actions**:
1. Enable for 10% of users via canary deployment
   - Random selection OR
   - Specific beta testers OR
   - New sessions only
2. Monitor metrics closely:
   - Success rate
   - Error rate
   - Performance
   - User feedback
3. Weekly review of metrics
4. Address any issues found

**Deployment Strategy**:
```javascript
// Example: Percentage-based rollout
const LANGGRAPH_ROLLOUT_PERCENTAGE = 10; // 10% of users

function shouldUseLangGraph(userId: string): boolean {
  if (import.meta.env.VITE_FEATURE_USE_LANGGRAPH === 'true') {
    return true;
  }

  // Hash user ID and use modulo for consistent assignment
  const hash = hashString(userId);
  return (hash % 100) < LANGGRAPH_ROLLOUT_PERCENTAGE;
}
```

**Success Criteria**:
- LangGraph success rate ≥ 99%
- Performance within 10% of legacy
- No user-reported critical bugs
- Fallback rate < 1%
- Positive or neutral user feedback

**Rollback Plan**:
1. Reduce rollout percentage to 0%
2. Monitor for 24 hours
3. If stable, analyze issues
4. If unstable, disable feature flag entirely

---

### Phase 3: Gradual Rollout (Week 4-8)
**Goal**: Incrementally increase LangGraph adoption

**Timeline**:
- **Week 4**: 25% rollout
- **Week 5**: 50% rollout (if 25% is stable)
- **Week 6**: 75% rollout (if 50% is stable)
- **Week 7**: 90% rollout (if 75% is stable)
- **Week 8**: 100% rollout (if 90% is stable)

**Monitoring Points**:
At each stage, verify:
- Success rate remains ≥ 99%
- Error rate stays low
- Performance is acceptable
- User experience is unchanged
- No data integrity issues

**Stage Gates**:
Each stage requires:
1. 48 hours of stable operation
2. Metrics review approval
3. No critical bugs in backlog
4. Go/no-go decision

**Rollback at Each Stage**:
- Reduce to previous percentage
- Monitor for 24 hours
- Investigate issues
- Fix and retry OR abort migration

---

### Phase 4: Cleanup (Week 9-10)
**Goal**: Remove custom messaging system

**Prerequisites**:
- 100% rollout for 1+ week
- Zero critical issues
- All metrics healthy
- User feedback positive

**Actions**:
1. **Code Cleanup**:
   - Remove feature flag checks
   - Set LangGraph as default
   - Archive custom messaging code (don't delete yet)
   - Update documentation

2. **Remove Legacy Code** (Week 10):
   ```
   src/agents/messaging/          → Archive to git history
   Legacy AIService logic         → Remove
   Feature flag infrastructure    → Remove
   ```

3. **Documentation**:
   - Update architecture docs
   - Update developer guides
   - Create migration retrospective
   - Document lessons learned

**Final Validation**:
- Run full test suite
- Performance testing
- Security review
- Documentation review

---

## Monitoring & Metrics

### Key Metrics to Track

1. **System Usage**
   - % of requests using LangGraph
   - % of requests using legacy
   - Fallback rate

2. **Performance**
   - Average response time (LangGraph vs Legacy)
   - P50, P95, P99 latencies
   - Throughput (requests/second)

3. **Reliability**
   - Success rate (LangGraph vs Legacy)
   - Error rate and types
   - Fallback frequency
   - Data integrity checks

4. **User Experience**
   - Response quality (manual review)
   - User feedback/complaints
   - Session continuity
   - Feature parity

### Monitoring Tools

**Built-in Migration Monitoring**:
```typescript
import migrationMonitoringService from '@/services/migration-monitoring';

// View current metrics
const metrics = migrationMonitoringService.getAllMetrics();
console.log(metrics);

// View comparison
const comparison = migrationMonitoringService.getComparison();
console.log(comparison);

// Export for analysis
const exportData = migrationMonitoringService.exportMetrics();
```

**Logging**:
- All LangGraph calls logged with `[LangGraph]` prefix
- All fallbacks logged with `[AIService]` warning
- Monitoring service logs summary every 10 interactions

**Dashboards** (Future):
- Real-time adoption rate
- Error rate comparison
- Performance comparison
- Fallback trends

---

## Risk Management

### Identified Risks

1. **Data Loss**
   - **Risk**: Checkpoint persistence fails
   - **Mitigation**: Extensive testing of SupabaseCheckpointer
   - **Fallback**: Legacy system continues to work

2. **Performance Degradation**
   - **Risk**: LangGraph is slower than legacy
   - **Mitigation**: Performance tests show < 10ms overhead
   - **Fallback**: Roll back percentage if latency increases

3. **Feature Gaps**
   - **Risk**: LangGraph missing features
   - **Mitigation**: Legacy compatibility adapter handles all features
   - **Fallback**: Enhance adapter or delay migration

4. **Integration Issues**
   - **Risk**: LangGraph incompatible with existing code
   - **Mitigation**: Comprehensive integration tests
   - **Fallback**: Fix issues in compatibility adapter

5. **User Impact**
   - **Risk**: Users experience degraded service
   - **Mitigation**: Gradual rollout with monitoring
   - **Fallback**: Immediate rollback if issues detected

### Emergency Rollback Procedure

**If critical issue detected**:

1. **Immediate** (< 5 minutes):
   ```bash
   # Set rollout to 0% or disable flag entirely
   VITE_FEATURE_USE_LANGGRAPH=false
   ```

2. **Short-term** (< 1 hour):
   - Deploy fix to disable LangGraph
   - Monitor legacy system stability
   - Communicate status to team

3. **Recovery** (< 24 hours):
   - Analyze root cause
   - Determine fix strategy
   - Plan re-migration timeline

4. **Post-Mortem** (< 1 week):
   - Write incident report
   - Update tests to catch issue
   - Review rollout process
   - Plan improvements

---

## Testing Strategy

### Pre-Rollout Testing

1. **Unit Tests**: All LangGraph tests passing (100% coverage)
2. **Integration Tests**: End-to-end workflows tested
3. **Performance Tests**: Benchmarks meet requirements
4. **Manual Testing**: QA team validates core features

### During Rollout Testing

1. **Canary Testing**: Small user group validates production behavior
2. **A/B Comparison**: Side-by-side metrics comparison
3. **Soak Testing**: Long-running stability validation
4. **Load Testing**: Handle production traffic volumes

### Post-Rollout Testing

1. **Regression Testing**: Ensure no features broken
2. **Performance Testing**: Validate production metrics
3. **User Acceptance**: Gather user feedback

---

## Communication Plan

### Internal Team

**Weekly Updates**:
- Current rollout percentage
- Key metrics
- Issues encountered
- Next steps

**Channels**:
- Team meetings
- Slack/Discord updates
- Email summaries

### Users

**No user communication needed** unless:
- Critical issues detected
- Major performance changes
- Feature changes

Reason: Migration is transparent to users

---

## Success Metrics

### Overall Migration Success

The migration is considered successful when:

1. **Adoption**: 100% of requests using LangGraph
2. **Stability**: ≥ 99.9% success rate for 1 week
3. **Performance**: Within 10% of legacy system
4. **Quality**: User experience equivalent or better
5. **Cleanup**: Legacy code removed from codebase

### Per-Phase Success

Each phase has specific criteria (detailed above).

---

## Timeline Summary

| Phase | Duration | Rollout % | Key Milestone |
|-------|----------|-----------|---------------|
| Phase 1: Internal Testing | Week 1 | 0% (dev only) | Validate in development |
| Phase 2: Beta Testing | Week 2-3 | 10% | Validate in production |
| Phase 3a: Gradual Rollout | Week 4 | 25% | Expand user base |
| Phase 3b: Gradual Rollout | Week 5 | 50% | Majority testing |
| Phase 3c: Gradual Rollout | Week 6 | 75% | Near-full adoption |
| Phase 3d: Gradual Rollout | Week 7 | 90% | Final validation |
| Phase 3e: Full Rollout | Week 8 | 100% | Complete migration |
| Phase 4: Cleanup | Week 9-10 | 100% | Remove legacy code |

**Total Timeline**: ~10 weeks (2.5 months)

---

## Developer Guide

### Enabling LangGraph Locally

**For Testing**:
```bash
# In your .env.local file
VITE_FEATURE_USE_LANGGRAPH=true
```

**Restart your dev server**:
```bash
npm run dev
```

**Verify**:
Look for log messages like:
```
[AIService] Using LangGraph agent system (VITE_FEATURE_USE_LANGGRAPH=true)
```

### Monitoring During Development

**View Metrics in Console**:
```typescript
import migrationMonitoringService from '@/services/migration-monitoring';

// Get current metrics
migrationMonitoringService.logSummary();

// Get detailed comparison
const comparison = migrationMonitoringService.getComparison();
console.table(comparison);
```

### Debugging LangGraph Issues

**Enable Debug Logging**:
```typescript
// In ai-service.ts or legacy-compatibility.ts
import logger from '@/lib/logger';

logger.setLevel('debug'); // Show all debug messages
```

**Check Checkpoint State**:
```typescript
import { getDMService } from '@/agents/langgraph/dm-service';

const dmService = getDMService();
const history = await dmService.getCheckpointHistory('session-id', 10);
console.log(history);
```

### Adding New Features

When adding features during migration:

1. **Implement in LangGraph first** (future-proof)
2. **Add to legacy compatibility adapter** (backwards compatibility)
3. **Test both paths** (ensure parity)
4. **Update tests** (maintain coverage)

---

## Appendix

### A. File Structure

```
src/
├── agents/
│   ├── langgraph/                    # New LangGraph system
│   │   ├── adapters/
│   │   │   └── legacy-compatibility.ts  # Bridge to legacy interface
│   │   ├── dm-service.ts              # Main LangGraph service
│   │   ├── dm-graph.ts                # Graph definition
│   │   ├── state.ts                   # State management
│   │   └── persistence/
│   │       └── supabase-checkpointer.ts
│   └── messaging/                     # Legacy custom system (to be archived)
│       └── ... (34 files)
├── services/
│   ├── ai-service.ts                  # Main AI service (updated with feature flag)
│   └── migration-monitoring.ts        # Migration metrics
└── .env.example                       # Feature flag documentation
```

### B. Environment Variables

```bash
# LangGraph Migration Feature Flag
VITE_FEATURE_USE_LANGGRAPH=false

# Options:
# - false (default): Use legacy system
# - true: Use LangGraph system with automatic fallback
```

### C. Related Documentation

- [LangGraph Implementation Docs](../analysis/langgraph-test-results.md)
- [Performance Test Results](../analysis/langgraph-test-results.md)
- [Migration Test Plan](../analysis/langgraph-migration-recommendation.md)

### D. Contact & Support

**Questions about migration?**
- Check migration monitoring metrics
- Review this document
- Check test results documentation

**Issues during rollout?**
- Follow emergency rollback procedure
- Log detailed error information
- Create incident report

---

## Conclusion

This migration plan provides a **safe, gradual, and reversible** path to adopt LangGraph while maintaining system stability. The dual-system approach ensures:

- **Zero downtime** during migration
- **Automatic fallback** if issues arise
- **Comprehensive monitoring** of the transition
- **Easy rollback** at any phase

With LangGraph's production-ready test results (100% coverage, comparable performance), we're confident in the migration's success. However, the phased approach ensures we can validate each step before proceeding.

**Next Steps**:
1. Review and approve this plan
2. Begin Phase 1 (Internal Testing)
3. Monitor metrics closely
4. Proceed with confidence

---

**Document Version**: 1.0
**Last Updated**: 2025-11-14
**Status**: Ready for Review
