/*
 Leaflet, a JavaScript library for mobile-friendly interactive maps. http://leafletjs.com
 (c) 2010-2013, Vladimir Agafonkin
 (c) 2010-2011, CloudMade
*/
(function(window, document, undefined) {
    var oldL = window.L, L = {};
    L.version = "0.7.3";
    // define Leaflet for Node module pattern loaders, including Browserify
    if (typeof module === "object" && typeof module.exports === "object") {
        module.exports = L;
    } else if (typeof define === "function" && define.amd) {
        define(L);
    }
    // define Leaflet as a global L variable, saving the original L to restore later if needed
    L.noConflict = function() {
        window.L = oldL;
        return this;
    };
    window.L = L;
    /*
 * L.Util contains various utility functions used throughout Leaflet code.
 */
    L.Util = {
        extend: function(dest) {
            // (Object[, Object, ...]) ->
            var sources = Array.prototype.slice.call(arguments, 1), i, j, len, src;
            for (j = 0, len = sources.length; j < len; j++) {
                src = sources[j] || {};
                for (i in src) {
                    if (src.hasOwnProperty(i)) {
                        dest[i] = src[i];
                    }
                }
            }
            return dest;
        },
        bind: function(fn, obj) {
            // (Function, Object) -> Function
            var args = arguments.length > 2 ? Array.prototype.slice.call(arguments, 2) : null;
            return function() {
                return fn.apply(obj, args || arguments);
            };
        },
        stamp: function() {
            var lastId = 0, key = "_leaflet_id";
            return function(obj) {
                obj[key] = obj[key] || ++lastId;
                return obj[key];
            };
        }(),
        invokeEach: function(obj, method, context) {
            var i, args;
            if (typeof obj === "object") {
                args = Array.prototype.slice.call(arguments, 3);
                for (i in obj) {
                    method.apply(context, [ i, obj[i] ].concat(args));
                }
                return true;
            }
            return false;
        },
        limitExecByInterval: function(fn, time, context) {
            var lock, execOnUnlock;
            return function wrapperFn() {
                var args = arguments;
                if (lock) {
                    execOnUnlock = true;
                    return;
                }
                lock = true;
                setTimeout(function() {
                    lock = false;
                    if (execOnUnlock) {
                        wrapperFn.apply(context, args);
                        execOnUnlock = false;
                    }
                }, time);
                fn.apply(context, args);
            };
        },
        falseFn: function() {
            return false;
        },
        formatNum: function(num, digits) {
            var pow = Math.pow(10, digits || 5);
            return Math.round(num * pow) / pow;
        },
        trim: function(str) {
            return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, "");
        },
        splitWords: function(str) {
            return L.Util.trim(str).split(/\s+/);
        },
        setOptions: function(obj, options) {
            obj.options = L.extend({}, obj.options, options);
            return obj.options;
        },
        getParamString: function(obj, existingUrl, uppercase) {
            var params = [];
            for (var i in obj) {
                params.push(encodeURIComponent(uppercase ? i.toUpperCase() : i) + "=" + encodeURIComponent(obj[i]));
            }
            return (!existingUrl || existingUrl.indexOf("?") === -1 ? "?" : "&") + params.join("&");
        },
        template: function(str, data) {
            return str.replace(/\{ *([\w_]+) *\}/g, function(str, key) {
                var value = data[key];
                if (value === undefined) {
                    throw new Error("No value provided for variable " + str);
                } else if (typeof value === "function") {
                    value = value(data);
                }
                return value;
            });
        },
        isArray: Array.isArray || function(obj) {
            return Object.prototype.toString.call(obj) === "[object Array]";
        },
        emptyImageUrl: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
    };
    (function() {
        // inspired by http://paulirish.com/2011/requestanimationframe-for-smart-animating/
        function getPrefixed(name) {
            var i, fn, prefixes = [ "webkit", "moz", "o", "ms" ];
            for (i = 0; i < prefixes.length && !fn; i++) {
                fn = window[prefixes[i] + name];
            }
            return fn;
        }
        var lastTime = 0;
        function timeoutDefer(fn) {
            var time = +new Date(), timeToCall = Math.max(0, 16 - (time - lastTime));
            lastTime = time + timeToCall;
            return window.setTimeout(fn, timeToCall);
        }
        var requestFn = window.requestAnimationFrame || getPrefixed("RequestAnimationFrame") || timeoutDefer;
        var cancelFn = window.cancelAnimationFrame || getPrefixed("CancelAnimationFrame") || getPrefixed("CancelRequestAnimationFrame") || function(id) {
            window.clearTimeout(id);
        };
        L.Util.requestAnimFrame = function(fn, context, immediate, element) {
            fn = L.bind(fn, context);
            if (immediate && requestFn === timeoutDefer) {
                fn();
            } else {
                return requestFn.call(window, fn, element);
            }
        };
        L.Util.cancelAnimFrame = function(id) {
            if (id) {
                cancelFn.call(window, id);
            }
        };
    })();
    // shortcuts for most used utility functions
    L.extend = L.Util.extend;
    L.bind = L.Util.bind;
    L.stamp = L.Util.stamp;
    L.setOptions = L.Util.setOptions;
    /*
 * L.Class powers the OOP facilities of the library.
 * Thanks to John Resig and Dean Edwards for inspiration!
 */
    L.Class = function() {};
    L.Class.extend = function(props) {
        // extended class with the new prototype
        var NewClass = function() {
            // call the constructor
            if (this.initialize) {
                this.initialize.apply(this, arguments);
            }
            // call all constructor hooks
            if (this._initHooks) {
                this.callInitHooks();
            }
        };
        // instantiate class without calling constructor
        var F = function() {};
        F.prototype = this.prototype;
        var proto = new F();
        proto.constructor = NewClass;
        NewClass.prototype = proto;
        //inherit parent's statics
        for (var i in this) {
            if (this.hasOwnProperty(i) && i !== "prototype") {
                NewClass[i] = this[i];
            }
        }
        // mix static properties into the class
        if (props.statics) {
            L.extend(NewClass, props.statics);
            delete props.statics;
        }
        // mix includes into the prototype
        if (props.includes) {
            L.Util.extend.apply(null, [ proto ].concat(props.includes));
            delete props.includes;
        }
        // merge options
        if (props.options && proto.options) {
            props.options = L.extend({}, proto.options, props.options);
        }
        // mix given properties into the prototype
        L.extend(proto, props);
        proto._initHooks = [];
        var parent = this;
        // jshint camelcase: false
        NewClass.__super__ = parent.prototype;
        // add method for calling all hooks
        proto.callInitHooks = function() {
            if (this._initHooksCalled) {
                return;
            }
            if (parent.prototype.callInitHooks) {
                parent.prototype.callInitHooks.call(this);
            }
            this._initHooksCalled = true;
            for (var i = 0, len = proto._initHooks.length; i < len; i++) {
                proto._initHooks[i].call(this);
            }
        };
        return NewClass;
    };
    // method for adding properties to prototype
    L.Class.include = function(props) {
        L.extend(this.prototype, props);
    };
    // merge new default options to the Class
    L.Class.mergeOptions = function(options) {
        L.extend(this.prototype.options, options);
    };
    // add a constructor hook
    L.Class.addInitHook = function(fn) {
        // (Function) || (String, args...)
        var args = Array.prototype.slice.call(arguments, 1);
        var init = typeof fn === "function" ? fn : function() {
            this[fn].apply(this, args);
        };
        this.prototype._initHooks = this.prototype._initHooks || [];
        this.prototype._initHooks.push(init);
    };
    /*
 * L.Mixin.Events is used to add custom events functionality to Leaflet classes.
 */
    var eventsKey = "_leaflet_events";
    L.Mixin = {};
    L.Mixin.Events = {
        addEventListener: function(types, fn, context) {
            // (String, Function[, Object]) or (Object[, Object])
            // types can be a map of types/handlers
            if (L.Util.invokeEach(types, this.addEventListener, this, fn, context)) {
                return this;
            }
            var events = this[eventsKey] = this[eventsKey] || {}, contextId = context && context !== this && L.stamp(context), i, len, event, type, indexKey, indexLenKey, typeIndex;
            // types can be a string of space-separated words
            types = L.Util.splitWords(types);
            for (i = 0, len = types.length; i < len; i++) {
                event = {
                    action: fn,
                    context: context || this
                };
                type = types[i];
                if (contextId) {
                    // store listeners of a particular context in a separate hash (if it has an id)
                    // gives a major performance boost when removing thousands of map layers
                    indexKey = type + "_idx";
                    indexLenKey = indexKey + "_len";
                    typeIndex = events[indexKey] = events[indexKey] || {};
                    if (!typeIndex[contextId]) {
                        typeIndex[contextId] = [];
                        // keep track of the number of keys in the index to quickly check if it's empty
                        events[indexLenKey] = (events[indexLenKey] || 0) + 1;
                    }
                    typeIndex[contextId].push(event);
                } else {
                    events[type] = events[type] || [];
                    events[type].push(event);
                }
            }
            return this;
        },
        hasEventListeners: function(type) {
            // (String) -> Boolean
            var events = this[eventsKey];
            return !!events && (type in events && events[type].length > 0 || type + "_idx" in events && events[type + "_idx_len"] > 0);
        },
        removeEventListener: function(types, fn, context) {
            // ([String, Function, Object]) or (Object[, Object])
            if (!this[eventsKey]) {
                return this;
            }
            if (!types) {
                return this.clearAllEventListeners();
            }
            if (L.Util.invokeEach(types, this.removeEventListener, this, fn, context)) {
                return this;
            }
            var events = this[eventsKey], contextId = context && context !== this && L.stamp(context), i, len, type, listeners, j, indexKey, indexLenKey, typeIndex, removed;
            types = L.Util.splitWords(types);
            for (i = 0, len = types.length; i < len; i++) {
                type = types[i];
                indexKey = type + "_idx";
                indexLenKey = indexKey + "_len";
                typeIndex = events[indexKey];
                if (!fn) {
                    // clear all listeners for a type if function isn't specified
                    delete events[type];
                    delete events[indexKey];
                    delete events[indexLenKey];
                } else {
                    listeners = contextId && typeIndex ? typeIndex[contextId] : events[type];
                    if (listeners) {
                        for (j = listeners.length - 1; j >= 0; j--) {
                            if (listeners[j].action === fn && (!context || listeners[j].context === context)) {
                                removed = listeners.splice(j, 1);
                                // set the old action to a no-op, because it is possible
                                // that the listener is being iterated over as part of a dispatch
                                removed[0].action = L.Util.falseFn;
                            }
                        }
                        if (context && typeIndex && listeners.length === 0) {
                            delete typeIndex[contextId];
                            events[indexLenKey]--;
                        }
                    }
                }
            }
            return this;
        },
        clearAllEventListeners: function() {
            delete this[eventsKey];
            return this;
        },
        fireEvent: function(type, data) {
            // (String[, Object])
            if (!this.hasEventListeners(type)) {
                return this;
            }
            var event = L.Util.extend({}, data, {
                type: type,
                target: this
            });
            var events = this[eventsKey], listeners, i, len, typeIndex, contextId;
            if (events[type]) {
                // make sure adding/removing listeners inside other listeners won't cause infinite loop
                listeners = events[type].slice();
                for (i = 0, len = listeners.length; i < len; i++) {
                    listeners[i].action.call(listeners[i].context, event);
                }
            }
            // fire event for the context-indexed listeners as well
            typeIndex = events[type + "_idx"];
            for (contextId in typeIndex) {
                listeners = typeIndex[contextId].slice();
                if (listeners) {
                    for (i = 0, len = listeners.length; i < len; i++) {
                        listeners[i].action.call(listeners[i].context, event);
                    }
                }
            }
            return this;
        },
        addOneTimeEventListener: function(types, fn, context) {
            if (L.Util.invokeEach(types, this.addOneTimeEventListener, this, fn, context)) {
                return this;
            }
            var handler = L.bind(function() {
                this.removeEventListener(types, fn, context).removeEventListener(types, handler, context);
            }, this);
            return this.addEventListener(types, fn, context).addEventListener(types, handler, context);
        }
    };
    L.Mixin.Events.on = L.Mixin.Events.addEventListener;
    L.Mixin.Events.off = L.Mixin.Events.removeEventListener;
    L.Mixin.Events.once = L.Mixin.Events.addOneTimeEventListener;
    L.Mixin.Events.fire = L.Mixin.Events.fireEvent;
    /*
 * L.Browser handles different browser and feature detections for internal Leaflet use.
 */
    (function() {
        var ie = "ActiveXObject" in window, ielt9 = ie && !document.addEventListener, // terrible browser detection to work around Safari / iOS / Android browser bugs
        ua = navigator.userAgent.toLowerCase(), webkit = ua.indexOf("webkit") !== -1, chrome = ua.indexOf("chrome") !== -1, phantomjs = ua.indexOf("phantom") !== -1, android = ua.indexOf("android") !== -1, android23 = ua.search("android [23]") !== -1, gecko = ua.indexOf("gecko") !== -1, mobile = typeof orientation !== undefined + "", msPointer = window.navigator && window.navigator.msPointerEnabled && window.navigator.msMaxTouchPoints && !window.PointerEvent, pointer = window.PointerEvent && window.navigator.pointerEnabled && window.navigator.maxTouchPoints || msPointer, retina = "devicePixelRatio" in window && window.devicePixelRatio > 1 || "matchMedia" in window && window.matchMedia("(min-resolution:144dpi)") && window.matchMedia("(min-resolution:144dpi)").matches, doc = document.documentElement, ie3d = ie && "transition" in doc.style, webkit3d = "WebKitCSSMatrix" in window && "m11" in new window.WebKitCSSMatrix() && !android23, gecko3d = "MozPerspective" in doc.style, opera3d = "OTransition" in doc.style, any3d = !window.L_DISABLE_3D && (ie3d || webkit3d || gecko3d || opera3d) && !phantomjs;
        // PhantomJS has 'ontouchstart' in document.documentElement, but doesn't actually support touch.
        // https://github.com/Leaflet/Leaflet/pull/1434#issuecomment-13843151
        var touch = !window.L_NO_TOUCH && !phantomjs && function() {
            var startName = "ontouchstart";
            // IE10+ (We simulate these into touch* events in L.DomEvent and L.DomEvent.Pointer) or WebKit, etc.
            if (pointer || startName in doc) {
                return true;
            }
            // Firefox/Gecko
            var div = document.createElement("div"), supported = false;
            if (!div.setAttribute) {
                return false;
            }
            div.setAttribute(startName, "return;");
            if (typeof div[startName] === "function") {
                supported = true;
            }
            div.removeAttribute(startName);
            div = null;
            return supported;
        }();
        L.Browser = {
            ie: ie,
            ielt9: ielt9,
            webkit: webkit,
            gecko: gecko && !webkit && !window.opera && !ie,
            android: android,
            android23: android23,
            chrome: chrome,
            ie3d: ie3d,
            webkit3d: webkit3d,
            gecko3d: gecko3d,
            opera3d: opera3d,
            any3d: any3d,
            mobile: mobile,
            mobileWebkit: mobile && webkit,
            mobileWebkit3d: mobile && webkit3d,
            mobileOpera: mobile && window.opera,
            touch: touch,
            msPointer: msPointer,
            pointer: pointer,
            retina: retina
        };
    })();
    /*
 * L.Point represents a point with x and y coordinates.
 */
    L.Point = function(/*Number*/ x, /*Number*/ y, /*Boolean*/ round) {
        this.x = round ? Math.round(x) : x;
        this.y = round ? Math.round(y) : y;
    };
    L.Point.prototype = {
        clone: function() {
            return new L.Point(this.x, this.y);
        },
        // non-destructive, returns a new point
        add: function(point) {
            return this.clone()._add(L.point(point));
        },
        // destructive, used directly for performance in situations where it's safe to modify existing point
        _add: function(point) {
            this.x += point.x;
            this.y += point.y;
            return this;
        },
        subtract: function(point) {
            return this.clone()._subtract(L.point(point));
        },
        _subtract: function(point) {
            this.x -= point.x;
            this.y -= point.y;
            return this;
        },
        divideBy: function(num) {
            return this.clone()._divideBy(num);
        },
        _divideBy: function(num) {
            this.x /= num;
            this.y /= num;
            return this;
        },
        multiplyBy: function(num) {
            return this.clone()._multiplyBy(num);
        },
        _multiplyBy: function(num) {
            this.x *= num;
            this.y *= num;
            return this;
        },
        round: function() {
            return this.clone()._round();
        },
        _round: function() {
            this.x = Math.round(this.x);
            this.y = Math.round(this.y);
            return this;
        },
        floor: function() {
            return this.clone()._floor();
        },
        _floor: function() {
            this.x = Math.floor(this.x);
            this.y = Math.floor(this.y);
            return this;
        },
        distanceTo: function(point) {
            point = L.point(point);
            var x = point.x - this.x, y = point.y - this.y;
            return Math.sqrt(x * x + y * y);
        },
        equals: function(point) {
            point = L.point(point);
            return point.x === this.x && point.y === this.y;
        },
        contains: function(point) {
            point = L.point(point);
            return Math.abs(point.x) <= Math.abs(this.x) && Math.abs(point.y) <= Math.abs(this.y);
        },
        toString: function() {
            return "Point(" + L.Util.formatNum(this.x) + ", " + L.Util.formatNum(this.y) + ")";
        }
    };
    L.point = function(x, y, round) {
        if (x instanceof L.Point) {
            return x;
        }
        if (L.Util.isArray(x)) {
            return new L.Point(x[0], x[1]);
        }
        if (x === undefined || x === null) {
            return x;
        }
        return new L.Point(x, y, round);
    };
    /*
 * L.Bounds represents a rectangular area on the screen in pixel coordinates.
 */
    L.Bounds = function(a, b) {
        //(Point, Point) or Point[]
        if (!a) {
            return;
        }
        var points = b ? [ a, b ] : a;
        for (var i = 0, len = points.length; i < len; i++) {
            this.extend(points[i]);
        }
    };
    L.Bounds.prototype = {
        // extend the bounds to contain the given point
        extend: function(point) {
            // (Point)
            point = L.point(point);
            if (!this.min && !this.max) {
                this.min = point.clone();
                this.max = point.clone();
            } else {
                this.min.x = Math.min(point.x, this.min.x);
                this.max.x = Math.max(point.x, this.max.x);
                this.min.y = Math.min(point.y, this.min.y);
                this.max.y = Math.max(point.y, this.max.y);
            }
            return this;
        },
        getCenter: function(round) {
            // (Boolean) -> Point
            return new L.Point((this.min.x + this.max.x) / 2, (this.min.y + this.max.y) / 2, round);
        },
        getBottomLeft: function() {
            // -> Point
            return new L.Point(this.min.x, this.max.y);
        },
        getTopRight: function() {
            // -> Point
            return new L.Point(this.max.x, this.min.y);
        },
        getSize: function() {
            return this.max.subtract(this.min);
        },
        contains: function(obj) {
            // (Bounds) or (Point) -> Boolean
            var min, max;
            if (typeof obj[0] === "number" || obj instanceof L.Point) {
                obj = L.point(obj);
            } else {
                obj = L.bounds(obj);
            }
            if (obj instanceof L.Bounds) {
                min = obj.min;
                max = obj.max;
            } else {
                min = max = obj;
            }
            return min.x >= this.min.x && max.x <= this.max.x && min.y >= this.min.y && max.y <= this.max.y;
        },
        intersects: function(bounds) {
            // (Bounds) -> Boolean
            bounds = L.bounds(bounds);
            var min = this.min, max = this.max, min2 = bounds.min, max2 = bounds.max, xIntersects = max2.x >= min.x && min2.x <= max.x, yIntersects = max2.y >= min.y && min2.y <= max.y;
            return xIntersects && yIntersects;
        },
        isValid: function() {
            return !!(this.min && this.max);
        }
    };
    L.bounds = function(a, b) {
        // (Bounds) or (Point, Point) or (Point[])
        if (!a || a instanceof L.Bounds) {
            return a;
        }
        return new L.Bounds(a, b);
    };
    /*
 * L.Transformation is an utility class to perform simple point transformations through a 2d-matrix.
 */
    L.Transformation = function(a, b, c, d) {
        this._a = a;
        this._b = b;
        this._c = c;
        this._d = d;
    };
    L.Transformation.prototype = {
        transform: function(point, scale) {
            // (Point, Number) -> Point
            return this._transform(point.clone(), scale);
        },
        // destructive transform (faster)
        _transform: function(point, scale) {
            scale = scale || 1;
            point.x = scale * (this._a * point.x + this._b);
            point.y = scale * (this._c * point.y + this._d);
            return point;
        },
        untransform: function(point, scale) {
            scale = scale || 1;
            return new L.Point((point.x / scale - this._b) / this._a, (point.y / scale - this._d) / this._c);
        }
    };
    /*
 * L.DomUtil contains various utility functions for working with DOM.
 */
    L.DomUtil = {
        get: function(id) {
            return typeof id === "string" ? document.getElementById(id) : id;
        },
        getStyle: function(el, style) {
            var value = el.style[style];
            if (!value && el.currentStyle) {
                value = el.currentStyle[style];
            }
            if ((!value || value === "auto") && document.defaultView) {
                var css = document.defaultView.getComputedStyle(el, null);
                value = css ? css[style] : null;
            }
            return value === "auto" ? null : value;
        },
        getViewportOffset: function(element) {
            var top = 0, left = 0, el = element, docBody = document.body, docEl = document.documentElement, pos;
            do {
                top += el.offsetTop || 0;
                left += el.offsetLeft || 0;
                //add borders
                top += parseInt(L.DomUtil.getStyle(el, "borderTopWidth"), 10) || 0;
                left += parseInt(L.DomUtil.getStyle(el, "borderLeftWidth"), 10) || 0;
                pos = L.DomUtil.getStyle(el, "position");
                if (el.offsetParent === docBody && pos === "absolute") {
                    break;
                }
                if (pos === "fixed") {
                    top += docBody.scrollTop || docEl.scrollTop || 0;
                    left += docBody.scrollLeft || docEl.scrollLeft || 0;
                    break;
                }
                if (pos === "relative" && !el.offsetLeft) {
                    var width = L.DomUtil.getStyle(el, "width"), maxWidth = L.DomUtil.getStyle(el, "max-width"), r = el.getBoundingClientRect();
                    if (width !== "none" || maxWidth !== "none") {
                        left += r.left + el.clientLeft;
                    }
                    //calculate full y offset since we're breaking out of the loop
                    top += r.top + (docBody.scrollTop || docEl.scrollTop || 0);
                    break;
                }
                el = el.offsetParent;
            } while (el);
            el = element;
            do {
                if (el === docBody) {
                    break;
                }
                top -= el.scrollTop || 0;
                left -= el.scrollLeft || 0;
                el = el.parentNode;
            } while (el);
            return new L.Point(left, top);
        },
        documentIsLtr: function() {
            if (!L.DomUtil._docIsLtrCached) {
                L.DomUtil._docIsLtrCached = true;
                L.DomUtil._docIsLtr = L.DomUtil.getStyle(document.body, "direction") === "ltr";
            }
            return L.DomUtil._docIsLtr;
        },
        create: function(tagName, className, container) {
            var el = document.createElement(tagName);
            el.className = className;
            if (container) {
                container.appendChild(el);
            }
            return el;
        },
        hasClass: function(el, name) {
            if (el.classList !== undefined) {
                return el.classList.contains(name);
            }
            var className = L.DomUtil._getClass(el);
            return className.length > 0 && new RegExp("(^|\\s)" + name + "(\\s|$)").test(className);
        },
        addClass: function(el, name) {
            if (el.classList !== undefined) {
                var classes = L.Util.splitWords(name);
                for (var i = 0, len = classes.length; i < len; i++) {
                    el.classList.add(classes[i]);
                }
            } else if (!L.DomUtil.hasClass(el, name)) {
                var className = L.DomUtil._getClass(el);
                L.DomUtil._setClass(el, (className ? className + " " : "") + name);
            }
        },
        removeClass: function(el, name) {
            if (el.classList !== undefined) {
                el.classList.remove(name);
            } else {
                L.DomUtil._setClass(el, L.Util.trim((" " + L.DomUtil._getClass(el) + " ").replace(" " + name + " ", " ")));
            }
        },
        _setClass: function(el, name) {
            if (el.className.baseVal === undefined) {
                el.className = name;
            } else {
                // in case of SVG element
                el.className.baseVal = name;
            }
        },
        _getClass: function(el) {
            return el.className.baseVal === undefined ? el.className : el.className.baseVal;
        },
        setOpacity: function(el, value) {
            if ("opacity" in el.style) {
                el.style.opacity = value;
            } else if ("filter" in el.style) {
                var filter = false, filterName = "DXImageTransform.Microsoft.Alpha";
                // filters collection throws an error if we try to retrieve a filter that doesn't exist
                try {
                    filter = el.filters.item(filterName);
                } catch (e) {
                    // don't set opacity to 1 if we haven't already set an opacity,
                    // it isn't needed and breaks transparent pngs.
                    if (value === 1) {
                        return;
                    }
                }
                value = Math.round(value * 100);
                if (filter) {
                    filter.Enabled = value !== 100;
                    filter.Opacity = value;
                } else {
                    el.style.filter += " progid:" + filterName + "(opacity=" + value + ")";
                }
            }
        },
        testProp: function(props) {
            var style = document.documentElement.style;
            for (var i = 0; i < props.length; i++) {
                if (props[i] in style) {
                    return props[i];
                }
            }
            return false;
        },
        getTranslateString: function(point) {
            // on WebKit browsers (Chrome/Safari/iOS Safari/Android) using translate3d instead of translate
            // makes animation smoother as it ensures HW accel is used. Firefox 13 doesn't care
            // (same speed either way), Opera 12 doesn't support translate3d
            var is3d = L.Browser.webkit3d, open = "translate" + (is3d ? "3d" : "") + "(", close = (is3d ? ",0" : "") + ")";
            return open + point.x + "px," + point.y + "px" + close;
        },
        getScaleString: function(scale, origin) {
            var preTranslateStr = L.DomUtil.getTranslateString(origin.add(origin.multiplyBy(-1 * scale))), scaleStr = " scale(" + scale + ") ";
            return preTranslateStr + scaleStr;
        },
        setPosition: function(el, point, disable3D) {
            // (HTMLElement, Point[, Boolean])
            // jshint camelcase: false
            el._leaflet_pos = point;
            if (!disable3D && L.Browser.any3d) {
                el.style[L.DomUtil.TRANSFORM] = L.DomUtil.getTranslateString(point);
            } else {
                el.style.left = point.x + "px";
                el.style.top = point.y + "px";
            }
        },
        getPosition: function(el) {
            // this method is only used for elements previously positioned using setPosition,
            // so it's safe to cache the position for performance
            // jshint camelcase: false
            return el._leaflet_pos;
        }
    };
    // prefix style property names
    L.DomUtil.TRANSFORM = L.DomUtil.testProp([ "transform", "WebkitTransform", "OTransform", "MozTransform", "msTransform" ]);
    // webkitTransition comes first because some browser versions that drop vendor prefix don't do
    // the same for the transitionend event, in particular the Android 4.1 stock browser
    L.DomUtil.TRANSITION = L.DomUtil.testProp([ "webkitTransition", "transition", "OTransition", "MozTransition", "msTransition" ]);
    L.DomUtil.TRANSITION_END = L.DomUtil.TRANSITION === "webkitTransition" || L.DomUtil.TRANSITION === "OTransition" ? L.DomUtil.TRANSITION + "End" : "transitionend";
    (function() {
        if ("onselectstart" in document) {
            L.extend(L.DomUtil, {
                disableTextSelection: function() {
                    L.DomEvent.on(window, "selectstart", L.DomEvent.preventDefault);
                },
                enableTextSelection: function() {
                    L.DomEvent.off(window, "selectstart", L.DomEvent.preventDefault);
                }
            });
        } else {
            var userSelectProperty = L.DomUtil.testProp([ "userSelect", "WebkitUserSelect", "OUserSelect", "MozUserSelect", "msUserSelect" ]);
            L.extend(L.DomUtil, {
                disableTextSelection: function() {
                    if (userSelectProperty) {
                        var style = document.documentElement.style;
                        this._userSelect = style[userSelectProperty];
                        style[userSelectProperty] = "none";
                    }
                },
                enableTextSelection: function() {
                    if (userSelectProperty) {
                        document.documentElement.style[userSelectProperty] = this._userSelect;
                        delete this._userSelect;
                    }
                }
            });
        }
        L.extend(L.DomUtil, {
            disableImageDrag: function() {
                L.DomEvent.on(window, "dragstart", L.DomEvent.preventDefault);
            },
            enableImageDrag: function() {
                L.DomEvent.off(window, "dragstart", L.DomEvent.preventDefault);
            }
        });
    })();
    /*
 * L.LatLng represents a geographical point with latitude and longitude coordinates.
 */
    L.LatLng = function(lat, lng, alt) {
        // (Number, Number, Number)
        lat = parseFloat(lat);
        lng = parseFloat(lng);
        if (isNaN(lat) || isNaN(lng)) {
            throw new Error("Invalid LatLng object: (" + lat + ", " + lng + ")");
        }
        this.lat = lat;
        this.lng = lng;
        if (alt !== undefined) {
            this.alt = parseFloat(alt);
        }
    };
    L.extend(L.LatLng, {
        DEG_TO_RAD: Math.PI / 180,
        RAD_TO_DEG: 180 / Math.PI,
        MAX_MARGIN: 1e-9
    });
    L.LatLng.prototype = {
        equals: function(obj) {
            // (LatLng) -> Boolean
            if (!obj) {
                return false;
            }
            obj = L.latLng(obj);
            var margin = Math.max(Math.abs(this.lat - obj.lat), Math.abs(this.lng - obj.lng));
            return margin <= L.LatLng.MAX_MARGIN;
        },
        toString: function(precision) {
            // (Number) -> String
            return "LatLng(" + L.Util.formatNum(this.lat, precision) + ", " + L.Util.formatNum(this.lng, precision) + ")";
        },
        // Haversine distance formula, see http://en.wikipedia.org/wiki/Haversine_formula
        // TODO move to projection code, LatLng shouldn't know about Earth
        distanceTo: function(other) {
            // (LatLng) -> Number
            other = L.latLng(other);
            var R = 6378137, // earth radius in meters
            d2r = L.LatLng.DEG_TO_RAD, dLat = (other.lat - this.lat) * d2r, dLon = (other.lng - this.lng) * d2r, lat1 = this.lat * d2r, lat2 = other.lat * d2r, sin1 = Math.sin(dLat / 2), sin2 = Math.sin(dLon / 2);
            var a = sin1 * sin1 + sin2 * sin2 * Math.cos(lat1) * Math.cos(lat2);
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        },
        wrap: function(a, b) {
            // (Number, Number) -> LatLng
            var lng = this.lng;
            a = a || -180;
            b = b || 180;
            lng = (lng + b) % (b - a) + (lng < a || lng === b ? b : a);
            return new L.LatLng(this.lat, lng);
        }
    };
    L.latLng = function(a, b) {
        // (LatLng) or ([Number, Number]) or (Number, Number)
        if (a instanceof L.LatLng) {
            return a;
        }
        if (L.Util.isArray(a)) {
            if (typeof a[0] === "number" || typeof a[0] === "string") {
                return new L.LatLng(a[0], a[1], a[2]);
            } else {
                return null;
            }
        }
        if (a === undefined || a === null) {
            return a;
        }
        if (typeof a === "object" && "lat" in a) {
            return new L.LatLng(a.lat, "lng" in a ? a.lng : a.lon);
        }
        if (b === undefined) {
            return null;
        }
        return new L.LatLng(a, b);
    };
    /*
 * L.LatLngBounds represents a rectangular area on the map in geographical coordinates.
 */
    L.LatLngBounds = function(southWest, northEast) {
        // (LatLng, LatLng) or (LatLng[])
        if (!southWest) {
            return;
        }
        var latlngs = northEast ? [ southWest, northEast ] : southWest;
        for (var i = 0, len = latlngs.length; i < len; i++) {
            this.extend(latlngs[i]);
        }
    };
    L.LatLngBounds.prototype = {
        // extend the bounds to contain the given point or bounds
        extend: function(obj) {
            // (LatLng) or (LatLngBounds)
            if (!obj) {
                return this;
            }
            var latLng = L.latLng(obj);
            if (latLng !== null) {
                obj = latLng;
            } else {
                obj = L.latLngBounds(obj);
            }
            if (obj instanceof L.LatLng) {
                if (!this._southWest && !this._northEast) {
                    this._southWest = new L.LatLng(obj.lat, obj.lng);
                    this._northEast = new L.LatLng(obj.lat, obj.lng);
                } else {
                    this._southWest.lat = Math.min(obj.lat, this._southWest.lat);
                    this._southWest.lng = Math.min(obj.lng, this._southWest.lng);
                    this._northEast.lat = Math.max(obj.lat, this._northEast.lat);
                    this._northEast.lng = Math.max(obj.lng, this._northEast.lng);
                }
            } else if (obj instanceof L.LatLngBounds) {
                this.extend(obj._southWest);
                this.extend(obj._northEast);
            }
            return this;
        },
        // extend the bounds by a percentage
        pad: function(bufferRatio) {
            // (Number) -> LatLngBounds
            var sw = this._southWest, ne = this._northEast, heightBuffer = Math.abs(sw.lat - ne.lat) * bufferRatio, widthBuffer = Math.abs(sw.lng - ne.lng) * bufferRatio;
            return new L.LatLngBounds(new L.LatLng(sw.lat - heightBuffer, sw.lng - widthBuffer), new L.LatLng(ne.lat + heightBuffer, ne.lng + widthBuffer));
        },
        getCenter: function() {
            // -> LatLng
            return new L.LatLng((this._southWest.lat + this._northEast.lat) / 2, (this._southWest.lng + this._northEast.lng) / 2);
        },
        getSouthWest: function() {
            return this._southWest;
        },
        getNorthEast: function() {
            return this._northEast;
        },
        getNorthWest: function() {
            return new L.LatLng(this.getNorth(), this.getWest());
        },
        getSouthEast: function() {
            return new L.LatLng(this.getSouth(), this.getEast());
        },
        getWest: function() {
            return this._southWest.lng;
        },
        getSouth: function() {
            return this._southWest.lat;
        },
        getEast: function() {
            return this._northEast.lng;
        },
        getNorth: function() {
            return this._northEast.lat;
        },
        contains: function(obj) {
            // (LatLngBounds) or (LatLng) -> Boolean
            if (typeof obj[0] === "number" || obj instanceof L.LatLng) {
                obj = L.latLng(obj);
            } else {
                obj = L.latLngBounds(obj);
            }
            var sw = this._southWest, ne = this._northEast, sw2, ne2;
            if (obj instanceof L.LatLngBounds) {
                sw2 = obj.getSouthWest();
                ne2 = obj.getNorthEast();
            } else {
                sw2 = ne2 = obj;
            }
            return sw2.lat >= sw.lat && ne2.lat <= ne.lat && sw2.lng >= sw.lng && ne2.lng <= ne.lng;
        },
        intersects: function(bounds) {
            // (LatLngBounds)
            bounds = L.latLngBounds(bounds);
            var sw = this._southWest, ne = this._northEast, sw2 = bounds.getSouthWest(), ne2 = bounds.getNorthEast(), latIntersects = ne2.lat >= sw.lat && sw2.lat <= ne.lat, lngIntersects = ne2.lng >= sw.lng && sw2.lng <= ne.lng;
            return latIntersects && lngIntersects;
        },
        toBBoxString: function() {
            return [ this.getWest(), this.getSouth(), this.getEast(), this.getNorth() ].join(",");
        },
        equals: function(bounds) {
            // (LatLngBounds)
            if (!bounds) {
                return false;
            }
            bounds = L.latLngBounds(bounds);
            return this._southWest.equals(bounds.getSouthWest()) && this._northEast.equals(bounds.getNorthEast());
        },
        isValid: function() {
            return !!(this._southWest && this._northEast);
        }
    };
    //TODO International date line?
    L.latLngBounds = function(a, b) {
        // (LatLngBounds) or (LatLng, LatLng)
        if (!a || a instanceof L.LatLngBounds) {
            return a;
        }
        return new L.LatLngBounds(a, b);
    };
    /*
 * L.Projection contains various geographical projections used by CRS classes.
 */
    L.Projection = {};
    /*
 * Spherical Mercator is the most popular map projection, used by EPSG:3857 CRS used by default.
 */
    L.Projection.SphericalMercator = {
        MAX_LATITUDE: 85.0511287798,
        project: function(latlng) {
            // (LatLng) -> Point
            var d = L.LatLng.DEG_TO_RAD, max = this.MAX_LATITUDE, lat = Math.max(Math.min(max, latlng.lat), -max), x = latlng.lng * d, y = lat * d;
            y = Math.log(Math.tan(Math.PI / 4 + y / 2));
            return new L.Point(x, y);
        },
        unproject: function(point) {
            // (Point, Boolean) -> LatLng
            var d = L.LatLng.RAD_TO_DEG, lng = point.x * d, lat = (2 * Math.atan(Math.exp(point.y)) - Math.PI / 2) * d;
            return new L.LatLng(lat, lng);
        }
    };
    /*
 * Simple equirectangular (Plate Carree) projection, used by CRS like EPSG:4326 and Simple.
 */
    L.Projection.LonLat = {
        project: function(latlng) {
            return new L.Point(latlng.lng, latlng.lat);
        },
        unproject: function(point) {
            return new L.LatLng(point.y, point.x);
        }
    };
    /*
 * L.CRS is a base object for all defined CRS (Coordinate Reference Systems) in Leaflet.
 */
    L.CRS = {
        latLngToPoint: function(latlng, zoom) {
            // (LatLng, Number) -> Point
            var projectedPoint = this.projection.project(latlng), scale = this.scale(zoom);
            return this.transformation._transform(projectedPoint, scale);
        },
        pointToLatLng: function(point, zoom) {
            // (Point, Number[, Boolean]) -> LatLng
            var scale = this.scale(zoom), untransformedPoint = this.transformation.untransform(point, scale);
            return this.projection.unproject(untransformedPoint);
        },
        project: function(latlng) {
            return this.projection.project(latlng);
        },
        scale: function(zoom) {
            return 256 * Math.pow(2, zoom);
        },
        getSize: function(zoom) {
            var s = this.scale(zoom);
            return L.point(s, s);
        }
    };
    /*
 * A simple CRS that can be used for flat non-Earth maps like panoramas or game maps.
 */
    L.CRS.Simple = L.extend({}, L.CRS, {
        projection: L.Projection.LonLat,
        transformation: new L.Transformation(1, 0, -1, 0),
        scale: function(zoom) {
            return Math.pow(2, zoom);
        }
    });
    /*
 * L.CRS.EPSG3857 (Spherical Mercator) is the most common CRS for web mapping
 * and is used by Leaflet by default.
 */
    L.CRS.EPSG3857 = L.extend({}, L.CRS, {
        code: "EPSG:3857",
        projection: L.Projection.SphericalMercator,
        transformation: new L.Transformation(.5 / Math.PI, .5, -.5 / Math.PI, .5),
        project: function(latlng) {
            // (LatLng) -> Point
            var projectedPoint = this.projection.project(latlng), earthRadius = 6378137;
            return projectedPoint.multiplyBy(earthRadius);
        }
    });
    L.CRS.EPSG900913 = L.extend({}, L.CRS.EPSG3857, {
        code: "EPSG:900913"
    });
    /*
 * L.CRS.EPSG4326 is a CRS popular among advanced GIS specialists.
 */
    L.CRS.EPSG4326 = L.extend({}, L.CRS, {
        code: "EPSG:4326",
        projection: L.Projection.LonLat,
        transformation: new L.Transformation(1 / 360, .5, -1 / 360, .5)
    });
    /*
 * L.Map is the central class of the API - it is used to create a map.
 */
    L.Map = L.Class.extend({
        includes: L.Mixin.Events,
        options: {
            crs: L.CRS.EPSG3857,
            /*
		center: LatLng,
		zoom: Number,
		layers: Array,
		*/
            fadeAnimation: L.DomUtil.TRANSITION && !L.Browser.android23,
            trackResize: true,
            markerZoomAnimation: L.DomUtil.TRANSITION && L.Browser.any3d
        },
        initialize: function(id, options) {
            // (HTMLElement or String, Object)
            options = L.setOptions(this, options);
            this._initContainer(id);
            this._initLayout();
            // hack for https://github.com/Leaflet/Leaflet/issues/1980
            this._onResize = L.bind(this._onResize, this);
            this._initEvents();
            if (options.maxBounds) {
                this.setMaxBounds(options.maxBounds);
            }
            if (options.center && options.zoom !== undefined) {
                this.setView(L.latLng(options.center), options.zoom, {
                    reset: true
                });
            }
            this._handlers = [];
            this._layers = {};
            this._zoomBoundLayers = {};
            this._tileLayersNum = 0;
            this.callInitHooks();
            this._addLayers(options.layers);
        },
        // public methods that modify map state
        // replaced by animation-powered implementation in Map.PanAnimation.js
        setView: function(center, zoom) {
            zoom = zoom === undefined ? this.getZoom() : zoom;
            this._resetView(L.latLng(center), this._limitZoom(zoom));
            return this;
        },
        setZoom: function(zoom, options) {
            if (!this._loaded) {
                this._zoom = this._limitZoom(zoom);
                return this;
            }
            return this.setView(this.getCenter(), zoom, {
                zoom: options
            });
        },
        zoomIn: function(delta, options) {
            return this.setZoom(this._zoom + (delta || 1), options);
        },
        zoomOut: function(delta, options) {
            return this.setZoom(this._zoom - (delta || 1), options);
        },
        setZoomAround: function(latlng, zoom, options) {
            var scale = this.getZoomScale(zoom), viewHalf = this.getSize().divideBy(2), containerPoint = latlng instanceof L.Point ? latlng : this.latLngToContainerPoint(latlng), centerOffset = containerPoint.subtract(viewHalf).multiplyBy(1 - 1 / scale), newCenter = this.containerPointToLatLng(viewHalf.add(centerOffset));
            return this.setView(newCenter, zoom, {
                zoom: options
            });
        },
        fitBounds: function(bounds, options) {
            options = options || {};
            bounds = bounds.getBounds ? bounds.getBounds() : L.latLngBounds(bounds);
            var paddingTL = L.point(options.paddingTopLeft || options.padding || [ 0, 0 ]), paddingBR = L.point(options.paddingBottomRight || options.padding || [ 0, 0 ]), zoom = this.getBoundsZoom(bounds, false, paddingTL.add(paddingBR)), paddingOffset = paddingBR.subtract(paddingTL).divideBy(2), swPoint = this.project(bounds.getSouthWest(), zoom), nePoint = this.project(bounds.getNorthEast(), zoom), center = this.unproject(swPoint.add(nePoint).divideBy(2).add(paddingOffset), zoom);
            zoom = options && options.maxZoom ? Math.min(options.maxZoom, zoom) : zoom;
            return this.setView(center, zoom, options);
        },
        fitWorld: function(options) {
            return this.fitBounds([ [ -90, -180 ], [ 90, 180 ] ], options);
        },
        panTo: function(center, options) {
            // (LatLng)
            return this.setView(center, this._zoom, {
                pan: options
            });
        },
        panBy: function(offset) {
            // (Point)
            // replaced with animated panBy in Map.PanAnimation.js
            this.fire("movestart");
            this._rawPanBy(L.point(offset));
            this.fire("move");
            return this.fire("moveend");
        },
        setMaxBounds: function(bounds) {
            bounds = L.latLngBounds(bounds);
            this.options.maxBounds = bounds;
            if (!bounds) {
                return this.off("moveend", this._panInsideMaxBounds, this);
            }
            if (this._loaded) {
                this._panInsideMaxBounds();
            }
            return this.on("moveend", this._panInsideMaxBounds, this);
        },
        panInsideBounds: function(bounds, options) {
            var center = this.getCenter(), newCenter = this._limitCenter(center, this._zoom, bounds);
            if (center.equals(newCenter)) {
                return this;
            }
            return this.panTo(newCenter, options);
        },
        addLayer: function(layer) {
            // TODO method is too big, refactor
            var id = L.stamp(layer);
            if (this._layers[id]) {
                return this;
            }
            this._layers[id] = layer;
            // TODO getMaxZoom, getMinZoom in ILayer (instead of options)
            if (layer.options && (!isNaN(layer.options.maxZoom) || !isNaN(layer.options.minZoom))) {
                this._zoomBoundLayers[id] = layer;
                this._updateZoomLevels();
            }
            // TODO looks ugly, refactor!!!
            if (this.options.zoomAnimation && L.TileLayer && layer instanceof L.TileLayer) {
                this._tileLayersNum++;
                this._tileLayersToLoad++;
                layer.on("load", this._onTileLayerLoad, this);
            }
            if (this._loaded) {
                this._layerAdd(layer);
            }
            return this;
        },
        removeLayer: function(layer) {
            var id = L.stamp(layer);
            if (!this._layers[id]) {
                return this;
            }
            if (this._loaded) {
                layer.onRemove(this);
            }
            delete this._layers[id];
            if (this._loaded) {
                this.fire("layerremove", {
                    layer: layer
                });
            }
            if (this._zoomBoundLayers[id]) {
                delete this._zoomBoundLayers[id];
                this._updateZoomLevels();
            }
            // TODO looks ugly, refactor
            if (this.options.zoomAnimation && L.TileLayer && layer instanceof L.TileLayer) {
                this._tileLayersNum--;
                this._tileLayersToLoad--;
                layer.off("load", this._onTileLayerLoad, this);
            }
            return this;
        },
        hasLayer: function(layer) {
            if (!layer) {
                return false;
            }
            return L.stamp(layer) in this._layers;
        },
        eachLayer: function(method, context) {
            for (var i in this._layers) {
                method.call(context, this._layers[i]);
            }
            return this;
        },
        invalidateSize: function(options) {
            if (!this._loaded) {
                return this;
            }
            options = L.extend({
                animate: false,
                pan: true
            }, options === true ? {
                animate: true
            } : options);
            var oldSize = this.getSize();
            this._sizeChanged = true;
            this._initialCenter = null;
            var newSize = this.getSize(), oldCenter = oldSize.divideBy(2).round(), newCenter = newSize.divideBy(2).round(), offset = oldCenter.subtract(newCenter);
            if (!offset.x && !offset.y) {
                return this;
            }
            if (options.animate && options.pan) {
                this.panBy(offset);
            } else {
                if (options.pan) {
                    this._rawPanBy(offset);
                }
                this.fire("move");
                if (options.debounceMoveend) {
                    clearTimeout(this._sizeTimer);
                    this._sizeTimer = setTimeout(L.bind(this.fire, this, "moveend"), 200);
                } else {
                    this.fire("moveend");
                }
            }
            return this.fire("resize", {
                oldSize: oldSize,
                newSize: newSize
            });
        },
        // TODO handler.addTo
        addHandler: function(name, HandlerClass) {
            if (!HandlerClass) {
                return this;
            }
            var handler = this[name] = new HandlerClass(this);
            this._handlers.push(handler);
            if (this.options[name]) {
                handler.enable();
            }
            return this;
        },
        remove: function() {
            if (this._loaded) {
                this.fire("unload");
            }
            this._initEvents("off");
            try {
                // throws error in IE6-8
                delete this._container._leaflet;
            } catch (e) {
                this._container._leaflet = undefined;
            }
            this._clearPanes();
            if (this._clearControlPos) {
                this._clearControlPos();
            }
            this._clearHandlers();
            return this;
        },
        // public methods for getting map state
        getCenter: function() {
            // (Boolean) -> LatLng
            this._checkIfLoaded();
            if (this._initialCenter && !this._moved()) {
                return this._initialCenter;
            }
            return this.layerPointToLatLng(this._getCenterLayerPoint());
        },
        getZoom: function() {
            return this._zoom;
        },
        getBounds: function() {
            var bounds = this.getPixelBounds(), sw = this.unproject(bounds.getBottomLeft()), ne = this.unproject(bounds.getTopRight());
            return new L.LatLngBounds(sw, ne);
        },
        getMinZoom: function() {
            return this.options.minZoom === undefined ? this._layersMinZoom === undefined ? 0 : this._layersMinZoom : this.options.minZoom;
        },
        getMaxZoom: function() {
            return this.options.maxZoom === undefined ? this._layersMaxZoom === undefined ? Infinity : this._layersMaxZoom : this.options.maxZoom;
        },
        getBoundsZoom: function(bounds, inside, padding) {
            // (LatLngBounds[, Boolean, Point]) -> Number
            bounds = L.latLngBounds(bounds);
            var zoom = this.getMinZoom() - (inside ? 1 : 0), maxZoom = this.getMaxZoom(), size = this.getSize(), nw = bounds.getNorthWest(), se = bounds.getSouthEast(), zoomNotFound = true, boundsSize;
            padding = L.point(padding || [ 0, 0 ]);
            do {
                zoom++;
                boundsSize = this.project(se, zoom).subtract(this.project(nw, zoom)).add(padding);
                zoomNotFound = !inside ? size.contains(boundsSize) : boundsSize.x < size.x || boundsSize.y < size.y;
            } while (zoomNotFound && zoom <= maxZoom);
            if (zoomNotFound && inside) {
                return null;
            }
            return inside ? zoom : zoom - 1;
        },
        getSize: function() {
            if (!this._size || this._sizeChanged) {
                this._size = new L.Point(this._container.clientWidth, this._container.clientHeight);
                this._sizeChanged = false;
            }
            return this._size.clone();
        },
        getPixelBounds: function() {
            var topLeftPoint = this._getTopLeftPoint();
            return new L.Bounds(topLeftPoint, topLeftPoint.add(this.getSize()));
        },
        getPixelOrigin: function() {
            this._checkIfLoaded();
            return this._initialTopLeftPoint;
        },
        getPanes: function() {
            return this._panes;
        },
        getContainer: function() {
            return this._container;
        },
        // TODO replace with universal implementation after refactoring projections
        getZoomScale: function(toZoom) {
            var crs = this.options.crs;
            return crs.scale(toZoom) / crs.scale(this._zoom);
        },
        getScaleZoom: function(scale) {
            return this._zoom + Math.log(scale) / Math.LN2;
        },
        // conversion methods
        project: function(latlng, zoom) {
            // (LatLng[, Number]) -> Point
            zoom = zoom === undefined ? this._zoom : zoom;
            return this.options.crs.latLngToPoint(L.latLng(latlng), zoom);
        },
        unproject: function(point, zoom) {
            // (Point[, Number]) -> LatLng
            zoom = zoom === undefined ? this._zoom : zoom;
            return this.options.crs.pointToLatLng(L.point(point), zoom);
        },
        layerPointToLatLng: function(point) {
            // (Point)
            var projectedPoint = L.point(point).add(this.getPixelOrigin());
            return this.unproject(projectedPoint);
        },
        latLngToLayerPoint: function(latlng) {
            // (LatLng)
            var projectedPoint = this.project(L.latLng(latlng))._round();
            return projectedPoint._subtract(this.getPixelOrigin());
        },
        containerPointToLayerPoint: function(point) {
            // (Point)
            return L.point(point).subtract(this._getMapPanePos());
        },
        layerPointToContainerPoint: function(point) {
            // (Point)
            return L.point(point).add(this._getMapPanePos());
        },
        containerPointToLatLng: function(point) {
            var layerPoint = this.containerPointToLayerPoint(L.point(point));
            return this.layerPointToLatLng(layerPoint);
        },
        latLngToContainerPoint: function(latlng) {
            return this.layerPointToContainerPoint(this.latLngToLayerPoint(L.latLng(latlng)));
        },
        mouseEventToContainerPoint: function(e) {
            // (MouseEvent)
            return L.DomEvent.getMousePosition(e, this._container);
        },
        mouseEventToLayerPoint: function(e) {
            // (MouseEvent)
            return this.containerPointToLayerPoint(this.mouseEventToContainerPoint(e));
        },
        mouseEventToLatLng: function(e) {
            // (MouseEvent)
            return this.layerPointToLatLng(this.mouseEventToLayerPoint(e));
        },
        // map initialization methods
        _initContainer: function(id) {
            var container = this._container = L.DomUtil.get(id);
            if (!container) {
                throw new Error("Map container not found.");
            } else if (container._leaflet) {
                throw new Error("Map container is already initialized.");
            }
            container._leaflet = true;
        },
        _initLayout: function() {
            var container = this._container;
            L.DomUtil.addClass(container, "leaflet-container" + (L.Browser.touch ? " leaflet-touch" : "") + (L.Browser.retina ? " leaflet-retina" : "") + (L.Browser.ielt9 ? " leaflet-oldie" : "") + (this.options.fadeAnimation ? " leaflet-fade-anim" : ""));
            var position = L.DomUtil.getStyle(container, "position");
            if (position !== "absolute" && position !== "relative" && position !== "fixed") {
                container.style.position = "relative";
            }
            this._initPanes();
            if (this._initControlPos) {
                this._initControlPos();
            }
        },
        _initPanes: function() {
            var panes = this._panes = {};
            this._mapPane = panes.mapPane = this._createPane("leaflet-map-pane", this._container);
            this._tilePane = panes.tilePane = this._createPane("leaflet-tile-pane", this._mapPane);
            panes.objectsPane = this._createPane("leaflet-objects-pane", this._mapPane);
            panes.shadowPane = this._createPane("leaflet-shadow-pane");
            panes.overlayPane = this._createPane("leaflet-overlay-pane");
            panes.markerPane = this._createPane("leaflet-marker-pane");
            panes.popupPane = this._createPane("leaflet-popup-pane");
            var zoomHide = " leaflet-zoom-hide";
            if (!this.options.markerZoomAnimation) {
                L.DomUtil.addClass(panes.markerPane, zoomHide);
                L.DomUtil.addClass(panes.shadowPane, zoomHide);
                L.DomUtil.addClass(panes.popupPane, zoomHide);
            }
        },
        _createPane: function(className, container) {
            return L.DomUtil.create("div", className, container || this._panes.objectsPane);
        },
        _clearPanes: function() {
            this._container.removeChild(this._mapPane);
        },
        _addLayers: function(layers) {
            layers = layers ? L.Util.isArray(layers) ? layers : [ layers ] : [];
            for (var i = 0, len = layers.length; i < len; i++) {
                this.addLayer(layers[i]);
            }
        },
        // private methods that modify map state
        _resetView: function(center, zoom, preserveMapOffset, afterZoomAnim) {
            var zoomChanged = this._zoom !== zoom;
            if (!afterZoomAnim) {
                this.fire("movestart");
                if (zoomChanged) {
                    this.fire("zoomstart");
                }
            }
            this._zoom = zoom;
            this._initialCenter = center;
            this._initialTopLeftPoint = this._getNewTopLeftPoint(center);
            if (!preserveMapOffset) {
                L.DomUtil.setPosition(this._mapPane, new L.Point(0, 0));
            } else {
                this._initialTopLeftPoint._add(this._getMapPanePos());
            }
            this._tileLayersToLoad = this._tileLayersNum;
            var loading = !this._loaded;
            this._loaded = true;
            this.fire("viewreset", {
                hard: !preserveMapOffset
            });
            if (loading) {
                this.fire("load");
                this.eachLayer(this._layerAdd, this);
            }
            this.fire("move");
            if (zoomChanged || afterZoomAnim) {
                this.fire("zoomend");
            }
            this.fire("moveend", {
                hard: !preserveMapOffset
            });
        },
        _rawPanBy: function(offset) {
            L.DomUtil.setPosition(this._mapPane, this._getMapPanePos().subtract(offset));
        },
        _getZoomSpan: function() {
            return this.getMaxZoom() - this.getMinZoom();
        },
        _updateZoomLevels: function() {
            var i, minZoom = Infinity, maxZoom = -Infinity, oldZoomSpan = this._getZoomSpan();
            for (i in this._zoomBoundLayers) {
                var layer = this._zoomBoundLayers[i];
                if (!isNaN(layer.options.minZoom)) {
                    minZoom = Math.min(minZoom, layer.options.minZoom);
                }
                if (!isNaN(layer.options.maxZoom)) {
                    maxZoom = Math.max(maxZoom, layer.options.maxZoom);
                }
            }
            if (i === undefined) {
                // we have no tilelayers
                this._layersMaxZoom = this._layersMinZoom = undefined;
            } else {
                this._layersMaxZoom = maxZoom;
                this._layersMinZoom = minZoom;
            }
            if (oldZoomSpan !== this._getZoomSpan()) {
                this.fire("zoomlevelschange");
            }
        },
        _panInsideMaxBounds: function() {
            this.panInsideBounds(this.options.maxBounds);
        },
        _checkIfLoaded: function() {
            if (!this._loaded) {
                throw new Error("Set map center and zoom first.");
            }
        },
        // map events
        _initEvents: function(onOff) {
            if (!L.DomEvent) {
                return;
            }
            onOff = onOff || "on";
            L.DomEvent[onOff](this._container, "click", this._onMouseClick, this);
            var events = [ "dblclick", "mousedown", "mouseup", "mouseenter", "mouseleave", "mousemove", "contextmenu" ], i, len;
            for (i = 0, len = events.length; i < len; i++) {
                L.DomEvent[onOff](this._container, events[i], this._fireMouseEvent, this);
            }
            if (this.options.trackResize) {
                L.DomEvent[onOff](window, "resize", this._onResize, this);
            }
        },
        _onResize: function() {
            L.Util.cancelAnimFrame(this._resizeRequest);
            this._resizeRequest = L.Util.requestAnimFrame(function() {
                this.invalidateSize({
                    debounceMoveend: true
                });
            }, this, false, this._container);
        },
        _onMouseClick: function(e) {
            if (!this._loaded || !e._simulated && (this.dragging && this.dragging.moved() || this.boxZoom && this.boxZoom.moved()) || L.DomEvent._skipped(e)) {
                return;
            }
            this.fire("preclick");
            this._fireMouseEvent(e);
        },
        _fireMouseEvent: function(e) {
            if (!this._loaded || L.DomEvent._skipped(e)) {
                return;
            }
            var type = e.type;
            type = type === "mouseenter" ? "mouseover" : type === "mouseleave" ? "mouseout" : type;
            if (!this.hasEventListeners(type)) {
                return;
            }
            if (type === "contextmenu") {
                L.DomEvent.preventDefault(e);
            }
            var containerPoint = this.mouseEventToContainerPoint(e), layerPoint = this.containerPointToLayerPoint(containerPoint), latlng = this.layerPointToLatLng(layerPoint);
            this.fire(type, {
                latlng: latlng,
                layerPoint: layerPoint,
                containerPoint: containerPoint,
                originalEvent: e
            });
        },
        _onTileLayerLoad: function() {
            this._tileLayersToLoad--;
            if (this._tileLayersNum && !this._tileLayersToLoad) {
                this.fire("tilelayersload");
            }
        },
        _clearHandlers: function() {
            for (var i = 0, len = this._handlers.length; i < len; i++) {
                this._handlers[i].disable();
            }
        },
        whenReady: function(callback, context) {
            if (this._loaded) {
                callback.call(context || this, this);
            } else {
                this.on("load", callback, context);
            }
            return this;
        },
        _layerAdd: function(layer) {
            layer.onAdd(this);
            this.fire("layeradd", {
                layer: layer
            });
        },
        // private methods for getting map state
        _getMapPanePos: function() {
            return L.DomUtil.getPosition(this._mapPane);
        },
        _moved: function() {
            var pos = this._getMapPanePos();
            return pos && !pos.equals([ 0, 0 ]);
        },
        _getTopLeftPoint: function() {
            return this.getPixelOrigin().subtract(this._getMapPanePos());
        },
        _getNewTopLeftPoint: function(center, zoom) {
            var viewHalf = this.getSize()._divideBy(2);
            // TODO round on display, not calculation to increase precision?
            return this.project(center, zoom)._subtract(viewHalf)._round();
        },
        _latLngToNewLayerPoint: function(latlng, newZoom, newCenter) {
            var topLeft = this._getNewTopLeftPoint(newCenter, newZoom).add(this._getMapPanePos());
            return this.project(latlng, newZoom)._subtract(topLeft);
        },
        // layer point of the current center
        _getCenterLayerPoint: function() {
            return this.containerPointToLayerPoint(this.getSize()._divideBy(2));
        },
        // offset of the specified place to the current center in pixels
        _getCenterOffset: function(latlng) {
            return this.latLngToLayerPoint(latlng).subtract(this._getCenterLayerPoint());
        },
        // adjust center for view to get inside bounds
        _limitCenter: function(center, zoom, bounds) {
            if (!bounds) {
                return center;
            }
            var centerPoint = this.project(center, zoom), viewHalf = this.getSize().divideBy(2), viewBounds = new L.Bounds(centerPoint.subtract(viewHalf), centerPoint.add(viewHalf)), offset = this._getBoundsOffset(viewBounds, bounds, zoom);
            return this.unproject(centerPoint.add(offset), zoom);
        },
        // adjust offset for view to get inside bounds
        _limitOffset: function(offset, bounds) {
            if (!bounds) {
                return offset;
            }
            var viewBounds = this.getPixelBounds(), newBounds = new L.Bounds(viewBounds.min.add(offset), viewBounds.max.add(offset));
            return offset.add(this._getBoundsOffset(newBounds, bounds));
        },
        // returns offset needed for pxBounds to get inside maxBounds at a specified zoom
        _getBoundsOffset: function(pxBounds, maxBounds, zoom) {
            var nwOffset = this.project(maxBounds.getNorthWest(), zoom).subtract(pxBounds.min), seOffset = this.project(maxBounds.getSouthEast(), zoom).subtract(pxBounds.max), dx = this._rebound(nwOffset.x, -seOffset.x), dy = this._rebound(nwOffset.y, -seOffset.y);
            return new L.Point(dx, dy);
        },
        _rebound: function(left, right) {
            return left + right > 0 ? Math.round(left - right) / 2 : Math.max(0, Math.ceil(left)) - Math.max(0, Math.floor(right));
        },
        _limitZoom: function(zoom) {
            var min = this.getMinZoom(), max = this.getMaxZoom();
            return Math.max(min, Math.min(max, zoom));
        }
    });
    L.map = function(id, options) {
        return new L.Map(id, options);
    };
    /*
 * Mercator projection that takes into account that the Earth is not a perfect sphere.
 * Less popular than spherical mercator; used by projections like EPSG:3395.
 */
    L.Projection.Mercator = {
        MAX_LATITUDE: 85.0840591556,
        R_MINOR: 6356752.314245179,
        R_MAJOR: 6378137,
        project: function(latlng) {
            // (LatLng) -> Point
            var d = L.LatLng.DEG_TO_RAD, max = this.MAX_LATITUDE, lat = Math.max(Math.min(max, latlng.lat), -max), r = this.R_MAJOR, r2 = this.R_MINOR, x = latlng.lng * d * r, y = lat * d, tmp = r2 / r, eccent = Math.sqrt(1 - tmp * tmp), con = eccent * Math.sin(y);
            con = Math.pow((1 - con) / (1 + con), eccent * .5);
            var ts = Math.tan(.5 * (Math.PI * .5 - y)) / con;
            y = -r * Math.log(ts);
            return new L.Point(x, y);
        },
        unproject: function(point) {
            // (Point, Boolean) -> LatLng
            var d = L.LatLng.RAD_TO_DEG, r = this.R_MAJOR, r2 = this.R_MINOR, lng = point.x * d / r, tmp = r2 / r, eccent = Math.sqrt(1 - tmp * tmp), ts = Math.exp(-point.y / r), phi = Math.PI / 2 - 2 * Math.atan(ts), numIter = 15, tol = 1e-7, i = numIter, dphi = .1, con;
            while (Math.abs(dphi) > tol && --i > 0) {
                con = eccent * Math.sin(phi);
                dphi = Math.PI / 2 - 2 * Math.atan(ts * Math.pow((1 - con) / (1 + con), .5 * eccent)) - phi;
                phi += dphi;
            }
            return new L.LatLng(phi * d, lng);
        }
    };
    L.CRS.EPSG3395 = L.extend({}, L.CRS, {
        code: "EPSG:3395",
        projection: L.Projection.Mercator,
        transformation: function() {
            var m = L.Projection.Mercator, r = m.R_MAJOR, scale = .5 / (Math.PI * r);
            return new L.Transformation(scale, .5, -scale, .5);
        }()
    });
    /*
 * L.TileLayer is used for standard xyz-numbered tile layers.
 */
    L.TileLayer = L.Class.extend({
        includes: L.Mixin.Events,
        options: {
            minZoom: 0,
            maxZoom: 18,
            tileSize: 256,
            subdomains: "abc",
            errorTileUrl: "",
            attribution: "",
            zoomOffset: 0,
            opacity: 1,
            /*
		maxNativeZoom: null,
		zIndex: null,
		tms: false,
		continuousWorld: false,
		noWrap: false,
		zoomReverse: false,
		detectRetina: false,
		reuseTiles: false,
		bounds: false,
		*/
            unloadInvisibleTiles: L.Browser.mobile,
            updateWhenIdle: L.Browser.mobile
        },
        initialize: function(url, options) {
            options = L.setOptions(this, options);
            // detecting retina displays, adjusting tileSize and zoom levels
            if (options.detectRetina && L.Browser.retina && options.maxZoom > 0) {
                options.tileSize = Math.floor(options.tileSize / 2);
                options.zoomOffset++;
                if (options.minZoom > 0) {
                    options.minZoom--;
                }
                this.options.maxZoom--;
            }
            if (options.bounds) {
                options.bounds = L.latLngBounds(options.bounds);
            }
            this._url = url;
            var subdomains = this.options.subdomains;
            if (typeof subdomains === "string") {
                this.options.subdomains = subdomains.split("");
            }
        },
        onAdd: function(map) {
            this._map = map;
            this._animated = map._zoomAnimated;
            // create a container div for tiles
            this._initContainer();
            // set up events
            map.on({
                viewreset: this._reset,
                moveend: this._update
            }, this);
            if (this._animated) {
                map.on({
                    zoomanim: this._animateZoom,
                    zoomend: this._endZoomAnim
                }, this);
            }
            if (!this.options.updateWhenIdle) {
                this._limitedUpdate = L.Util.limitExecByInterval(this._update, 150, this);
                map.on("move", this._limitedUpdate, this);
            }
            this._reset();
            this._update();
        },
        addTo: function(map) {
            map.addLayer(this);
            return this;
        },
        onRemove: function(map) {
            this._container.parentNode.removeChild(this._container);
            map.off({
                viewreset: this._reset,
                moveend: this._update
            }, this);
            if (this._animated) {
                map.off({
                    zoomanim: this._animateZoom,
                    zoomend: this._endZoomAnim
                }, this);
            }
            if (!this.options.updateWhenIdle) {
                map.off("move", this._limitedUpdate, this);
            }
            this._container = null;
            this._map = null;
        },
        bringToFront: function() {
            var pane = this._map._panes.tilePane;
            if (this._container) {
                pane.appendChild(this._container);
                this._setAutoZIndex(pane, Math.max);
            }
            return this;
        },
        bringToBack: function() {
            var pane = this._map._panes.tilePane;
            if (this._container) {
                pane.insertBefore(this._container, pane.firstChild);
                this._setAutoZIndex(pane, Math.min);
            }
            return this;
        },
        getAttribution: function() {
            return this.options.attribution;
        },
        getContainer: function() {
            return this._container;
        },
        setOpacity: function(opacity) {
            this.options.opacity = opacity;
            if (this._map) {
                this._updateOpacity();
            }
            return this;
        },
        setZIndex: function(zIndex) {
            this.options.zIndex = zIndex;
            this._updateZIndex();
            return this;
        },
        setUrl: function(url, noRedraw) {
            this._url = url;
            if (!noRedraw) {
                this.redraw();
            }
            return this;
        },
        redraw: function() {
            if (this._map) {
                this._reset({
                    hard: true
                });
                this._update();
            }
            return this;
        },
        _updateZIndex: function() {
            if (this._container && this.options.zIndex !== undefined) {
                this._container.style.zIndex = this.options.zIndex;
            }
        },
        _setAutoZIndex: function(pane, compare) {
            var layers = pane.children, edgeZIndex = -compare(Infinity, -Infinity), // -Infinity for max, Infinity for min
            zIndex, i, len;
            for (i = 0, len = layers.length; i < len; i++) {
                if (layers[i] !== this._container) {
                    zIndex = parseInt(layers[i].style.zIndex, 10);
                    if (!isNaN(zIndex)) {
                        edgeZIndex = compare(edgeZIndex, zIndex);
                    }
                }
            }
            this.options.zIndex = this._container.style.zIndex = (isFinite(edgeZIndex) ? edgeZIndex : 0) + compare(1, -1);
        },
        _updateOpacity: function() {
            var i, tiles = this._tiles;
            if (L.Browser.ielt9) {
                for (i in tiles) {
                    L.DomUtil.setOpacity(tiles[i], this.options.opacity);
                }
            } else {
                L.DomUtil.setOpacity(this._container, this.options.opacity);
            }
        },
        _initContainer: function() {
            var tilePane = this._map._panes.tilePane;
            if (!this._container) {
                this._container = L.DomUtil.create("div", "leaflet-layer");
                this._updateZIndex();
                if (this._animated) {
                    var className = "leaflet-tile-container";
                    this._bgBuffer = L.DomUtil.create("div", className, this._container);
                    this._tileContainer = L.DomUtil.create("div", className, this._container);
                } else {
                    this._tileContainer = this._container;
                }
                tilePane.appendChild(this._container);
                if (this.options.opacity < 1) {
                    this._updateOpacity();
                }
            }
        },
        _reset: function(e) {
            for (var key in this._tiles) {
                this.fire("tileunload", {
                    tile: this._tiles[key]
                });
            }
            this._tiles = {};
            this._tilesToLoad = 0;
            if (this.options.reuseTiles) {
                this._unusedTiles = [];
            }
            this._tileContainer.innerHTML = "";
            if (this._animated && e && e.hard) {
                this._clearBgBuffer();
            }
            this._initContainer();
        },
        _getTileSize: function() {
            var map = this._map, zoom = map.getZoom() + this.options.zoomOffset, zoomN = this.options.maxNativeZoom, tileSize = this.options.tileSize;
            if (zoomN && zoom > zoomN) {
                tileSize = Math.round(map.getZoomScale(zoom) / map.getZoomScale(zoomN) * tileSize);
            }
            return tileSize;
        },
        _update: function() {
            if (!this._map) {
                return;
            }
            var map = this._map, bounds = map.getPixelBounds(), zoom = map.getZoom(), tileSize = this._getTileSize();
            if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
                return;
            }
            var tileBounds = L.bounds(bounds.min.divideBy(tileSize)._floor(), bounds.max.divideBy(tileSize)._floor());
            this._addTilesFromCenterOut(tileBounds);
            if (this.options.unloadInvisibleTiles || this.options.reuseTiles) {
                this._removeOtherTiles(tileBounds);
            }
        },
        _addTilesFromCenterOut: function(bounds) {
            var queue = [], center = bounds.getCenter();
            var j, i, point;
            for (j = bounds.min.y; j <= bounds.max.y; j++) {
                for (i = bounds.min.x; i <= bounds.max.x; i++) {
                    point = new L.Point(i, j);
                    if (this._tileShouldBeLoaded(point)) {
                        queue.push(point);
                    }
                }
            }
            var tilesToLoad = queue.length;
            if (tilesToLoad === 0) {
                return;
            }
            // load tiles in order of their distance to center
            queue.sort(function(a, b) {
                return a.distanceTo(center) - b.distanceTo(center);
            });
            var fragment = document.createDocumentFragment();
            // if its the first batch of tiles to load
            if (!this._tilesToLoad) {
                this.fire("loading");
            }
            this._tilesToLoad += tilesToLoad;
            for (i = 0; i < tilesToLoad; i++) {
                this._addTile(queue[i], fragment);
            }
            this._tileContainer.appendChild(fragment);
        },
        _tileShouldBeLoaded: function(tilePoint) {
            if (tilePoint.x + ":" + tilePoint.y in this._tiles) {
                return false;
            }
            var options = this.options;
            if (!options.continuousWorld) {
                var limit = this._getWrapTileNum();
                // don't load if exceeds world bounds
                if (options.noWrap && (tilePoint.x < 0 || tilePoint.x >= limit.x) || tilePoint.y < 0 || tilePoint.y >= limit.y) {
                    return false;
                }
            }
            if (options.bounds) {
                var tileSize = options.tileSize, nwPoint = tilePoint.multiplyBy(tileSize), sePoint = nwPoint.add([ tileSize, tileSize ]), nw = this._map.unproject(nwPoint), se = this._map.unproject(sePoint);
                // TODO temporary hack, will be removed after refactoring projections
                // https://github.com/Leaflet/Leaflet/issues/1618
                if (!options.continuousWorld && !options.noWrap) {
                    nw = nw.wrap();
                    se = se.wrap();
                }
                if (!options.bounds.intersects([ nw, se ])) {
                    return false;
                }
            }
            return true;
        },
        _removeOtherTiles: function(bounds) {
            var kArr, x, y, key;
            for (key in this._tiles) {
                kArr = key.split(":");
                x = parseInt(kArr[0], 10);
                y = parseInt(kArr[1], 10);
                // remove tile if it's out of bounds
                if (x < bounds.min.x || x > bounds.max.x || y < bounds.min.y || y > bounds.max.y) {
                    this._removeTile(key);
                }
            }
        },
        _removeTile: function(key) {
            var tile = this._tiles[key];
            this.fire("tileunload", {
                tile: tile,
                url: tile.src
            });
            if (this.options.reuseTiles) {
                L.DomUtil.removeClass(tile, "leaflet-tile-loaded");
                this._unusedTiles.push(tile);
            } else if (tile.parentNode === this._tileContainer) {
                this._tileContainer.removeChild(tile);
            }
            // for https://github.com/CloudMade/Leaflet/issues/137
            if (!L.Browser.android) {
                tile.onload = null;
                tile.src = L.Util.emptyImageUrl;
            }
            delete this._tiles[key];
        },
        _addTile: function(tilePoint, container) {
            var tilePos = this._getTilePos(tilePoint);
            // get unused tile - or create a new tile
            var tile = this._getTile();
            /*
		Chrome 20 layouts much faster with top/left (verify with timeline, frames)
		Android 4 browser has display issues with top/left and requires transform instead
		(other browsers don't currently care) - see debug/hacks/jitter.html for an example
		*/
            L.DomUtil.setPosition(tile, tilePos, L.Browser.chrome);
            this._tiles[tilePoint.x + ":" + tilePoint.y] = tile;
            this._loadTile(tile, tilePoint);
            if (tile.parentNode !== this._tileContainer) {
                container.appendChild(tile);
            }
        },
        _getZoomForUrl: function() {
            var options = this.options, zoom = this._map.getZoom();
            if (options.zoomReverse) {
                zoom = options.maxZoom - zoom;
            }
            zoom += options.zoomOffset;
            return options.maxNativeZoom ? Math.min(zoom, options.maxNativeZoom) : zoom;
        },
        _getTilePos: function(tilePoint) {
            var origin = this._map.getPixelOrigin(), tileSize = this._getTileSize();
            return tilePoint.multiplyBy(tileSize).subtract(origin);
        },
        // image-specific code (override to implement e.g. Canvas or SVG tile layer)
        getTileUrl: function(tilePoint) {
            return L.Util.template(this._url, L.extend({
                s: this._getSubdomain(tilePoint),
                z: tilePoint.z,
                x: tilePoint.x,
                y: tilePoint.y
            }, this.options));
        },
        _getWrapTileNum: function() {
            var crs = this._map.options.crs, size = crs.getSize(this._map.getZoom());
            return size.divideBy(this._getTileSize())._floor();
        },
        _adjustTilePoint: function(tilePoint) {
            var limit = this._getWrapTileNum();
            // wrap tile coordinates
            if (!this.options.continuousWorld && !this.options.noWrap) {
                tilePoint.x = (tilePoint.x % limit.x + limit.x) % limit.x;
            }
            if (this.options.tms) {
                tilePoint.y = limit.y - tilePoint.y - 1;
            }
            tilePoint.z = this._getZoomForUrl();
        },
        _getSubdomain: function(tilePoint) {
            var index = Math.abs(tilePoint.x + tilePoint.y) % this.options.subdomains.length;
            return this.options.subdomains[index];
        },
        _getTile: function() {
            if (this.options.reuseTiles && this._unusedTiles.length > 0) {
                var tile = this._unusedTiles.pop();
                this._resetTile(tile);
                return tile;
            }
            return this._createTile();
        },
        // Override if data stored on a tile needs to be cleaned up before reuse
        _resetTile: function() {},
        _createTile: function() {
            var tile = L.DomUtil.create("img", "leaflet-tile");
            tile.style.width = tile.style.height = this._getTileSize() + "px";
            tile.galleryimg = "no";
            tile.onselectstart = tile.onmousemove = L.Util.falseFn;
            if (L.Browser.ielt9 && this.options.opacity !== undefined) {
                L.DomUtil.setOpacity(tile, this.options.opacity);
            }
            // without this hack, tiles disappear after zoom on Chrome for Android
            // https://github.com/Leaflet/Leaflet/issues/2078
            if (L.Browser.mobileWebkit3d) {
                tile.style.WebkitBackfaceVisibility = "hidden";
            }
            return tile;
        },
        _loadTile: function(tile, tilePoint) {
            tile._layer = this;
            tile.onload = this._tileOnLoad;
            tile.onerror = this._tileOnError;
            this._adjustTilePoint(tilePoint);
            tile.src = this.getTileUrl(tilePoint);
            this.fire("tileloadstart", {
                tile: tile,
                url: tile.src
            });
        },
        _tileLoaded: function() {
            this._tilesToLoad--;
            if (this._animated) {
                L.DomUtil.addClass(this._tileContainer, "leaflet-zoom-animated");
            }
            if (!this._tilesToLoad) {
                this.fire("load");
                if (this._animated) {
                    // clear scaled tiles after all new tiles are loaded (for performance)
                    clearTimeout(this._clearBgBufferTimer);
                    this._clearBgBufferTimer = setTimeout(L.bind(this._clearBgBuffer, this), 500);
                }
            }
        },
        _tileOnLoad: function() {
            var layer = this._layer;
            //Only if we are loading an actual image
            if (this.src !== L.Util.emptyImageUrl) {
                L.DomUtil.addClass(this, "leaflet-tile-loaded");
                layer.fire("tileload", {
                    tile: this,
                    url: this.src
                });
            }
            layer._tileLoaded();
        },
        _tileOnError: function() {
            var layer = this._layer;
            layer.fire("tileerror", {
                tile: this,
                url: this.src
            });
            var newUrl = layer.options.errorTileUrl;
            if (newUrl) {
                this.src = newUrl;
            }
            layer._tileLoaded();
        }
    });
    L.tileLayer = function(url, options) {
        return new L.TileLayer(url, options);
    };
    /*
 * L.TileLayer.WMS is used for putting WMS tile layers on the map.
 */
    L.TileLayer.WMS = L.TileLayer.extend({
        defaultWmsParams: {
            service: "WMS",
            request: "GetMap",
            version: "1.1.1",
            layers: "",
            styles: "",
            format: "image/jpeg",
            transparent: false
        },
        initialize: function(url, options) {
            // (String, Object)
            this._url = url;
            var wmsParams = L.extend({}, this.defaultWmsParams), tileSize = options.tileSize || this.options.tileSize;
            if (options.detectRetina && L.Browser.retina) {
                wmsParams.width = wmsParams.height = tileSize * 2;
            } else {
                wmsParams.width = wmsParams.height = tileSize;
            }
            for (var i in options) {
                // all keys that are not TileLayer options go to WMS params
                if (!this.options.hasOwnProperty(i) && i !== "crs") {
                    wmsParams[i] = options[i];
                }
            }
            this.wmsParams = wmsParams;
            L.setOptions(this, options);
        },
        onAdd: function(map) {
            this._crs = this.options.crs || map.options.crs;
            this._wmsVersion = parseFloat(this.wmsParams.version);
            var projectionKey = this._wmsVersion >= 1.3 ? "crs" : "srs";
            this.wmsParams[projectionKey] = this._crs.code;
            L.TileLayer.prototype.onAdd.call(this, map);
        },
        getTileUrl: function(tilePoint) {
            // (Point, Number) -> String
            var map = this._map, tileSize = this.options.tileSize, nwPoint = tilePoint.multiplyBy(tileSize), sePoint = nwPoint.add([ tileSize, tileSize ]), nw = this._crs.project(map.unproject(nwPoint, tilePoint.z)), se = this._crs.project(map.unproject(sePoint, tilePoint.z)), bbox = this._wmsVersion >= 1.3 && this._crs === L.CRS.EPSG4326 ? [ se.y, nw.x, nw.y, se.x ].join(",") : [ nw.x, se.y, se.x, nw.y ].join(","), url = L.Util.template(this._url, {
                s: this._getSubdomain(tilePoint)
            });
            return url + L.Util.getParamString(this.wmsParams, url, true) + "&BBOX=" + bbox;
        },
        setParams: function(params, noRedraw) {
            L.extend(this.wmsParams, params);
            if (!noRedraw) {
                this.redraw();
            }
            return this;
        }
    });
    L.tileLayer.wms = function(url, options) {
        return new L.TileLayer.WMS(url, options);
    };
    /*
 * L.TileLayer.Canvas is a class that you can use as a base for creating
 * dynamically drawn Canvas-based tile layers.
 */
    L.TileLayer.Canvas = L.TileLayer.extend({
        options: {
            async: false
        },
        initialize: function(options) {
            L.setOptions(this, options);
        },
        redraw: function() {
            if (this._map) {
                this._reset({
                    hard: true
                });
                this._update();
            }
            for (var i in this._tiles) {
                this._redrawTile(this._tiles[i]);
            }
            return this;
        },
        _redrawTile: function(tile) {
            this.drawTile(tile, tile._tilePoint, this._map._zoom);
        },
        _createTile: function() {
            var tile = L.DomUtil.create("canvas", "leaflet-tile");
            tile.width = tile.height = this.options.tileSize;
            tile.onselectstart = tile.onmousemove = L.Util.falseFn;
            return tile;
        },
        _loadTile: function(tile, tilePoint) {
            tile._layer = this;
            tile._tilePoint = tilePoint;
            this._redrawTile(tile);
            if (!this.options.async) {
                this.tileDrawn(tile);
            }
        },
        drawTile: function() {},
        tileDrawn: function(tile) {
            this._tileOnLoad.call(tile);
        }
    });
    L.tileLayer.canvas = function(options) {
        return new L.TileLayer.Canvas(options);
    };
    /*
 * L.ImageOverlay is used to overlay images over the map (to specific geographical bounds).
 */
    L.ImageOverlay = L.Class.extend({
        includes: L.Mixin.Events,
        options: {
            opacity: 1
        },
        initialize: function(url, bounds, options) {
            // (String, LatLngBounds, Object)
            this._url = url;
            this._bounds = L.latLngBounds(bounds);
            L.setOptions(this, options);
        },
        onAdd: function(map) {
            this._map = map;
            if (!this._image) {
                this._initImage();
            }
            map._panes.overlayPane.appendChild(this._image);
            map.on("viewreset", this._reset, this);
            if (map.options.zoomAnimation && L.Browser.any3d) {
                map.on("zoomanim", this._animateZoom, this);
            }
            this._reset();
        },
        onRemove: function(map) {
            map.getPanes().overlayPane.removeChild(this._image);
            map.off("viewreset", this._reset, this);
            if (map.options.zoomAnimation) {
                map.off("zoomanim", this._animateZoom, this);
            }
        },
        addTo: function(map) {
            map.addLayer(this);
            return this;
        },
        setOpacity: function(opacity) {
            this.options.opacity = opacity;
            this._updateOpacity();
            return this;
        },
        // TODO remove bringToFront/bringToBack duplication from TileLayer/Path
        bringToFront: function() {
            if (this._image) {
                this._map._panes.overlayPane.appendChild(this._image);
            }
            return this;
        },
        bringToBack: function() {
            var pane = this._map._panes.overlayPane;
            if (this._image) {
                pane.insertBefore(this._image, pane.firstChild);
            }
            return this;
        },
        setUrl: function(url) {
            this._url = url;
            this._image.src = this._url;
        },
        getAttribution: function() {
            return this.options.attribution;
        },
        _initImage: function() {
            this._image = L.DomUtil.create("img", "leaflet-image-layer");
            if (this._map.options.zoomAnimation && L.Browser.any3d) {
                L.DomUtil.addClass(this._image, "leaflet-zoom-animated");
            } else {
                L.DomUtil.addClass(this._image, "leaflet-zoom-hide");
            }
            this._updateOpacity();
            //TODO createImage util method to remove duplication
            L.extend(this._image, {
                galleryimg: "no",
                onselectstart: L.Util.falseFn,
                onmousemove: L.Util.falseFn,
                onload: L.bind(this._onImageLoad, this),
                src: this._url
            });
        },
        _animateZoom: function(e) {
            var map = this._map, image = this._image, scale = map.getZoomScale(e.zoom), nw = this._bounds.getNorthWest(), se = this._bounds.getSouthEast(), topLeft = map._latLngToNewLayerPoint(nw, e.zoom, e.center), size = map._latLngToNewLayerPoint(se, e.zoom, e.center)._subtract(topLeft), origin = topLeft._add(size._multiplyBy(1 / 2 * (1 - 1 / scale)));
            image.style[L.DomUtil.TRANSFORM] = L.DomUtil.getTranslateString(origin) + " scale(" + scale + ") ";
        },
        _reset: function() {
            var image = this._image, topLeft = this._map.latLngToLayerPoint(this._bounds.getNorthWest()), size = this._map.latLngToLayerPoint(this._bounds.getSouthEast())._subtract(topLeft);
            L.DomUtil.setPosition(image, topLeft);
            image.style.width = size.x + "px";
            image.style.height = size.y + "px";
        },
        _onImageLoad: function() {
            this.fire("load");
        },
        _updateOpacity: function() {
            L.DomUtil.setOpacity(this._image, this.options.opacity);
        }
    });
    L.imageOverlay = function(url, bounds, options) {
        return new L.ImageOverlay(url, bounds, options);
    };
    /*
 * L.Icon is an image-based icon class that you can use with L.Marker for custom markers.
 */
    L.Icon = L.Class.extend({
        options: {
            /*
		iconUrl: (String) (required)
		iconRetinaUrl: (String) (optional, used for retina devices if detected)
		iconSize: (Point) (can be set through CSS)
		iconAnchor: (Point) (centered by default, can be set in CSS with negative margins)
		popupAnchor: (Point) (if not specified, popup opens in the anchor point)
		shadowUrl: (String) (no shadow by default)
		shadowRetinaUrl: (String) (optional, used for retina devices if detected)
		shadowSize: (Point)
		shadowAnchor: (Point)
		*/
            className: ""
        },
        initialize: function(options) {
            L.setOptions(this, options);
        },
        createIcon: function(oldIcon) {
            return this._createIcon("icon", oldIcon);
        },
        createShadow: function(oldIcon) {
            return this._createIcon("shadow", oldIcon);
        },
        _createIcon: function(name, oldIcon) {
            var src = this._getIconUrl(name);
            if (!src) {
                if (name === "icon") {
                    throw new Error("iconUrl not set in Icon options (see the docs).");
                }
                return null;
            }
            var img;
            if (!oldIcon || oldIcon.tagName !== "IMG") {
                img = this._createImg(src);
            } else {
                img = this._createImg(src, oldIcon);
            }
            this._setIconStyles(img, name);
            return img;
        },
        _setIconStyles: function(img, name) {
            var options = this.options, size = L.point(options[name + "Size"]), anchor;
            if (name === "shadow") {
                anchor = L.point(options.shadowAnchor || options.iconAnchor);
            } else {
                anchor = L.point(options.iconAnchor);
            }
            if (!anchor && size) {
                anchor = size.divideBy(2, true);
            }
            img.className = "leaflet-marker-" + name + " " + options.className;
            if (anchor) {
                img.style.marginLeft = -anchor.x + "px";
                img.style.marginTop = -anchor.y + "px";
            }
            if (size) {
                img.style.width = size.x + "px";
                img.style.height = size.y + "px";
            }
        },
        _createImg: function(src, el) {
            el = el || document.createElement("img");
            el.src = src;
            return el;
        },
        _getIconUrl: function(name) {
            if (L.Browser.retina && this.options[name + "RetinaUrl"]) {
                return this.options[name + "RetinaUrl"];
            }
            return this.options[name + "Url"];
        }
    });
    L.icon = function(options) {
        return new L.Icon(options);
    };
    /*
 * L.Icon.Default is the blue marker icon used by default in Leaflet.
 */
    L.Icon.Default = L.Icon.extend({
        options: {
            iconSize: [ 25, 41 ],
            iconAnchor: [ 12, 41 ],
            popupAnchor: [ 1, -34 ],
            shadowSize: [ 41, 41 ]
        },
        _getIconUrl: function(name) {
            var key = name + "Url";
            if (this.options[key]) {
                return this.options[key];
            }
            if (L.Browser.retina && name === "icon") {
                name += "-2x";
            }
            var path = L.Icon.Default.imagePath;
            if (!path) {
                throw new Error("Couldn't autodetect L.Icon.Default.imagePath, set it manually.");
            }
            return path + "/marker-" + name + ".png";
        }
    });
    L.Icon.Default.imagePath = function() {
        var scripts = document.getElementsByTagName("script"), leafletRe = /[\/^]leaflet[\-\._]?([\w\-\._]*)\.js\??/;
        var i, len, src, matches, path;
        for (i = 0, len = scripts.length; i < len; i++) {
            src = scripts[i].src;
            matches = src.match(leafletRe);
            if (matches) {
                path = src.split(leafletRe)[0];
                return (path ? path + "/" : "") + "images";
            }
        }
    }();
    /*
 * L.Marker is used to display clickable/draggable icons on the map.
 */
    L.Marker = L.Class.extend({
        includes: L.Mixin.Events,
        options: {
            icon: new L.Icon.Default(),
            title: "",
            alt: "",
            clickable: true,
            draggable: false,
            keyboard: true,
            zIndexOffset: 0,
            opacity: 1,
            riseOnHover: false,
            riseOffset: 250
        },
        initialize: function(latlng, options) {
            L.setOptions(this, options);
            this._latlng = L.latLng(latlng);
        },
        onAdd: function(map) {
            this._map = map;
            map.on("viewreset", this.update, this);
            this._initIcon();
            this.update();
            this.fire("add");
            if (map.options.zoomAnimation && map.options.markerZoomAnimation) {
                map.on("zoomanim", this._animateZoom, this);
            }
        },
        addTo: function(map) {
            map.addLayer(this);
            return this;
        },
        onRemove: function(map) {
            if (this.dragging) {
                this.dragging.disable();
            }
            this._removeIcon();
            this._removeShadow();
            this.fire("remove");
            map.off({
                viewreset: this.update,
                zoomanim: this._animateZoom
            }, this);
            this._map = null;
        },
        getLatLng: function() {
            return this._latlng;
        },
        setLatLng: function(latlng) {
            this._latlng = L.latLng(latlng);
            this.update();
            return this.fire("move", {
                latlng: this._latlng
            });
        },
        setZIndexOffset: function(offset) {
            this.options.zIndexOffset = offset;
            this.update();
            return this;
        },
        setIcon: function(icon) {
            this.options.icon = icon;
            if (this._map) {
                this._initIcon();
                this.update();
            }
            if (this._popup) {
                this.bindPopup(this._popup);
            }
            return this;
        },
        update: function() {
            if (this._icon) {
                var pos = this._map.latLngToLayerPoint(this._latlng).round();
                this._setPos(pos);
            }
            return this;
        },
        _initIcon: function() {
            var options = this.options, map = this._map, animation = map.options.zoomAnimation && map.options.markerZoomAnimation, classToAdd = animation ? "leaflet-zoom-animated" : "leaflet-zoom-hide";
            var icon = options.icon.createIcon(this._icon), addIcon = false;
            // if we're not reusing the icon, remove the old one and init new one
            if (icon !== this._icon) {
                if (this._icon) {
                    this._removeIcon();
                }
                addIcon = true;
                if (options.title) {
                    icon.title = options.title;
                }
                if (options.alt) {
                    icon.alt = options.alt;
                }
            }
            L.DomUtil.addClass(icon, classToAdd);
            if (options.keyboard) {
                icon.tabIndex = "0";
            }
            this._icon = icon;
            this._initInteraction();
            if (options.riseOnHover) {
                L.DomEvent.on(icon, "mouseover", this._bringToFront, this).on(icon, "mouseout", this._resetZIndex, this);
            }
            var newShadow = options.icon.createShadow(this._shadow), addShadow = false;
            if (newShadow !== this._shadow) {
                this._removeShadow();
                addShadow = true;
            }
            if (newShadow) {
                L.DomUtil.addClass(newShadow, classToAdd);
            }
            this._shadow = newShadow;
            if (options.opacity < 1) {
                this._updateOpacity();
            }
            var panes = this._map._panes;
            if (addIcon) {
                panes.markerPane.appendChild(this._icon);
            }
            if (newShadow && addShadow) {
                panes.shadowPane.appendChild(this._shadow);
            }
        },
        _removeIcon: function() {
            if (this.options.riseOnHover) {
                L.DomEvent.off(this._icon, "mouseover", this._bringToFront).off(this._icon, "mouseout", this._resetZIndex);
            }
            this._map._panes.markerPane.removeChild(this._icon);
            this._icon = null;
        },
        _removeShadow: function() {
            if (this._shadow) {
                this._map._panes.shadowPane.removeChild(this._shadow);
            }
            this._shadow = null;
        },
        _setPos: function(pos) {
            L.DomUtil.setPosition(this._icon, pos);
            if (this._shadow) {
                L.DomUtil.setPosition(this._shadow, pos);
            }
            this._zIndex = pos.y + this.options.zIndexOffset;
            this._resetZIndex();
        },
        _updateZIndex: function(offset) {
            this._icon.style.zIndex = this._zIndex + offset;
        },
        _animateZoom: function(opt) {
            var pos = this._map._latLngToNewLayerPoint(this._latlng, opt.zoom, opt.center).round();
            this._setPos(pos);
        },
        _initInteraction: function() {
            if (!this.options.clickable) {
                return;
            }
            // TODO refactor into something shared with Map/Path/etc. to DRY it up
            var icon = this._icon, events = [ "dblclick", "mousedown", "mouseover", "mouseout", "contextmenu" ];
            L.DomUtil.addClass(icon, "leaflet-clickable");
            L.DomEvent.on(icon, "click", this._onMouseClick, this);
            L.DomEvent.on(icon, "keypress", this._onKeyPress, this);
            for (var i = 0; i < events.length; i++) {
                L.DomEvent.on(icon, events[i], this._fireMouseEvent, this);
            }
            if (L.Handler.MarkerDrag) {
                this.dragging = new L.Handler.MarkerDrag(this);
                if (this.options.draggable) {
                    this.dragging.enable();
                }
            }
        },
        _onMouseClick: function(e) {
            var wasDragged = this.dragging && this.dragging.moved();
            if (this.hasEventListeners(e.type) || wasDragged) {
                L.DomEvent.stopPropagation(e);
            }
            if (wasDragged) {
                return;
            }
            if ((!this.dragging || !this.dragging._enabled) && this._map.dragging && this._map.dragging.moved()) {
                return;
            }
            this.fire(e.type, {
                originalEvent: e,
                latlng: this._latlng
            });
        },
        _onKeyPress: function(e) {
            if (e.keyCode === 13) {
                this.fire("click", {
                    originalEvent: e,
                    latlng: this._latlng
                });
            }
        },
        _fireMouseEvent: function(e) {
            this.fire(e.type, {
                originalEvent: e,
                latlng: this._latlng
            });
            // TODO proper custom event propagation
            // this line will always be called if marker is in a FeatureGroup
            if (e.type === "contextmenu" && this.hasEventListeners(e.type)) {
                L.DomEvent.preventDefault(e);
            }
            if (e.type !== "mousedown") {
                L.DomEvent.stopPropagation(e);
            } else {
                L.DomEvent.preventDefault(e);
            }
        },
        setOpacity: function(opacity) {
            this.options.opacity = opacity;
            if (this._map) {
                this._updateOpacity();
            }
            return this;
        },
        _updateOpacity: function() {
            L.DomUtil.setOpacity(this._icon, this.options.opacity);
            if (this._shadow) {
                L.DomUtil.setOpacity(this._shadow, this.options.opacity);
            }
        },
        _bringToFront: function() {
            this._updateZIndex(this.options.riseOffset);
        },
        _resetZIndex: function() {
            this._updateZIndex(0);
        }
    });
    L.marker = function(latlng, options) {
        return new L.Marker(latlng, options);
    };
    /*
 * L.DivIcon is a lightweight HTML-based icon class (as opposed to the image-based L.Icon)
 * to use with L.Marker.
 */
    L.DivIcon = L.Icon.extend({
        options: {
            iconSize: [ 12, 12 ],
            // also can be set through CSS
            /*
		iconAnchor: (Point)
		popupAnchor: (Point)
		html: (String)
		bgPos: (Point)
		*/
            className: "leaflet-div-icon",
            html: false
        },
        createIcon: function(oldIcon) {
            var div = oldIcon && oldIcon.tagName === "DIV" ? oldIcon : document.createElement("div"), options = this.options;
            if (options.html !== false) {
                div.innerHTML = options.html;
            } else {
                div.innerHTML = "";
            }
            if (options.bgPos) {
                div.style.backgroundPosition = -options.bgPos.x + "px " + -options.bgPos.y + "px";
            }
            this._setIconStyles(div, "icon");
            return div;
        },
        createShadow: function() {
            return null;
        }
    });
    L.divIcon = function(options) {
        return new L.DivIcon(options);
    };
    /*
 * L.Popup is used for displaying popups on the map.
 */
    L.Map.mergeOptions({
        closePopupOnClick: true
    });
    L.Popup = L.Class.extend({
        includes: L.Mixin.Events,
        options: {
            minWidth: 50,
            maxWidth: 300,
            // maxHeight: null,
            autoPan: true,
            closeButton: true,
            offset: [ 0, 7 ],
            autoPanPadding: [ 5, 5 ],
            // autoPanPaddingTopLeft: null,
            // autoPanPaddingBottomRight: null,
            keepInView: false,
            className: "",
            zoomAnimation: true
        },
        initialize: function(options, source) {
            L.setOptions(this, options);
            this._source = source;
            this._animated = L.Browser.any3d && this.options.zoomAnimation;
            this._isOpen = false;
        },
        onAdd: function(map) {
            this._map = map;
            if (!this._container) {
                this._initLayout();
            }
            var animFade = map.options.fadeAnimation;
            if (animFade) {
                L.DomUtil.setOpacity(this._container, 0);
            }
            map._panes.popupPane.appendChild(this._container);
            map.on(this._getEvents(), this);
            this.update();
            if (animFade) {
                L.DomUtil.setOpacity(this._container, 1);
            }
            this.fire("open");
            map.fire("popupopen", {
                popup: this
            });
            if (this._source) {
                this._source.fire("popupopen", {
                    popup: this
                });
            }
        },
        addTo: function(map) {
            map.addLayer(this);
            return this;
        },
        openOn: function(map) {
            map.openPopup(this);
            return this;
        },
        onRemove: function(map) {
            map._panes.popupPane.removeChild(this._container);
            L.Util.falseFn(this._container.offsetWidth);
            // force reflow
            map.off(this._getEvents(), this);
            if (map.options.fadeAnimation) {
                L.DomUtil.setOpacity(this._container, 0);
            }
            this._map = null;
            this.fire("close");
            map.fire("popupclose", {
                popup: this
            });
            if (this._source) {
                this._source.fire("popupclose", {
                    popup: this
                });
            }
        },
        getLatLng: function() {
            return this._latlng;
        },
        setLatLng: function(latlng) {
            this._latlng = L.latLng(latlng);
            if (this._map) {
                this._updatePosition();
                this._adjustPan();
            }
            return this;
        },
        getContent: function() {
            return this._content;
        },
        setContent: function(content) {
            this._content = content;
            this.update();
            return this;
        },
        update: function() {
            if (!this._map) {
                return;
            }
            this._container.style.visibility = "hidden";
            this._updateContent();
            this._updateLayout();
            this._updatePosition();
            this._container.style.visibility = "";
            this._adjustPan();
        },
        _getEvents: function() {
            var events = {
                viewreset: this._updatePosition
            };
            if (this._animated) {
                events.zoomanim = this._zoomAnimation;
            }
            if ("closeOnClick" in this.options ? this.options.closeOnClick : this._map.options.closePopupOnClick) {
                events.preclick = this._close;
            }
            if (this.options.keepInView) {
                events.moveend = this._adjustPan;
            }
            return events;
        },
        _close: function() {
            if (this._map) {
                this._map.closePopup(this);
            }
        },
        _initLayout: function() {
            var prefix = "leaflet-popup", containerClass = prefix + " " + this.options.className + " leaflet-zoom-" + (this._animated ? "animated" : "hide"), container = this._container = L.DomUtil.create("div", containerClass), closeButton;
            if (this.options.closeButton) {
                closeButton = this._closeButton = L.DomUtil.create("a", prefix + "-close-button", container);
                closeButton.href = "#close";
                closeButton.innerHTML = "&#215;";
                L.DomEvent.disableClickPropagation(closeButton);
                L.DomEvent.on(closeButton, "click", this._onCloseButtonClick, this);
            }
            var wrapper = this._wrapper = L.DomUtil.create("div", prefix + "-content-wrapper", container);
            L.DomEvent.disableClickPropagation(wrapper);
            this._contentNode = L.DomUtil.create("div", prefix + "-content", wrapper);
            L.DomEvent.disableScrollPropagation(this._contentNode);
            L.DomEvent.on(wrapper, "contextmenu", L.DomEvent.stopPropagation);
            this._tipContainer = L.DomUtil.create("div", prefix + "-tip-container", container);
            this._tip = L.DomUtil.create("div", prefix + "-tip", this._tipContainer);
        },
        _updateContent: function() {
            if (!this._content) {
                return;
            }
            if (typeof this._content === "string") {
                this._contentNode.innerHTML = this._content;
            } else {
                while (this._contentNode.hasChildNodes()) {
                    this._contentNode.removeChild(this._contentNode.firstChild);
                }
                this._contentNode.appendChild(this._content);
            }
            this.fire("contentupdate");
        },
        _updateLayout: function() {
            var container = this._contentNode, style = container.style;
            style.width = "";
            style.whiteSpace = "nowrap";
            var width = container.offsetWidth;
            width = Math.min(width, this.options.maxWidth);
            width = Math.max(width, this.options.minWidth);
            style.width = width + 1 + "px";
            style.whiteSpace = "";
            style.height = "";
            var height = container.offsetHeight, maxHeight = this.options.maxHeight, scrolledClass = "leaflet-popup-scrolled";
            if (maxHeight && height > maxHeight) {
                style.height = maxHeight + "px";
                L.DomUtil.addClass(container, scrolledClass);
            } else {
                L.DomUtil.removeClass(container, scrolledClass);
            }
            this._containerWidth = this._container.offsetWidth;
        },
        _updatePosition: function() {
            if (!this._map) {
                return;
            }
            var pos = this._map.latLngToLayerPoint(this._latlng), animated = this._animated, offset = L.point(this.options.offset);
            if (animated) {
                L.DomUtil.setPosition(this._container, pos);
            }
            this._containerBottom = -offset.y - (animated ? 0 : pos.y);
            this._containerLeft = -Math.round(this._containerWidth / 2) + offset.x + (animated ? 0 : pos.x);
            // bottom position the popup in case the height of the popup changes (images loading etc)
            this._container.style.bottom = this._containerBottom + "px";
            this._container.style.left = this._containerLeft + "px";
        },
        _zoomAnimation: function(opt) {
            var pos = this._map._latLngToNewLayerPoint(this._latlng, opt.zoom, opt.center);
            L.DomUtil.setPosition(this._container, pos);
        },
        _adjustPan: function() {
            if (!this.options.autoPan) {
                return;
            }
            var map = this._map, containerHeight = this._container.offsetHeight, containerWidth = this._containerWidth, layerPos = new L.Point(this._containerLeft, -containerHeight - this._containerBottom);
            if (this._animated) {
                layerPos._add(L.DomUtil.getPosition(this._container));
            }
            var containerPos = map.layerPointToContainerPoint(layerPos), padding = L.point(this.options.autoPanPadding), paddingTL = L.point(this.options.autoPanPaddingTopLeft || padding), paddingBR = L.point(this.options.autoPanPaddingBottomRight || padding), size = map.getSize(), dx = 0, dy = 0;
            if (containerPos.x + containerWidth + paddingBR.x > size.x) {
                // right
                dx = containerPos.x + containerWidth - size.x + paddingBR.x;
            }
            if (containerPos.x - dx - paddingTL.x < 0) {
                // left
                dx = containerPos.x - paddingTL.x;
            }
            if (containerPos.y + containerHeight + paddingBR.y > size.y) {
                // bottom
                dy = containerPos.y + containerHeight - size.y + paddingBR.y;
            }
            if (containerPos.y - dy - paddingTL.y < 0) {
                // top
                dy = containerPos.y - paddingTL.y;
            }
            if (dx || dy) {
                map.fire("autopanstart").panBy([ dx, dy ]);
            }
        },
        _onCloseButtonClick: function(e) {
            this._close();
            L.DomEvent.stop(e);
        }
    });
    L.popup = function(options, source) {
        return new L.Popup(options, source);
    };
    L.Map.include({
        openPopup: function(popup, latlng, options) {
            // (Popup) or (String || HTMLElement, LatLng[, Object])
            this.closePopup();
            if (!(popup instanceof L.Popup)) {
                var content = popup;
                popup = new L.Popup(options).setLatLng(latlng).setContent(content);
            }
            popup._isOpen = true;
            this._popup = popup;
            return this.addLayer(popup);
        },
        closePopup: function(popup) {
            if (!popup || popup === this._popup) {
                popup = this._popup;
                this._popup = null;
            }
            if (popup) {
                this.removeLayer(popup);
                popup._isOpen = false;
            }
            return this;
        }
    });
    /*
 * Popup extension to L.Marker, adding popup-related methods.
 */
    L.Marker.include({
        openPopup: function() {
            if (this._popup && this._map && !this._map.hasLayer(this._popup)) {
                this._popup.setLatLng(this._latlng);
                this._map.openPopup(this._popup);
            }
            return this;
        },
        closePopup: function() {
            if (this._popup) {
                this._popup._close();
            }
            return this;
        },
        togglePopup: function() {
            if (this._popup) {
                if (this._popup._isOpen) {
                    this.closePopup();
                } else {
                    this.openPopup();
                }
            }
            return this;
        },
        bindPopup: function(content, options) {
            var anchor = L.point(this.options.icon.options.popupAnchor || [ 0, 0 ]);
            anchor = anchor.add(L.Popup.prototype.options.offset);
            if (options && options.offset) {
                anchor = anchor.add(options.offset);
            }
            options = L.extend({
                offset: anchor
            }, options);
            if (!this._popupHandlersAdded) {
                this.on("click", this.togglePopup, this).on("remove", this.closePopup, this).on("move", this._movePopup, this);
                this._popupHandlersAdded = true;
            }
            if (content instanceof L.Popup) {
                L.setOptions(content, options);
                this._popup = content;
            } else {
                this._popup = new L.Popup(options, this).setContent(content);
            }
            return this;
        },
        setPopupContent: function(content) {
            if (this._popup) {
                this._popup.setContent(content);
            }
            return this;
        },
        unbindPopup: function() {
            if (this._popup) {
                this._popup = null;
                this.off("click", this.togglePopup, this).off("remove", this.closePopup, this).off("move", this._movePopup, this);
                this._popupHandlersAdded = false;
            }
            return this;
        },
        getPopup: function() {
            return this._popup;
        },
        _movePopup: function(e) {
            this._popup.setLatLng(e.latlng);
        }
    });
    /*
 * L.LayerGroup is a class to combine several layers into one so that
 * you can manipulate the group (e.g. add/remove it) as one layer.
 */
    L.LayerGroup = L.Class.extend({
        initialize: function(layers) {
            this._layers = {};
            var i, len;
            if (layers) {
                for (i = 0, len = layers.length; i < len; i++) {
                    this.addLayer(layers[i]);
                }
            }
        },
        addLayer: function(layer) {
            var id = this.getLayerId(layer);
            this._layers[id] = layer;
            if (this._map) {
                this._map.addLayer(layer);
            }
            return this;
        },
        removeLayer: function(layer) {
            var id = layer in this._layers ? layer : this.getLayerId(layer);
            if (this._map && this._layers[id]) {
                this._map.removeLayer(this._layers[id]);
            }
            delete this._layers[id];
            return this;
        },
        hasLayer: function(layer) {
            if (!layer) {
                return false;
            }
            return layer in this._layers || this.getLayerId(layer) in this._layers;
        },
        clearLayers: function() {
            this.eachLayer(this.removeLayer, this);
            return this;
        },
        invoke: function(methodName) {
            var args = Array.prototype.slice.call(arguments, 1), i, layer;
            for (i in this._layers) {
                layer = this._layers[i];
                if (layer[methodName]) {
                    layer[methodName].apply(layer, args);
                }
            }
            return this;
        },
        onAdd: function(map) {
            this._map = map;
            this.eachLayer(map.addLayer, map);
        },
        onRemove: function(map) {
            this.eachLayer(map.removeLayer, map);
            this._map = null;
        },
        addTo: function(map) {
            map.addLayer(this);
            return this;
        },
        eachLayer: function(method, context) {
            for (var i in this._layers) {
                method.call(context, this._layers[i]);
            }
            return this;
        },
        getLayer: function(id) {
            return this._layers[id];
        },
        getLayers: function() {
            var layers = [];
            for (var i in this._layers) {
                layers.push(this._layers[i]);
            }
            return layers;
        },
        setZIndex: function(zIndex) {
            return this.invoke("setZIndex", zIndex);
        },
        getLayerId: function(layer) {
            return L.stamp(layer);
        }
    });
    L.layerGroup = function(layers) {
        return new L.LayerGroup(layers);
    };
    /*
 * L.FeatureGroup extends L.LayerGroup by introducing mouse events and additional methods
 * shared between a group of interactive layers (like vectors or markers).
 */
    L.FeatureGroup = L.LayerGroup.extend({
        includes: L.Mixin.Events,
        statics: {
            EVENTS: "click dblclick mouseover mouseout mousemove contextmenu popupopen popupclose"
        },
        addLayer: function(layer) {
            if (this.hasLayer(layer)) {
                return this;
            }
            if ("on" in layer) {
                layer.on(L.FeatureGroup.EVENTS, this._propagateEvent, this);
            }
            L.LayerGroup.prototype.addLayer.call(this, layer);
            if (this._popupContent && layer.bindPopup) {
                layer.bindPopup(this._popupContent, this._popupOptions);
            }
            return this.fire("layeradd", {
                layer: layer
            });
        },
        removeLayer: function(layer) {
            if (!this.hasLayer(layer)) {
                return this;
            }
            if (layer in this._layers) {
                layer = this._layers[layer];
            }
            layer.off(L.FeatureGroup.EVENTS, this._propagateEvent, this);
            L.LayerGroup.prototype.removeLayer.call(this, layer);
            if (this._popupContent) {
                this.invoke("unbindPopup");
            }
            return this.fire("layerremove", {
                layer: layer
            });
        },
        bindPopup: function(content, options) {
            this._popupContent = content;
            this._popupOptions = options;
            return this.invoke("bindPopup", content, options);
        },
        openPopup: function(latlng) {
            // open popup on the first layer
            for (var id in this._layers) {
                this._layers[id].openPopup(latlng);
                break;
            }
            return this;
        },
        setStyle: function(style) {
            return this.invoke("setStyle", style);
        },
        bringToFront: function() {
            return this.invoke("bringToFront");
        },
        bringToBack: function() {
            return this.invoke("bringToBack");
        },
        getBounds: function() {
            var bounds = new L.LatLngBounds();
            this.eachLayer(function(layer) {
                bounds.extend(layer instanceof L.Marker ? layer.getLatLng() : layer.getBounds());
            });
            return bounds;
        },
        _propagateEvent: function(e) {
            e = L.extend({
                layer: e.target,
                target: this
            }, e);
            this.fire(e.type, e);
        }
    });
    L.featureGroup = function(layers) {
        return new L.FeatureGroup(layers);
    };
    /*
 * L.Path is a base class for rendering vector paths on a map. Inherited by Polyline, Circle, etc.
 */
    L.Path = L.Class.extend({
        includes: [ L.Mixin.Events ],
        statics: {
            // how much to extend the clip area around the map view
            // (relative to its size, e.g. 0.5 is half the screen in each direction)
            // set it so that SVG element doesn't exceed 1280px (vectors flicker on dragend if it is)
            CLIP_PADDING: function() {
                var max = L.Browser.mobile ? 1280 : 2e3, target = (max / Math.max(window.outerWidth, window.outerHeight) - 1) / 2;
                return Math.max(0, Math.min(.5, target));
            }()
        },
        options: {
            stroke: true,
            color: "#0033ff",
            dashArray: null,
            lineCap: null,
            lineJoin: null,
            weight: 5,
            opacity: .5,
            fill: false,
            fillColor: null,
            //same as color by default
            fillOpacity: .2,
            clickable: true
        },
        initialize: function(options) {
            L.setOptions(this, options);
        },
        onAdd: function(map) {
            this._map = map;
            if (!this._container) {
                this._initElements();
                this._initEvents();
            }
            this.projectLatlngs();
            this._updatePath();
            if (this._container) {
                this._map._pathRoot.appendChild(this._container);
            }
            this.fire("add");
            map.on({
                viewreset: this.projectLatlngs,
                moveend: this._updatePath
            }, this);
        },
        addTo: function(map) {
            map.addLayer(this);
            return this;
        },
        onRemove: function(map) {
            map._pathRoot.removeChild(this._container);
            // Need to fire remove event before we set _map to null as the event hooks might need the object
            this.fire("remove");
            this._map = null;
            if (L.Browser.vml) {
                this._container = null;
                this._stroke = null;
                this._fill = null;
            }
            map.off({
                viewreset: this.projectLatlngs,
                moveend: this._updatePath
            }, this);
        },
        projectLatlngs: function() {},
        setStyle: function(style) {
            L.setOptions(this, style);
            if (this._container) {
                this._updateStyle();
            }
            return this;
        },
        redraw: function() {
            if (this._map) {
                this.projectLatlngs();
                this._updatePath();
            }
            return this;
        }
    });
    L.Map.include({
        _updatePathViewport: function() {
            var p = L.Path.CLIP_PADDING, size = this.getSize(), panePos = L.DomUtil.getPosition(this._mapPane), min = panePos.multiplyBy(-1)._subtract(size.multiplyBy(p)._round()), max = min.add(size.multiplyBy(1 + p * 2)._round());
            this._pathViewport = new L.Bounds(min, max);
        }
    });
    /*
 * Extends L.Path with SVG-specific rendering code.
 */
    L.Path.SVG_NS = "http://www.w3.org/2000/svg";
    L.Browser.svg = !!(document.createElementNS && document.createElementNS(L.Path.SVG_NS, "svg").createSVGRect);
    L.Path = L.Path.extend({
        statics: {
            SVG: L.Browser.svg
        },
        bringToFront: function() {
            var root = this._map._pathRoot, path = this._container;
            if (path && root.lastChild !== path) {
                root.appendChild(path);
            }
            return this;
        },
        bringToBack: function() {
            var root = this._map._pathRoot, path = this._container, first = root.firstChild;
            if (path && first !== path) {
                root.insertBefore(path, first);
            }
            return this;
        },
        getPathString: function() {},
        _createElement: function(name) {
            return document.createElementNS(L.Path.SVG_NS, name);
        },
        _initElements: function() {
            this._map._initPathRoot();
            this._initPath();
            this._initStyle();
        },
        _initPath: function() {
            this._container = this._createElement("g");
            this._path = this._createElement("path");
            if (this.options.className) {
                L.DomUtil.addClass(this._path, this.options.className);
            }
            this._container.appendChild(this._path);
        },
        _initStyle: function() {
            if (this.options.stroke) {
                this._path.setAttribute("stroke-linejoin", "round");
                this._path.setAttribute("stroke-linecap", "round");
            }
            if (this.options.fill) {
                this._path.setAttribute("fill-rule", "evenodd");
            }
            if (this.options.pointerEvents) {
                this._path.setAttribute("pointer-events", this.options.pointerEvents);
            }
            if (!this.options.clickable && !this.options.pointerEvents) {
                this._path.setAttribute("pointer-events", "none");
            }
            this._updateStyle();
        },
        _updateStyle: function() {
            if (this.options.stroke) {
                this._path.setAttribute("stroke", this.options.color);
                this._path.setAttribute("stroke-opacity", this.options.opacity);
                this._path.setAttribute("stroke-width", this.options.weight);
                if (this.options.dashArray) {
                    this._path.setAttribute("stroke-dasharray", this.options.dashArray);
                } else {
                    this._path.removeAttribute("stroke-dasharray");
                }
                if (this.options.lineCap) {
                    this._path.setAttribute("stroke-linecap", this.options.lineCap);
                }
                if (this.options.lineJoin) {
                    this._path.setAttribute("stroke-linejoin", this.options.lineJoin);
                }
            } else {
                this._path.setAttribute("stroke", "none");
            }
            if (this.options.fill) {
                this._path.setAttribute("fill", this.options.fillColor || this.options.color);
                this._path.setAttribute("fill-opacity", this.options.fillOpacity);
            } else {
                this._path.setAttribute("fill", "none");
            }
        },
        _updatePath: function() {
            var str = this.getPathString();
            if (!str) {
                // fix webkit empty string parsing bug
                str = "M0 0";
            }
            this._path.setAttribute("d", str);
        },
        // TODO remove duplication with L.Map
        _initEvents: function() {
            if (this.options.clickable) {
                if (L.Browser.svg || !L.Browser.vml) {
                    L.DomUtil.addClass(this._path, "leaflet-clickable");
                }
                L.DomEvent.on(this._container, "click", this._onMouseClick, this);
                var events = [ "dblclick", "mousedown", "mouseover", "mouseout", "mousemove", "contextmenu" ];
                for (var i = 0; i < events.length; i++) {
                    L.DomEvent.on(this._container, events[i], this._fireMouseEvent, this);
                }
            }
        },
        _onMouseClick: function(e) {
            if (this._map.dragging && this._map.dragging.moved()) {
                return;
            }
            this._fireMouseEvent(e);
        },
        _fireMouseEvent: function(e) {
            if (!this.hasEventListeners(e.type)) {
                return;
            }
            var map = this._map, containerPoint = map.mouseEventToContainerPoint(e), layerPoint = map.containerPointToLayerPoint(containerPoint), latlng = map.layerPointToLatLng(layerPoint);
            this.fire(e.type, {
                latlng: latlng,
                layerPoint: layerPoint,
                containerPoint: containerPoint,
                originalEvent: e
            });
            if (e.type === "contextmenu") {
                L.DomEvent.preventDefault(e);
            }
            if (e.type !== "mousemove") {
                L.DomEvent.stopPropagation(e);
            }
        }
    });
    L.Map.include({
        _initPathRoot: function() {
            if (!this._pathRoot) {
                this._pathRoot = L.Path.prototype._createElement("svg");
                this._panes.overlayPane.appendChild(this._pathRoot);
                if (this.options.zoomAnimation && L.Browser.any3d) {
                    L.DomUtil.addClass(this._pathRoot, "leaflet-zoom-animated");
                    this.on({
                        zoomanim: this._animatePathZoom,
                        zoomend: this._endPathZoom
                    });
                } else {
                    L.DomUtil.addClass(this._pathRoot, "leaflet-zoom-hide");
                }
                this.on("moveend", this._updateSvgViewport);
                this._updateSvgViewport();
            }
        },
        _animatePathZoom: function(e) {
            var scale = this.getZoomScale(e.zoom), offset = this._getCenterOffset(e.center)._multiplyBy(-scale)._add(this._pathViewport.min);
            this._pathRoot.style[L.DomUtil.TRANSFORM] = L.DomUtil.getTranslateString(offset) + " scale(" + scale + ") ";
            this._pathZooming = true;
        },
        _endPathZoom: function() {
            this._pathZooming = false;
        },
        _updateSvgViewport: function() {
            if (this._pathZooming) {
                // Do not update SVGs while a zoom animation is going on otherwise the animation will break.
                // When the zoom animation ends we will be updated again anyway
                // This fixes the case where you do a momentum move and zoom while the move is still ongoing.
                return;
            }
            this._updatePathViewport();
            var vp = this._pathViewport, min = vp.min, max = vp.max, width = max.x - min.x, height = max.y - min.y, root = this._pathRoot, pane = this._panes.overlayPane;
            // Hack to make flicker on drag end on mobile webkit less irritating
            if (L.Browser.mobileWebkit) {
                pane.removeChild(root);
            }
            L.DomUtil.setPosition(root, min);
            root.setAttribute("width", width);
            root.setAttribute("height", height);
            root.setAttribute("viewBox", [ min.x, min.y, width, height ].join(" "));
            if (L.Browser.mobileWebkit) {
                pane.appendChild(root);
            }
        }
    });
    /*
 * Popup extension to L.Path (polylines, polygons, circles), adding popup-related methods.
 */
    L.Path.include({
        bindPopup: function(content, options) {
            if (content instanceof L.Popup) {
                this._popup = content;
            } else {
                if (!this._popup || options) {
                    this._popup = new L.Popup(options, this);
                }
                this._popup.setContent(content);
            }
            if (!this._popupHandlersAdded) {
                this.on("click", this._openPopup, this).on("remove", this.closePopup, this);
                this._popupHandlersAdded = true;
            }
            return this;
        },
        unbindPopup: function() {
            if (this._popup) {
                this._popup = null;
                this.off("click", this._openPopup).off("remove", this.closePopup);
                this._popupHandlersAdded = false;
            }
            return this;
        },
        openPopup: function(latlng) {
            if (this._popup) {
                // open the popup from one of the path's points if not specified
                latlng = latlng || this._latlng || this._latlngs[Math.floor(this._latlngs.length / 2)];
                this._openPopup({
                    latlng: latlng
                });
            }
            return this;
        },
        closePopup: function() {
            if (this._popup) {
                this._popup._close();
            }
            return this;
        },
        _openPopup: function(e) {
            this._popup.setLatLng(e.latlng);
            this._map.openPopup(this._popup);
        }
    });
    /*
 * Vector rendering for IE6-8 through VML.
 * Thanks to Dmitry Baranovsky and his Raphael library for inspiration!
 */
    L.Browser.vml = !L.Browser.svg && function() {
        try {
            var div = document.createElement("div");
            div.innerHTML = '<v:shape adj="1"/>';
            var shape = div.firstChild;
            shape.style.behavior = "url(#default#VML)";
            return shape && typeof shape.adj === "object";
        } catch (e) {
            return false;
        }
    }();
    L.Path = L.Browser.svg || !L.Browser.vml ? L.Path : L.Path.extend({
        statics: {
            VML: true,
            CLIP_PADDING: .02
        },
        _createElement: function() {
            try {
                document.namespaces.add("lvml", "urn:schemas-microsoft-com:vml");
                return function(name) {
                    return document.createElement("<lvml:" + name + ' class="lvml">');
                };
            } catch (e) {
                return function(name) {
                    return document.createElement("<" + name + ' xmlns="urn:schemas-microsoft.com:vml" class="lvml">');
                };
            }
        }(),
        _initPath: function() {
            var container = this._container = this._createElement("shape");
            L.DomUtil.addClass(container, "leaflet-vml-shape" + (this.options.className ? " " + this.options.className : ""));
            if (this.options.clickable) {
                L.DomUtil.addClass(container, "leaflet-clickable");
            }
            container.coordsize = "1 1";
            this._path = this._createElement("path");
            container.appendChild(this._path);
            this._map._pathRoot.appendChild(container);
        },
        _initStyle: function() {
            this._updateStyle();
        },
        _updateStyle: function() {
            var stroke = this._stroke, fill = this._fill, options = this.options, container = this._container;
            container.stroked = options.stroke;
            container.filled = options.fill;
            if (options.stroke) {
                if (!stroke) {
                    stroke = this._stroke = this._createElement("stroke");
                    stroke.endcap = "round";
                    container.appendChild(stroke);
                }
                stroke.weight = options.weight + "px";
                stroke.color = options.color;
                stroke.opacity = options.opacity;
                if (options.dashArray) {
                    stroke.dashStyle = L.Util.isArray(options.dashArray) ? options.dashArray.join(" ") : options.dashArray.replace(/( *, *)/g, " ");
                } else {
                    stroke.dashStyle = "";
                }
                if (options.lineCap) {
                    stroke.endcap = options.lineCap.replace("butt", "flat");
                }
                if (options.lineJoin) {
                    stroke.joinstyle = options.lineJoin;
                }
            } else if (stroke) {
                container.removeChild(stroke);
                this._stroke = null;
            }
            if (options.fill) {
                if (!fill) {
                    fill = this._fill = this._createElement("fill");
                    container.appendChild(fill);
                }
                fill.color = options.fillColor || options.color;
                fill.opacity = options.fillOpacity;
            } else if (fill) {
                container.removeChild(fill);
                this._fill = null;
            }
        },
        _updatePath: function() {
            var style = this._container.style;
            style.display = "none";
            this._path.v = this.getPathString() + " ";
            // the space fixes IE empty path string bug
            style.display = "";
        }
    });
    L.Map.include(L.Browser.svg || !L.Browser.vml ? {} : {
        _initPathRoot: function() {
            if (this._pathRoot) {
                return;
            }
            var root = this._pathRoot = document.createElement("div");
            root.className = "leaflet-vml-container";
            this._panes.overlayPane.appendChild(root);
            this.on("moveend", this._updatePathViewport);
            this._updatePathViewport();
        }
    });
    /*
 * Vector rendering for all browsers that support canvas.
 */
    L.Browser.canvas = function() {
        return !!document.createElement("canvas").getContext;
    }();
    L.Path = L.Path.SVG && !window.L_PREFER_CANVAS || !L.Browser.canvas ? L.Path : L.Path.extend({
        statics: {
            //CLIP_PADDING: 0.02, // not sure if there's a need to set it to a small value
            CANVAS: true,
            SVG: false
        },
        redraw: function() {
            if (this._map) {
                this.projectLatlngs();
                this._requestUpdate();
            }
            return this;
        },
        setStyle: function(style) {
            L.setOptions(this, style);
            if (this._map) {
                this._updateStyle();
                this._requestUpdate();
            }
            return this;
        },
        onRemove: function(map) {
            map.off("viewreset", this.projectLatlngs, this).off("moveend", this._updatePath, this);
            if (this.options.clickable) {
                this._map.off("click", this._onClick, this);
                this._map.off("mousemove", this._onMouseMove, this);
            }
            this._requestUpdate();
            this.fire("remove");
            this._map = null;
        },
        _requestUpdate: function() {
            if (this._map && !L.Path._updateRequest) {
                L.Path._updateRequest = L.Util.requestAnimFrame(this._fireMapMoveEnd, this._map);
            }
        },
        _fireMapMoveEnd: function() {
            L.Path._updateRequest = null;
            this.fire("moveend");
        },
        _initElements: function() {
            this._map._initPathRoot();
            this._ctx = this._map._canvasCtx;
        },
        _updateStyle: function() {
            var options = this.options;
            if (options.stroke) {
                this._ctx.lineWidth = options.weight;
                this._ctx.strokeStyle = options.color;
            }
            if (options.fill) {
                this._ctx.fillStyle = options.fillColor || options.color;
            }
        },
        _drawPath: function() {
            var i, j, len, len2, point, drawMethod;
            this._ctx.beginPath();
            for (i = 0, len = this._parts.length; i < len; i++) {
                for (j = 0, len2 = this._parts[i].length; j < len2; j++) {
                    point = this._parts[i][j];
                    drawMethod = (j === 0 ? "move" : "line") + "To";
                    this._ctx[drawMethod](point.x, point.y);
                }
                // TODO refactor ugly hack
                if (this instanceof L.Polygon) {
                    this._ctx.closePath();
                }
            }
        },
        _checkIfEmpty: function() {
            return !this._parts.length;
        },
        _updatePath: function() {
            if (this._checkIfEmpty()) {
                return;
            }
            var ctx = this._ctx, options = this.options;
            this._drawPath();
            ctx.save();
            this._updateStyle();
            if (options.fill) {
                ctx.globalAlpha = options.fillOpacity;
                ctx.fill();
            }
            if (options.stroke) {
                ctx.globalAlpha = options.opacity;
                ctx.stroke();
            }
            ctx.restore();
        },
        _initEvents: function() {
            if (this.options.clickable) {
                // TODO dblclick
                this._map.on("mousemove", this._onMouseMove, this);
                this._map.on("click", this._onClick, this);
            }
        },
        _onClick: function(e) {
            if (this._containsPoint(e.layerPoint)) {
                this.fire("click", e);
            }
        },
        _onMouseMove: function(e) {
            if (!this._map || this._map._animatingZoom) {
                return;
            }
            // TODO don't do on each move
            if (this._containsPoint(e.layerPoint)) {
                this._ctx.canvas.style.cursor = "pointer";
                this._mouseInside = true;
                this.fire("mouseover", e);
            } else if (this._mouseInside) {
                this._ctx.canvas.style.cursor = "";
                this._mouseInside = false;
                this.fire("mouseout", e);
            }
        }
    });
    L.Map.include(L.Path.SVG && !window.L_PREFER_CANVAS || !L.Browser.canvas ? {} : {
        _initPathRoot: function() {
            var root = this._pathRoot, ctx;
            if (!root) {
                root = this._pathRoot = document.createElement("canvas");
                root.style.position = "absolute";
                ctx = this._canvasCtx = root.getContext("2d");
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                this._panes.overlayPane.appendChild(root);
                if (this.options.zoomAnimation) {
                    this._pathRoot.className = "leaflet-zoom-animated";
                    this.on("zoomanim", this._animatePathZoom);
                    this.on("zoomend", this._endPathZoom);
                }
                this.on("moveend", this._updateCanvasViewport);
                this._updateCanvasViewport();
            }
        },
        _updateCanvasViewport: function() {
            // don't redraw while zooming. See _updateSvgViewport for more details
            if (this._pathZooming) {
                return;
            }
            this._updatePathViewport();
            var vp = this._pathViewport, min = vp.min, size = vp.max.subtract(min), root = this._pathRoot;
            //TODO check if this works properly on mobile webkit
            L.DomUtil.setPosition(root, min);
            root.width = size.x;
            root.height = size.y;
            root.getContext("2d").translate(-min.x, -min.y);
        }
    });
    /*
 * L.LineUtil contains different utility functions for line segments
 * and polylines (clipping, simplification, distances, etc.)
 */
    /*jshint bitwise:false */
    // allow bitwise operations for this file
    L.LineUtil = {
        // Simplify polyline with vertex reduction and Douglas-Peucker simplification.
        // Improves rendering performance dramatically by lessening the number of points to draw.
        simplify: function(/*Point[]*/ points, /*Number*/ tolerance) {
            if (!tolerance || !points.length) {
                return points.slice();
            }
            var sqTolerance = tolerance * tolerance;
            // stage 1: vertex reduction
            points = this._reducePoints(points, sqTolerance);
            // stage 2: Douglas-Peucker simplification
            points = this._simplifyDP(points, sqTolerance);
            return points;
        },
        // distance from a point to a segment between two points
        pointToSegmentDistance: function(/*Point*/ p, /*Point*/ p1, /*Point*/ p2) {
            return Math.sqrt(this._sqClosestPointOnSegment(p, p1, p2, true));
        },
        closestPointOnSegment: function(/*Point*/ p, /*Point*/ p1, /*Point*/ p2) {
            return this._sqClosestPointOnSegment(p, p1, p2);
        },
        // Douglas-Peucker simplification, see http://en.wikipedia.org/wiki/Douglas-Peucker_algorithm
        _simplifyDP: function(points, sqTolerance) {
            var len = points.length, ArrayConstructor = typeof Uint8Array !== undefined + "" ? Uint8Array : Array, markers = new ArrayConstructor(len);
            markers[0] = markers[len - 1] = 1;
            this._simplifyDPStep(points, markers, sqTolerance, 0, len - 1);
            var i, newPoints = [];
            for (i = 0; i < len; i++) {
                if (markers[i]) {
                    newPoints.push(points[i]);
                }
            }
            return newPoints;
        },
        _simplifyDPStep: function(points, markers, sqTolerance, first, last) {
            var maxSqDist = 0, index, i, sqDist;
            for (i = first + 1; i <= last - 1; i++) {
                sqDist = this._sqClosestPointOnSegment(points[i], points[first], points[last], true);
                if (sqDist > maxSqDist) {
                    index = i;
                    maxSqDist = sqDist;
                }
            }
            if (maxSqDist > sqTolerance) {
                markers[index] = 1;
                this._simplifyDPStep(points, markers, sqTolerance, first, index);
                this._simplifyDPStep(points, markers, sqTolerance, index, last);
            }
        },
        // reduce points that are too close to each other to a single point
        _reducePoints: function(points, sqTolerance) {
            var reducedPoints = [ points[0] ];
            for (var i = 1, prev = 0, len = points.length; i < len; i++) {
                if (this._sqDist(points[i], points[prev]) > sqTolerance) {
                    reducedPoints.push(points[i]);
                    prev = i;
                }
            }
            if (prev < len - 1) {
                reducedPoints.push(points[len - 1]);
            }
            return reducedPoints;
        },
        // Cohen-Sutherland line clipping algorithm.
        // Used to avoid rendering parts of a polyline that are not currently visible.
        clipSegment: function(a, b, bounds, useLastCode) {
            var codeA = useLastCode ? this._lastCode : this._getBitCode(a, bounds), codeB = this._getBitCode(b, bounds), codeOut, p, newCode;
            // save 2nd code to avoid calculating it on the next segment
            this._lastCode = codeB;
            while (true) {
                // if a,b is inside the clip window (trivial accept)
                if (!(codeA | codeB)) {
                    return [ a, b ];
                } else if (codeA & codeB) {
                    return false;
                } else {
                    codeOut = codeA || codeB;
                    p = this._getEdgeIntersection(a, b, codeOut, bounds);
                    newCode = this._getBitCode(p, bounds);
                    if (codeOut === codeA) {
                        a = p;
                        codeA = newCode;
                    } else {
                        b = p;
                        codeB = newCode;
                    }
                }
            }
        },
        _getEdgeIntersection: function(a, b, code, bounds) {
            var dx = b.x - a.x, dy = b.y - a.y, min = bounds.min, max = bounds.max;
            if (code & 8) {
                // top
                return new L.Point(a.x + dx * (max.y - a.y) / dy, max.y);
            } else if (code & 4) {
                // bottom
                return new L.Point(a.x + dx * (min.y - a.y) / dy, min.y);
            } else if (code & 2) {
                // right
                return new L.Point(max.x, a.y + dy * (max.x - a.x) / dx);
            } else if (code & 1) {
                // left
                return new L.Point(min.x, a.y + dy * (min.x - a.x) / dx);
            }
        },
        _getBitCode: function(/*Point*/ p, bounds) {
            var code = 0;
            if (p.x < bounds.min.x) {
                // left
                code |= 1;
            } else if (p.x > bounds.max.x) {
                // right
                code |= 2;
            }
            if (p.y < bounds.min.y) {
                // bottom
                code |= 4;
            } else if (p.y > bounds.max.y) {
                // top
                code |= 8;
            }
            return code;
        },
        // square distance (to avoid unnecessary Math.sqrt calls)
        _sqDist: function(p1, p2) {
            var dx = p2.x - p1.x, dy = p2.y - p1.y;
            return dx * dx + dy * dy;
        },
        // return closest point on segment or distance to that point
        _sqClosestPointOnSegment: function(p, p1, p2, sqDist) {
            var x = p1.x, y = p1.y, dx = p2.x - x, dy = p2.y - y, dot = dx * dx + dy * dy, t;
            if (dot > 0) {
                t = ((p.x - x) * dx + (p.y - y) * dy) / dot;
                if (t > 1) {
                    x = p2.x;
                    y = p2.y;
                } else if (t > 0) {
                    x += dx * t;
                    y += dy * t;
                }
            }
            dx = p.x - x;
            dy = p.y - y;
            return sqDist ? dx * dx + dy * dy : new L.Point(x, y);
        }
    };
    /*
 * L.Polyline is used to display polylines on a map.
 */
    L.Polyline = L.Path.extend({
        initialize: function(latlngs, options) {
            L.Path.prototype.initialize.call(this, options);
            this._latlngs = this._convertLatLngs(latlngs);
        },
        options: {
            // how much to simplify the polyline on each zoom level
            // more = better performance and smoother look, less = more accurate
            smoothFactor: 1,
            noClip: false
        },
        projectLatlngs: function() {
            this._originalPoints = [];
            for (var i = 0, len = this._latlngs.length; i < len; i++) {
                this._originalPoints[i] = this._map.latLngToLayerPoint(this._latlngs[i]);
            }
        },
        getPathString: function() {
            for (var i = 0, len = this._parts.length, str = ""; i < len; i++) {
                str += this._getPathPartStr(this._parts[i]);
            }
            return str;
        },
        getLatLngs: function() {
            return this._latlngs;
        },
        setLatLngs: function(latlngs) {
            this._latlngs = this._convertLatLngs(latlngs);
            return this.redraw();
        },
        addLatLng: function(latlng) {
            this._latlngs.push(L.latLng(latlng));
            return this.redraw();
        },
        spliceLatLngs: function() {
            // (Number index, Number howMany)
            var removed = [].splice.apply(this._latlngs, arguments);
            this._convertLatLngs(this._latlngs, true);
            this.redraw();
            return removed;
        },
        closestLayerPoint: function(p) {
            var minDistance = Infinity, parts = this._parts, p1, p2, minPoint = null;
            for (var j = 0, jLen = parts.length; j < jLen; j++) {
                var points = parts[j];
                for (var i = 1, len = points.length; i < len; i++) {
                    p1 = points[i - 1];
                    p2 = points[i];
                    var sqDist = L.LineUtil._sqClosestPointOnSegment(p, p1, p2, true);
                    if (sqDist < minDistance) {
                        minDistance = sqDist;
                        minPoint = L.LineUtil._sqClosestPointOnSegment(p, p1, p2);
                    }
                }
            }
            if (minPoint) {
                minPoint.distance = Math.sqrt(minDistance);
            }
            return minPoint;
        },
        getBounds: function() {
            return new L.LatLngBounds(this.getLatLngs());
        },
        _convertLatLngs: function(latlngs, overwrite) {
            var i, len, target = overwrite ? latlngs : [];
            for (i = 0, len = latlngs.length; i < len; i++) {
                if (L.Util.isArray(latlngs[i]) && typeof latlngs[i][0] !== "number") {
                    return;
                }
                target[i] = L.latLng(latlngs[i]);
            }
            return target;
        },
        _initEvents: function() {
            L.Path.prototype._initEvents.call(this);
        },
        _getPathPartStr: function(points) {
            var round = L.Path.VML;
            for (var j = 0, len2 = points.length, str = "", p; j < len2; j++) {
                p = points[j];
                if (round) {
                    p._round();
                }
                str += (j ? "L" : "M") + p.x + " " + p.y;
            }
            return str;
        },
        _clipPoints: function() {
            var points = this._originalPoints, len = points.length, i, k, segment;
            if (this.options.noClip) {
                this._parts = [ points ];
                return;
            }
            this._parts = [];
            var parts = this._parts, vp = this._map._pathViewport, lu = L.LineUtil;
            for (i = 0, k = 0; i < len - 1; i++) {
                segment = lu.clipSegment(points[i], points[i + 1], vp, i);
                if (!segment) {
                    continue;
                }
                parts[k] = parts[k] || [];
                parts[k].push(segment[0]);
                // if segment goes out of screen, or it's the last one, it's the end of the line part
                if (segment[1] !== points[i + 1] || i === len - 2) {
                    parts[k].push(segment[1]);
                    k++;
                }
            }
        },
        // simplify each clipped part of the polyline
        _simplifyPoints: function() {
            var parts = this._parts, lu = L.LineUtil;
            for (var i = 0, len = parts.length; i < len; i++) {
                parts[i] = lu.simplify(parts[i], this.options.smoothFactor);
            }
        },
        _updatePath: function() {
            if (!this._map) {
                return;
            }
            this._clipPoints();
            this._simplifyPoints();
            L.Path.prototype._updatePath.call(this);
        }
    });
    L.polyline = function(latlngs, options) {
        return new L.Polyline(latlngs, options);
    };
    /*
 * L.PolyUtil contains utility functions for polygons (clipping, etc.).
 */
    /*jshint bitwise:false */
    // allow bitwise operations here
    L.PolyUtil = {};
    /*
 * Sutherland-Hodgeman polygon clipping algorithm.
 * Used to avoid rendering parts of a polygon that are not currently visible.
 */
    L.PolyUtil.clipPolygon = function(points, bounds) {
        var clippedPoints, edges = [ 1, 4, 2, 8 ], i, j, k, a, b, len, edge, p, lu = L.LineUtil;
        for (i = 0, len = points.length; i < len; i++) {
            points[i]._code = lu._getBitCode(points[i], bounds);
        }
        // for each edge (left, bottom, right, top)
        for (k = 0; k < 4; k++) {
            edge = edges[k];
            clippedPoints = [];
            for (i = 0, len = points.length, j = len - 1; i < len; j = i++) {
                a = points[i];
                b = points[j];
                // if a is inside the clip window
                if (!(a._code & edge)) {
                    // if b is outside the clip window (a->b goes out of screen)
                    if (b._code & edge) {
                        p = lu._getEdgeIntersection(b, a, edge, bounds);
                        p._code = lu._getBitCode(p, bounds);
                        clippedPoints.push(p);
                    }
                    clippedPoints.push(a);
                } else if (!(b._code & edge)) {
                    p = lu._getEdgeIntersection(b, a, edge, bounds);
                    p._code = lu._getBitCode(p, bounds);
                    clippedPoints.push(p);
                }
            }
            points = clippedPoints;
        }
        return points;
    };
    /*
 * L.Polygon is used to display polygons on a map.
 */
    L.Polygon = L.Polyline.extend({
        options: {
            fill: true
        },
        initialize: function(latlngs, options) {
            L.Polyline.prototype.initialize.call(this, latlngs, options);
            this._initWithHoles(latlngs);
        },
        _initWithHoles: function(latlngs) {
            var i, len, hole;
            if (latlngs && L.Util.isArray(latlngs[0]) && typeof latlngs[0][0] !== "number") {
                this._latlngs = this._convertLatLngs(latlngs[0]);
                this._holes = latlngs.slice(1);
                for (i = 0, len = this._holes.length; i < len; i++) {
                    hole = this._holes[i] = this._convertLatLngs(this._holes[i]);
                    if (hole[0].equals(hole[hole.length - 1])) {
                        hole.pop();
                    }
                }
            }
            // filter out last point if its equal to the first one
            latlngs = this._latlngs;
            if (latlngs.length >= 2 && latlngs[0].equals(latlngs[latlngs.length - 1])) {
                latlngs.pop();
            }
        },
        projectLatlngs: function() {
            L.Polyline.prototype.projectLatlngs.call(this);
            // project polygon holes points
            // TODO move this logic to Polyline to get rid of duplication
            this._holePoints = [];
            if (!this._holes) {
                return;
            }
            var i, j, len, len2;
            for (i = 0, len = this._holes.length; i < len; i++) {
                this._holePoints[i] = [];
                for (j = 0, len2 = this._holes[i].length; j < len2; j++) {
                    this._holePoints[i][j] = this._map.latLngToLayerPoint(this._holes[i][j]);
                }
            }
        },
        setLatLngs: function(latlngs) {
            if (latlngs && L.Util.isArray(latlngs[0]) && typeof latlngs[0][0] !== "number") {
                this._initWithHoles(latlngs);
                return this.redraw();
            } else {
                return L.Polyline.prototype.setLatLngs.call(this, latlngs);
            }
        },
        _clipPoints: function() {
            var points = this._originalPoints, newParts = [];
            this._parts = [ points ].concat(this._holePoints);
            if (this.options.noClip) {
                return;
            }
            for (var i = 0, len = this._parts.length; i < len; i++) {
                var clipped = L.PolyUtil.clipPolygon(this._parts[i], this._map._pathViewport);
                if (clipped.length) {
                    newParts.push(clipped);
                }
            }
            this._parts = newParts;
        },
        _getPathPartStr: function(points) {
            var str = L.Polyline.prototype._getPathPartStr.call(this, points);
            return str + (L.Browser.svg ? "z" : "x");
        }
    });
    L.polygon = function(latlngs, options) {
        return new L.Polygon(latlngs, options);
    };
    /*
 * Contains L.MultiPolyline and L.MultiPolygon layers.
 */
    (function() {
        function createMulti(Klass) {
            return L.FeatureGroup.extend({
                initialize: function(latlngs, options) {
                    this._layers = {};
                    this._options = options;
                    this.setLatLngs(latlngs);
                },
                setLatLngs: function(latlngs) {
                    var i = 0, len = latlngs.length;
                    this.eachLayer(function(layer) {
                        if (i < len) {
                            layer.setLatLngs(latlngs[i++]);
                        } else {
                            this.removeLayer(layer);
                        }
                    }, this);
                    while (i < len) {
                        this.addLayer(new Klass(latlngs[i++], this._options));
                    }
                    return this;
                },
                getLatLngs: function() {
                    var latlngs = [];
                    this.eachLayer(function(layer) {
                        latlngs.push(layer.getLatLngs());
                    });
                    return latlngs;
                }
            });
        }
        L.MultiPolyline = createMulti(L.Polyline);
        L.MultiPolygon = createMulti(L.Polygon);
        L.multiPolyline = function(latlngs, options) {
            return new L.MultiPolyline(latlngs, options);
        };
        L.multiPolygon = function(latlngs, options) {
            return new L.MultiPolygon(latlngs, options);
        };
    })();
    /*
 * L.Rectangle extends Polygon and creates a rectangle when passed a LatLngBounds object.
 */
    L.Rectangle = L.Polygon.extend({
        initialize: function(latLngBounds, options) {
            L.Polygon.prototype.initialize.call(this, this._boundsToLatLngs(latLngBounds), options);
        },
        setBounds: function(latLngBounds) {
            this.setLatLngs(this._boundsToLatLngs(latLngBounds));
        },
        _boundsToLatLngs: function(latLngBounds) {
            latLngBounds = L.latLngBounds(latLngBounds);
            return [ latLngBounds.getSouthWest(), latLngBounds.getNorthWest(), latLngBounds.getNorthEast(), latLngBounds.getSouthEast() ];
        }
    });
    L.rectangle = function(latLngBounds, options) {
        return new L.Rectangle(latLngBounds, options);
    };
    /*
 * L.Circle is a circle overlay (with a certain radius in meters).
 */
    L.Circle = L.Path.extend({
        initialize: function(latlng, radius, options) {
            L.Path.prototype.initialize.call(this, options);
            this._latlng = L.latLng(latlng);
            this._mRadius = radius;
        },
        options: {
            fill: true
        },
        setLatLng: function(latlng) {
            this._latlng = L.latLng(latlng);
            return this.redraw();
        },
        setRadius: function(radius) {
            this._mRadius = radius;
            return this.redraw();
        },
        projectLatlngs: function() {
            var lngRadius = this._getLngRadius(), latlng = this._latlng, pointLeft = this._map.latLngToLayerPoint([ latlng.lat, latlng.lng - lngRadius ]);
            this._point = this._map.latLngToLayerPoint(latlng);
            this._radius = Math.max(this._point.x - pointLeft.x, 1);
        },
        getBounds: function() {
            var lngRadius = this._getLngRadius(), latRadius = this._mRadius / 40075017 * 360, latlng = this._latlng;
            return new L.LatLngBounds([ latlng.lat - latRadius, latlng.lng - lngRadius ], [ latlng.lat + latRadius, latlng.lng + lngRadius ]);
        },
        getLatLng: function() {
            return this._latlng;
        },
        getPathString: function() {
            var p = this._point, r = this._radius;
            if (this._checkIfEmpty()) {
                return "";
            }
            if (L.Browser.svg) {
                return "M" + p.x + "," + (p.y - r) + "A" + r + "," + r + ",0,1,1," + (p.x - .1) + "," + (p.y - r) + " z";
            } else {
                p._round();
                r = Math.round(r);
                return "AL " + p.x + "," + p.y + " " + r + "," + r + " 0," + 65535 * 360;
            }
        },
        getRadius: function() {
            return this._mRadius;
        },
        // TODO Earth hardcoded, move into projection code!
        _getLatRadius: function() {
            return this._mRadius / 40075017 * 360;
        },
        _getLngRadius: function() {
            return this._getLatRadius() / Math.cos(L.LatLng.DEG_TO_RAD * this._latlng.lat);
        },
        _checkIfEmpty: function() {
            if (!this._map) {
                return false;
            }
            var vp = this._map._pathViewport, r = this._radius, p = this._point;
            return p.x - r > vp.max.x || p.y - r > vp.max.y || p.x + r < vp.min.x || p.y + r < vp.min.y;
        }
    });
    L.circle = function(latlng, radius, options) {
        return new L.Circle(latlng, radius, options);
    };
    /*
 * L.CircleMarker is a circle overlay with a permanent pixel radius.
 */
    L.CircleMarker = L.Circle.extend({
        options: {
            radius: 10,
            weight: 2
        },
        initialize: function(latlng, options) {
            L.Circle.prototype.initialize.call(this, latlng, null, options);
            this._radius = this.options.radius;
        },
        projectLatlngs: function() {
            this._point = this._map.latLngToLayerPoint(this._latlng);
        },
        _updateStyle: function() {
            L.Circle.prototype._updateStyle.call(this);
            this.setRadius(this.options.radius);
        },
        setLatLng: function(latlng) {
            L.Circle.prototype.setLatLng.call(this, latlng);
            if (this._popup && this._popup._isOpen) {
                this._popup.setLatLng(latlng);
            }
            return this;
        },
        setRadius: function(radius) {
            this.options.radius = this._radius = radius;
            return this.redraw();
        },
        getRadius: function() {
            return this._radius;
        }
    });
    L.circleMarker = function(latlng, options) {
        return new L.CircleMarker(latlng, options);
    };
    /*
 * Extends L.Polyline to be able to manually detect clicks on Canvas-rendered polylines.
 */
    L.Polyline.include(!L.Path.CANVAS ? {} : {
        _containsPoint: function(p, closed) {
            var i, j, k, len, len2, dist, part, w = this.options.weight / 2;
            if (L.Browser.touch) {
                w += 10;
            }
            for (i = 0, len = this._parts.length; i < len; i++) {
                part = this._parts[i];
                for (j = 0, len2 = part.length, k = len2 - 1; j < len2; k = j++) {
                    if (!closed && j === 0) {
                        continue;
                    }
                    dist = L.LineUtil.pointToSegmentDistance(p, part[k], part[j]);
                    if (dist <= w) {
                        return true;
                    }
                }
            }
            return false;
        }
    });
    /*
 * Extends L.Polygon to be able to manually detect clicks on Canvas-rendered polygons.
 */
    L.Polygon.include(!L.Path.CANVAS ? {} : {
        _containsPoint: function(p) {
            var inside = false, part, p1, p2, i, j, k, len, len2;
            // TODO optimization: check if within bounds first
            if (L.Polyline.prototype._containsPoint.call(this, p, true)) {
                // click on polygon border
                return true;
            }
            // ray casting algorithm for detecting if point is in polygon
            for (i = 0, len = this._parts.length; i < len; i++) {
                part = this._parts[i];
                for (j = 0, len2 = part.length, k = len2 - 1; j < len2; k = j++) {
                    p1 = part[j];
                    p2 = part[k];
                    if (p1.y > p.y !== p2.y > p.y && p.x < (p2.x - p1.x) * (p.y - p1.y) / (p2.y - p1.y) + p1.x) {
                        inside = !inside;
                    }
                }
            }
            return inside;
        }
    });
    /*
 * Extends L.Circle with Canvas-specific code.
 */
    L.Circle.include(!L.Path.CANVAS ? {} : {
        _drawPath: function() {
            var p = this._point;
            this._ctx.beginPath();
            this._ctx.arc(p.x, p.y, this._radius, 0, Math.PI * 2, false);
        },
        _containsPoint: function(p) {
            var center = this._point, w2 = this.options.stroke ? this.options.weight / 2 : 0;
            return p.distanceTo(center) <= this._radius + w2;
        }
    });
    /*
 * CircleMarker canvas specific drawing parts.
 */
    L.CircleMarker.include(!L.Path.CANVAS ? {} : {
        _updateStyle: function() {
            L.Path.prototype._updateStyle.call(this);
        }
    });
    /*
 * L.GeoJSON turns any GeoJSON data into a Leaflet layer.
 */
    L.GeoJSON = L.FeatureGroup.extend({
        initialize: function(geojson, options) {
            L.setOptions(this, options);
            this._layers = {};
            if (geojson) {
                this.addData(geojson);
            }
        },
        addData: function(geojson) {
            var features = L.Util.isArray(geojson) ? geojson : geojson.features, i, len, feature;
            if (features) {
                for (i = 0, len = features.length; i < len; i++) {
                    // Only add this if geometry or geometries are set and not null
                    feature = features[i];
                    if (feature.geometries || feature.geometry || feature.features || feature.coordinates) {
                        this.addData(features[i]);
                    }
                }
                return this;
            }
            var options = this.options;
            if (options.filter && !options.filter(geojson)) {
                return;
            }
            var layer = L.GeoJSON.geometryToLayer(geojson, options.pointToLayer, options.coordsToLatLng, options);
            layer.feature = L.GeoJSON.asFeature(geojson);
            layer.defaultOptions = layer.options;
            this.resetStyle(layer);
            if (options.onEachFeature) {
                options.onEachFeature(geojson, layer);
            }
            return this.addLayer(layer);
        },
        resetStyle: function(layer) {
            var style = this.options.style;
            if (style) {
                // reset any custom styles
                L.Util.extend(layer.options, layer.defaultOptions);
                this._setLayerStyle(layer, style);
            }
        },
        setStyle: function(style) {
            this.eachLayer(function(layer) {
                this._setLayerStyle(layer, style);
            }, this);
        },
        _setLayerStyle: function(layer, style) {
            if (typeof style === "function") {
                style = style(layer.feature);
            }
            if (layer.setStyle) {
                layer.setStyle(style);
            }
        }
    });
    L.extend(L.GeoJSON, {
        geometryToLayer: function(geojson, pointToLayer, coordsToLatLng, vectorOptions) {
            var geometry = geojson.type === "Feature" ? geojson.geometry : geojson, coords = geometry.coordinates, layers = [], latlng, latlngs, i, len;
            coordsToLatLng = coordsToLatLng || this.coordsToLatLng;
            switch (geometry.type) {
              case "Point":
                latlng = coordsToLatLng(coords);
                return pointToLayer ? pointToLayer(geojson, latlng) : new L.Marker(latlng);

              case "MultiPoint":
                for (i = 0, len = coords.length; i < len; i++) {
                    latlng = coordsToLatLng(coords[i]);
                    layers.push(pointToLayer ? pointToLayer(geojson, latlng) : new L.Marker(latlng));
                }
                return new L.FeatureGroup(layers);

              case "LineString":
                latlngs = this.coordsToLatLngs(coords, 0, coordsToLatLng);
                return new L.Polyline(latlngs, vectorOptions);

              case "Polygon":
                if (coords.length === 2 && !coords[1].length) {
                    throw new Error("Invalid GeoJSON object.");
                }
                latlngs = this.coordsToLatLngs(coords, 1, coordsToLatLng);
                return new L.Polygon(latlngs, vectorOptions);

              case "MultiLineString":
                latlngs = this.coordsToLatLngs(coords, 1, coordsToLatLng);
                return new L.MultiPolyline(latlngs, vectorOptions);

              case "MultiPolygon":
                latlngs = this.coordsToLatLngs(coords, 2, coordsToLatLng);
                return new L.MultiPolygon(latlngs, vectorOptions);

              case "GeometryCollection":
                for (i = 0, len = geometry.geometries.length; i < len; i++) {
                    layers.push(this.geometryToLayer({
                        geometry: geometry.geometries[i],
                        type: "Feature",
                        properties: geojson.properties
                    }, pointToLayer, coordsToLatLng, vectorOptions));
                }
                return new L.FeatureGroup(layers);

              default:
                throw new Error("Invalid GeoJSON object.");
            }
        },
        coordsToLatLng: function(coords) {
            // (Array[, Boolean]) -> LatLng
            return new L.LatLng(coords[1], coords[0], coords[2]);
        },
        coordsToLatLngs: function(coords, levelsDeep, coordsToLatLng) {
            // (Array[, Number, Function]) -> Array
            var latlng, i, len, latlngs = [];
            for (i = 0, len = coords.length; i < len; i++) {
                latlng = levelsDeep ? this.coordsToLatLngs(coords[i], levelsDeep - 1, coordsToLatLng) : (coordsToLatLng || this.coordsToLatLng)(coords[i]);
                latlngs.push(latlng);
            }
            return latlngs;
        },
        latLngToCoords: function(latlng) {
            var coords = [ latlng.lng, latlng.lat ];
            if (latlng.alt !== undefined) {
                coords.push(latlng.alt);
            }
            return coords;
        },
        latLngsToCoords: function(latLngs) {
            var coords = [];
            for (var i = 0, len = latLngs.length; i < len; i++) {
                coords.push(L.GeoJSON.latLngToCoords(latLngs[i]));
            }
            return coords;
        },
        getFeature: function(layer, newGeometry) {
            return layer.feature ? L.extend({}, layer.feature, {
                geometry: newGeometry
            }) : L.GeoJSON.asFeature(newGeometry);
        },
        asFeature: function(geoJSON) {
            if (geoJSON.type === "Feature") {
                return geoJSON;
            }
            return {
                type: "Feature",
                properties: {},
                geometry: geoJSON
            };
        }
    });
    var PointToGeoJSON = {
        toGeoJSON: function() {
            return L.GeoJSON.getFeature(this, {
                type: "Point",
                coordinates: L.GeoJSON.latLngToCoords(this.getLatLng())
            });
        }
    };
    L.Marker.include(PointToGeoJSON);
    L.Circle.include(PointToGeoJSON);
    L.CircleMarker.include(PointToGeoJSON);
    L.Polyline.include({
        toGeoJSON: function() {
            return L.GeoJSON.getFeature(this, {
                type: "LineString",
                coordinates: L.GeoJSON.latLngsToCoords(this.getLatLngs())
            });
        }
    });
    L.Polygon.include({
        toGeoJSON: function() {
            var coords = [ L.GeoJSON.latLngsToCoords(this.getLatLngs()) ], i, len, hole;
            coords[0].push(coords[0][0]);
            if (this._holes) {
                for (i = 0, len = this._holes.length; i < len; i++) {
                    hole = L.GeoJSON.latLngsToCoords(this._holes[i]);
                    hole.push(hole[0]);
                    coords.push(hole);
                }
            }
            return L.GeoJSON.getFeature(this, {
                type: "Polygon",
                coordinates: coords
            });
        }
    });
    (function() {
        function multiToGeoJSON(type) {
            return function() {
                var coords = [];
                this.eachLayer(function(layer) {
                    coords.push(layer.toGeoJSON().geometry.coordinates);
                });
                return L.GeoJSON.getFeature(this, {
                    type: type,
                    coordinates: coords
                });
            };
        }
        L.MultiPolyline.include({
            toGeoJSON: multiToGeoJSON("MultiLineString")
        });
        L.MultiPolygon.include({
            toGeoJSON: multiToGeoJSON("MultiPolygon")
        });
        L.LayerGroup.include({
            toGeoJSON: function() {
                var geometry = this.feature && this.feature.geometry, jsons = [], json;
                if (geometry && geometry.type === "MultiPoint") {
                    return multiToGeoJSON("MultiPoint").call(this);
                }
                var isGeometryCollection = geometry && geometry.type === "GeometryCollection";
                this.eachLayer(function(layer) {
                    if (layer.toGeoJSON) {
                        json = layer.toGeoJSON();
                        jsons.push(isGeometryCollection ? json.geometry : L.GeoJSON.asFeature(json));
                    }
                });
                if (isGeometryCollection) {
                    return L.GeoJSON.getFeature(this, {
                        geometries: jsons,
                        type: "GeometryCollection"
                    });
                }
                return {
                    type: "FeatureCollection",
                    features: jsons
                };
            }
        });
    })();
    L.geoJson = function(geojson, options) {
        return new L.GeoJSON(geojson, options);
    };
    /*
 * L.DomEvent contains functions for working with DOM events.
 */
    L.DomEvent = {
        /* inspired by John Resig, Dean Edwards and YUI addEvent implementations */
        addListener: function(obj, type, fn, context) {
            // (HTMLElement, String, Function[, Object])
            var id = L.stamp(fn), key = "_leaflet_" + type + id, handler, originalHandler, newType;
            if (obj[key]) {
                return this;
            }
            handler = function(e) {
                return fn.call(context || obj, e || L.DomEvent._getEvent());
            };
            if (L.Browser.pointer && type.indexOf("touch") === 0) {
                return this.addPointerListener(obj, type, handler, id);
            }
            if (L.Browser.touch && type === "dblclick" && this.addDoubleTapListener) {
                this.addDoubleTapListener(obj, handler, id);
            }
            if ("addEventListener" in obj) {
                if (type === "mousewheel") {
                    obj.addEventListener("DOMMouseScroll", handler, false);
                    obj.addEventListener(type, handler, false);
                } else if (type === "mouseenter" || type === "mouseleave") {
                    originalHandler = handler;
                    newType = type === "mouseenter" ? "mouseover" : "mouseout";
                    handler = function(e) {
                        if (!L.DomEvent._checkMouse(obj, e)) {
                            return;
                        }
                        return originalHandler(e);
                    };
                    obj.addEventListener(newType, handler, false);
                } else if (type === "click" && L.Browser.android) {
                    originalHandler = handler;
                    handler = function(e) {
                        return L.DomEvent._filterClick(e, originalHandler);
                    };
                    obj.addEventListener(type, handler, false);
                } else {
                    obj.addEventListener(type, handler, false);
                }
            } else if ("attachEvent" in obj) {
                obj.attachEvent("on" + type, handler);
            }
            obj[key] = handler;
            return this;
        },
        removeListener: function(obj, type, fn) {
            // (HTMLElement, String, Function)
            var id = L.stamp(fn), key = "_leaflet_" + type + id, handler = obj[key];
            if (!handler) {
                return this;
            }
            if (L.Browser.pointer && type.indexOf("touch") === 0) {
                this.removePointerListener(obj, type, id);
            } else if (L.Browser.touch && type === "dblclick" && this.removeDoubleTapListener) {
                this.removeDoubleTapListener(obj, id);
            } else if ("removeEventListener" in obj) {
                if (type === "mousewheel") {
                    obj.removeEventListener("DOMMouseScroll", handler, false);
                    obj.removeEventListener(type, handler, false);
                } else if (type === "mouseenter" || type === "mouseleave") {
                    obj.removeEventListener(type === "mouseenter" ? "mouseover" : "mouseout", handler, false);
                } else {
                    obj.removeEventListener(type, handler, false);
                }
            } else if ("detachEvent" in obj) {
                obj.detachEvent("on" + type, handler);
            }
            obj[key] = null;
            return this;
        },
        stopPropagation: function(e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            } else {
                e.cancelBubble = true;
            }
            L.DomEvent._skipped(e);
            return this;
        },
        disableScrollPropagation: function(el) {
            var stop = L.DomEvent.stopPropagation;
            return L.DomEvent.on(el, "mousewheel", stop).on(el, "MozMousePixelScroll", stop);
        },
        disableClickPropagation: function(el) {
            var stop = L.DomEvent.stopPropagation;
            for (var i = L.Draggable.START.length - 1; i >= 0; i--) {
                L.DomEvent.on(el, L.Draggable.START[i], stop);
            }
            return L.DomEvent.on(el, "click", L.DomEvent._fakeStop).on(el, "dblclick", stop);
        },
        preventDefault: function(e) {
            if (e.preventDefault) {
                e.preventDefault();
            } else {
                e.returnValue = false;
            }
            return this;
        },
        stop: function(e) {
            return L.DomEvent.preventDefault(e).stopPropagation(e);
        },
        getMousePosition: function(e, container) {
            if (!container) {
                return new L.Point(e.clientX, e.clientY);
            }
            var rect = container.getBoundingClientRect();
            return new L.Point(e.clientX - rect.left - container.clientLeft, e.clientY - rect.top - container.clientTop);
        },
        getWheelDelta: function(e) {
            var delta = 0;
            if (e.wheelDelta) {
                delta = e.wheelDelta / 120;
            }
            if (e.detail) {
                delta = -e.detail / 3;
            }
            return delta;
        },
        _skipEvents: {},
        _fakeStop: function(e) {
            // fakes stopPropagation by setting a special event flag, checked/reset with L.DomEvent._skipped(e)
            L.DomEvent._skipEvents[e.type] = true;
        },
        _skipped: function(e) {
            var skipped = this._skipEvents[e.type];
            // reset when checking, as it's only used in map container and propagates outside of the map
            this._skipEvents[e.type] = false;
            return skipped;
        },
        // check if element really left/entered the event target (for mouseenter/mouseleave)
        _checkMouse: function(el, e) {
            var related = e.relatedTarget;
            if (!related) {
                return true;
            }
            try {
                while (related && related !== el) {
                    related = related.parentNode;
                }
            } catch (err) {
                return false;
            }
            return related !== el;
        },
        _getEvent: function() {
            // evil magic for IE
            /*jshint noarg:false */
            var e = window.event;
            if (!e) {
                var caller = arguments.callee.caller;
                while (caller) {
                    e = caller["arguments"][0];
                    if (e && window.Event === e.constructor) {
                        break;
                    }
                    caller = caller.caller;
                }
            }
            return e;
        },
        // this is a horrible workaround for a bug in Android where a single touch triggers two click events
        _filterClick: function(e, handler) {
            var timeStamp = e.timeStamp || e.originalEvent.timeStamp, elapsed = L.DomEvent._lastClick && timeStamp - L.DomEvent._lastClick;
            // are they closer together than 500ms yet more than 100ms?
            // Android typically triggers them ~300ms apart while multiple listeners
            // on the same event should be triggered far faster;
            // or check if click is simulated on the element, and if it is, reject any non-simulated events
            if (elapsed && elapsed > 100 && elapsed < 500 || e.target._simulatedClick && !e._simulated) {
                L.DomEvent.stop(e);
                return;
            }
            L.DomEvent._lastClick = timeStamp;
            return handler(e);
        }
    };
    L.DomEvent.on = L.DomEvent.addListener;
    L.DomEvent.off = L.DomEvent.removeListener;
    /*
 * L.Draggable allows you to add dragging capabilities to any element. Supports mobile devices too.
 */
    L.Draggable = L.Class.extend({
        includes: L.Mixin.Events,
        statics: {
            START: L.Browser.touch ? [ "touchstart", "mousedown" ] : [ "mousedown" ],
            END: {
                mousedown: "mouseup",
                touchstart: "touchend",
                pointerdown: "touchend",
                MSPointerDown: "touchend"
            },
            MOVE: {
                mousedown: "mousemove",
                touchstart: "touchmove",
                pointerdown: "touchmove",
                MSPointerDown: "touchmove"
            }
        },
        initialize: function(element, dragStartTarget) {
            this._element = element;
            this._dragStartTarget = dragStartTarget || element;
        },
        enable: function() {
            if (this._enabled) {
                return;
            }
            for (var i = L.Draggable.START.length - 1; i >= 0; i--) {
                L.DomEvent.on(this._dragStartTarget, L.Draggable.START[i], this._onDown, this);
            }
            this._enabled = true;
        },
        disable: function() {
            if (!this._enabled) {
                return;
            }
            for (var i = L.Draggable.START.length - 1; i >= 0; i--) {
                L.DomEvent.off(this._dragStartTarget, L.Draggable.START[i], this._onDown, this);
            }
            this._enabled = false;
            this._moved = false;
        },
        _onDown: function(e) {
            this._moved = false;
            if (e.shiftKey || e.which !== 1 && e.button !== 1 && !e.touches) {
                return;
            }
            L.DomEvent.stopPropagation(e);
            if (L.Draggable._disabled) {
                return;
            }
            L.DomUtil.disableImageDrag();
            L.DomUtil.disableTextSelection();
            if (this._moving) {
                return;
            }
            var first = e.touches ? e.touches[0] : e;
            this._startPoint = new L.Point(first.clientX, first.clientY);
            this._startPos = this._newPos = L.DomUtil.getPosition(this._element);
            L.DomEvent.on(document, L.Draggable.MOVE[e.type], this._onMove, this).on(document, L.Draggable.END[e.type], this._onUp, this);
        },
        _onMove: function(e) {
            if (e.touches && e.touches.length > 1) {
                this._moved = true;
                return;
            }
            var first = e.touches && e.touches.length === 1 ? e.touches[0] : e, newPoint = new L.Point(first.clientX, first.clientY), offset = newPoint.subtract(this._startPoint);
            if (!offset.x && !offset.y) {
                return;
            }
            if (L.Browser.touch && Math.abs(offset.x) + Math.abs(offset.y) < 3) {
                return;
            }
            L.DomEvent.preventDefault(e);
            if (!this._moved) {
                this.fire("dragstart");
                this._moved = true;
                this._startPos = L.DomUtil.getPosition(this._element).subtract(offset);
                L.DomUtil.addClass(document.body, "leaflet-dragging");
                this._lastTarget = e.target || e.srcElement;
                L.DomUtil.addClass(this._lastTarget, "leaflet-drag-target");
            }
            this._newPos = this._startPos.add(offset);
            this._moving = true;
            L.Util.cancelAnimFrame(this._animRequest);
            this._animRequest = L.Util.requestAnimFrame(this._updatePosition, this, true, this._dragStartTarget);
        },
        _updatePosition: function() {
            this.fire("predrag");
            L.DomUtil.setPosition(this._element, this._newPos);
            this.fire("drag");
        },
        _onUp: function() {
            L.DomUtil.removeClass(document.body, "leaflet-dragging");
            if (this._lastTarget) {
                L.DomUtil.removeClass(this._lastTarget, "leaflet-drag-target");
                this._lastTarget = null;
            }
            for (var i in L.Draggable.MOVE) {
                L.DomEvent.off(document, L.Draggable.MOVE[i], this._onMove).off(document, L.Draggable.END[i], this._onUp);
            }
            L.DomUtil.enableImageDrag();
            L.DomUtil.enableTextSelection();
            if (this._moved && this._moving) {
                // ensure drag is not fired after dragend
                L.Util.cancelAnimFrame(this._animRequest);
                this.fire("dragend", {
                    distance: this._newPos.distanceTo(this._startPos)
                });
            }
            this._moving = false;
        }
    });
    /*
	L.Handler is a base class for handler classes that are used internally to inject
	interaction features like dragging to classes like Map and Marker.
*/
    L.Handler = L.Class.extend({
        initialize: function(map) {
            this._map = map;
        },
        enable: function() {
            if (this._enabled) {
                return;
            }
            this._enabled = true;
            this.addHooks();
        },
        disable: function() {
            if (!this._enabled) {
                return;
            }
            this._enabled = false;
            this.removeHooks();
        },
        enabled: function() {
            return !!this._enabled;
        }
    });
    /*
 * L.Handler.MapDrag is used to make the map draggable (with panning inertia), enabled by default.
 */
    L.Map.mergeOptions({
        dragging: true,
        inertia: !L.Browser.android23,
        inertiaDeceleration: 3400,
        // px/s^2
        inertiaMaxSpeed: Infinity,
        // px/s
        inertiaThreshold: L.Browser.touch ? 32 : 18,
        // ms
        easeLinearity: .25,
        // TODO refactor, move to CRS
        worldCopyJump: false
    });
    L.Map.Drag = L.Handler.extend({
        addHooks: function() {
            if (!this._draggable) {
                var map = this._map;
                this._draggable = new L.Draggable(map._mapPane, map._container);
                this._draggable.on({
                    dragstart: this._onDragStart,
                    drag: this._onDrag,
                    dragend: this._onDragEnd
                }, this);
                if (map.options.worldCopyJump) {
                    this._draggable.on("predrag", this._onPreDrag, this);
                    map.on("viewreset", this._onViewReset, this);
                    map.whenReady(this._onViewReset, this);
                }
            }
            this._draggable.enable();
        },
        removeHooks: function() {
            this._draggable.disable();
        },
        moved: function() {
            return this._draggable && this._draggable._moved;
        },
        _onDragStart: function() {
            var map = this._map;
            if (map._panAnim) {
                map._panAnim.stop();
            }
            map.fire("movestart").fire("dragstart");
            if (map.options.inertia) {
                this._positions = [];
                this._times = [];
            }
        },
        _onDrag: function() {
            if (this._map.options.inertia) {
                var time = this._lastTime = +new Date(), pos = this._lastPos = this._draggable._newPos;
                this._positions.push(pos);
                this._times.push(time);
                if (time - this._times[0] > 200) {
                    this._positions.shift();
                    this._times.shift();
                }
            }
            this._map.fire("move").fire("drag");
        },
        _onViewReset: function() {
            // TODO fix hardcoded Earth values
            var pxCenter = this._map.getSize()._divideBy(2), pxWorldCenter = this._map.latLngToLayerPoint([ 0, 0 ]);
            this._initialWorldOffset = pxWorldCenter.subtract(pxCenter).x;
            this._worldWidth = this._map.project([ 0, 180 ]).x;
        },
        _onPreDrag: function() {
            // TODO refactor to be able to adjust map pane position after zoom
            var worldWidth = this._worldWidth, halfWidth = Math.round(worldWidth / 2), dx = this._initialWorldOffset, x = this._draggable._newPos.x, newX1 = (x - halfWidth + dx) % worldWidth + halfWidth - dx, newX2 = (x + halfWidth + dx) % worldWidth - halfWidth - dx, newX = Math.abs(newX1 + dx) < Math.abs(newX2 + dx) ? newX1 : newX2;
            this._draggable._newPos.x = newX;
        },
        _onDragEnd: function(e) {
            var map = this._map, options = map.options, delay = +new Date() - this._lastTime, noInertia = !options.inertia || delay > options.inertiaThreshold || !this._positions[0];
            map.fire("dragend", e);
            if (noInertia) {
                map.fire("moveend");
            } else {
                var direction = this._lastPos.subtract(this._positions[0]), duration = (this._lastTime + delay - this._times[0]) / 1e3, ease = options.easeLinearity, speedVector = direction.multiplyBy(ease / duration), speed = speedVector.distanceTo([ 0, 0 ]), limitedSpeed = Math.min(options.inertiaMaxSpeed, speed), limitedSpeedVector = speedVector.multiplyBy(limitedSpeed / speed), decelerationDuration = limitedSpeed / (options.inertiaDeceleration * ease), offset = limitedSpeedVector.multiplyBy(-decelerationDuration / 2).round();
                if (!offset.x || !offset.y) {
                    map.fire("moveend");
                } else {
                    offset = map._limitOffset(offset, map.options.maxBounds);
                    L.Util.requestAnimFrame(function() {
                        map.panBy(offset, {
                            duration: decelerationDuration,
                            easeLinearity: ease,
                            noMoveStart: true
                        });
                    });
                }
            }
        }
    });
    L.Map.addInitHook("addHandler", "dragging", L.Map.Drag);
    /*
 * L.Handler.DoubleClickZoom is used to handle double-click zoom on the map, enabled by default.
 */
    L.Map.mergeOptions({
        doubleClickZoom: true
    });
    L.Map.DoubleClickZoom = L.Handler.extend({
        addHooks: function() {
            this._map.on("dblclick", this._onDoubleClick, this);
        },
        removeHooks: function() {
            this._map.off("dblclick", this._onDoubleClick, this);
        },
        _onDoubleClick: function(e) {
            var map = this._map, zoom = map.getZoom() + (e.originalEvent.shiftKey ? -1 : 1);
            if (map.options.doubleClickZoom === "center") {
                map.setZoom(zoom);
            } else {
                map.setZoomAround(e.containerPoint, zoom);
            }
        }
    });
    L.Map.addInitHook("addHandler", "doubleClickZoom", L.Map.DoubleClickZoom);
    /*
 * L.Handler.ScrollWheelZoom is used by L.Map to enable mouse scroll wheel zoom on the map.
 */
    L.Map.mergeOptions({
        scrollWheelZoom: true
    });
    L.Map.ScrollWheelZoom = L.Handler.extend({
        addHooks: function() {
            L.DomEvent.on(this._map._container, "mousewheel", this._onWheelScroll, this);
            L.DomEvent.on(this._map._container, "MozMousePixelScroll", L.DomEvent.preventDefault);
            this._delta = 0;
        },
        removeHooks: function() {
            L.DomEvent.off(this._map._container, "mousewheel", this._onWheelScroll);
            L.DomEvent.off(this._map._container, "MozMousePixelScroll", L.DomEvent.preventDefault);
        },
        _onWheelScroll: function(e) {
            var delta = L.DomEvent.getWheelDelta(e);
            this._delta += delta;
            this._lastMousePos = this._map.mouseEventToContainerPoint(e);
            if (!this._startTime) {
                this._startTime = +new Date();
            }
            var left = Math.max(40 - (+new Date() - this._startTime), 0);
            clearTimeout(this._timer);
            this._timer = setTimeout(L.bind(this._performZoom, this), left);
            L.DomEvent.preventDefault(e);
            L.DomEvent.stopPropagation(e);
        },
        _performZoom: function() {
            var map = this._map, delta = this._delta, zoom = map.getZoom();
            delta = delta > 0 ? Math.ceil(delta) : Math.floor(delta);
            delta = Math.max(Math.min(delta, 4), -4);
            delta = map._limitZoom(zoom + delta) - zoom;
            this._delta = 0;
            this._startTime = null;
            if (!delta) {
                return;
            }
            if (map.options.scrollWheelZoom === "center") {
                map.setZoom(zoom + delta);
            } else {
                map.setZoomAround(this._lastMousePos, zoom + delta);
            }
        }
    });
    L.Map.addInitHook("addHandler", "scrollWheelZoom", L.Map.ScrollWheelZoom);
    /*
 * Extends the event handling code with double tap support for mobile browsers.
 */
    L.extend(L.DomEvent, {
        _touchstart: L.Browser.msPointer ? "MSPointerDown" : L.Browser.pointer ? "pointerdown" : "touchstart",
        _touchend: L.Browser.msPointer ? "MSPointerUp" : L.Browser.pointer ? "pointerup" : "touchend",
        // inspired by Zepto touch code by Thomas Fuchs
        addDoubleTapListener: function(obj, handler, id) {
            var last, doubleTap = false, delay = 250, touch, pre = "_leaflet_", touchstart = this._touchstart, touchend = this._touchend, trackedTouches = [];
            function onTouchStart(e) {
                var count;
                if (L.Browser.pointer) {
                    trackedTouches.push(e.pointerId);
                    count = trackedTouches.length;
                } else {
                    count = e.touches.length;
                }
                if (count > 1) {
                    return;
                }
                var now = Date.now(), delta = now - (last || now);
                touch = e.touches ? e.touches[0] : e;
                doubleTap = delta > 0 && delta <= delay;
                last = now;
            }
            function onTouchEnd(e) {
                if (L.Browser.pointer) {
                    var idx = trackedTouches.indexOf(e.pointerId);
                    if (idx === -1) {
                        return;
                    }
                    trackedTouches.splice(idx, 1);
                }
                if (doubleTap) {
                    if (L.Browser.pointer) {
                        // work around .type being readonly with MSPointer* events
                        var newTouch = {}, prop;
                        // jshint forin:false
                        for (var i in touch) {
                            prop = touch[i];
                            if (typeof prop === "function") {
                                newTouch[i] = prop.bind(touch);
                            } else {
                                newTouch[i] = prop;
                            }
                        }
                        touch = newTouch;
                    }
                    touch.type = "dblclick";
                    handler(touch);
                    last = null;
                }
            }
            obj[pre + touchstart + id] = onTouchStart;
            obj[pre + touchend + id] = onTouchEnd;
            // on pointer we need to listen on the document, otherwise a drag starting on the map and moving off screen
            // will not come through to us, so we will lose track of how many touches are ongoing
            var endElement = L.Browser.pointer ? document.documentElement : obj;
            obj.addEventListener(touchstart, onTouchStart, false);
            endElement.addEventListener(touchend, onTouchEnd, false);
            if (L.Browser.pointer) {
                endElement.addEventListener(L.DomEvent.POINTER_CANCEL, onTouchEnd, false);
            }
            return this;
        },
        removeDoubleTapListener: function(obj, id) {
            var pre = "_leaflet_";
            obj.removeEventListener(this._touchstart, obj[pre + this._touchstart + id], false);
            (L.Browser.pointer ? document.documentElement : obj).removeEventListener(this._touchend, obj[pre + this._touchend + id], false);
            if (L.Browser.pointer) {
                document.documentElement.removeEventListener(L.DomEvent.POINTER_CANCEL, obj[pre + this._touchend + id], false);
            }
            return this;
        }
    });
    /*
 * Extends L.DomEvent to provide touch support for Internet Explorer and Windows-based devices.
 */
    L.extend(L.DomEvent, {
        //static
        POINTER_DOWN: L.Browser.msPointer ? "MSPointerDown" : "pointerdown",
        POINTER_MOVE: L.Browser.msPointer ? "MSPointerMove" : "pointermove",
        POINTER_UP: L.Browser.msPointer ? "MSPointerUp" : "pointerup",
        POINTER_CANCEL: L.Browser.msPointer ? "MSPointerCancel" : "pointercancel",
        _pointers: [],
        _pointerDocumentListener: false,
        // Provides a touch events wrapper for (ms)pointer events.
        // Based on changes by veproza https://github.com/CloudMade/Leaflet/pull/1019
        //ref http://www.w3.org/TR/pointerevents/ https://www.w3.org/Bugs/Public/show_bug.cgi?id=22890
        addPointerListener: function(obj, type, handler, id) {
            switch (type) {
              case "touchstart":
                return this.addPointerListenerStart(obj, type, handler, id);

              case "touchend":
                return this.addPointerListenerEnd(obj, type, handler, id);

              case "touchmove":
                return this.addPointerListenerMove(obj, type, handler, id);

              default:
                throw "Unknown touch event type";
            }
        },
        addPointerListenerStart: function(obj, type, handler, id) {
            var pre = "_leaflet_", pointers = this._pointers;
            var cb = function(e) {
                L.DomEvent.preventDefault(e);
                var alreadyInArray = false;
                for (var i = 0; i < pointers.length; i++) {
                    if (pointers[i].pointerId === e.pointerId) {
                        alreadyInArray = true;
                        break;
                    }
                }
                if (!alreadyInArray) {
                    pointers.push(e);
                }
                e.touches = pointers.slice();
                e.changedTouches = [ e ];
                handler(e);
            };
            obj[pre + "touchstart" + id] = cb;
            obj.addEventListener(this.POINTER_DOWN, cb, false);
            // need to also listen for end events to keep the _pointers list accurate
            // this needs to be on the body and never go away
            if (!this._pointerDocumentListener) {
                var internalCb = function(e) {
                    for (var i = 0; i < pointers.length; i++) {
                        if (pointers[i].pointerId === e.pointerId) {
                            pointers.splice(i, 1);
                            break;
                        }
                    }
                };
                //We listen on the documentElement as any drags that end by moving the touch off the screen get fired there
                document.documentElement.addEventListener(this.POINTER_UP, internalCb, false);
                document.documentElement.addEventListener(this.POINTER_CANCEL, internalCb, false);
                this._pointerDocumentListener = true;
            }
            return this;
        },
        addPointerListenerMove: function(obj, type, handler, id) {
            var pre = "_leaflet_", touches = this._pointers;
            function cb(e) {
                // don't fire touch moves when mouse isn't down
                if ((e.pointerType === e.MSPOINTER_TYPE_MOUSE || e.pointerType === "mouse") && e.buttons === 0) {
                    return;
                }
                for (var i = 0; i < touches.length; i++) {
                    if (touches[i].pointerId === e.pointerId) {
                        touches[i] = e;
                        break;
                    }
                }
                e.touches = touches.slice();
                e.changedTouches = [ e ];
                handler(e);
            }
            obj[pre + "touchmove" + id] = cb;
            obj.addEventListener(this.POINTER_MOVE, cb, false);
            return this;
        },
        addPointerListenerEnd: function(obj, type, handler, id) {
            var pre = "_leaflet_", touches = this._pointers;
            var cb = function(e) {
                for (var i = 0; i < touches.length; i++) {
                    if (touches[i].pointerId === e.pointerId) {
                        touches.splice(i, 1);
                        break;
                    }
                }
                e.touches = touches.slice();
                e.changedTouches = [ e ];
                handler(e);
            };
            obj[pre + "touchend" + id] = cb;
            obj.addEventListener(this.POINTER_UP, cb, false);
            obj.addEventListener(this.POINTER_CANCEL, cb, false);
            return this;
        },
        removePointerListener: function(obj, type, id) {
            var pre = "_leaflet_", cb = obj[pre + type + id];
            switch (type) {
              case "touchstart":
                obj.removeEventListener(this.POINTER_DOWN, cb, false);
                break;

              case "touchmove":
                obj.removeEventListener(this.POINTER_MOVE, cb, false);
                break;

              case "touchend":
                obj.removeEventListener(this.POINTER_UP, cb, false);
                obj.removeEventListener(this.POINTER_CANCEL, cb, false);
                break;
            }
            return this;
        }
    });
    /*
 * L.Handler.TouchZoom is used by L.Map to add pinch zoom on supported mobile browsers.
 */
    L.Map.mergeOptions({
        touchZoom: L.Browser.touch && !L.Browser.android23,
        bounceAtZoomLimits: true
    });
    L.Map.TouchZoom = L.Handler.extend({
        addHooks: function() {
            L.DomEvent.on(this._map._container, "touchstart", this._onTouchStart, this);
        },
        removeHooks: function() {
            L.DomEvent.off(this._map._container, "touchstart", this._onTouchStart, this);
        },
        _onTouchStart: function(e) {
            var map = this._map;
            if (!e.touches || e.touches.length !== 2 || map._animatingZoom || this._zooming) {
                return;
            }
            var p1 = map.mouseEventToLayerPoint(e.touches[0]), p2 = map.mouseEventToLayerPoint(e.touches[1]), viewCenter = map._getCenterLayerPoint();
            this._startCenter = p1.add(p2)._divideBy(2);
            this._startDist = p1.distanceTo(p2);
            this._moved = false;
            this._zooming = true;
            this._centerOffset = viewCenter.subtract(this._startCenter);
            if (map._panAnim) {
                map._panAnim.stop();
            }
            L.DomEvent.on(document, "touchmove", this._onTouchMove, this).on(document, "touchend", this._onTouchEnd, this);
            L.DomEvent.preventDefault(e);
        },
        _onTouchMove: function(e) {
            var map = this._map;
            if (!e.touches || e.touches.length !== 2 || !this._zooming) {
                return;
            }
            var p1 = map.mouseEventToLayerPoint(e.touches[0]), p2 = map.mouseEventToLayerPoint(e.touches[1]);
            this._scale = p1.distanceTo(p2) / this._startDist;
            this._delta = p1._add(p2)._divideBy(2)._subtract(this._startCenter);
            if (this._scale === 1) {
                return;
            }
            if (!map.options.bounceAtZoomLimits) {
                if (map.getZoom() === map.getMinZoom() && this._scale < 1 || map.getZoom() === map.getMaxZoom() && this._scale > 1) {
                    return;
                }
            }
            if (!this._moved) {
                L.DomUtil.addClass(map._mapPane, "leaflet-touching");
                map.fire("movestart").fire("zoomstart");
                this._moved = true;
            }
            L.Util.cancelAnimFrame(this._animRequest);
            this._animRequest = L.Util.requestAnimFrame(this._updateOnMove, this, true, this._map._container);
            L.DomEvent.preventDefault(e);
        },
        _updateOnMove: function() {
            var map = this._map, origin = this._getScaleOrigin(), center = map.layerPointToLatLng(origin), zoom = map.getScaleZoom(this._scale);
            map._animateZoom(center, zoom, this._startCenter, this._scale, this._delta, false, true);
        },
        _onTouchEnd: function() {
            if (!this._moved || !this._zooming) {
                this._zooming = false;
                return;
            }
            var map = this._map;
            this._zooming = false;
            L.DomUtil.removeClass(map._mapPane, "leaflet-touching");
            L.Util.cancelAnimFrame(this._animRequest);
            L.DomEvent.off(document, "touchmove", this._onTouchMove).off(document, "touchend", this._onTouchEnd);
            var origin = this._getScaleOrigin(), center = map.layerPointToLatLng(origin), oldZoom = map.getZoom(), floatZoomDelta = map.getScaleZoom(this._scale) - oldZoom, roundZoomDelta = floatZoomDelta > 0 ? Math.ceil(floatZoomDelta) : Math.floor(floatZoomDelta), zoom = map._limitZoom(oldZoom + roundZoomDelta), scale = map.getZoomScale(zoom) / this._scale;
            map._animateZoom(center, zoom, origin, scale);
        },
        _getScaleOrigin: function() {
            var centerOffset = this._centerOffset.subtract(this._delta).divideBy(this._scale);
            return this._startCenter.add(centerOffset);
        }
    });
    L.Map.addInitHook("addHandler", "touchZoom", L.Map.TouchZoom);
    /*
 * L.Map.Tap is used to enable mobile hacks like quick taps and long hold.
 */
    L.Map.mergeOptions({
        tap: true,
        tapTolerance: 15
    });
    L.Map.Tap = L.Handler.extend({
        addHooks: function() {
            L.DomEvent.on(this._map._container, "touchstart", this._onDown, this);
        },
        removeHooks: function() {
            L.DomEvent.off(this._map._container, "touchstart", this._onDown, this);
        },
        _onDown: function(e) {
            if (!e.touches) {
                return;
            }
            L.DomEvent.preventDefault(e);
            this._fireClick = true;
            // don't simulate click or track longpress if more than 1 touch
            if (e.touches.length > 1) {
                this._fireClick = false;
                clearTimeout(this._holdTimeout);
                return;
            }
            var first = e.touches[0], el = first.target;
            this._startPos = this._newPos = new L.Point(first.clientX, first.clientY);
            // if touching a link, highlight it
            if (el.tagName && el.tagName.toLowerCase() === "a") {
                L.DomUtil.addClass(el, "leaflet-active");
            }
            // simulate long hold but setting a timeout
            this._holdTimeout = setTimeout(L.bind(function() {
                if (this._isTapValid()) {
                    this._fireClick = false;
                    this._onUp();
                    this._simulateEvent("contextmenu", first);
                }
            }, this), 1e3);
            L.DomEvent.on(document, "touchmove", this._onMove, this).on(document, "touchend", this._onUp, this);
        },
        _onUp: function(e) {
            clearTimeout(this._holdTimeout);
            L.DomEvent.off(document, "touchmove", this._onMove, this).off(document, "touchend", this._onUp, this);
            if (this._fireClick && e && e.changedTouches) {
                var first = e.changedTouches[0], el = first.target;
                if (el && el.tagName && el.tagName.toLowerCase() === "a") {
                    L.DomUtil.removeClass(el, "leaflet-active");
                }
                // simulate click if the touch didn't move too much
                if (this._isTapValid()) {
                    this._simulateEvent("click", first);
                }
            }
        },
        _isTapValid: function() {
            return this._newPos.distanceTo(this._startPos) <= this._map.options.tapTolerance;
        },
        _onMove: function(e) {
            var first = e.touches[0];
            this._newPos = new L.Point(first.clientX, first.clientY);
        },
        _simulateEvent: function(type, e) {
            var simulatedEvent = document.createEvent("MouseEvents");
            simulatedEvent._simulated = true;
            e.target._simulatedClick = true;
            simulatedEvent.initMouseEvent(type, true, true, window, 1, e.screenX, e.screenY, e.clientX, e.clientY, false, false, false, false, 0, null);
            e.target.dispatchEvent(simulatedEvent);
        }
    });
    if (L.Browser.touch && !L.Browser.pointer) {
        L.Map.addInitHook("addHandler", "tap", L.Map.Tap);
    }
    /*
 * L.Handler.ShiftDragZoom is used to add shift-drag zoom interaction to the map
  * (zoom to a selected bounding box), enabled by default.
 */
    L.Map.mergeOptions({
        boxZoom: true
    });
    L.Map.BoxZoom = L.Handler.extend({
        initialize: function(map) {
            this._map = map;
            this._container = map._container;
            this._pane = map._panes.overlayPane;
            this._moved = false;
        },
        addHooks: function() {
            L.DomEvent.on(this._container, "mousedown", this._onMouseDown, this);
        },
        removeHooks: function() {
            L.DomEvent.off(this._container, "mousedown", this._onMouseDown);
            this._moved = false;
        },
        moved: function() {
            return this._moved;
        },
        _onMouseDown: function(e) {
            this._moved = false;
            if (!e.shiftKey || e.which !== 1 && e.button !== 1) {
                return false;
            }
            L.DomUtil.disableTextSelection();
            L.DomUtil.disableImageDrag();
            this._startLayerPoint = this._map.mouseEventToLayerPoint(e);
            L.DomEvent.on(document, "mousemove", this._onMouseMove, this).on(document, "mouseup", this._onMouseUp, this).on(document, "keydown", this._onKeyDown, this);
        },
        _onMouseMove: function(e) {
            if (!this._moved) {
                this._box = L.DomUtil.create("div", "leaflet-zoom-box", this._pane);
                L.DomUtil.setPosition(this._box, this._startLayerPoint);
                //TODO refactor: move cursor to styles
                this._container.style.cursor = "crosshair";
                this._map.fire("boxzoomstart");
            }
            var startPoint = this._startLayerPoint, box = this._box, layerPoint = this._map.mouseEventToLayerPoint(e), offset = layerPoint.subtract(startPoint), newPos = new L.Point(Math.min(layerPoint.x, startPoint.x), Math.min(layerPoint.y, startPoint.y));
            L.DomUtil.setPosition(box, newPos);
            this._moved = true;
            // TODO refactor: remove hardcoded 4 pixels
            box.style.width = Math.max(0, Math.abs(offset.x) - 4) + "px";
            box.style.height = Math.max(0, Math.abs(offset.y) - 4) + "px";
        },
        _finish: function() {
            if (this._moved) {
                this._pane.removeChild(this._box);
                this._container.style.cursor = "";
            }
            L.DomUtil.enableTextSelection();
            L.DomUtil.enableImageDrag();
            L.DomEvent.off(document, "mousemove", this._onMouseMove).off(document, "mouseup", this._onMouseUp).off(document, "keydown", this._onKeyDown);
        },
        _onMouseUp: function(e) {
            this._finish();
            var map = this._map, layerPoint = map.mouseEventToLayerPoint(e);
            if (this._startLayerPoint.equals(layerPoint)) {
                return;
            }
            var bounds = new L.LatLngBounds(map.layerPointToLatLng(this._startLayerPoint), map.layerPointToLatLng(layerPoint));
            map.fitBounds(bounds);
            map.fire("boxzoomend", {
                boxZoomBounds: bounds
            });
        },
        _onKeyDown: function(e) {
            if (e.keyCode === 27) {
                this._finish();
            }
        }
    });
    L.Map.addInitHook("addHandler", "boxZoom", L.Map.BoxZoom);
    /*
 * L.Map.Keyboard is handling keyboard interaction with the map, enabled by default.
 */
    L.Map.mergeOptions({
        keyboard: true,
        keyboardPanOffset: 80,
        keyboardZoomOffset: 1
    });
    L.Map.Keyboard = L.Handler.extend({
        keyCodes: {
            left: [ 37 ],
            right: [ 39 ],
            down: [ 40 ],
            up: [ 38 ],
            zoomIn: [ 187, 107, 61, 171 ],
            zoomOut: [ 189, 109, 173 ]
        },
        initialize: function(map) {
            this._map = map;
            this._setPanOffset(map.options.keyboardPanOffset);
            this._setZoomOffset(map.options.keyboardZoomOffset);
        },
        addHooks: function() {
            var container = this._map._container;
            // make the container focusable by tabbing
            if (container.tabIndex === -1) {
                container.tabIndex = "0";
            }
            L.DomEvent.on(container, "focus", this._onFocus, this).on(container, "blur", this._onBlur, this).on(container, "mousedown", this._onMouseDown, this);
            this._map.on("focus", this._addHooks, this).on("blur", this._removeHooks, this);
        },
        removeHooks: function() {
            this._removeHooks();
            var container = this._map._container;
            L.DomEvent.off(container, "focus", this._onFocus, this).off(container, "blur", this._onBlur, this).off(container, "mousedown", this._onMouseDown, this);
            this._map.off("focus", this._addHooks, this).off("blur", this._removeHooks, this);
        },
        _onMouseDown: function() {
            if (this._focused) {
                return;
            }
            var body = document.body, docEl = document.documentElement, top = body.scrollTop || docEl.scrollTop, left = body.scrollLeft || docEl.scrollLeft;
            this._map._container.focus();
            window.scrollTo(left, top);
        },
        _onFocus: function() {
            this._focused = true;
            this._map.fire("focus");
        },
        _onBlur: function() {
            this._focused = false;
            this._map.fire("blur");
        },
        _setPanOffset: function(pan) {
            var keys = this._panKeys = {}, codes = this.keyCodes, i, len;
            for (i = 0, len = codes.left.length; i < len; i++) {
                keys[codes.left[i]] = [ -1 * pan, 0 ];
            }
            for (i = 0, len = codes.right.length; i < len; i++) {
                keys[codes.right[i]] = [ pan, 0 ];
            }
            for (i = 0, len = codes.down.length; i < len; i++) {
                keys[codes.down[i]] = [ 0, pan ];
            }
            for (i = 0, len = codes.up.length; i < len; i++) {
                keys[codes.up[i]] = [ 0, -1 * pan ];
            }
        },
        _setZoomOffset: function(zoom) {
            var keys = this._zoomKeys = {}, codes = this.keyCodes, i, len;
            for (i = 0, len = codes.zoomIn.length; i < len; i++) {
                keys[codes.zoomIn[i]] = zoom;
            }
            for (i = 0, len = codes.zoomOut.length; i < len; i++) {
                keys[codes.zoomOut[i]] = -zoom;
            }
        },
        _addHooks: function() {
            L.DomEvent.on(document, "keydown", this._onKeyDown, this);
        },
        _removeHooks: function() {
            L.DomEvent.off(document, "keydown", this._onKeyDown, this);
        },
        _onKeyDown: function(e) {
            var key = e.keyCode, map = this._map;
            if (key in this._panKeys) {
                if (map._panAnim && map._panAnim._inProgress) {
                    return;
                }
                map.panBy(this._panKeys[key]);
                if (map.options.maxBounds) {
                    map.panInsideBounds(map.options.maxBounds);
                }
            } else if (key in this._zoomKeys) {
                map.setZoom(map.getZoom() + this._zoomKeys[key]);
            } else {
                return;
            }
            L.DomEvent.stop(e);
        }
    });
    L.Map.addInitHook("addHandler", "keyboard", L.Map.Keyboard);
    /*
 * L.Handler.MarkerDrag is used internally by L.Marker to make the markers draggable.
 */
    L.Handler.MarkerDrag = L.Handler.extend({
        initialize: function(marker) {
            this._marker = marker;
        },
        addHooks: function() {
            var icon = this._marker._icon;
            if (!this._draggable) {
                this._draggable = new L.Draggable(icon, icon);
            }
            this._draggable.on("dragstart", this._onDragStart, this).on("drag", this._onDrag, this).on("dragend", this._onDragEnd, this);
            this._draggable.enable();
            L.DomUtil.addClass(this._marker._icon, "leaflet-marker-draggable");
        },
        removeHooks: function() {
            this._draggable.off("dragstart", this._onDragStart, this).off("drag", this._onDrag, this).off("dragend", this._onDragEnd, this);
            this._draggable.disable();
            L.DomUtil.removeClass(this._marker._icon, "leaflet-marker-draggable");
        },
        moved: function() {
            return this._draggable && this._draggable._moved;
        },
        _onDragStart: function() {
            this._marker.closePopup().fire("movestart").fire("dragstart");
        },
        _onDrag: function() {
            var marker = this._marker, shadow = marker._shadow, iconPos = L.DomUtil.getPosition(marker._icon), latlng = marker._map.layerPointToLatLng(iconPos);
            // update shadow position
            if (shadow) {
                L.DomUtil.setPosition(shadow, iconPos);
            }
            marker._latlng = latlng;
            marker.fire("move", {
                latlng: latlng
            }).fire("drag");
        },
        _onDragEnd: function(e) {
            this._marker.fire("moveend").fire("dragend", e);
        }
    });
    /*
 * L.Control is a base class for implementing map controls. Handles positioning.
 * All other controls extend from this class.
 */
    L.Control = L.Class.extend({
        options: {
            position: "topright"
        },
        initialize: function(options) {
            L.setOptions(this, options);
        },
        getPosition: function() {
            return this.options.position;
        },
        setPosition: function(position) {
            var map = this._map;
            if (map) {
                map.removeControl(this);
            }
            this.options.position = position;
            if (map) {
                map.addControl(this);
            }
            return this;
        },
        getContainer: function() {
            return this._container;
        },
        addTo: function(map) {
            this._map = map;
            var container = this._container = this.onAdd(map), pos = this.getPosition(), corner = map._controlCorners[pos];
            L.DomUtil.addClass(container, "leaflet-control");
            if (pos.indexOf("bottom") !== -1) {
                corner.insertBefore(container, corner.firstChild);
            } else {
                corner.appendChild(container);
            }
            return this;
        },
        removeFrom: function(map) {
            var pos = this.getPosition(), corner = map._controlCorners[pos];
            corner.removeChild(this._container);
            this._map = null;
            if (this.onRemove) {
                this.onRemove(map);
            }
            return this;
        },
        _refocusOnMap: function() {
            if (this._map) {
                this._map.getContainer().focus();
            }
        }
    });
    L.control = function(options) {
        return new L.Control(options);
    };
    // adds control-related methods to L.Map
    L.Map.include({
        addControl: function(control) {
            control.addTo(this);
            return this;
        },
        removeControl: function(control) {
            control.removeFrom(this);
            return this;
        },
        _initControlPos: function() {
            var corners = this._controlCorners = {}, l = "leaflet-", container = this._controlContainer = L.DomUtil.create("div", l + "control-container", this._container);
            function createCorner(vSide, hSide) {
                var className = l + vSide + " " + l + hSide;
                corners[vSide + hSide] = L.DomUtil.create("div", className, container);
            }
            createCorner("top", "left");
            createCorner("top", "right");
            createCorner("bottom", "left");
            createCorner("bottom", "right");
        },
        _clearControlPos: function() {
            this._container.removeChild(this._controlContainer);
        }
    });
    /*
 * L.Control.Zoom is used for the default zoom buttons on the map.
 */
    L.Control.Zoom = L.Control.extend({
        options: {
            position: "topleft",
            zoomInText: "+",
            zoomInTitle: "Zoom in",
            zoomOutText: "-",
            zoomOutTitle: "Zoom out"
        },
        onAdd: function(map) {
            var zoomName = "leaflet-control-zoom", container = L.DomUtil.create("div", zoomName + " leaflet-bar");
            this._map = map;
            this._zoomInButton = this._createButton(this.options.zoomInText, this.options.zoomInTitle, zoomName + "-in", container, this._zoomIn, this);
            this._zoomOutButton = this._createButton(this.options.zoomOutText, this.options.zoomOutTitle, zoomName + "-out", container, this._zoomOut, this);
            this._updateDisabled();
            map.on("zoomend zoomlevelschange", this._updateDisabled, this);
            return container;
        },
        onRemove: function(map) {
            map.off("zoomend zoomlevelschange", this._updateDisabled, this);
        },
        _zoomIn: function(e) {
            this._map.zoomIn(e.shiftKey ? 3 : 1);
        },
        _zoomOut: function(e) {
            this._map.zoomOut(e.shiftKey ? 3 : 1);
        },
        _createButton: function(html, title, className, container, fn, context) {
            var link = L.DomUtil.create("a", className, container);
            link.innerHTML = html;
            link.href = "#";
            link.title = title;
            var stop = L.DomEvent.stopPropagation;
            L.DomEvent.on(link, "click", stop).on(link, "mousedown", stop).on(link, "dblclick", stop).on(link, "click", L.DomEvent.preventDefault).on(link, "click", fn, context).on(link, "click", this._refocusOnMap, context);
            return link;
        },
        _updateDisabled: function() {
            var map = this._map, className = "leaflet-disabled";
            L.DomUtil.removeClass(this._zoomInButton, className);
            L.DomUtil.removeClass(this._zoomOutButton, className);
            if (map._zoom === map.getMinZoom()) {
                L.DomUtil.addClass(this._zoomOutButton, className);
            }
            if (map._zoom === map.getMaxZoom()) {
                L.DomUtil.addClass(this._zoomInButton, className);
            }
        }
    });
    L.Map.mergeOptions({
        zoomControl: true
    });
    L.Map.addInitHook(function() {
        if (this.options.zoomControl) {
            this.zoomControl = new L.Control.Zoom();
            this.addControl(this.zoomControl);
        }
    });
    L.control.zoom = function(options) {
        return new L.Control.Zoom(options);
    };
    /*
 * L.Control.Attribution is used for displaying attribution on the map (added by default).
 */
    L.Control.Attribution = L.Control.extend({
        options: {
            position: "bottomright",
            prefix: '<a href="http://leafletjs.com" title="A JS library for interactive maps">Leaflet</a>'
        },
        initialize: function(options) {
            L.setOptions(this, options);
            this._attributions = {};
        },
        onAdd: function(map) {
            this._container = L.DomUtil.create("div", "leaflet-control-attribution");
            L.DomEvent.disableClickPropagation(this._container);
            for (var i in map._layers) {
                if (map._layers[i].getAttribution) {
                    this.addAttribution(map._layers[i].getAttribution());
                }
            }
            map.on("layeradd", this._onLayerAdd, this).on("layerremove", this._onLayerRemove, this);
            this._update();
            return this._container;
        },
        onRemove: function(map) {
            map.off("layeradd", this._onLayerAdd).off("layerremove", this._onLayerRemove);
        },
        setPrefix: function(prefix) {
            this.options.prefix = prefix;
            this._update();
            return this;
        },
        addAttribution: function(text) {
            if (!text) {
                return;
            }
            if (!this._attributions[text]) {
                this._attributions[text] = 0;
            }
            this._attributions[text]++;
            this._update();
            return this;
        },
        removeAttribution: function(text) {
            if (!text) {
                return;
            }
            if (this._attributions[text]) {
                this._attributions[text]--;
                this._update();
            }
            return this;
        },
        _update: function() {
            if (!this._map) {
                return;
            }
            var attribs = [];
            for (var i in this._attributions) {
                if (this._attributions[i]) {
                    attribs.push(i);
                }
            }
            var prefixAndAttribs = [];
            if (this.options.prefix) {
                prefixAndAttribs.push(this.options.prefix);
            }
            if (attribs.length) {
                prefixAndAttribs.push(attribs.join(", "));
            }
            this._container.innerHTML = prefixAndAttribs.join(" | ");
        },
        _onLayerAdd: function(e) {
            if (e.layer.getAttribution) {
                this.addAttribution(e.layer.getAttribution());
            }
        },
        _onLayerRemove: function(e) {
            if (e.layer.getAttribution) {
                this.removeAttribution(e.layer.getAttribution());
            }
        }
    });
    L.Map.mergeOptions({
        attributionControl: true
    });
    L.Map.addInitHook(function() {
        if (this.options.attributionControl) {
            this.attributionControl = new L.Control.Attribution().addTo(this);
        }
    });
    L.control.attribution = function(options) {
        return new L.Control.Attribution(options);
    };
    /*
 * L.Control.Scale is used for displaying metric/imperial scale on the map.
 */
    L.Control.Scale = L.Control.extend({
        options: {
            position: "bottomleft",
            maxWidth: 100,
            metric: true,
            imperial: true,
            updateWhenIdle: false
        },
        onAdd: function(map) {
            this._map = map;
            var className = "leaflet-control-scale", container = L.DomUtil.create("div", className), options = this.options;
            this._addScales(options, className, container);
            map.on(options.updateWhenIdle ? "moveend" : "move", this._update, this);
            map.whenReady(this._update, this);
            return container;
        },
        onRemove: function(map) {
            map.off(this.options.updateWhenIdle ? "moveend" : "move", this._update, this);
        },
        _addScales: function(options, className, container) {
            if (options.metric) {
                this._mScale = L.DomUtil.create("div", className + "-line", container);
            }
            if (options.imperial) {
                this._iScale = L.DomUtil.create("div", className + "-line", container);
            }
        },
        _update: function() {
            var bounds = this._map.getBounds(), centerLat = bounds.getCenter().lat, halfWorldMeters = 6378137 * Math.PI * Math.cos(centerLat * Math.PI / 180), dist = halfWorldMeters * (bounds.getNorthEast().lng - bounds.getSouthWest().lng) / 180, size = this._map.getSize(), options = this.options, maxMeters = 0;
            if (size.x > 0) {
                maxMeters = dist * (options.maxWidth / size.x);
            }
            this._updateScales(options, maxMeters);
        },
        _updateScales: function(options, maxMeters) {
            if (options.metric && maxMeters) {
                this._updateMetric(maxMeters);
            }
            if (options.imperial && maxMeters) {
                this._updateImperial(maxMeters);
            }
        },
        _updateMetric: function(maxMeters) {
            var meters = this._getRoundNum(maxMeters);
            this._mScale.style.width = this._getScaleWidth(meters / maxMeters) + "px";
            this._mScale.innerHTML = meters < 1e3 ? meters + " m" : meters / 1e3 + " km";
        },
        _updateImperial: function(maxMeters) {
            var maxFeet = maxMeters * 3.2808399, scale = this._iScale, maxMiles, miles, feet;
            if (maxFeet > 5280) {
                maxMiles = maxFeet / 5280;
                miles = this._getRoundNum(maxMiles);
                scale.style.width = this._getScaleWidth(miles / maxMiles) + "px";
                scale.innerHTML = miles + " mi";
            } else {
                feet = this._getRoundNum(maxFeet);
                scale.style.width = this._getScaleWidth(feet / maxFeet) + "px";
                scale.innerHTML = feet + " ft";
            }
        },
        _getScaleWidth: function(ratio) {
            return Math.round(this.options.maxWidth * ratio) - 10;
        },
        _getRoundNum: function(num) {
            var pow10 = Math.pow(10, (Math.floor(num) + "").length - 1), d = num / pow10;
            d = d >= 10 ? 10 : d >= 5 ? 5 : d >= 3 ? 3 : d >= 2 ? 2 : 1;
            return pow10 * d;
        }
    });
    L.control.scale = function(options) {
        return new L.Control.Scale(options);
    };
    /*
 * L.Control.Layers is a control to allow users to switch between different layers on the map.
 */
    L.Control.Layers = L.Control.extend({
        options: {
            collapsed: true,
            position: "topright",
            autoZIndex: true
        },
        initialize: function(baseLayers, overlays, options) {
            L.setOptions(this, options);
            this._layers = {};
            this._lastZIndex = 0;
            this._handlingClick = false;
            for (var i in baseLayers) {
                this._addLayer(baseLayers[i], i);
            }
            for (i in overlays) {
                this._addLayer(overlays[i], i, true);
            }
        },
        onAdd: function(map) {
            this._initLayout();
            this._update();
            map.on("layeradd", this._onLayerChange, this).on("layerremove", this._onLayerChange, this);
            return this._container;
        },
        onRemove: function(map) {
            map.off("layeradd", this._onLayerChange, this).off("layerremove", this._onLayerChange, this);
        },
        addBaseLayer: function(layer, name) {
            this._addLayer(layer, name);
            this._update();
            return this;
        },
        addOverlay: function(layer, name) {
            this._addLayer(layer, name, true);
            this._update();
            return this;
        },
        removeLayer: function(layer) {
            var id = L.stamp(layer);
            delete this._layers[id];
            this._update();
            return this;
        },
        _initLayout: function() {
            var className = "leaflet-control-layers", container = this._container = L.DomUtil.create("div", className);
            //Makes this work on IE10 Touch devices by stopping it from firing a mouseout event when the touch is released
            container.setAttribute("aria-haspopup", true);
            if (!L.Browser.touch) {
                L.DomEvent.disableClickPropagation(container).disableScrollPropagation(container);
            } else {
                L.DomEvent.on(container, "click", L.DomEvent.stopPropagation);
            }
            var form = this._form = L.DomUtil.create("form", className + "-list");
            if (this.options.collapsed) {
                if (!L.Browser.android) {
                    L.DomEvent.on(container, "mouseover", this._expand, this).on(container, "mouseout", this._collapse, this);
                }
                var link = this._layersLink = L.DomUtil.create("a", className + "-toggle", container);
                link.href = "#";
                link.title = "Layers";
                if (L.Browser.touch) {
                    L.DomEvent.on(link, "click", L.DomEvent.stop).on(link, "click", this._expand, this);
                } else {
                    L.DomEvent.on(link, "focus", this._expand, this);
                }
                //Work around for Firefox android issue https://github.com/Leaflet/Leaflet/issues/2033
                L.DomEvent.on(form, "click", function() {
                    setTimeout(L.bind(this._onInputClick, this), 0);
                }, this);
                this._map.on("click", this._collapse, this);
            } else {
                this._expand();
            }
            this._baseLayersList = L.DomUtil.create("div", className + "-base", form);
            this._separator = L.DomUtil.create("div", className + "-separator", form);
            this._overlaysList = L.DomUtil.create("div", className + "-overlays", form);
            container.appendChild(form);
        },
        _addLayer: function(layer, name, overlay) {
            var id = L.stamp(layer);
            this._layers[id] = {
                layer: layer,
                name: name,
                overlay: overlay
            };
            if (this.options.autoZIndex && layer.setZIndex) {
                this._lastZIndex++;
                layer.setZIndex(this._lastZIndex);
            }
        },
        _update: function() {
            if (!this._container) {
                return;
            }
            this._baseLayersList.innerHTML = "";
            this._overlaysList.innerHTML = "";
            var baseLayersPresent = false, overlaysPresent = false, i, obj;
            for (i in this._layers) {
                obj = this._layers[i];
                this._addItem(obj);
                overlaysPresent = overlaysPresent || obj.overlay;
                baseLayersPresent = baseLayersPresent || !obj.overlay;
            }
            this._separator.style.display = overlaysPresent && baseLayersPresent ? "" : "none";
        },
        _onLayerChange: function(e) {
            var obj = this._layers[L.stamp(e.layer)];
            if (!obj) {
                return;
            }
            if (!this._handlingClick) {
                this._update();
            }
            var type = obj.overlay ? e.type === "layeradd" ? "overlayadd" : "overlayremove" : e.type === "layeradd" ? "baselayerchange" : null;
            if (type) {
                this._map.fire(type, obj);
            }
        },
        // IE7 bugs out if you create a radio dynamically, so you have to do it this hacky way (see http://bit.ly/PqYLBe)
        _createRadioElement: function(name, checked) {
            var radioHtml = '<input type="radio" class="leaflet-control-layers-selector" name="' + name + '"';
            if (checked) {
                radioHtml += ' checked="checked"';
            }
            radioHtml += "/>";
            var radioFragment = document.createElement("div");
            radioFragment.innerHTML = radioHtml;
            return radioFragment.firstChild;
        },
        _addItem: function(obj) {
            var label = document.createElement("label"), input, checked = this._map.hasLayer(obj.layer);
            if (obj.overlay) {
                input = document.createElement("input");
                input.type = "checkbox";
                input.className = "leaflet-control-layers-selector";
                input.defaultChecked = checked;
            } else {
                input = this._createRadioElement("leaflet-base-layers", checked);
            }
            input.layerId = L.stamp(obj.layer);
            L.DomEvent.on(input, "click", this._onInputClick, this);
            var name = document.createElement("span");
            name.innerHTML = " " + obj.name;
            label.appendChild(input);
            label.appendChild(name);
            var container = obj.overlay ? this._overlaysList : this._baseLayersList;
            container.appendChild(label);
            return label;
        },
        _onInputClick: function() {
            var i, input, obj, inputs = this._form.getElementsByTagName("input"), inputsLen = inputs.length;
            this._handlingClick = true;
            for (i = 0; i < inputsLen; i++) {
                input = inputs[i];
                obj = this._layers[input.layerId];
                if (input.checked && !this._map.hasLayer(obj.layer)) {
                    this._map.addLayer(obj.layer);
                } else if (!input.checked && this._map.hasLayer(obj.layer)) {
                    this._map.removeLayer(obj.layer);
                }
            }
            this._handlingClick = false;
            this._refocusOnMap();
        },
        _expand: function() {
            L.DomUtil.addClass(this._container, "leaflet-control-layers-expanded");
        },
        _collapse: function() {
            this._container.className = this._container.className.replace(" leaflet-control-layers-expanded", "");
        }
    });
    L.control.layers = function(baseLayers, overlays, options) {
        return new L.Control.Layers(baseLayers, overlays, options);
    };
    /*
 * L.PosAnimation is used by Leaflet internally for pan animations.
 */
    L.PosAnimation = L.Class.extend({
        includes: L.Mixin.Events,
        run: function(el, newPos, duration, easeLinearity) {
            // (HTMLElement, Point[, Number, Number])
            this.stop();
            this._el = el;
            this._inProgress = true;
            this._newPos = newPos;
            this.fire("start");
            el.style[L.DomUtil.TRANSITION] = "all " + (duration || .25) + "s cubic-bezier(0,0," + (easeLinearity || .5) + ",1)";
            L.DomEvent.on(el, L.DomUtil.TRANSITION_END, this._onTransitionEnd, this);
            L.DomUtil.setPosition(el, newPos);
            // toggle reflow, Chrome flickers for some reason if you don't do this
            L.Util.falseFn(el.offsetWidth);
            // there's no native way to track value updates of transitioned properties, so we imitate this
            this._stepTimer = setInterval(L.bind(this._onStep, this), 50);
        },
        stop: function() {
            if (!this._inProgress) {
                return;
            }
            // if we just removed the transition property, the element would jump to its final position,
            // so we need to make it stay at the current position
            L.DomUtil.setPosition(this._el, this._getPos());
            this._onTransitionEnd();
            L.Util.falseFn(this._el.offsetWidth);
        },
        _onStep: function() {
            var stepPos = this._getPos();
            if (!stepPos) {
                this._onTransitionEnd();
                return;
            }
            // jshint camelcase: false
            // make L.DomUtil.getPosition return intermediate position value during animation
            this._el._leaflet_pos = stepPos;
            this.fire("step");
        },
        // you can't easily get intermediate values of properties animated with CSS3 Transitions,
        // we need to parse computed style (in case of transform it returns matrix string)
        _transformRe: /([-+]?(?:\d*\.)?\d+)\D*, ([-+]?(?:\d*\.)?\d+)\D*\)/,
        _getPos: function() {
            var left, top, matches, el = this._el, style = window.getComputedStyle(el);
            if (L.Browser.any3d) {
                matches = style[L.DomUtil.TRANSFORM].match(this._transformRe);
                if (!matches) {
                    return;
                }
                left = parseFloat(matches[1]);
                top = parseFloat(matches[2]);
            } else {
                left = parseFloat(style.left);
                top = parseFloat(style.top);
            }
            return new L.Point(left, top, true);
        },
        _onTransitionEnd: function() {
            L.DomEvent.off(this._el, L.DomUtil.TRANSITION_END, this._onTransitionEnd, this);
            if (!this._inProgress) {
                return;
            }
            this._inProgress = false;
            this._el.style[L.DomUtil.TRANSITION] = "";
            // jshint camelcase: false
            // make sure L.DomUtil.getPosition returns the final position value after animation
            this._el._leaflet_pos = this._newPos;
            clearInterval(this._stepTimer);
            this.fire("step").fire("end");
        }
    });
    /*
 * Extends L.Map to handle panning animations.
 */
    L.Map.include({
        setView: function(center, zoom, options) {
            zoom = zoom === undefined ? this._zoom : this._limitZoom(zoom);
            center = this._limitCenter(L.latLng(center), zoom, this.options.maxBounds);
            options = options || {};
            if (this._panAnim) {
                this._panAnim.stop();
            }
            if (this._loaded && !options.reset && options !== true) {
                if (options.animate !== undefined) {
                    options.zoom = L.extend({
                        animate: options.animate
                    }, options.zoom);
                    options.pan = L.extend({
                        animate: options.animate
                    }, options.pan);
                }
                // try animating pan or zoom
                var animated = this._zoom !== zoom ? this._tryAnimatedZoom && this._tryAnimatedZoom(center, zoom, options.zoom) : this._tryAnimatedPan(center, options.pan);
                if (animated) {
                    // prevent resize handler call, the view will refresh after animation anyway
                    clearTimeout(this._sizeTimer);
                    return this;
                }
            }
            // animation didn't start, just reset the map view
            this._resetView(center, zoom);
            return this;
        },
        panBy: function(offset, options) {
            offset = L.point(offset).round();
            options = options || {};
            if (!offset.x && !offset.y) {
                return this;
            }
            if (!this._panAnim) {
                this._panAnim = new L.PosAnimation();
                this._panAnim.on({
                    step: this._onPanTransitionStep,
                    end: this._onPanTransitionEnd
                }, this);
            }
            // don't fire movestart if animating inertia
            if (!options.noMoveStart) {
                this.fire("movestart");
            }
            // animate pan unless animate: false specified
            if (options.animate !== false) {
                L.DomUtil.addClass(this._mapPane, "leaflet-pan-anim");
                var newPos = this._getMapPanePos().subtract(offset);
                this._panAnim.run(this._mapPane, newPos, options.duration || .25, options.easeLinearity);
            } else {
                this._rawPanBy(offset);
                this.fire("move").fire("moveend");
            }
            return this;
        },
        _onPanTransitionStep: function() {
            this.fire("move");
        },
        _onPanTransitionEnd: function() {
            L.DomUtil.removeClass(this._mapPane, "leaflet-pan-anim");
            this.fire("moveend");
        },
        _tryAnimatedPan: function(center, options) {
            // difference between the new and current centers in pixels
            var offset = this._getCenterOffset(center)._floor();
            // don't animate too far unless animate: true specified in options
            if ((options && options.animate) !== true && !this.getSize().contains(offset)) {
                return false;
            }
            this.panBy(offset, options);
            return true;
        }
    });
    /*
 * L.PosAnimation fallback implementation that powers Leaflet pan animations
 * in browsers that don't support CSS3 Transitions.
 */
    L.PosAnimation = L.DomUtil.TRANSITION ? L.PosAnimation : L.PosAnimation.extend({
        run: function(el, newPos, duration, easeLinearity) {
            // (HTMLElement, Point[, Number, Number])
            this.stop();
            this._el = el;
            this._inProgress = true;
            this._duration = duration || .25;
            this._easeOutPower = 1 / Math.max(easeLinearity || .5, .2);
            this._startPos = L.DomUtil.getPosition(el);
            this._offset = newPos.subtract(this._startPos);
            this._startTime = +new Date();
            this.fire("start");
            this._animate();
        },
        stop: function() {
            if (!this._inProgress) {
                return;
            }
            this._step();
            this._complete();
        },
        _animate: function() {
            // animation loop
            this._animId = L.Util.requestAnimFrame(this._animate, this);
            this._step();
        },
        _step: function() {
            var elapsed = +new Date() - this._startTime, duration = this._duration * 1e3;
            if (elapsed < duration) {
                this._runFrame(this._easeOut(elapsed / duration));
            } else {
                this._runFrame(1);
                this._complete();
            }
        },
        _runFrame: function(progress) {
            var pos = this._startPos.add(this._offset.multiplyBy(progress));
            L.DomUtil.setPosition(this._el, pos);
            this.fire("step");
        },
        _complete: function() {
            L.Util.cancelAnimFrame(this._animId);
            this._inProgress = false;
            this.fire("end");
        },
        _easeOut: function(t) {
            return 1 - Math.pow(1 - t, this._easeOutPower);
        }
    });
    /*
 * Extends L.Map to handle zoom animations.
 */
    L.Map.mergeOptions({
        zoomAnimation: true,
        zoomAnimationThreshold: 4
    });
    if (L.DomUtil.TRANSITION) {
        L.Map.addInitHook(function() {
            // don't animate on browsers without hardware-accelerated transitions or old Android/Opera
            this._zoomAnimated = this.options.zoomAnimation && L.DomUtil.TRANSITION && L.Browser.any3d && !L.Browser.android23 && !L.Browser.mobileOpera;
            // zoom transitions run with the same duration for all layers, so if one of transitionend events
            // happens after starting zoom animation (propagating to the map pane), we know that it ended globally
            if (this._zoomAnimated) {
                L.DomEvent.on(this._mapPane, L.DomUtil.TRANSITION_END, this._catchTransitionEnd, this);
            }
        });
    }
    L.Map.include(!L.DomUtil.TRANSITION ? {} : {
        _catchTransitionEnd: function(e) {
            if (this._animatingZoom && e.propertyName.indexOf("transform") >= 0) {
                this._onZoomTransitionEnd();
            }
        },
        _nothingToAnimate: function() {
            return !this._container.getElementsByClassName("leaflet-zoom-animated").length;
        },
        _tryAnimatedZoom: function(center, zoom, options) {
            if (this._animatingZoom) {
                return true;
            }
            options = options || {};
            // don't animate if disabled, not supported or zoom difference is too large
            if (!this._zoomAnimated || options.animate === false || this._nothingToAnimate() || Math.abs(zoom - this._zoom) > this.options.zoomAnimationThreshold) {
                return false;
            }
            // offset is the pixel coords of the zoom origin relative to the current center
            var scale = this.getZoomScale(zoom), offset = this._getCenterOffset(center)._divideBy(1 - 1 / scale), origin = this._getCenterLayerPoint()._add(offset);
            // don't animate if the zoom origin isn't within one screen from the current center, unless forced
            if (options.animate !== true && !this.getSize().contains(offset)) {
                return false;
            }
            this.fire("movestart").fire("zoomstart");
            this._animateZoom(center, zoom, origin, scale, null, true);
            return true;
        },
        _animateZoom: function(center, zoom, origin, scale, delta, backwards, forTouchZoom) {
            if (!forTouchZoom) {
                this._animatingZoom = true;
            }
            // put transform transition on all layers with leaflet-zoom-animated class
            L.DomUtil.addClass(this._mapPane, "leaflet-zoom-anim");
            // remember what center/zoom to set after animation
            this._animateToCenter = center;
            this._animateToZoom = zoom;
            // disable any dragging during animation
            if (L.Draggable) {
                L.Draggable._disabled = true;
            }
            L.Util.requestAnimFrame(function() {
                this.fire("zoomanim", {
                    center: center,
                    zoom: zoom,
                    origin: origin,
                    scale: scale,
                    delta: delta,
                    backwards: backwards
                });
            }, this);
        },
        _onZoomTransitionEnd: function() {
            this._animatingZoom = false;
            L.DomUtil.removeClass(this._mapPane, "leaflet-zoom-anim");
            this._resetView(this._animateToCenter, this._animateToZoom, true, true);
            if (L.Draggable) {
                L.Draggable._disabled = false;
            }
        }
    });
    /*
	Zoom animation logic for L.TileLayer.
*/
    L.TileLayer.include({
        _animateZoom: function(e) {
            if (!this._animating) {
                this._animating = true;
                this._prepareBgBuffer();
            }
            var bg = this._bgBuffer, transform = L.DomUtil.TRANSFORM, initialTransform = e.delta ? L.DomUtil.getTranslateString(e.delta) : bg.style[transform], scaleStr = L.DomUtil.getScaleString(e.scale, e.origin);
            bg.style[transform] = e.backwards ? scaleStr + " " + initialTransform : initialTransform + " " + scaleStr;
        },
        _endZoomAnim: function() {
            var front = this._tileContainer, bg = this._bgBuffer;
            front.style.visibility = "";
            front.parentNode.appendChild(front);
            // Bring to fore
            // force reflow
            L.Util.falseFn(bg.offsetWidth);
            this._animating = false;
        },
        _clearBgBuffer: function() {
            var map = this._map;
            if (map && !map._animatingZoom && !map.touchZoom._zooming) {
                this._bgBuffer.innerHTML = "";
                this._bgBuffer.style[L.DomUtil.TRANSFORM] = "";
            }
        },
        _prepareBgBuffer: function() {
            var front = this._tileContainer, bg = this._bgBuffer;
            // if foreground layer doesn't have many tiles but bg layer does,
            // keep the existing bg layer and just zoom it some more
            var bgLoaded = this._getLoadedTilesPercentage(bg), frontLoaded = this._getLoadedTilesPercentage(front);
            if (bg && bgLoaded > .5 && frontLoaded < .5) {
                front.style.visibility = "hidden";
                this._stopLoadingImages(front);
                return;
            }
            // prepare the buffer to become the front tile pane
            bg.style.visibility = "hidden";
            bg.style[L.DomUtil.TRANSFORM] = "";
            // switch out the current layer to be the new bg layer (and vice-versa)
            this._tileContainer = bg;
            bg = this._bgBuffer = front;
            this._stopLoadingImages(bg);
            //prevent bg buffer from clearing right after zoom
            clearTimeout(this._clearBgBufferTimer);
        },
        _getLoadedTilesPercentage: function(container) {
            var tiles = container.getElementsByTagName("img"), i, len, count = 0;
            for (i = 0, len = tiles.length; i < len; i++) {
                if (tiles[i].complete) {
                    count++;
                }
            }
            return count / len;
        },
        // stops loading all tiles in the background layer
        _stopLoadingImages: function(container) {
            var tiles = Array.prototype.slice.call(container.getElementsByTagName("img")), i, len, tile;
            for (i = 0, len = tiles.length; i < len; i++) {
                tile = tiles[i];
                if (!tile.complete) {
                    tile.onload = L.Util.falseFn;
                    tile.onerror = L.Util.falseFn;
                    tile.src = L.Util.emptyImageUrl;
                    tile.parentNode.removeChild(tile);
                }
            }
        }
    });
    /*
 * Provides L.Map with convenient shortcuts for using browser geolocation features.
 */
    L.Map.include({
        _defaultLocateOptions: {
            watch: false,
            setView: false,
            maxZoom: Infinity,
            timeout: 1e4,
            maximumAge: 0,
            enableHighAccuracy: false
        },
        locate: function(/*Object*/ options) {
            options = this._locateOptions = L.extend(this._defaultLocateOptions, options);
            if (!navigator.geolocation) {
                this._handleGeolocationError({
                    code: 0,
                    message: "Geolocation not supported."
                });
                return this;
            }
            var onResponse = L.bind(this._handleGeolocationResponse, this), onError = L.bind(this._handleGeolocationError, this);
            if (options.watch) {
                this._locationWatchId = navigator.geolocation.watchPosition(onResponse, onError, options);
            } else {
                navigator.geolocation.getCurrentPosition(onResponse, onError, options);
            }
            return this;
        },
        stopLocate: function() {
            if (navigator.geolocation) {
                navigator.geolocation.clearWatch(this._locationWatchId);
            }
            if (this._locateOptions) {
                this._locateOptions.setView = false;
            }
            return this;
        },
        _handleGeolocationError: function(error) {
            var c = error.code, message = error.message || (c === 1 ? "permission denied" : c === 2 ? "position unavailable" : "timeout");
            if (this._locateOptions.setView && !this._loaded) {
                this.fitWorld();
            }
            this.fire("locationerror", {
                code: c,
                message: "Geolocation error: " + message + "."
            });
        },
        _handleGeolocationResponse: function(pos) {
            var lat = pos.coords.latitude, lng = pos.coords.longitude, latlng = new L.LatLng(lat, lng), latAccuracy = 180 * pos.coords.accuracy / 40075017, lngAccuracy = latAccuracy / Math.cos(L.LatLng.DEG_TO_RAD * lat), bounds = L.latLngBounds([ lat - latAccuracy, lng - lngAccuracy ], [ lat + latAccuracy, lng + lngAccuracy ]), options = this._locateOptions;
            if (options.setView) {
                var zoom = Math.min(this.getBoundsZoom(bounds), options.maxZoom);
                this.setView(latlng, zoom);
            }
            var data = {
                latlng: latlng,
                bounds: bounds,
                timestamp: pos.timestamp
            };
            for (var i in pos.coords) {
                if (typeof pos.coords[i] === "number") {
                    data[i] = pos.coords[i];
                }
            }
            this.fire("locationfound", data);
        }
    });
})(window, document);

/*
 Leaflet.markercluster, Provides Beautiful Animated Marker Clustering functionality for Leaflet, a JS library for interactive maps.
 https://github.com/Leaflet/Leaflet.markercluster
 (c) 2012-2013, Dave Leaver, smartrak
*/
!function(t, e) {
    L.MarkerClusterGroup = L.FeatureGroup.extend({
        options: {
            maxClusterRadius: 80,
            iconCreateFunction: null,
            spiderfyOnMaxZoom: !0,
            showCoverageOnHover: !0,
            zoomToBoundsOnClick: !0,
            singleMarkerMode: !1,
            disableClusteringAtZoom: null,
            removeOutsideVisibleBounds: !0,
            animateAddingMarkers: !1,
            spiderfyDistanceMultiplier: 1,
            chunkedLoading: !1,
            chunkInterval: 200,
            chunkDelay: 50,
            chunkProgress: null,
            polygonOptions: {}
        },
        initialize: function(t) {
            L.Util.setOptions(this, t), this.options.iconCreateFunction || (this.options.iconCreateFunction = this._defaultIconCreateFunction), 
            this._featureGroup = L.featureGroup(), this._featureGroup.on(L.FeatureGroup.EVENTS, this._propagateEvent, this), 
            this._nonPointGroup = L.featureGroup(), this._nonPointGroup.on(L.FeatureGroup.EVENTS, this._propagateEvent, this), 
            this._inZoomAnimation = 0, this._needsClustering = [], this._needsRemoving = [], 
            this._currentShownBounds = null, this._queue = [];
        },
        addLayer: function(t) {
            if (t instanceof L.LayerGroup) {
                var e = [];
                for (var i in t._layers) e.push(t._layers[i]);
                return this.addLayers(e);
            }
            if (!t.getLatLng) return this._nonPointGroup.addLayer(t), this;
            if (!this._map) return this._needsClustering.push(t), this;
            if (this.hasLayer(t)) return this;
            this._unspiderfy && this._unspiderfy(), this._addLayer(t, this._maxZoom);
            var n = t, s = this._map.getZoom();
            if (t.__parent) for (;n.__parent._zoom >= s; ) n = n.__parent;
            return this._currentShownBounds.contains(n.getLatLng()) && (this.options.animateAddingMarkers ? this._animationAddLayer(t, n) : this._animationAddLayerNonAnimated(t, n)), 
            this;
        },
        removeLayer: function(t) {
            if (t instanceof L.LayerGroup) {
                var e = [];
                for (var i in t._layers) e.push(t._layers[i]);
                return this.removeLayers(e);
            }
            return t.getLatLng ? this._map ? t.__parent ? (this._unspiderfy && (this._unspiderfy(), 
            this._unspiderfyLayer(t)), this._removeLayer(t, !0), this._featureGroup.hasLayer(t) && (this._featureGroup.removeLayer(t), 
            t.setOpacity && t.setOpacity(1)), this) : this : (!this._arraySplice(this._needsClustering, t) && this.hasLayer(t) && this._needsRemoving.push(t), 
            this) : (this._nonPointGroup.removeLayer(t), this);
        },
        addLayers: function(t) {
            var e, i, n, s, r = this._featureGroup, o = this._nonPointGroup, a = this.options.chunkedLoading, h = this.options.chunkInterval, _ = this.options.chunkProgress;
            if (this._map) {
                var u = 0, l = new Date().getTime(), d = L.bind(function() {
                    for (var e = new Date().getTime(); u < t.length; u++) {
                        if (a && 0 === u % 200) {
                            var i = new Date().getTime() - e;
                            if (i > h) break;
                        }
                        if (s = t[u], s.getLatLng) {
                            if (!this.hasLayer(s) && (this._addLayer(s, this._maxZoom), s.__parent && 2 === s.__parent.getChildCount())) {
                                var n = s.__parent.getAllChildMarkers(), p = n[0] === s ? n[1] : n[0];
                                r.removeLayer(p);
                            }
                        } else o.addLayer(s);
                    }
                    _ && _(u, t.length, new Date().getTime() - l), u === t.length ? (this._featureGroup.eachLayer(function(t) {
                        t instanceof L.MarkerCluster && t._iconNeedsUpdate && t._updateIcon();
                    }), this._topClusterLevel._recursivelyAddChildrenToMap(null, this._zoom, this._currentShownBounds)) : setTimeout(d, this.options.chunkDelay);
                }, this);
                d();
            } else {
                for (e = [], i = 0, n = t.length; n > i; i++) s = t[i], s.getLatLng ? this.hasLayer(s) || e.push(s) : o.addLayer(s);
                this._needsClustering = this._needsClustering.concat(e);
            }
            return this;
        },
        removeLayers: function(t) {
            var e, i, n, s = this._featureGroup, r = this._nonPointGroup;
            if (!this._map) {
                for (e = 0, i = t.length; i > e; e++) n = t[e], this._arraySplice(this._needsClustering, n), 
                r.removeLayer(n);
                return this;
            }
            for (e = 0, i = t.length; i > e; e++) n = t[e], n.__parent ? (this._removeLayer(n, !0, !0), 
            s.hasLayer(n) && (s.removeLayer(n), n.setOpacity && n.setOpacity(1))) : r.removeLayer(n);
            return this._topClusterLevel._recursivelyAddChildrenToMap(null, this._zoom, this._currentShownBounds), 
            s.eachLayer(function(t) {
                t instanceof L.MarkerCluster && t._updateIcon();
            }), this;
        },
        clearLayers: function() {
            return this._map || (this._needsClustering = [], delete this._gridClusters, delete this._gridUnclustered), 
            this._noanimationUnspiderfy && this._noanimationUnspiderfy(), this._featureGroup.clearLayers(), 
            this._nonPointGroup.clearLayers(), this.eachLayer(function(t) {
                delete t.__parent;
            }), this._map && this._generateInitialClusters(), this;
        },
        getBounds: function() {
            var t = new L.LatLngBounds();
            this._topClusterLevel && t.extend(this._topClusterLevel._bounds);
            for (var e = this._needsClustering.length - 1; e >= 0; e--) t.extend(this._needsClustering[e].getLatLng());
            return t.extend(this._nonPointGroup.getBounds()), t;
        },
        eachLayer: function(t, e) {
            var i, n = this._needsClustering.slice();
            for (this._topClusterLevel && this._topClusterLevel.getAllChildMarkers(n), i = n.length - 1; i >= 0; i--) t.call(e, n[i]);
            this._nonPointGroup.eachLayer(t, e);
        },
        getLayers: function() {
            var t = [];
            return this.eachLayer(function(e) {
                t.push(e);
            }), t;
        },
        getLayer: function(t) {
            var e = null;
            return this.eachLayer(function(i) {
                L.stamp(i) === t && (e = i);
            }), e;
        },
        hasLayer: function(t) {
            if (!t) return !1;
            var e, i = this._needsClustering;
            for (e = i.length - 1; e >= 0; e--) if (i[e] === t) return !0;
            for (i = this._needsRemoving, e = i.length - 1; e >= 0; e--) if (i[e] === t) return !1;
            return !(!t.__parent || t.__parent._group !== this) || this._nonPointGroup.hasLayer(t);
        },
        zoomToShowLayer: function(t, e) {
            var i = function() {
                if ((t._icon || t.__parent._icon) && !this._inZoomAnimation) if (this._map.off("moveend", i, this), 
                this.off("animationend", i, this), t._icon) e(); else if (t.__parent._icon) {
                    var n = function() {
                        this.off("spiderfied", n, this), e();
                    };
                    this.on("spiderfied", n, this), t.__parent.spiderfy();
                }
            };
            if (t._icon && this._map.getBounds().contains(t.getLatLng())) e(); else if (t.__parent._zoom < this._map.getZoom()) this._map.on("moveend", i, this), 
            this._map.panTo(t.getLatLng()); else {
                var n = function() {
                    this._map.off("movestart", n, this), n = null;
                };
                this._map.on("movestart", n, this), this._map.on("moveend", i, this), this.on("animationend", i, this), 
                t.__parent.zoomToBounds(), n && i.call(this);
            }
        },
        onAdd: function(t) {
            this._map = t;
            var e, i, n;
            if (!isFinite(this._map.getMaxZoom())) throw "Map has no maxZoom specified";
            for (this._featureGroup.onAdd(t), this._nonPointGroup.onAdd(t), this._gridClusters || this._generateInitialClusters(), 
            e = 0, i = this._needsRemoving.length; i > e; e++) n = this._needsRemoving[e], this._removeLayer(n, !0);
            this._needsRemoving = [], this._zoom = this._map.getZoom(), this._currentShownBounds = this._getExpandedVisibleBounds(), 
            this._map.on("zoomend", this._zoomEnd, this), this._map.on("moveend", this._moveEnd, this), 
            this._spiderfierOnAdd && this._spiderfierOnAdd(), this._bindEvents(), i = this._needsClustering, 
            this._needsClustering = [], this.addLayers(i);
        },
        onRemove: function(t) {
            t.off("zoomend", this._zoomEnd, this), t.off("moveend", this._moveEnd, this), this._unbindEvents(), 
            this._map._mapPane.className = this._map._mapPane.className.replace(" leaflet-cluster-anim", ""), 
            this._spiderfierOnRemove && this._spiderfierOnRemove(), this._hideCoverage(), this._featureGroup.onRemove(t), 
            this._nonPointGroup.onRemove(t), this._featureGroup.clearLayers(), this._map = null;
        },
        getVisibleParent: function(t) {
            for (var e = t; e && !e._icon; ) e = e.__parent;
            return e || null;
        },
        _arraySplice: function(t, e) {
            for (var i = t.length - 1; i >= 0; i--) if (t[i] === e) return t.splice(i, 1), !0;
        },
        _removeLayer: function(t, e, i) {
            var n = this._gridClusters, s = this._gridUnclustered, r = this._featureGroup, o = this._map;
            if (e) for (var a = this._maxZoom; a >= 0 && s[a].removeObject(t, o.project(t.getLatLng(), a)); a--) ;
            var h, _ = t.__parent, u = _._markers;
            for (this._arraySplice(u, t); _ && (_._childCount--, !(_._zoom < 0)); ) e && _._childCount <= 1 ? (h = _._markers[0] === t ? _._markers[1] : _._markers[0], 
            n[_._zoom].removeObject(_, o.project(_._cLatLng, _._zoom)), s[_._zoom].addObject(h, o.project(h.getLatLng(), _._zoom)), 
            this._arraySplice(_.__parent._childClusters, _), _.__parent._markers.push(h), h.__parent = _.__parent, 
            _._icon && (r.removeLayer(_), i || r.addLayer(h))) : (_._recalculateBounds(), i && _._icon || _._updateIcon()), 
            _ = _.__parent;
            delete t.__parent;
        },
        _isOrIsParent: function(t, e) {
            for (;e; ) {
                if (t === e) return !0;
                e = e.parentNode;
            }
            return !1;
        },
        _propagateEvent: function(t) {
            if (t.layer instanceof L.MarkerCluster) {
                if (t.originalEvent && this._isOrIsParent(t.layer._icon, t.originalEvent.relatedTarget)) return;
                t.type = "cluster" + t.type;
            }
            this.fire(t.type, t);
        },
        _defaultIconCreateFunction: function(t) {
            var e = t.getChildCount(), i = " marker-cluster-";
            return i += 10 > e ? "small" : 100 > e ? "medium" : "large", new L.DivIcon({
                html: "<div><span>" + e + "</span></div>",
                className: "marker-cluster" + i,
                iconSize: new L.Point(40, 40)
            });
        },
        _bindEvents: function() {
            var t = this._map, e = this.options.spiderfyOnMaxZoom, i = this.options.showCoverageOnHover, n = this.options.zoomToBoundsOnClick;
            (e || n) && this.on("clusterclick", this._zoomOrSpiderfy, this), i && (this.on("clustermouseover", this._showCoverage, this), 
            this.on("clustermouseout", this._hideCoverage, this), t.on("zoomend", this._hideCoverage, this));
        },
        _zoomOrSpiderfy: function(t) {
            var e = this._map;
            e.getMaxZoom() === e.getZoom() ? this.options.spiderfyOnMaxZoom && t.layer.spiderfy() : this.options.zoomToBoundsOnClick && t.layer.zoomToBounds(), 
            t.originalEvent && 13 === t.originalEvent.keyCode && e._container.focus();
        },
        _showCoverage: function(t) {
            var e = this._map;
            this._inZoomAnimation || (this._shownPolygon && e.removeLayer(this._shownPolygon), 
            t.layer.getChildCount() > 2 && t.layer !== this._spiderfied && (this._shownPolygon = new L.Polygon(t.layer.getConvexHull(), this.options.polygonOptions), 
            e.addLayer(this._shownPolygon)));
        },
        _hideCoverage: function() {
            this._shownPolygon && (this._map.removeLayer(this._shownPolygon), this._shownPolygon = null);
        },
        _unbindEvents: function() {
            var t = this.options.spiderfyOnMaxZoom, e = this.options.showCoverageOnHover, i = this.options.zoomToBoundsOnClick, n = this._map;
            (t || i) && this.off("clusterclick", this._zoomOrSpiderfy, this), e && (this.off("clustermouseover", this._showCoverage, this), 
            this.off("clustermouseout", this._hideCoverage, this), n.off("zoomend", this._hideCoverage, this));
        },
        _zoomEnd: function() {
            this._map && (this._mergeSplitClusters(), this._zoom = this._map._zoom, this._currentShownBounds = this._getExpandedVisibleBounds());
        },
        _moveEnd: function() {
            if (!this._inZoomAnimation) {
                var t = this._getExpandedVisibleBounds();
                this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds, this._zoom, t), 
                this._topClusterLevel._recursivelyAddChildrenToMap(null, this._map._zoom, t), this._currentShownBounds = t;
            }
        },
        _generateInitialClusters: function() {
            var t = this._map.getMaxZoom(), e = this.options.maxClusterRadius, i = e;
            "function" != typeof e && (i = function() {
                return e;
            }), this.options.disableClusteringAtZoom && (t = this.options.disableClusteringAtZoom - 1), 
            this._maxZoom = t, this._gridClusters = {}, this._gridUnclustered = {};
            for (var n = t; n >= 0; n--) this._gridClusters[n] = new L.DistanceGrid(i(n)), this._gridUnclustered[n] = new L.DistanceGrid(i(n));
            this._topClusterLevel = new L.MarkerCluster(this, -1);
        },
        _addLayer: function(t, e) {
            var i, n, s = this._gridClusters, r = this._gridUnclustered;
            for (this.options.singleMarkerMode && (t.options.icon = this.options.iconCreateFunction({
                getChildCount: function() {
                    return 1;
                },
                getAllChildMarkers: function() {
                    return [ t ];
                }
            })); e >= 0; e--) {
                i = this._map.project(t.getLatLng(), e);
                var o = s[e].getNearObject(i);
                if (o) return o._addChild(t), t.__parent = o, void 0;
                if (o = r[e].getNearObject(i)) {
                    var a = o.__parent;
                    a && this._removeLayer(o, !1);
                    var h = new L.MarkerCluster(this, e, o, t);
                    s[e].addObject(h, this._map.project(h._cLatLng, e)), o.__parent = h, t.__parent = h;
                    var _ = h;
                    for (n = e - 1; n > a._zoom; n--) _ = new L.MarkerCluster(this, n, _), s[n].addObject(_, this._map.project(o.getLatLng(), n));
                    for (a._addChild(_), n = e; n >= 0 && r[n].removeObject(o, this._map.project(o.getLatLng(), n)); n--) ;
                    return;
                }
                r[e].addObject(t, i);
            }
            this._topClusterLevel._addChild(t), t.__parent = this._topClusterLevel;
        },
        _enqueue: function(t) {
            this._queue.push(t), this._queueTimeout || (this._queueTimeout = setTimeout(L.bind(this._processQueue, this), 300));
        },
        _processQueue: function() {
            for (var t = 0; t < this._queue.length; t++) this._queue[t].call(this);
            this._queue.length = 0, clearTimeout(this._queueTimeout), this._queueTimeout = null;
        },
        _mergeSplitClusters: function() {
            this._processQueue(), this._zoom < this._map._zoom && this._currentShownBounds.intersects(this._getExpandedVisibleBounds()) ? (this._animationStart(), 
            this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds, this._zoom, this._getExpandedVisibleBounds()), 
            this._animationZoomIn(this._zoom, this._map._zoom)) : this._zoom > this._map._zoom ? (this._animationStart(), 
            this._animationZoomOut(this._zoom, this._map._zoom)) : this._moveEnd();
        },
        _getExpandedVisibleBounds: function() {
            if (!this.options.removeOutsideVisibleBounds) return this._map.getBounds();
            var t = this._map, e = t.getBounds(), i = e._southWest, n = e._northEast, s = L.Browser.mobile ? 0 : Math.abs(i.lat - n.lat), r = L.Browser.mobile ? 0 : Math.abs(i.lng - n.lng);
            return new L.LatLngBounds(new L.LatLng(i.lat - s, i.lng - r, !0), new L.LatLng(n.lat + s, n.lng + r, !0));
        },
        _animationAddLayerNonAnimated: function(t, e) {
            if (e === t) this._featureGroup.addLayer(t); else if (2 === e._childCount) {
                e._addToMap();
                var i = e.getAllChildMarkers();
                this._featureGroup.removeLayer(i[0]), this._featureGroup.removeLayer(i[1]);
            } else e._updateIcon();
        }
    }), L.MarkerClusterGroup.include(L.DomUtil.TRANSITION ? {
        _animationStart: function() {
            this._map._mapPane.className += " leaflet-cluster-anim", this._inZoomAnimation++;
        },
        _animationEnd: function() {
            this._map && (this._map._mapPane.className = this._map._mapPane.className.replace(" leaflet-cluster-anim", "")), 
            this._inZoomAnimation--, this.fire("animationend");
        },
        _animationZoomIn: function(t, e) {
            var i, n = this._getExpandedVisibleBounds(), s = this._featureGroup;
            this._topClusterLevel._recursively(n, t, 0, function(r) {
                var o, a = r._latlng, h = r._markers;
                for (n.contains(a) || (a = null), r._isSingleParent() && t + 1 === e ? (s.removeLayer(r), 
                r._recursivelyAddChildrenToMap(null, e, n)) : (r.setOpacity(0), r._recursivelyAddChildrenToMap(a, e, n)), 
                i = h.length - 1; i >= 0; i--) o = h[i], n.contains(o._latlng) || s.removeLayer(o);
            }), this._forceLayout(), this._topClusterLevel._recursivelyBecomeVisible(n, e), 
            s.eachLayer(function(t) {
                t instanceof L.MarkerCluster || !t._icon || t.setOpacity(1);
            }), this._topClusterLevel._recursively(n, t, e, function(t) {
                t._recursivelyRestoreChildPositions(e);
            }), this._enqueue(function() {
                this._topClusterLevel._recursively(n, t, 0, function(t) {
                    s.removeLayer(t), t.setOpacity(1);
                }), this._animationEnd();
            });
        },
        _animationZoomOut: function(t, e) {
            this._animationZoomOutSingle(this._topClusterLevel, t - 1, e), this._topClusterLevel._recursivelyAddChildrenToMap(null, e, this._getExpandedVisibleBounds()), 
            this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds, t, this._getExpandedVisibleBounds());
        },
        _animationZoomOutSingle: function(t, e, i) {
            var n = this._getExpandedVisibleBounds();
            t._recursivelyAnimateChildrenInAndAddSelfToMap(n, e + 1, i);
            var s = this;
            this._forceLayout(), t._recursivelyBecomeVisible(n, i), this._enqueue(function() {
                if (1 === t._childCount) {
                    var r = t._markers[0];
                    r.setLatLng(r.getLatLng()), r.setOpacity && r.setOpacity(1);
                } else t._recursively(n, i, 0, function(t) {
                    t._recursivelyRemoveChildrenFromMap(n, e + 1);
                });
                s._animationEnd();
            });
        },
        _animationAddLayer: function(t, e) {
            var i = this, n = this._featureGroup;
            n.addLayer(t), e !== t && (e._childCount > 2 ? (e._updateIcon(), this._forceLayout(), 
            this._animationStart(), t._setPos(this._map.latLngToLayerPoint(e.getLatLng())), 
            t.setOpacity(0), this._enqueue(function() {
                n.removeLayer(t), t.setOpacity(1), i._animationEnd();
            })) : (this._forceLayout(), i._animationStart(), i._animationZoomOutSingle(e, this._map.getMaxZoom(), this._map.getZoom())));
        },
        _forceLayout: function() {
            L.Util.falseFn(e.body.offsetWidth);
        }
    } : {
        _animationStart: function() {},
        _animationZoomIn: function(t, e) {
            this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds, t), 
            this._topClusterLevel._recursivelyAddChildrenToMap(null, e, this._getExpandedVisibleBounds()), 
            this.fire("animationend");
        },
        _animationZoomOut: function(t, e) {
            this._topClusterLevel._recursivelyRemoveChildrenFromMap(this._currentShownBounds, t), 
            this._topClusterLevel._recursivelyAddChildrenToMap(null, e, this._getExpandedVisibleBounds()), 
            this.fire("animationend");
        },
        _animationAddLayer: function(t, e) {
            this._animationAddLayerNonAnimated(t, e);
        }
    }), L.markerClusterGroup = function(t) {
        return new L.MarkerClusterGroup(t);
    }, L.MarkerCluster = L.Marker.extend({
        initialize: function(t, e, i, n) {
            L.Marker.prototype.initialize.call(this, i ? i._cLatLng || i.getLatLng() : new L.LatLng(0, 0), {
                icon: this
            }), this._group = t, this._zoom = e, this._markers = [], this._childClusters = [], 
            this._childCount = 0, this._iconNeedsUpdate = !0, this._bounds = new L.LatLngBounds(), 
            i && this._addChild(i), n && this._addChild(n);
        },
        getAllChildMarkers: function(t) {
            t = t || [];
            for (var e = this._childClusters.length - 1; e >= 0; e--) this._childClusters[e].getAllChildMarkers(t);
            for (var i = this._markers.length - 1; i >= 0; i--) t.push(this._markers[i]);
            return t;
        },
        getChildCount: function() {
            return this._childCount;
        },
        zoomToBounds: function() {
            for (var t, e = this._childClusters.slice(), i = this._group._map, n = i.getBoundsZoom(this._bounds), s = this._zoom + 1, r = i.getZoom(); e.length > 0 && n > s; ) {
                s++;
                var o = [];
                for (t = 0; t < e.length; t++) o = o.concat(e[t]._childClusters);
                e = o;
            }
            n > s ? this._group._map.setView(this._latlng, s) : r >= n ? this._group._map.setView(this._latlng, r + 1) : this._group._map.fitBounds(this._bounds);
        },
        getBounds: function() {
            var t = new L.LatLngBounds();
            return t.extend(this._bounds), t;
        },
        _updateIcon: function() {
            this._iconNeedsUpdate = !0, this._icon && this.setIcon(this);
        },
        createIcon: function() {
            return this._iconNeedsUpdate && (this._iconObj = this._group.options.iconCreateFunction(this), 
            this._iconNeedsUpdate = !1), this._iconObj.createIcon();
        },
        createShadow: function() {
            return this._iconObj.createShadow();
        },
        _addChild: function(t, e) {
            this._iconNeedsUpdate = !0, this._expandBounds(t), t instanceof L.MarkerCluster ? (e || (this._childClusters.push(t), 
            t.__parent = this), this._childCount += t._childCount) : (e || this._markers.push(t), 
            this._childCount++), this.__parent && this.__parent._addChild(t, !0);
        },
        _expandBounds: function(t) {
            var e, i = t._wLatLng || t._latlng;
            t instanceof L.MarkerCluster ? (this._bounds.extend(t._bounds), e = t._childCount) : (this._bounds.extend(i), 
            e = 1), this._cLatLng || (this._cLatLng = t._cLatLng || i);
            var n = this._childCount + e;
            this._wLatLng ? (this._wLatLng.lat = (i.lat * e + this._wLatLng.lat * this._childCount) / n, 
            this._wLatLng.lng = (i.lng * e + this._wLatLng.lng * this._childCount) / n) : this._latlng = this._wLatLng = new L.LatLng(i.lat, i.lng);
        },
        _addToMap: function(t) {
            t && (this._backupLatlng = this._latlng, this.setLatLng(t)), this._group._featureGroup.addLayer(this);
        },
        _recursivelyAnimateChildrenIn: function(t, e, i) {
            this._recursively(t, 0, i - 1, function(t) {
                var i, n, s = t._markers;
                for (i = s.length - 1; i >= 0; i--) n = s[i], n._icon && (n._setPos(e), n.setOpacity(0));
            }, function(t) {
                var i, n, s = t._childClusters;
                for (i = s.length - 1; i >= 0; i--) n = s[i], n._icon && (n._setPos(e), n.setOpacity(0));
            });
        },
        _recursivelyAnimateChildrenInAndAddSelfToMap: function(t, e, i) {
            this._recursively(t, i, 0, function(n) {
                n._recursivelyAnimateChildrenIn(t, n._group._map.latLngToLayerPoint(n.getLatLng()).round(), e), 
                n._isSingleParent() && e - 1 === i ? (n.setOpacity(1), n._recursivelyRemoveChildrenFromMap(t, e)) : n.setOpacity(0), 
                n._addToMap();
            });
        },
        _recursivelyBecomeVisible: function(t, e) {
            this._recursively(t, 0, e, null, function(t) {
                t.setOpacity(1);
            });
        },
        _recursivelyAddChildrenToMap: function(t, e, i) {
            this._recursively(i, -1, e, function(n) {
                if (e !== n._zoom) for (var s = n._markers.length - 1; s >= 0; s--) {
                    var r = n._markers[s];
                    i.contains(r._latlng) && (t && (r._backupLatlng = r.getLatLng(), r.setLatLng(t), 
                    r.setOpacity && r.setOpacity(0)), n._group._featureGroup.addLayer(r));
                }
            }, function(e) {
                e._addToMap(t);
            });
        },
        _recursivelyRestoreChildPositions: function(t) {
            for (var e = this._markers.length - 1; e >= 0; e--) {
                var i = this._markers[e];
                i._backupLatlng && (i.setLatLng(i._backupLatlng), delete i._backupLatlng);
            }
            if (t - 1 === this._zoom) for (var n = this._childClusters.length - 1; n >= 0; n--) this._childClusters[n]._restorePosition(); else for (var s = this._childClusters.length - 1; s >= 0; s--) this._childClusters[s]._recursivelyRestoreChildPositions(t);
        },
        _restorePosition: function() {
            this._backupLatlng && (this.setLatLng(this._backupLatlng), delete this._backupLatlng);
        },
        _recursivelyRemoveChildrenFromMap: function(t, e, i) {
            var n, s;
            this._recursively(t, -1, e - 1, function(t) {
                for (s = t._markers.length - 1; s >= 0; s--) n = t._markers[s], i && i.contains(n._latlng) || (t._group._featureGroup.removeLayer(n), 
                n.setOpacity && n.setOpacity(1));
            }, function(t) {
                for (s = t._childClusters.length - 1; s >= 0; s--) n = t._childClusters[s], i && i.contains(n._latlng) || (t._group._featureGroup.removeLayer(n), 
                n.setOpacity && n.setOpacity(1));
            });
        },
        _recursively: function(t, e, i, n, s) {
            var r, o, a = this._childClusters, h = this._zoom;
            if (e > h) for (r = a.length - 1; r >= 0; r--) o = a[r], t.intersects(o._bounds) && o._recursively(t, e, i, n, s); else if (n && n(this), 
            s && this._zoom === i && s(this), i > h) for (r = a.length - 1; r >= 0; r--) o = a[r], 
            t.intersects(o._bounds) && o._recursively(t, e, i, n, s);
        },
        _recalculateBounds: function() {
            var t, e = this._markers, i = this._childClusters;
            for (this._bounds = new L.LatLngBounds(), delete this._wLatLng, t = e.length - 1; t >= 0; t--) this._expandBounds(e[t]);
            for (t = i.length - 1; t >= 0; t--) this._expandBounds(i[t]);
        },
        _isSingleParent: function() {
            return this._childClusters.length > 0 && this._childClusters[0]._childCount === this._childCount;
        }
    }), L.DistanceGrid = function(t) {
        this._cellSize = t, this._sqCellSize = t * t, this._grid = {}, this._objectPoint = {};
    }, L.DistanceGrid.prototype = {
        addObject: function(t, e) {
            var i = this._getCoord(e.x), n = this._getCoord(e.y), s = this._grid, r = s[n] = s[n] || {}, o = r[i] = r[i] || [], a = L.Util.stamp(t);
            this._objectPoint[a] = e, o.push(t);
        },
        updateObject: function(t, e) {
            this.removeObject(t), this.addObject(t, e);
        },
        removeObject: function(t, e) {
            var i, n, s = this._getCoord(e.x), r = this._getCoord(e.y), o = this._grid, a = o[r] = o[r] || {}, h = a[s] = a[s] || [];
            for (delete this._objectPoint[L.Util.stamp(t)], i = 0, n = h.length; n > i; i++) if (h[i] === t) return h.splice(i, 1), 
            1 === n && delete a[s], !0;
        },
        eachObject: function(t, e) {
            var i, n, s, r, o, a, h, _ = this._grid;
            for (i in _) {
                o = _[i];
                for (n in o) for (a = o[n], s = 0, r = a.length; r > s; s++) h = t.call(e, a[s]), 
                h && (s--, r--);
            }
        },
        getNearObject: function(t) {
            var e, i, n, s, r, o, a, h, _ = this._getCoord(t.x), u = this._getCoord(t.y), l = this._objectPoint, d = this._sqCellSize, p = null;
            for (e = u - 1; u + 1 >= e; e++) if (s = this._grid[e]) for (i = _ - 1; _ + 1 >= i; i++) if (r = s[i]) for (n = 0, 
            o = r.length; o > n; n++) a = r[n], h = this._sqDist(l[L.Util.stamp(a)], t), d > h && (d = h, 
            p = a);
            return p;
        },
        _getCoord: function(t) {
            return Math.floor(t / this._cellSize);
        },
        _sqDist: function(t, e) {
            var i = e.x - t.x, n = e.y - t.y;
            return i * i + n * n;
        }
    }, function() {
        L.QuickHull = {
            getDistant: function(t, e) {
                var i = e[1].lat - e[0].lat, n = e[0].lng - e[1].lng;
                return n * (t.lat - e[0].lat) + i * (t.lng - e[0].lng);
            },
            findMostDistantPointFromBaseLine: function(t, e) {
                var i, n, s, r = 0, o = null, a = [];
                for (i = e.length - 1; i >= 0; i--) n = e[i], s = this.getDistant(n, t), s > 0 && (a.push(n), 
                s > r && (r = s, o = n));
                return {
                    maxPoint: o,
                    newPoints: a
                };
            },
            buildConvexHull: function(t, e) {
                var i = [], n = this.findMostDistantPointFromBaseLine(t, e);
                return n.maxPoint ? (i = i.concat(this.buildConvexHull([ t[0], n.maxPoint ], n.newPoints)), 
                i = i.concat(this.buildConvexHull([ n.maxPoint, t[1] ], n.newPoints))) : [ t[0] ];
            },
            getConvexHull: function(t) {
                var e, i = !1, n = !1, s = null, r = null;
                for (e = t.length - 1; e >= 0; e--) {
                    var o = t[e];
                    (i === !1 || o.lat > i) && (s = o, i = o.lat), (n === !1 || o.lat < n) && (r = o, 
                    n = o.lat);
                }
                var a = [].concat(this.buildConvexHull([ r, s ], t), this.buildConvexHull([ s, r ], t));
                return a;
            }
        };
    }(), L.MarkerCluster.include({
        getConvexHull: function() {
            var t, e, i = this.getAllChildMarkers(), n = [];
            for (e = i.length - 1; e >= 0; e--) t = i[e].getLatLng(), n.push(t);
            return L.QuickHull.getConvexHull(n);
        }
    }), L.MarkerCluster.include({
        _2PI: 2 * Math.PI,
        _circleFootSeparation: 25,
        _circleStartAngle: Math.PI / 6,
        _spiralFootSeparation: 28,
        _spiralLengthStart: 11,
        _spiralLengthFactor: 5,
        _circleSpiralSwitchover: 9,
        spiderfy: function() {
            if (this._group._spiderfied !== this && !this._group._inZoomAnimation) {
                var t, e = this.getAllChildMarkers(), i = this._group, n = i._map, s = n.latLngToLayerPoint(this._latlng);
                this._group._unspiderfy(), this._group._spiderfied = this, e.length >= this._circleSpiralSwitchover ? t = this._generatePointsSpiral(e.length, s) : (s.y += 10, 
                t = this._generatePointsCircle(e.length, s)), this._animationSpiderfy(e, t);
            }
        },
        unspiderfy: function(t) {
            this._group._inZoomAnimation || (this._animationUnspiderfy(t), this._group._spiderfied = null);
        },
        _generatePointsCircle: function(t, e) {
            var i, n, s = this._group.options.spiderfyDistanceMultiplier * this._circleFootSeparation * (2 + t), r = s / this._2PI, o = this._2PI / t, a = [];
            for (a.length = t, i = t - 1; i >= 0; i--) n = this._circleStartAngle + i * o, a[i] = new L.Point(e.x + r * Math.cos(n), e.y + r * Math.sin(n))._round();
            return a;
        },
        _generatePointsSpiral: function(t, e) {
            var i, n = this._group.options.spiderfyDistanceMultiplier * this._spiralLengthStart, s = this._group.options.spiderfyDistanceMultiplier * this._spiralFootSeparation, r = this._group.options.spiderfyDistanceMultiplier * this._spiralLengthFactor, o = 0, a = [];
            for (a.length = t, i = t - 1; i >= 0; i--) o += s / n + 5e-4 * i, a[i] = new L.Point(e.x + n * Math.cos(o), e.y + n * Math.sin(o))._round(), 
            n += this._2PI * r / o;
            return a;
        },
        _noanimationUnspiderfy: function() {
            var t, e, i = this._group, n = i._map, s = i._featureGroup, r = this.getAllChildMarkers();
            for (this.setOpacity(1), e = r.length - 1; e >= 0; e--) t = r[e], s.removeLayer(t), 
            t._preSpiderfyLatlng && (t.setLatLng(t._preSpiderfyLatlng), delete t._preSpiderfyLatlng), 
            t.setZIndexOffset && t.setZIndexOffset(0), t._spiderLeg && (n.removeLayer(t._spiderLeg), 
            delete t._spiderLeg);
            i._spiderfied = null;
        }
    }), L.MarkerCluster.include(L.DomUtil.TRANSITION ? {
        SVG_ANIMATION: function() {
            return e.createElementNS("http://www.w3.org/2000/svg", "animate").toString().indexOf("SVGAnimate") > -1;
        }(),
        _animationSpiderfy: function(t, i) {
            var n, s, r, o, a = this, h = this._group, _ = h._map, u = h._featureGroup, l = _.latLngToLayerPoint(this._latlng);
            for (n = t.length - 1; n >= 0; n--) s = t[n], s.setOpacity ? (s.setZIndexOffset(1e6), 
            s.setOpacity(0), u.addLayer(s), s._setPos(l)) : u.addLayer(s);
            h._forceLayout(), h._animationStart();
            var d = L.Path.SVG ? 0 : .3, p = L.Path.SVG_NS;
            for (n = t.length - 1; n >= 0; n--) if (o = _.layerPointToLatLng(i[n]), s = t[n], 
            s._preSpiderfyLatlng = s._latlng, s.setLatLng(o), s.setOpacity && s.setOpacity(1), 
            r = new L.Polyline([ a._latlng, o ], {
                weight: 1.5,
                color: "#222",
                opacity: d
            }), _.addLayer(r), s._spiderLeg = r, L.Path.SVG && this.SVG_ANIMATION) {
                var c = r._path.getTotalLength();
                r._path.setAttribute("stroke-dasharray", c + "," + c);
                var f = e.createElementNS(p, "animate");
                f.setAttribute("attributeName", "stroke-dashoffset"), f.setAttribute("begin", "indefinite"), 
                f.setAttribute("from", c), f.setAttribute("to", 0), f.setAttribute("dur", .25), 
                r._path.appendChild(f), f.beginElement(), f = e.createElementNS(p, "animate"), f.setAttribute("attributeName", "stroke-opacity"), 
                f.setAttribute("attributeName", "stroke-opacity"), f.setAttribute("begin", "indefinite"), 
                f.setAttribute("from", 0), f.setAttribute("to", .5), f.setAttribute("dur", .25), 
                r._path.appendChild(f), f.beginElement();
            }
            if (a.setOpacity(.3), L.Path.SVG) for (this._group._forceLayout(), n = t.length - 1; n >= 0; n--) s = t[n]._spiderLeg, 
            s.options.opacity = .5, s._path.setAttribute("stroke-opacity", .5);
            setTimeout(function() {
                h._animationEnd(), h.fire("spiderfied");
            }, 200);
        },
        _animationUnspiderfy: function(t) {
            var e, i, n, s = this._group, r = s._map, o = s._featureGroup, a = t ? r._latLngToNewLayerPoint(this._latlng, t.zoom, t.center) : r.latLngToLayerPoint(this._latlng), h = this.getAllChildMarkers(), _ = L.Path.SVG && this.SVG_ANIMATION;
            for (s._animationStart(), this.setOpacity(1), i = h.length - 1; i >= 0; i--) e = h[i], 
            e._preSpiderfyLatlng && (e.setLatLng(e._preSpiderfyLatlng), delete e._preSpiderfyLatlng, 
            e.setOpacity ? (e._setPos(a), e.setOpacity(0)) : o.removeLayer(e), _ && (n = e._spiderLeg._path.childNodes[0], 
            n.setAttribute("to", n.getAttribute("from")), n.setAttribute("from", 0), n.beginElement(), 
            n = e._spiderLeg._path.childNodes[1], n.setAttribute("from", .5), n.setAttribute("to", 0), 
            n.setAttribute("stroke-opacity", 0), n.beginElement(), e._spiderLeg._path.setAttribute("stroke-opacity", 0)));
            setTimeout(function() {
                var t = 0;
                for (i = h.length - 1; i >= 0; i--) e = h[i], e._spiderLeg && t++;
                for (i = h.length - 1; i >= 0; i--) e = h[i], e._spiderLeg && (e.setOpacity && (e.setOpacity(1), 
                e.setZIndexOffset(0)), t > 1 && o.removeLayer(e), r.removeLayer(e._spiderLeg), delete e._spiderLeg);
                s._animationEnd();
            }, 200);
        }
    } : {
        _animationSpiderfy: function(t, e) {
            var i, n, s, r, o = this._group, a = o._map, h = o._featureGroup;
            for (i = t.length - 1; i >= 0; i--) r = a.layerPointToLatLng(e[i]), n = t[i], n._preSpiderfyLatlng = n._latlng, 
            n.setLatLng(r), n.setZIndexOffset && n.setZIndexOffset(1e6), h.addLayer(n), s = new L.Polyline([ this._latlng, r ], {
                weight: 1.5,
                color: "#222"
            }), a.addLayer(s), n._spiderLeg = s;
            this.setOpacity(.3), o.fire("spiderfied");
        },
        _animationUnspiderfy: function() {
            this._noanimationUnspiderfy();
        }
    }), L.MarkerClusterGroup.include({
        _spiderfied: null,
        _spiderfierOnAdd: function() {
            this._map.on("click", this._unspiderfyWrapper, this), this._map.options.zoomAnimation && this._map.on("zoomstart", this._unspiderfyZoomStart, this), 
            this._map.on("zoomend", this._noanimationUnspiderfy, this), L.Path.SVG && !L.Browser.touch && this._map._initPathRoot();
        },
        _spiderfierOnRemove: function() {
            this._map.off("click", this._unspiderfyWrapper, this), this._map.off("zoomstart", this._unspiderfyZoomStart, this), 
            this._map.off("zoomanim", this._unspiderfyZoomAnim, this), this._unspiderfy();
        },
        _unspiderfyZoomStart: function() {
            this._map && this._map.on("zoomanim", this._unspiderfyZoomAnim, this);
        },
        _unspiderfyZoomAnim: function(t) {
            L.DomUtil.hasClass(this._map._mapPane, "leaflet-touching") || (this._map.off("zoomanim", this._unspiderfyZoomAnim, this), 
            this._unspiderfy(t));
        },
        _unspiderfyWrapper: function() {
            this._unspiderfy();
        },
        _unspiderfy: function(t) {
            this._spiderfied && this._spiderfied.unspiderfy(t);
        },
        _noanimationUnspiderfy: function() {
            this._spiderfied && this._spiderfied._noanimationUnspiderfy();
        },
        _unspiderfyLayer: function(t) {
            t._spiderLeg && (this._featureGroup.removeLayer(t), t.setOpacity(1), t.setZIndexOffset(0), 
            this._map.removeLayer(t._spiderLeg), delete t._spiderLeg);
        }
    });
}(window, document);

/**
* easyModal.js v1.3.1
* A minimal jQuery modal that works with your CSS.
* Author: Flavius Matis - http://flaviusmatis.github.com/
* URL: https://github.com/flaviusmatis/easyModal.js
*/
/*jslint browser: true*/
/*global jQuery*/
(function($) {
    "use strict";
    var methods = {
        init: function(options) {
            var defaults = {
                top: "auto",
                left: "auto",
                autoOpen: false,
                overlayOpacity: .5,
                overlayColor: "#000",
                overlayClose: true,
                overlayParent: "body",
                closeOnEscape: true,
                closeButtonClass: ".close",
                transitionIn: "",
                transitionOut: "",
                onOpen: false,
                onClose: false,
                zIndex: function() {
                    return function(value) {
                        return value === -Infinity ? 0 : value + 1;
                    }(Math.max.apply(Math, $.makeArray($("*").map(function() {
                        return $(this).css("z-index");
                    }).filter(function() {
                        return $.isNumeric(this);
                    }).map(function() {
                        return parseInt(this, 10);
                    }))));
                },
                updateZIndexOnOpen: true
            };
            options = $.extend(defaults, options);
            return this.each(function() {
                var o = options, $overlay = $('<div class="lean-overlay"></div>'), $modal = $(this);
                $overlay.css({
                    display: "none",
                    position: "fixed",
                    // When updateZIndexOnOpen is set to true, we avoid computing the z-index on initialization,
                    // because the value would be replaced when opening the modal.
                    "z-index": o.updateZIndexOnOpen ? 0 : o.zIndex(),
                    top: 0,
                    left: 0,
                    height: "100%",
                    width: "100%",
                    background: o.overlayColor,
                    opacity: o.overlayOpacity,
                    overflow: "auto"
                }).appendTo(o.overlayParent);
                $modal.css({
                    display: "none",
                    position: "fixed",
                    // When updateZIndexOnOpen is set to true, we avoid computing the z-index on initialization,
                    // because the value would be replaced when opening the modal.
                    "z-index": o.updateZIndexOnOpen ? 0 : o.zIndex() + 1,
                    left: parseInt(o.left, 10) > -1 ? o.left + "px" : 50 + "%",
                    top: parseInt(o.top, 10) > -1 ? o.top + "px" : 50 + "%"
                });
                $modal.bind("openModal", function() {
                    var overlayZ = o.updateZIndexOnOpen ? o.zIndex() : parseInt($overlay.css("z-index"), 10), modalZ = overlayZ + 1;
                    if (o.transitionIn !== "" && o.transitionOut !== "") {
                        $modal.removeClass(o.transitionOut).addClass(o.transitionIn);
                    }
                    $modal.css({
                        display: "block",
                        "margin-left": (parseInt(o.left, 10) > -1 ? 0 : -($modal.outerWidth() / 2)) + "px",
                        "margin-top": (parseInt(o.top, 10) > -1 ? 0 : -($modal.outerHeight() / 2)) + "px",
                        "z-index": modalZ
                    });
                    $overlay.css({
                        "z-index": overlayZ,
                        display: "block"
                    });
                    if (o.onOpen && typeof o.onOpen === "function") {
                        // onOpen callback receives as argument the modal window
                        o.onOpen($modal[0]);
                    }
                });
                $modal.bind("closeModal", function() {
                    if (o.transitionIn !== "" && o.transitionOut !== "") {
                        $modal.removeClass(o.transitionIn).addClass(o.transitionOut);
                        $modal.one("webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend", function() {
                            $modal.css("display", "none");
                            $overlay.css("display", "none");
                        });
                    } else {
                        $modal.css("display", "none");
                        $overlay.css("display", "none");
                    }
                    if (o.onClose && typeof o.onClose === "function") {
                        // onClose callback receives as argument the modal window
                        o.onClose($modal[0]);
                    }
                });
                // Close on overlay click
                $overlay.click(function() {
                    if (o.overlayClose) {
                        $modal.trigger("closeModal");
                    }
                });
                $(document).keydown(function(e) {
                    // ESCAPE key pressed
                    if (o.closeOnEscape && e.keyCode === 27) {
                        $modal.trigger("closeModal");
                    }
                });
                // Close when button pressed
                $modal.on("click", o.closeButtonClass, function(e) {
                    $modal.trigger("closeModal");
                    e.preventDefault();
                });
                // Automatically open modal if option set
                if (o.autoOpen) {
                    $modal.trigger("openModal");
                }
            });
        }
    };
    $.fn.easyModal = function(method) {
        // Method calling logic
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        if (typeof method === "object" || !method) {
            return methods.init.apply(this, arguments);
        }
        $.error("Method " + method + " does not exist on jQuery.easyModal");
    };
})(jQuery);

/*! jQuery UI - v1.11.3 - 2015-03-08
* http://jqueryui.com
* Includes: core.js, widget.js, position.js, autocomplete.js, menu.js
* Copyright 2015 jQuery Foundation and other contributors; Licensed MIT */
(function(e) {
    "function" == typeof define && define.amd ? define([ "jquery" ], e) : e(jQuery);
})(function(e) {
    function t(t, s) {
        var n, a, o, r = t.nodeName.toLowerCase();
        return "area" === r ? (n = t.parentNode, a = n.name, t.href && a && "map" === n.nodeName.toLowerCase() ? (o = e("img[usemap='#" + a + "']")[0], 
        !!o && i(o)) : !1) : (/^(input|select|textarea|button|object)$/.test(r) ? !t.disabled : "a" === r ? t.href || s : s) && i(t);
    }
    function i(t) {
        return e.expr.filters.visible(t) && !e(t).parents().addBack().filter(function() {
            return "hidden" === e.css(this, "visibility");
        }).length;
    }
    e.ui = e.ui || {}, e.extend(e.ui, {
        version: "1.11.3",
        keyCode: {
            BACKSPACE: 8,
            COMMA: 188,
            DELETE: 46,
            DOWN: 40,
            END: 35,
            ENTER: 13,
            ESCAPE: 27,
            HOME: 36,
            LEFT: 37,
            PAGE_DOWN: 34,
            PAGE_UP: 33,
            PERIOD: 190,
            RIGHT: 39,
            SPACE: 32,
            TAB: 9,
            UP: 38
        }
    }), e.fn.extend({
        scrollParent: function(t) {
            var i = this.css("position"), s = "absolute" === i, n = t ? /(auto|scroll|hidden)/ : /(auto|scroll)/, a = this.parents().filter(function() {
                var t = e(this);
                return s && "static" === t.css("position") ? !1 : n.test(t.css("overflow") + t.css("overflow-y") + t.css("overflow-x"));
            }).eq(0);
            return "fixed" !== i && a.length ? a : e(this[0].ownerDocument || document);
        },
        uniqueId: function() {
            var e = 0;
            return function() {
                return this.each(function() {
                    this.id || (this.id = "ui-id-" + ++e);
                });
            };
        }(),
        removeUniqueId: function() {
            return this.each(function() {
                /^ui-id-\d+$/.test(this.id) && e(this).removeAttr("id");
            });
        }
    }), e.extend(e.expr[":"], {
        data: e.expr.createPseudo ? e.expr.createPseudo(function(t) {
            return function(i) {
                return !!e.data(i, t);
            };
        }) : function(t, i, s) {
            return !!e.data(t, s[3]);
        },
        focusable: function(i) {
            return t(i, !isNaN(e.attr(i, "tabindex")));
        },
        tabbable: function(i) {
            var s = e.attr(i, "tabindex"), n = isNaN(s);
            return (n || s >= 0) && t(i, !n);
        }
    }), e("<a>").outerWidth(1).jquery || e.each([ "Width", "Height" ], function(t, i) {
        function s(t, i, s, a) {
            return e.each(n, function() {
                i -= parseFloat(e.css(t, "padding" + this)) || 0, s && (i -= parseFloat(e.css(t, "border" + this + "Width")) || 0), 
                a && (i -= parseFloat(e.css(t, "margin" + this)) || 0);
            }), i;
        }
        var n = "Width" === i ? [ "Left", "Right" ] : [ "Top", "Bottom" ], a = i.toLowerCase(), o = {
            innerWidth: e.fn.innerWidth,
            innerHeight: e.fn.innerHeight,
            outerWidth: e.fn.outerWidth,
            outerHeight: e.fn.outerHeight
        };
        e.fn["inner" + i] = function(t) {
            return void 0 === t ? o["inner" + i].call(this) : this.each(function() {
                e(this).css(a, s(this, t) + "px");
            });
        }, e.fn["outer" + i] = function(t, n) {
            return "number" != typeof t ? o["outer" + i].call(this, t) : this.each(function() {
                e(this).css(a, s(this, t, !0, n) + "px");
            });
        };
    }), e.fn.addBack || (e.fn.addBack = function(e) {
        return this.add(null == e ? this.prevObject : this.prevObject.filter(e));
    }), e("<a>").data("a-b", "a").removeData("a-b").data("a-b") && (e.fn.removeData = function(t) {
        return function(i) {
            return arguments.length ? t.call(this, e.camelCase(i)) : t.call(this);
        };
    }(e.fn.removeData)), e.ui.ie = !!/msie [\w.]+/.exec(navigator.userAgent.toLowerCase()), 
    e.fn.extend({
        focus: function(t) {
            return function(i, s) {
                return "number" == typeof i ? this.each(function() {
                    var t = this;
                    setTimeout(function() {
                        e(t).focus(), s && s.call(t);
                    }, i);
                }) : t.apply(this, arguments);
            };
        }(e.fn.focus),
        disableSelection: function() {
            var e = "onselectstart" in document.createElement("div") ? "selectstart" : "mousedown";
            return function() {
                return this.bind(e + ".ui-disableSelection", function(e) {
                    e.preventDefault();
                });
            };
        }(),
        enableSelection: function() {
            return this.unbind(".ui-disableSelection");
        },
        zIndex: function(t) {
            if (void 0 !== t) return this.css("zIndex", t);
            if (this.length) for (var i, s, n = e(this[0]); n.length && n[0] !== document; ) {
                if (i = n.css("position"), ("absolute" === i || "relative" === i || "fixed" === i) && (s = parseInt(n.css("zIndex"), 10), 
                !isNaN(s) && 0 !== s)) return s;
                n = n.parent();
            }
            return 0;
        }
    }), e.ui.plugin = {
        add: function(t, i, s) {
            var n, a = e.ui[t].prototype;
            for (n in s) a.plugins[n] = a.plugins[n] || [], a.plugins[n].push([ i, s[n] ]);
        },
        call: function(e, t, i, s) {
            var n, a = e.plugins[t];
            if (a && (s || e.element[0].parentNode && 11 !== e.element[0].parentNode.nodeType)) for (n = 0; a.length > n; n++) e.options[a[n][0]] && a[n][1].apply(e.element, i);
        }
    };
    var s = 0, n = Array.prototype.slice;
    e.cleanData = function(t) {
        return function(i) {
            var s, n, a;
            for (a = 0; null != (n = i[a]); a++) try {
                s = e._data(n, "events"), s && s.remove && e(n).triggerHandler("remove");
            } catch (o) {}
            t(i);
        };
    }(e.cleanData), e.widget = function(t, i, s) {
        var n, a, o, r, h = {}, l = t.split(".")[0];
        return t = t.split(".")[1], n = l + "-" + t, s || (s = i, i = e.Widget), e.expr[":"][n.toLowerCase()] = function(t) {
            return !!e.data(t, n);
        }, e[l] = e[l] || {}, a = e[l][t], o = e[l][t] = function(e, t) {
            return this._createWidget ? (arguments.length && this._createWidget(e, t), void 0) : new o(e, t);
        }, e.extend(o, a, {
            version: s.version,
            _proto: e.extend({}, s),
            _childConstructors: []
        }), r = new i(), r.options = e.widget.extend({}, r.options), e.each(s, function(t, s) {
            return e.isFunction(s) ? (h[t] = function() {
                var e = function() {
                    return i.prototype[t].apply(this, arguments);
                }, n = function(e) {
                    return i.prototype[t].apply(this, e);
                };
                return function() {
                    var t, i = this._super, a = this._superApply;
                    return this._super = e, this._superApply = n, t = s.apply(this, arguments), this._super = i, 
                    this._superApply = a, t;
                };
            }(), void 0) : (h[t] = s, void 0);
        }), o.prototype = e.widget.extend(r, {
            widgetEventPrefix: a ? r.widgetEventPrefix || t : t
        }, h, {
            constructor: o,
            namespace: l,
            widgetName: t,
            widgetFullName: n
        }), a ? (e.each(a._childConstructors, function(t, i) {
            var s = i.prototype;
            e.widget(s.namespace + "." + s.widgetName, o, i._proto);
        }), delete a._childConstructors) : i._childConstructors.push(o), e.widget.bridge(t, o), 
        o;
    }, e.widget.extend = function(t) {
        for (var i, s, a = n.call(arguments, 1), o = 0, r = a.length; r > o; o++) for (i in a[o]) s = a[o][i], 
        a[o].hasOwnProperty(i) && void 0 !== s && (t[i] = e.isPlainObject(s) ? e.isPlainObject(t[i]) ? e.widget.extend({}, t[i], s) : e.widget.extend({}, s) : s);
        return t;
    }, e.widget.bridge = function(t, i) {
        var s = i.prototype.widgetFullName || t;
        e.fn[t] = function(a) {
            var o = "string" == typeof a, r = n.call(arguments, 1), h = this;
            return o ? this.each(function() {
                var i, n = e.data(this, s);
                return "instance" === a ? (h = n, !1) : n ? e.isFunction(n[a]) && "_" !== a.charAt(0) ? (i = n[a].apply(n, r), 
                i !== n && void 0 !== i ? (h = i && i.jquery ? h.pushStack(i.get()) : i, !1) : void 0) : e.error("no such method '" + a + "' for " + t + " widget instance") : e.error("cannot call methods on " + t + " prior to initialization; " + "attempted to call method '" + a + "'");
            }) : (r.length && (a = e.widget.extend.apply(null, [ a ].concat(r))), this.each(function() {
                var t = e.data(this, s);
                t ? (t.option(a || {}), t._init && t._init()) : e.data(this, s, new i(a, this));
            })), h;
        };
    }, e.Widget = function() {}, e.Widget._childConstructors = [], e.Widget.prototype = {
        widgetName: "widget",
        widgetEventPrefix: "",
        defaultElement: "<div>",
        options: {
            disabled: !1,
            create: null
        },
        _createWidget: function(t, i) {
            i = e(i || this.defaultElement || this)[0], this.element = e(i), this.uuid = s++, 
            this.eventNamespace = "." + this.widgetName + this.uuid, this.bindings = e(), this.hoverable = e(), 
            this.focusable = e(), i !== this && (e.data(i, this.widgetFullName, this), this._on(!0, this.element, {
                remove: function(e) {
                    e.target === i && this.destroy();
                }
            }), this.document = e(i.style ? i.ownerDocument : i.document || i), this.window = e(this.document[0].defaultView || this.document[0].parentWindow)), 
            this.options = e.widget.extend({}, this.options, this._getCreateOptions(), t), this._create(), 
            this._trigger("create", null, this._getCreateEventData()), this._init();
        },
        _getCreateOptions: e.noop,
        _getCreateEventData: e.noop,
        _create: e.noop,
        _init: e.noop,
        destroy: function() {
            this._destroy(), this.element.unbind(this.eventNamespace).removeData(this.widgetFullName).removeData(e.camelCase(this.widgetFullName)), 
            this.widget().unbind(this.eventNamespace).removeAttr("aria-disabled").removeClass(this.widgetFullName + "-disabled " + "ui-state-disabled"), 
            this.bindings.unbind(this.eventNamespace), this.hoverable.removeClass("ui-state-hover"), 
            this.focusable.removeClass("ui-state-focus");
        },
        _destroy: e.noop,
        widget: function() {
            return this.element;
        },
        option: function(t, i) {
            var s, n, a, o = t;
            if (0 === arguments.length) return e.widget.extend({}, this.options);
            if ("string" == typeof t) if (o = {}, s = t.split("."), t = s.shift(), s.length) {
                for (n = o[t] = e.widget.extend({}, this.options[t]), a = 0; s.length - 1 > a; a++) n[s[a]] = n[s[a]] || {}, 
                n = n[s[a]];
                if (t = s.pop(), 1 === arguments.length) return void 0 === n[t] ? null : n[t];
                n[t] = i;
            } else {
                if (1 === arguments.length) return void 0 === this.options[t] ? null : this.options[t];
                o[t] = i;
            }
            return this._setOptions(o), this;
        },
        _setOptions: function(e) {
            var t;
            for (t in e) this._setOption(t, e[t]);
            return this;
        },
        _setOption: function(e, t) {
            return this.options[e] = t, "disabled" === e && (this.widget().toggleClass(this.widgetFullName + "-disabled", !!t), 
            t && (this.hoverable.removeClass("ui-state-hover"), this.focusable.removeClass("ui-state-focus"))), 
            this;
        },
        enable: function() {
            return this._setOptions({
                disabled: !1
            });
        },
        disable: function() {
            return this._setOptions({
                disabled: !0
            });
        },
        _on: function(t, i, s) {
            var n, a = this;
            "boolean" != typeof t && (s = i, i = t, t = !1), s ? (i = n = e(i), this.bindings = this.bindings.add(i)) : (s = i, 
            i = this.element, n = this.widget()), e.each(s, function(s, o) {
                function r() {
                    return t || a.options.disabled !== !0 && !e(this).hasClass("ui-state-disabled") ? ("string" == typeof o ? a[o] : o).apply(a, arguments) : void 0;
                }
                "string" != typeof o && (r.guid = o.guid = o.guid || r.guid || e.guid++);
                var h = s.match(/^([\w:-]*)\s*(.*)$/), l = h[1] + a.eventNamespace, u = h[2];
                u ? n.delegate(u, l, r) : i.bind(l, r);
            });
        },
        _off: function(t, i) {
            i = (i || "").split(" ").join(this.eventNamespace + " ") + this.eventNamespace, 
            t.unbind(i).undelegate(i), this.bindings = e(this.bindings.not(t).get()), this.focusable = e(this.focusable.not(t).get()), 
            this.hoverable = e(this.hoverable.not(t).get());
        },
        _delay: function(e, t) {
            function i() {
                return ("string" == typeof e ? s[e] : e).apply(s, arguments);
            }
            var s = this;
            return setTimeout(i, t || 0);
        },
        _hoverable: function(t) {
            this.hoverable = this.hoverable.add(t), this._on(t, {
                mouseenter: function(t) {
                    e(t.currentTarget).addClass("ui-state-hover");
                },
                mouseleave: function(t) {
                    e(t.currentTarget).removeClass("ui-state-hover");
                }
            });
        },
        _focusable: function(t) {
            this.focusable = this.focusable.add(t), this._on(t, {
                focusin: function(t) {
                    e(t.currentTarget).addClass("ui-state-focus");
                },
                focusout: function(t) {
                    e(t.currentTarget).removeClass("ui-state-focus");
                }
            });
        },
        _trigger: function(t, i, s) {
            var n, a, o = this.options[t];
            if (s = s || {}, i = e.Event(i), i.type = (t === this.widgetEventPrefix ? t : this.widgetEventPrefix + t).toLowerCase(), 
            i.target = this.element[0], a = i.originalEvent) for (n in a) n in i || (i[n] = a[n]);
            return this.element.trigger(i, s), !(e.isFunction(o) && o.apply(this.element[0], [ i ].concat(s)) === !1 || i.isDefaultPrevented());
        }
    }, e.each({
        show: "fadeIn",
        hide: "fadeOut"
    }, function(t, i) {
        e.Widget.prototype["_" + t] = function(s, n, a) {
            "string" == typeof n && (n = {
                effect: n
            });
            var o, r = n ? n === !0 || "number" == typeof n ? i : n.effect || i : t;
            n = n || {}, "number" == typeof n && (n = {
                duration: n
            }), o = !e.isEmptyObject(n), n.complete = a, n.delay && s.delay(n.delay), o && e.effects && e.effects.effect[r] ? s[t](n) : r !== t && s[r] ? s[r](n.duration, n.easing, a) : s.queue(function(i) {
                e(this)[t](), a && a.call(s[0]), i();
            });
        };
    }), e.widget, function() {
        function t(e, t, i) {
            return [ parseFloat(e[0]) * (p.test(e[0]) ? t / 100 : 1), parseFloat(e[1]) * (p.test(e[1]) ? i / 100 : 1) ];
        }
        function i(t, i) {
            return parseInt(e.css(t, i), 10) || 0;
        }
        function s(t) {
            var i = t[0];
            return 9 === i.nodeType ? {
                width: t.width(),
                height: t.height(),
                offset: {
                    top: 0,
                    left: 0
                }
            } : e.isWindow(i) ? {
                width: t.width(),
                height: t.height(),
                offset: {
                    top: t.scrollTop(),
                    left: t.scrollLeft()
                }
            } : i.preventDefault ? {
                width: 0,
                height: 0,
                offset: {
                    top: i.pageY,
                    left: i.pageX
                }
            } : {
                width: t.outerWidth(),
                height: t.outerHeight(),
                offset: t.offset()
            };
        }
        e.ui = e.ui || {};
        var n, a, o = Math.max, r = Math.abs, h = Math.round, l = /left|center|right/, u = /top|center|bottom/, d = /[\+\-]\d+(\.[\d]+)?%?/, c = /^\w+/, p = /%$/, f = e.fn.position;
        e.position = {
            scrollbarWidth: function() {
                if (void 0 !== n) return n;
                var t, i, s = e("<div style='display:block;position:absolute;width:50px;height:50px;overflow:hidden;'><div style='height:100px;width:auto;'></div></div>"), a = s.children()[0];
                return e("body").append(s), t = a.offsetWidth, s.css("overflow", "scroll"), i = a.offsetWidth, 
                t === i && (i = s[0].clientWidth), s.remove(), n = t - i;
            },
            getScrollInfo: function(t) {
                var i = t.isWindow || t.isDocument ? "" : t.element.css("overflow-x"), s = t.isWindow || t.isDocument ? "" : t.element.css("overflow-y"), n = "scroll" === i || "auto" === i && t.width < t.element[0].scrollWidth, a = "scroll" === s || "auto" === s && t.height < t.element[0].scrollHeight;
                return {
                    width: a ? e.position.scrollbarWidth() : 0,
                    height: n ? e.position.scrollbarWidth() : 0
                };
            },
            getWithinInfo: function(t) {
                var i = e(t || window), s = e.isWindow(i[0]), n = !!i[0] && 9 === i[0].nodeType;
                return {
                    element: i,
                    isWindow: s,
                    isDocument: n,
                    offset: i.offset() || {
                        left: 0,
                        top: 0
                    },
                    scrollLeft: i.scrollLeft(),
                    scrollTop: i.scrollTop(),
                    width: s || n ? i.width() : i.outerWidth(),
                    height: s || n ? i.height() : i.outerHeight()
                };
            }
        }, e.fn.position = function(n) {
            if (!n || !n.of) return f.apply(this, arguments);
            n = e.extend({}, n);
            var p, m, g, v, y, b, _ = e(n.of), x = e.position.getWithinInfo(n.within), w = e.position.getScrollInfo(x), k = (n.collision || "flip").split(" "), T = {};
            return b = s(_), _[0].preventDefault && (n.at = "left top"), m = b.width, g = b.height, 
            v = b.offset, y = e.extend({}, v), e.each([ "my", "at" ], function() {
                var e, t, i = (n[this] || "").split(" ");
                1 === i.length && (i = l.test(i[0]) ? i.concat([ "center" ]) : u.test(i[0]) ? [ "center" ].concat(i) : [ "center", "center" ]), 
                i[0] = l.test(i[0]) ? i[0] : "center", i[1] = u.test(i[1]) ? i[1] : "center", e = d.exec(i[0]), 
                t = d.exec(i[1]), T[this] = [ e ? e[0] : 0, t ? t[0] : 0 ], n[this] = [ c.exec(i[0])[0], c.exec(i[1])[0] ];
            }), 1 === k.length && (k[1] = k[0]), "right" === n.at[0] ? y.left += m : "center" === n.at[0] && (y.left += m / 2), 
            "bottom" === n.at[1] ? y.top += g : "center" === n.at[1] && (y.top += g / 2), p = t(T.at, m, g), 
            y.left += p[0], y.top += p[1], this.each(function() {
                var s, l, u = e(this), d = u.outerWidth(), c = u.outerHeight(), f = i(this, "marginLeft"), b = i(this, "marginTop"), D = d + f + i(this, "marginRight") + w.width, S = c + b + i(this, "marginBottom") + w.height, N = e.extend({}, y), M = t(T.my, u.outerWidth(), u.outerHeight());
                "right" === n.my[0] ? N.left -= d : "center" === n.my[0] && (N.left -= d / 2), "bottom" === n.my[1] ? N.top -= c : "center" === n.my[1] && (N.top -= c / 2), 
                N.left += M[0], N.top += M[1], a || (N.left = h(N.left), N.top = h(N.top)), s = {
                    marginLeft: f,
                    marginTop: b
                }, e.each([ "left", "top" ], function(t, i) {
                    e.ui.position[k[t]] && e.ui.position[k[t]][i](N, {
                        targetWidth: m,
                        targetHeight: g,
                        elemWidth: d,
                        elemHeight: c,
                        collisionPosition: s,
                        collisionWidth: D,
                        collisionHeight: S,
                        offset: [ p[0] + M[0], p[1] + M[1] ],
                        my: n.my,
                        at: n.at,
                        within: x,
                        elem: u
                    });
                }), n.using && (l = function(e) {
                    var t = v.left - N.left, i = t + m - d, s = v.top - N.top, a = s + g - c, h = {
                        target: {
                            element: _,
                            left: v.left,
                            top: v.top,
                            width: m,
                            height: g
                        },
                        element: {
                            element: u,
                            left: N.left,
                            top: N.top,
                            width: d,
                            height: c
                        },
                        horizontal: 0 > i ? "left" : t > 0 ? "right" : "center",
                        vertical: 0 > a ? "top" : s > 0 ? "bottom" : "middle"
                    };
                    d > m && m > r(t + i) && (h.horizontal = "center"), c > g && g > r(s + a) && (h.vertical = "middle"), 
                    h.important = o(r(t), r(i)) > o(r(s), r(a)) ? "horizontal" : "vertical", n.using.call(this, e, h);
                }), u.offset(e.extend(N, {
                    using: l
                }));
            });
        }, e.ui.position = {
            fit: {
                left: function(e, t) {
                    var i, s = t.within, n = s.isWindow ? s.scrollLeft : s.offset.left, a = s.width, r = e.left - t.collisionPosition.marginLeft, h = n - r, l = r + t.collisionWidth - a - n;
                    t.collisionWidth > a ? h > 0 && 0 >= l ? (i = e.left + h + t.collisionWidth - a - n, 
                    e.left += h - i) : e.left = l > 0 && 0 >= h ? n : h > l ? n + a - t.collisionWidth : n : h > 0 ? e.left += h : l > 0 ? e.left -= l : e.left = o(e.left - r, e.left);
                },
                top: function(e, t) {
                    var i, s = t.within, n = s.isWindow ? s.scrollTop : s.offset.top, a = t.within.height, r = e.top - t.collisionPosition.marginTop, h = n - r, l = r + t.collisionHeight - a - n;
                    t.collisionHeight > a ? h > 0 && 0 >= l ? (i = e.top + h + t.collisionHeight - a - n, 
                    e.top += h - i) : e.top = l > 0 && 0 >= h ? n : h > l ? n + a - t.collisionHeight : n : h > 0 ? e.top += h : l > 0 ? e.top -= l : e.top = o(e.top - r, e.top);
                }
            },
            flip: {
                left: function(e, t) {
                    var i, s, n = t.within, a = n.offset.left + n.scrollLeft, o = n.width, h = n.isWindow ? n.scrollLeft : n.offset.left, l = e.left - t.collisionPosition.marginLeft, u = l - h, d = l + t.collisionWidth - o - h, c = "left" === t.my[0] ? -t.elemWidth : "right" === t.my[0] ? t.elemWidth : 0, p = "left" === t.at[0] ? t.targetWidth : "right" === t.at[0] ? -t.targetWidth : 0, f = -2 * t.offset[0];
                    0 > u ? (i = e.left + c + p + f + t.collisionWidth - o - a, (0 > i || r(u) > i) && (e.left += c + p + f)) : d > 0 && (s = e.left - t.collisionPosition.marginLeft + c + p + f - h, 
                    (s > 0 || d > r(s)) && (e.left += c + p + f));
                },
                top: function(e, t) {
                    var i, s, n = t.within, a = n.offset.top + n.scrollTop, o = n.height, h = n.isWindow ? n.scrollTop : n.offset.top, l = e.top - t.collisionPosition.marginTop, u = l - h, d = l + t.collisionHeight - o - h, c = "top" === t.my[1], p = c ? -t.elemHeight : "bottom" === t.my[1] ? t.elemHeight : 0, f = "top" === t.at[1] ? t.targetHeight : "bottom" === t.at[1] ? -t.targetHeight : 0, m = -2 * t.offset[1];
                    0 > u ? (s = e.top + p + f + m + t.collisionHeight - o - a, (0 > s || r(u) > s) && (e.top += p + f + m)) : d > 0 && (i = e.top - t.collisionPosition.marginTop + p + f + m - h, 
                    (i > 0 || d > r(i)) && (e.top += p + f + m));
                }
            },
            flipfit: {
                left: function() {
                    e.ui.position.flip.left.apply(this, arguments), e.ui.position.fit.left.apply(this, arguments);
                },
                top: function() {
                    e.ui.position.flip.top.apply(this, arguments), e.ui.position.fit.top.apply(this, arguments);
                }
            }
        }, function() {
            var t, i, s, n, o, r = document.getElementsByTagName("body")[0], h = document.createElement("div");
            t = document.createElement(r ? "div" : "body"), s = {
                visibility: "hidden",
                width: 0,
                height: 0,
                border: 0,
                margin: 0,
                background: "none"
            }, r && e.extend(s, {
                position: "absolute",
                left: "-1000px",
                top: "-1000px"
            });
            for (o in s) t.style[o] = s[o];
            t.appendChild(h), i = r || document.documentElement, i.insertBefore(t, i.firstChild), 
            h.style.cssText = "position: absolute; left: 10.7432222px;", n = e(h).offset().left, 
            a = n > 10 && 11 > n, t.innerHTML = "", i.removeChild(t);
        }();
    }(), e.ui.position, e.widget("ui.menu", {
        version: "1.11.3",
        defaultElement: "<ul>",
        delay: 300,
        options: {
            icons: {
                submenu: "ui-icon-carat-1-e"
            },
            items: "> *",
            menus: "ul",
            position: {
                my: "left-1 top",
                at: "right top"
            },
            role: "menu",
            blur: null,
            focus: null,
            select: null
        },
        _create: function() {
            this.activeMenu = this.element, this.mouseHandled = !1, this.element.uniqueId().addClass("ui-menu ui-widget ui-widget-content").toggleClass("ui-menu-icons", !!this.element.find(".ui-icon").length).attr({
                role: this.options.role,
                tabIndex: 0
            }), this.options.disabled && this.element.addClass("ui-state-disabled").attr("aria-disabled", "true"), 
            this._on({
                "mousedown .ui-menu-item": function(e) {
                    e.preventDefault();
                },
                "click .ui-menu-item": function(t) {
                    var i = e(t.target);
                    !this.mouseHandled && i.not(".ui-state-disabled").length && (this.select(t), t.isPropagationStopped() || (this.mouseHandled = !0), 
                    i.has(".ui-menu").length ? this.expand(t) : !this.element.is(":focus") && e(this.document[0].activeElement).closest(".ui-menu").length && (this.element.trigger("focus", [ !0 ]), 
                    this.active && 1 === this.active.parents(".ui-menu").length && clearTimeout(this.timer)));
                },
                "mouseenter .ui-menu-item": function(t) {
                    if (!this.previousFilter) {
                        var i = e(t.currentTarget);
                        i.siblings(".ui-state-active").removeClass("ui-state-active"), this.focus(t, i);
                    }
                },
                mouseleave: "collapseAll",
                "mouseleave .ui-menu": "collapseAll",
                focus: function(e, t) {
                    var i = this.active || this.element.find(this.options.items).eq(0);
                    t || this.focus(e, i);
                },
                blur: function(t) {
                    this._delay(function() {
                        e.contains(this.element[0], this.document[0].activeElement) || this.collapseAll(t);
                    });
                },
                keydown: "_keydown"
            }), this.refresh(), this._on(this.document, {
                click: function(e) {
                    this._closeOnDocumentClick(e) && this.collapseAll(e), this.mouseHandled = !1;
                }
            });
        },
        _destroy: function() {
            this.element.removeAttr("aria-activedescendant").find(".ui-menu").addBack().removeClass("ui-menu ui-widget ui-widget-content ui-menu-icons ui-front").removeAttr("role").removeAttr("tabIndex").removeAttr("aria-labelledby").removeAttr("aria-expanded").removeAttr("aria-hidden").removeAttr("aria-disabled").removeUniqueId().show(), 
            this.element.find(".ui-menu-item").removeClass("ui-menu-item").removeAttr("role").removeAttr("aria-disabled").removeUniqueId().removeClass("ui-state-hover").removeAttr("tabIndex").removeAttr("role").removeAttr("aria-haspopup").children().each(function() {
                var t = e(this);
                t.data("ui-menu-submenu-carat") && t.remove();
            }), this.element.find(".ui-menu-divider").removeClass("ui-menu-divider ui-widget-content");
        },
        _keydown: function(t) {
            var i, s, n, a, o = !0;
            switch (t.keyCode) {
              case e.ui.keyCode.PAGE_UP:
                this.previousPage(t);
                break;

              case e.ui.keyCode.PAGE_DOWN:
                this.nextPage(t);
                break;

              case e.ui.keyCode.HOME:
                this._move("first", "first", t);
                break;

              case e.ui.keyCode.END:
                this._move("last", "last", t);
                break;

              case e.ui.keyCode.UP:
                this.previous(t);
                break;

              case e.ui.keyCode.DOWN:
                this.next(t);
                break;

              case e.ui.keyCode.LEFT:
                this.collapse(t);
                break;

              case e.ui.keyCode.RIGHT:
                this.active && !this.active.is(".ui-state-disabled") && this.expand(t);
                break;

              case e.ui.keyCode.ENTER:
              case e.ui.keyCode.SPACE:
                this._activate(t);
                break;

              case e.ui.keyCode.ESCAPE:
                this.collapse(t);
                break;

              default:
                o = !1, s = this.previousFilter || "", n = String.fromCharCode(t.keyCode), a = !1, 
                clearTimeout(this.filterTimer), n === s ? a = !0 : n = s + n, i = this._filterMenuItems(n), 
                i = a && -1 !== i.index(this.active.next()) ? this.active.nextAll(".ui-menu-item") : i, 
                i.length || (n = String.fromCharCode(t.keyCode), i = this._filterMenuItems(n)), 
                i.length ? (this.focus(t, i), this.previousFilter = n, this.filterTimer = this._delay(function() {
                    delete this.previousFilter;
                }, 1e3)) : delete this.previousFilter;
            }
            o && t.preventDefault();
        },
        _activate: function(e) {
            this.active.is(".ui-state-disabled") || (this.active.is("[aria-haspopup='true']") ? this.expand(e) : this.select(e));
        },
        refresh: function() {
            var t, i, s = this, n = this.options.icons.submenu, a = this.element.find(this.options.menus);
            this.element.toggleClass("ui-menu-icons", !!this.element.find(".ui-icon").length), 
            a.filter(":not(.ui-menu)").addClass("ui-menu ui-widget ui-widget-content ui-front").hide().attr({
                role: this.options.role,
                "aria-hidden": "true",
                "aria-expanded": "false"
            }).each(function() {
                var t = e(this), i = t.parent(), s = e("<span>").addClass("ui-menu-icon ui-icon " + n).data("ui-menu-submenu-carat", !0);
                i.attr("aria-haspopup", "true").prepend(s), t.attr("aria-labelledby", i.attr("id"));
            }), t = a.add(this.element), i = t.find(this.options.items), i.not(".ui-menu-item").each(function() {
                var t = e(this);
                s._isDivider(t) && t.addClass("ui-widget-content ui-menu-divider");
            }), i.not(".ui-menu-item, .ui-menu-divider").addClass("ui-menu-item").uniqueId().attr({
                tabIndex: -1,
                role: this._itemRole()
            }), i.filter(".ui-state-disabled").attr("aria-disabled", "true"), this.active && !e.contains(this.element[0], this.active[0]) && this.blur();
        },
        _itemRole: function() {
            return {
                menu: "menuitem",
                listbox: "option"
            }[this.options.role];
        },
        _setOption: function(e, t) {
            "icons" === e && this.element.find(".ui-menu-icon").removeClass(this.options.icons.submenu).addClass(t.submenu), 
            "disabled" === e && this.element.toggleClass("ui-state-disabled", !!t).attr("aria-disabled", t), 
            this._super(e, t);
        },
        focus: function(e, t) {
            var i, s;
            this.blur(e, e && "focus" === e.type), this._scrollIntoView(t), this.active = t.first(), 
            s = this.active.addClass("ui-state-focus").removeClass("ui-state-active"), this.options.role && this.element.attr("aria-activedescendant", s.attr("id")), 
            this.active.parent().closest(".ui-menu-item").addClass("ui-state-active"), e && "keydown" === e.type ? this._close() : this.timer = this._delay(function() {
                this._close();
            }, this.delay), i = t.children(".ui-menu"), i.length && e && /^mouse/.test(e.type) && this._startOpening(i), 
            this.activeMenu = t.parent(), this._trigger("focus", e, {
                item: t
            });
        },
        _scrollIntoView: function(t) {
            var i, s, n, a, o, r;
            this._hasScroll() && (i = parseFloat(e.css(this.activeMenu[0], "borderTopWidth")) || 0, 
            s = parseFloat(e.css(this.activeMenu[0], "paddingTop")) || 0, n = t.offset().top - this.activeMenu.offset().top - i - s, 
            a = this.activeMenu.scrollTop(), o = this.activeMenu.height(), r = t.outerHeight(), 
            0 > n ? this.activeMenu.scrollTop(a + n) : n + r > o && this.activeMenu.scrollTop(a + n - o + r));
        },
        blur: function(e, t) {
            t || clearTimeout(this.timer), this.active && (this.active.removeClass("ui-state-focus"), 
            this.active = null, this._trigger("blur", e, {
                item: this.active
            }));
        },
        _startOpening: function(e) {
            clearTimeout(this.timer), "true" === e.attr("aria-hidden") && (this.timer = this._delay(function() {
                this._close(), this._open(e);
            }, this.delay));
        },
        _open: function(t) {
            var i = e.extend({
                of: this.active
            }, this.options.position);
            clearTimeout(this.timer), this.element.find(".ui-menu").not(t.parents(".ui-menu")).hide().attr("aria-hidden", "true"), 
            t.show().removeAttr("aria-hidden").attr("aria-expanded", "true").position(i);
        },
        collapseAll: function(t, i) {
            clearTimeout(this.timer), this.timer = this._delay(function() {
                var s = i ? this.element : e(t && t.target).closest(this.element.find(".ui-menu"));
                s.length || (s = this.element), this._close(s), this.blur(t), this.activeMenu = s;
            }, this.delay);
        },
        _close: function(e) {
            e || (e = this.active ? this.active.parent() : this.element), e.find(".ui-menu").hide().attr("aria-hidden", "true").attr("aria-expanded", "false").end().find(".ui-state-active").not(".ui-state-focus").removeClass("ui-state-active");
        },
        _closeOnDocumentClick: function(t) {
            return !e(t.target).closest(".ui-menu").length;
        },
        _isDivider: function(e) {
            return !/[^\-\u2014\u2013\s]/.test(e.text());
        },
        collapse: function(e) {
            var t = this.active && this.active.parent().closest(".ui-menu-item", this.element);
            t && t.length && (this._close(), this.focus(e, t));
        },
        expand: function(e) {
            var t = this.active && this.active.children(".ui-menu ").find(this.options.items).first();
            t && t.length && (this._open(t.parent()), this._delay(function() {
                this.focus(e, t);
            }));
        },
        next: function(e) {
            this._move("next", "first", e);
        },
        previous: function(e) {
            this._move("prev", "last", e);
        },
        isFirstItem: function() {
            return this.active && !this.active.prevAll(".ui-menu-item").length;
        },
        isLastItem: function() {
            return this.active && !this.active.nextAll(".ui-menu-item").length;
        },
        _move: function(e, t, i) {
            var s;
            this.active && (s = "first" === e || "last" === e ? this.active["first" === e ? "prevAll" : "nextAll"](".ui-menu-item").eq(-1) : this.active[e + "All"](".ui-menu-item").eq(0)), 
            s && s.length && this.active || (s = this.activeMenu.find(this.options.items)[t]()), 
            this.focus(i, s);
        },
        nextPage: function(t) {
            var i, s, n;
            return this.active ? (this.isLastItem() || (this._hasScroll() ? (s = this.active.offset().top, 
            n = this.element.height(), this.active.nextAll(".ui-menu-item").each(function() {
                return i = e(this), 0 > i.offset().top - s - n;
            }), this.focus(t, i)) : this.focus(t, this.activeMenu.find(this.options.items)[this.active ? "last" : "first"]())), 
            void 0) : (this.next(t), void 0);
        },
        previousPage: function(t) {
            var i, s, n;
            return this.active ? (this.isFirstItem() || (this._hasScroll() ? (s = this.active.offset().top, 
            n = this.element.height(), this.active.prevAll(".ui-menu-item").each(function() {
                return i = e(this), i.offset().top - s + n > 0;
            }), this.focus(t, i)) : this.focus(t, this.activeMenu.find(this.options.items).first())), 
            void 0) : (this.next(t), void 0);
        },
        _hasScroll: function() {
            return this.element.outerHeight() < this.element.prop("scrollHeight");
        },
        select: function(t) {
            this.active = this.active || e(t.target).closest(".ui-menu-item");
            var i = {
                item: this.active
            };
            this.active.has(".ui-menu").length || this.collapseAll(t, !0), this._trigger("select", t, i);
        },
        _filterMenuItems: function(t) {
            var i = t.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&"), s = RegExp("^" + i, "i");
            return this.activeMenu.find(this.options.items).filter(".ui-menu-item").filter(function() {
                return s.test(e.trim(e(this).text()));
            });
        }
    }), e.widget("ui.autocomplete", {
        version: "1.11.3",
        defaultElement: "<input>",
        options: {
            appendTo: null,
            autoFocus: !1,
            delay: 300,
            minLength: 1,
            position: {
                my: "left top",
                at: "left bottom",
                collision: "none"
            },
            source: null,
            change: null,
            close: null,
            focus: null,
            open: null,
            response: null,
            search: null,
            select: null
        },
        requestIndex: 0,
        pending: 0,
        _create: function() {
            var t, i, s, n = this.element[0].nodeName.toLowerCase(), a = "textarea" === n, o = "input" === n;
            this.isMultiLine = a ? !0 : o ? !1 : this.element.prop("isContentEditable"), this.valueMethod = this.element[a || o ? "val" : "text"], 
            this.isNewMenu = !0, this.element.addClass("ui-autocomplete-input").attr("autocomplete", "off"), 
            this._on(this.element, {
                keydown: function(n) {
                    if (this.element.prop("readOnly")) return t = !0, s = !0, i = !0, void 0;
                    t = !1, s = !1, i = !1;
                    var a = e.ui.keyCode;
                    switch (n.keyCode) {
                      case a.PAGE_UP:
                        t = !0, this._move("previousPage", n);
                        break;

                      case a.PAGE_DOWN:
                        t = !0, this._move("nextPage", n);
                        break;

                      case a.UP:
                        t = !0, this._keyEvent("previous", n);
                        break;

                      case a.DOWN:
                        t = !0, this._keyEvent("next", n);
                        break;

                      case a.ENTER:
                        this.menu.active && (t = !0, n.preventDefault(), this.menu.select(n));
                        break;

                      case a.TAB:
                        this.menu.active && this.menu.select(n);
                        break;

                      case a.ESCAPE:
                        this.menu.element.is(":visible") && (this.isMultiLine || this._value(this.term), 
                        this.close(n), n.preventDefault());
                        break;

                      default:
                        i = !0, this._searchTimeout(n);
                    }
                },
                keypress: function(s) {
                    if (t) return t = !1, (!this.isMultiLine || this.menu.element.is(":visible")) && s.preventDefault(), 
                    void 0;
                    if (!i) {
                        var n = e.ui.keyCode;
                        switch (s.keyCode) {
                          case n.PAGE_UP:
                            this._move("previousPage", s);
                            break;

                          case n.PAGE_DOWN:
                            this._move("nextPage", s);
                            break;

                          case n.UP:
                            this._keyEvent("previous", s);
                            break;

                          case n.DOWN:
                            this._keyEvent("next", s);
                        }
                    }
                },
                input: function(e) {
                    return s ? (s = !1, e.preventDefault(), void 0) : (this._searchTimeout(e), void 0);
                },
                focus: function() {
                    this.selectedItem = null, this.previous = this._value();
                },
                blur: function(e) {
                    return this.cancelBlur ? (delete this.cancelBlur, void 0) : (clearTimeout(this.searching), 
                    this.close(e), this._change(e), void 0);
                }
            }), this._initSource(), this.menu = e("<ul>").addClass("ui-autocomplete ui-front").appendTo(this._appendTo()).menu({
                role: null
            }).hide().menu("instance"), this._on(this.menu.element, {
                mousedown: function(t) {
                    t.preventDefault(), this.cancelBlur = !0, this._delay(function() {
                        delete this.cancelBlur;
                    });
                    var i = this.menu.element[0];
                    e(t.target).closest(".ui-menu-item").length || this._delay(function() {
                        var t = this;
                        this.document.one("mousedown", function(s) {
                            s.target === t.element[0] || s.target === i || e.contains(i, s.target) || t.close();
                        });
                    });
                },
                menufocus: function(t, i) {
                    var s, n;
                    return this.isNewMenu && (this.isNewMenu = !1, t.originalEvent && /^mouse/.test(t.originalEvent.type)) ? (this.menu.blur(), 
                    this.document.one("mousemove", function() {
                        e(t.target).trigger(t.originalEvent);
                    }), void 0) : (n = i.item.data("ui-autocomplete-item"), !1 !== this._trigger("focus", t, {
                        item: n
                    }) && t.originalEvent && /^key/.test(t.originalEvent.type) && this._value(n.value), 
                    s = i.item.attr("aria-label") || n.value, s && e.trim(s).length && (this.liveRegion.children().hide(), 
                    e("<div>").text(s).appendTo(this.liveRegion)), void 0);
                },
                menuselect: function(e, t) {
                    var i = t.item.data("ui-autocomplete-item"), s = this.previous;
                    this.element[0] !== this.document[0].activeElement && (this.element.focus(), this.previous = s, 
                    this._delay(function() {
                        this.previous = s, this.selectedItem = i;
                    })), !1 !== this._trigger("select", e, {
                        item: i
                    }) && this._value(i.value), this.term = this._value(), this.close(e), this.selectedItem = i;
                }
            }), this.liveRegion = e("<span>", {
                role: "status",
                "aria-live": "assertive",
                "aria-relevant": "additions"
            }).addClass("ui-helper-hidden-accessible").appendTo(this.document[0].body), this._on(this.window, {
                beforeunload: function() {
                    this.element.removeAttr("autocomplete");
                }
            });
        },
        _destroy: function() {
            clearTimeout(this.searching), this.element.removeClass("ui-autocomplete-input").removeAttr("autocomplete"), 
            this.menu.element.remove(), this.liveRegion.remove();
        },
        _setOption: function(e, t) {
            this._super(e, t), "source" === e && this._initSource(), "appendTo" === e && this.menu.element.appendTo(this._appendTo()), 
            "disabled" === e && t && this.xhr && this.xhr.abort();
        },
        _appendTo: function() {
            var t = this.options.appendTo;
            return t && (t = t.jquery || t.nodeType ? e(t) : this.document.find(t).eq(0)), t && t[0] || (t = this.element.closest(".ui-front")), 
            t.length || (t = this.document[0].body), t;
        },
        _initSource: function() {
            var t, i, s = this;
            e.isArray(this.options.source) ? (t = this.options.source, this.source = function(i, s) {
                s(e.ui.autocomplete.filter(t, i.term));
            }) : "string" == typeof this.options.source ? (i = this.options.source, this.source = function(t, n) {
                s.xhr && s.xhr.abort(), s.xhr = e.ajax({
                    url: i,
                    data: t,
                    dataType: "json",
                    success: function(e) {
                        n(e);
                    },
                    error: function() {
                        n([]);
                    }
                });
            }) : this.source = this.options.source;
        },
        _searchTimeout: function(e) {
            clearTimeout(this.searching), this.searching = this._delay(function() {
                var t = this.term === this._value(), i = this.menu.element.is(":visible"), s = e.altKey || e.ctrlKey || e.metaKey || e.shiftKey;
                (!t || t && !i && !s) && (this.selectedItem = null, this.search(null, e));
            }, this.options.delay);
        },
        search: function(e, t) {
            return e = null != e ? e : this._value(), this.term = this._value(), e.length < this.options.minLength ? this.close(t) : this._trigger("search", t) !== !1 ? this._search(e) : void 0;
        },
        _search: function(e) {
            this.pending++, this.element.addClass("ui-autocomplete-loading"), this.cancelSearch = !1, 
            this.source({
                term: e
            }, this._response());
        },
        _response: function() {
            var t = ++this.requestIndex;
            return e.proxy(function(e) {
                t === this.requestIndex && this.__response(e), this.pending--, this.pending || this.element.removeClass("ui-autocomplete-loading");
            }, this);
        },
        __response: function(e) {
            e && (e = this._normalize(e)), this._trigger("response", null, {
                content: e
            }), !this.options.disabled && e && e.length && !this.cancelSearch ? (this._suggest(e), 
            this._trigger("open")) : this._close();
        },
        close: function(e) {
            this.cancelSearch = !0, this._close(e);
        },
        _close: function(e) {
            this.menu.element.is(":visible") && (this.menu.element.hide(), this.menu.blur(), 
            this.isNewMenu = !0, this._trigger("close", e));
        },
        _change: function(e) {
            this.previous !== this._value() && this._trigger("change", e, {
                item: this.selectedItem
            });
        },
        _normalize: function(t) {
            return t.length && t[0].label && t[0].value ? t : e.map(t, function(t) {
                return "string" == typeof t ? {
                    label: t,
                    value: t
                } : e.extend({}, t, {
                    label: t.label || t.value,
                    value: t.value || t.label
                });
            });
        },
        _suggest: function(t) {
            var i = this.menu.element.empty();
            this._renderMenu(i, t), this.isNewMenu = !0, this.menu.refresh(), i.show(), this._resizeMenu(), 
            i.position(e.extend({
                of: this.element
            }, this.options.position)), this.options.autoFocus && this.menu.next();
        },
        _resizeMenu: function() {
            var e = this.menu.element;
            e.outerWidth(Math.max(e.width("").outerWidth() + 1, this.element.outerWidth()));
        },
        _renderMenu: function(t, i) {
            var s = this;
            e.each(i, function(e, i) {
                s._renderItemData(t, i);
            });
        },
        _renderItemData: function(e, t) {
            return this._renderItem(e, t).data("ui-autocomplete-item", t);
        },
        _renderItem: function(t, i) {
            return e("<li>").text(i.label).appendTo(t);
        },
        _move: function(e, t) {
            return this.menu.element.is(":visible") ? this.menu.isFirstItem() && /^previous/.test(e) || this.menu.isLastItem() && /^next/.test(e) ? (this.isMultiLine || this._value(this.term), 
            this.menu.blur(), void 0) : (this.menu[e](t), void 0) : (this.search(null, t), void 0);
        },
        widget: function() {
            return this.menu.element;
        },
        _value: function() {
            return this.valueMethod.apply(this.element, arguments);
        },
        _keyEvent: function(e, t) {
            (!this.isMultiLine || this.menu.element.is(":visible")) && (this._move(e, t), t.preventDefault());
        }
    }), e.extend(e.ui.autocomplete, {
        escapeRegex: function(e) {
            return e.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
        },
        filter: function(t, i) {
            var s = RegExp(e.ui.autocomplete.escapeRegex(i), "i");
            return e.grep(t, function(e) {
                return s.test(e.label || e.value || e);
            });
        }
    }), e.widget("ui.autocomplete", e.ui.autocomplete, {
        options: {
            messages: {
                noResults: "No search results.",
                results: function(e) {
                    return e + (e > 1 ? " results are" : " result is") + " available, use up and down arrow keys to navigate.";
                }
            }
        },
        __response: function(t) {
            var i;
            this._superApply(arguments), this.options.disabled || this.cancelSearch || (i = t && t.length ? this.options.messages.results(t.length) : this.options.messages.noResults, 
            this.liveRegion.children().hide(), e("<div>").text(i).appendTo(this.liveRegion));
        }
    }), e.ui.autocomplete;
});

(function() {
    "use strict";
    var map = createMap(), layers, icons = {
        refuge: L.icon({
            iconUrl: "../../img/map/blue-goose75.png",
            iconSize: [ 75, 40 ],
            popupAnchor: [ 7, -17 ]
        }),
        hatchery: L.icon({
            iconUrl: "../../img/map/fish75.png",
            iconSize: [ 75, 66 ],
            popupAnchor: [ 7, -27 ]
        })
    };
    L.Icon.Default.imagePath = "../img/map";
    $.getJSON("../../js/offices.js", function(geojson) {
        layers = addLayers(map, geojson);
        initAutocomplete(map, geojson);
        registerLegendEvents(layers);
    });
    // Prevent form submission from reloading the page
    $("form").submit(function(e) {
        e.preventDefault();
    });
    function createMap() {
        var map = L.map("map", {
            center: [ 33.761907, -85.733524 ],
            zoomControl: false
        });
        new L.Control.Zoom({
            position: "bottomleft"
        }).addTo(map);
        return map;
    }
    function addLayers(map, offices) {
        var cluster = new L.MarkerClusterGroup({
            showCoverageOnHover: false
        });
        var markers = [ {
            name: "Refuges",
            marker: createOfficeLayer(offices, "National Wildlife Refuge", "refuge").addTo(cluster)
        }, {
            name: "Offices",
            marker: createOfficeLayer(offices, "Ecological Services Field Office", "refuge").addTo(cluster)
        }, {
            name: "Hatcheries",
            marker: createOfficeLayer(offices, "National Fish Hatchery", "hatchery").addTo(cluster)
        }, {
            name: "Joint Ventures",
            marker: createOfficeLayer(offices, "Joint Venture Office", "hatchery").addTo(cluster)
        } ];
        var toggles = {
            Refuges: new L.layerGroup().addTo(map),
            Offices: new L.layerGroup().addTo(map),
            Hatcheries: new L.layerGroup().addTo(map),
            "Joint Ventures": new L.layerGroup().addTo(map)
        };
        var basemap = L.tileLayer("http://otile{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpeg", {
            attribution: '<a href="#about" class="trigger-about">About</a>',
            subdomains: "1234"
        }).addTo(map);
        L.control.layers(null, toggles, {
            collapsed: false,
            position: "bottomright"
        }).addTo(map);
        setZoom(offices, cluster);
        map.addLayer(cluster);
        initModal();
        return {
            markers: markers,
            basemap: basemap,
            toggles: toggles,
            cluster: cluster
        };
    }
    function getIcons(feature) {
        var props = feature.properties;
        var icons = [ [ "office", "Visitor Center" ], [ "binoculars", "Wildlife Observation" ], [ "camera", "Wildlife Photography" ], [ "trails", "Hiking Trails" ], [ "biking", "Biking" ], [ "picnic-shelter", "Picnic Shelter" ], [ "hunting", "Hunting" ], [ "fishing", "Fishing" ], [ "canoeing", "Small water craft" ], [ "boat-launch", "Boat lanch" ], [ "lighthouse", "Lighthouse" ] ];
        var svg = "<div class='office-icons'>";
        if (props.activities) {
            _.each(icons, function(activity) {
                if (_.contains(props.activities, activity[0])) svg += "<svg class='icon'><g><title>" + activity[1] + "</title><use xlink:href='#icon-" + activity[0] + "'/></g></svg>"; else svg += "<svg class='icon-disabled'><g><title>" + activity[1] + "</title><use xlink:href='#icon-" + activity[0] + "'/></g></svg>";
            });
        }
        svg += "</div>";
        return svg;
    }
    function onEachOffice(feature, layer) {
        var icons = getIcons(feature);
        var popup = _.template('<h2><a href="<%= url %>"><%= name %></a></h2>' + '<p id="popup-office-location"><%= city %>, <%= state %><br>' + '<% if (typeof narrative !== "undefined") { %> <p><%= narrative %></p> <% } %>' + '<img src=""/>' + '<p id="activities-heading">Activities:</p>' + icons), html = popup(feature.properties);
        layer.bindPopup(html);
    }
    function createOfficeLayer(offices, officeType, icon) {
        return L.geoJson(offices, {
            filter: function(feature) {
                switch (feature.properties.type) {
                  case officeType:
                    return true;

                  default:
                    return false;
                }
            },
            onEachFeature: onEachOffice,
            pointToLayer: function(feature, latlng) {
                return L.marker(latlng, {
                    icon: icons[icon]
                });
            }
        });
    }
    function zoomToOffice(map, offices, name) {
        var office = $.grep(offices.features, function(el) {
            return el.properties.name === name;
        });
        map.setView(office[0].geometry.coordinates.reverse(), 13);
    }
    function initAutocomplete(map, offices) {
        $.each(offices.features, function() {
            this.value = this.properties.name;
        });
        $("#autocomplete-search").autocomplete({
            source: offices.features,
            minLength: 3,
            position: {
                my: "right top",
                at: "right bottom"
            },
            select: function(event, ui) {
                zoomToOffice(map, offices, ui.item.label);
            }
        });
    }
    function registerLegendEvents(layers) {
        map.on("overlayremove overlayadd", function(layer) {
            $.each(layers.markers, function(i, el) {
                if (el.name === layer.name && layer.type === "overlayremove") {
                    layers.cluster.removeLayer(el.marker);
                } else if (el.name === layer.name && layer.type === "overlayadd") {
                    layers.cluster.addLayer(el.marker);
                }
            });
        });
    }
    function initModal() {
        var $modals = $(".modal"), $triggerAbout = $(".trigger-about"), $triggerHelp = $(".trigger-help"), $about = $(".about"), $help = $(".help"), $close = $(".close-button");
        $modals.easyModal();
        // Check if local storage says to not open the help on load
        if (localStorage.getItem("hide-help") != "true") {
            $help.trigger("openModal");
        }
        // Set local storage when the checkbox changes
        $("#hide-dialog").on("change", function() {
            if ($(this).val()) {
                localStorage.setItem("hide-help", "true");
            } else {
                localStorage.setItem("hide-help", "false");
            }
            $help.trigger("closeModal");
        });
        $close.on("click", function() {
            $help.trigger("closeModal");
            $about.trigger("closeModal");
        });
        $triggerHelp.click(function() {
            $help.trigger("openModal");
            $about.trigger("closeModal");
        });
        $triggerAbout.click(function() {
            $help.trigger("closeModal");
            $about.trigger("openModal");
        });
    }
    function getQueryVariable(variable) {
        var query = window.location.search.substring(1);
        var vars = query.split("&");
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split("=");
            if (pair[0] == variable) {
                return pair[1];
            }
        }
        return false;
    }
    function setZoom(offices, cluster) {
        var bounds = {
            alabama: [ [ 35.008027, -84.89098 ], [ 30.221131, -88.47322 ] ],
            arkansas: [ [ 36.4996, -89.644837 ], [ 33.004106, -94.617919 ] ],
            florida: [ [ 31.00088, -80.03136 ], [ 24.5447, -87.63494 ] ],
            georgia: [ [ 35.00065, -80.84054 ], [ 30.35783, -85.60516 ] ],
            kentucky: [ [ 39.147458, -81.96497 ], [ 36.497129, -89.571508 ] ],
            louisiana: [ [ 33.019456, -88.817016 ], [ 28.92501, -94.043146 ] ],
            mississippi: [ [ 34.996051, -88.097887 ], [ 30.173942, -91.655008 ] ],
            northcarolina: [ [ 36.588116, -75.458658 ], [ 33.844516, -84.321868 ] ],
            puertorico: [ [ 18.515757, -65.221567 ], [ 17.926874, -67.9407989 ] ],
            southcarolina: [ [ 35.2154, -78.54108 ], [ 32.0346, -83.3532 ] ],
            tennessee: [ [ 36.678117, -81.6469 ], [ 34.98297, -90.310297 ] ],
            virginislands: [ [ 18.41348, -64.56654 ], [ 17.67409, -65.08536 ] ]
        };
        if (getQueryVariable("state")) {
            var state = getQueryVariable("state");
            map.fitBounds(bounds[state]);
        } else {
            map.fitBounds(cluster.getBounds());
        }
    }
})();