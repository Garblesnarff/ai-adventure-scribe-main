# InfiniteRealms Documentation

> **Last Updated:** 2025-11-14
> **Documentation Version:** 1.0

Welcome to the InfiniteRealms documentation! This guide will help you navigate all available documentation and find what you need quickly.

---

## Quick Navigation

### For New Users
1. [Project Overview](../README.md) - Start here to understand what InfiniteRealms is
2. [Getting Started](../DEVELOPMENT.md) - Set up your development environment
3. [Architecture Overview](../ARCHITECTURE.md) - Understand how the system works

### For Developers
1. [Development Guide](../DEVELOPMENT.md) - Local development workflow
2. [Testing Guide](../TESTING.md) - How to write and run tests
3. [Contributing Guide](../CONTRIBUTING.md) - How to contribute to the project
4. [Code Quality Standards](./CODE_QUALITY.md) - Linting and formatting

### For DevOps
1. [Deployment Guide](../DEPLOYMENT.md) - How to deploy to production
2. [Troubleshooting Guide](../TROUBLESHOOTING.md) - Common issues and solutions
3. [Database Migrations](./MIGRATIONS.md) - Managing database changes
4. [Performance Monitoring](./PERFORMANCE_DASHBOARD.md) - Metrics and dashboards

### For Security
1. [Security Guidelines](../SECURITY.md) - Security best practices
2. [Rate Limiting](./RATE_LIMITS.md) - API rate limiting configuration
3. [Error Handling](./ERROR_HANDLING.md) - Error patterns and recovery

---

## Documentation Structure

### Root Documentation

Essential documents at the repository root:

| Document | Description | Audience |
|----------|-------------|----------|
| [README.md](../README.md) | Project overview, features, quick start | Everyone |
| [ARCHITECTURE.md](../ARCHITECTURE.md) | System architecture and design decisions | Developers, Architects |
| [DEVELOPMENT.md](../DEVELOPMENT.md) | Local development setup and workflow | Developers |
| [TESTING.md](../TESTING.md) | Testing philosophy, strategy, and guides | Developers, QA |
| [DEPLOYMENT.md](../DEPLOYMENT.md) | Deployment procedures and checklists | DevOps, Operations |
| [SECURITY.md](../SECURITY.md) | Security guidelines and best practices | Security, Developers |
| [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) | Common issues and debugging guides | Everyone |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Contribution guidelines and workflow | Contributors |

### Documentation Directory (`/docs`)

Detailed technical documentation organized by topic:

#### Database Documentation
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Complete schema with ERD diagrams
- [DATABASE_CLIENT.md](./DATABASE_CLIENT.md) - Using Drizzle ORM
- [SCHEMA_IMPROVEMENTS.md](./SCHEMA_IMPROVEMENTS.md) - Schema recommendations
- [MIGRATIONS.md](./MIGRATIONS.md) - Migration workflow and best practices

#### API Documentation
- [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md) - API integration guide
- [ENDPOINT_REFERENCE.md](./ENDPOINT_REFERENCE.md) - API endpoint catalog
- [API_DOCUMENTATION_SUMMARY.md](./API_DOCUMENTATION_SUMMARY.md) - API overview
- [API_DOCUMENTATION_README.md](./API_DOCUMENTATION_README.md) - API getting started

#### Quality & Performance
- [CODE_QUALITY.md](./CODE_QUALITY.md) - Linting and formatting standards
- [TYPESCRIPT_PATTERNS.md](./TYPESCRIPT_PATTERNS.md) - TypeScript best practices
- [ERROR_HANDLING.md](./ERROR_HANDLING.md) - Error patterns and recovery
- [PERFORMANCE_DASHBOARD.md](./PERFORMANCE_DASHBOARD.md) - Metrics and monitoring

#### Operations
- [RATE_LIMITS.md](./RATE_LIMITS.md) - Rate limiting configuration
- [RATE_LIMITS_QUICK_REFERENCE.md](./RATE_LIMITS_QUICK_REFERENCE.md) - Quick rate limit guide
- [SERVICE_TEMPLATE.md](./SERVICE_TEMPLATE.md) - Service design patterns

#### Migration Documentation
- [MIGRATION_CI_CD.md](./MIGRATION_CI_CD.md) - CI/CD migration testing
- [MIGRATION_TESTING_SUMMARY.md](./MIGRATION_TESTING_SUMMARY.md) - Migration test results
- [MIGRATION_TEST_ARCHITECTURE.md](./MIGRATION_TEST_ARCHITECTURE.md) - Migration test design
- [MIGRATION_TEST_OUTPUT.md](./MIGRATION_TEST_OUTPUT.md) - Migration test reports

