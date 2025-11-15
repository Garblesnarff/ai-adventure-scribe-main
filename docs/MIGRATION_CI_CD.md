# Migration Testing - CI/CD Integration Guide

This guide explains how to integrate the migration testing script into your CI/CD pipeline.

## Overview

The migration test script (`scripts/test-migrations.sh`) is designed to work seamlessly in CI/CD environments. It automatically detects CI environments and skips interactive prompts.

## Prerequisites

Your CI/CD environment needs:

1. **Supabase CLI** installed
2. **PostgreSQL** database available (or Supabase local instance)
3. **Bash** shell
4. **Node.js** and npm (for running via package.json)

## GitHub Actions

### Basic Workflow

Create `.github/workflows/test-migrations.yml`:

```yaml
name: Test Database Migrations

on:
  pull_request:
    paths:
      - 'supabase/migrations/**'
      - 'scripts/test-migrations.sh'
  push:
    branches:
      - main
      - develop

jobs:
  test-migrations:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Start Supabase local instance
        run: supabase start

      - name: Run migration tests
        run: CI=true npm run test:migrations
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Stop Supabase
        if: always()
        run: supabase stop
```

### Advanced Workflow with Database Seeding

```yaml
name: Test Migrations with Seed Data

on:
  pull_request:
    paths:
      - 'supabase/migrations/**'

jobs:
  test-migrations:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1

      - name: Start Supabase
        run: |
          supabase start
          supabase status

      - name: Run migration tests
        run: CI=true npm run test:migrations

      - name: Seed test data
        if: success()
        run: npm run seed:test-data

      - name: Run application tests
        if: success()
        run: npm test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: migration-test-results
          path: /tmp/migration-output.log

      - name: Cleanup
        if: always()
        run: supabase stop
```

## GitLab CI

Create `.gitlab-ci.yml`:

```yaml
stages:
  - test

test-migrations:
  stage: test
  image: node:20

  services:
    - postgres:15

  variables:
    POSTGRES_DB: postgres
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
    POSTGRES_HOST: postgres

  before_script:
    - npm ci
    - npm install -g supabase
    - supabase start

  script:
    - CI=true npm run test:migrations

  after_script:
    - supabase stop

  only:
    changes:
      - supabase/migrations/**/*
      - scripts/test-migrations.sh
```

## CircleCI

Create `.circleci/config.yml`:

```yaml
version: 2.1

orbs:
  node: circleci/node@5.1

jobs:
  test-migrations:
    docker:
      - image: cimg/node:20.0
      - image: cimg/postgres:15.0
        environment:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db

    steps:
      - checkout

      - node/install-packages:
          pkg-manager: npm

      - run:
          name: Install Supabase CLI
          command: |
            curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh
            export PATH=$PATH:/usr/local/bin

      - run:
          name: Wait for PostgreSQL
          command: dockerize -wait tcp://localhost:5432 -timeout 1m

      - run:
          name: Start Supabase
          command: supabase start

      - run:
          name: Run migration tests
          command: CI=true npm run test:migrations

      - run:
          name: Stop Supabase
          command: supabase stop
          when: always

      - store_test_results:
          path: test-results

workflows:
  test:
    jobs:
      - test-migrations:
          filters:
            branches:
              only:
                - main
                - develop
```

## Jenkins

Create `Jenkinsfile`:

```groovy
pipeline {
    agent any

    environment {
        CI = 'true'
        NODE_VERSION = '20'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Setup') {
            steps {
                sh '''
                    nvm install ${NODE_VERSION}
                    nvm use ${NODE_VERSION}
                    npm ci
                    npm install -g supabase
                '''
            }
        }

        stage('Start Supabase') {
            steps {
                sh 'supabase start'
            }
        }

        stage('Test Migrations') {
            steps {
                sh 'npm run test:migrations'
            }
        }
    }

    post {
        always {
            sh 'supabase stop || true'
        }
        success {
            echo 'Migration tests passed!'
        }
        failure {
            echo 'Migration tests failed. Check logs for details.'
            archiveArtifacts artifacts: '/tmp/migration-output.log', allowEmptyArchive: true
        }
    }
}
```

## Docker-based Testing

### Dockerfile for Testing

Create `Dockerfile.test`:

```dockerfile
FROM node:20-alpine

# Install Supabase CLI
RUN apk add --no-cache curl bash postgresql-client
RUN curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy project files
COPY . .

# Make script executable
RUN chmod +x scripts/test-migrations.sh

# Run tests
CMD ["npm", "run", "test:migrations"]
```

### Docker Compose for Local Testing

Create `docker-compose.test.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: test_db
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  test:
    build:
      context: .
      dockerfile: Dockerfile.test
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      - CI=true
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/test_db
    volumes:
      - ./supabase:/app/supabase
      - ./scripts:/app/scripts
```

Run tests:
```bash
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
```

## Environment Variables

The test script respects these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `CI` | Set to `true` to skip interactive prompts | `false` |
| `DATABASE_URL` | PostgreSQL connection string | Supabase local |
| `SUPABASE_ACCESS_TOKEN` | Supabase API token (for remote testing) | - |
| `TEST_DATABASE_URL` | Override database URL for tests | - |

## Best Practices

### 1. Run Tests on PR

Always run migration tests on pull requests that modify migration files:

```yaml
on:
  pull_request:
    paths:
      - 'supabase/migrations/**'
```

### 2. Cache Dependencies

Speed up CI by caching dependencies:

```yaml
- name: Cache node modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

### 3. Parallel Testing

Run migration tests in parallel with other test suites:

```yaml
jobs:
  test-migrations:
    # ... migration tests

  test-unit:
    # ... unit tests

  test-integration:
    # ... integration tests
    needs: test-migrations  # Wait for migrations to pass
```

### 4. Fail Fast

Configure CI to fail fast if migrations don't pass:

```yaml
strategy:
  fail-fast: true
```

### 5. Test Against Multiple Database Versions

```yaml
strategy:
  matrix:
    postgres: [14, 15, 16]

services:
  postgres:
    image: postgres:${{ matrix.postgres }}
```

## Monitoring and Alerts

### Slack Notifications

Add to GitHub Actions:

```yaml
- name: Notify Slack on failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "Migration tests failed for ${{ github.repository }}",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Migration Test Failed*\nRepository: ${{ github.repository }}\nBranch: ${{ github.ref }}\nCommit: ${{ github.sha }}"
            }
          }
        ]
      }
```

### Email Notifications

```yaml
- name: Send email on failure
  if: failure()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 587
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: Migration tests failed
    body: |
      Migration tests failed for commit ${{ github.sha }}
      Check the logs at: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
    to: dev-team@example.com
```

## Troubleshooting CI/CD Issues

### Supabase CLI Not Found

```yaml
- name: Install Supabase CLI
  run: |
    curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh
    echo "$HOME/.supabase/bin" >> $GITHUB_PATH
```

### PostgreSQL Connection Issues

```yaml
- name: Wait for PostgreSQL
  run: |
    until pg_isready -h localhost -p 5432; do
      echo "Waiting for PostgreSQL..."
      sleep 2
    done
```

### Permission Issues

```bash
- name: Fix script permissions
  run: chmod +x scripts/test-migrations.sh
```

## Example: Complete GitHub Actions Workflow

See `.github/workflows/test-migrations.yml` in this repository for a complete, production-ready example.

## Further Reading

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
- [CircleCI Documentation](https://circleci.com/docs/)
