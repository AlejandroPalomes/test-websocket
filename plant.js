(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Plant = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
    /**
     * @module Plant.Flow
     * @description Methods to control cascade flows.
     */
    
    function noop() {}
    
    /**
     * Create async cascade resolver.
     * @param {...HandleType} args Handlable async functions.
     * @returns {function(Context)} Returns function which pass context through the stack.
     */
    function cascade(...args) {
      async function passThrough(initialCtx) {
        let ctx = initialCtx
    
        function next(handlers, newCtx) {
          ctx = newCtx || ctx
    
          if (handlers.length) {
            return handlers[0](Object.assign({}, ctx), next.bind(null, handlers.slice(1)))
          }
        }
    
        return await next(args, initialCtx)
      }
    
      return passThrough
    }
    
    /**
     * Creates async queue resolver which works while condition returns false.
     *
     * @param  {function(Context)} condition - Condition function which returns bool.
     * @returns {function(...HandleType)} Handlable async queue handler creator.
     */
    function whileLoop(condition) {
      return function(...handlers) {
        return conditional.bind(null, handlers, condition)
      }
    }
    
    async function conditional(handlers, condition, ctx, next) {
      for (const handler of handlers) {
        await handler(Object.assign({}, ctx), noop)
    
        if (condition(ctx) === false) {
          return
        }
      }
    
      await next()
    }
    
    /**
     * Handlable object should countain method handler() which returns async
     * function. This function receive two params: context and next.
     * @type {Handlable}
     * @prop {function()} handler Return async function.
     */
    
    /**
     * Get function from passed value.
     * @param  {function|Handlable} handler Handlable value.
     * @return {function(object,function)} Returns function.
     */
    function getHandler(handler) {
      if (typeof handler === 'object') {
        return handler.getHandler()
      }
      else {
        return handler
      }
    }
    
    /**
     * Determine that request is finished. Using to manage cascade depth.
     *
     * @param {NativeContext} options Native context.
     * @returns {Boolean} Return true if response has body or socket closed.
     */
    function isNotFinished({res, socket}) {
      return res.hasBody === false && socket.isEnded === false
    }
    
    /**
     * Create async request handlers queue. It iterate request handlers and if
     * request handler doesn't sent response it runs next request handler and so.
     *
     * @param  {...(function()|Handlable)} handlers Handlable async functions.
     * @return {function(object,function)} Returns function which pass context through the queue.
     */
    const whileNotFinished = whileLoop(isNotFinished)
    
    /**
     * Returns function that runs handlers until request headers are not sent.
     *
     * @param  {...(function()|Handlable)} args - List of handlable values.
     * @returns {function(object, function())} Returns function to pass value into handlers.
     */
    const or = function(...args) {
      return whileNotFinished(...args.map(getHandler))
    }
    
    /**
     * Returns function that runs handlers in depth.
     *
     * @param  {...(function()|Handlable)} args - List of handlable values.
     * @returns {function(object)} Returns function to pass value into handlers.
     */
    const and = function(...args) {
      return cascade(...args.map(getHandler))
    }
    
    exports.cascade = cascade
    exports.whileLoop = whileLoop
    exports.or = or
    exports.and = and
    exports.getHandler = getHandler
    
    },{}],2:[function(require,module,exports){
    /*!
     * cookie
     * Copyright(c) 2012-2014 Roman Shtylman
     * Copyright(c) 2015 Douglas Christopher Wilson
     * MIT Licensed
     */
    
    'use strict';
    
    /**
     * Module exports.
     * @public
     */
    
    exports.parse = parse;
    exports.serialize = serialize;
    
    /**
     * Module variables.
     * @private
     */
    
    var decode = decodeURIComponent;
    var encode = encodeURIComponent;
    var pairSplitRegExp = /; */;
    
    /**
     * RegExp to match field-content in RFC 7230 sec 3.2
     *
     * field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]
     * field-vchar   = VCHAR / obs-text
     * obs-text      = %x80-FF
     */
    
    var fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
    
    /**
     * Parse a cookie header.
     *
     * Parse the given cookie header string into an object
     * The object has the various cookies as keys(names) => values
     *
     * @param {string} str
     * @param {object} [options]
     * @return {object}
     * @public
     */
    
    function parse(str, options) {
      if (typeof str !== 'string') {
        throw new TypeError('argument str must be a string');
      }
    
      var obj = {}
      var opt = options || {};
      var pairs = str.split(pairSplitRegExp);
      var dec = opt.decode || decode;
    
      for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i];
        var eq_idx = pair.indexOf('=');
    
        // skip things that don't look like key=value
        if (eq_idx < 0) {
          continue;
        }
    
        var key = pair.substr(0, eq_idx).trim()
        var val = pair.substr(++eq_idx, pair.length).trim();
    
        // quoted values
        if ('"' == val[0]) {
          val = val.slice(1, -1);
        }
    
        // only assign once
        if (undefined == obj[key]) {
          obj[key] = tryDecode(val, dec);
        }
      }
    
      return obj;
    }
    
    /**
     * Serialize data into a cookie header.
     *
     * Serialize the a name value pair into a cookie string suitable for
     * http headers. An optional options object specified cookie parameters.
     *
     * serialize('foo', 'bar', { httpOnly: true })
     *   => "foo=bar; httpOnly"
     *
     * @param {string} name
     * @param {string} val
     * @param {object} [options]
     * @return {string}
     * @public
     */
    
    function serialize(name, val, options) {
      var opt = options || {};
      var enc = opt.encode || encode;
    
      if (typeof enc !== 'function') {
        throw new TypeError('option encode is invalid');
      }
    
      if (!fieldContentRegExp.test(name)) {
        throw new TypeError('argument name is invalid');
      }
    
      var value = enc(val);
    
      if (value && !fieldContentRegExp.test(value)) {
        throw new TypeError('argument val is invalid');
      }
    
      var str = name + '=' + value;
    
      if (null != opt.maxAge) {
        var maxAge = opt.maxAge - 0;
        if (isNaN(maxAge)) throw new Error('maxAge should be a Number');
        str += '; Max-Age=' + Math.floor(maxAge);
      }
    
      if (opt.domain) {
        if (!fieldContentRegExp.test(opt.domain)) {
          throw new TypeError('option domain is invalid');
        }
    
        str += '; Domain=' + opt.domain;
      }
    
      if (opt.path) {
        if (!fieldContentRegExp.test(opt.path)) {
          throw new TypeError('option path is invalid');
        }
    
        str += '; Path=' + opt.path;
      }
    
      if (opt.expires) {
        if (typeof opt.expires.toUTCString !== 'function') {
          throw new TypeError('option expires is invalid');
        }
    
        str += '; Expires=' + opt.expires.toUTCString();
      }
    
      if (opt.httpOnly) {
        str += '; HttpOnly';
      }
    
      if (opt.secure) {
        str += '; Secure';
      }
    
      if (opt.sameSite) {
        var sameSite = typeof opt.sameSite === 'string'
          ? opt.sameSite.toLowerCase() : opt.sameSite;
    
        switch (sameSite) {
          case true:
            str += '; SameSite=Strict';
            break;
          case 'lax':
            str += '; SameSite=Lax';
            break;
          case 'strict':
            str += '; SameSite=Strict';
            break;
          default:
            throw new TypeError('option sameSite is invalid');
        }
      }
    
      return str;
    }
    
    /**
     * Try decoding a string using a decoding function.
     *
     * @param {string} str
     * @param {function} decode
     * @private
     */
    
    function tryDecode(str, decode) {
      try {
        return decode(str);
      } catch (e) {
        return str;
      }
    }
    
    },{}],3:[function(require,module,exports){
    'use strict';
    
    const matchOperatorsRegex = /[|\\{}()[\]^$+*?.-]/g;
    
    module.exports = string => {
        if (typeof string !== 'string') {
            throw new TypeError('Expected a string');
        }
    
        return string.replace(matchOperatorsRegex, '\\$&');
    };
    
    },{}],4:[function(require,module,exports){
    'use strict';
    
    var has = Object.prototype.hasOwnProperty
      , prefix = '~';
    
    /**
     * Constructor to create a storage for our `EE` objects.
     * An `Events` instance is a plain object whose properties are event names.
     *
     * @constructor
     * @private
     */
    function Events() {}
    
    //
    // We try to not inherit from `Object.prototype`. In some engines creating an
    // instance in this way is faster than calling `Object.create(null)` directly.
    // If `Object.create(null)` is not supported we prefix the event names with a
    // character to make sure that the built-in object properties are not
    // overridden or used as an attack vector.
    //
    if (Object.create) {
      Events.prototype = Object.create(null);
    
      //
      // This hack is needed because the `__proto__` property is still inherited in
      // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
      //
      if (!new Events().__proto__) prefix = false;
    }
    
    /**
     * Representation of a single event listener.
     *
     * @param {Function} fn The listener function.
     * @param {*} context The context to invoke the listener with.
     * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
     * @constructor
     * @private
     */
    function EE(fn, context, once) {
      this.fn = fn;
      this.context = context;
      this.once = once || false;
    }
    
    /**
     * Add a listener for a given event.
     *
     * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
     * @param {(String|Symbol)} event The event name.
     * @param {Function} fn The listener function.
     * @param {*} context The context to invoke the listener with.
     * @param {Boolean} once Specify if the listener is a one-time listener.
     * @returns {EventEmitter}
     * @private
     */
    function addListener(emitter, event, fn, context, once) {
      if (typeof fn !== 'function') {
        throw new TypeError('The listener must be a function');
      }
    
      var listener = new EE(fn, context || emitter, once)
        , evt = prefix ? prefix + event : event;
    
      if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
      else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
      else emitter._events[evt] = [emitter._events[evt], listener];
    
      return emitter;
    }
    
    /**
     * Clear event by name.
     *
     * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
     * @param {(String|Symbol)} evt The Event name.
     * @private
     */
    function clearEvent(emitter, evt) {
      if (--emitter._eventsCount === 0) emitter._events = new Events();
      else delete emitter._events[evt];
    }
    
    /**
     * Minimal `EventEmitter` interface that is molded against the Node.js
     * `EventEmitter` interface.
     *
     * @constructor
     * @public
     */
    function EventEmitter() {
      this._events = new Events();
      this._eventsCount = 0;
    }
    
    /**
     * Return an array listing the events for which the emitter has registered
     * listeners.
     *
     * @returns {Array}
     * @public
     */
    EventEmitter.prototype.eventNames = function eventNames() {
      var names = []
        , events
        , name;
    
      if (this._eventsCount === 0) return names;
    
      for (name in (events = this._events)) {
        if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
      }
    
      if (Object.getOwnPropertySymbols) {
        return names.concat(Object.getOwnPropertySymbols(events));
      }
    
      return names;
    };
    
    /**
     * Return the listeners registered for a given event.
     *
     * @param {(String|Symbol)} event The event name.
     * @returns {Array} The registered listeners.
     * @public
     */
    EventEmitter.prototype.listeners = function listeners(event) {
      var evt = prefix ? prefix + event : event
        , handlers = this._events[evt];
    
      if (!handlers) return [];
      if (handlers.fn) return [handlers.fn];
    
      for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
        ee[i] = handlers[i].fn;
      }
    
      return ee;
    };
    
    /**
     * Return the number of listeners listening to a given event.
     *
     * @param {(String|Symbol)} event The event name.
     * @returns {Number} The number of listeners.
     * @public
     */
    EventEmitter.prototype.listenerCount = function listenerCount(event) {
      var evt = prefix ? prefix + event : event
        , listeners = this._events[evt];
    
      if (!listeners) return 0;
      if (listeners.fn) return 1;
      return listeners.length;
    };
    
    /**
     * Calls each of the listeners registered for a given event.
     *
     * @param {(String|Symbol)} event The event name.
     * @returns {Boolean} `true` if the event had listeners, else `false`.
     * @public
     */
    EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
      var evt = prefix ? prefix + event : event;
    
      if (!this._events[evt]) return false;
    
      var listeners = this._events[evt]
        , len = arguments.length
        , args
        , i;
    
      if (listeners.fn) {
        if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);
    
        switch (len) {
          case 1: return listeners.fn.call(listeners.context), true;
          case 2: return listeners.fn.call(listeners.context, a1), true;
          case 3: return listeners.fn.call(listeners.context, a1, a2), true;
          case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
          case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
          case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
        }
    
        for (i = 1, args = new Array(len -1); i < len; i++) {
          args[i - 1] = arguments[i];
        }
    
        listeners.fn.apply(listeners.context, args);
      } else {
        var length = listeners.length
          , j;
    
        for (i = 0; i < length; i++) {
          if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);
    
          switch (len) {
            case 1: listeners[i].fn.call(listeners[i].context); break;
            case 2: listeners[i].fn.call(listeners[i].context, a1); break;
            case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
            case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
            default:
              if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
                args[j - 1] = arguments[j];
              }
    
              listeners[i].fn.apply(listeners[i].context, args);
          }
        }
      }
    
      return true;
    };
    
    /**
     * Add a listener for a given event.
     *
     * @param {(String|Symbol)} event The event name.
     * @param {Function} fn The listener function.
     * @param {*} [context=this] The context to invoke the listener with.
     * @returns {EventEmitter} `this`.
     * @public
     */
    EventEmitter.prototype.on = function on(event, fn, context) {
      return addListener(this, event, fn, context, false);
    };
    
    /**
     * Add a one-time listener for a given event.
     *
     * @param {(String|Symbol)} event The event name.
     * @param {Function} fn The listener function.
     * @param {*} [context=this] The context to invoke the listener with.
     * @returns {EventEmitter} `this`.
     * @public
     */
    EventEmitter.prototype.once = function once(event, fn, context) {
      return addListener(this, event, fn, context, true);
    };
    
    /**
     * Remove the listeners of a given event.
     *
     * @param {(String|Symbol)} event The event name.
     * @param {Function} fn Only remove the listeners that match this function.
     * @param {*} context Only remove the listeners that have this context.
     * @param {Boolean} once Only remove one-time listeners.
     * @returns {EventEmitter} `this`.
     * @public
     */
    EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
      var evt = prefix ? prefix + event : event;
    
      if (!this._events[evt]) return this;
      if (!fn) {
        clearEvent(this, evt);
        return this;
      }
    
      var listeners = this._events[evt];
    
      if (listeners.fn) {
        if (
          listeners.fn === fn &&
          (!once || listeners.once) &&
          (!context || listeners.context === context)
        ) {
          clearEvent(this, evt);
        }
      } else {
        for (var i = 0, events = [], length = listeners.length; i < length; i++) {
          if (
            listeners[i].fn !== fn ||
            (once && !listeners[i].once) ||
            (context && listeners[i].context !== context)
          ) {
            events.push(listeners[i]);
          }
        }
    
        //
        // Reset the array, or remove it completely if we have no more listeners.
        //
        if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
        else clearEvent(this, evt);
      }
    
      return this;
    };
    
    /**
     * Remove all listeners, or those of the specified event.
     *
     * @param {(String|Symbol)} [event] The event name.
     * @returns {EventEmitter} `this`.
     * @public
     */
    EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
      var evt;
    
      if (event) {
        evt = prefix ? prefix + event : event;
        if (this._events[evt]) clearEvent(this, evt);
      } else {
        this._events = new Events();
        this._eventsCount = 0;
      }
    
      return this;
    };
    
    //
    // Alias methods names because people roll like that.
    //
    EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
    EventEmitter.prototype.addListener = EventEmitter.prototype.on;
    
    //
    // Expose the prefix.
    //
    EventEmitter.prefixed = prefix;
    
    //
    // Allow `EventEmitter` to be imported as module namespace.
    //
    EventEmitter.EventEmitter = EventEmitter;
    
    //
    // Expose the module.
    //
    if ('undefined' !== typeof module) {
      module.exports = EventEmitter;
    }
    
    },{}],5:[function(require,module,exports){
    (function (global){
    /**
     * lodash (Custom Build) <https://lodash.com/>
     * Build: `lodash modularize exports="npm" -o ./`
     * Copyright jQuery Foundation and other contributors <https://jquery.org/>
     * Released under MIT license <https://lodash.com/license>
     * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
     * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
     */
    
    /** Used as references for various `Number` constants. */
    var INFINITY = 1 / 0;
    
    /** `Object#toString` result references. */
    var symbolTag = '[object Symbol]';
    
    /**
     * Used to match `RegExp`
     * [syntax characters](http://ecma-international.org/ecma-262/6.0/#sec-patterns).
     */
    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g,
        reHasRegExpChar = RegExp(reRegExpChar.source);
    
    /** Detect free variable `global` from Node.js. */
    var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;
    
    /** Detect free variable `self`. */
    var freeSelf = typeof self == 'object' && self && self.Object === Object && self;
    
    /** Used as a reference to the global object. */
    var root = freeGlobal || freeSelf || Function('return this')();
    
    /** Used for built-in method references. */
    var objectProto = Object.prototype;
    
    /**
     * Used to resolve the
     * [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
     * of values.
     */
    var objectToString = objectProto.toString;
    
    /** Built-in value references. */
    var Symbol = root.Symbol;
    
    /** Used to convert symbols to primitives and strings. */
    var symbolProto = Symbol ? Symbol.prototype : undefined,
        symbolToString = symbolProto ? symbolProto.toString : undefined;
    
    /**
     * The base implementation of `_.toString` which doesn't convert nullish
     * values to empty strings.
     *
     * @private
     * @param {*} value The value to process.
     * @returns {string} Returns the string.
     */
    function baseToString(value) {
      // Exit early for strings to avoid a performance hit in some environments.
      if (typeof value == 'string') {
        return value;
      }
      if (isSymbol(value)) {
        return symbolToString ? symbolToString.call(value) : '';
      }
      var result = (value + '');
      return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
    }
    
    /**
     * Checks if `value` is object-like. A value is object-like if it's not `null`
     * and has a `typeof` result of "object".
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
     * @example
     *
     * _.isObjectLike({});
     * // => true
     *
     * _.isObjectLike([1, 2, 3]);
     * // => true
     *
     * _.isObjectLike(_.noop);
     * // => false
     *
     * _.isObjectLike(null);
     * // => false
     */
    function isObjectLike(value) {
      return !!value && typeof value == 'object';
    }
    
    /**
     * Checks if `value` is classified as a `Symbol` primitive or object.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
     * @example
     *
     * _.isSymbol(Symbol.iterator);
     * // => true
     *
     * _.isSymbol('abc');
     * // => false
     */
    function isSymbol(value) {
      return typeof value == 'symbol' ||
        (isObjectLike(value) && objectToString.call(value) == symbolTag);
    }
    
    /**
     * Converts `value` to a string. An empty string is returned for `null`
     * and `undefined` values. The sign of `-0` is preserved.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to process.
     * @returns {string} Returns the string.
     * @example
     *
     * _.toString(null);
     * // => ''
     *
     * _.toString(-0);
     * // => '-0'
     *
     * _.toString([1, 2, 3]);
     * // => '1,2,3'
     */
    function toString(value) {
      return value == null ? '' : baseToString(value);
    }
    
    /**
     * Escapes the `RegExp` special characters "^", "$", "\", ".", "*", "+",
     * "?", "(", ")", "[", "]", "{", "}", and "|" in `string`.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category String
     * @param {string} [string=''] The string to escape.
     * @returns {string} Returns the escaped string.
     * @example
     *
     * _.escapeRegExp('[lodash](https://lodash.com/)');
     * // => '\[lodash\]\(https://lodash\.com/\)'
     */
    function escapeRegExp(string) {
      string = toString(string);
      return (string && reHasRegExpChar.test(string))
        ? string.replace(reRegExpChar, '\\$&')
        : string;
    }
    
    module.exports = escapeRegExp;
    
    }).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
    },{}],6:[function(require,module,exports){
    /**
     * lodash 3.0.2 (Custom Build) <https://lodash.com/>
     * Build: `lodash modern modularize exports="npm" -o ./`
     * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
     * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
     * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
     * Available under MIT license <https://lodash.com/license>
     */
    
    /**
     * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
     * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
     *
     * @static
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an object, else `false`.
     * @example
     *
     * _.isObject({});
     * // => true
     *
     * _.isObject([1, 2, 3]);
     * // => true
     *
     * _.isObject(1);
     * // => false
     */
    function isObject(value) {
      // Avoid a V8 JIT bug in Chrome 19-20.
      // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
      var type = typeof value;
      return !!value && (type == 'object' || type == 'function');
    }
    
    module.exports = isObject;
    
    },{}],7:[function(require,module,exports){
    /**
     * lodash (Custom Build) <https://lodash.com/>
     * Build: `lodash modularize exports="npm" -o ./`
     * Copyright jQuery Foundation and other contributors <https://jquery.org/>
     * Released under MIT license <https://lodash.com/license>
     * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
     * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
     */
    
    /** `Object#toString` result references. */
    var objectTag = '[object Object]';
    
    /**
     * Checks if `value` is a host object in IE < 9.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
     */
    function isHostObject(value) {
      // Many host objects are `Object` objects that can coerce to strings
      // despite having improperly defined `toString` methods.
      var result = false;
      if (value != null && typeof value.toString != 'function') {
        try {
          result = !!(value + '');
        } catch (e) {}
      }
      return result;
    }
    
    /**
     * Creates a unary function that invokes `func` with its argument transformed.
     *
     * @private
     * @param {Function} func The function to wrap.
     * @param {Function} transform The argument transform.
     * @returns {Function} Returns the new function.
     */
    function overArg(func, transform) {
      return function(arg) {
        return func(transform(arg));
      };
    }
    
    /** Used for built-in method references. */
    var funcProto = Function.prototype,
        objectProto = Object.prototype;
    
    /** Used to resolve the decompiled source of functions. */
    var funcToString = funcProto.toString;
    
    /** Used to check objects for own properties. */
    var hasOwnProperty = objectProto.hasOwnProperty;
    
    /** Used to infer the `Object` constructor. */
    var objectCtorString = funcToString.call(Object);
    
    /**
     * Used to resolve the
     * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
     * of values.
     */
    var objectToString = objectProto.toString;
    
    /** Built-in value references. */
    var getPrototype = overArg(Object.getPrototypeOf, Object);
    
    /**
     * Checks if `value` is object-like. A value is object-like if it's not `null`
     * and has a `typeof` result of "object".
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
     * @example
     *
     * _.isObjectLike({});
     * // => true
     *
     * _.isObjectLike([1, 2, 3]);
     * // => true
     *
     * _.isObjectLike(_.noop);
     * // => false
     *
     * _.isObjectLike(null);
     * // => false
     */
    function isObjectLike(value) {
      return !!value && typeof value == 'object';
    }
    
    /**
     * Checks if `value` is a plain object, that is, an object created by the
     * `Object` constructor or one with a `[[Prototype]]` of `null`.
     *
     * @static
     * @memberOf _
     * @since 0.8.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     * }
     *
     * _.isPlainObject(new Foo);
     * // => false
     *
     * _.isPlainObject([1, 2, 3]);
     * // => false
     *
     * _.isPlainObject({ 'x': 0, 'y': 0 });
     * // => true
     *
     * _.isPlainObject(Object.create(null));
     * // => true
     */
    function isPlainObject(value) {
      if (!isObjectLike(value) ||
          objectToString.call(value) != objectTag || isHostObject(value)) {
        return false;
      }
      var proto = getPrototype(value);
      if (proto === null) {
        return true;
      }
      var Ctor = hasOwnProperty.call(proto, 'constructor') && proto.constructor;
      return (typeof Ctor == 'function' &&
        Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString);
    }
    
    module.exports = isPlainObject;
    
    },{}],8:[function(require,module,exports){
    module.exports={
      "100": "Continue",
      "101": "Switching Protocols",
      "102": "Processing",
      "103": "Early Hints",
      "200": "OK",
      "201": "Created",
      "202": "Accepted",
      "203": "Non-Authoritative Information",
      "204": "No Content",
      "205": "Reset Content",
      "206": "Partial Content",
      "207": "Multi-Status",
      "208": "Already Reported",
      "226": "IM Used",
      "300": "Multiple Choices",
      "301": "Moved Permanently",
      "302": "Found",
      "303": "See Other",
      "304": "Not Modified",
      "305": "Use Proxy",
      "306": "(Unused)",
      "307": "Temporary Redirect",
      "308": "Permanent Redirect",
      "400": "Bad Request",
      "401": "Unauthorized",
      "402": "Payment Required",
      "403": "Forbidden",
      "404": "Not Found",
      "405": "Method Not Allowed",
      "406": "Not Acceptable",
      "407": "Proxy Authentication Required",
      "408": "Request Timeout",
      "409": "Conflict",
      "410": "Gone",
      "411": "Length Required",
      "412": "Precondition Failed",
      "413": "Payload Too Large",
      "414": "URI Too Long",
      "415": "Unsupported Media Type",
      "416": "Range Not Satisfiable",
      "417": "Expectation Failed",
      "418": "I'm a teapot",
      "421": "Misdirected Request",
      "422": "Unprocessable Entity",
      "423": "Locked",
      "424": "Failed Dependency",
      "425": "Unordered Collection",
      "426": "Upgrade Required",
      "428": "Precondition Required",
      "429": "Too Many Requests",
      "431": "Request Header Fields Too Large",
      "451": "Unavailable For Legal Reasons",
      "500": "Internal Server Error",
      "501": "Not Implemented",
      "502": "Bad Gateway",
      "503": "Service Unavailable",
      "504": "Gateway Timeout",
      "505": "HTTP Version Not Supported",
      "506": "Variant Also Negotiates",
      "507": "Insufficient Storage",
      "508": "Loop Detected",
      "509": "Bandwidth Limit Exceeded",
      "510": "Not Extended",
      "511": "Network Authentication Required"
    }
    
    },{}],9:[function(require,module,exports){
    /*!
     * statuses
     * Copyright(c) 2014 Jonathan Ong
     * Copyright(c) 2016 Douglas Christopher Wilson
     * MIT Licensed
     */
    
    'use strict'
    
    /**
     * Module dependencies.
     * @private
     */
    
    var codes = require('./codes.json')
    
    /**
     * Module exports.
     * @public
     */
    
    module.exports = status
    
    // status code to message map
    status.STATUS_CODES = codes
    
    // array of status codes
    status.codes = populateStatusesMap(status, codes)
    
    // status codes for redirects
    status.redirect = {
      300: true,
      301: true,
      302: true,
      303: true,
      305: true,
      307: true,
      308: true
    }
    
    // status codes for empty bodies
    status.empty = {
      204: true,
      205: true,
      304: true
    }
    
    // status codes for when you should retry the request
    status.retry = {
      502: true,
      503: true,
      504: true
    }
    
    /**
     * Populate the statuses map for given codes.
     * @private
     */
    
    function populateStatusesMap (statuses, codes) {
      var arr = []
    
      Object.keys(codes).forEach(function forEachCode (code) {
        var message = codes[code]
        var status = Number(code)
    
        // Populate properties
        statuses[status] = message
        statuses[message] = status
        statuses[message.toLowerCase()] = status
    
        // Add to array
        arr.push(status)
      })
    
      return arr
    }
    
    /**
     * Get the status code.
     *
     * Given a number, this will throw if it is not a known status
     * code, otherwise the code will be returned. Given a string,
     * the string will be parsed for a number and return the code
     * if valid, otherwise will lookup the code assuming this is
     * the status message.
     *
     * @param {string|number} code
     * @returns {number}
     * @public
     */
    
    function status (code) {
      if (typeof code === 'number') {
        if (!status[code]) throw new Error('invalid status code: ' + code)
        return code
      }
    
      if (typeof code !== 'string') {
        throw new TypeError('code must be a number or string')
      }
    
      // '403'
      var n = parseInt(code, 10)
      if (!isNaN(n)) {
        if (!status[n]) throw new Error('invalid status code: ' + n)
        return n
      }
    
      n = status[code.toLowerCase()]
      if (!n) throw new Error('invalid status message: "' + code + '"')
      return n
    }
    
    },{"./codes.json":8}],10:[function(require,module,exports){
    /**
    * @module Plant.Handlers.Cookie
    * @description Common Http Request and Response handlers.
    */
    
    const cookie = require('cookie')
    
    /**
     * Adds methods to set cookies and current cookie data object.
     *
     * @param  {Request} req - Plant.Request instance
     * @param  {Response} res - Plant.Response instance
     * @return {void}
     */
    function addCookieSupport(req, res) {
      if (req.headers.has('cookie')) {
        req.cookies = req.headers.raw('cookie')
        .reduce(function (all, header) {
          return {
            ...all,
            ...cookie.parse(header),
          }
        }, {})
        req.registeredCookies = Object.getOwnPropertyNames(req.cookies)
      }
      else {
        req.cookies = {}
        req.registeredCookies = []
      }
    
      // Set new cookie value
      res.setCookie = responseSetCookie
    
      // Remove cookie by name
      res.clearCookie = responseClearCookie
    
      // Remove all cookies
      res.clearCookies = responseClearCookies
    }
    
    /**
     * Response extension. Add set-cookie header to response headers.
     *
     * @param  {String} name    Cookie name.
     * @param  {String} value   Cookie value.
     * @param  {Object} options Cookie options like expiration, domain, etc.
     * @return {Response} Returns `this`.
     */
    function responseSetCookie(name, value, options) {
      const opts = Object.assign({path: '/'}, options)
      const header = cookie.serialize(name, String(value), opts)
    
      this.headers.append('set-cookie', header)
    
      return this
    }
    
    /**
     * Response extension. Add set-cookie header which erases cookie.
     *
     * @param  {String} name    Cookie name.
     * @param  {Object} options Header options like expiration, domain, etc.
     * @return {Response} Returns `this`.
     */
    function responseClearCookie(name, options) {
      const opts = Object.assign({expires: new Date(0), path: '/'}, options)
      const header = cookie.serialize(name, '', opts)
    
      this.headers.append('set-cookie', header)
    
      return this
    }
    
    /**
     * Response extension. Remove all cookies passed in request.
     *
     * @param  {Object} options Header options.
     * @return {Response} Returns `this`.
     */
    function responseClearCookies(options) {
      this.registeredCookies.forEach(function (cookieName) {
        this.clearCookie(cookieName, options)
      }, this)
    
      return this
    }
    
    /**
     * Add cookie controlls to request and response objects.
     *
     * @param  {Plant.Context} context Plant Context.
     * @param  {function(Object?)} next Next cascade handler emitter.
     * @returns {void} Returns nothing.
     */
    function cookieHandler({req, res}, next) {
      addCookieSupport(req, res)
      return next()
    }
    
    module.exports = cookieHandler
    
    },{"cookie":2}],11:[function(require,module,exports){
    /**
     * @module Http.Headers
     * @description WebAPI Headers implementation.
     */
    
    /**
     * @const {String} MODE_NONE - None mode flag. This mode allow Headers modification.
     */
    const MODE_NONE = 'none'
    /**
     * @const {String} MODE_IMMUTABLE - Immutable mode falg. This mode deny Headers modification.
     */
    const MODE_IMMUTABLE = 'immutable'
    
    /**
     * @typedef {ObjectInitials|ArrayInitials} HeadersInitials - Initial values for Headers. Could be object of strings or entires list.
     */
    /**
     * @typedef {Object.<String,String>} ObjectInitials Header initials as Object
     */
    /**
     * @typedef {Array.<Array.<String,String>>} ArrayInitials Header initials as array of entries.
     */
    
    /**
     * @class
     * @classdesc WebAPI Headers implementation.
     */
    class Headers {
      /**
       * @param  {HeadersInitials} initials = [] Header initial value.
       * @param  {String} mode = MODE_NONE Headers object mode.
       * @return {Headers} Headers instance
       * @constructor
       */
      constructor(initials = [], mode = MODE_NONE) {
        if (! Array.isArray(initials)) {
          initials = Object.entries(initials)
        }
    
        this._headers = new Map(initials.map(function([key, value]) {
          return ([key, [value]])
        }))
        this._mode = mode
    
        if (mode !== MODE_NONE) {
          this.set =
          this.append =
          this.delete =
          this.wrongMode
        }
      }
    
      /**
       * Headers mode getter.
       *
       * @return {String} Should returns MODE_NONE or MODE_IMMUTABLE value.
       */
      get mode() {
        return this._mode
      }
    
      /**
       * Set header value. Overwrite previous values.
       *
       * @param  {String} _name  Header name.
       * @param  {String} _value Header value.
       * @returns {void}
       * @throws {Error} Throws if current mode is immutable.
       */
      set(_name, _value) {
        const name = normalizedName(_name)
        const value = normalizedValue(_value)
    
        this._headers.set(name, [value])
      }
    
      /**
       * Append header. Preserve previous values.
       *
       * @param  {String} _name  Header name.
       * @param  {String} _value Header value.
       * @returns {void}
       * @throws {Error} Throws if current mode is immutable.
       */
      append(_name, _value) {
        const name = normalizedName(_name)
        const value = normalizedValue(_value)
    
        if (this._headers.has(name)) {
          this._headers.get(name).push(value)
        }
        else {
          this._headers.set(name, [value])
        }
      }
    
      /**
       * Remove header from headers list
       *
       * @param  {String} _name Header name.
       * @return {void}
       * @throws {Error} Throws if current mode is immutable.
       */
      delete(_name) {
        this._headers.delete(
          normalizedName(_name)
        )
      }
    
      /**
       * Specify whether header with name is contained in Headers list.
       *
       * @example
       *
       *  headers.set('accept', 'text/plain')
       *  headers.has('accept')
       *  // > true
       *  headers.delete('accept')
       *  headers.has('accept')
       *  // > false
       * @param  {String} _name Header name
       * @return {Boolean} Returns true if one or more header values is set.
       */
      has(_name) {
        return this._headers.has(
          normalizedName(_name)
        )
      }
    
      /**
       * Return header value by name. If there is several headers returns all of them
       * concatenated by `, `.
       *
       * @example
       *
       *  headers.set('accept', 'text/plain')
       *  headers.get('accept')
       *  // > "text/plain"
       *  headers.append('accept', 'text/html')
       *  headers.get('accept')
       *  // > "text/plain, text/html"
       *
       * @param  {String} _name Header name
       * @return {String} Concatenated header values.
       */
      get(_name) {
        const name = normalizedName(_name)
        if (! this._headers.has(name)) {
          return ''
        }
    
        return this._headers.get(name).join(', ')
      }
    
      /**
       * Return iterator of header names.
       *
       * @return {Iterable.<String>} Iterator of header names.
       */
      keys() {
        return this._headers.keys()
      }
    
      /**
       * Return iterator of headers values.
       *
       * @return {Iterator.<Array.<String>>} Iterator of each header values.
       */
      values() {
        return Array.from(this._headers.values())
        .map(function (value) {
          return value.join(', ')
        })[Symbol.iterator]()
      }
    
      /**
       * Returns iterator of entries.
       *
       * @return {Iterator.<Array>} Return iterator of Object.entries alike values.
       */
      entries() {
        return Array.from(this._headers.entries())
        .map(function ([name, value]) {
          return [name, value.join(', ')]
        })[Symbol.iterator]()
      }
    
      /**
       * Call `callback` for each header entry.
       *
       * @param  {function(Array.<String>,String)} fn Function that calls for each hander entry.
       * @param  {type} thisArg  This value for function.
       * @returns {void} Returns no value.
       */
      forEach(fn, thisArg = this) {
        this._headers.forEach(function(values, key) {
          fn(values.join(', '), key, thisArg)
        }, thisArg)
      }
    
      /**
       * Throw TypeError with prevent changes message.
       *
       * @return {void} No return value.
       * @throws {TypeError} Everytime it's called.
       * @private
       */
      wrongMode() {
        throw new TypeError(`Headers mode is ${this.mode}`)
      }
    
      /**
       * Not standard. Get raw header value as array of strings. Not concatenated
       * into string. If header not exists returns empty array.
       *
       * @param  {String} name Header name.
       * @return {String[]} List of passed header values.
       */
      raw(name) {
        if (this.has(name)) {
          return this._headers.get(name)
        }
        else {
          return []
        }
      }
    }
    
    Headers.MODE_NONE = MODE_NONE
    Headers.MODE_IMMUTABLE = MODE_IMMUTABLE
    
    /**
     * Normalize HTTP Field name
     *
     * @param  {*} _name HTTP Field name
     * @return {String}  Returns normalized HTTP Field name
     * @throws {TypeError} If string contains unsupported characters
     */
    function normalizedName(_name) {
      let name = _name
    
      if (typeof name !== 'string') {
        name = String(name)
      }
    
      if (/[^a-z0-9\-#$%&'*+.^_`|~\r\n]/i.test(name)) {
        throw new TypeError('Invalid character in header field name')
      }
    
      return name.toLowerCase()
    }
    
    /**
     * Normalize HTTP Field value.
     *
     * @param  {*} _value Anything convertable to valid HTTP Field value string
     * @return {String}   Normalized HTTP Field value.
     * @throws {TypeError} If value contains new line characters
     */
    function normalizedValue(_value) {
    
      let value = _value
    
      if (typeof value !== 'string') {
        value = String(value)
      }
    
      if (/\r|\n/.test(value)) {
        throw new TypeError('Invalid newline character in header field value')
      }
    
      return value
    }
    
    module.exports = Headers
    
    },{}],12:[function(require,module,exports){
    
    /**
     * @class
     * @classdesc Peer represents the other side of connection.
     */
    class Peer {
      /**
       * @param  {object} options Peer options
       * @param {URI} options.uri Peer URI
       * @constructor
       */
      constructor({uri}) {
        this.uri = uri
      }
    }
    
    module.exports = Peer
    
    },{}],13:[function(require,module,exports){
    /* global TextDecoder */
    /**
     * @module Plant
     */
    
    const isPlainObject = require('lodash.isplainobject')
    
    const {parseHeader, parseEntity} = require('./util/type-header')
    const {isReadableStream} = require('./util/stream')
    const {getMimeMatcher} = require('./util/mime-type-matcher')
    
    const Headers = require('./headers')
    
    /**
     * @typedef {Object} RequestOptions
     * @prop {String} method='GET' Request HTTP method.
     * @prop {URL} url - WebAPI URL object.
     * @prop {Headers|Object.<String,String>} headers={} - Request headers.
     * @prop {ReadableStream|Null} body=null Request body.
     * @prop {Request} parent=null – Parent request.
     */
    
    /**
     * @class
     * @classdesc Plant Request representation object
     *
     * @prop {String} method='GET' - Request method.
     * @prop {URL} url - WebAPI URL object.
     * @prop {Headers} headers - WebAPI request headers (in immmutable mode).
     * @prop {String[]} domains - Full domains of server splitted by dot `.`.
     * @prop {Buffer|Null} body - Request body as buffer. Null until received.
     * @prop {Request} parent=null – Parent request.
     */
    class Request {
      /**
       * @param  {RequestOptions} options Constructor options.
       * @constructor
       */
      constructor({
        method = 'get',
        headers = {},
        url,
        body = null,
        parent = null,
      }) {
        this.url = url
        this.method = method.toUpperCase()
        this.headers = isPlainObject(headers)
          ? new Headers(headers, Headers.MODE_IMMUTABLE)
          : headers
        this.domains = /\.\d+$/.test(this.url.hostname)
          ? []
          : this.url.hostname.split('.').reverse()
    
        if (body !== null && ! isReadableStream(body)) {
          throw new TypeError('options.body is not a readable stream')
        }
    
        if (parent !== null && parent instanceof Request === false) {
          throw new TypeError('options.parent should be instance of Request or null')
        }
    
        this.body = body
        this.bodyUsed = false
        this.buffer = null
        this.parent = parent
      }
    
      /**
       * Check if current request mime type in content-type header is equal `type`.
       *
       * @param  {String} type List of mime types
       * @return {Boolean} Return true if content type header contains specified `types`.
       */
      is(type) {
        const entity = parseEntity(this.headers.get('content-type') || '')
    
        return entity.type === type
      }
    
      /**
       * Get request content type from list of types
       * @param {String[]} types List of types to choose one.
       * @returns {String|Null} Return matched type or null if no type matched
       */
      type(types) {
        const _types = normalizeTypes(types)
        const {type} = parseEntity(this.headers.get('content-type'))
    
        for (const {value, matcher} of _types) {
          if (matcher(type) === true) {
            return value
          }
        }
    
        return null
      }
    
      /**
       * Select which one of `types` contains in request's Accept header.
       * @param {String[]} types List of types to choose one.
       * @returns {String|Null} Return matched type or null if no type matched
       */
      accept(types) {
        const _types = normalizeTypes(types)
        const cTypes = parseHeader(this.headers.get('accept'))
        .sort(function (a, b) {
          return (a.params.q - b.params.q)
        })
        .map(function ({type}) {
          return type
        })
    
        for (const cType of cTypes) {
          for (const {value, matcher} of _types) {
            if (matcher(cType) === true) {
              return value
            }
          }
        }
    
        return null
      }
    
      async text() {
        const contentType = this.headers.get('content-type')
        let encoding = 'utf8'
        if (contentType) {
          const charset = charsetFromContentType(contentType)
    
          if (charset) {
            encoding = charset
          }
        }
    
        const buffer = await this.arrayBuffer()
        const decoder = new TextDecoder(encoding)
    
        return decoder.decode(buffer).toString()
      }
    
      async arrayBuffer() {
        if (this.bodyUsed) {
          return this.buffer
        }
    
        const result = []
        const reader = this.body.getReader()
        /* eslint-disable-next-line no-constant-condition */
        while (true) {
          const {value, done} = await reader.read()
          if (done) {
            break
          }
          result.push(value)
        }
        reader.releaseLock()
        this.buffer = concatUint8Arrays(result)
        this.bodyUsed = true
    
        return this.buffer
      }
    
      json() {
        return this.text()
        .then(JSON.parse)
      }
    
      // blob() {}
    
      // formData() {}
    
      clone() {
        const copy = new this.constructor({
          method: this.method,
          url: this.url,
          headers: this.headers,
          body: this.body,
        })
    
        copy.buffer = this.buffer
    
        return copy
      }
    }
    
    // Naive request groups.
    // Usage is: aliases.json('application/json') // -> true
    const aliases = {
      json: getMimeMatcher(['application/json', 'application/json+*']),
      text: getMimeMatcher(['text/plain']),
      html: getMimeMatcher(['text/html', 'text/xhtml']),
      image: getMimeMatcher(['image/*']),
    }
    
    function normalizeTypes(types) {
      const result = []
    
      for (const type of types) {
        if (type.includes('/')) {
          result.push({
            value: type,
            matcher(value) {
              return value === type
            },
          })
        }
        else if (aliases.hasOwnProperty(type)) {
          result.push({
            value: type,
            matcher(value) {
              return aliases[type](value)
            },
          })
        }
      }
    
      return result
    }
    
    function concatUint8Arrays(arrays) {
      let length = 0
      for (const array of arrays) {
        length += array.length
      }
      const result = new Uint8Array(length)
      let n = 0
      for (const array of arrays) {
        for (let i = 0; i < array.length; i++, n++) {
          result[n] = array[i]
        }
      }
      return result
    }
    
    function charsetFromContentType(contentType) {
      const parts = contentType.split(/;\s+/)
    
      if (parts.length < 2) {
        return null
      }
    
      const charset = parts[1]
    
      if (! charset.startsWith('charset=')) {
        return null
      }
    
      return charset.slice(8).trim()
    }
    
    module.exports = Request
    
    },{"./headers":11,"./util/mime-type-matcher":19,"./util/stream":20,"./util/type-header":21,"lodash.isplainobject":7}],14:[function(require,module,exports){
    /**
     * @module Plant
     */
    
    const isPlainObject = require('lodash.isplainobject')
    const statuses = require('statuses')
    
    const {isReadableStream, isDisturbed} = require('./util/stream')
    const Request = require('./request')
    const Headers = require('./headers')
    const TypedArray = Object.getPrototypeOf(Uint8Array)
    
    const DISTURBED_ERR_MSG = 'Response body object should not be disturbed or locked'
    const BODY_TYPE_ERR_MSG = 'Body value could be a string, TypedArray, ReadableStream or null'
    
    /**
     * @typedef Push
     * @prop {Request|null} request Request instance.
     * @prop {Response|null} response Response instance if request already completed.
     * @prop {Object|null} context Context for request.
     */
    
    /**
     * @class
     * @classdesc Plant Response
     *
     * @prop {Number} status - Response status code
     * @prop {URL} url - Response URL
     * @prop {Headers} headers - Response headers
     * @prop {Null|TypedArray|String|Readable} body - Response body.
     */
    class Response {
      /**
       * @typedef {Object} ResponseOptions Options for Response constructor.
       * @param {Number} status=200 Response status code.
       * @param {URL} url Response url.
       * @param {Headers|Object} [headers] Response headers.
       * @param {String|TypedArray|Readable|Null} body=null Response body.
       */
      /**
       * @param {Response.Options} options={} Response options object.
       * @throws {Error} If passed headers has immutable mode.
       * @constructor
       */
      constructor({
        url,
        status = 200,
        headers = new Headers(),
        body = null,
      } = {}) {
        this.status = status
    
        if (isPlainObject(headers)) {
          this.headers = new Headers(headers)
        }
        else if (headers.mode === Headers.MODE_IMMUTABLE) {
          throw new Error(`Invalid headers mode: ${headers.mode}`)
        }
        else {
          this.headers = headers
        }
    
        if (body !== null) {
          if (! isAcceptableBody(body)) {
            throw new TypeError('Body should be a string, TypedArray, ReadableStream or null')
          }
        }
    
        this._url = url
        this._body = body
        this._pushes = []
      }
    
      /**
       * Specify whether response is successful and status code is in
       * range of 200 and 299.
       *
       * @readonly
       * @type {Boolean}
       */
      get ok() {
        return this.status > 199 && this.status < 300
      }
    
      /**
       * Specify wether response status code is a redirect status.
       *
       * @return {boolean} Always false if status is invalid or does not mean redirection.
       */
      get redirected() {
        return statuses.redirect.hasOwnProperty(this.status)
      }
    
      /**
       * Response URL property.
       *
       * @readonly
       * @type {URL}
       */
      get url() {
        return this._url
      }
    
      /**
       * Specify whether body is set. True if body is not null.
       *
       * @readonly
       * @type {Boolean}
       */
      get hasBody() {
        return this.body !== null
      }
    
      /**
       * Determine wether response has pushes.
       *
       * @readonly
       * @type {boolean}
       */
      get hasPushes() {
        return this._pushes.length > 0
      }
    
      /**
       * Response body
       *
       * @type {string|TypedArray|ReadableStream|null}
       */
      get body() {
        return this._body
      }
    
      set body(value) {
        if (value === null) {
          this.headers.delete('content-length')
          this.headers.delete('content-type')
        }
        else if (isReadableStream(value)) {
          if (isDisturbed(value)) {
            throw new TypeError(DISTURBED_ERR_MSG)
          }
          this._body = value
        }
        else if (typeof value === 'string' || value instanceof TypedArray) {
          this._body = value
          this.headers.set('content-length', value.length)
        }
        else {
          throw new TypeError(BODY_TYPE_ERR_MSG)
        }
      }
      /**
       * Retun list of pushed responses and requests.
       *
       * @readonly
       * @type {Push[]}
       */
      get pushes() {
        return [...this._pushes]
      }
    
      /**
       * get statusText - returns status text for current status code.
       *
       * @return {string} Status code string value
       */
      get statusText() {
        return statuses[this.status]
      }
    
      /**
       * setStatus - Set response status
       *
       * @param  {Number} status Response status code
       * @return {Response} Return `this`.
       */
      setStatus(status) {
        this.status = status
        return this
      }
    
      /**
       * json - Set response type as JSON and set body content and set application/json mimetype.
       *
       * @param  {*} result Value to stringify.
       * @return {Response} Return `this`.
       */
      json(result) {
        this.body = JSON.stringify(result)
        this.headers.set('content-type', 'application/json')
    
        return this
      }
    
      /**
       * text - Set plain text body content and text/plain mimetype.
       *
       * @param  {String} result Response body
       * @return {Response} Returns `this`
       */
      text(result) {
        this.body = result
        this.headers.set('content-type', 'text/plain')
    
        return this
      }
    
      /**
       * html - Set html body content and text/html mime type.
       *
       * @param  {String} result HTML response content.
       * @return {Response} Returns `this`
       */
      html(result) {
        this.body = result
        this.headers.set('content-type', 'text/html')
    
        return this
      }
    
      /**
       * stream - Set stream as response body.
       *
       * @param  {Readable} stream Readable stream to send.
       * @return {Response}  Returns `this`.
       */
      stream(stream) {
        if (! isReadableStream(stream)) {
          throw new TypeError('Not a ReadableStream')
        }
        else if (isDisturbed(stream)) {
          throw new TypeError(DISTURBED_ERR_MSG)
        }
    
        this._body = stream
    
        return this
      }
    
      /**
       * send - Detect response type and set proper body value.
       *
       * @param  {String|ReadableStream} body Result body.
       * @return {Response}  Returns `this`.
       */
      send(body) {
        this.body = body
    
        return this
      }
    
      /**
       * end - Set empty response body.
       *
       * @return {Response}  Returns `this`.
       */
      empty() {
        this.headers.delete('content-type')
        this.body = ''
        return this
      }
    
      /**
       * redirect - Send empty body and location header. Set status to 302.
       *
       * @param  {String} url Destination url.
       * @return {Response} returns `this`.
       */
      redirect(url) {
        this.status = 302
        this.headers.set('location', url)
        this.empty()
    
        return this
      }
    
      /**
       * Add request or response into response pushes list. It's using for transports
       * which support pushes.
       *
       * @param  {Response|Request|URL|String} target Complete response or new request.
       * @param  {Object} [context] Context is optional and is using when overriding is required.
       * @return {Response} Return itself
       * @throws {TypeError} if the first argument type is mismatched.
       */
      push(target, context) {
        if (target instanceof Response) {
          this._pushes.push({
            request: null,
            context: null,
            response: target,
          })
        }
        else if (target instanceof Request) {
          this._pushes.push({
            request: target,
            context,
            response: null,
          })
        }
        else if (target instanceof URL) {
          this._pushes.push({
            request: new Request({
              url: target,
            }),
            context,
            response: null,
          })
        }
        else if (typeof target === 'string') {
          this._pushes.push({
            request: new Request({
              url: new URL(target, this._url),
            }),
            context,
            response: null,
          })
        }
        else {
          throw new TypeError('Argument #1 could be a Response, Request or URL')
        }
    
        return this
      }
    }
    
    function isAcceptableBody(body) {
      return typeof body === 'string'
      || isReadableStream(body)
      || body instanceof TypedArray
    }
    
    module.exports = Response
    
    },{"./headers":11,"./request":13,"./util/stream":20,"lodash.isplainobject":7,"statuses":9}],15:[function(require,module,exports){
    class Route {
      static fromRequest(req) {
        return new this({
          path: req.url.pathname,
        })
      }
    
      constructor({
        path = '/',
        basePath = '',
        params = {},
        captured = [],
      } = {}) {
        this.path = path
        this.basePath = basePath
        this.params = Object.freeze(params)
        this.captured = Object.freeze(captured)
      }
    
      clone() {
        const copy = new this.constructor({
          path: this.path,
          basePath: this.basePath,
          params: this.params,
          captured: this.captured,
        })
    
        return copy
      }
    
      extend({
        path = path,
        basePath = this.basePath,
        params = this.params,
        captured = this.captured,
      }) {
        this.path = path
        this.basePath = basePath
        this.params = Object.freeze(params)
        this.captured = Object.freeze(captured)
        return this
      }
    
      capture(path, params = {}) {
        path = path.replace(/\/$/, '')
    
        if (path[0] !== '/') {
          path = '/' + path
        }
    
        if (! this.path.startsWith(path)) {
          throw new Error('Current path does not start with provided path value')
        }
        else if (path.length > 1) {
          if (this.path.length !== path.length && this.path[path.length] !== '/') {
            throw new Error('Provided path has unexpected ending')
          }
    
          this.path = this.path.slice(path.length)
          this.basePath = this.basePath + path
        }
    
        this.params = Object.freeze({...this.params, ...params})
        this.captured = Object.freeze([
          ...this.captured,
          {
            path,
            params,
          },
        ])
    
        return this
      }
    }
    
    module.exports = Route
    
    },{}],16:[function(require,module,exports){
    /**
     * @module Plant.Server
     * @description Implementation of Plant Server interface.
     */
    
    const {and, or, getHandler} = require('@plant/flow')
    const isPlainObject = require('lodash.isplainobject')
    const escapeRegexp = require('escape-string-regexp')
    
    const cookieHandler = require('./handlers/cookie-handler')
    
    const Headers = require('./headers')
    const Peer = require('./peer')
    const Response = require('./response')
    const Request = require('./request')
    const Route = require('./route')
    const Socket = require('./socket')
    const URI = require('./uri')
    
    const CSP = Object.freeze({
      // Local resources only
      LOCAL: (protocol, hostname, port) => {
        let origin
        if (port) {
          origin = `localhost:${port}`
        }
        else {
          origin = 'localhost'
        }
    
        return [
          `default-src ${origin} 'unsafe-eval' 'unsafe-inline'`,
          `form-action ${origin}`,
        ].join('; ')
      },
      // Allow current origin only
      DEV: [
        "default-src 'self' 'unsafe-eval' 'unsafe-inline'",
        "form-action 'self'",
      ].join('; '),
      // Allow HTTP protocol
      TEST: [
        "default-src 'none'",
        "connect-src 'self'",
        "font-src 'self'",
        "img-src 'self'",
        "manifest-src 'self'",
        "media-src 'self'",
        "script-src 'self'",
        "style-src 'self'",
        "worker-src 'self'",
        "form-action 'self'",
        'require-sri-for script style',
        'block-all-mixed-content',
      ].join('; '),
      // Allow only self HTTPS
      STRICT: (protocol, hostname) => {
        return [
          "default-src 'none'",
          `connect-src https://${hostname}`,
          `font-src https://${hostname}`,
          `img-src https://${hostname}`,
          `manifest-src https://${hostname}`,
          `media-src https://${hostname}`,
          `script-src https://${hostname}`,
          `style-src https://${hostname}`,
          `worker-src https://${hostname}`,
          `form-action https://${hostname}`,
          'require-sri-for script style',
          'block-all-mixed-content',
        ].join('; ')
      },
    })
    
    /**
     * @typedef {Object} Plant.Context Default plant context with plant's instances for req and res.
     * @prop {fetch} fetch Server fetch method.
     * @prop {Request} req Request instance.
     * @prop {Response} res Response instance.
     * @prop {Route} route ROute instance.
     * @prop {Socket} socket Socket instance.
     */
    
    /**
     * @function fetch
     * @description Fetch internal resource.
     * @param {URL|Request} Subrequest url or Request object.
     * @async
     * @returns {Promise<Response,Error>} Resolved with Response instance Promise.
     */
    /**
     * @function HandleFunc
     * @description Cascade handling function
     * @param {Object} context Plant context object
     * @param {function(?Object)} next Plant cascade server callback.
     * @async
     * @returns {Promise<void>} Handle func should modify it's arguments and produce
     */
    
    /**
     * @function CreateHandleFunc
     * @description Function that creates cascade request function
     * @param {...HandleType} [handlers] Create handle function can receive HandleType params to produce new handle function.
     * @returns {HandleFunc}
     */
    
    /**
     * @typedef {Object} Handler Cascade handler is an object with method handler
     * @prop {CreateHandleFunc} handler Function that creates HandleFunc.
     */
    
    /**
     * @typedef {HandleFunc|Handler} HandleType Cascade request handle function or Object
     * which has method `handler`. Which returns such function
     */
    
    /**
      * @typedef {Object} ServerOptions Server configuration options.
      * @prop {Array.<HandleType>} [handlers=[]] List of request handlers.
      * @prop {Object} [context={}] Context object.
      */
    
    /**
     * @class
     * @classdesc Plant cascade server.
     */
    class Plant {
      /**
       * Static constructor.
       *
       * @param {*} args Server constructor arguments.
       * @returns {Plant} Server instance.
       * @static
       */
      static new(...args) {
        return new this(...args)
      }
    
      /**
       * Create new server instance
       *
       * @param  {ServerOptions} [options={}] Server options. Optional
       * @param  {...HandleType} args Request handler.
       * @return {Plant} Return new server instance.
       * @static
       */
      static create(...args) {
        let options
        let handlers
    
        if (isPlainObject(args[0])) {
          options = args[0]
          handlers = args.slice(1)
        }
        else {
          options = void 0
          handlers = args
        }
    
        return this.new(options)
        .use(...handlers)
      }
    
      static route(url) {
        return getRouteMatcher(url)
      }
    
      /**
       * Instantiate new Plant.Server and creates http handler from it.
       *
       * @param  {ServerOptions} [options] Server initial options.
       * @param  {...HandleType} [handlers] Server request handlers.
       * @return {function()} Http handler function.
       * @static
       */
      static handler(...args) {
        return this.create(...args)
        .getHandler()
      }
    
      /**
       * @param  {ServerOptions} options Server options params.
       * @constructor
       */
      constructor({handlers = [], context = {}, csp = CSP.LOCAL} = {}) {
        this.handlers = handlers.map(getHandler)
    
        this.context = Object.assign({}, context)
        this.csp = csp
      }
    
      /**
       * Add cascade handlers.
       *
       * @param  {String} [route] Optional route prefix.
       * @param  {...HandleType} args Cascade handlers.
       * @return {Plant} return `this`.
       */
      use(...args) {
        let handlers
    
        if (args.length > 1) {
          if (typeof args[0] === 'string') {
            args[0] = getRouteMatcher(args[0])
          }
          handlers = [or(and(...args))]
        }
        else {
          handlers = args.map(getHandler)
        }
    
        this.handlers = [...this.handlers, ...handlers]
    
        return this
      }
    
      /**
       * Add parallel cascade handler.
       *
       * @param  {...HandleType} handlers Cascade request handlers list.
       * @return {Plant} Returns `this`.
       */
      or(...handlers) {
        if (handlers.length) {
          this.use(or(...handlers))
        }
        return this
      }
    
      /**
       * Add nested cascade handler.
       *
       * @param  {...HandleType} handlers Request handlers
       * @return {Plant} Returns `this`.
       */
      and(...handlers) {
        if (handlers.length) {
          this.use(and(...handlers))
        }
    
        return this
      }
    
      /**
       * Create native http request handler from Server
       *
       * @returns {function(http.IncomingMessage,http.ServerResponse)} Native http request handler function
       */
      getHandler() {
        const initialCtx = {...this.context}
        let csp
        if (typeof this.csp === 'function') {
          csp = this.csp
        }
        else if (typeof this.csp === 'string') {
          const _csp = this.csp
          csp = () => _csp
        }
        else {
          csp = null
        }
    
        const handler = and(
          async function (ctx, next) {
            // TODO Decide to remove this
            if (! ctx.socket) {
              ctx.socket = new Socket({
                peer: new Peer({
                  uri: new URI({}),
                }),
              })
            }
    
            // If server mounted as handler of another server then route should
            // not be recreated.
            if (! ctx.route) {
              ctx.route = new Route({
                path: ctx.req.url.pathname,
              })
            }
    
            ctx.fetch = createFetch(handler, {
              ...initialCtx,
              ...ctx,
            })
    
            await next({...initialCtx, ...ctx})
    
            const {req, res, socket, fetch} = ctx
            if (socket.canPush && res.hasPushes) {
              await Promise.all(res.pushes.map(push => {
                if (push.response !== null) {
                  return socket.push(push.response)
                }
                else {
                  return fetch(push.request, push.context)
                  .then(response => socket.push(response))
                }
              }))
            }
    
            if (csp !== null && ! res.headers.has('content-security-policy')) {
              const {protocol, hostname, port, pathname} = req.url
              res.headers.set('content-security-policy', csp(protocol, hostname, port, pathname))
            }
    
            return ctx
          },
          cookieHandler,
          ...this.handlers,
        )
    
        return handler
      }
    }
    
    function createFetch(handler, ctx) {
      function fetch(options, nextCtx) {
        let req
        if (options instanceof Request) {
          req = options
        }
        else if (options instanceof URL) {
          req = new Request({
            url: options,
            parent: ctx.req,
          })
        }
        else if (typeof options === 'string') {
          req = new Request({
            url: new URL(options, ctx.req.url),
          })
        }
        else {
          let url = options.url
          if (typeof url === 'string') {
            url = new URL(url, ctx.req.url)
          }
    
          req = new Request({
            ...options,
            url,
            parent: ctx.req,
          })
        }
    
        const res = new Response({
          url: req.url,
        })
    
        const childCtx = {
          ...ctx,
          ...nextCtx,
          req,
          res,
          route: Route.fromRequest(req),
        }
    
        return handler({
          ...childCtx,
          fetch: createFetch(handler, childCtx),
        })
        .then(() => res)
      }
    
      return fetch
    }
    
    function getRouteMatcher(routePath) {
      if (/\/\*$/.test(routePath)) {
        const _routePath = routePath.replace(/\/+\*$/, '')
        const re = new RegExp(`^${escapeRegexp(_routePath)}(\\/|\\/?$)`)
    
        return matchRouteHandler.bind(null, re)
      }
      else {
        const _routePath = routePath.replace(/\/+$/, '')
        const re = new RegExp(`^${escapeRegexp(_routePath)}\\/?$`)
    
        return matchRouteHandler.bind(null, re)
      }
    }
    
    function matchRouteHandler(re, {route, ...ctx}, next) {
      const match = route.path.match(re)
      if (! match) {
        return
      }
    
      const subRoute = route.clone().capture(match[0])
    
      return next({
        ...ctx,
        route: subRoute,
      })
    }
    
    module.exports = Plant
    
    // Expose core classes
    Plant.Headers = Headers
    Plant.Peer = Peer
    Plant.Request = Request
    Plant.Response = Response
    Plant.Route = Route
    Plant.Socket = Socket
    Plant.URI = URI
    Plant.CSP = CSP
    Plant.createFetch = createFetch
    
    },{"./handlers/cookie-handler":10,"./headers":11,"./peer":12,"./request":13,"./response":14,"./route":15,"./socket":17,"./uri":18,"@plant/flow":1,"escape-string-regexp":3,"lodash.isplainobject":7}],17:[function(require,module,exports){
    /**
     * @module Plant.Socket
     */
    
    const EventEmitter = require('eventemitter3')
    
    const Peer = require('./peer')
    
    function noop() {}
    
    /**
     * @class
     * @name Socket
     * @classdesc Socket wraps connection object like a transform stream and provide
     * methods to manipulate socket state.
     * @prop {Boolean} isEnded Specify was socket ended or not.
     */
    class Socket extends EventEmitter {
      /**
       * @param  {Object} options Socket options.
       * @param {Function} [options.onEnd] Callback triggered when end event is emitted.
       * @param {function(Response):Promise<Response,Error>} [options.onPush] Callback triggered when push requested by server. It should be set  only when socket support pushes.
       * @constructor
       */
      constructor({peer, onEnd = noop, onPush = null} = {}) {
        super()
    
        if (onPush !== null) {
          if (typeof onPush !== 'function') {
            throw new TypeError('options.onPush should be undefined, null or a function')
          }
        }
    
        if (peer instanceof Peer === false) {
          throw new TypeError('options.peer should be instance of a Peer')
        }
    
        this._peer = peer
        this._isEnded = false
        this._end = onEnd
        this._push = onPush
      }
    
      /**
       * get canPush - specify wether socket is available to push responses.
       *
       * @return {bool} true if constructor's options.onPush function is defined.
       */
      get canPush() {
        return this._push !== null
      }
    
      /**
       * Tell if socket was aborted or ended by application.
       *
       * @return {Boolean} True if socket could not write.
       */
      get isEnded() {
        return this._isEnded
      }
    
      /**
       * get peer - connection peer instance
       *
       * @return {Peer} Peer associated with the socket
       */
      get peer() {
        return this._peer
      }
    
      /**
       * End socket and make it
       *
       * @return {void} No return value.
       */
      end() {
        if (this._isEnded) {
          return
        }
    
        this._isEnded = true
        this._end()
      }
    
      destroy() {
        this.emit('destroy')
      }
    
      /**
       * push - Push response to the client
       *
       * @param  {Response} response Plant Response instance
       * @return {Promise<Response,Error>} Returns Promise resolved with sent response.
       */
      push(response) {
        if (! this.canPush) {
          throw new Error('This socket could not push')
        }
    
        return this._push(response)
        .then(function() {
          return response
        })
      }
    }
    
    module.exports = Socket
    
    },{"./peer":12,"eventemitter3":4}],18:[function(require,module,exports){
    /**
     * @class
     * @classdesc This is a URI object representation
     */
    class URI {
      constructor(uri) {
        if (typeof uri === 'string') {
          throw new Error('URI parsing not implemented yet')
        }
    
        this.setParams(uri)
      }
    
      setParams({
        protocol = '',
        username = '',
        password = '',
        hostname = '',
        port = '',
        pathname = '/',
        query = '',
        fragment = '',
      }) {
        this.protocol = protocol
        this.username = username
        this.password = password
        this.hostname = hostname
        this.port = port
        this.pathname = pathname
        this.query = query
        this.fragment = fragment
    
        return this
      }
    
      get host() {
        if (this.port) {
          return `${this.hostname}:${this.port}`
        }
        else {
          return `${this.hostname}`
        }
      }
    
      toString() {
        const parts = []
        if (this.protocol) {
          parts.push(this.protocol)
        }
        parts.push(`//${this.host}`)
        parts.push(this.pathname)
        if (this.query.length) {
          parts.push(this.query)
        }
        if (this.fragment.length) {
          parts.push(this.fragment)
        }
    
        return parts.join('')
      }
    }
    
    module.exports = URI
    
    },{}],19:[function(require,module,exports){
    const escapeRegExp = require('lodash.escaperegexp')
    
    /**
     * getMimeMatcher - create mime type matcher function wich determines weather
     * passed `type` matches `types`,
     *
     * @param  {Array<String|RegExp>} types List of types.
     * @return {function(String):Boolean} Type matcher function.
     */
    function getMimeMatcher(types) {
      const matchers = types.map(function(type) {
        if (typeof type === 'string') {
          return stringMatcher(type)
        }
        else if (type instanceof RegExp) {
          return regExpMatcher(type)
        }
        else {
          throw new Error('Unknown type')
        }
      })
    
      return function(value) {
        for (const matcher of matchers) {
          if (matcher(value)) {
            return true
          }
        }
        return false
      }
    }
    
    /**
     * stringMatcher - Return matcher function. If `origin` contains '*' it will
     * convert string to regexp and call regExpMatcher. Other way it will return
     * a function which check strings equality.
     *
     * @param  {String} origin Mime type or mime type mask.
     * @return {function(String):Boolean} returns matcher function.
     */
    function stringMatcher(origin) {
      if (origin.includes('*')) {
        return regExpMatcher(toRegExp(origin, '[^\/]+'))
      }
    
      return function(value) {
        return value === origin
      }
    }
    
    /**
     * regExpMatcher - return regexp matcher function.
     *
     * @param  {RegExp} regexp Regular exression to match with.
     * @return {function(String):Boolean} Returns matcher function.
     */
    function regExpMatcher(regexp) {
      return function(value) {
        return regexp.test(value)
      }
    }
    
    /**
     * toRegExp - Convert text `mask` to regular expression. Asterisk will be replaced
     * with `replacer`.
     *
     * @param  {String} mask String containing asterisk.
     * @param  {String} replacer Regular expression to substitute of asterisk.
     * @return {RegExp}      Regular expression.
     */
    function toRegExp(mask, replacer = '.+?') {
      const re = mask.split('*').map(escapeRegExp).join(replacer)
    
      return new RegExp('^' + re + '$')
    }
    
    exports.getMimeMatcher = getMimeMatcher
    
    },{"lodash.escaperegexp":5}],20:[function(require,module,exports){
    const isObject = require('lodash.isobject')
    /**
     * isReadableStream - specify weather passed `value` has readable stream object
     * methods on, pipe and end.
     *
     * @param  {*} value Value to check.
     * @return {Boolean} Return true if value is readable stream.
     */
    function isReadableStream(value) {
      return isObject(value)
      && typeof value.getReader === 'function'
    }
    
    function isDisturbed(stream) {
      if (typeof stream._disturbed === 'boolean') {
        return stream._disturbed
      }
      else if (typeof Response !== 'undefined') {
        try {
          // eslint-disable-next-line no-undef
          const response = new Response(stream)
          // WebKit doesn't through
          return response.bodyUsed
        }
        catch (_) {
          return false
        }
      }
      else {
        throw new Error('Could not determine wether stream was disturbed')
      }
    }
    
    exports.isReadableStream = isReadableStream
    exports.isDisturbed = isDisturbed
    
    },{"lodash.isobject":6}],21:[function(require,module,exports){
    /**
     * @module TypeHeaderUtils
     */
    
    /**
     * @typedef TypeEntity
     * @prop {String} type Type entry value
     * @prop {Object} params Type params, like `q`, `charset`, etc.
     */
    
    /**
     * parseHeader - Parse complete type header value for Content-Type and Accept
     * headers. Example:
     * `text/html;q=1.0, image/png;q=0.1`.
     *
     * @param  {string} header Request header.
     * @return {TypeEntity[]} Array of type objects.
     */
    function parseHeader(header) {
      const entities = header.split(/\s*,\s*/)
    
      return entities.map(parseEntity)
    }
    
    /**
     * parseEntity - parse singe header type entry. Type entry is a string which
     * contains key value pairs separated with semicolon. Example:
     * `application/jsoncharset=utf8`.
     *
     * @param  {String} entity Type entry.
     * @return {TypeEntity} returns type entry object.
     */
    function parseEntity(entity) {
      const [type, ...tail] = entity.split(/;/)
    
      const params = getParams(tail)
    
      if (params.q) {
        params.q = parseFloat(params.q)
      }
    
      return {type, params}
    }
    
    /**
     * getParams - convert list of key-value strings into object with proper keys
     * and values.
     *
     * @param  {String[]} params Array of key value strings.
     * @return {Object<String,String>} Object.
     * @access private
     */
    function getParams(params) {
      return params.map(function (param) {
        return param.split('=')
      })
      .reduce(function (result, [name, value]) {
        return {
          ...result,
          [name]: value,
        }
      }, {})
    }
    
    exports.parseHeader = parseHeader
    exports.parseEntity = parseEntity
    
    },{}]},{},[16])(16)
    });