#### Work Unit Reports
Documentation of completed development work units:

- [WORK_UNIT_3.2_FINAL_REPORT.md](./WORK_UNIT_3.2_FINAL_REPORT.md) - D&D 5E class features implementation
- [WORK_UNIT_3.4_PERFORMANCE_MONITORING_REPORT.md](./WORK_UNIT_3.4_PERFORMANCE_MONITORING_REPORT.md) - Performance monitoring system
- [WORK_UNIT_3.7_DATABASE_ERD_REPORT.md](./WORK_UNIT_3.7_DATABASE_ERD_REPORT.md) - Database ERD documentation
- [WORK_UNIT_3.9_FRONTEND_INTEGRATION_REPORT.md](./WORK_UNIT_3.9_FRONTEND_INTEGRATION_REPORT.md) - Frontend API integration
- [WU2.2-TYPESCRIPT-ANY-REMOVAL-REPORT.md](./WU2.2-TYPESCRIPT-ANY-REMOVAL-REPORT.md) - TypeScript strict typing
- [WU3.5-RATE-LIMITING-DOCUMENTATION-REPORT.md](./WU3.5-RATE-LIMITING-DOCUMENTATION-REPORT.md) - Rate limiting implementation

---

## Documentation by Role

### I'm a Frontend Developer

**Essential Reading:**
1. [Frontend Integration Guide](./FRONTEND_INTEGRATION.md) - How to use the API
2. [TypeScript Patterns](./TYPESCRIPT_PATTERNS.md) - Type safety best practices
3. [Error Handling](./ERROR_HANDLING.md) - Handling API errors
4. [Development Guide](../DEVELOPMENT.md) - Local setup

**Useful References:**
- [API Endpoint Reference](./ENDPOINT_REFERENCE.md)
- [Code Quality](./CODE_QUALITY.md)
- [Testing Guide](../TESTING.md)

### I'm a Backend Developer

**Essential Reading:**
1. [Architecture](../ARCHITECTURE.md) - System design and patterns
2. [Database Schema](./DATABASE_SCHEMA.md) - Database structure
3. [Service Template](./SERVICE_TEMPLATE.md) - Service design patterns
4. [Security Guidelines](../SECURITY.md) - Security best practices

**Useful References:**
- [Database Client](./DATABASE_CLIENT.md)
- [Error Handling](./ERROR_HANDLING.md)
- [Rate Limits](./RATE_LIMITS.md)

### I'm a Database Administrator

**Essential Reading:**
1. [Database Schema](./DATABASE_SCHEMA.md) - Complete schema documentation
2. [Migrations](./MIGRATIONS.md) - Migration workflow
3. [Schema Improvements](./SCHEMA_IMPROVEMENTS.md) - Optimization recommendations
4. [Performance Dashboard](./PERFORMANCE_DASHBOARD.md) - Monitoring queries

**Useful References:**
- [Database Client](./DATABASE_CLIENT.md)
- [Troubleshooting](../TROUBLESHOOTING.md)

### I'm a DevOps Engineer

**Essential Reading:**
1. [Deployment Guide](../DEPLOYMENT.md) - Complete deployment procedures
2. [Performance Monitoring](./PERFORMANCE_DASHBOARD.md) - Metrics and dashboards
3. [Migrations](./MIGRATIONS.md) - Database migration strategy
4. [Rate Limits](./RATE_LIMITS.md) - Rate limiting configuration

**Useful References:**
- [Troubleshooting](../TROUBLESHOOTING.md)
- [Security](../SECURITY.md)
- [Architecture](../ARCHITECTURE.md)

### I'm a QA Engineer

**Essential Reading:**
1. [Testing Guide](../TESTING.md) - Testing strategy and practices
2. [Development Guide](../DEVELOPMENT.md) - Local setup for testing
3. [API Documentation](./FRONTEND_INTEGRATION.md) - API testing

**Useful References:**
- [Troubleshooting](../TROUBLESHOOTING.md)
- [Migration Testing](./MIGRATION_TEST_ARCHITECTURE.md)

### I'm a Security Auditor

**Essential Reading:**
1. [Security Guidelines](../SECURITY.md) - Comprehensive security practices
2. [Architecture](../ARCHITECTURE.md) - Security architecture
3. [Rate Limits](./RATE_LIMITS.md) - DDoS protection
4. [Error Handling](./ERROR_HANDLING.md) - Error security

**Useful References:**
- [Database Schema](./DATABASE_SCHEMA.md) - RLS policies
- [API Documentation](./FRONTEND_INTEGRATION.md) - API security

