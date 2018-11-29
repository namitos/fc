# Form Constructor

Frontend form construction util based on json schemas.

Usage:

```
import { fc } from '../../node_modules/fc/fc.js';
let domEl = fc({
  schema: {
    type: 'Object',
    properties: {
      a: { type: 'integer' },
      b: { type: 'string' },
      c: {
        type: 'string',
        widget: 'FCSelect',
        options: { 1: '1', 2: '2', 3: '3' }
      }
    }
  },
  value: {
    a: 1,
    c: 2
  }
});
domEl.addEventListener('change', (e) => console.log(domEl.value));//value property is a deep copy of original value
document.body.appendChild(domEl);
```
