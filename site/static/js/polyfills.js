// jshint ignore: start
/*! Picturefill - v2.3.1 - 2015-04-09
* http://scottjehl.github.io/picturefill
* Copyright (c) 2015 https://github.com/scottjehl/picturefill/blob/master/Authors.txt; Licensed MIT */
window.matchMedia || (window.matchMedia = function() {
    "use strict";
    var a = window.styleMedia || window.media;
    if (!a) {
        var b = document.createElement("style"), c = document.getElementsByTagName("script")[0], d = null;
        b.type = "text/css", b.id = "matchmediajs-test", c.parentNode.insertBefore(b, c), 
        d = "getComputedStyle" in window && window.getComputedStyle(b, null) || b.currentStyle, 
        a = {
            matchMedium: function(a) {
                var c = "@media " + a + "{ #matchmediajs-test { width: 1px; } }";
                return b.styleSheet ? b.styleSheet.cssText = c : b.textContent = c, "1px" === d.width;
            }
        };
    }
    return function(b) {
        return {
            matches: a.matchMedium(b || "all"),
            media: b || "all"
        };
    };
}()), function(a, b, c) {
    "use strict";
    function d(b) {
        "object" == typeof module && "object" == typeof module.exports ? module.exports = b : "function" == typeof define && define.amd && define("picturefill", function() {
            return b;
        }), "object" == typeof a && (a.picturefill = b);
    }
    function e(a) {
        var b, c, d, e, f, i = a || {};
        b = i.elements || g.getAllElements();
        for (var j = 0, k = b.length; k > j; j++) if (c = b[j], d = c.parentNode, e = void 0, 
        f = void 0, "IMG" === c.nodeName.toUpperCase() && (c[g.ns] || (c[g.ns] = {}), i.reevaluate || !c[g.ns].evaluated)) {
            if (d && "PICTURE" === d.nodeName.toUpperCase()) {
                if (g.removeVideoShim(d), e = g.getMatch(c, d), e === !1) continue;
            } else e = void 0;
            (d && "PICTURE" === d.nodeName.toUpperCase() || !g.sizesSupported && c.srcset && h.test(c.srcset)) && g.dodgeSrcset(c), 
            e ? (f = g.processSourceSet(e), g.applyBestCandidate(f, c)) : (f = g.processSourceSet(c), 
            (void 0 === c.srcset || c[g.ns].srcset) && g.applyBestCandidate(f, c)), c[g.ns].evaluated = !0;
        }
    }
    function f() {
        function c() {
            clearTimeout(d), d = setTimeout(h, 60);
        }
        g.initTypeDetects(), e();
        var d, f = setInterval(function() {
            return e(), /^loaded|^i|^c/.test(b.readyState) ? void clearInterval(f) : void 0;
        }, 250), h = function() {
            e({
                reevaluate: !0
            });
        };
        a.addEventListener ? a.addEventListener("resize", c, !1) : a.attachEvent && a.attachEvent("onresize", c);
    }
    if (a.HTMLPictureElement) return void d(function() {});
    b.createElement("picture");
    var g = a.picturefill || {}, h = /\s+\+?\d+(e\d+)?w/;
    g.ns = "picturefill", function() {
        g.srcsetSupported = "srcset" in c, g.sizesSupported = "sizes" in c, g.curSrcSupported = "currentSrc" in c;
    }(), g.trim = function(a) {
        return a.trim ? a.trim() : a.replace(/^\s+|\s+$/g, "");
    }, g.makeUrl = function() {
        var a = b.createElement("a");
        return function(b) {
            return a.href = b, a.href;
        };
    }(), g.restrictsMixedContent = function() {
        return "https:" === a.location.protocol;
    }, g.matchesMedia = function(b) {
        return a.matchMedia && a.matchMedia(b).matches;
    }, g.getDpr = function() {
        return a.devicePixelRatio || 1;
    }, g.getWidthFromLength = function(a) {
        var c;
        if (!a || a.indexOf("%") > -1 != !1 || !(parseFloat(a) > 0 || a.indexOf("calc(") > -1)) return !1;
        a = a.replace("vw", "%"), g.lengthEl || (g.lengthEl = b.createElement("div"), g.lengthEl.style.cssText = "border:0;display:block;font-size:1em;left:0;margin:0;padding:0;position:absolute;visibility:hidden", 
        g.lengthEl.className = "helper-from-picturefill-js"), g.lengthEl.style.width = "0px";
        try {
            g.lengthEl.style.width = a;
        } catch (d) {}
        return b.body.appendChild(g.lengthEl), c = g.lengthEl.offsetWidth, 0 >= c && (c = !1), 
        b.body.removeChild(g.lengthEl), c;
    }, g.detectTypeSupport = function(b, c) {
        var d = new a.Image();
        return d.onerror = function() {
            g.types[b] = !1, e();
        }, d.onload = function() {
            g.types[b] = 1 === d.width, e();
        }, d.src = c, "pending";
    }, g.types = g.types || {}, g.initTypeDetects = function() {
        g.types["image/jpeg"] = !0, g.types["image/gif"] = !0, g.types["image/png"] = !0, 
        g.types["image/svg+xml"] = b.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#Image", "1.1"), 
        g.types["image/webp"] = g.detectTypeSupport("image/webp", "data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=");
    }, g.verifyTypeSupport = function(a) {
        var b = a.getAttribute("type");
        if (null === b || "" === b) return !0;
        var c = g.types[b];
        return "string" == typeof c && "pending" !== c ? (g.types[b] = g.detectTypeSupport(b, c), 
        "pending") : "function" == typeof c ? (c(), "pending") : c;
    }, g.parseSize = function(a) {
        var b = /(\([^)]+\))?\s*(.+)/g.exec(a);
        return {
            media: b && b[1],
            length: b && b[2]
        };
    }, g.findWidthFromSourceSize = function(c) {
        for (var d, e = g.trim(c).split(/\s*,\s*/), f = 0, h = e.length; h > f; f++) {
            var i = e[f], j = g.parseSize(i), k = j.length, l = j.media;
            if (k && (!l || g.matchesMedia(l)) && (d = g.getWidthFromLength(k))) break;
        }
        return d || Math.max(a.innerWidth || 0, b.documentElement.clientWidth);
    }, g.parseSrcset = function(a) {
        for (var b = []; "" !== a; ) {
            a = a.replace(/^\s+/g, "");
            var c, d = a.search(/\s/g), e = null;
            if (-1 !== d) {
                c = a.slice(0, d);
                var f = c.slice(-1);
                if (("," === f || "" === c) && (c = c.replace(/,+$/, ""), e = ""), a = a.slice(d + 1), 
                null === e) {
                    var g = a.indexOf(",");
                    -1 !== g ? (e = a.slice(0, g), a = a.slice(g + 1)) : (e = a, a = "");
                }
            } else c = a, a = "";
            (c || e) && b.push({
                url: c,
                descriptor: e
            });
        }
        return b;
    }, g.parseDescriptor = function(a, b) {
        var c, d = b || "100vw", e = a && a.replace(/(^\s+|\s+$)/g, ""), f = g.findWidthFromSourceSize(d);
        if (e) for (var h = e.split(" "), i = h.length - 1; i >= 0; i--) {
            var j = h[i], k = j && j.slice(j.length - 1);
            if ("h" !== k && "w" !== k || g.sizesSupported) {
                if ("x" === k) {
                    var l = j && parseFloat(j, 10);
                    c = l && !isNaN(l) ? l : 1;
                }
            } else c = parseFloat(parseInt(j, 10) / f);
        }
        return c || 1;
    }, g.getCandidatesFromSourceSet = function(a, b) {
        for (var c = g.parseSrcset(a), d = [], e = 0, f = c.length; f > e; e++) {
            var h = c[e];
            d.push({
                url: h.url,
                resolution: g.parseDescriptor(h.descriptor, b)
            });
        }
        return d;
    }, g.dodgeSrcset = function(a) {
        a.srcset && (a[g.ns].srcset = a.srcset, a.srcset = "", a.setAttribute("data-pfsrcset", a[g.ns].srcset));
    }, g.processSourceSet = function(a) {
        var b = a.getAttribute("srcset"), c = a.getAttribute("sizes"), d = [];
        return "IMG" === a.nodeName.toUpperCase() && a[g.ns] && a[g.ns].srcset && (b = a[g.ns].srcset), 
        b && (d = g.getCandidatesFromSourceSet(b, c)), d;
    }, g.backfaceVisibilityFix = function(a) {
        var b = a.style || {}, c = "webkitBackfaceVisibility" in b, d = b.zoom;
        c && (b.zoom = ".999", c = a.offsetWidth, b.zoom = d);
    }, g.setIntrinsicSize = function() {
        var c = {}, d = function(a, b, c) {
            b && a.setAttribute("width", parseInt(b / c, 10));
        };
        return function(e, f) {
            var h;
            e[g.ns] && !a.pfStopIntrinsicSize && (void 0 === e[g.ns].dims && (e[g.ns].dims = e.getAttribute("width") || e.getAttribute("height")), 
            e[g.ns].dims || (f.url in c ? d(e, c[f.url], f.resolution) : (h = b.createElement("img"), 
            h.onload = function() {
                if (c[f.url] = h.width, !c[f.url]) try {
                    b.body.appendChild(h), c[f.url] = h.width || h.offsetWidth, b.body.removeChild(h);
                } catch (a) {}
                e.src === f.url && d(e, c[f.url], f.resolution), e = null, h.onload = null, h = null;
            }, h.src = f.url)));
        };
    }(), g.applyBestCandidate = function(a, b) {
        var c, d, e;
        a.sort(g.ascendingSort), d = a.length, e = a[d - 1];
        for (var f = 0; d > f; f++) if (c = a[f], c.resolution >= g.getDpr()) {
            e = c;
            break;
        }
        e && (e.url = g.makeUrl(e.url), b.src !== e.url && (g.restrictsMixedContent() && "http:" === e.url.substr(0, "http:".length).toLowerCase() ? void 0 !== window.console && console.warn("Blocked mixed content image " + e.url) : (b.src = e.url, 
        g.curSrcSupported || (b.currentSrc = b.src), g.backfaceVisibilityFix(b))), g.setIntrinsicSize(b, e));
    }, g.ascendingSort = function(a, b) {
        return a.resolution - b.resolution;
    }, g.removeVideoShim = function(a) {
        var b = a.getElementsByTagName("video");
        if (b.length) {
            for (var c = b[0], d = c.getElementsByTagName("source"); d.length; ) a.insertBefore(d[0], c);
            c.parentNode.removeChild(c);
        }
    }, g.getAllElements = function() {
        for (var a = [], c = b.getElementsByTagName("img"), d = 0, e = c.length; e > d; d++) {
            var f = c[d];
            ("PICTURE" === f.parentNode.nodeName.toUpperCase() || null !== f.getAttribute("srcset") || f[g.ns] && null !== f[g.ns].srcset) && a.push(f);
        }
        return a;
    }, g.getMatch = function(a, b) {
        for (var c, d = b.childNodes, e = 0, f = d.length; f > e; e++) {
            var h = d[e];
            if (1 === h.nodeType) {
                if (h === a) return c;
                if ("SOURCE" === h.nodeName.toUpperCase()) {
                    null !== h.getAttribute("src") && void 0 !== typeof console && console.warn("The `src` attribute is invalid on `picture` `source` element; instead, use `srcset`.");
                    var i = h.getAttribute("media");
                    if (h.getAttribute("srcset") && (!i || g.matchesMedia(i))) {
                        var j = g.verifyTypeSupport(h);
                        if (j === !0) {
                            c = h;
                            break;
                        }
                        if ("pending" === j) return !1;
                    }
                }
            }
        }
        return c;
    }, f(), e._ = g, d(e);
}(window, window.document, new window.Image());

