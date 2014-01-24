# Viewport Units Buggyfill™

Making viewport units (vh|vw|vmin|vmax) work properly in Mobile Safari.

This is a *buggyfill* (fixing bad behavior), not a *polyfill* (adding missing behavior). If the browser doesn't know how to deal with the [viewport units](http://www.w3.org/TR/css3-values/#viewport-relative-lengths) - `vw`, `vh`, `vmin` and `vmax` - it won't gain the capability through this script, because this buggyfill uses the [CSSOM](http://dev.w3.org/csswg/cssom/) to access the defined styles.

The buggyfill iterates through all defined styles the document knows and extracts those that uses a viewport unit. After resolving the relative units against the viewport's dimensions, CSS is put back together and injected into the document in a `<style>` element. Listening to the `orientationchange` event allows the buggyfill to update the calculated dimensions accordingly.

> Note: This buggyfill only works on stylesheets! viewport units used in `style` attributes are *not* resolved.

## Using viewport-units-buggyfill

After loading the buggyfill from npm (`npm install viewport-units-buggyfill`) or bower (`bower install viewport-units-buggyfill`), it has to be required and initialized:

```js
require('viewport-units-buggyfill').init();
```

If you're - for whatever reason - not using a package manager, include the script as follows:

```html
<script src="viewport-units-buggyfill.js"></script>
<script>window.viewportUnitsBuggyfill.init();</script>
```

## API

`viewport-units-buggyfill` exposes the following API:

```js
var viewportUnitsBuggyfill = require('viewport-units-buggyfill');

// find viewport-unit declarations,
// convert them to pixels,
// inject style-element into document,
// register orientationchange event to repeat when necessary
// will only engage for Mobile Safari on iOS
viewportUnitsBuggyfill.init();
// ignore user agent force initialization
viewportUnitsBuggyfill.init(true);

// update internal declarations cache and recalculate pixel styles
// this is handy when you add styles after .init() was run
viewportUnitsBuggyfill.refresh();

// you can do things manually (without the style-element injection):
// identify all declarations using viewport units
viewportUnitsBuggyfill.findProperties();
var cssText = viewportUnitsBuggyfill.getCss();
```


## License

viewport-unit-buggyfill is published under the [MIT License](http://opensource.org/licenses/mit-license).

