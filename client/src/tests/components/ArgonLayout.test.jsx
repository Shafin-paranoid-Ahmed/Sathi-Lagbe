import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ArgonLayout from '../../components/ArgonLayout';

vi.mock('../../api/auth', () => ({
  verifyToken: vi.fn().mockResolvedValue({ data: { success: true } }),
  updateStatus: vi.fn().mockResolvedValue({ data: { success: true } }),
  getCurrentUserStatus: vi.fn().mockResolvedValue({ data: { status: { current: 'available' } } }),
  logout: vi.fn().mockResolvedValue({ data: { success: true } })
}));

vi.mock('../../services/socketService', () => ({
  default: {
    connect: vi.fn(),
    disconnect: vi.fn()
  }
}));

vi.mock('../../components/NotificationBell', () => ({
  default: () => <div data-testid="notification-bell">bell</div>
}));

vi.mock('../../components/LazyImage', () => ({
  default: (props) => <img alt={props.alt || 'avatar'} />
}));

describe('ArgonLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.setItem('userId', 'u1');
    sessionStorage.setItem('userName', 'Test User');
    sessionStorage.setItem('token', 'token');
  });

  it('renders children and navigation shell', () => {
    render(
      <BrowserRouter>
        <ArgonLayout setIsAuthenticated={vi.fn()}>
          <div>Child Content</div>
        </ArgonLayout>
      </BrowserRouter>
    );

    expect(screen.getByText('Child Content')).toBeInTheDocument();
    expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
  });
});
