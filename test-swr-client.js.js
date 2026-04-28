import * as React from 'react';
import useSWR from 'swr';
import { render } from '@testing-library/react';

function App() {
  const { isLoading, error } = useSWR('test', async () => {
    throw new Error('Test error');
  }, { provider: () => new Map() });
  
  console.log('Client Render: Loading:', isLoading, 'Error:', error?.message);
  return React.createElement('div', null, `Loading: ${String(isLoading)}, Error: ${String(error)}`);
}

render(React.createElement(App));

setTimeout(() => {
  console.log('After timeout');
}, 100);
