# Viewport Units Buggyfill™

This is a *buggyfill* (fixing bad behavior), not a *polyfill* (adding missing behavior). That said, it provides hacks for you to get viewport units working in old IE and Android Stock Browser as well. If the browser doesn't know how to deal with the [viewport units](http://www.w3.org/TR/css3-values/#viewport-relative-lengths) - `vw`, `vh`, `vmin` and `vmax` - this library will not improve the situation unless you're using the hacks detailed below. The buggyfill uses the [CSSOM](http://dev.w3.org/csswg/cssom/) to access the defined styles rather than ship its own CSS parser, that'S why the hacks abuse the CSS property `content` to get the values across.

---

Amongst other things, the buggyfill helps with the following problems:

* viewport units (vh|vw|vmin|vmax) in Mobile Safari
* viewport units inside `calc()` expressions in Mobile Safari and IE9+ (hack)
* `vmin`, `vmax` in IE9+ (hack)
* viewport units in old Android Stock Browser (hack)

---

The buggyfill iterates through all defined styles the document knows and extracts those that uses a viewport unit. After resolving the relative units against the viewport's dimensions, CSS is put back together and injected into the document in a `<style>` element. Listening to the `orientationchange` event allows the buggyfill to update the calculated dimensions accordingly.

The hacks use the `content` property to transport viewport-unit styles that need to be calculated by script, this is done because unsupporting browsers do not expose original declarations such as `height: calc(100vh - 10px)`:

```css
content: 'viewport-units-buggyfill; width: 50vmin; height: 50vmax; top: calc(50vh - 100px); left: calc(50vw - 100px);';
```

> **Note:** The `content` hack may not work well on `<img>` and other replaced elements, even though it should [compute to `content: normal;` on regular elements](https://developer.mozilla.org/en-US/docs/Web/CSS/content). If you find yourself in such a situation, this may be a way out:
> ```css
> img {
>   content: normal !important;
> }
> ```

> **Note:** This buggyfill only works on stylesheets! viewport units used in `style` attributes are *not* resolved.

> **Note:** The buggyfill can easily trip over files host on different origins (requiring CORS) and relative URLs to images/fonts/… within stylesheets. [#11](https://github.com/rodneyrehm/viewport-units-buggyfill/issues/11)


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

To engage the buggyfill with hacks, pass them in at initialization:

```js
var hacks = require('viewport-units-buggyfill/viewport-units-buggyfill.hacks');
require('viewport-units-buggyfill').init({
  hacks: hacks
});
```

To exempt certain stylesheets from being processed, the attribute `data-viewport-units-buggyfill="ignore"`:

```html
<link rel="stylesheet" href="file-to-ignore.css" data-viewport-units-buggyfill="ignore">
<link rel="stylesheet" href="file-to-process.css">
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
viewportUnitsBuggyfill.init({refreshDebounceWait: 250});

// This enables abusing the CSS property 'content' to allow transporting
// viewport unit values for browsers with spotty support:
//   * vmin in IE9
//   * vmax in IE9, iOS <= 6
//   * calc(vh/vmin) in iOS < 8 and Android Stock Browser <= 4.4
//   * all of viewport units in Android Stock Browser <= 4.3
//
// To engage these hacks, you need to load the hacks file as well:
//
//   <script src="/path/to/viewport-units-buggyfill.hacks.js"></script>
//
viewportUnitsBuggyfill.init({hacks: window.viewportUnitsBuggyfillHacks});

// append the patched stylesheet to body instead of head
viewportUnitsBuggyfill.init({appendToBody: true});

// update internal declarations cache and recalculate pixel styles
// this is handy when you add styles after .init() was run
viewportUnitsBuggyfill.refresh();

// you can do things manually (without the style-element injection):
// identify all declarations using viewport units
viewportUnitsBuggyfill.findProperties();
var cssText = viewportUnitsBuggyfill.getCss();
```

In CSS you can declare fallbacks to be used by the buggyfill's hacks:

```css
.my-viewport-units-using-thingie {
  width: 50vmin;
  height: 50vmax;
  top: calc(50vh - 100px);
  left: calc(50vw - 100px);

  /* hack to engage viewport-units-buggyfill */
  content: 'viewport-units-buggyfill; width: 50vmin; height: 50vmax; top: calc(50vh - 100px); left: calc(50vw - 100px);';
}
```

The buggyfill emits the event `viewport-unit-buggyfill-init` before initializing and `viewport-unit-buggyfill-style` after applying the fixed styles to the document. The events are dispatched on `window` and may be used as follows:

```js
window.addEventListener('viewport-unit-buggyfill-init', function() {
  console.log('getting lost in CSSOM');
});
window.addEventListener('viewport-unit-buggyfill-style', function() {
  console.log('updated rules using viewport unit');
});
```


## Cross Origin Stylesheets

**Warning:** Including stylesheets from third party services, like Google WebFonts, requires those resources to be served with appropriate CORS headers. You may also need to be aware of the fact that relative URLs within those stylesheets are NOT resolved, possibly leading to missing fonts and images.


## Changelog

### 0.6.2 (July 21st 2017) ###

* allow appending generated CSS to `<body>` - [#84](https://github.com/rodneyrehm/viewport-units-buggyfill/pull/84)
* do not break URLs when replacing viewport units - [#78](https://github.com/rodneyrehm/viewport-units-buggyfill/pull/78)
* wrapping everything in an IIFE - [#80](https://github.com/rodneyrehm/viewport-units-buggyfill/issues/80)

### 0.6.1 (March 16th 2017) ###

* fixing UA sniffing for IE10 - [#69](https://github.com/rodneyrehm/viewport-units-buggyfill/issue/69), [#68](https://github.com/rodneyrehm/viewport-units-buggyfill/issue/68)
* adding support for [`@supports`](https://developer.mozilla.org/en/docs/Web/CSS/@supports) - [#76](https://github.com/rodneyrehm/viewport-units-buggyfill/issue/76)
* switching from jslint to [eslint](http://eslint.org/)

### 0.6.0 (March 19th 2016) ###

* enabling the buggyfill for iOS 8 and iOS 9 - [#67](https://github.com/rodneyrehm/viewport-units-buggyfill/issue/67), [#35](https://github.com/rodneyrehm/viewport-units-buggyfill/issue/35)
* enabling the buggyfill for Microsoft Edge, as it still does not understand `vmax` - [#60](https://github.com/rodneyrehm/viewport-units-buggyfill/issue/60)
* adding init option `ignoreVmax` to prevent IE9+ from engaging the hack - [#56](https://github.com/rodneyrehm/viewport-units-buggyfill/issue/56)
* fixing foreign origin access violation in Internet Explorer - [#61](https://github.com/rodneyrehm/viewport-units-buggyfill/issue/61), [#38](https://github.com/rodneyrehm/viewport-units-buggyfill/issue/38)

### 0.5.5 (August 21st 2015) ###

* adding events `viewport-unit-buggyfill-init` and `viewport-unit-buggyfill-style` ([#63](https://github.com/rodneyrehm/viewport-units-buggyfill/pull/63) by [redaxmedia](https://github.com/redaxmedia), [#62](https://github.com/rodneyrehm/viewport-units-buggyfill/issue/62))

### 0.5.4 (July 15th 2015) ###

* changing Internet Explorer detection from Conditional Comments to UA sniffing - ([#57](https://github.com/rodneyrehm/viewport-units-buggyfill/pull/57) by [dillonlucente](https://github.com/dillonlucente), [#43](https://github.com/rodneyrehm/viewport-units-buggyfill/pull/43), [#40](https://github.com/rodneyrehm/viewport-units-buggyfill/pull/40))

### 0.5.3 (April 21st 2015) ###

* fixing CORS importer to respect `data-viewport-units-buggyfill="ignore"`  ([#48](https://github.com/rodneyrehm/viewport-units-buggyfill/pull/48))

### 0.5.2 (April 5th 2015) ###

* fixing init for IE8 and below to avoid exception due to bad CSSOM ([#46](https://github.com/rodneyrehm/viewport-units-buggyfill/issues/46), [#47](https://github.com/rodneyrehm/viewport-units-buggyfill/issues/47) by [zoltan-dulac](https://github.com/zoltan-dulac))

### 0.5.1 (March 10th 2015) ###

* fixing generated `<style>` element to maintain highest precedence ([#36](https://github.com/rodneyrehm/viewport-units-buggyfill/issues/36))
* fixing the preservation of !important rules ([#44](https://github.com/rodneyrehm/viewport-units-buggyfill/issues/44), [#45](https://github.com/rodneyrehm/viewport-units-buggyfill/issues/45) by [mderazon](https://github.com/mderazon))

### 0.5.0 (December 23rd 2014) ###

**WARNING: Breaking Changes** (and a Merry Christmas to you, too :)

* not engaging the buggyfill on iOS8+ anymore ([#19](https://github.com/rodneyrehm/viewport-units-buggyfill/issues/19), [#23](https://github.com/rodneyrehm/viewport-units-buggyfill/issues/23), [#27](https://github.com/rodneyrehm/viewport-units-buggyfill/issues/27))
* also engaging buggyfill for WebViews in <iOS8 ([#30](https://github.com/rodneyrehm/viewport-units-buggyfill/issues/30))
* fixing stock Android browser behavior of viewport units when changing breakpoints
* fixing `content` hack breaking in Opera Mini (because it actually inlines the content everywhere)
* fixing `rule.cssText` throwing an Error in IE (not reproducible, whatever) [#21](https://github.com/rodneyrehm/viewport-units-buggyfill/issues/21))
* remove separate CSS content and behavior hacks and merge them into one. **This is a backward compatibility breaking change!** The only acceptable way to specify viewport-unit rules to a non-supporting browser now is `content: "viewport-units-buggyfill; width: 20vw;"` ([#20](https://github.com/rodneyrehm/viewport-units-buggyfill/issues/20), [#25](https://github.com/rodneyrehm/viewport-units-buggyfill/issues/25))
* removing need for initialization options `behaviorHack` and `contentHack`, passing `hacks` will suffice ([#20](https://github.com/rodneyrehm/viewport-units-buggyfill/issues/20), [#25](https://github.com/rodneyrehm/viewport-units-buggyfill/issues/25))
* adding IE11 to the list to fix its `vmax` support ([#31](https://github.com/rodneyrehm/viewport-units-buggyfill/pull/31))
* adding `<link rel="…" data-viewport-units-buggyfill="ignore">` to prevent specific stylesheets from being processed (suggested in [#11](https://github.com/rodneyrehm/viewport-units-buggyfill/pull/11))

### 0.4.1 (September 8th 2014) ###

* fixing `bower.json` (… narf)

### 0.4.0 (September 8th 2014) ###

* fixes IE9 and Safari native way of calculating viewport units differently inside of a frame. Without this buggyfill, IE9 will assume the `100vw` and `100vh` to be the width and height of the parent document’s viewport, while Safari for iOS will choose 1px (!!!!) for both.
* fixes IE9's issue when calculate viewport units correctly when changing media-query breakpoints.
* adds `vmin` support for IE9 (instead of `vm`, IE9's equivalent to vmin)  and `vmax` support to IE9 and 10. (Note that this will only work when initializing with `viewportUnitsBuggyfill.init({hacks: window.viewportUnitsBuggyfillHacks});`) and adding the `viewport-units-buggyfill.hacks.js` to the page after `viewport-units-buggyfill.js`.

```css
.myLargeBlock {
  /* Non-IE browsers */
  width: 50vmin;
  height: 50vmax;

  /* IE9 and 10 */
  behavior: 'use_css_behavior_hack: true; width: 50vmin; height: 50vmax;';
  /* WARNING: this syntax has been changed in v0.5.0 */
}
```
* adds the ability for viewport units to be used inside of calc() expressions in iOS Safari and IE9+, via the use of the `content` CSS property.  This seems like a good compromise since `content` is only valid inside `::before` and `::after` rules (as a result, it is not recommended use this hack inside of these rules).  (Note that this will only work when initializing with `viewportUnitsBuggyfill.init({hacks: window.viewportUnitsBuggyfillHacks});`) and adding the `viewport-units-buggyfill.hacks.js` to the page after `viewport-units-buggyfill.js`.

```css
.box {
  top: calc(50vh - 100px);
  left: calc(50vw - 100px);

  /*
   * Here is the code for WebKit browsers that will allow
   * viewport-units-buggyfill.js to perform calc on viewport
   * units.
   */
   content: 'use_css_content_hack: true; top: calc(50vh -  100px); left: calc(50vw -  100px);';
  /* WARNING: this syntax has been changed in v0.5.0 */
}
```

* Using the above hack one can also add support for vmax support in Safari for the older iOS6
* Adds support for viewport units inside of IE's `filter` property (a.k.a. Visual Filters).
* Added debounce initialization parameter, if it is desirable to not have IE9+ fire the polyfill so many times on a resize event.


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
