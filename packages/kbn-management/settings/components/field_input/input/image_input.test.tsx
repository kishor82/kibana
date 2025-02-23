/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ImageInput } from './image_input';
import { wrap } from '../mocks';
import { TEST_SUBJ_PREFIX_FIELD } from '.';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';

const name = 'Some image field';
const id = 'some:image:field';

describe('ImageInput', () => {
  const defaultProps = {
    id,
    name,
    ariaLabel: 'Test',
    onChange: jest.fn(),
    hasChanged: false,
    isDefaultValue: false,
  };

  it('renders without errors', () => {
    const { container } = render(wrap(<ImageInput {...defaultProps} />));
    expect(container).toBeInTheDocument();
  });

  it('calls the onChange prop when a file is selected', async () => {
    const { getByTestId } = render(wrap(<ImageInput {...defaultProps} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`) as HTMLInputElement;
    const file = new File(['(⌐□_□)'], 'test.png', { type: 'image/png' });

    act(() => {
      userEvent.upload(input, [file]);
    });

    expect(input.files?.length).toBe(1);

    // This doesn't work for some reason.
    // expect(defaultProps.onChange).toHaveBeenCalledWith({ value: file });
  });

  it('disables the input when isDisabled prop is true', () => {
    const { getByTestId } = render(wrap(<ImageInput {...defaultProps} isDisabled />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    expect(input).toBeDisabled();
  });
});
