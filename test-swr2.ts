import React from 'react';
import useSWR from 'swr';
import { renderToString } from 'react-dom/server';

function App() {
  const { isLoading } = useSWR(null, () => Promise.resolve([]));
  return React.createElement('div', null, `Loading: ${String(isLoading)}`);
}

console.log(renderToString(React.createElement(App)));
