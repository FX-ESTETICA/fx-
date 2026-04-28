import React from 'react';
import useSWR from 'swr';
import { renderToString } from 'react-dom/server';

function App() {
  const { data, isLoading } = useSWR(null, () => Promise.resolve([]));
  return <div>Loading: {String(isLoading)}</div>;
}

console.log(renderToString(<App />));
