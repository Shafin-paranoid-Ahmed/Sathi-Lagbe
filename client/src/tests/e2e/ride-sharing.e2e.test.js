import { test, expect } from '@playwright/test';

test.describe('Ride Sharing E2E', () => {
  let user1Token, user2Token, user3Token;

  test.beforeEach(async ({ page }) => {
    // Mock authentication and set up test users
    await page.addInitScript(() => {
      // Mock sessionStorage
      window.sessionStorage.setItem('userId', 'user1');
      window.sessionStorage.setItem('userName', 'Test User 1');
      window.sessionStorage.setItem('token', 'mock-token-1');
    });

    // Mock API responses
    await page.route('**/api/auth/verify', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            _id: 'user1',
            name: 'Test User 1',
            email: 'user1@bracu.ac.bd'
          }
        })
      });
    });

    await page.route('**/api/rides/available', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          rides: []
        })
      });
    });
  });

  test('should complete full ride sharing flow', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Mock API responses for the flow
    await page.route('**/api/rides/offer', async route => {
      const request = route.request();
      const postData = JSON.parse(request.postData());
      
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          ride: {
            _id: 'ride123',
            riderId: 'user1',
            startLocation: postData.startLocation,
            endLocation: postData.endLocation,
            departureTime: postData.departureTime,
            availableSeats: postData.availableSeats,
            status: 'pending'
          }
        })
      });
    });

    // Step 1: Offer a ride
    await page.click('[data-testid="offer-ride-button"]');
    
    // Fill in ride offer form
    await page.fill('[data-testid="start-location-input"]', 'BRAC University');
    await page.fill('[data-testid="end-location-input"]', 'Dhanmondi');
    await page.fill('[data-testid="departure-time-input"]', '2024-12-31T08:00');
    await page.fill('[data-testid="available-seats-input"]', '3');
    
    // Submit the form
    await page.click('[data-testid="submit-ride-button"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Ride offered successfully');

    // Step 2: Search for rides
    await page.click('[data-testid="find-ride-button"]');
    
    // Mock search results
    await page.route('**/api/rides/available**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          rides: [
            {
              _id: 'ride123',
              riderId: 'user1',
              riderName: 'Test User 1',
              startLocation: 'BRAC University',
              endLocation: 'Dhanmondi',
              departureTime: '2024-12-31T08:00',
              availableSeats: 3,
              status: 'pending'
            }
          ]
        })
      });
    });

    // Fill search form
    await page.fill('[data-testid="search-start-location"]', 'BRAC University');
    await page.fill('[data-testid="search-end-location"]', 'Dhanmondi');
    await page.click('[data-testid="search-rides-button"]');

    // Should show search results
    await expect(page.locator('[data-testid="ride-card-ride123"]')).toBeVisible();
    await expect(page.locator('[data-testid="ride-card-ride123"]')).toContainText('BRAC University');
    await expect(page.locator('[data-testid="ride-card-ride123"]')).toContainText('Dhanmondi');

    // Step 3: Request to join ride (as different user)
    await page.addInitScript(() => {
      window.sessionStorage.setItem('userId', 'user2');
      window.sessionStorage.setItem('userName', 'Test User 2');
      window.sessionStorage.setItem('token', 'mock-token-2');
    });

    // Mock request API
    await page.route('**/api/rides/ride123/request', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Request sent successfully'
        })
      });
    });

    await page.click('[data-testid="request-ride-button-ride123"]');
    
    // Should show request form
    await expect(page.locator('[data-testid="request-seats-input"]')).toBeVisible();
    
    // Fill request form
    await page.fill('[data-testid="request-seats-input"]', '1');
    await page.click('[data-testid="submit-request-button"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Request sent successfully');
  });

  test('should handle ride search and filtering', async ({ page }) => {
    // Mock search results with multiple rides
    await page.route('**/api/rides/available**', async route => {
      const url = new URL(route.request().url());
      const startLocation = url.searchParams.get('startLocation');
      const endLocation = url.searchParams.get('endLocation');
      
      let rides = [
        {
          _id: 'ride1',
          riderId: 'user1',
          riderName: 'User One',
          startLocation: 'BRAC University',
          endLocation: 'Dhanmondi',
          departureTime: '2024-12-31T08:00',
          availableSeats: 2,
          status: 'pending'
        },
        {
          _id: 'ride2',
          riderId: 'user2',
          riderName: 'User Two',
          startLocation: 'BRAC University',
          endLocation: 'Gulshan',
          departureTime: '2024-12-31T09:00',
          availableSeats: 3,
          status: 'pending'
        },
        {
          _id: 'ride3',
          riderId: 'user3',
          riderName: 'User Three',
          startLocation: 'Dhanmondi',
          endLocation: 'BRAC University',
          departureTime: '2024-12-31T10:00',
          availableSeats: 1,
          status: 'pending'
        }
      ];

      // Filter based on search parameters
      if (startLocation) {
        rides = rides.filter(ride => ride.startLocation.includes(startLocation));
      }
      if (endLocation) {
        rides = rides.filter(ride => ride.endLocation.includes(endLocation));
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          rides
        })
      });
    });

    await page.goto('/rides');

    // Search for rides from BRAC University
    await page.fill('[data-testid="search-start-location"]', 'BRAC University');
    await page.click('[data-testid="search-rides-button"]');

    // Should show 2 rides
    await expect(page.locator('[data-testid="ride-card-ride1"]')).toBeVisible();
    await expect(page.locator('[data-testid="ride-card-ride2"]')).toBeVisible();
    await expect(page.locator('[data-testid="ride-card-ride3"]')).not.toBeVisible();

    // Search for rides to Dhanmondi
    await page.fill('[data-testid="search-end-location"]', 'Dhanmondi');
    await page.click('[data-testid="search-rides-button"]');

    // Should show only 1 ride
    await expect(page.locator('[data-testid="ride-card-ride1"]')).toBeVisible();
    await expect(page.locator('[data-testid="ride-card-ride2"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="ride-card-ride3"]')).not.toBeVisible();
  });

  test('should handle ride management (edit and delete)', async ({ page }) => {
    // Mock user's rides
    await page.route('**/api/rides/my-rides', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          rides: [
            {
              _id: 'ride123',
              riderId: 'user1',
              startLocation: 'BRAC University',
              endLocation: 'Dhanmondi',
              departureTime: '2024-12-31T08:00',
              availableSeats: 3,
              status: 'pending',
              requestedRiders: [
                { user: 'user2', seatCount: 1 }
              ],
              confirmedRiders: []
            }
          ]
        })
      });
    });

    await page.goto('/my-rides');

    // Should show user's ride
    await expect(page.locator('[data-testid="my-ride-ride123"]')).toBeVisible();
    await expect(page.locator('[data-testid="ride-requests-count"]')).toContainText('1');

    // Test editing ride
    await page.click('[data-testid="edit-ride-button-ride123"]');
    
    // Should show edit form
    await expect(page.locator('[data-testid="edit-ride-modal"]')).toBeVisible();
    
    // Update available seats
    await page.fill('[data-testid="edit-available-seats"]', '2');
    await page.click('[data-testid="save-ride-button"]');

    // Mock update API
    await page.route('**/api/rides/ride123', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Ride updated successfully'
          })
        });
      }
    });

    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Ride updated successfully');

    // Test deleting ride
    await page.click('[data-testid="delete-ride-button-ride123"]');
    
    // Should show confirmation dialog
    await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible();
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]');

    // Mock delete API
    await page.route('**/api/rides/ride123', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Ride deleted successfully'
          })
        });
      }
    });

    // Should show success message and remove ride
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Ride deleted successfully');
    await expect(page.locator('[data-testid="my-ride-ride123"]')).not.toBeVisible();
  });

  test('should handle ride requests and confirmations', async ({ page }) => {
    // Mock ride with requests
    await page.route('**/api/rides/ride123', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          ride: {
            _id: 'ride123',
            riderId: 'user1',
            startLocation: 'BRAC University',
            endLocation: 'Dhanmondi',
            departureTime: '2024-12-31T08:00',
            availableSeats: 3,
            status: 'pending',
            requestedRiders: [
              { 
                user: 'user2', 
                seatCount: 1,
                userDetails: { name: 'Test User 2', email: 'user2@bracu.ac.bd' }
              },
              { 
                user: 'user3', 
                seatCount: 2,
                userDetails: { name: 'Test User 3', email: 'user3@bracu.ac.bd' }
              }
            ],
            confirmedRiders: []
          }
        })
      });
    });

    await page.goto('/my-rides/ride123');

    // Should show ride details and requests
    await expect(page.locator('[data-testid="ride-requests-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="request-user2"]')).toBeVisible();
    await expect(page.locator('[data-testid="request-user3"]')).toBeVisible();

    // Test confirming a request
    await page.route('**/api/rides/ride123/confirm/user2', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Request confirmed successfully'
        })
      });
    });

    await page.click('[data-testid="confirm-request-user2"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Request confirmed successfully');

    // Test denying a request
    await page.route('**/api/rides/ride123/deny/user3', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Request denied successfully'
        })
      });
    });

    await page.click('[data-testid="deny-request-user3"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Request denied successfully');
  });

  test('should handle recurring rides', async ({ page }) => {
    // Mock recurring ride creation
    await page.route('**/api/rides/offer', async route => {
      const request = route.request();
      const postData = JSON.parse(request.postData());
      
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          rides: [
            {
              _id: 'recurring-ride-1',
              riderId: 'user1',
              startLocation: postData.startLocation,
              endLocation: postData.endLocation,
              availableSeats: postData.availableSeats,
              recurring: postData.recurring,
              status: 'pending'
            }
          ]
        })
      });
    });

    await page.goto('/rides/offer');

    // Toggle to recurring ride
    await page.click('[data-testid="recurring-toggle"]');
    
    // Fill in recurring ride form
    await page.fill('[data-testid="start-location-input"]', 'BRAC University');
    await page.fill('[data-testid="end-location-input"]', 'Dhanmondi');
    await page.fill('[data-testid="available-seats-input"]', '2');
    
    // Select recurring days
    await page.check('[data-testid="day-monday"]');
    await page.check('[data-testid="day-wednesday"]');
    await page.check('[data-testid="day-friday"]');
    
    // Set time
    await page.fill('[data-testid="recurring-hour"]', '8');
    await page.fill('[data-testid="recurring-minute"]', '30');
    
    // Submit form
    await page.click('[data-testid="submit-ride-button"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Recurring rides created successfully');
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/rides/available', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error'
        })
      });
    });

    await page.goto('/rides');

    // Try to search for rides
    await page.fill('[data-testid="search-start-location"]', 'BRAC University');
    await page.click('[data-testid="search-rides-button"]');

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Internal server error');
  });

  test('should handle form validation', async ({ page }) => {
    await page.goto('/rides/offer');

    // Try to submit empty form
    await page.click('[data-testid="submit-ride-button"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="start-location-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="end-location-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="departure-time-error"]')).toBeVisible();

    // Fill in invalid data
    await page.fill('[data-testid="available-seats-input"]', '0');
    await page.click('[data-testid="submit-ride-button"]');

    // Should show seat validation error
    await expect(page.locator('[data-testid="available-seats-error"]')).toContainText('At least 1 seat required');
  });
});