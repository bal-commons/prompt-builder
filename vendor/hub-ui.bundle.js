/*! @bal-commons/hub-ui 0.1.0 | Apache-2.0 | Bundles Lit (BSD-3-Clause, Copyright (c) 2017 Google LLC) and @bal-commons/{ui-core,notification-ui,chat-ui,attachment-ui} (Apache-2.0); see THIRD_PARTY_NOTICES.md */
//#region node_modules/@lit/reactive-element/css-tag.js
var e = globalThis, t = e.ShadowRoot && (e.ShadyCSS === void 0 || e.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, n = Symbol(), r = /* @__PURE__ */ new WeakMap(), i = class {
	constructor(e, t, r) {
		if (this._$cssResult$ = !0, r !== n) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, n = this.t;
		if (t && e === void 0) {
			let t = n !== void 0 && n.length === 1;
			t && (e = r.get(n)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), t && r.set(n, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, a = (e) => new i(typeof e == "string" ? e : e + "", void 0, n), o = (e, ...t) => new i(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, n), s = (n, r) => {
	if (t) n.adoptedStyleSheets = r.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let t of r) {
		let r = document.createElement("style"), i = e.litNonce;
		i !== void 0 && r.setAttribute("nonce", i), r.textContent = t.cssText, n.appendChild(r);
	}
}, c = t ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return a(t);
})(e) : e, { is: l, defineProperty: u, getOwnPropertyDescriptor: d, getOwnPropertyNames: ee, getOwnPropertySymbols: te, getPrototypeOf: ne } = Object, f = globalThis, re = f.trustedTypes, ie = re ? re.emptyScript : "", ae = f.reactiveElementPolyfillSupport, p = (e, t) => e, m = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? ie : null;
				break;
			case Object:
			case Array: e = e == null ? e : JSON.stringify(e);
		}
		return e;
	},
	fromAttribute(e, t) {
		let n = e;
		switch (t) {
			case Boolean:
				n = e !== null;
				break;
			case Number:
				n = e === null ? null : Number(e);
				break;
			case Object:
			case Array: try {
				n = JSON.parse(e);
			} catch {
				n = null;
			}
		}
		return n;
	}
}, oe = (e, t) => !l(e, t), se = {
	attribute: !0,
	type: String,
	converter: m,
	reflect: !1,
	useDefault: !1,
	hasChanged: oe
};
Symbol.metadata ??= Symbol("metadata"), f.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var h = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = se) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && u(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = d(this.prototype, e) ?? {
			get() {
				return this[t];
			},
			set(e) {
				this[t] = e;
			}
		};
		return {
			get: r,
			set(t) {
				let a = r?.call(this);
				i?.call(this, t), this.requestUpdate(e, a, n);
			},
			configurable: !0,
			enumerable: !0
		};
	}
	static getPropertyOptions(e) {
		return this.elementProperties.get(e) ?? se;
	}
	static _$Ei() {
		if (this.hasOwnProperty(p("elementProperties"))) return;
		let e = ne(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(p("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(p("properties"))) {
			let e = this.properties, t = [...ee(e), ...te(e)];
			for (let n of t) this.createProperty(n, e[n]);
		}
		let e = this[Symbol.metadata];
		if (e !== null) {
			let t = litPropertyMetadata.get(e);
			if (t !== void 0) for (let [e, n] of t) this.elementProperties.set(e, n);
		}
		this._$Eh = /* @__PURE__ */ new Map();
		for (let [e, t] of this.elementProperties) {
			let n = this._$Eu(e, t);
			n !== void 0 && this._$Eh.set(n, e);
		}
		this.elementStyles = this.finalizeStyles(this.styles);
	}
	static finalizeStyles(e) {
		let t = [];
		if (Array.isArray(e)) {
			let n = new Set(e.flat(1 / 0).reverse());
			for (let e of n) t.unshift(c(e));
		} else e !== void 0 && t.push(c(e));
		return t;
	}
	static _$Eu(e, t) {
		let n = t.attribute;
		return !1 === n ? void 0 : typeof n == "string" ? n : typeof e == "string" ? e.toLowerCase() : void 0;
	}
	constructor() {
		super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
	}
	_$Ev() {
		this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
	}
	addController(e) {
		(this._$EO ??= /* @__PURE__ */ new Set()).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
	}
	removeController(e) {
		this._$EO?.delete(e);
	}
	_$E_() {
		let e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
		for (let n of t.keys()) this.hasOwnProperty(n) && (e.set(n, this[n]), delete this[n]);
		e.size > 0 && (this._$Ep = e);
	}
	createRenderRoot() {
		let e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
		return s(e, this.constructor.elementStyles), e;
	}
	connectedCallback() {
		this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
	}
	enableUpdating(e) {}
	disconnectedCallback() {
		this._$EO?.forEach((e) => e.hostDisconnected?.());
	}
	attributeChangedCallback(e, t, n) {
		this._$AK(e, n);
	}
	_$ET(e, t) {
		let n = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, n);
		if (r !== void 0 && !0 === n.reflect) {
			let i = (n.converter?.toAttribute === void 0 ? m : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? m : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? oe)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
			this.C(e, t, n);
		}
		!1 === this.isUpdatePending && (this._$ES = this._$EP());
	}
	C(e, t, { useDefault: n, reflect: r, wrapped: i }, a) {
		n && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), !0 !== i || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || n || (t = void 0), this._$AL.set(e, t)), !0 === r && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
	}
	async _$EP() {
		this.isUpdatePending = !0;
		try {
			await this._$ES;
		} catch (e) {
			Promise.reject(e);
		}
		let e = this.scheduleUpdate();
		return e != null && await e, !this.isUpdatePending;
	}
	scheduleUpdate() {
		return this.performUpdate();
	}
	performUpdate() {
		if (!this.isUpdatePending) return;
		if (!this.hasUpdated) {
			if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
				for (let [e, t] of this._$Ep) this[e] = t;
				this._$Ep = void 0;
			}
			let e = this.constructor.elementProperties;
			if (e.size > 0) for (let [t, n] of e) {
				let { wrapped: e } = n, r = this[t];
				!0 !== e || this._$AL.has(t) || r === void 0 || this.C(t, void 0, n, r);
			}
		}
		let e = !1, t = this._$AL;
		try {
			e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((e) => e.hostUpdate?.()), this.update(t)) : this._$EM();
		} catch (t) {
			throw e = !1, this._$EM(), t;
		}
		e && this._$AE(t);
	}
	willUpdate(e) {}
	_$AE(e) {
		this._$EO?.forEach((e) => e.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
	}
	_$EM() {
		this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
	}
	get updateComplete() {
		return this.getUpdateComplete();
	}
	getUpdateComplete() {
		return this._$ES;
	}
	shouldUpdate(e) {
		return !0;
	}
	update(e) {
		this._$Eq &&= this._$Eq.forEach((e) => this._$ET(e, this[e])), this._$EM();
	}
	updated(e) {}
	firstUpdated(e) {}
};
h.elementStyles = [], h.shadowRootOptions = { mode: "open" }, h[p("elementProperties")] = /* @__PURE__ */ new Map(), h[p("finalized")] = /* @__PURE__ */ new Map(), ae?.({ ReactiveElement: h }), (f.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var g = globalThis, ce = (e) => e, _ = g.trustedTypes, le = _ ? _.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, ue = "$lit$", v = `lit$${Math.random().toFixed(9).slice(2)}$`, de = "?" + v, fe = `<${de}>`, y = document, b = () => y.createComment(""), x = (e) => e === null || typeof e != "object" && typeof e != "function", S = Array.isArray, pe = (e) => S(e) || typeof e?.[Symbol.iterator] == "function", C = "[ 	\n\f\r]", w = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, me = /-->/g, he = />/g, T = RegExp(`>|${C}(?:([^\\s"'>=/]+)(${C}*=${C}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), ge = /'/g, _e = /"/g, ve = /^(?:script|style|textarea|title)$/i, E = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), D = Symbol.for("lit-noChange"), O = Symbol.for("lit-nothing"), ye = /* @__PURE__ */ new WeakMap(), k = y.createTreeWalker(y, 129);
function be(e, t) {
	if (!S(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return le === void 0 ? t : le.createHTML(t);
}
var xe = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = w;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === w ? c[1] === "!--" ? o = me : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = T) : (ve.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = T) : o = he : o === T ? c[0] === ">" ? (o = i ?? w, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? T : c[3] === "\"" ? _e : ge) : o === _e || o === ge ? o = T : o === me || o === he ? o = w : (o = T, i = void 0);
		let d = o === T && e[t + 1].startsWith("/>") ? " " : "";
		a += o === w ? n + fe : l >= 0 ? (r.push(s), n.slice(0, l) + ue + n.slice(l) + v + d) : n + v + (l === -2 ? t : d);
	}
	return [be(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, A = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = xe(t, n);
		if (this.el = e.createElement(l, r), k.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = k.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(ue)) {
					let t = u[o++], n = i.getAttribute(e).split(v), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Ce : r[1] === "?" ? we : r[1] === "@" ? Te : N
					}), i.removeAttribute(e);
				} else e.startsWith(v) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (ve.test(i.tagName)) {
					let e = i.textContent.split(v), t = e.length - 1;
					if (t > 0) {
						i.textContent = _ ? _.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], b()), k.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], b());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === de) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(v, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += v.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = y.createElement("template");
		return n.innerHTML = e, n;
	}
};
function j(e, t, n = e, r) {
	if (t === D) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = x(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = j(e, i._$AS(e, t.values), i, r)), t;
}
var Se = class {
	constructor(e, t) {
		this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
	}
	get parentNode() {
		return this._$AM.parentNode;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	u(e) {
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? y).importNode(t, !0);
		k.currentNode = r;
		let i = k.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new M(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Ee(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = k.nextNode(), a++);
		}
		return k.currentNode = y, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, M = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = O, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
	}
	get parentNode() {
		let e = this._$AA.parentNode, t = this._$AM;
		return t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e;
	}
	get startNode() {
		return this._$AA;
	}
	get endNode() {
		return this._$AB;
	}
	_$AI(e, t = this) {
		e = j(this, e, t), x(e) ? e === O || e == null || e === "" ? (this._$AH !== O && this._$AR(), this._$AH = O) : e !== this._$AH && e !== D && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? pe(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== O && x(this._$AH) ? this._$AA.nextSibling.data = e : this.T(y.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = A.createElement(be(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new Se(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = ye.get(e.strings);
		return t === void 0 && ye.set(e.strings, t = new A(e)), t;
	}
	k(t) {
		S(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(b()), this.O(b()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = ce(e).nextSibling;
			ce(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, N = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = O, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = O;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = j(this, e, t, 0), a = !x(e) || e !== this._$AH && e !== D, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = j(this, r[n + o], t, o), s === D && (s = this._$AH[o]), a ||= !x(s) || s !== this._$AH[o], s === O ? e = O : e !== O && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === O ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Ce = class extends N {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === O ? void 0 : e;
	}
}, we = class extends N {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== O);
	}
}, Te = class extends N {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = j(this, e, t, 0) ?? O) === D) return;
		let n = this._$AH, r = e === O && n !== O || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== O && (n === O || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Ee = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		j(this, e);
	}
}, De = g.litHtmlPolyfillSupport;
De?.(A, M), (g.litHtmlVersions ??= []).push("3.3.3");
var Oe = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new M(t.insertBefore(b(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, P = globalThis, F = class extends h {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Oe(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return D;
	}
};
F._$litElement$ = !0, F.finalized = !0, P.litElementHydrateSupport?.({ LitElement: F });
var ke = P.litElementPolyfillSupport;
ke?.({ LitElement: F }), (P.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region ../service-commons/ui/dist/index.js
function Ae(e, t) {
	return {
		async headers() {
			let t = await e();
			return t ? { Authorization: `Bearer ${t}` } : {};
		},
		onUnauthorized: t
	};
}
function je(e, t = [], n = []) {
	return { headers: () => ({
		"x-user-id": e,
		"x-user-roles": t.join(","),
		...n.length ? { "x-user-scopes": n.join(" ") } : {}
	}) };
}
var Me = { headers: () => ({}) }, Ne = globalThis;
function Pe(e) {
	Ne.__balCommonsAuth = e;
}
function I() {
	return Ne.__balCommonsAuth ?? Me;
}
var L = class extends Error {
	constructor(e, t, n) {
		super(n), this.status = e, this.code = t, this.name = "ServiceError";
	}
};
async function R(e, t, n = {}) {
	let r = n.auth ?? I(), i = { ...await r.headers() }, a;
	n.body !== void 0 && (i["content-type"] = "application/json", a = JSON.stringify(n.body));
	let o = await fetch(z(e, t, n.query), {
		method: n.method ?? "GET",
		headers: i,
		body: a
	});
	if (o.status === 401 && r.onUnauthorized?.(), !o.ok) {
		let e = "HTTP_" + o.status, t = o.statusText;
		try {
			let n = await o.json();
			e = n.code ?? n.error?.code ?? e, t = n.message ?? n.error?.message ?? t;
		} catch {}
		throw new L(o.status, e, t);
	}
	return o.status === 204 ? void 0 : await o.json();
}
function z(e, t, n) {
	let r = e.replace(/\/+$/, "") + (t.startsWith("/") ? t : "/" + t), i = Object.entries(n ?? {}).filter(([, e]) => e != null && e !== "");
	return i.length ? `${r}?${new URLSearchParams(i.map(([e, t]) => [e, String(t)]))}` : r;
}
var B = class {
	constructor(e, t, n = {}) {
		this.baseUrl = e, this.handlers = t, this.options = n, this.retry = 1e3, this.stopped = !0;
	}
	start() {
		this.stopped && typeof EventSource < "u" && (this.stopped = !1, this.connect(!1));
	}
	stop() {
		this.stopped = !0, clearTimeout(this.timer), this.source?.close(), this.source = void 0;
	}
	async connect(e) {
		try {
			let { ticket: t } = await R(this.baseUrl, "/stream-ticket", {
				method: "POST",
				auth: this.options.auth ?? I()
			});
			if (this.stopped) return;
			let n = new URLSearchParams({ ticket: t });
			this.options.replay && this.lastEventId && n.set("lastEventId", this.lastEventId);
			let r = new EventSource(`${this.baseUrl.replace(/\/+$/, "")}/stream?${n}`);
			this.source = r, r.onopen = () => {
				this.retry = 1e3, e && this.options.onReconnect?.();
			};
			for (let [e, t] of Object.entries(this.handlers)) r.addEventListener(e, (e) => {
				let n = e;
				n.lastEventId && (this.lastEventId = n.lastEventId), t(JSON.parse(n.data));
			});
			r.onerror = () => {
				r.close(), this.schedule();
			};
		} catch {
			this.schedule();
		}
	}
	schedule() {
		this.stopped || (this.timer = setTimeout(() => void this.connect(!0), this.retry), this.retry = Math.min(this.retry * 2, 3e4));
	}
}, V = o`
  :host {
    --_font: var(--bc-font, system-ui, -apple-system, "Segoe UI", sans-serif);
    --_fg: var(--bc-fg, #1d2330);
    --_muted: var(--bc-muted, #6b7280);
    --_bg: var(--bc-bg, #ffffff);
    --_surface: var(--bc-surface, #f5f6f8);
    --_border: var(--bc-border, #e3e6eb);
    --_accent: var(--bc-accent, #2563eb);
    --_accent-soft: var(--bc-accent-soft, #e8efff);
    --_info: var(--bc-info, #2563eb);
    --_warning: var(--bc-warning, #d97706);
    --_error: var(--bc-error, #dc2626);
    --_success: var(--bc-success, #059669);
    --_radius: var(--bc-radius, 8px);
    font-family: var(--_font);
    color: var(--_fg);
  }
  @media (prefers-color-scheme: dark) {
    :host {
      --_fg: var(--bc-fg, #e6e8ec);
      --_muted: var(--bc-muted, #9aa3b2);
      --_bg: var(--bc-bg, #171b23);
      --_surface: var(--bc-surface, #0f1218);
      --_border: var(--bc-border, #2a303b);
      --_accent: var(--bc-accent, #6ea0ff);
      --_accent-soft: var(--bc-accent-soft, #1d2940);
    }
  }
`;
function H(e, t = Date.now()) {
	let n = Math.round((t - new Date(e).getTime()) / 1e3), r = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" }), i = [
		[60, "second"],
		[60, "minute"],
		[24, "hour"],
		[7, "day"],
		[4.35, "week"],
		[12, "month"],
		[Infinity, "year"]
	], a = n;
	for (let [e, t] of i) {
		if (Math.abs(a) < e) return r.format(-Math.round(a), t);
		a /= e;
	}
	return e;
}
//#endregion
//#region ../notification/ui/dist/index.js
var U = class {
	constructor(e, t) {
		this.baseUrl = e, this.auth = t;
	}
	list(e = {}) {
		return R(this.baseUrl, "/notifications", {
			auth: this.auth,
			query: { ...e }
		});
	}
	unreadCount() {
		return R(this.baseUrl, "/notifications/unread-count", { auth: this.auth });
	}
	markRead(e) {
		return R(this.baseUrl, `/notifications/${encodeURIComponent(e)}/read`, {
			method: "PUT",
			auth: this.auth
		});
	}
	markUnread(e) {
		return R(this.baseUrl, `/notifications/${encodeURIComponent(e)}/read`, {
			method: "DELETE",
			auth: this.auth
		});
	}
	markAllRead(e = {}) {
		return R(this.baseUrl, "/notifications/read-all", {
			method: "POST",
			body: e,
			auth: this.auth
		});
	}
}, Fe = class extends EventTarget {
	constructor(e, t) {
		super(), this.baseUrl = e, this.auth = t, this.users = 0;
	}
	subscribe(e) {
		let t = (t) => e(t.detail);
		return this.addEventListener("change", t), this.users++ === 0 && (this.stream = new B(this.baseUrl, {
			"notification.created": (e) => this.emit({
				type: "created",
				notification: e
			}),
			"notification.read": ({ id: e, readAt: t }) => this.emit({
				type: "read",
				id: e,
				readAt: t
			}),
			"notification.unread": ({ id: e }) => this.emit({
				type: "unread",
				id: e
			}),
			"notification.read-all": () => this.emit({ type: "read-all" }),
			"notification.deleted": ({ id: e }) => this.emit({
				type: "deleted",
				id: e
			})
		}, {
			auth: this.auth,
			replay: !0,
			onReconnect: () => this.emit({ type: "reconnected" })
		}), this.stream.start()), () => {
			this.removeEventListener("change", t), --this.users === 0 && (this.stream?.stop(), this.stream = void 0);
		};
	}
	emit(e) {
		this.dispatchEvent(new CustomEvent("change", { detail: e }));
	}
}, Ie = /* @__PURE__ */ new Map();
function W(e, t) {
	let n = Ie.get(e);
	return n || (n = new Fe(e, t), Ie.set(e, n)), n;
}
var Le = class extends F {
	static {
		this.properties = {
			baseUrl: {
				type: String,
				attribute: "base-url"
			},
			auth: { attribute: !1 },
			label: { type: String },
			count: {
				state: !0,
				attribute: !1
			}
		};
	}
	constructor() {
		super(), this.baseUrl = "", this.label = "Notifications", this.count = 0;
	}
	static {
		this.styles = [V, o`
    :host { display: inline-block; }
    button {
      position: relative; display: inline-flex; align-items: center; justify-content: center;
      width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--_border);
      background: var(--_bg); color: var(--_fg); cursor: pointer;
    }
    button:focus-visible { outline: 2px solid var(--_accent); outline-offset: 2px; }
    svg { width: 20px; height: 20px; }
    .badge {
      position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px; padding: 0 5px;
      border-radius: 9px; background: var(--_error); color: #fff; font-size: 11px; line-height: 18px;
      font-weight: 600; box-sizing: border-box;
    }
  `];
	}
	connectedCallback() {
		super.connectedCallback(), this.baseUrl && this.start();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.unsubscribe?.();
	}
	updated(e) {
		e.has("baseUrl") && this.baseUrl && this.isConnected && this.start();
	}
	async refresh() {
		try {
			this.count = (await new U(this.baseUrl, this.auth).unreadCount()).total;
		} catch {}
	}
	start() {
		this.unsubscribe?.(), this.unsubscribe = W(this.baseUrl, this.auth).subscribe(() => void this.refresh()), this.refresh();
	}
	render() {
		let e = this.count > 99 ? "99+" : String(this.count);
		return E`<button part="button" aria-label="${this.label}${this.count ? `, ${this.count} unread` : ""}"
        @click=${() => this.dispatchEvent(new CustomEvent("commons-bell-click", {
			bubbles: !0,
			composed: !0
		}))}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
      ${this.count ? E`<span class="badge" part="badge">${e}</span>` : null}
    </button>`;
	}
};
customElements.get("commons-notification-bell") || customElements.define("commons-notification-bell", Le);
var G = [
	{
		box: "all",
		label: "All"
	},
	{
		box: "personal",
		label: "Personal"
	},
	{
		box: "role",
		label: "Roles"
	}
], Re = class extends F {
	static {
		this.properties = {
			baseUrl: {
				type: String,
				attribute: "base-url"
			},
			auth: { attribute: !1 },
			box: {
				type: String,
				reflect: !0
			},
			pageSize: {
				type: Number,
				attribute: "page-size"
			},
			hideTabs: {
				type: Boolean,
				attribute: "hide-tabs"
			},
			unreadOnly: {
				type: Boolean,
				attribute: "unread-only",
				reflect: !0
			},
			severity: { type: String },
			correlationId: {
				type: String,
				attribute: "correlation-id"
			},
			showFilters: {
				type: Boolean,
				attribute: "show-filters"
			},
			items: {
				state: !0,
				attribute: !1
			},
			nextCursor: {
				state: !0,
				attribute: !1
			},
			loading: {
				state: !0,
				attribute: !1
			},
			error: {
				state: !0,
				attribute: !1
			}
		};
	}
	constructor() {
		super(), this.baseUrl = "", this.box = "all", this.pageSize = 20, this.hideTabs = !1, this.unreadOnly = !1, this.showFilters = !1, this.items = [], this.loading = !1;
	}
	static {
		this.styles = [V, o`
    :host { display: block; background: var(--_bg); border: 1px solid var(--_border); border-radius: var(--_radius); }
    header { display: flex; gap: 4px; align-items: center; padding: 8px; border-bottom: 1px solid var(--_border); }
    .tab, .link, .more {
      font: inherit; font-size: 12px; border: 1px solid transparent; border-radius: 6px; padding: 4px 10px;
      background: none; color: var(--_fg); cursor: pointer;
    }
    .tab[aria-selected="true"] { background: var(--_accent-soft); border-color: var(--_accent); }
    .link { margin-left: auto; color: var(--_accent); }
    .tabs { display: flex; gap: 4px; }
    .filters { display: flex; gap: 8px; align-items: center; font-size: 12px; color: var(--_muted); }
    .filters select { font: inherit; font-size: 12px; background: var(--_bg); color: var(--_fg);
      border: 1px solid var(--_border); border-radius: 6px; padding: 2px 4px; }
    button:focus-visible { outline: 2px solid var(--_accent); outline-offset: 1px; }
    ul { list-style: none; margin: 0; padding: 4px; display: grid; gap: 4px; }
    li {
      display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; padding: 8px 10px; border-radius: 6px;
      border-left: 3px solid var(--_info); cursor: pointer;
    }
    li:hover { background: var(--_surface); }
    li.WARNING { border-left-color: var(--_warning); } li.ERROR { border-left-color: var(--_error); }
    li.SUCCESS { border-left-color: var(--_success); }
    li.read { opacity: .6; }
    .title { font-weight: 600; font-size: 14px; }
    .unread-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--_accent); align-self: center; }
    .body { grid-column: 1 / -1; font-size: 13px; }
    .meta { grid-column: 1 / -1; font-size: 11px; color: var(--_muted); display: flex; gap: 8px; }
    .toggle { border: none; background: none; color: var(--_accent); cursor: pointer; font: inherit; padding: 0; }
    .empty, .error { padding: 16px; font-size: 13px; color: var(--_muted); text-align: center; }
    .error { color: var(--_error); }
    .more { display: block; margin: 4px auto 8px; border-color: var(--_border); }
  `];
	}
	connectedCallback() {
		super.connectedCallback(), this.baseUrl && this.start();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.unsubscribe?.();
	}
	updated(e) {
		let t = [
			"box",
			"unreadOnly",
			"severity",
			"correlationId"
		].some((t) => e.has(t));
		(e.has("baseUrl") || t) && this.baseUrl && this.isConnected && (e.has("baseUrl") ? this.start() : this.reload());
	}
	async reload() {
		this.loading = !0;
		try {
			let e = await this.client().list({
				...this.query(),
				limit: this.pageSize
			});
			this.items = e.items, this.nextCursor = e.nextCursor, this.error = void 0;
		} catch (e) {
			this.error = e.message;
		} finally {
			this.loading = !1;
		}
	}
	async loadMore() {
		this.nextCursor && await this.attempt(async () => {
			let e = await this.client().list({
				...this.query(),
				limit: this.pageSize,
				cursor: this.nextCursor
			});
			this.items = [...this.items, ...e.items.filter((e) => !this.items.some((t) => t.id === e.id))], this.nextCursor = e.nextCursor;
		});
	}
	async attempt(e) {
		try {
			await e(), this.error = void 0;
		} catch (e) {
			this.error = e.message;
		}
	}
	arrow(e) {
		if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
		let t = G[(G.findIndex((e) => e.box === this.box) + (e.key === "ArrowRight" ? 1 : G.length - 1)) % G.length];
		this.box = t.box, this.updateComplete.then(() => this.renderRoot.querySelector(".tab[aria-selected=true]")?.focus());
	}
	query() {
		return {
			box: this.box,
			read: !this.unreadOnly && void 0,
			severity: this.severity || void 0,
			correlationId: this.correlationId || void 0
		};
	}
	client() {
		return new U(this.baseUrl, this.auth);
	}
	start() {
		this.unsubscribe?.(), this.unsubscribe = W(this.baseUrl, this.auth).subscribe((e) => this.apply(e)), this.reload();
	}
	apply(e) {
		switch (e.type) {
			case "created":
				this.inBox(e.notification) && !this.items.some((t) => t.id === e.notification.id) && (this.items = [e.notification, ...this.items]);
				break;
			case "read":
			case "unread":
				if (this.unreadOnly && e.type === "read") {
					this.items = this.items.filter((t) => t.id !== e.id);
					break;
				}
				this.items = this.items.map((t) => t.id === e.id ? {
					...t,
					read: e.type === "read",
					readAt: e.type === "read" ? e.readAt : void 0
				} : t);
				break;
			case "deleted":
				this.items = this.items.filter((t) => t.id !== e.id);
				break;
			default: this.reload();
		}
	}
	inBox(e) {
		return (this.box === "all" || this.box === "personal" == (e.recipientType === "USER")) && (!this.severity || e.severity === this.severity) && (!this.correlationId || e.correlationId === this.correlationId);
	}
	async open(e) {
		let t = new CustomEvent("commons-notification-click", {
			detail: { notification: e },
			bubbles: !0,
			composed: !0,
			cancelable: !0
		});
		this.dispatchEvent(t) && !e.read && await this.setRead(e, !0);
	}
	async setRead(e, t) {
		await this.attempt(async () => {
			let n = t ? await this.client().markRead(e.id) : await this.client().markUnread(e.id);
			this.items = this.items.map((t) => t.id === e.id ? n : t);
		});
	}
	async markAll() {
		await this.attempt(async () => {
			this.severity ? await Promise.all(this.items.filter((e) => !e.read).map((e) => this.client().markRead(e.id))) : await this.client().markAllRead({
				box: this.box,
				correlationId: this.correlationId || void 0
			});
		}), await this.reload();
	}
	render() {
		return E`
      <header part="header">
        ${this.hideTabs ? O : E`<span role="tablist" aria-label="Boxes" class="tabs">${G.map(({ box: e, label: t }) => E`
          <button class="tab" role="tab" aria-selected=${this.box === e} tabindex=${this.box === e ? 0 : -1}
              @click=${() => {
			this.box = e;
		}} @keydown=${(e) => this.arrow(e)}>
            ${t}</button>`)}</span>`}
        ${this.showFilters ? E`<span class="filters" part="filters">
          <label><input type="checkbox" .checked=${this.unreadOnly}
              @change=${(e) => {
			this.unreadOnly = e.target.checked;
		}}> Unread</label>
          <select aria-label="Severity" @change=${(e) => {
			this.severity = e.target.value || void 0;
		}}>
            ${[
			"",
			"INFO",
			"WARNING",
			"ERROR",
			"SUCCESS"
		].map((e) => E`<option value=${e}
                ?selected=${(this.severity ?? "") === e}>${e ? e.toLowerCase() : "any severity"}</option>`)}
          </select></span>` : O}
        <button class="link" part="mark-all" @click=${() => this.markAll()}>Mark all read</button>
      </header>
      ${this.error ? E`<div class="error" role="alert">${this.error}</div>` : O}
      ${!this.loading && !this.error && this.items.length === 0 ? E`<div class="empty" part="empty"><slot name="empty">No notifications.</slot></div>` : O}
      <ul part="list" aria-label="Notifications">
        ${this.items.map((e) => E`
          <li class="${e.severity} ${e.read ? "read" : ""}" part="item" tabindex="0"
              @click=${() => this.open(e)} @keydown=${(t) => t.key === "Enter" && this.open(e)}>
            <span class="title">${e.title}</span>
            ${e.read ? E`<span></span>` : E`<span class="unread-dot" aria-label="unread"></span>`}
            ${e.body ? E`<span class="body">${e.body}</span>` : O}
            <span class="meta">
              <span>${e.recipientType === "ROLE" ? `Role ${e.recipientId}` : "Personal"}</span>
              <span title=${e.createdAt}>${H(e.createdAt)}</span>
              <button class="toggle" @click=${(t) => {
			t.stopPropagation(), this.setRead(e, !e.read);
		}}>
                ${e.read ? "Mark unread" : "Mark read"}</button>
            </span>
          </li>`)}
      </ul>
      ${this.nextCursor ? E`<button class="more" @click=${() => this.loadMore()}>Load more</button>` : O}
    `;
	}
};
customElements.get("commons-inbox") || customElements.define("commons-inbox", Re);
//#endregion
//#region ../chat/ui/dist/index.js
var K = class {
	constructor(e, t) {
		this.baseUrl = e, this.auth = t;
	}
	listConversations(e = {}) {
		return R(this.baseUrl, "/conversations", {
			auth: this.auth,
			query: { ...e }
		});
	}
	getConversation(e) {
		return R(this.baseUrl, `/conversations/${encodeURIComponent(e)}`, { auth: this.auth });
	}
	history(e, t = {}) {
		return R(this.baseUrl, `/conversations/${encodeURIComponent(e)}/messages`, {
			auth: this.auth,
			query: { ...t }
		});
	}
	sendText(e, t) {
		return R(this.baseUrl, `/conversations/${encodeURIComponent(e)}/messages`, {
			method: "POST",
			body: { content: t },
			auth: this.auth
		});
	}
	submitForm(e, t, n) {
		return R(this.baseUrl, `/conversations/${encodeURIComponent(e)}/messages`, {
			method: "POST",
			body: {
				kind: "FORM_RESPONSE",
				replyTo: t,
				content: n
			},
			auth: this.auth
		});
	}
	markRead(e, t) {
		return R(this.baseUrl, `/conversations/${encodeURIComponent(e)}/read`, {
			method: "PUT",
			body: { seq: t },
			auth: this.auth
		});
	}
	typing(e) {
		return R(this.baseUrl, `/conversations/${encodeURIComponent(e)}/typing`, {
			method: "POST",
			body: {},
			auth: this.auth
		});
	}
}, ze = class extends EventTarget {
	constructor(e, t) {
		super(), this.baseUrl = e, this.auth = t, this.users = 0;
	}
	subscribe(e) {
		let t = (t) => e(t.detail);
		if (this.addEventListener("change", t), this.users++ === 0) {
			let e = (e) => this.emit({
				type: "message",
				message: e
			}), t = (e) => this.emit({
				type: "conversation",
				conversation: e
			});
			this.stream = new B(this.baseUrl, {
				"message.created": e,
				"message.completed": e,
				"message.updated": e,
				"message.delta": ({ conversationId: e, messageId: t, text: n }) => this.emit({
					type: "delta",
					conversationId: e,
					messageId: t,
					text: n
				}),
				typing: ({ conversationId: e, participantId: t }) => this.emit({
					type: "typing",
					conversationId: e,
					participantId: t
				}),
				"conversation.created": t,
				"conversation.closed": t,
				"conversation.read": ({ conversationId: e, participantId: t, seq: n }) => this.emit({
					type: "read",
					conversationId: e,
					participantId: t,
					seq: n
				})
			}, {
				auth: this.auth,
				onReconnect: () => this.emit({ type: "reconnected" })
			}), this.stream.start();
		}
		return () => {
			this.removeEventListener("change", t), --this.users === 0 && (this.stream?.stop(), this.stream = void 0);
		};
	}
	emit(e) {
		this.dispatchEvent(new CustomEvent("change", { detail: e }));
	}
}, Be = /* @__PURE__ */ new Map();
function q(e, t) {
	let n = Be.get(e);
	return n || (n = new ze(e, t), Be.set(e, n)), n;
}
var Ve = class extends F {
	static {
		this.properties = {
			baseUrl: {
				type: String,
				attribute: "base-url"
			},
			auth: { attribute: !1 },
			selected: {
				type: String,
				reflect: !0
			},
			me: { type: String },
			status: { type: String },
			correlationId: {
				type: String,
				attribute: "correlation-id"
			},
			searchable: { type: Boolean },
			query: {
				state: !0,
				attribute: !1
			},
			loaded: {
				state: !0,
				attribute: !1
			},
			items: {
				state: !0,
				attribute: !1
			},
			error: {
				state: !0,
				attribute: !1
			}
		};
	}
	constructor() {
		super(), this.baseUrl = "", this.items = [], this.searchable = !1, this.query = "", this.loaded = !1;
	}
	static {
		this.styles = [V, o`
    :host { display: block; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 4px; }
    li { padding: 8px 10px; border-radius: 6px; border: 1px solid transparent; cursor: pointer; }
    li:hover { background: var(--_surface); }
    li[aria-selected="true"] { border-color: var(--_accent); background: var(--_accent-soft); }
    li:focus-visible { outline: 2px solid var(--_accent); }
    .top { display: flex; gap: 6px; align-items: center; }
    .title { flex: 1; font-weight: 600; font-size: 14px; }
    .unread { background: var(--_accent); color: #fff; border-radius: 10px; padding: 0 7px; font-size: 11px; }
    .closed { font-size: 11px; color: var(--_muted); }
    .meta { font-size: 12px; color: var(--_muted); }
    input[type=search] { width: 100%; box-sizing: border-box; font: inherit; font-size: 13px; padding: 6px 8px;
      margin-bottom: 6px; border: 1px solid var(--_border); border-radius: 6px; background: var(--_bg); color: var(--_fg); }
    .empty, .error { padding: 12px; font-size: 13px; color: var(--_muted); }
    .error { color: var(--_error); }
  `];
	}
	connectedCallback() {
		super.connectedCallback(), this.baseUrl && this.start();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.unsubscribe?.();
	}
	updated(e) {
		e.has("baseUrl") && this.baseUrl && this.isConnected ? this.start() : (e.has("status") || e.has("correlationId")) && this.baseUrl && this.isConnected && this.reload();
	}
	async reload() {
		try {
			this.items = (await new K(this.baseUrl, this.auth).listConversations({
				limit: 50,
				status: this.status || void 0,
				correlationId: this.correlationId || void 0
			})).items, this.error = void 0, this.loaded = !0;
		} catch (e) {
			this.error = e.message;
		}
	}
	start() {
		this.unsubscribe?.(), this.unsubscribe = q(this.baseUrl, this.auth).subscribe((e) => {
			e.type !== "delta" && e.type !== "typing" && (clearTimeout(this.pending), this.pending = setTimeout(() => void this.reload(), 300));
		}), this.reload();
	}
	select(e) {
		this.selected = e.id, this.dispatchEvent(new CustomEvent("commons-conversation-select", {
			detail: { conversation: e },
			bubbles: !0,
			composed: !0
		}));
	}
	render() {
		if (this.error) return E`<div class="error" role="alert">${this.error}</div>`;
		let e = this.searchable ? E`<input type="search" part="search" placeholder="Search conversations"
        aria-label="Search conversations" .value=${this.query}
        @input=${(e) => {
			this.query = e.target.value;
		}}>` : O, t = (e) => e.participants.filter((e) => e.participantId !== this.me).map((e) => e.displayName || e.participantId).join(", "), n = this.query.trim().toLowerCase(), r = n ? this.items.filter((e) => `${e.title ?? ""} ${e.correlationId} ${t(e)}`.toLowerCase().includes(n)) : this.items;
		return this.loaded ? r.length ? E`${e}<ul part="list" role="listbox" aria-label="Conversations">
      ${r.map((e) => E`<li part="item" role="option" tabindex="0" aria-selected=${this.selected === e.id}
            @click=${() => this.select(e)} @keydown=${(t) => t.key === "Enter" && this.select(e)}>
          <div class="top">
            <span class="title">${e.title || e.correlationId}</span>
            ${e.status === "CLOSED" ? E`<span class="closed">closed</span>` : O}
            ${e.unread ? E`<span class="unread" aria-label="${e.unread} unread">${e.unread}</span>` : O}
          </div>
          <div class="meta">with ${t(e)} · <span title=${e.updatedAt}>${H(e.updatedAt)}</span></div>
        </li>`)}
    </ul>` : E`${e}<div class="empty" part="empty"><slot name="empty">No conversations.</slot></div>` : E`<div class="empty" role="status">Loading…</div>`;
	}
};
customElements.get("commons-conversation-list") || customElements.define("commons-conversation-list", Ve);
var He = class extends F {
	static {
		this.properties = {
			baseUrl: {
				type: String,
				attribute: "base-url"
			},
			conversationId: {
				type: String,
				attribute: "conversation-id"
			},
			auth: { attribute: !1 },
			me: { type: String },
			attachmentsUrl: {
				type: String,
				attribute: "attachments-url"
			},
			conversation: {
				state: !0,
				attribute: !1
			},
			messages: {
				state: !0,
				attribute: !1
			},
			typing: {
				state: !0,
				attribute: !1
			},
			error: {
				state: !0,
				attribute: !1
			}
		};
	}
	constructor() {
		super(), this.baseUrl = "", this.conversationId = "", this.messages = /* @__PURE__ */ new Map();
	}
	static {
		this.styles = [V, o`
    :host { display: flex; flex-direction: column; min-height: 0; height: 100%; background: var(--_surface); }
    header { padding: 12px 16px; background: var(--_bg); border-bottom: 1px solid var(--_border); }
    header .title { font-weight: 600; }
    header .meta { font-size: 12px; color: var(--_muted); }
    .messages { flex: 1; min-height: 0; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .msg { max-width: 75%; padding: 9px 12px; border-radius: 12px; background: var(--_bg); border: 1px solid var(--_border);
      word-break: break-word; }
    .text { white-space: pre-wrap; }
    .msg.mine { align-self: flex-end; background: var(--_accent-soft); border-color: transparent; }
    .msg.system { align-self: center; background: none; border: none; color: var(--_muted); font-size: 12px; }
    .from { font-size: 11px; color: var(--_muted); margin-bottom: 2px; }
    .streaming .text::after { content: "▍"; animation: blink 1s steps(2) infinite; }
    @keyframes blink { 50% { opacity: 0; } }
    form, .card { display: grid; gap: 8px; margin-top: 6px; padding: 10px 12px; border: 1px solid var(--_border);
      border-radius: 10px; background: var(--_bg); white-space: normal; }
    label { display: grid; gap: 3px; font-size: 13px; }
    label.check { display: flex; gap: 8px; align-items: center; }
    input, textarea, select { font: inherit; padding: 6px 8px; border: 1px solid var(--_border); border-radius: 6px;
      background: var(--_bg); color: var(--_fg); }
    label.check input { width: auto; }
    button { font: inherit; padding: 6px 12px; border-radius: 6px; border: 1px solid var(--_accent);
      background: var(--_accent); color: #fff; cursor: pointer; }
    button:focus-visible, input:focus-visible { outline: 2px solid var(--_accent); outline-offset: 1px; }
    .done { color: var(--_success); font-size: 13px; }
    .typing { padding: 0 16px 6px; font-size: 12px; color: var(--_muted); }
    .composer { display: flex; gap: 8px; padding: 12px 16px; background: var(--_bg); border-top: 1px solid var(--_border); }
    .composer input { flex: 1; }
    .error { padding: 12px 16px; color: var(--_error); font-size: 13px; }
  `];
	}
	connectedCallback() {
		super.connectedCallback(), this.watch();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.unsubscribe?.(), this.unsubscribe = void 0, this.watching = void 0;
	}
	watch() {
		this.baseUrl && this.isConnected && this.watching !== this.baseUrl && (this.unsubscribe?.(), this.watching = this.baseUrl, this.unsubscribe = q(this.baseUrl, this.auth).subscribe((e) => this.apply(e)));
	}
	updated(e) {
		if (e.has("baseUrl") && this.watch(), (e.has("conversationId") || e.has("baseUrl")) && this.baseUrl && this.conversationId && this.reload(), e.has("messages")) {
			let e = this.renderRoot.querySelector(".messages");
			e?.scrollTo({ top: e.scrollHeight });
		}
	}
	async reload() {
		try {
			let e = this.client(), [t, n] = await Promise.all([e.getConversation(this.conversationId), e.history(this.conversationId, { limit: 100 })]);
			this.conversation = t, this.messages = new Map(n.items.map((e) => [e.id, e])), this.error = void 0, this.markRead();
		} catch (e) {
			this.error = e.message;
		}
	}
	client() {
		return new K(this.baseUrl, this.auth);
	}
	apply(e) {
		switch (e.type) {
			case "message":
				e.message.conversationId === this.conversationId && (this.messages = new Map(this.messages).set(e.message.id, e.message), this.typing = void 0, e.message.senderId !== this.me && this.markRead());
				break;
			case "delta": {
				let t = this.messages.get(e.messageId);
				if (e.conversationId === this.conversationId && t) {
					let n = (typeof t.content == "string" ? t.content : "") + e.text;
					this.messages = new Map(this.messages).set(t.id, {
						...t,
						content: n
					}), this.typing = void 0;
				}
				break;
			}
			case "typing":
				e.conversationId === this.conversationId && e.participantId !== this.me && (this.typing = this.nameOf(e.participantId), clearTimeout(this.typingTimer), this.typingTimer = setTimeout(() => {
					this.typing = void 0;
				}, 6e3));
				break;
			case "conversation":
				e.conversation.id === this.conversationId && (this.conversation = e.conversation);
				break;
			case "reconnected": this.reload();
		}
	}
	async markRead() {
		let e = Math.max(0, ...[...this.messages.values()].map((e) => e.seq));
		e > 0 && this.conversation?.participants.some((e) => e.participantId === this.me) && await this.client().markRead(this.conversationId, e).catch(() => void 0);
	}
	nameOf(e) {
		return this.conversation?.participants.find((t) => t.participantId === e)?.displayName || e;
	}
	async send(e) {
		e.preventDefault();
		let t = e.target.elements.namedItem("text"), n = t.value.trim();
		if (n) {
			t.value = "";
			try {
				let e = await this.client().sendText(this.conversationId, n);
				this.dispatchEvent(new CustomEvent("commons-message-sent", {
					detail: { message: e },
					bubbles: !0,
					composed: !0
				}));
			} catch (e) {
				this.error = e.message;
			}
		}
	}
	async submit(e, t, n) {
		e.preventDefault();
		let r = e.target, i = {};
		for (let [e, t] of Object.entries(n.schema.properties ?? {})) {
			let n = r.elements.namedItem(e);
			t.type === "boolean" ? i[e] = n.checked : n.value !== "" && (i[e] = t.type === "number" || t.type === "integer" ? Number(n.value) : n.value);
		}
		try {
			let e = await this.client().submitForm(this.conversationId, t.id, i);
			this.dispatchEvent(new CustomEvent("commons-form-submitted", {
				detail: { message: e },
				bubbles: !0,
				composed: !0
			}));
		} catch (e) {
			this.error = e.message;
		}
	}
	render() {
		let e = this.conversation, t = [...this.messages.values()].sort((e, t) => e.seq - t.seq), n = new Map(t.filter((e) => e.kind === "FORM_RESPONSE" && e.replyTo).map((e) => [e.replyTo, e])), r = e?.participants.filter((e) => e.participantId !== this.me).map((e) => e.displayName || e.participantId);
		return E`
      ${e ? E`<header part="header"><div class="title">${e.title || e.correlationId}</div>
        <div class="meta">${e.status === "CLOSED" ? "Closed · " : ""}with ${r?.join(", ")}</div></header>` : O}
      ${this.error ? E`<div class="error" role="alert">${this.error}</div>` : O}
      <div class="messages" part="messages" role="log" aria-live="polite">
        ${t.filter((e) => e.kind !== "EVENT" && !(e.kind === "FORM_RESPONSE" && e.replyTo && this.messages.has(e.replyTo))).map((e) => this.renderMessage(e, n.get(e.id)))}
      </div>
      ${this.typing ? E`<div class="typing">${this.typing} is typing…</div>` : O}
      ${e?.status === "OPEN" ? E`<form class="composer" part="composer" @submit=${this.send}>
        <input name="text" placeholder="Write a message…" autocomplete="off" aria-label="Message">
        <button type="submit">Send</button></form>` : O}
    `;
	}
	renderMessage(e, t) {
		if (e.kind === "SYSTEM") return E`<div class="msg system" part="message">${String(e.content)}</div>`;
		let n = e.senderId === this.me, r;
		switch (e.kind) {
			case "FORM":
				r = this.renderForm(e, e.content, t);
				break;
			case "ATTACHMENT_REF":
				r = this.renderAttachment(e.content);
				break;
			case "FORM_RESPONSE":
				r = E`<div class="text">${Object.entries(e.content).map(([e, t]) => `${e}: ${t}`).join(" · ")}</div>`;
				break;
			default: r = E`<div class="text">${typeof e.content == "string" ? e.content : JSON.stringify(e.content)}</div>`;
		}
		return E`<div class="msg ${n ? "mine" : ""} ${e.status === "STREAMING" ? "streaming" : ""}" part="message">
      <div class="from">${n ? "You" : this.nameOf(e.senderId)} · <span title=${e.createdAt}>${H(e.createdAt)}</span></div>
      ${r}</div>`;
	}
	renderForm(e, t, n) {
		let r = n?.content, i = !!n || !!e.answeredAt || e.senderId === this.me || this.conversation?.status !== "OPEN", a = new Set(t.schema.required ?? []);
		return E`<form @submit=${(n) => this.submit(n, e, t)}>
      <strong>${t.title ?? "Form"}</strong>
      ${Object.entries(t.schema.properties ?? {}).map(([e, t]) => t.type === "boolean" ? E`<label class="check"><input type="checkbox" name=${e} ?checked=${r?.[e] === !0}
            ?disabled=${i}>${t.title ?? e}</label>` : t.enum ? E`<label>${t.title ?? e}<select name=${e} ?required=${a.has(e)} ?disabled=${i}>
            ${t.enum.map((t) => E`<option ?selected=${r?.[e] === t}>${t}</option>`)}</select></label>` : E`<label>${t.title ?? e}<input name=${e} ?required=${a.has(e)} ?disabled=${i}
            .value=${r?.[e] === void 0 ? "" : String(r[e])} step="any"
            type=${t.type === "number" || t.type === "integer" ? "number" : t.format === "date" ? "date" : "text"}>
          </label>`)}
      ${n ? E`<div class="done">✓ Answered by ${n.senderId === this.me ? "you" : this.nameOf(n.senderId)}</div>` : i ? O : E`<button type="submit">${t.submitLabel ?? "Submit"}</button>`}
    </form>`;
	}
	renderAttachment(e) {
		return e.caseId && this.attachmentsUrl && customElements.get("commons-upload-case") ? E`<commons-upload-case class="card" base-url=${this.attachmentsUrl ?? ""} case-id=${e.caseId}
          .me=${this.me} .auth=${this.auth}></commons-upload-case>` : E`<div class="card"><strong>${e.name ?? "Attachment"}</strong></div>`;
	}
};
customElements.get("commons-conversation") || customElements.define("commons-conversation", He);
//#endregion
//#region ../attachment/ui/dist/index.js
var J = /* @__PURE__ */ new Map(), Y = class {
	constructor(e, t) {
		this.baseUrl = e, this.auth = t;
	}
	getCase(e) {
		return R(this.baseUrl, `/cases/${encodeURIComponent(e)}`, { auth: this.auth });
	}
	listCases(e = {}) {
		return R(this.baseUrl, "/cases", {
			auth: this.auth,
			query: {
				...e,
				subject: void 0
			}
		});
	}
	listAllCases(e = {}) {
		return R(this.baseUrl, "/admin/cases", {
			auth: this.auth,
			query: { ...e }
		});
	}
	async upload(e, t, n) {
		let r = this.auth ?? I(), i = z(this.baseUrl, `/cases/${encodeURIComponent(e)}/slots/${encodeURIComponent(t)}/files`, { fileName: n.name }), a = await fetch(i, {
			method: "POST",
			body: n,
			headers: {
				...await r.headers(),
				"content-type": n.type || "application/octet-stream"
			}
		});
		if (!a.ok) {
			a.status === 401 && r.onUnauthorized?.();
			let e = await a.json().catch(() => ({}));
			throw new L(a.status, e.code ?? `HTTP_${a.status}`, e.message ?? a.statusText);
		}
		return a.json();
	}
	deleteFile(e, t) {
		return R(this.baseUrl, `/cases/${encodeURIComponent(e)}/files/${encodeURIComponent(t)}`, {
			method: "DELETE",
			auth: this.auth
		});
	}
	submit(e) {
		return R(this.baseUrl, `/cases/${encodeURIComponent(e)}/submit`, {
			method: "POST",
			auth: this.auth
		});
	}
	async download(e, t) {
		let n = this.auth ?? I(), r = await fetch(z(this.baseUrl, `/cases/${encodeURIComponent(e)}/files/${encodeURIComponent(t)}/content`), { headers: await n.headers() });
		if (!r.ok) {
			r.status === 401 && n.onUnauthorized?.();
			let e = await r.json().catch(() => ({}));
			throw new L(r.status, e.code ?? `HTTP_${r.status}`, e.message ?? r.statusText);
		}
		return r.blob();
	}
	async link(e, t) {
		let n = J.get(t);
		if (n && n.expires - Date.now() > 3e4) return n.url;
		let { url: r, expiresAt: i } = await R(this.baseUrl, `/cases/${encodeURIComponent(e)}/files/${encodeURIComponent(t)}/link`, {
			method: "POST",
			auth: this.auth
		});
		if (/^[a-z][a-z0-9+.-]*:/i.test(r)) return J.set(t, {
			url: r,
			expires: new Date(i).getTime()
		}), r;
		let a = new URL(this.baseUrl, globalThis.location?.href).pathname.replace(/\/+$/, ""), o = r.startsWith(a) ? r.slice(a.length) : r.replace(/^\/[^/]+\/v\d+/, ""), s = this.baseUrl.replace(/\/+$/, "") + o;
		return J.set(t, {
			url: s,
			expires: new Date(i).getTime()
		}), s;
	}
}, Ue = class extends EventTarget {
	constructor(e, t) {
		super(), this.baseUrl = e, this.auth = t, this.users = 0;
	}
	subscribe(e) {
		let t = (t) => e(t.detail);
		if (this.addEventListener("change", t), this.users++ === 0) {
			let e = (e) => (t) => this.emit({
				type: "case",
				event: e,
				case: t
			}), t = (e) => ({ caseId: t, attachment: n }) => this.emit({
				type: "file",
				event: e,
				caseId: t,
				attachment: n
			});
			this.stream = new B(this.baseUrl, {
				"case.created": e("case.created"),
				"case.submitted": e("case.submitted"),
				"case.reopened": e("case.reopened"),
				"case.closed": e("case.closed"),
				"attachment.uploaded": t("attachment.uploaded"),
				"attachment.deleted": t("attachment.deleted")
			}, {
				auth: this.auth,
				onReconnect: () => this.emit({ type: "reconnected" })
			}), this.stream.start();
		}
		return () => {
			this.removeEventListener("change", t), --this.users === 0 && (this.stream?.stop(), this.stream = void 0);
		};
	}
	emit(e) {
		this.dispatchEvent(new CustomEvent("change", { detail: e }));
	}
}, We = /* @__PURE__ */ new Map();
function X(e, t) {
	let n = We.get(e);
	return n || (n = new Ue(e, t), We.set(e, n)), n;
}
function Ge(e) {
	return e.type === "case" ? e.case.id : e.type === "file" ? e.caseId : void 0;
}
function Z(e) {
	let t = e.mimeType.toLowerCase();
	return t.startsWith("image/") ? "image" : t === "application/pdf" ? "pdf" : t.startsWith("video/") ? "video" : t.startsWith("audio/") ? "audio" : (t.startsWith("text/") || t === "application/json" || t.endsWith("+json") || t.endsWith("+xml") || t === "application/xml") && e.sizeBytes <= 262144 ? "text" : "none";
}
function Q(e) {
	if (e < 1024) return `${e} B`;
	let t = [
		"KB",
		"MB",
		"GB"
	], n = e / 1024, r = 0;
	for (; n >= 1024 && r < t.length - 1;) n /= 1024, r++;
	return `${n < 10 ? n.toFixed(1) : Math.round(n)} ${t[r]}`;
}
function Ke(e) {
	return ((e.fileName.includes(".") ? e.fileName.split(".").pop() : "") || e.mimeType.split("/").pop() || "file").slice(0, 4).toUpperCase();
}
function qe(e, t) {
	let n = URL.createObjectURL(e), r = Object.assign(document.createElement("a"), {
		href: n,
		download: t
	});
	document.body.append(r), r.click(), r.remove(), setTimeout(() => URL.revokeObjectURL(n), 1e4);
}
var Je = class extends F {
	static {
		this.properties = {
			baseUrl: {
				type: String,
				attribute: "base-url"
			},
			auth: { attribute: !1 },
			file: { attribute: !1 },
			url: {
				state: !0,
				attribute: !1
			},
			text: {
				state: !0,
				attribute: !1
			},
			error: {
				state: !0,
				attribute: !1
			}
		};
	}
	constructor() {
		super(), this.baseUrl = "";
	}
	static {
		this.styles = [V, o`
    dialog { width: min(960px, 94vw); height: min(720px, 90vh); padding: 0; border: 1px solid var(--_border);
      border-radius: var(--_radius); background: var(--_bg); color: var(--_fg); overflow: hidden; }
    dialog[open] { display: flex; flex-direction: column; }
    dialog::backdrop { background: rgb(0 0 0 / .55); }
    .bar { display: flex; gap: 8px; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--_border); }
    .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
    .meta { font-size: 12px; color: var(--_muted); white-space: nowrap; }
    button { font: inherit; font-size: 13px; padding: 5px 10px; border-radius: 6px; cursor: pointer;
      border: 1px solid var(--_border); background: var(--_surface); color: var(--_fg); }
    button:focus-visible { outline: 2px solid var(--_accent); }
    .open { font-size: 13px; color: var(--_accent); white-space: nowrap; }
    .body { flex: 1; min-height: 0; display: grid; place-items: center; background: var(--_surface); overflow: auto; }
    img, video { max-width: 100%; max-height: 100%; object-fit: contain; }
    iframe { width: 100%; height: 100%; border: 0; background: #fff; }
    pre { align-self: start; justify-self: stretch; margin: 0; padding: 12px; font-size: 12px; white-space: pre-wrap;
      word-break: break-word; }
    .none { text-align: center; color: var(--_muted); display: grid; gap: 10px; justify-items: center; }
    .error { color: var(--_error); }
  `];
	}
	async show(e) {
		if (e && (this.file = e), !this.file) return;
		this.url = void 0, this.text = void 0, this.error = void 0, await this.updateComplete, this.renderRoot.querySelector("dialog")?.showModal();
		let t = this.file, n = () => this.file !== t;
		try {
			let e = new Y(this.baseUrl, this.auth), r = Z(t);
			if (r === "text") {
				let r = await (await e.download(t.caseId, t.id)).text();
				n() || (this.text = r);
			} else if (r !== "none") {
				let r = await e.link(t.caseId, t.id);
				n() || (this.url = r);
			}
		} catch (e) {
			n() || (this.error = e.message);
		}
	}
	close() {
		this.renderRoot.querySelector("dialog")?.close();
	}
	async download() {
		let e = this.file;
		if (e) try {
			qe(await new Y(this.baseUrl, this.auth).download(e.caseId, e.id), e.fileName), this.dispatchEvent(new CustomEvent("commons-file-downloaded", {
				detail: { attachment: e },
				bubbles: !0,
				composed: !0
			}));
		} catch (e) {
			this.error = e.message;
		}
	}
	body() {
		let e = this.file;
		if (this.error) return E`<div class="error" role="alert">${this.error}</div>`;
		let t = Z(e);
		if (t === "none") return E`<div class="none">No preview for ${e.mimeType}.
        <button @click=${this.download}>Download ${e.fileName}</button></div>`;
		if (t === "text") return this.text === void 0 ? E`<span class="meta">Loading…</span>` : E`<pre>${this.text}</pre>`;
		if (!this.url) return E`<span class="meta">Loading…</span>`;
		switch (t) {
			case "image": return E`<img src=${this.url} alt=${e.fileName}>`;
			case "pdf": return E`<iframe src=${this.url} title=${e.fileName}></iframe>`;
			case "video": return E`<video src=${this.url} controls></video>`;
			default: return E`<audio src=${this.url} controls></audio>`;
		}
	}
	render() {
		let e = this.file;
		return E`<dialog part="dialog" aria-label=${e?.fileName ?? "File preview"}
        @close=${() => this.dispatchEvent(new CustomEvent("commons-preview-close", {
			bubbles: !0,
			composed: !0
		}))}>
      ${e ? E`
        <div class="bar" part="toolbar">
          <span class="name" title=${e.fileName}>${e.fileName}</span>
          <span class="meta">${Q(e.sizeBytes)} · ${e.uploadedBy} ·
            <span title=${e.uploadedAt}>${H(e.uploadedAt)}</span></span>
          ${this.url ? E`<a class="open" href=${this.url} target="_blank" rel="noopener">Open in new tab</a>` : O}
          <button @click=${this.download}>Download</button>
          <button @click=${this.close} aria-label="Close preview">Close</button>
        </div>
        <div class="body" part="body">${this.body()}</div>` : O}
    </dialog>`;
	}
};
customElements.get("commons-file-preview") || customElements.define("commons-file-preview", Je);
var Ye = class extends F {
	static {
		this.properties = {
			baseUrl: {
				type: String,
				attribute: "base-url"
			},
			caseId: {
				type: String,
				attribute: "case-id"
			},
			me: { type: String },
			compact: {
				type: Boolean,
				reflect: !0
			},
			auth: { attribute: !1 },
			case: {
				state: !0,
				attribute: !1
			},
			links: {
				state: !0,
				attribute: !1
			},
			uploading: {
				state: !0,
				attribute: !1
			},
			dragging: {
				state: !0,
				attribute: !1
			},
			error: {
				state: !0,
				attribute: !1
			}
		};
	}
	constructor() {
		super(), this.baseUrl = "", this.caseId = "", this.compact = !1, this.links = {}, this.uploading = {};
	}
	static {
		this.styles = [V, o`
    :host { display: grid; gap: 8px; }
    .head { display: flex; gap: 8px; align-items: baseline; }
    .head strong { flex: 1; }
    .status { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: var(--_surface); }
    .status.SUBMITTED { background: var(--_accent-soft); } .status.CLOSED { color: var(--_muted); }
    .reason { font-size: 13px; color: var(--_warning); }
    .slot { display: grid; gap: 6px; padding: 8px; border: 1px dashed var(--_border); border-radius: var(--_radius); }
    .slot.done { border-style: solid; border-color: var(--_success); }
    .meta { font-size: 12px; color: var(--_muted); }
    .thumbs { display: flex; gap: 6px; flex-wrap: wrap; }
    .file { position: relative; }
    .thumb { position: relative; width: 72px; height: 72px; border-radius: 6px; border: 1px solid var(--_border);
      display: grid; place-items: center; background: var(--_surface); cursor: pointer; overflow: hidden; padding: 0;
      font: inherit; color: var(--_fg); }
    .thumb:focus-visible, .remove:focus-visible { outline: 2px solid var(--_accent); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .thumb .badge { font-size: 11px; font-weight: 700; color: var(--_muted); }
    .thumb .name { position: absolute; bottom: 0; left: 0; right: 0; font-size: 9px; padding: 1px 3px;
      background: rgb(0 0 0 / .55); color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .remove { position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; border-radius: 50%; border: none;
      background: rgb(0 0 0 / .6); color: #fff; font-size: 12px; line-height: 18px; cursor: pointer; padding: 0; }
    .drop { display: grid; place-items: center; gap: 4px; padding: 12px; border: 1px dashed var(--_border);
      border-radius: 6px; font-size: 13px; color: var(--_muted); text-align: center; cursor: pointer; }
    .drop.over { border-color: var(--_accent); background: var(--_accent-soft); color: var(--_fg); }
    .drop:focus-within { outline: 2px solid var(--_accent); }
    .drop input { position: absolute; width: 1px; height: 1px; opacity: 0; }
    .drop u { color: var(--_accent); text-decoration: none; font-weight: 600; }
    .busy { font-size: 12px; color: var(--_accent); }
    button.submit { font: inherit; padding: 6px 12px; border-radius: 6px; border: 1px solid var(--_accent);
      background: var(--_accent); color: #fff; cursor: pointer; justify-self: start; }
    button.submit:disabled { opacity: .5; cursor: default; }
    .error { color: var(--_error); font-size: 13px; }
  `];
	}
	connectedCallback() {
		super.connectedCallback(), this.start();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.unsubscribe?.(), this.unsubscribe = void 0;
	}
	updated(e) {
		(e.has("caseId") || e.has("baseUrl")) && this.start();
	}
	start() {
		this.unsubscribe?.(), this.unsubscribe = void 0, this.baseUrl && this.caseId && this.isConnected && (this.unsubscribe = X(this.baseUrl, this.auth).subscribe((e) => {
			(e.type === "reconnected" || Ge(e) === this.caseId) && this.reload();
		}), this.reload());
	}
	async reload() {
		try {
			let e = new Y(this.baseUrl, this.auth), t = await e.getCase(this.caseId), n = {};
			await Promise.all((t.files ?? []).filter((e) => e.mimeType.startsWith("image/")).map(async (r) => {
				n[r.id] = await e.link(t.id, r.id).catch(() => "");
			})), this.case = t, this.links = n, this.error = void 0;
		} catch (e) {
			this.error = e.message;
		}
	}
	canUpload() {
		return this.case?.status === "OPEN" && (!this.me || this.case.subjects.includes(this.me));
	}
	async upload(e, t) {
		if (!this.case || !t.length) return;
		let n = e.maxFiles - e.fileCount - (this.uploading[e.name]?.length ?? 0), r = t.filter((t) => Xe(e, t)), i = [];
		r.length < t.length && i.push(`${e.label} takes ${e.mimeTypes.join(", ")}`), r.length > n && i.push(`${e.label} has room for ${Math.max(n, 0)} more`);
		let a = r.slice(0, Math.max(n, 0));
		this.uploading = {
			...this.uploading,
			[e.name]: [...this.uploading[e.name] ?? [], ...a.map((e) => e.name)]
		};
		let o = new Y(this.baseUrl, this.auth);
		for (let t of a) try {
			if (t.size > e.maxBytes) throw Error(`${t.name} is larger than ${Q(e.maxBytes)}`);
			let n = await o.upload(this.case.id, e.name, t);
			this.dispatchEvent(new CustomEvent("commons-file-uploaded", {
				detail: { attachment: n },
				bubbles: !0,
				composed: !0
			}));
		} catch (e) {
			i.push(e.message);
		} finally {
			let n = [...this.uploading[e.name] ?? []];
			n.splice(n.indexOf(t.name), 1), this.uploading = {
				...this.uploading,
				[e.name]: n
			};
		}
		this.error = i.length ? i.join(". ") : void 0, await this.reload(), i.length && (this.error = i.join(". "));
	}
	async removeFile(e) {
		try {
			await new Y(this.baseUrl, this.auth).deleteFile(e.caseId, e.id), this.dispatchEvent(new CustomEvent("commons-file-deleted", {
				detail: { attachment: e },
				bubbles: !0,
				composed: !0
			})), await this.reload();
		} catch (e) {
			this.error = e.message;
		}
	}
	open(e) {
		let t = new CustomEvent("commons-file-open", {
			detail: { attachment: e },
			bubbles: !0,
			composed: !0,
			cancelable: !0
		});
		this.dispatchEvent(t) && this.renderRoot.querySelector("commons-file-preview")?.show(e);
	}
	async submit() {
		try {
			let e = await new Y(this.baseUrl, this.auth).submit(this.caseId);
			this.case = e, this.dispatchEvent(new CustomEvent("commons-case-submitted", {
				detail: { case: e },
				bubbles: !0,
				composed: !0
			}));
		} catch (e) {
			this.error = e.message;
		}
	}
	dropzone(e) {
		let t = e.maxFiles - e.fileCount;
		return E`<label class="drop ${this.dragging === e.name ? "over" : ""}" part="dropzone"
        @dragover=${(t) => {
			t.preventDefault(), this.dragging = e.name;
		}}
        @dragleave=${() => {
			this.dragging = void 0;
		}} @drop=${(t) => {
			t.preventDefault(), this.dragging = void 0, this.upload(e, [...t.dataTransfer?.files ?? []]);
		}}>
      <span>Drop ${t > 1 ? "files" : "a file"} here or <u>choose</u></span>
      <input type="file" aria-label="Upload ${e.label}" accept=${e.mimeTypes.join(",")} ?multiple=${t > 1}
          @change=${(t) => {
			let n = t.target;
			this.upload(e, [...n.files ?? []]).finally(() => {
				n.value = "";
			});
		}}>
    </label>`;
	}
	render() {
		let e = this.case;
		if (!e) return this.error ? E`<div class="error" role="alert">${this.error}</div>` : E`<div class="meta">Loading…</div>`;
		let t = this.canUpload();
		return E`
      ${this.compact ? O : E`<div class="head"><strong>${e.title}</strong>
        <span class="status ${e.status}">${e.status}</span></div>`}
      ${e.statusReason ? E`<div class="reason">${e.statusReason}</div>` : O}
      ${e.slots.map((n) => {
			let r = (e.files ?? []).filter((e) => e.slot === n.name), i = this.uploading[n.name] ?? [];
			return E`<div class="slot ${n.satisfied ? "done" : ""}" part="slot">
          <div><strong>${n.label}</strong> <span class="meta">${n.fileCount}/${n.maxFiles}
            · ${n.mimeTypes.join(", ") || "any type"}${n.minFiles === 0 ? " · optional" : ""}</span></div>
          ${n.description ? E`<div class="meta">${n.description}</div>` : O}
          ${r.length ? E`<div class="thumbs">${r.map((e) => E`<span class="file">
            <button class="thumb" @click=${() => this.open(e)} title=${e.fileName} aria-label="Preview ${e.fileName}">
              ${this.links[e.id] ? E`<img src=${this.links[e.id]} alt="">` : E`<span class="badge">${Ke(e)}</span><span class="name">${e.fileName}</span>`}
            </button>
            ${t && this.me && e.uploadedBy === this.me ? E`<button class="remove"
                aria-label="Remove ${e.fileName}" @click=${() => void this.removeFile(e)}>×</button>` : O}
          </span>`)}</div>` : O}
          ${i.length ? E`<div class="busy" role="status">Uploading ${i.join(", ")}…</div>` : O}
          ${t && n.fileCount + i.length < n.maxFiles ? this.dropzone(n) : O}
        </div>`;
		})}
      ${t && !e.autoSubmit ? E`<button class="submit" part="submit"
          ?disabled=${!e.slots.every((e) => e.satisfied)} @click=${this.submit}>Submit</button>` : O}
      ${this.error ? E`<div class="error" role="alert">${this.error}</div>` : O}
      <commons-file-preview .baseUrl=${this.baseUrl} .auth=${this.auth}></commons-file-preview>
    `;
	}
};
function Xe(e, t) {
	if (!e.mimeTypes.length) return !0;
	let n = (t.type || "application/octet-stream").toLowerCase();
	return e.mimeTypes.some((e) => e.endsWith("/*") ? n.startsWith(e.slice(0, -1).toLowerCase()) : n === e.toLowerCase());
}
customElements.get("commons-upload-case") || customElements.define("commons-upload-case", Ye);
var Ze = class extends F {
	static {
		this.properties = {
			baseUrl: {
				type: String,
				attribute: "base-url"
			},
			auth: { attribute: !1 },
			me: { type: String },
			selected: {
				type: String,
				reflect: !0
			},
			status: { type: String },
			correlationId: {
				type: String,
				attribute: "correlation-id"
			},
			admin: { type: Boolean },
			subject: { type: String },
			pageSize: {
				type: Number,
				attribute: "page-size"
			},
			items: {
				state: !0,
				attribute: !1
			},
			nextCursor: {
				state: !0,
				attribute: !1
			},
			error: {
				state: !0,
				attribute: !1
			},
			loaded: {
				state: !0,
				attribute: !1
			}
		};
	}
	constructor() {
		super(), this.baseUrl = "", this.admin = !1, this.pageSize = 20, this.items = [], this.loaded = !1;
	}
	static {
		this.styles = [V, o`
    :host { display: block; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 4px; }
    li { padding: 8px 10px; border-radius: 6px; border: 1px solid transparent; cursor: pointer; }
    li:hover { background: var(--_surface); }
    li[aria-selected="true"] { border-color: var(--_accent); background: var(--_accent-soft); }
    li:focus-visible { outline: 2px solid var(--_accent); }
    .top { display: flex; gap: 6px; align-items: center; }
    .title { flex: 1; font-weight: 600; font-size: 14px; min-width: 0; overflow: hidden; text-overflow: ellipsis;
      white-space: nowrap; }
    .status { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: var(--_surface); white-space: nowrap; }
    .status.SUBMITTED { background: var(--_accent-soft); } .status.CLOSED { color: var(--_muted); }
    .todo { font-size: 11px; color: var(--_warning); white-space: nowrap; }
    .meta { font-size: 12px; color: var(--_muted); }
    .bar { height: 3px; background: var(--_surface); border-radius: 2px; margin-top: 4px; overflow: hidden; }
    .bar span { display: block; height: 100%; background: var(--_success); }
    .more { display: block; margin: 6px auto; font: inherit; font-size: 12px; padding: 4px 10px; cursor: pointer;
      border: 1px solid var(--_border); border-radius: 6px; background: none; color: var(--_fg); }
    .empty, .error { padding: 12px; font-size: 13px; color: var(--_muted); }
    .error { color: var(--_error); }
  `];
	}
	connectedCallback() {
		super.connectedCallback(), this.start();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.unsubscribe?.(), this.unsubscribe = void 0;
	}
	updated(e) {
		e.has("baseUrl") ? this.start() : [
			"status",
			"correlationId",
			"admin",
			"subject"
		].some((t) => e.has(t)) && this.reload();
	}
	start() {
		this.unsubscribe?.(), this.unsubscribe = void 0, this.baseUrl && this.isConnected && (this.unsubscribe = X(this.baseUrl, this.auth).subscribe(() => {
			clearTimeout(this.pending), this.pending = setTimeout(() => void this.reload(), 300);
		}), this.reload());
	}
	query(e, t = this.pageSize) {
		return {
			status: this.status || void 0,
			correlationId: this.correlationId || void 0,
			subject: this.admin && this.subject || void 0,
			limit: t,
			cursor: e
		};
	}
	fetchPage(e, t) {
		let n = new Y(this.baseUrl, this.auth);
		return this.admin ? n.listAllCases(this.query(e, t)) : n.listCases(this.query(e, t));
	}
	async reload() {
		try {
			let e = await this.fetchPage(void 0, Math.min(100, Math.max(this.pageSize, this.items.length)));
			this.loaded = !0, this.items = e.items, this.nextCursor = e.nextCursor, this.error = void 0;
		} catch (e) {
			this.error = e.message;
		}
	}
	async loadMore() {
		if (this.nextCursor) try {
			let e = await this.fetchPage(this.nextCursor);
			this.items = [...this.items, ...e.items.filter((e) => !this.items.some((t) => t.id === e.id))], this.nextCursor = e.nextCursor;
		} catch (e) {
			this.error = e.message;
		}
	}
	select(e) {
		this.selected = e.id, this.dispatchEvent(new CustomEvent("commons-case-select", {
			detail: { case: e },
			bubbles: !0,
			composed: !0
		}));
	}
	render() {
		return this.error ? E`<div class="error" role="alert">${this.error}</div>` : this.loaded ? this.items.length ? E`<ul part="list" role="listbox" aria-label="Upload cases">
      ${this.items.map((e) => {
			let t = e.slots.filter((e) => e.satisfied).length, n = e.status === "OPEN" && !!this.me && e.subjects.includes(this.me) && t < e.slots.length;
			return E`<li part="item" role="option" tabindex="0" aria-selected=${this.selected === e.id}
            @click=${() => this.select(e)} @keydown=${(t) => t.key === "Enter" && this.select(e)}>
          <div class="top">
            <span class="title" title=${e.title}>${e.title}</span>
            ${n ? E`<span class="todo">Needs your upload</span>` : O}
            <span class="status ${e.status}">${e.status.toLowerCase()}</span>
          </div>
          <div class="meta">${t}/${e.slots.length} slots ·
            ${this.admin ? E`${e.subjects.join(", ")} · ` : O}
            <span title=${e.updatedAt}>${H(e.updatedAt)}</span></div>
          <div class="bar"><span style="width:${e.slots.length ? Math.round(t / e.slots.length * 100) : 100}%"></span></div>
        </li>`;
		})}
    </ul>
    ${this.nextCursor ? E`<button class="more" @click=${() => this.loadMore()}>Load more</button>` : O}` : E`<div class="empty" part="empty"><slot name="empty">No cases.</slot></div>` : E`<div class="empty" role="status">Loading…</div>`;
	}
};
customElements.get("commons-case-list") || customElements.define("commons-case-list", Ze);
var Qe = class extends F {
	static {
		this.properties = {
			baseUrl: {
				type: String,
				attribute: "base-url"
			},
			caseId: {
				type: String,
				attribute: "case-id"
			},
			me: { type: String },
			canDelete: {
				type: Boolean,
				attribute: "can-delete"
			},
			layout: {
				type: String,
				reflect: !0
			},
			flat: { type: Boolean },
			auth: { attribute: !1 },
			case: {
				state: !0,
				attribute: !1
			},
			links: {
				state: !0,
				attribute: !1
			},
			error: {
				state: !0,
				attribute: !1
			}
		};
	}
	constructor() {
		super(), this.baseUrl = "", this.caseId = "", this.canDelete = !1, this.layout = "grid", this.flat = !1, this.links = {};
	}
	static {
		this.styles = [V, o`
    :host { display: grid; gap: 12px; }
    h3 { margin: 0 0 6px; font-size: 12px; font-weight: 600; color: var(--_muted); text-transform: uppercase;
      letter-spacing: .04em; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); gap: 8px; }
    .list { display: grid; gap: 4px; }
    .file { position: relative; border: 1px solid var(--_border); border-radius: var(--_radius); background: var(--_bg);
      overflow: hidden; }
    .open { display: block; width: 100%; padding: 0; border: 0; background: none; font: inherit; color: inherit;
      text-align: left; cursor: pointer; }
    .open:focus-visible { outline: 2px solid var(--_accent); outline-offset: -2px; }
    .open > span { display: block; }
    .grid .thumb { aspect-ratio: 4 / 3; display: grid; place-items: center; background: var(--_surface); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .badge { font-size: 12px; font-weight: 700; color: var(--_muted); border: 1px solid var(--_border);
      border-radius: 4px; padding: 2px 6px; background: var(--_bg); }
    .info { padding: 6px 8px; display: grid; gap: 2px; min-width: 0; }
    .name { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .meta { font-size: 11px; color: var(--_muted); }
    .list .file { display: flex; align-items: center; }
    .list .open { display: grid; grid-template-columns: 48px 1fr; align-items: center; flex: 1; min-width: 0; }
    .list .thumb { width: 48px; height: 48px; display: grid; place-items: center; background: var(--_surface); }
    .actions { display: flex; gap: 4px; padding: 0 8px 6px; }
    .list .actions { padding: 0 8px; }
    .actions button { font: inherit; font-size: 11px; padding: 2px 8px; border-radius: 5px; cursor: pointer;
      border: 1px solid var(--_border); background: var(--_bg); color: var(--_fg); }
    .actions button.danger { color: var(--_error); }
    .empty, .error { font-size: 13px; color: var(--_muted); }
    .error { color: var(--_error); }
  `];
	}
	connectedCallback() {
		super.connectedCallback(), this.start();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.unsubscribe?.(), this.unsubscribe = void 0;
	}
	updated(e) {
		(e.has("baseUrl") || e.has("caseId")) && this.start();
	}
	start() {
		this.unsubscribe?.(), this.unsubscribe = void 0, this.baseUrl && this.caseId && this.isConnected && (this.unsubscribe = X(this.baseUrl, this.auth).subscribe((e) => {
			(e.type === "reconnected" || Ge(e) === this.caseId) && this.reload();
		}), this.reload());
	}
	async reload() {
		try {
			let e = new Y(this.baseUrl, this.auth), t = await e.getCase(this.caseId), n = {};
			await Promise.all((t.files ?? []).filter((e) => e.mimeType.startsWith("image/")).map(async (r) => {
				n[r.id] = await e.link(t.id, r.id).catch(() => "");
			})), this.case = t, this.links = n, this.error = void 0;
		} catch (e) {
			this.error = e.message;
		}
	}
	open(e) {
		let t = new CustomEvent("commons-file-open", {
			detail: { attachment: e },
			bubbles: !0,
			composed: !0,
			cancelable: !0
		});
		this.dispatchEvent(t) && this.renderRoot.querySelector("commons-file-preview")?.show(e);
	}
	async download(e) {
		try {
			qe(await new Y(this.baseUrl, this.auth).download(e.caseId, e.id), e.fileName), this.dispatchEvent(new CustomEvent("commons-file-downloaded", {
				detail: { attachment: e },
				bubbles: !0,
				composed: !0
			}));
		} catch (e) {
			this.error = e.message;
		}
	}
	async removeFile(e) {
		if (confirm(`Delete ${e.fileName}?`)) try {
			await new Y(this.baseUrl, this.auth).deleteFile(e.caseId, e.id), this.dispatchEvent(new CustomEvent("commons-file-deleted", {
				detail: { attachment: e },
				bubbles: !0,
				composed: !0
			})), await this.reload();
		} catch (e) {
			this.error = e.message;
		}
	}
	deletable(e) {
		return this.canDelete || this.case?.status === "OPEN" && !!this.me && e.uploadedBy === this.me;
	}
	tile(e) {
		let t = (e) => (t) => {
			t.stopPropagation(), e();
		};
		return E`<div class="file" part="file">
      <button class="open" aria-label="Preview ${e.fileName}" @click=${() => this.open(e)}>
        <span class="thumb">${this.links[e.id] ? E`<img src=${this.links[e.id]} alt="" loading="lazy">` : E`<span class="badge">${Ke(e)}</span>`}</span>
        <span class="info">
          <span class="name" title=${e.fileName}>${e.fileName}</span>
          <span class="meta">${Q(e.sizeBytes)} · ${e.uploadedBy} ·
            <span title=${e.uploadedAt}>${H(e.uploadedAt)}</span></span>
        </span>
      </button>
      <div class="actions">
        <button @click=${t(() => void this.download(e))} aria-label="Download ${e.fileName}">Download</button>
        ${this.deletable(e) ? E`<button class="danger" @click=${t(() => void this.removeFile(e))}
            aria-label="Delete ${e.fileName}">Delete</button>` : O}
      </div>
    </div>`;
	}
	render() {
		let e = this.case, t = E`<commons-file-preview .baseUrl=${this.baseUrl} .auth=${this.auth}></commons-file-preview>`;
		if (!e) return this.error ? E`<div class="error" role="alert">${this.error}</div>` : E`<div class="empty">Loading…</div>`;
		let n = e.files ?? [];
		return n.length ? E`
      ${(this.flat ? [{
			label: "",
			files: n
		}] : e.slots.map((e) => ({
			label: e.label,
			files: n.filter((t) => t.slot === e.name)
		})).filter((e) => e.files.length)).map((e) => E`<section part="group">
        ${e.label ? E`<h3>${e.label}</h3>` : O}
        <div class=${this.layout === "list" ? "list" : "grid"}>${e.files.map((e) => this.tile(e))}</div>
      </section>`)}
      ${this.error ? E`<div class="error" role="alert">${this.error}</div>` : O}
      ${t}` : E`<div class="empty" part="empty"><slot name="empty">No files yet.</slot></div>${t}`;
	}
};
customElements.get("commons-file-viewer") || customElements.define("commons-file-viewer", Qe);
//#endregion
//#region src/hub.ts
var $e = {
	inbox: "Notifications",
	chats: "Chats",
	files: "Files"
}, $ = class extends F {
	static {
		this.properties = {
			notificationsUrl: {
				type: String,
				attribute: "notifications-url"
			},
			chatUrl: {
				type: String,
				attribute: "chat-url"
			},
			attachmentsUrl: {
				type: String,
				attribute: "attachments-url"
			},
			me: { type: String },
			panes: { type: String },
			pane: {
				type: String,
				reflect: !0
			},
			selectedId: {
				type: String,
				attribute: "selected-id",
				reflect: !0
			},
			routing: { type: String },
			admin: { type: Boolean },
			labels: { attribute: !1 },
			auth: { attribute: !1 },
			badges: {
				state: !0,
				attribute: !1
			},
			custom: {
				state: !0,
				attribute: !1
			},
			selectedCase: {
				state: !0,
				attribute: !1
			},
			caseError: {
				state: !0,
				attribute: !1
			}
		};
	}
	constructor() {
		super(), this.stops = [], this.timers = {}, this.onHash = () => this.readHash(), this.panes = "inbox chats files", this.routing = "none", this.admin = !1, this.labels = {}, this.badges = {}, this.custom = [];
	}
	static {
		this.styles = [V, o`
    :host { display: block; height: 100%; min-height: 360px; container-type: inline-size; background: var(--_surface); }
    .hub { display: grid; grid-template-columns: 200px 1fr; height: 100%; }
    nav { display: flex; flex-direction: column; gap: 2px; padding: 10px 8px; background: var(--_bg);
      border-right: 1px solid var(--_border); }
    .items { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    nav button { display: flex; align-items: center; gap: 8px; width: 100%; font: inherit; font-size: 14px;
      text-align: left; padding: 8px 10px; border: none; border-radius: 6px; background: none; color: var(--_fg);
      cursor: pointer; }
    nav button:hover { background: var(--_surface); }
    nav button[aria-current="page"] { background: var(--_accent-soft); color: var(--_accent); font-weight: 600; }
    nav button:focus-visible { outline: 2px solid var(--_accent); }
    .label { flex: 1; }
    .badge { min-width: 18px; padding: 0 6px; border-radius: 9px; background: var(--_accent); color: #fff;
      font-size: 11px; line-height: 18px; text-align: center; }
    main { min-width: 0; min-height: 0; overflow: auto; padding: 12px; }
    .split { display: grid; grid-template-columns: minmax(220px, 320px) 1fr; gap: 12px; height: 100%; min-height: 0; }
    .col { min-width: 0; min-height: 0; overflow: auto; background: var(--_bg); border: 1px solid var(--_border);
      border-radius: var(--_radius); }
    .list { padding: 6px; }
    .detail { display: flex; flex-direction: column; }
    .detail > * { flex: 1; min-height: 0; }
    .files { padding: 12px; display: grid; gap: 12px; align-content: start; }
    .files h2 { margin: 0; font-size: 16px; }
    .empty { display: grid; place-items: center; color: var(--_muted); font-size: 14px; padding: 24px; }
    .back { display: none; flex: none; align-self: start; font: inherit; font-size: 13px; margin: 8px 8px 0; padding: 4px 10px; cursor: pointer;
      border: 1px solid var(--_border); border-radius: 6px; background: var(--_bg); color: var(--_fg); }
    commons-conversation { height: 100%; }
    @container (max-width: 720px) {
      .hub { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
      nav { flex-direction: row; align-items: center; border-right: none; border-bottom: 1px solid var(--_border);
        overflow-x: auto; }
      .items { flex-direction: row; }
      nav button { width: auto; white-space: nowrap; }
      .split { grid-template-columns: 1fr; }
      .split.selected .list-col { display: none; }
      .split:not(.selected) .detail { display: none; }
      .back { display: inline-block; }
    }
  `];
	}
	connectedCallback() {
		super.connectedCallback(), this.scanPanes(), this.observer = new MutationObserver(() => this.scanPanes()), this.observer.observe(this, {
			childList: !0,
			subtree: !0,
			attributes: !0,
			attributeFilter: ["pane", "label"]
		}), this.routing === "hash" && (addEventListener("hashchange", this.onHash), this.readHash()), this.watchBadges();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.observer?.disconnect(), removeEventListener("hashchange", this.onHash), this.stops.forEach((e) => e()), this.stops = [];
	}
	updated(e) {
		[
			"notificationsUrl",
			"chatUrl",
			"attachmentsUrl",
			"me",
			"auth"
		].some((t) => e.has(t)) && this.isConnected && this.watchBadges(), e.has("routing") && e.get("routing") !== void 0 && (removeEventListener("hashchange", this.onHash), this.routing === "hash" && (addEventListener("hashchange", this.onHash), this.readHash())), (e.has("selectedId") || e.has("pane") || e.has("attachmentsUrl")) && this.loadSelectedCase();
	}
	get available() {
		let e = {
			inbox: this.notificationsUrl,
			chats: this.chatUrl,
			files: this.attachmentsUrl
		};
		return [...this.panes.split(/[\s,]+/).filter((t) => t in e && !!e[t]), ...this.custom.map((e) => e.name)];
	}
	show(e, t) {
		this.go({
			pane: e,
			id: t
		});
	}
	go(e, t = !1) {
		let n = new CustomEvent("commons-hub-navigate", {
			detail: e,
			bubbles: !0,
			composed: !0,
			cancelable: !0
		});
		if (!this.dispatchEvent(n)) {
			t && this.pane && history.replaceState(null, "", `#${this.pane}${this.selectedId ? "/" + encodeURIComponent(this.selectedId) : ""}`);
			return;
		}
		if (this.pane = e.pane, this.selectedId = e.id, this.routing === "hash" && !t) {
			let t = `#${e.pane}${e.id ? "/" + encodeURIComponent(e.id) : ""}`;
			globalThis.location.hash !== t && history.pushState(null, "", t);
		}
	}
	readHash() {
		let [e, t] = globalThis.location.hash.replace(/^#\/?/, "").split("/");
		e && this.go({
			pane: e,
			id: t ? decodeURIComponent(t) : void 0
		}, !0);
	}
	scanPanes() {
		let e = [...this.querySelectorAll(":scope > [pane]")];
		for (let t of e) t.slot = `pane-${t.getAttribute("pane")}`;
		this.custom = e.map((e) => ({
			name: e.getAttribute("pane"),
			label: e.getAttribute("label") ?? e.getAttribute("pane")
		}));
	}
	watchBadges() {
		this.stops.forEach((e) => e()), this.stops = [];
		let e = (e, t) => {
			clearTimeout(this.timers[e]), this.timers[e] = setTimeout(() => void t().catch(() => void 0), 300);
		};
		if (this.notificationsUrl) {
			let t = this.notificationsUrl, n = async () => this.badge("inbox", (await new U(t, this.auth).unreadCount()).total);
			this.stops.push(W(t, this.auth).subscribe(() => e("inbox", n))), e("inbox", n);
		}
		if (this.chatUrl) {
			let t = this.chatUrl, n = async () => this.badge("chats", (await new K(t, this.auth).listConversations({
				status: "OPEN",
				limit: 50
			})).items.reduce((e, t) => e + (t.unread ?? 0), 0));
			this.stops.push(q(t, this.auth).subscribe((t) => {
				t.type !== "delta" && t.type !== "typing" && e("chats", n);
			})), e("chats", n);
		}
		if (this.attachmentsUrl) {
			let t = this.attachmentsUrl, n = async () => this.badge("files", (await new Y(t, this.auth).listCases({
				status: "OPEN",
				limit: 50
			})).items.filter((e) => (!this.me || e.subjects.includes(this.me)) && e.slots.some((e) => !e.satisfied)).length);
			this.stops.push(X(t, this.auth).subscribe((t) => {
				e("files", n), t.type === "case" && t.case.id === this.selectedId && this.loadSelectedCase(!0);
			})), e("files", n);
		}
	}
	badge(e, t) {
		this.badges = {
			...this.badges,
			[e]: t
		};
	}
	async route(e) {
		let t = e.detail.notification, n = t.correlationId;
		if (n) {
			if (this.chatUrl) {
				let { items: e } = await new K(this.chatUrl, this.auth).listConversations({
					correlationId: n,
					limit: 1
				}).catch(() => ({ items: [] }));
				if (e[0]) {
					this.go({
						pane: "chats",
						id: e[0].id,
						notification: t
					});
					return;
				}
			}
			if (this.attachmentsUrl) {
				let e = new Y(this.attachmentsUrl, this.auth), { items: r } = await (this.admin ? e.listAllCases({
					correlationId: n,
					limit: 1
				}) : e.listCases({
					correlationId: n,
					limit: 1
				})).catch(() => ({ items: [] }));
				r[0] && this.go({
					pane: "files",
					id: r[0].id,
					notification: t
				});
			}
		}
	}
	async loadSelectedCase(e = !1) {
		if (this.current() !== "files" || !this.selectedId || !this.attachmentsUrl) {
			this.selectedCase = void 0, this.caseError = void 0;
			return;
		}
		if (!e && this.selectedCase?.id === this.selectedId) return;
		let t = this.selectedId;
		try {
			let e = await new Y(this.attachmentsUrl, this.auth).getCase(t);
			this.selectedId === t && (this.selectedCase = e, this.caseError = void 0);
		} catch (e) {
			this.selectedId === t && (this.selectedCase = void 0, this.caseError = e.message);
		}
	}
	current() {
		let e = this.available;
		return this.pane && e.includes(this.pane) ? this.pane : e[0];
	}
	label(e) {
		return this.labels[e] ?? $e[e] ?? this.custom.find((t) => t.name === e)?.label ?? e;
	}
	back(e) {
		return E`<button class="back" @click=${() => this.go({ pane: e })}>← All ${this.label(e).toLowerCase()}</button>`;
	}
	renderPane(e) {
		switch (e) {
			case "inbox": return E`<commons-inbox base-url=${this.notificationsUrl} .auth=${this.auth} show-filters
            @commons-notification-click=${(e) => void this.route(e)}></commons-inbox>`;
			case "chats": return E`<div class="split ${this.selectedId ? "selected" : ""}">
          <div class="col list list-col" part="list">
            <commons-conversation-list base-url=${this.chatUrl} .me=${this.me} .auth=${this.auth} searchable
                .selected=${this.selectedId}
                @commons-conversation-select=${(t) => this.go({
				pane: e,
				id: t.detail.conversation.id
			})}>
            </commons-conversation-list>
          </div>
          <div class="col detail" part="detail">
            ${this.selectedId ? E`${this.back(e)}<commons-conversation base-url=${this.chatUrl}
                attachments-url=${this.attachmentsUrl ?? ""} conversation-id=${this.selectedId} .me=${this.me}
                .auth=${this.auth}></commons-conversation>` : E`<div class="empty">Choose a conversation.</div>`}
          </div>
        </div>`;
			case "files": return E`<div class="split ${this.selectedId ? "selected" : ""}">
          <div class="col list list-col" part="list">
            <commons-case-list base-url=${this.attachmentsUrl} .me=${this.me} .auth=${this.auth} ?admin=${this.admin}
                .selected=${this.selectedId}
                @commons-case-select=${(t) => {
				this.selectedCase = t.detail.case, this.caseError = void 0, this.go({
					pane: e,
					id: t.detail.case.id
				});
			}}>
            </commons-case-list>
          </div>
          <div class="col detail files" part="detail">${this.renderCase()}</div>
        </div>`;
			default: return E`<slot name="pane-${e}"></slot>`;
		}
	}
	renderCase() {
		let e = this.selectedCase;
		if (!this.selectedId) return E`<div class="empty">Choose a case.</div>`;
		if (!e) return E`${this.back("files")}<div class="empty" role=${this.caseError ? "alert" : "status"}>
        ${this.caseError ? `This case can't be shown: ${this.caseError}` : "Loading…"}</div>`;
		let t = e.status === "OPEN" && (!this.me || e.subjects.includes(this.me));
		return E`${this.back("files")}
      ${t ? E`<commons-upload-case base-url=${this.attachmentsUrl} case-id=${e.id} .me=${this.me} .auth=${this.auth}>
        </commons-upload-case>` : E`<h2>${e.title}</h2><commons-file-viewer base-url=${this.attachmentsUrl} case-id=${e.id} .me=${this.me}
          ?can-delete=${this.admin} .auth=${this.auth}></commons-file-viewer>`}`;
	}
	render() {
		let e = this.current();
		return E`<div class="hub">
      <nav part="nav" aria-label="Sections">
        <slot name="brand"></slot>
        <div class="items">
          ${this.available.map((t) => E`<button part="nav-item" aria-current=${e === t ? "page" : "false"}
              @click=${() => this.go({ pane: t })}>
            <span class="label">${this.label(t)}</span>
            ${this.badges[t] ? E`<span class="badge" part="badge" aria-label="${this.badges[t]} unread">
              ${this.badges[t]}</span>` : O}
          </button>`)}
        </div>
        <slot name="nav-end"></slot>
      </nav>
      <main part="pane" aria-label=${e ? this.label(e) : "Empty"}>
        ${e ? this.renderPane(e) : E`<div class="empty">Set notifications-url, chat-url or attachments-url.</div>`}
      </main>
    </div>`;
	}
};
customElements.get("commons-hub") || customElements.define("commons-hub", $);
//#endregion
export { $ as CommonsHub, Ae as bearer, Pe as configureAuth, je as devUser };

//# sourceMappingURL=hub-ui.bundle.js.map