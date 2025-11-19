import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

// Simple test to verify the testing setup works
describe('Simple Test', () => {
  it('should pass a basic test', () => {
    expect(true).toBe(true);
  });

  it('should render a simple component', () => {
    const TestComponent = () => <div data-testid="test-element">Hello World</div>;
    
    render(<TestComponent />);
    
    expect(screen.getByTestId('test-element')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('should work with mocks', () => {
    const mockFn = vi.fn();
    mockFn.mockReturnValue('mocked value');
    
    expect(mockFn()).toBe('mocked value');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
