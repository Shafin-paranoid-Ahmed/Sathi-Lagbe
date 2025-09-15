#!/usr/bin/env node

/**
 * Test Runner Script for Sathi Lagbe
 * 
 * This script provides a unified interface for running all tests
 * across the MERN stack application.
 * 
 * Usage:
 *   node test-runner.js [options]
 * 
 * Options:
 *   --type <type>     Test type: unit, integration, e2e, all (default: all)
 *   --client          Run only client tests
 *   --server          Run only server tests
 *   --watch           Run tests in watch mode
 *   --coverage        Generate coverage reports
 *   --ci              Run in CI mode (no watch, with coverage)
 *   --help            Show this help message
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const config = {
  server: {
    path: './server',
    testCommand: 'npm test',
    watchCommand: 'npm run test:watch',
    coverageCommand: 'npm run test:coverage',
    ciCommand: 'npm run test:ci'
  },
  client: {
    path: './client',
    testCommand: 'npm test',
    watchCommand: 'npm run test:watch',
    coverageCommand: 'npm run test:coverage',
    ciCommand: 'npm run test:ci'
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  type: 'all',
  client: false,
  server: false,
  watch: false,
  coverage: false,
  ci: false,
  help: false
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '--type':
      options.type = args[++i];
      break;
    case '--client':
      options.client = true;
      break;
    case '--server':
      options.server = true;
      break;
    case '--watch':
      options.watch = true;
      break;
    case '--coverage':
      options.coverage = true;
      break;
    case '--ci':
      options.ci = true;
      break;
    case '--help':
      options.help = true;
      break;
  }
}

// Show help
if (options.help) {
  console.log(`
Sathi Lagbe Test Runner

Usage: node test-runner.js [options]

Options:
  --type <type>     Test type: unit, integration, e2e, all (default: all)
  --client          Run only client tests
  --server          Run only server tests
  --watch           Run tests in watch mode
  --coverage        Generate coverage reports
  --ci              Run in CI mode (no watch, with coverage)
  --help            Show this help message

Examples:
  node test-runner.js                    # Run all tests
  node test-runner.js --client --watch   # Run client tests in watch mode
  node test-runner.js --server --coverage # Run server tests with coverage
  node test-runner.js --ci               # Run all tests in CI mode
  `);
  process.exit(0);
}

// Utility functions
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function runCommand(command, cwd, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [], {
      shell: true,
      cwd,
      stdio: 'inherit',
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

function checkDependencies() {
  log('Checking dependencies...', 'info');
  
  const serverPackageJson = path.join(config.server.path, 'package.json');
  const clientPackageJson = path.join(config.client.path, 'package.json');
  
  if (!fs.existsSync(serverPackageJson)) {
    log('Server package.json not found!', 'error');
    process.exit(1);
  }
  
  if (!fs.existsSync(clientPackageJson)) {
    log('Client package.json not found!', 'error');
    process.exit(1);
  }
  
  log('Dependencies check passed!', 'success');
}

function getTestCommand(platform, options) {
  let command = config[platform].testCommand;
  
  if (options.ci) {
    command = config[platform].ciCommand;
  } else if (options.watch) {
    command = config[platform].watchCommand;
  } else if (options.coverage) {
    command = config[platform].coverageCommand;
  }
  
  return command;
}

async function runTests(platform, options) {
  const command = getTestCommand(platform, options);
  
  log(`Running ${platform} tests...`, 'info');
  log(`Command: ${command}`, 'info');
  
  try {
    await runCommand(command, config[platform].path);
    log(`${platform} tests passed!`, 'success');
    return true;
  } catch (error) {
    log(`${platform} tests failed: ${error.message}`, 'error');
    return false;
  }
}

async function runAllTests(options) {
  log('Starting test suite...', 'info');
  log(`Type: ${options.type}`, 'info');
  log(`Watch: ${options.watch}`, 'info');
  log(`Coverage: ${options.coverage}`, 'info');
  log(`CI: ${options.ci}`, 'info');
  
  checkDependencies();
  
  const results = {
    server: false,
    client: false
  };
  
  // Determine which platforms to test
  const platforms = [];
  if (options.server || (!options.client && !options.server)) {
    platforms.push('server');
  }
  if (options.client || (!options.client && !options.server)) {
    platforms.push('client');
  }
  
  // Run tests for each platform
  for (const platform of platforms) {
    if (options.type === 'all' || options.type === 'unit' || options.type === 'integration') {
      results[platform] = await runTests(platform, options);
    }
  }
  
  // Summary
  log('\nTest Results Summary:', 'info');
  log(`Server: ${results.server ? 'PASSED' : 'FAILED'}`, results.server ? 'success' : 'error');
  log(`Client: ${results.client ? 'PASSED' : 'FAILED'}`, results.client ? 'success' : 'error');
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    log('\nAll tests passed! 🎉', 'success');
    process.exit(0);
  } else {
    log('\nSome tests failed! ❌', 'error');
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\nTest run interrupted by user', 'warning');
  process.exit(1);
});

process.on('SIGTERM', () => {
  log('\nTest run terminated', 'warning');
  process.exit(1);
});

// Run the tests
runAllTests(options).catch((error) => {
  log(`Test runner error: ${error.message}`, 'error');
  process.exit(1);
});
