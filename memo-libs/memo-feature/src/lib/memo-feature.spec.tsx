import { render } from '@testing-library/react';

import BublysOrgMemoFeature from './memo-feature';

describe('BublysOrgMemoFeature', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<BublysOrgMemoFeature />);
    expect(baseElement).toBeTruthy();
  });
});
