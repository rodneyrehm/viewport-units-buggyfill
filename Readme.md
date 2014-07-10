# Viewport Units Buggyfill™

This is a fork of Rodney Rehm's original Viewport Units Buggyfill™ script.  It adds a variety of fixes to support 
IE9+, iOS6 for Safari and viewport units inside CSS3 calc() expressions (see changelog for details).

This script makes viewport units (vh|vw|vmin|vmax) work properly in Mobile Safari and IE9+.

This is a *buggyfill* (fixing bad behavior), not a *polyfill* (adding missing behavior). If the browser doesn't know how to deal with the [viewport units](http://www.w3.org/TR/css3-values/#viewport-relative-lengths) - `vw`, `vh`, `vmin` and `vmax` - it won't gain the capability through this script, because this buggyfill uses the [CSSOM](http://dev.w3.org/csswg/cssom/) to access the defined styles.

It does, however, accomodate browsers that have partial, but not full support for vmin/vmax units.

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
// register orientationchange event (and resize events in IE9+) to repeat when necessary
// will only engage for Mobile Safari on iOS and IE9+
viewportUnitsBuggyfill.init();
// ignore user agent force initialization
viewportUnitsBuggyfill.init({force: true});
// reduces the amount of times the buggyfill is reinitialized on window resize in IE
// for performance reasons.
viewportUnitsBuggyfill.init({useResizeDebounce: 250});

// update internal declarations cache and recalculate pixel styles
// this is handy when you add styles after .init() was run
viewportUnitsBuggyfill.refresh();

// you can do things manually (without the style-element injection):
// identify all declarations using viewport units
viewportUnitsBuggyfill.findProperties();
var cssText = viewportUnitsBuggyfill.getCss();
```

## Cross Origin Stylesheets

**Warning:** Including stylesheets from third party services, like Google WebFonts, requires those resources to be served with appropriate CORS headers. 

## Changelog

### 0.4 (July 10th 2014) ###

* fixes IE9 and Safari native way of calculating viewport units differently inside of a frame. Without this buggyfill, IE9 will assume the 100vw and 100vh to be the width and height of the parent document’s viewport, while Safari for iOS will choose 1px (!!!!) for both.
* fixes a bug in Safari in iOS where it cannot do native viewport units in a lot of the more complicated CSS properties (e.g. text-shadow).
* fixes IE9's issue when calculate viewport units correctly when changing media-query breakpoints.
* adds vmin support for IE9 (instead of vm, IE9's equivalent to vmin) as well as max support in IE9 and 10.  This is done by hacking IE's behavior CSS property, like so: 
```css
.myLargeBlock {
    
  /* Non-IE browsers */
  width: 50vmin;
  height: 50vmin;
  
  /* IE9 and 10 */
  behavior: 'vmin-vmax-hack: true; width: 50vmin; height: 50vmin;';

}
```
* adds the ability for viewport units to be used inside of calc() expressions in iOS Safari and IE9+.
```css
.box {
  
  top: calc(50vh -  100px );
  left: calc(50vw -  100px );
  /*
   * Here is the code for WebKit browsers that will allow 
   * viewport-units-buggyfill.js to perform calc on viewport
   * units. 
   */
  content: 'vw-calc-hack: true; top: calc(50vh -  100px ); left: calc(50vw -  100px );';
}
```
* IE9 and 10 does not support vmax
### 0.3.1 (April 16th 2014) ###

* fixing browser detection to include UIWebView - Issue #7, [tylerstalder](https://github.com/tylerstalder)

### 0.3.0 (April 9th 2014) ###

* fixing cross origin resource problem with CSSOM - Issue #6

### 0.2.3 (March 10th 2014) ###

* fixing multiple competing media-attribute-switched stylesheets - [Issue #5](https://github.com/rodneyrehm/viewport-units-buggyfill/issues/5)
* fixing double initialization and call of `reresh()` without being initialized - [Issue #3](https://github.com/rodneyrehm/viewport-units-buggyfill/issues/3)
* fixing `<br>`s caused by `innerText` by using `textContent` instead

### 0.2.2 (January 31st 2014) ###

* fixing unhandled empty `<style>` elements - [Issue #2](https://github.com/rodneyrehm/viewport-units-buggyfill/issues/2)

### 0.2.1 (January 25th 2014) ###

* adding `force` option to `init()`
* fixing the handling of non-iterable CSSRules - [Issue #1](https://github.com/rodneyrehm/viewport-units-buggyfill/issues/1)

### 0.2.0 (January 24th 2014) ###

* optimizing generated CSS (by grouping selectors)
* adding browser sniffing

### 0.1.0 (January 23rd 2014) ###

* Initial Version


## License

viewport-unit-buggyfill is published under the [MIT License](http://opensource.org/licenses/mit-license).