---

## Documentation by Task

### I Want to...

#### Set Up Development Environment
1. Read [DEVELOPMENT.md](../DEVELOPMENT.md)
2. Follow quick start in [README.md](../README.md)
3. Refer to [Troubleshooting](../TROUBLESHOOTING.md) if issues arise

#### Understand the Architecture
1. Start with [ARCHITECTURE.md](../ARCHITECTURE.md)
2. Review [Database Schema](./DATABASE_SCHEMA.md)
3. Check [Frontend Integration](./FRONTEND_INTEGRATION.md)

#### Add a New Feature
1. Review [Contributing Guide](../CONTRIBUTING.md)
2. Check [Architecture](../ARCHITECTURE.md) for patterns
3. Follow [Testing Guide](../TESTING.md) for tests
4. Update relevant documentation

#### Fix a Bug
1. Check [Troubleshooting](../TROUBLESHOOTING.md) for known issues
2. Review [Testing Guide](../TESTING.md) for test approach
3. Follow [Contributing Guide](../CONTRIBUTING.md) for PR process

#### Deploy to Production
1. Read [Deployment Guide](../DEPLOYMENT.md)
2. Review [Migrations](./MIGRATIONS.md) if database changes
3. Check [Performance Monitoring](./PERFORMANCE_DASHBOARD.md)
4. Follow production checklist

#### Improve Performance
1. Review [Performance Dashboard](./PERFORMANCE_DASHBOARD.md)
2. Check [Database Schema](./DATABASE_SCHEMA.md) for indexes
3. Review [Schema Improvements](./SCHEMA_IMPROVEMENTS.md)

#### Add API Endpoint
1. Review [Service Template](./SERVICE_TEMPLATE.md)
2. Follow [Security Guidelines](../SECURITY.md)
3. Update [Endpoint Reference](./ENDPOINT_REFERENCE.md)
4. Add tests per [Testing Guide](../TESTING.md)

#### Change Database Schema
1. Read [Migrations](./MIGRATIONS.md)
2. Review [Database Schema](./DATABASE_SCHEMA.md)
3. Update [Schema Documentation](./DATABASE_SCHEMA.md)
4. Test with [Migration Testing](./MIGRATION_TEST_ARCHITECTURE.md)

---

## Learning Paths

### Beginner Path

For developers new to the project:

1. **Week 1: Understanding**
   - [ ] Read [README.md](../README.md)
   - [ ] Read [ARCHITECTURE.md](../ARCHITECTURE.md)
   - [ ] Set up development environment ([DEVELOPMENT.md](../DEVELOPMENT.md))
   - [ ] Run the application locally

2. **Week 2: Contributing**
   - [ ] Read [CONTRIBUTING.md](../CONTRIBUTING.md)
   - [ ] Pick a "good first issue" from GitHub
   - [ ] Read relevant documentation for the area
   - [ ] Submit your first PR

3. **Week 3: Testing & Quality**
   - [ ] Read [TESTING.md](../TESTING.md)
   - [ ] Write tests for your code
   - [ ] Read [CODE_QUALITY.md](./CODE_QUALITY.md)
   - [ ] Review [SECURITY.md](../SECURITY.md)

### Intermediate Path

For developers familiar with the basics:

1. **Deep Dive: Architecture**
   - [ ] Study [ARCHITECTURE.md](../ARCHITECTURE.md) thoroughly
   - [ ] Review [Database Schema](./DATABASE_SCHEMA.md)
   - [ ] Understand [Service Template](./SERVICE_TEMPLATE.md)
   - [ ] Read [TypeScript Patterns](./TYPESCRIPT_PATTERNS.md)

2. **Deep Dive: Operations**
   - [ ] Read [Deployment Guide](../DEPLOYMENT.md)
   - [ ] Study [Performance Monitoring](./PERFORMANCE_DASHBOARD.md)
   - [ ] Learn [Migration Strategy](./MIGRATIONS.md)
   - [ ] Review [Troubleshooting](../TROUBLESHOOTING.md)

3. **Deep Dive: Best Practices**
   - [ ] Master [Testing Guide](../TESTING.md)
   - [ ] Study [Security Guidelines](../SECURITY.md)
   - [ ] Review [Error Handling](./ERROR_HANDLING.md)
   - [ ] Learn [Rate Limiting](./RATE_LIMITS.md)

### Advanced Path

For senior developers and architects:

1. **System Design**
   - [ ] Review all architecture decisions in [ARCHITECTURE.md](../ARCHITECTURE.md)
   - [ ] Study [Schema Improvements](./SCHEMA_IMPROVEMENTS.md)
   - [ ] Analyze work unit reports for patterns
   - [ ] Identify areas for improvement

