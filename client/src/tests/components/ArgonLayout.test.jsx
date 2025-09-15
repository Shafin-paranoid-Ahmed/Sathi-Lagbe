import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ArgonLayout from '../../components/ArgonLayout';

// Mock the API functions
jest.mock('../../api/auth', () => ({
  verifyToken: jest.fn(),
  updateStatus: jest.fn(),
  getCurrentUserStatus: jest.fn(),
  logout: jest.fn()
}));

// Mock socket service
jest.mock('../../services/socketService', () => ({
  connect: jest.fn(),
  disconnect: jest.fn()
}));

// Mock NotificationBell component
jest.mock('../../components/NotificationBell', () => {
  return function MockNotificationBell() {
    return <div data-testid="notification-bell">Notification Bell</div>;
  };
});

// Mock LazyImage component
jest.mock('../../components/LazyImage', () => {
  return function MockLazyImage({ src, alt, ...props }) {
    return <img src={src} alt={alt} {...props} />;
  };
});

const MockArgonLayout = ({ children, setIsAuthenticated }) => (
  <BrowserRouter>
    <ArgonLayout setIsAuthenticated={setIsAuthenticated}>
      {children}
    </ArgonLayout>
  </BrowserRouter>
);

describe('ArgonLayout', () => {
  const mockSetIsAuthenticated = jest.fn();

  beforeEach(() => {
    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn((key) => {
          if (key === 'userId') return '507f1f77bcf86cd799439011';
          if (key === 'userName') return 'Test User';
          if (key === 'token') return 'mock-token';
          return null;
        }),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    });

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key) => {
          if (key === 'darkMode_507f1f77bcf86cd799439011') return 'false';
          if (key === 'userCurrentStatus') return 'available';
          return null;
        }),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    });

    jest.clearAllMocks();
  });

  it('renders with children content', () => {
    render(
      <MockArgonLayout setIsAuthenticated={mockSetIsAuthenticated}>
        <div data-testid="test-content">Test Content</div>
      </MockArgonLayout>
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('displays user name in profile dropdown', () => {
    render(
      <MockArgonLayout setIsAuthenticated={mockSetIsAuthenticated}>
        <div>Test Content</div>
      </MockArgonLayout>
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('shows logo and brand name', () => {
    render(
      <MockArgonLayout setIsAuthenticated={mockSetIsAuthenticated}>
        <div>Test Content</div>
      </MockArgonLayout>
    );

    expect(screen.getByText('Sathi Lagbe')).toBeInTheDocument();
    expect(screen.getByAltText('BRACU Logo')).toBeInTheDocument();
  });

  it('toggles dark mode when button is clicked', async () => {
    render(
      <MockArgonLayout setIsAuthenticated={mockSetIsAuthenticated}>
        <div>Test Content</div>
      </MockArgonLayout>
    );

    const darkModeButton = screen.getByRole('button', { name: /toggle dark mode/i });
    fireEvent.click(darkModeButton);

    await waitFor(() => {
      expect(document.documentElement).toHaveClass('dark');
    });
  });

  it('opens and closes profile dropdown', async () => {
    render(
      <MockArgonLayout setIsAuthenticated={mockSetIsAuthenticated}>
        <div>Test Content</div>
      </MockArgonLayout>
    );

    const profileButton = screen.getByRole('button', { name: /profile/i });
    fireEvent.click(profileButton);

    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });

    // Click outside to close
    fireEvent.click(document.body);
    
    await waitFor(() => {
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });
  });

  it('handles logout when sign out is clicked', async () => {
    const { logout } = require('../../api/auth');
    logout.mockResolvedValue({ data: { success: true } });

    render(
      <MockArgonLayout setIsAuthenticated={mockSetIsAuthenticated}>
        <div>Test Content</div>
      </MockArgonLayout>
    );

    const profileButton = screen.getByRole('button', { name: /profile/i });
    fireEvent.click(profileButton);

    await waitFor(() => {
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });

    const signOutButton = screen.getByText('Sign out');
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(logout).toHaveBeenCalled();
      expect(mockSetIsAuthenticated).toHaveBeenCalledWith(false);
    });
  });

  it('displays current status in profile dropdown', () => {
    render(
      <MockArgonLayout setIsAuthenticated={mockSetIsAuthenticated}>
        <div>Test Content</div>
      </MockArgonLayout>
    );

    const profileButton = screen.getByRole('button', { name: /profile/i });
    fireEvent.click(profileButton);

    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  it('shows navigation menu items', () => {
    render(
      <MockArgonLayout setIsAuthenticated={mockSetIsAuthenticated}>
        <div>Test Content</div>
      </MockArgonLayout>
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Friends')).toBeInTheDocument();
    expect(screen.getByText('Rides')).toBeInTheDocument();
    expect(screen.getByText('SOS')).toBeInTheDocument();
    expect(screen.getByText('Classrooms')).toBeInTheDocument();
    expect(screen.getByText('Routine')).toBeInTheDocument();
    expect(screen.getByText('Ratings')).toBeInTheDocument();
  });

  it('expands rides dropdown when clicked', async () => {
    render(
      <MockArgonLayout setIsAuthenticated={mockSetIsAuthenticated}>
        <div>Test Content</div>
      </MockArgonLayout>
    );

    const ridesButton = screen.getByRole('button', { name: /rides/i });
    fireEvent.click(ridesButton);

    await waitFor(() => {
      expect(screen.getByText('My Rides')).toBeInTheDocument();
      expect(screen.getByText('Offer a Ride')).toBeInTheDocument();
      expect(screen.getByText('Find a Ride')).toBeInTheDocument();
    });
  });

  it('shows mobile menu button on small screens', () => {
    // Mock window.innerWidth for mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    render(
      <MockArgonLayout setIsAuthenticated={mockSetIsAuthenticated}>
        <div>Test Content</div>
      </MockArgonLayout>
    );

    const menuButton = screen.getByRole('button', { name: /menu/i });
    expect(menuButton).toBeInTheDocument();
  });

  it('handles status change', async () => {
    const { updateStatus } = require('../../api/auth');
    updateStatus.mockResolvedValue({ data: { success: true } });

    render(
      <MockArgonLayout setIsAuthenticated={mockSetIsAuthenticated}>
        <div>Test Content</div>
      </MockArgonLayout>
    );

    const profileButton = screen.getByRole('button', { name: /profile/i });
    fireEvent.click(profileButton);

    await waitFor(() => {
      expect(screen.getByText('Busy')).toBeInTheDocument();
    });

    const busyButton = screen.getByText('Busy');
    fireEvent.click(busyButton);

    await waitFor(() => {
      expect(updateStatus).toHaveBeenCalledWith({ status: 'busy' });
    });
  });

  it('shows notification bell', () => {
    render(
      <MockArgonLayout setIsAuthenticated={mockSetIsAuthenticated}>
        <div>Test Content</div>
      </MockArgonLayout>
    );

    expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
  });
});
