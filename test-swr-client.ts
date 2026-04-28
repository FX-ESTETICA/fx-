import * as React from 'react';
import useSWR from 'swr';
import { render } from '@testing-library/react';

function App() {
  const { isLoading } = useSWR(null, () => []);
  console.log('Client Loading:', isLoading);
  return React.createElement('div', null, `Loading: ${String(isLoading)}`);
}

render(React.createElement(App));
