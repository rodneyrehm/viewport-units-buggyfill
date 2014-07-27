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
  var isMobileSafari = /(iPhone|iPod|iPad).+AppleWebKit/i.test(window.navigator.userAgent);
  var viewportUnitExpression = /([+-]?[0-9.]+)(vh|vw|vmin|vmax)/g;
  var forEach = [].forEach;
  var dimensions;
  var declarations;
  var styleNode;

  // zoltan hacks
  var calcExpression = /calc\(/g;
  var quoteExpression = /[\"\']/g;
  var urlExpression = /url\([^\)]*\)/g;
  var isOldInternetExplorer = false;
  var supportsVminmax = true;
  var supportsVminmaxCalc = true;

  // WARNING!
  // Do not remove the following conditional comment.
  // It is required to identify the current version of IE

  /*@cc_on

  @if (@_jscript_version <= 10)
    isOldInternetExplorer = true;
    supportsVminmaxCalc = false;
    supportsVminmax = false;
  @end

  @*/

  function debounce(func, wait) {
    var timeout;
    return function() {
      var context = this;
      var args = arguments;
      var callback = function() {
        func.apply(context, args);
      };

      clearTimeout(timeout);
      timeout = setTimeout(callback, wait);
    };
  }

  function initialize(initOptions) {
    if (initOptions === true) {
      initOptions = {
        force: true
      };
    }

    options = initOptions || {};
    if (initialized || (!options.force && !isMobileSafari && !isOldInternetExplorer)) {
      // this buggyfill only applies to mobile safari
      return;
    }

    // previous option names
    /*jshint camelcase:false*/
    !options.refreshDebounceWait && (options.refreshDebounceWait = options.use_resize_debounce);
    !options.behaviorHack && (options.behaviorHack = options.use_css_behavior_hack);
    !options.contentHack && (options.contentHack = options.use_css_content_hack);
    /*jshint camelcase:true*/

    // Test viewport units support in calc() expressions
    var div = document.createElement('div');
    div.style.width = '1vmax';
    supportsVminmax = div.style.width !== '';

    // there is no accurate way to detect this programmatically.
    if (isMobileSafari) {
      supportsVminmaxCalc = false;
    }

    initialized = true;
    styleNode = document.createElement('style');
    styleNode.id = 'patched-viewport';
    document.head.appendChild(styleNode);

    // Issue #6: Cross Origin Stylesheets are not accessible through CSSOM,
    // therefore download and inject them as <style> to circumvent SOP.
    importCrossOriginLinks(function() {
      var _refresh = debounce(refresh, options.refreshDebounceWait || 100);
      // doing a full refresh rather than updateStyles because an orientationchange
      // could activate different stylesheets
      window.addEventListener('orientationchange', _refresh, true);
      // orientationchange might have happened while in a different window
      window.addEventListener('pageshow', _refresh, true);

      if (isOldInternetExplorer || options.force || inIframe()) {
        window.addEventListener('resize', _refresh, true);
      }

      refresh();
    });
  }

  // from http://stackoverflow.com/questions/326069/how-to-identify-if-a-webpage-is-being-loaded-inside-an-iframe-or-directly-into-t
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

    // iOS Safari will report window.innerWidth and .innerHeight as 0
    // unless a timeout is used here.
    // TODO: figure out WHY innerWidth === 0
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

  // iOS SAFARI, IE9: abuse "content" if "use_css_content_hack" specified
  // IE9: abuse "behavior" if "use_css_behavior_hack" specified
  function checkHacks(rule, name, value) {
    if (!options.contentHack && !options.behaviorHack) {
      return;
    }

    if (name !== 'content' && name !== 'behavior') {
      return;
    }

    var needsCalcFix = (options.contentHack && !supportsVminmaxCalc && name === 'content' && value.indexOf('use_css_content_hack') > -1);
    var needsVminVmaxFix = (options.behaviorHack && !supportsVminmax && name === 'behavior' && value.indexOf('use_css_behavior_hack') > -1);
    if (!needsCalcFix && !needsVminVmaxFix) {
      return;
    }

    var fakeRules = value.replace(quoteExpression, '');
    if (needsVminVmaxFix) {
      fakeRules = fakeRules.replace(urlExpression, '');
    }

    fakeRules.split(';').forEach(function(fakeRuleElement) {
      var fakeRule = fakeRuleElement.split(':');
      if (fakeRule.length !== 2) {
        return;
      }

      var name = fakeRule[0].trim();
      var value = fakeRule[1].trim();
      if (name === 'use_css_content_hack' || name === 'use_css_behavior_hack') {
        return;
      }

      declarations.push([rule, name, value]);
      if (calcExpression.test(value)) {
        var webkitValue = value.replace(calcExpression, '-webkit-calc(');
        declarations.push([rule, name, webkitValue]);
      }
    });
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

    if (isOldInternetExplorer && name === 'filter') {
      // remove unit "px"
      _value = parseInt(_value, 10);
    }

    if (name) {
      // skipping KeyframesRule
      _selectors.push(rule.selectorText);
      _value = name + ': ' + _value + ';';
    }

    var _rule = rule.parentRule;
    while (_rule) {
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
