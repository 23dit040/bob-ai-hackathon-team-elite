import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SiteRiskMap from '../pages/SiteRiskMap.js';

describe('SiteRiskMap page', () => {
  it('renders the page heading', () => {
    render(<SiteRiskMap />);
    expect(screen.getByText('Site Risk Ranking')).toBeInTheDocument();
  });
});
