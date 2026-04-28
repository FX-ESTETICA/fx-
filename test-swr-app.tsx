import * as React from 'react';
import useSWR from 'swr';

function App() {
  const { isLoading, error } = useSWR('test', async () => {
    throw new Error('Test error');
  }, { provider: () => new Map() });
  
  React.useEffect(() => {
    console.log('Effect Loading:', isLoading, 'Error:', error?.message);
  }, [isLoading, error]);
  
  return null;
}

export default App;