2. **Performance Optimization**
   - [ ] Master [Performance Dashboard](./PERFORMANCE_DASHBOARD.md)
   - [ ] Review database optimization strategies
   - [ ] Analyze slow queries
   - [ ] Implement caching strategies

3. **Security & Reliability**
   - [ ] Audit [Security Guidelines](../SECURITY.md)
   - [ ] Review error handling patterns
   - [ ] Analyze rate limiting effectiveness
   - [ ] Implement monitoring and alerting

---

## Documentation Standards

### When to Create Documentation

Create or update documentation when:
- Adding new features
- Changing APIs or interfaces
- Modifying architecture
- Fixing significant bugs
- Adding configuration options
- Changing deployment process

### Documentation Checklist

When creating documentation:
- [ ] Clear title and purpose
- [ ] Table of contents for long docs
- [ ] Code examples where helpful
- [ ] Diagrams for complex concepts
- [ ] Version and last updated date
- [ ] Links to related documentation
- [ ] Tested examples (code actually works)

### Documentation Templates

See these documents as templates:
- API Documentation: [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md)
- Technical Guide: [MIGRATIONS.md](./MIGRATIONS.md)
- Reference: [ENDPOINT_REFERENCE.md](./ENDPOINT_REFERENCE.md)
- Work Report: Work unit report files

---

## Contributing to Documentation

### How to Improve Docs

1. **Fix typos and errors** - Small PRs welcome!
2. **Add examples** - Real-world examples help
3. **Clarify confusing sections** - Fresh eyes catch issues
4. **Add diagrams** - Visual aids improve understanding
5. **Update outdated info** - Keep docs current

### Documentation Review Process

1. Create PR with documentation changes
2. Request review from relevant team member
3. Address feedback
4. Merge when approved

### Style Guide

- Use clear, concise language
- Use active voice ("click the button" not "the button should be clicked")
- Use present tense ("the function returns" not "the function will return")
- Use code blocks for examples
- Use tables for comparisons
- Add diagrams for complex flows

---

## Frequently Asked Questions

### Where do I start?

Start with [README.md](../README.md), then move to [DEVELOPMENT.md](../DEVELOPMENT.md) to set up your environment.

### How do I deploy?

See [DEPLOYMENT.md](../DEPLOYMENT.md) for complete deployment procedures.

### How do I contribute?

Read [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines and workflow.

### Where are the API docs?

See [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md) for API usage and [ENDPOINT_REFERENCE.md](./ENDPOINT_REFERENCE.md) for endpoint catalog.

### How do I run tests?

See [TESTING.md](../TESTING.md) for comprehensive testing guide.

### I found a bug, what do I do?

1. Check [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
2. Search GitHub issues
3. Create a bug report if new

### Documentation is outdated, how do I fix it?

Submit a PR with corrections! See [CONTRIBUTING.md](../CONTRIBUTING.md).

---

## External Resources

### D&D 5E Resources
- [D&D 5E SRD](https://www.dndbeyond.com/sources/basic-rules) - Official rules reference
- [D&D Beyond](https://www.dndbeyond.com/) - Character tools and rules

### Technology Documentation
- [React](https://react.dev/) - React documentation
- [TypeScript](https://www.typescriptlang.org/docs/) - TypeScript handbook
- [Supabase](https://supabase.com/docs) - Supabase documentation
- [Vite](https://vite.dev/) - Vite build tool
- [Vitest](https://vitest.dev/) - Testing framework
- [TanStack Query](https://tanstack.com/query/latest) - Data fetching
- [LangChain](https://docs.langchain.com/) - AI orchestration

### Development Tools
- [VS Code](https://code.visualstudio.com/docs) - Editor documentation
- [Git](https://git-scm.com/doc) - Version control
- [npm](https://docs.npmjs.com/) - Package manager

---

## Getting Help

### Documentation Not Clear?

If documentation is unclear or missing:
1. Open a GitHub issue with label "documentation"
2. Describe what's unclear or missing
3. Suggest improvements if you can

### Need Support?

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - Questions and community help
- **Discord** - Real-time chat (if available)

---

## Documentation Maintenance

This documentation index is maintained by the development team. If you notice:
- Broken links
- Outdated information
- Missing documentation
- Organizational improvements needed

Please open a GitHub issue or submit a PR.

**Last Reviewed:** 2025-11-14
**Next Review:** 2026-02-14 (quarterly)

---

*Happy coding! If you have any questions, don't hesitate to ask in GitHub Discussions.*
