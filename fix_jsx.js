const fs = require('fs');
const path = 'c:/Users/xu/Desktop/GX/src/features/booking/components/DualPaneBookingModal.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix className=`...` to className={`...`}
content = content.replace(/className=(`[^`]*`)/g, 'className={$1}');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed JSX template literals');
