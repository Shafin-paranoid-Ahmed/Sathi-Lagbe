# Sathi Lagbe - Test Suite Documentation

This document provides comprehensive information about the automated test suite for the Sathi Lagbe campus ride-sharing application.

## 📋 Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Test Types](#test-types)
- [Coverage Reports](#coverage-reports)
- [CI/CD Integration](#cicd-integration)
- [Writing Tests](#writing-tests)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The Sathi Lagbe test suite provides comprehensive coverage across the entire MERN stack application:

- **Server-side tests**: Unit tests for models, controllers, services, and integration tests for API endpoints
- **Client-side tests**: Component tests, hook tests, and page tests using React Testing Library
- **End-to-end tests**: Complete user flow tests using Playwright
- **Integration tests**: Cross-component and API integration testing

## 🏗️ Test Structure

```
├── server/
│   ├── tests/
│   │   ├── setup.js                 # Jest setup and global utilities
│   │   ├── unit/
│   │   │   ├── models/              # Model unit tests
│   │   │   ├── controllers/         # Controller unit tests
│   │   │   └── services/            # Service unit tests
│   │   └── integration/             # API integration tests
│   └── package.json                 # Server test dependencies
├── client/
│   ├── src/
│   │   └── tests/
│   │       ├── setup.js             # Vitest setup and mocks
│   │       ├── components/          # Component tests
│   │       ├── hooks/               # Hook tests
│   │       ├── pages/               # Page tests
│   │       └── e2e/                 # End-to-end tests
│   ├── vitest.config.js             # Vitest configuration
│   └── package.json                 # Client test dependencies
├── .github/workflows/ci.yml         # GitHub Actions CI/CD
├── test-runner.js                   # Unified test runner script
└── package.json                     # Root package.json with test scripts
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- MongoDB (for integration tests)
- Redis (optional, for caching tests)

### Installation

1. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

2. **Set up environment variables:**
   ```bash
   # Server environment
   cp server/.env.example server/.env
   
   # Client environment
   cp client/.env.example client/.env
   ```

3. **Verify installation:**
   ```bash
   npm run test:ci
   ```

## 🧪 Running Tests

### Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Server Tests

```bash
# Unit tests only
cd server && npm test

# Watch mode
cd server && npm run test:watch

# With coverage
cd server && npm run test:coverage

# Integration tests
cd server && npm run test:integration

# CI mode
cd server && npm run test:ci
```

### Client Tests

```bash
# Unit tests only
cd client && npm test

# Watch mode
cd client && npm run test:watch

# With coverage
cd client && npm run test:coverage

# E2E tests
cd client && npm run test:e2e

# CI mode
cd client && npm run test:ci
```

### Using the Test Runner

```bash
# Run all tests
node test-runner.js

# Run only client tests
node test-runner.js --client

# Run only server tests
node test-runner.js --server

# Run with coverage
node test-runner.js --coverage

# Run in watch mode
node test-runner.js --watch

# Run in CI mode
node test-runner.js --ci

# Show help
node test-runner.js --help
```

## 📊 Test Types

### 1. Unit Tests

**Server Unit Tests:**
- Model validation and methods
- Controller logic and error handling
- Service functions and utilities
- Middleware functionality

**Client Unit Tests:**
- Component rendering and behavior
- Hook functionality
- Utility functions
- API integration

### 2. Integration Tests

**API Integration Tests:**
- Complete request/response cycles
- Database interactions
- Authentication flows
- Cross-service communication

### 3. End-to-End Tests

**User Flow Tests:**
- User registration and login
- Ride creation and management
- Ride search and booking
- Chat functionality
- Profile management

## 📈 Coverage Reports

### Generating Coverage

```bash
# Server coverage
cd server && npm run test:coverage

# Client coverage
cd client && npm run test:coverage

# All coverage
npm run test:coverage
```

### Coverage Thresholds

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Viewing Coverage

Coverage reports are generated in:
- Server: `server/coverage/index.html`
- Client: `client/coverage/index.html`

## 🔄 CI/CD Integration

### GitHub Actions

The project includes a comprehensive CI/CD pipeline (`.github/workflows/ci.yml`) that:

1. **Runs on every push and PR**
2. **Tests multiple Node.js versions** (18.x, 20.x)
3. **Sets up MongoDB and Redis services**
4. **Runs all test suites**
5. **Generates coverage reports**
6. **Performs security audits**
7. **Runs performance tests**
8. **Deploys to staging/production**

### Local CI Simulation

```bash
# Simulate CI environment
npm run test:ci

# Run security audit
npm audit

# Run linting
npm run lint
```

## ✍️ Writing Tests

### Server Test Example

```javascript
// server/tests/unit/models/User.test.js
const User = require('../../../models/User');

describe('User Model', () => {
  it('should create a user with valid data', async () => {
    const userData = {
      name: 'John Doe',
      email: 'john@bracu.ac.bd',
      password: 'password123',
      bracuId: '12345678',
      gender: 'Male'
    };

    const user = new User(userData);
    await user.save();

    expect(user._id).toBeDefined();
    expect(user.name).toBe(userData.name);
  });
});
```

### Client Test Example

```javascript
// client/src/tests/components/ArgonLayout.test.jsx
import { render, screen } from '@testing-library/react';
import ArgonLayout from '../../components/ArgonLayout';

describe('ArgonLayout', () => {
  it('renders with children content', () => {
    render(
      <ArgonLayout setIsAuthenticated={jest.fn()}>
        <div data-testid="test-content">Test Content</div>
      </ArgonLayout>
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });
});
```

### E2E Test Example

```javascript
// client/src/tests/e2e/user-registration.e2e.test.js
import { test, expect } from '@playwright/test';

test('should complete user registration flow', async ({ page }) => {
  await page.goto('/signup');
  
  await page.fill('[data-testid="name-input"]', 'John Doe');
  await page.fill('[data-testid="email-input"]', 'john@bracu.ac.bd');
  // ... fill other fields
  
  await page.click('[data-testid="signup-button"]');
  
  await expect(page).toHaveURL('/login');
});
```

## 🎯 Best Practices

### 1. Test Organization

- **Group related tests** using `describe` blocks
- **Use descriptive test names** that explain what is being tested
- **Follow AAA pattern**: Arrange, Act, Assert
- **Keep tests independent** and isolated

### 2. Mocking

- **Mock external dependencies** (APIs, databases, services)
- **Use consistent mock data** across tests
- **Reset mocks** between tests
- **Mock at the right level** (not too high, not too low)

### 3. Test Data

- **Use factories** for creating test data
- **Clean up data** after each test
- **Use realistic data** that matches production
- **Avoid hardcoded values** when possible

### 4. Assertions

- **Use specific assertions** rather than generic ones
- **Test both positive and negative cases**
- **Verify side effects** (database changes, API calls)
- **Test error conditions** and edge cases

### 5. Performance

- **Keep tests fast** (unit tests should be < 100ms)
- **Use parallel execution** when possible
- **Avoid unnecessary setup/teardown**
- **Mock expensive operations**

## 🔧 Troubleshooting

### Common Issues

1. **Tests failing due to database connection:**
   ```bash
   # Ensure MongoDB is running
   mongod --dbpath ./data/db
   ```

2. **Memory issues with large test suites:**
   ```bash
   # Increase Node.js memory limit
   node --max-old-space-size=4096 test-runner.js
   ```

3. **Port conflicts:**
   ```bash
   # Kill processes using test ports
   lsof -ti:3000,5000 | xargs kill -9
   ```

4. **Coverage not generating:**
   ```bash
   # Clear coverage cache
   rm -rf server/coverage client/coverage
   npm run test:coverage
   ```

### Debug Mode

```bash
# Run tests with debug output
DEBUG=* npm test

# Run specific test file
npm test -- --testNamePattern="User Model"

# Run tests matching pattern
npm test -- --testPathPattern="auth"
```

### Environment Variables

```bash
# Test environment variables
NODE_ENV=test
MONGO_URI=mongodb://localhost:27017/test
JWT_SECRET=test-secret-key
REDIS_URL=redis://localhost:6379
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Vitest Documentation](https://vitest.dev/guide/)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)

## 🤝 Contributing

When adding new features or fixing bugs:

1. **Write tests first** (TDD approach)
2. **Ensure all tests pass** before submitting PR
3. **Maintain or improve coverage** thresholds
4. **Update test documentation** if needed
5. **Follow existing test patterns** and conventions

## 📞 Support

For test-related issues or questions:

1. Check this documentation first
2. Review existing test examples
3. Check GitHub Issues for similar problems
4. Create a new issue with detailed information

---

**Happy Testing! 🧪✨**