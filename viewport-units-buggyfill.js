/*!
 * viewport-units-buggyfill v0.3.1
 * @web: https://github.com/rodneyrehm/viewport-units-buggyfill/
 * @author: Rodney Rehm - http://rodneyrehm.de/en/
 */

(function (root, factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like enviroments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.viewportUnitsBuggyfill = factory();
  }
}(this, function () {
  'use strict';
  /*global document, window, location, XMLHttpRequest, XDomainRequest*/

  var initialized = false;
  var options;
  var refreshDebounce;
  var viewportUnitExpression = /([+-]?[0-9.]+)(vh|vw|vmin|vmax)/g;
  var calcExpression = /calc\(/g;
  var quoteExpression = /[\"\']/g;
  var urlExpression = /url\([^\)]*\)/g;
  var forEach = [].forEach;
  var dimensions;
  var declarations;
  var styleNode;
  var is_safari_or_uiwebview = /(iPhone|iPod|iPad).+AppleWebKit/i.test(window.navigator.userAgent);
  var is_bad_IE = false;
  var no_vmin_vmax = false;
  var no_vmin_in_calc = false;
  var use_css_content_hack = false;
  var use_css_behavior_hack = false;

  /*
   * Do not remove this comment before.  It is used by IE to test what version
   * we are running.
   */

  /*@cc_on

  @if (@_jscript_version <= 10)
    is_bad_IE = true;
    no_vmin_in_calc = true;
    no_vmin_vmax = true;
  @end

  @*/

  // Debounce function from http://davidwalsh.name/javascript-debounce-function
  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  function debounce(func, wait, immediate) {
    var timeout;
    return function() {
      var context = this;
      var args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        timeout = null;
        if (!immediate) {
          func.apply(context, args);
        }
      }, wait);

      if (immediate && !timeout) {
        func.apply(context, args);
      }
    };
  }

  function initialize(initOptions) {
    options = initOptions || {};
    if (initialized || (!options.force && !is_safari_or_uiwebview && !is_bad_IE)) {
      // this buggyfill only applies to mobile safari
      return;
    }

    /*
     * Test to see if viewport units can be used in calc() expressions
     */
    var div = document.createElement('div');
    div.style.width = '1vmax';
    if (div.style.width === '') {
      no_vmin_vmax = true;
    }

    // there is no accurate way to detect this programmatically.
    no_vmin_in_calc = no_vmin_in_calc || is_safari_or_uiwebview;
    use_css_behavior_hack = !! options.use_css_behavior_hack;
    use_css_content_hack = !! options.use_css_content_hack;
    initialized = true;
    styleNode = document.createElement('style');
    styleNode.id = 'patched-viewport';
    document.head.appendChild(styleNode);

    // Issue #6: Cross Origin Stylesheets are not accessible through CSSOM,
    // therefore download and inject them as <style> to circumvent SOP.
    importCrossOriginLinks(function() {
      // doing a full refresh rather than updateStyles because an orientationchange
      // could activate different stylesheets
      window.addEventListener('orientationchange', refresh, true);
      // we must add a pageShow event here, since a user could have gone to a
      // different page, rotated the device, and then went back to the original
      // page, which doesn't update the viewport units.
      window.addEventListener('pageshow', refresh, true);
      if (is_bad_IE || options.force || inIframe()) {
        if (options.use_resize_debounce) {
          if (typeof options.use_resize_debounce === 'number') {
            refreshDebounce = debounce(refresh, options.use_resize_debounce);
          } else {
            refreshDebounce = debounce(refresh, 250);
          }

          window.addEventListener('resize', refreshDebounce, true);
        } else {
          window.addEventListener('resize', refresh, true);
        }
      }

      refresh();
    });
  }

  /*
   * code to detect if document is in an iframe from
   * http://stackoverflow.com/questions/326069/how-to-identify-if-a-webpage-is-being-loaded-inside-an-iframe-or-directly-into-t
   */
  function inIframe() {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }

  function updateStyles() {
    styleNode.textContent = getReplacedViewportUnits();
  }

  function refresh() {
    if (!initialized) {
      return;
    }

    findProperties();

    /*
     * iOS Safari will report window.innerWidth and .innerHeight as 0
     * unless a timeout is used here.
     */
    setTimeout(function() {
      updateStyles();
    }, 1);
  }

  function findProperties() {
    declarations = [];
    forEach.call(document.styleSheets, function(sheet) {
      if (sheet.ownerNode.id === 'patched-viewport' || !sheet.cssRules) {
        // skip entire sheet because no rules ara present or it's the target-element of the buggyfill
        return;
      }

      if (sheet.media && sheet.media.mediaText && window.matchMedia && !window.matchMedia(sheet.media.mediaText).matches) {
        // skip entire sheet because media attribute doesn't match
        return;
      }

      forEach.call(sheet.cssRules, findDeclarations);
    });

    return declarations;
  }

  function findDeclarations(rule) {
    if (rule.type === 7) {
      var value = rule.cssText;
      viewportUnitExpression.lastIndex = 0;
      if (viewportUnitExpression.test(value)) {
        // KeyframesRule does not have a CSS-PropertyName
        // checkHacks(rule, null, value);
        declarations.push([rule, null, value]);
      }

      return;
    }

    if (!rule.style) {
      if (!rule.cssRules) {
        return;
      }

      forEach.call(rule.cssRules, function(_rule) {
        findDeclarations(_rule);
      });

      return;
    }

    forEach.call(rule.style, function(name) {
      var value = rule.style.getPropertyValue(name);
      viewportUnitExpression.lastIndex = 0;
      if (viewportUnitExpression.test(value)) {
        checkHacks(rule, name, value);
        declarations.push([rule, name, value]);
      }
    });
  }

  function checkHacks(rule, name, value) {
    /*
     * Special cases:
     *
     * 1) FOR iOS SAFARI AND IE9: if this the name is "content", we
     *    check to see if the value matches "use_css_content_hack".
     *    If so, then we parse the properties after that
     *    and apply fixes to them.
     *
     * 2) FOR IE9: if the name is "behavior", we check to
     *    see if the value matches "use_css_behavior_hack".
     *    If so, then we parse the properties after that and
     *    apply fixes to them.
     */
    var needsCalcFix = (use_css_content_hack && no_vmin_in_calc && name === 'content' && value.indexOf('use_css_content_hack') >= 0);
    var needsVminVmaxFix = (use_css_behavior_hack && no_vmin_vmax && name === 'behavior' && value.indexOf('use_css_behavior_hack') >= 0);

    if (needsCalcFix || needsVminVmaxFix) {
      var fakeRules = value.replace(quoteExpression, '');
      if (needsVminVmaxFix) {
        fakeRules = fakeRules.replace(urlExpression, '');
      }

      fakeRules = fakeRules.split(';');
      for (var i = 0; i < fakeRules.length; i++) {
        var fakeRule = fakeRules[i].split(':');
        if (fakeRule.length === 2) {
          name = fakeRule[0].trim();
          value = fakeRule[1].trim();
          if (name !== 'use_css_content_hack' && name !== 'use_css_behavior_hack') {
            declarations.push([rule, name, value]);
            if (calcExpression.test(value)) {
              var webkitValue = value.replace(calcExpression, '-webkit-calc(');
              declarations.push([rule, name, webkitValue]);
            }
          }
        }
      }
    }
  }

  function getReplacedViewportUnits() {
    dimensions = getViewport();

    var css = [];
    var buffer = [];
    var open;
    var close;

    declarations.forEach(function(item) {
      var _item = overwriteDeclaration.apply(null, item);
      var _open = _item.selector.length ? (_item.selector.join(' {\n') + ' {\n') : '';
      var _close = new Array(_item.selector.length + 1).join('\n}');

      if (!_open || _open !== open) {
        if (buffer.length) {
          css.push(open + buffer.join('\n') + close);
          buffer.length = 0;
        }

        if (_open) {
          open = _open;
          close = _close;
          buffer.push(_item.content);
        } else {
          css.push(_item.content);
          open = null;
          close = null;
        }

        return;
      }

      if (_open && !open) {
        open = _open;
        close = _close;
      }

      buffer.push(_item.content);
    });

    if (buffer.length) {
      css.push(open + buffer.join('\n') + close);
    }

    return css.join('\n\n');
  }

  function overwriteDeclaration(rule, name, value) {
    var _value = value.replace(viewportUnitExpression, replaceValues);
    var  _selectors = [];

    /*
     * If this is an IE visual filter, then we take out the px, since
     * they all take pixel values without the px after the number.
     * This is a little inefficient, but it is the only way I know
     * how to do this.
     */
    if (is_bad_IE && name === 'filter') {
      _value = _value.replace(/px/g, '');
    }

    if (name) {
      _selectors.push(rule.selectorText);
      _value = name + ': ' + _value + ';';
    }

    var _rule = rule.parentRule;
    while (_rule) {
      // changed from
      // _selectors.unshift('@media ' + join.call(_rule.media, ', '));
      // because it wasn't working in IE9.
      _selectors.unshift('@media ' + _rule.media.mediaText);
      _rule = _rule.parentRule;
    }

    return {
      selector: _selectors,
      content: _value
    };
  }

  function replaceValues(match, number, unit) {
    var _base = dimensions[unit];
    var _number = parseFloat(number) / 100;
    return (_number * _base) + 'px';
  }

  function getViewport() {
    var vh = window.innerHeight;
    var vw = window.innerWidth;

    return {
      vh: vh,
      vw: vw,
      vmax: Math.max(vw, vh),
      vmin: Math.min(vw, vh)
    };
  }

  function importCrossOriginLinks(next) {
    var _waiting = 0;
    var decrease = function() {
      _waiting--;
      if (!_waiting) {
        next();
      }
    };

    forEach.call(document.styleSheets, function(sheet) {
      if (!sheet.href || origin(sheet.href) === origin(location.href)) {
        // skip <style> and <link> from same origin
        return;
      }

      _waiting++;
      convertLinkToStyle(sheet.ownerNode, decrease);
    });

    if (!_waiting) {
      next();
    }
  }

  function origin(url) {
    return url.slice(0, url.indexOf('/', url.indexOf('://') + 3));
  }

  function convertLinkToStyle(link, next) {
    getCors(link.href, function() {
      var style = document.createElement('style');
      style.media = link.media;
      style.setAttribute('data-href', link.href);
      style.textContent = this.responseText;
      link.parentNode.replaceChild(style, link);
      next();
    }, next);
  }

  function getCors(url, success, error) {
    var xhr = new XMLHttpRequest();
    if ('withCredentials' in xhr) {
      // XHR for Chrome/Firefox/Opera/Safari.
      xhr.open('GET', url, true);
    } else if (typeof XDomainRequest !== 'undefined') {
      // XDomainRequest for IE.
      xhr = new XDomainRequest();
      xhr.open('GET', url);
    } else {
      throw new Error('cross-domain XHR not supported');
    }

    xhr.onload = success;
    xhr.onerror = error;
    xhr.send();
    return xhr;
  }

  return {
    version: '0.3.1',
    findProperties: findProperties,
    getCss: getReplacedViewportUnits,
    init: initialize,
    refresh: refresh
  };

}));