// augment.js JavaScript 1.8.5 methods for all, version: 1.0.0
// using snippets from Mozilla - https://developer.mozilla.org/en/JavaScript
// (c) 2011 Oliver Nightingale
//
//  Released under MIT license.
//
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/every
if (!Array.prototype.every) {
    Array.prototype.every = function(fn, ctx) {
        if (this === void 0 || this === null || typeof fn !== "function") throw new TypeError();
        var t = Object(this), len = t.length >>> 0, noCtx = ctx === void 0 || ctx === null;
        for (var i = 0; i < len; i++) {
            if (i in t) {
                if (noCtx) {
                    if (!fn(t[i], i, t)) return false;
                } else {
                    if (!fn.call(ctx, t[i], i, t)) return false;
                }
            }
        }
        return true;
    };
}

if (!Array.prototype.filter) {
    Array.prototype.filter = function(fn, ctx) {
        if (this === void 0 || this === null || typeof fn !== "function") throw new TypeError();
        var t = Object(this), len = t.length >>> 0, noCtx = ctx === void 0 || ctx === null, response = [];
        for (var i = 0; i < len; i++) {
            if (i in t) {
                var val = t[i];
                // in case fn mutates this
                if (noCtx) {
                    if (fn(t[i], i, t)) response.push(val);
                } else {
                    if (fn.call(ctx, t[i], i, t)) response.push(val);
                }
            }
        }
        return response;
    };
}

// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/array/foreach
if (!Array.prototype.forEach) {
    Array.prototype.forEach = function(fn, ctx) {
        if (this === void 0 || this === null || typeof fn !== "function") throw new TypeError();
        var t = Object(this), len = t.length >>> 0, noCtx = ctx === void 0 || ctx === null;
        for (var i = 0; i < len; i++) {
            if (i in t) {
                if (noCtx) {
                    fn(t[i], i, t);
                } else {
                    fn.call(ctx, t[i], i, t);
                }
            }
        }
    };
}

if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(searchElement, fromIdx) {
        if (this === void 0 || this === null) throw new TypeError();
        var t = Object(this), len = t.length >>> 0, hasFromIdx = fromIdx !== void 0 && fromIdx !== null;
        if (len === 0) return -1;
        var n = 0;
        if (hasFromIdx) {
            n = Number(fromIdx);
            if (n !== n) {
                // shortcut for verifying if it is NaN
                n = 0;
            } else if (n !== 0 && n !== Infinity && n !== -Infinity) {
                n = (n > 0 || -1) * Math.floor(Math.abs(n));
            }
        }
        if (n >= len) return -1;
        var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
        for (;k < len; k++) {
            if (k in t && t[k] === searchElement) return k;
        }
        return -1;
    };
}

// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/isArray
Array.isArray = Array.isArray || function(o) {
    return Object.prototype.toString.call(o) === "[object Array]";
};

if (!Array.prototype.lastIndexOf) {
    Array.prototype.lastIndexOf = function(searchElement, fromIdx) {
        if (this === void 0 || this === null) throw new TypeError();
        var t = Object(this), len = t.length >>> 0, hasFromIdx = fromIdx !== void 0 && fromIdx !== null;
        if (len === 0) return -1;
        var n = len;
        if (hasFromIdx) {
            n = Number(fromIdx);
            if (n !== n) {
                n = 0;
            } else if (n !== 0 && n !== Infinity && n !== -Infinity) {
                n = (n > 0 || -1) * Math.floor(Math.abs(n));
            }
        }
        var k = n >= 0 ? Math.min(n, len - 1) : len - Math.abs(n);
        for (;k >= 0; k--) {
            if (k in t && t[k] === searchElement) return k;
        }
        return -1;
    };
}

// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/map
if (!Array.prototype.map) {
    Array.prototype.map = function(fn, ctx) {
        if (this === void 0 || this === null || typeof fn !== "function") throw new TypeError();
        var t = Object(this), len = t.length >>> 0, noCtx = ctx === void 0 || ctx === null, response = new Array(len);
        for (var i = 0; i < len; i++) {
            if (i in t) {
                if (noCtx) {
                    response[i] = fn(t[i], i, t);
                } else {
                    response[i] = fn.call(ctx, t[i], i, t);
                }
            }
        }
        return response;
    };
}

if (!Array.prototype.reduce) {
    Array.prototype.reduce = function(fn, initialValue) {
        if (this === void 0 || this === null || typeof fn !== "function") throw new TypeError();
        var t = Object(this), len = t.length >>> 0, hasInitialValue = initialValue !== void 0 && initialValue !== null;
        // no value to return if no initial value and an empty array
        if (len == 0 && !hasInitialValue) throw new TypeError();
        var k = 0, accumulator;
        if (hasInitialValue) {
            accumulator = initialValue;
        } else {
            do {
                if (k in t) {
                    accumulator = t[k++];
                    break;
                }
                // if array contains no values, no initial value to return
                if (++k >= len) throw new TypeError();
            } while (true);
        }
        while (k < len) {
            if (k in t) accumulator = fn(accumulator, t[k], k, t);
            k++;
        }
        return accumulator;
    };
}

if (!Array.prototype.reduceRight) {
    Array.prototype.reduceRight = function(fn, initialValue) {
        if (this === void 0 || this === null || typeof fn !== "function") throw new TypeError();
        var t = Object(this), len = t.length >>> 0, hasInitialValue = initialValue !== void 0 && initialValue !== null;
        // no value to return if no initial value, empty array
        if (len == 0 && !hasInitialValue) throw new TypeError();
        var k = len - 1, accumulator;
        if (hasInitialValue) {
            accumulator = initialValue;
        } else {
            do {
                if (k in this) {
                    accumulator = t[k--];
                    break;
                }
                // if array contains no values, no initial value to return
                if (--k < 0) throw new TypeError();
            } while (true);
        }
        while (k--) {
            if (k in t) accumulator = callbackfn(accumulator, t[k], k, t);
        }
        return accumulator;
    };
}

// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/some
if (!Array.prototype.some) {
    Array.prototype.some = function(fn, ctx) {
        if (this === void 0 || this === null || typeof fn !== "function") throw new TypeError();
        var t = Object(this), len = t.length >>> 0, noCtx = ctx === void 0 || ctx === null;
        for (var i = 0; i < len; i++) {
            if (i in t) {
                if (noCtx) {
                    if (fn(t[i], i, t)) return true;
                } else {
                    if (fn.call(ctx, t[i], i, t)) return true;
                }
            }
        }
        return false;
    };
}

if (!Date.now) {
    Date.now = function() {
        return +new Date();
    };
}

if (!Date.prototype.toISOString) {
    Date.prototype.toISOString = function() {
        var pad = function(n, length) {
            length = length || 2;
            return (n = n + "", n.length === length) ? n : pad("0" + n, length);
        };
        return function() {
            var year = this.getUTCFullYear();
            year = (year < 0 ? "-" : year > 9999 ? "+" : "") + ("00000" + Math.abs(year)).slice(0 <= year && year <= 9999 ? -4 : -6);
            var date = [ year, pad(this.getUTCMonth() + 1), pad(this.getUTCDate()) ].join("-");
            var time = [ pad(this.getUTCHours()), pad(this.getUTCMinutes()), pad(this.getUTCSeconds()) ].join(":") + "." + pad(this.getUTCMilliseconds(), 3);
            return [ date, time ].join("T") + "Z";
        };
    }();
}

if (!Date.prototype.toJSON) {
    Date.prototype.toJSON = function() {
        var t = Object(this), toISO = t.toISOString;
        if (typeof toISO !== "function") throw new TypeError();
        return toISO.call(t);
    };
}

// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/bind
if (!Function.prototype.bind) {
    Function.prototype.bind = function(obj) {
        if (typeof this !== "function") throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
        var slice = Array.prototype.slice, args = slice.call(arguments, 1), self = this, nop = function() {}, bound = function() {
            if (nop.prototype && this instanceof nop) {
                var result = self.apply(new nop(), args.concat(slice.call(arguments)));
                return Object(result) === result ? result : self;
            } else {
                return self.apply(obj, args.concat(slice.call(arguments)));
            }
        };
        nop.prototype = self.prototype;
        bound.prototype = new nop();
        return bound;
    };
}

(function() {
    "use strict";
    var ensureIsObject = function(param) {
        if (param !== Object(param)) throw new TypeError("Object.getPrototypeOf called on non-object");
    };
    if (!Object.getPrototypeOf) {
        if (typeof "test".__proto__ === "object") {
            Object.getPrototypeOf = function(obj) {
                ensureIsObject(obj);
                return obj.__proto__;
            };
        } else {
            Object.getPrototypeOf = function(obj) {
                ensureIsObject(obj);
                return obj.constructor.prototype;
            };
        }
    }
})();

// http://whattheheadsaid.com/2010/10/a-safer-object-keys-compatibility-implementation
if (!Object.keys) {
    Object.keys = function() {
        var hasOwnProperty = Object.prototype.hasOwnProperty, hasDontEnumBug = !{
            toString: null
        }.propertyIsEnumerable("toString"), dontEnums = [ "toString", "toLocaleString", "valueOf", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "constructor" ], dontEnumsLength = dontEnums.length;
        return function(obj) {
            if (typeof obj !== "object" && typeof obj !== "function" || obj === null) throw new TypeError("Object.keys called on non-object");
            var result = [];
            for (var prop in obj) {
                if (hasOwnProperty.call(obj, prop)) result.push(prop);
            }
            if (hasDontEnumBug) {
                for (var i = 0; i < dontEnumsLength; i++) {
                    if (hasOwnProperty.call(obj, dontEnums[i])) result.push(dontEnums[i]);
                }
            }
            return result;
        };
    }();
}

if (!String.prototype.trim) {
    String.prototype.trim = function() {
        var trimLeft = /^\s+/, trimRight = /\s+$/;
        return function() {
            return this.replace(trimLeft, "").replace(trimRight, "");
        };
    }();
}

