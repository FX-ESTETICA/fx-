import { createServer } from 'http';
import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const html = `
<!DOCTYPE html>
<html>
<body>
<div id="root"></div>
<script type="module">
import React from 'https://esm.sh/react@18';
import { createRoot } from 'https://esm.sh/react-dom@18/client';
import useSWR from 'https://esm.sh/swr@2.4.1';

function App() {
  const { isLoading, error, isValidating } = useSWR('test', async () => {
    throw new Error('fail');
  });
  
  return React.createElement('div', null, 
    'Loading: ' + String(isLoading) + 
    ', Validating: ' + String(isValidating) + 
    ', Error: ' + String(error?.message)
  );
}

const root = createRoot(document.getElementById('root'));
root.render(React.createElement(App));
</script>
</body>
</html>
`;

fs.writeFileSync('test-swr-browser.html', html);
console.log('Created test-swr-browser.html');
