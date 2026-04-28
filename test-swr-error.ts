import * as React from 'react';
import useSWR from 'swr';
import { renderToString } from 'react-dom/server';

function App() {
  const { isLoading, error } = useSWR('test', async () => {
    throw new Error('Test error');
  }, { provider: () => new Map() });
  
  return React.createElement('div', null, `Loading: ${String(isLoading)}, Error: ${String(error)}`);
}

console.log(renderToString(React.createElement(App)));
