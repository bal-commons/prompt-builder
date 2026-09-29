/*! @bal-commons/workflow-ui 0.1.0 | Apache-2.0 | Bundles Lit (BSD-3-Clause, Copyright (c) 2017 Google LLC) and @bal-commons/ui-core (Apache-2.0); see THIRD_PARTY_NOTICES.md */
//#region ../service-commons/ui/node_modules/@lit/reactive-element/css-tag.js
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
})(e) : e, { is: l, defineProperty: u, getOwnPropertyDescriptor: d, getOwnPropertyNames: f, getOwnPropertySymbols: ee, getPrototypeOf: te } = Object, p = globalThis, ne = p.trustedTypes, re = ne ? ne.emptyScript : "", ie = p.reactiveElementPolyfillSupport, m = (e, t) => e, ae = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? re : null;
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
	converter: ae,
	reflect: !1,
	useDefault: !1,
	hasChanged: oe
};
Symbol.metadata ??= Symbol("metadata"), p.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
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
		if (this.hasOwnProperty(m("elementProperties"))) return;
		let e = te(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(m("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(m("properties"))) {
			let e = this.properties, t = [...f(e), ...ee(e)];
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
			let i = (n.converter?.toAttribute === void 0 ? ae : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? ae : e.converter;
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
h.elementStyles = [], h.shadowRootOptions = { mode: "open" }, h[m("elementProperties")] = /* @__PURE__ */ new Map(), h[m("finalized")] = /* @__PURE__ */ new Map(), ie?.({ ReactiveElement: h }), (p.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region ../service-commons/ui/node_modules/lit-html/lit-html.js
var ce = globalThis, le = (e) => e, g = ce.trustedTypes, ue = g ? g.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, de = "$lit$", _ = `lit$${Math.random().toFixed(9).slice(2)}$`, fe = "?" + _, pe = `<${fe}>`, v = document, y = () => v.createComment(""), b = (e) => e === null || typeof e != "object" && typeof e != "function", me = Array.isArray, he = (e) => me(e) || typeof e?.[Symbol.iterator] == "function", ge = "[ 	\n\f\r]", x = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, _e = /-->/g, ve = />/g, S = RegExp(`>|${ge}(?:([^\\s"'>=/]+)(${ge}*=${ge}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), ye = /'/g, be = /"/g, xe = /^(?:script|style|textarea|title)$/i, C = Symbol.for("lit-noChange"), w = Symbol.for("lit-nothing"), Se = /* @__PURE__ */ new WeakMap(), T = v.createTreeWalker(v, 129);
function Ce(e, t) {
	if (!me(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return ue === void 0 ? t : ue.createHTML(t);
}
var we = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = x;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === x ? c[1] === "!--" ? o = _e : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = S) : (xe.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = S) : o = ve : o === S ? c[0] === ">" ? (o = i ?? x, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? S : c[3] === "\"" ? be : ye) : o === be || o === ye ? o = S : o === _e || o === ve ? o = x : (o = S, i = void 0);
		let d = o === S && e[t + 1].startsWith("/>") ? " " : "";
		a += o === x ? n + pe : l >= 0 ? (r.push(s), n.slice(0, l) + de + n.slice(l) + _ + d) : n + _ + (l === -2 ? t : d);
	}
	return [Ce(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, Te = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = we(t, n);
		if (this.el = e.createElement(l, r), T.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = T.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(de)) {
					let t = u[o++], n = i.getAttribute(e).split(_), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Oe : r[1] === "?" ? ke : r[1] === "@" ? Ae : D
					}), i.removeAttribute(e);
				} else e.startsWith(_) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (xe.test(i.tagName)) {
					let e = i.textContent.split(_), t = e.length - 1;
					if (t > 0) {
						i.textContent = g ? g.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], y()), T.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], y());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === fe) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(_, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += _.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = v.createElement("template");
		return n.innerHTML = e, n;
	}
};
function E(e, t, n = e, r) {
	if (t === C) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = b(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = E(e, i._$AS(e, t.values), i, r)), t;
}
var Ee = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? v).importNode(t, !0);
		T.currentNode = r;
		let i = T.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new De(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new je(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = T.nextNode(), a++);
		}
		return T.currentNode = v, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, De = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = w, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = E(this, e, t), b(e) ? e === w || e == null || e === "" ? (this._$AH !== w && this._$AR(), this._$AH = w) : e !== this._$AH && e !== C && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? he(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== w && b(this._$AH) ? this._$AA.nextSibling.data = e : this.T(v.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = Te.createElement(Ce(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new Ee(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = Se.get(e.strings);
		return t === void 0 && Se.set(e.strings, t = new Te(e)), t;
	}
	k(t) {
		me(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(y()), this.O(y()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = le(e).nextSibling;
			le(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, D = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = w, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = w;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = E(this, e, t, 0), a = !b(e) || e !== this._$AH && e !== C, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = E(this, r[n + o], t, o), s === C && (s = this._$AH[o]), a ||= !b(s) || s !== this._$AH[o], s === w ? e = w : e !== w && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === w ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Oe = class extends D {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === w ? void 0 : e;
	}
}, ke = class extends D {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== w);
	}
}, Ae = class extends D {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = E(this, e, t, 0) ?? w) === C) return;
		let n = this._$AH, r = e === w && n !== w || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== w && (n === w || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, je = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		E(this, e);
	}
}, Me = ce.litHtmlPolyfillSupport;
Me?.(Te, De), (ce.litHtmlVersions ??= []).push("3.3.3");
var Ne = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new De(t.insertBefore(y(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, Pe = globalThis, O = class extends h {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Ne(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return C;
	}
};
O._$litElement$ = !0, O.finalized = !0, Pe.litElementHydrateSupport?.({ LitElement: O });
var Fe = Pe.litElementPolyfillSupport;
Fe?.({ LitElement: O }), (Pe.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region ../service-commons/ui/dist/index.js
function Ie(e, t) {
	return {
		async headers() {
			let t = await e();
			return t ? { Authorization: `Bearer ${t}` } : {};
		},
		onUnauthorized: t
	};
}
function Le(e, t = [], n = []) {
	return { headers: () => ({
		"x-user-id": e,
		"x-user-roles": t.join(","),
		...n.length ? { "x-user-scopes": n.join(" ") } : {}
	}) };
}
var Re = { headers: () => ({}) }, ze = globalThis;
function Be(e) {
	ze.__balCommonsAuth = e;
}
function Ve() {
	return ze.__balCommonsAuth ?? Re;
}
var He = class extends Error {
	constructor(e, t, n) {
		super(n), this.status = e, this.code = t, this.name = "ServiceError";
	}
};
async function k(e, t, n = {}) {
	let r = n.auth ?? Ve(), i = { ...await r.headers() }, a;
	n.body !== void 0 && (i["content-type"] = "application/json", a = JSON.stringify(n.body));
	let o = await fetch(Ue(e, t, n.query), {
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
		throw new He(o.status, e, t);
	}
	return o.status === 204 ? void 0 : await o.json();
}
function Ue(e, t, n) {
	let r = e.replace(/\/+$/, "") + (t.startsWith("/") ? t : "/" + t), i = Object.entries(n ?? {}).filter(([, e]) => e != null && e !== "");
	return i.length ? `${r}?${new URLSearchParams(i.map(([e, t]) => [e, String(t)]))}` : r;
}
var A = o`
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
function We(e, t = Date.now()) {
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
//#region node_modules/@lit/reactive-element/css-tag.js
var j = globalThis, Ge = j.ShadowRoot && (j.ShadyCSS === void 0 || j.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, Ke = Symbol(), qe = /* @__PURE__ */ new WeakMap(), Je = class {
	constructor(e, t, n) {
		if (this._$cssResult$ = !0, n !== Ke) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, t = this.t;
		if (Ge && e === void 0) {
			let n = t !== void 0 && t.length === 1;
			n && (e = qe.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), n && qe.set(t, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, Ye = (e) => new Je(typeof e == "string" ? e : e + "", void 0, Ke), M = (e, ...t) => new Je(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, Ke), Xe = (e, t) => {
	if (Ge) e.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let n of t) {
		let t = document.createElement("style"), r = j.litNonce;
		r !== void 0 && t.setAttribute("nonce", r), t.textContent = n.cssText, e.appendChild(t);
	}
}, Ze = Ge ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return Ye(t);
})(e) : e, { is: Qe, defineProperty: $e, getOwnPropertyDescriptor: et, getOwnPropertyNames: tt, getOwnPropertySymbols: nt, getPrototypeOf: rt } = Object, N = globalThis, it = N.trustedTypes, at = it ? it.emptyScript : "", ot = N.reactiveElementPolyfillSupport, P = (e, t) => e, st = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? at : null;
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
}, ct = (e, t) => !Qe(e, t), lt = {
	attribute: !0,
	type: String,
	converter: st,
	reflect: !1,
	useDefault: !1,
	hasChanged: ct
};
Symbol.metadata ??= Symbol("metadata"), N.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var F = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = lt) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && $e(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = et(this.prototype, e) ?? {
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
		return this.elementProperties.get(e) ?? lt;
	}
	static _$Ei() {
		if (this.hasOwnProperty(P("elementProperties"))) return;
		let e = rt(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(P("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(P("properties"))) {
			let e = this.properties, t = [...tt(e), ...nt(e)];
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
			for (let e of n) t.unshift(Ze(e));
		} else e !== void 0 && t.push(Ze(e));
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
		return Xe(e, this.constructor.elementStyles), e;
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
			let i = (n.converter?.toAttribute === void 0 ? st : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? st : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? ct)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
F.elementStyles = [], F.shadowRootOptions = { mode: "open" }, F[P("elementProperties")] = /* @__PURE__ */ new Map(), F[P("finalized")] = /* @__PURE__ */ new Map(), ot?.({ ReactiveElement: F }), (N.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var ut = globalThis, dt = (e) => e, I = ut.trustedTypes, ft = I ? I.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, pt = "$lit$", L = `lit$${Math.random().toFixed(9).slice(2)}$`, mt = "?" + L, ht = `<${mt}>`, R = document, z = () => R.createComment(""), B = (e) => e === null || typeof e != "object" && typeof e != "function", gt = Array.isArray, _t = (e) => gt(e) || typeof e?.[Symbol.iterator] == "function", vt = "[ 	\n\f\r]", V = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, yt = /-->/g, bt = />/g, H = RegExp(`>|${vt}(?:([^\\s"'>=/]+)(${vt}*=${vt}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), xt = /'/g, St = /"/g, Ct = /^(?:script|style|textarea|title)$/i, U = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), W = Symbol.for("lit-noChange"), G = Symbol.for("lit-nothing"), wt = /* @__PURE__ */ new WeakMap(), K = R.createTreeWalker(R, 129);
function Tt(e, t) {
	if (!gt(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return ft === void 0 ? t : ft.createHTML(t);
}
var Et = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = V;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === V ? c[1] === "!--" ? o = yt : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = H) : (Ct.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = H) : o = bt : o === H ? c[0] === ">" ? (o = i ?? V, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? H : c[3] === "\"" ? St : xt) : o === St || o === xt ? o = H : o === yt || o === bt ? o = V : (o = H, i = void 0);
		let d = o === H && e[t + 1].startsWith("/>") ? " " : "";
		a += o === V ? n + ht : l >= 0 ? (r.push(s), n.slice(0, l) + pt + n.slice(l) + L + d) : n + L + (l === -2 ? t : d);
	}
	return [Tt(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, Dt = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = Et(t, n);
		if (this.el = e.createElement(l, r), K.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = K.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(pt)) {
					let t = u[o++], n = i.getAttribute(e).split(L), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? kt : r[1] === "?" ? At : r[1] === "@" ? jt : Y
					}), i.removeAttribute(e);
				} else e.startsWith(L) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (Ct.test(i.tagName)) {
					let e = i.textContent.split(L), t = e.length - 1;
					if (t > 0) {
						i.textContent = I ? I.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], z()), K.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], z());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === mt) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(L, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += L.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = R.createElement("template");
		return n.innerHTML = e, n;
	}
};
function q(e, t, n = e, r) {
	if (t === W) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = B(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = q(e, i._$AS(e, t.values), i, r)), t;
}
var Ot = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? R).importNode(t, !0);
		K.currentNode = r;
		let i = K.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new J(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Mt(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = K.nextNode(), a++);
		}
		return K.currentNode = R, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, J = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = G, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = q(this, e, t), B(e) ? e === G || e == null || e === "" ? (this._$AH !== G && this._$AR(), this._$AH = G) : e !== this._$AH && e !== W && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? _t(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== G && B(this._$AH) ? this._$AA.nextSibling.data = e : this.T(R.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = Dt.createElement(Tt(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new Ot(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = wt.get(e.strings);
		return t === void 0 && wt.set(e.strings, t = new Dt(e)), t;
	}
	k(t) {
		gt(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(z()), this.O(z()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = dt(e).nextSibling;
			dt(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, Y = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = G, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = G;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = q(this, e, t, 0), a = !B(e) || e !== this._$AH && e !== W, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = q(this, r[n + o], t, o), s === W && (s = this._$AH[o]), a ||= !B(s) || s !== this._$AH[o], s === G ? e = G : e !== G && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === G ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, kt = class extends Y {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === G ? void 0 : e;
	}
}, At = class extends Y {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== G);
	}
}, jt = class extends Y {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = q(this, e, t, 0) ?? G) === W) return;
		let n = this._$AH, r = e === G && n !== G || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== G && (n === G || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Mt = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		q(this, e);
	}
}, Nt = {
	M: pt,
	P: L,
	A: mt,
	C: 1,
	L: Et,
	R: Ot,
	D: _t,
	V: q,
	I: J,
	H: Y,
	N: At,
	U: jt,
	B: kt,
	F: Mt
}, Pt = ut.litHtmlPolyfillSupport;
Pt?.(Dt, J), (ut.litHtmlVersions ??= []).push("3.3.3");
var Ft = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new J(t.insertBefore(z(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, It = globalThis, X = class extends F {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Ft(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return W;
	}
};
X._$litElement$ = !0, X.finalized = !0, It.litElementHydrateSupport?.({ LitElement: X });
var Lt = It.litElementPolyfillSupport;
Lt?.({ LitElement: X }), (It.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region src/schema-form.ts
var Rt = class extends X {
	static {
		this.properties = {
			schema: { attribute: !1 },
			value: { attribute: !1 },
			readonly: {
				type: Boolean,
				reflect: !0
			},
			submitLabel: {
				type: String,
				attribute: "submit-label"
			},
			hideSubmit: {
				type: Boolean,
				attribute: "hide-submit"
			},
			busy: { type: Boolean },
			errors: {
				state: !0,
				attribute: !1
			}
		};
	}
	constructor() {
		super(), this.readonly = !1, this.submitLabel = "Submit", this.hideSubmit = !1, this.busy = !1, this.errors = {};
	}
	static {
		this.styles = [A, M`
    :host { display: block; }
    form { display: grid; gap: 12px; }
    fieldset { border: 1px solid var(--_border); border-radius: var(--_radius); padding: 10px; margin: 0; display: grid; gap: 10px; }
    legend { font-size: 12px; font-weight: 600; color: var(--_muted); padding: 0 4px; }
    .field { display: grid; gap: 4px; }
    .label { font-size: 13px; font-weight: 600; }
    .label .optional { font-weight: 400; color: var(--_muted); font-size: 12px; }
    .hint { font-size: 12px; color: var(--_muted); }
    .error { font-size: 12px; color: var(--_error); }
    input:not([type=checkbox]), select, textarea { font: inherit; font-size: 14px; padding: 6px 8px; width: 100%;
      box-sizing: border-box; border: 1px solid var(--_border); border-radius: 6px; background: var(--_bg); color: var(--_fg); }
    input:focus-visible, select:focus-visible, textarea:focus-visible, button:focus-visible {
      outline: 2px solid var(--_accent); outline-offset: 1px; }
    [aria-invalid="true"] { border-color: var(--_error) !important; }
    textarea { min-height: 72px; resize: vertical; }
    .check { display: flex; gap: 8px; align-items: center; font-size: 14px; }
    .choices { display: flex; flex-wrap: wrap; gap: 6px 14px; }
    .readonly { font-size: 14px; padding: 2px 0; white-space: pre-wrap; word-break: break-word; }
    .empty { color: var(--_muted); }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    button[type=submit] { font: inherit; padding: 7px 14px; border-radius: 6px; border: 1px solid var(--_accent);
      background: var(--_accent); color: #fff; cursor: pointer; }
    button:disabled { opacity: .5; cursor: default; }
  `];
	}
	parsed() {
		if (typeof this.schema == "string") try {
			return JSON.parse(this.schema);
		} catch {
			return {
				type: "object",
				properties: {}
			};
		}
		return this.schema ?? {
			type: "object",
			properties: {}
		};
	}
	collect() {
		let e = {}, t = this.read(this.parsed(), "", e);
		if (this.errors = e, Object.keys(e).length) {
			this.updateComplete.then(() => this.renderRoot.querySelector("[aria-invalid=true]")?.focus());
			return;
		}
		return t;
	}
	read(e, t, n) {
		let r = {};
		for (let [i, a] of Object.entries(e.properties ?? {})) {
			let o = t + i, s = (e.required ?? []).includes(i), c = zt(a);
			if (c === "object") {
				r[i] = this.read(a, o + ".", n);
				continue;
			}
			let l = [...this.renderRoot.querySelectorAll(`[data-path="${Ht(o)}"]`)], u;
			if (c === "boolean") u = l[0]?.checked ?? !1;
			else if (c === "array") u = a.items?.enum ? l.filter((e) => e.checked).map((e) => e.value) : (l[0]?.value ?? "").split(",").map((e) => e.trim()).filter(Boolean), s && !u.length && (n[o] = "Choose at least one.");
			else {
				let e = (l[0]?.value ?? "").trim();
				if (l[0]?.validity?.badInput) n[o] = c === "integer" ? "A whole number." : "A number.";
				else if (e === "") s && (n[o] = "Required."), u = Bt(a) || !s ? null : "";
				else if (c === "number" || c === "integer") {
					let t = Number(e);
					Number.isNaN(t) || c === "integer" && !Number.isInteger(t) ? n[o] = c === "integer" ? "A whole number." : "A number." : a.minimum !== void 0 && t < a.minimum ? n[o] = `At least ${a.minimum}.` : a.maximum !== void 0 && t > a.maximum && (n[o] = `At most ${a.maximum}.`), u = t;
				} else a.minLength !== void 0 && e.length < a.minLength && (n[o] = `At least ${a.minLength} characters.`), a.maxLength !== void 0 && e.length > a.maxLength && (n[o] = `At most ${a.maxLength} characters.`), u = e;
			}
			(u !== null || Bt(a)) && (r[i] = u);
		}
		return r;
	}
	submit(e) {
		e.preventDefault();
		let t = this.collect();
		t && this.dispatchEvent(new CustomEvent("workflow-form-submit", {
			detail: { values: t },
			bubbles: !0,
			composed: !0
		}));
	}
	field(e, t, n, r, i) {
		let a = i ?? t.default, o = zt(t), s = t.title ?? Z(e), c = this.errors[r], l = `f-${r.replace(/[^a-zA-Z0-9_-]/g, "_")}`, u = t.description ? U`<span class="hint" id="${l}-hint">${t.description}</span>` : G, d = [t.description ? `${l}-hint` : "", c ? `${l}-error` : ""].filter(Boolean).join(" ") || G, f = c ? U`<span class="error" id="${l}-error" role="alert">${c}</span>` : G;
		if (o === "object") return U`<fieldset part="field"><legend>${s}</legend>
        ${Object.entries(t.properties ?? {}).map(([e, n]) => this.field(e, n, (t.required ?? []).includes(e), `${r}.${e}`, a?.[e]))}</fieldset>`;
		if (this.readonly) return U`<div class="field" part="field"><span class="label">${s}</span><span class="readonly">${a == null || a === "" ? U`<span class="empty">—</span>` : typeof a == "boolean" ? a ? "Yes" : "No" : Array.isArray(a) ? a.join(", ") : String(a)}</span></div>`;
		let ee = n ? G : U` <span class="optional">(optional)</span>`;
		if (o === "boolean") return U`<div class="field" part="field"><label class="check"><input type="checkbox" id=${l} data-path=${r}
          .checked=${a === !0} ?disabled=${this.busy} aria-invalid=${c ? "true" : "false"}
          aria-describedby=${d}> ${s}</label>${u}${f}</div>`;
		if (o === "array" && t.items?.enum) {
			let e = Array.isArray(a) ? a.map(String) : [];
			return U`<fieldset part="field" aria-describedby=${d}><legend>${s}${ee}</legend><div class="choices">
        ${t.items.enum.map((t) => U`<label class="check"><input type="checkbox" data-path=${r} value=${String(t)}
            .checked=${e.includes(String(t))} ?disabled=${this.busy} aria-invalid=${c ? "true" : "false"}>
            ${String(t)}</label>`)}</div>${u}${f}</fieldset>`;
		}
		let te, p = c ? "true" : "false";
		return te = t.enum ? U`<select id=${l} data-path=${r} ?disabled=${this.busy} aria-invalid=${p} aria-describedby=${d}>
        ${n ? G : U`<option value="">—</option>`}
        ${n && a == null ? U`<option value="" disabled selected>Choose…</option>` : G}
        ${t.enum.filter((e) => e !== null).map((e) => U`<option value=${String(e)} ?selected=${String(e) === String(a ?? "")}>${String(e)}</option>`)}
      </select>` : o === "array" ? U`<input type="text" id=${l} data-path=${r} .value=${Array.isArray(a) ? a.join(", ") : ""}
        placeholder="Comma separated" ?disabled=${this.busy} aria-invalid=${p} aria-describedby=${d}>` : o === "string" && (t.format === "textarea" || (t.maxLength ?? 0) > 200 || /^(note|notes|comment|comments|description|details|reason|message|summary)$/i.test(e)) ? U`<textarea id=${l} data-path=${r} .value=${a == null ? "" : String(a)}
        ?disabled=${this.busy} aria-invalid=${p} aria-describedby=${d}></textarea>` : U`<input type=${o === "number" || o === "integer" ? "number" : Vt(e, t)} id=${l} data-path=${r} step=${o === "integer" ? "1" : o === "number" ? "any" : G}
        min=${t.minimum ?? G} max=${t.maximum ?? G}
        .value=${a == null ? "" : String(a)} ?disabled=${this.busy}
        aria-invalid=${p} aria-describedby=${d}>`, U`<div class="field" part="field"><label class="label" for=${l}>${s}${ee}</label>${te}${u}${f}</div>`;
	}
	render() {
		let e = this.parsed(), t = Object.entries(e.properties ?? {});
		return U`<form part="form" novalidate @submit=${this.submit}>
      ${t.length ? t.map(([t, n]) => this.field(t, n, (e.required ?? []).includes(t), t, this.value?.[t])) : U`<span class="hint">Nothing to fill in.</span>`}
      ${this.readonly ? G : U`<div class="actions">
        ${this.hideSubmit ? G : U`<button type="submit" part="submit" ?disabled=${this.busy}>${this.submitLabel}</button>`}
        <slot name="actions"></slot></div>`}
    </form>`;
	}
};
function zt(e) {
	let t = Array.isArray(e.type) ? e.type.filter((e) => e !== "null") : [e.type];
	return t[0] ? t[0] : e.properties ? "object" : (e.enum, "string");
}
function Bt(e) {
	return Array.isArray(e.type) ? e.type.includes("null") : e.enum?.includes(null) ?? !1;
}
function Vt(e, t) {
	switch (t.format) {
		case "date": return "date";
		case "date-time": return "datetime-local";
		case "email": return "email";
		case "uri":
		case "url": return "url";
		case "time": return "time";
	}
	return /(^date$|Date$|_date$|^dueOn$)/.test(e) ? "date" : /(^email$|Email$)/.test(e) ? "email" : /(^url$|Url$|^link$)/.test(e) ? "url" : "text";
}
function Z(e) {
	let t = (e.split(".").pop() ?? e).replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim().toLowerCase();
	return t ? t[0].toUpperCase() + t.slice(1) : e;
}
function Q(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) t[n] = typeof r == "number" ? { type: "number" } : typeof r == "boolean" ? { type: "boolean" } : Array.isArray(r) ? {
		type: "array",
		items: { type: "string" }
	} : r && typeof r == "object" ? Q(r) : { type: "string" }, r && typeof r == "object" && !Array.isArray(r) && (t[n].type = "object");
	return {
		type: "object",
		properties: t,
		required: Object.keys(e).filter((t) => e[t] !== null)
	};
}
function Ht(e) {
	return e.replace(/(["\\])/g, "\\$1");
}
customElements.get("workflow-schema-form") || customElements.define("workflow-schema-form", Rt);
//#endregion
//#region src/client.ts
var $ = class {
	constructor(e, t) {
		this.baseUrl = e, this.auth = t;
	}
	listHumanTasks(e = {}) {
		return k(this.baseUrl, "/human-tasks", {
			auth: this.auth,
			query: { ...e }
		});
	}
	getHumanTask(e) {
		return k(this.baseUrl, `/human-tasks/${encodeURIComponent(e)}`, { auth: this.auth });
	}
	completeHumanTask(e, t) {
		return k(this.baseUrl, `/human-tasks/${encodeURIComponent(e)}/complete`, {
			method: "POST",
			body: { result: t },
			auth: this.auth
		});
	}
	failHumanTask(e, t) {
		return k(this.baseUrl, `/human-tasks/${encodeURIComponent(e)}/fail`, {
			method: "POST",
			body: { reason: t },
			auth: this.auth
		});
	}
	pendingCount() {
		return k(this.baseUrl, "/human-tasks/pending-count", { auth: this.auth });
	}
	listReviews(e = {}) {
		return k(this.baseUrl, "/review-activities", {
			auth: this.auth,
			query: { ...e }
		});
	}
	getReview(e) {
		return k(this.baseUrl, `/review-activities/${encodeURIComponent(e)}`, { auth: this.auth });
	}
	proceed(e, t) {
		return t ? k(this.baseUrl, `/review-activities/${encodeURIComponent(e)}/proceed-with-input`, {
			method: "POST",
			body: { input: t },
			auth: this.auth
		}) : k(this.baseUrl, `/review-activities/${encodeURIComponent(e)}/proceed`, {
			method: "POST",
			auth: this.auth
		});
	}
	reject(e, t) {
		return k(this.baseUrl, `/review-activities/${encodeURIComponent(e)}/reject`, {
			method: "POST",
			body: { feedback: t },
			auth: this.auth
		});
	}
};
//#endregion
//#region src/types.ts
function Ut(e) {
	return e.trigger === "ON_FAILURE" || e.trigger === "FAILURE";
}
function Wt(e) {
	return e.kind === "REVIEW_ACTIVITY" || e.canComplete || e.canAdminister;
}
//#endregion
//#region src/task-inbox.ts
var Gt = class extends X {
	static {
		this.properties = {
			baseUrl: {
				type: String,
				attribute: "base-url"
			},
			auth: { attribute: !1 },
			kinds: { type: String },
			status: { type: String },
			all: { type: Boolean },
			pollSeconds: {
				type: Number,
				attribute: "poll-seconds"
			},
			instanceId: {
				type: String,
				attribute: "instance-id"
			},
			taskName: {
				type: String,
				attribute: "task-name"
			},
			selected: {
				type: String,
				reflect: !0
			},
			heading: { type: String },
			items: {
				state: !0,
				attribute: !1
			},
			loaded: {
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
		super(), this.onCompleted = () => void this.reload(), this.baseUrl = "", this.kinds = "human review", this.status = "PENDING", this.all = !1, this.pollSeconds = 15, this.heading = "My tasks", this.items = [], this.loaded = !1;
	}
	static {
		this.styles = [A, M`
    :host { display: block; }
    header { display: flex; gap: 8px; align-items: baseline; padding: 4px 2px 8px; }
    header strong { font-size: 14px; }
    .count { font-size: 12px; color: var(--_muted); }
    ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 4px; }
    li { padding: 8px 10px; border-radius: 6px; border: 1px solid transparent; cursor: pointer; }
    li:hover { background: var(--_surface); }
    li[aria-selected="true"] { border-color: var(--_accent); background: var(--_accent-soft); }
    li:focus-visible { outline: 2px solid var(--_accent); }
    .top { display: flex; gap: 6px; align-items: center; }
    .title { flex: 1; min-width: 0; font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .kind { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: var(--_surface); white-space: nowrap; }
    .kind.REVIEW_ACTIVITY { background: var(--_accent-soft); color: var(--_accent); }
    .kind.failure { background: none; color: var(--_error); border: 1px solid var(--_error); }
    .meta { font-size: 12px; color: var(--_muted); }
    .empty, .error { padding: 12px; font-size: 13px; color: var(--_muted); }
    .error { color: var(--_error); }
  `];
	}
	connectedCallback() {
		super.connectedCallback(), document.addEventListener("workflow-task-completed", this.onCompleted), this.schedule(), this.reload();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), document.removeEventListener("workflow-task-completed", this.onCompleted), clearInterval(this.timer);
	}
	updated(e) {
		e.has("pollSeconds") && this.schedule(), [
			"baseUrl",
			"kinds",
			"status",
			"all",
			"instanceId",
			"taskName"
		].some((t) => e.has(t) && e.get(t) !== void 0) && this.reload();
	}
	schedule() {
		clearInterval(this.timer), this.pollSeconds > 0 && this.isConnected && (this.timer = setInterval(() => document.visibilityState === "visible" && void this.reload(), this.pollSeconds * 1e3));
	}
	async reload() {
		if (this.baseUrl) try {
			let e = new $(this.baseUrl, this.auth), t = this.kinds.split(/[\s,]+/), n = {
				status: this.status || void 0,
				parentWorkflowId: this.instanceId || void 0,
				taskName: this.taskName || void 0,
				limit: 100
			}, [r, i] = await Promise.all([t.includes("human") ? e.listHumanTasks(n) : { items: [] }, t.includes("review") ? e.listReviews(n) : { items: [] }]);
			this.items = [...r.items, ...i.items].filter((e) => this.all || Wt(e)).sort((e, t) => t.startTime.localeCompare(e.startTime)), this.error = void 0, this.loaded = !0;
		} catch (e) {
			this.error = e.message;
		}
	}
	select(e) {
		this.selected = e.taskId, this.dispatchEvent(new CustomEvent("workflow-task-select", {
			detail: { task: e },
			bubbles: !0,
			composed: !0
		}));
	}
	render() {
		let e = this.heading ? U`<header part="header"><strong>${this.heading}</strong>
      ${this.loaded ? U`<span class="count">${this.items.length}</span>` : G}</header>` : G;
		return this.error ? U`${e}<div class="error" role="alert">${this.error}</div>` : this.loaded ? this.items.length ? U`${e}<ul part="list" role="listbox" aria-label=${this.heading || "Tasks"}>
      ${this.items.map((e) => {
			let t = e.kind === "REVIEW_ACTIVITY", n = t && Ut(e);
			return U`<li part="item" role="option" tabindex="0" aria-selected=${this.selected === e.taskId}
            @click=${() => this.select(e)} @keydown=${(t) => t.key === "Enter" && this.select(e)}>
          <div class="top">
            <span class="title" title=${e.title || e.taskName}>${e.title || Z(e.taskName.split(".").pop() ?? e.taskName)}</span>
            <span class="kind ${e.kind} ${n ? "failure" : ""}">${n ? "Failed step" : t ? "Approval" : "Task"}</span>
          </div>
          <div class="meta">${e.parentWorkflowType ? Z(e.parentWorkflowType) + " · " : ""}${t && e.activityName ? Z(e.activityName) + " · " : ""}
            <span title=${e.startTime}>${We(e.startTime)}</span>${e.status === "PENDING" ? "" : ` · ${e.status.toLowerCase()}`}</div>
        </li>`;
		})}
    </ul>` : U`${e}<div class="empty" part="empty"><slot name="empty">Nothing to do.</slot></div>` : U`${e}<div class="empty" role="status">Loading…</div>`;
	}
};
customElements.get("workflow-task-inbox") || customElements.define("workflow-task-inbox", Gt);
//#endregion
//#region src/task-form.ts
var Kt = class extends X {
	static {
		this.properties = {
			baseUrl: {
				type: String,
				attribute: "base-url"
			},
			taskId: {
				type: String,
				attribute: "task-id"
			},
			kind: { type: String },
			auth: { attribute: !1 },
			task: {
				state: !0,
				attribute: !1
			},
			mode: {
				state: !0,
				attribute: !1
			},
			busy: {
				state: !0,
				attribute: !1
			},
			error: {
				state: !0,
				attribute: !1
			},
			notice: {
				state: !0,
				attribute: !1
			}
		};
	}
	constructor() {
		super(), this.baseUrl = "", this.taskId = "", this.kind = "HUMAN_TASK", this.mode = "view", this.busy = !1;
	}
	static {
		this.styles = [A, M`
    :host { display: grid; gap: 14px; }
    header { display: grid; gap: 4px; }
    h2 { margin: 0; font-size: 17px; }
    .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .pill { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: var(--_surface); }
    .pill.PENDING { background: var(--_accent-soft); color: var(--_accent); }
    .pill.COMPLETED { color: var(--_success); }
    .meta { font-size: 12px; color: var(--_muted); }
    .desc { font-size: 14px; }
    .box { border: 1px solid var(--_border); border-radius: var(--_radius); padding: 10px 12px; background: var(--_surface); }
    .box h3 { margin: 0 0 6px; font-size: 12px; font-weight: 600; color: var(--_muted); text-transform: uppercase; letter-spacing: .04em; }
    dl { display: grid; grid-template-columns: minmax(90px, max-content) 1fr; gap: 4px 12px; margin: 0; font-size: 14px; }
    dt { color: var(--_muted); }
    dd { margin: 0; word-break: break-word; }
    .failure { border-color: var(--_error); }
    .failure p { margin: 0; font-size: 13px; color: var(--_error); white-space: pre-wrap; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    button { font: inherit; font-size: 14px; padding: 7px 14px; border-radius: 6px; cursor: pointer;
      border: 1px solid var(--_border); background: var(--_bg); color: var(--_fg); }
    button.primary { border-color: var(--_accent); background: var(--_accent); color: #fff; }
    button.danger { border-color: var(--_error); color: var(--_error); }
    button:disabled { opacity: .5; cursor: default; }
    button:focus-visible, textarea:focus-visible { outline: 2px solid var(--_accent); outline-offset: 1px; }
    label.reason { display: grid; gap: 4px; font-size: 13px; font-weight: 600; }
    textarea { font: inherit; font-size: 14px; min-height: 72px; padding: 6px 8px; border: 1px solid var(--_border);
      border-radius: 6px; background: var(--_bg); color: var(--_fg); resize: vertical; }
    .error { color: var(--_error); font-size: 13px; }
    .notice { color: var(--_success); font-size: 14px; }
    .empty { color: var(--_muted); font-size: 14px; }
  `];
	}
	updated(e) {
		[
			"baseUrl",
			"taskId",
			"kind"
		].some((t) => e.has(t)) && this.baseUrl && this.taskId && (this.mode = "view", this.notice = void 0, this.reload());
	}
	async reload() {
		let e = this.taskId;
		try {
			let t = new $(this.baseUrl, this.auth), n = this.kind === "REVIEW_ACTIVITY" ? await t.getReview(e) : await t.getHumanTask(e);
			this.taskId === e && (this.task = n, this.error = void 0);
		} catch (t) {
			this.taskId === e && (this.task = void 0, this.error = t.message);
		}
	}
	async act(e, t, n, r) {
		let i = this.task;
		if (i) {
			this.busy = !0, this.error = void 0;
			try {
				await t(new $(this.baseUrl, this.auth)), this.mode = "view", this.notice = n, this.dispatchEvent(new CustomEvent("workflow-task-completed", {
					detail: {
						task: i,
						action: e,
						result: r
					},
					bubbles: !0,
					composed: !0
				})), await this.reload();
			} catch (e) {
				this.error = e.message;
			} finally {
				this.busy = !1;
			}
		}
	}
	complete(e) {
		this.act("complete", (t) => t.completeHumanTask(this.taskId, e), "Done: the workflow has your answer.", e);
	}
	reason() {
		let e = this.renderRoot.querySelector("textarea.reason-text"), t = e?.value.trim() ?? "";
		if (!t) {
			this.error = "Say why: the workflow reads it.", e?.focus();
			return;
		}
		return t;
	}
	details(e, t) {
		let n = Object.entries(e ?? {});
		return n.length ? U`<section class="box" part="context"><h3>${t}</h3><dl>
      ${n.map(([e, t]) => U`<dt>${Z(e)}</dt><dd>${qt(t)}</dd>`)}</dl></section>` : G;
	}
	reasonBox(e, t, n) {
		return U`<label class="reason">${e}<textarea class="reason-text" ?disabled=${this.busy}></textarea></label>
      <div class="actions" part="actions">
        <button class="danger" ?disabled=${this.busy} @click=${() => {
			let e = this.reason();
			e && n(e);
		}}>${t}</button>
        <button ?disabled=${this.busy} @click=${() => {
			this.mode = "view", this.error = void 0;
		}}>Cancel</button></div>`;
	}
	renderHuman(e) {
		let t = e.status === "PENDING" && e.canComplete;
		return U`
      ${this.details(e.taskInput, "About")}
      ${t && this.mode === "fail" ? this.reasonBox("Why can't this be done?", "Fail the task", (e) => void this.act("fail", (t) => t.failHumanTask(this.taskId, e), "The workflow was told it can't be done.")) : t ? U`<workflow-schema-form exportparts="form, field, submit" .schema=${e.formSchema ?? void 0} submit-label="Complete" ?busy=${this.busy}
          @workflow-form-submit=${(e) => this.complete(e.detail.values)}>
          <button slot="actions" ?disabled=${this.busy} @click=${(e) => {
			e.preventDefault(), this.mode = "fail";
		}}>Can't do this</button>
        </workflow-schema-form>` : e.status === "PENDING" ? U`<p class="empty">Waiting for ${[...e.userRoles, ...e.users].join(", ") || "someone else"}.</p>` : e.result !== void 0 && e.result !== null && typeof e.result == "object" ? U`<workflow-schema-form readonly .schema=${e.formSchema ?? Q(e.result)}
              .value=${e.result}></workflow-schema-form>` : G}`;
	}
	renderReview(e) {
		let t = e.status === "PENDING" && Wt(e), n = e.taskInput ?? {}, r = Ut(e);
		return U`
      <section class="box"><h3>${r ? "Failed step" : "Wants to run"}</h3>
        <div class="desc"><strong>${Z(e.activityName)}</strong></div></section>
      ${r && e.errorMessage ? U`<section class="box failure"><h3>Error</h3><p>${e.errorMessage}</p></section>` : G}
      ${this.mode === "edit" && t ? U`<workflow-schema-form exportparts="form, field, submit" .schema=${e.formSchema ?? Q(n)} .value=${n} submit-label="Run with these" ?busy=${this.busy}
            @workflow-form-submit=${(e) => void this.act("proceed-with-input", (t) => t.proceed(this.taskId, e.detail.values), "Approved with your changes.", e.detail.values)}>
            <button slot="actions" ?disabled=${this.busy} @click=${(e) => {
			e.preventDefault(), this.mode = "view";
		}}>Cancel</button>
          </workflow-schema-form>` : this.details(n, "With")}
      ${t ? this.mode === "reject" ? this.reasonBox("Why? The workflow reads this as the reason.", r ? "Stop" : "Reject", (e) => void this.act("reject", (t) => t.reject(this.taskId, e), "Rejected.")) : this.mode === "edit" ? G : U`<div class="actions" part="actions">
            <button class="primary" ?disabled=${this.busy} @click=${() => void this.act("proceed", (e) => e.proceed(this.taskId), r ? "Retrying." : "Approved.")}>
              ${r ? "Retry" : "Approve"}</button>
            ${Object.keys(n).length ? U`<button ?disabled=${this.busy} @click=${() => {
			this.mode = "edit";
		}}>${r ? "Edit and retry" : "Edit and approve"}</button>` : G}
            <button class="danger" ?disabled=${this.busy} @click=${() => {
			this.mode = "reject";
		}}>${r ? "Stop" : "Reject"}</button>
          </div>` : this.decisionLine(e)}`;
	}
	decisionLine(e) {
		if (e.status === "PENDING") return U`<p class="empty">Waiting for ${[...e.userRoles, ...e.users].join(", ") || "someone else"}.</p>`;
		let t = e.decision;
		return t ? U`<p class="desc">${t.action === "reject" ? "Rejected" : t.action === "proceed-with-input" ? "Approved with changes" : "Approved"}${t.feedback ? `: ${t.feedback}` : ""}</p>` : G;
	}
	render() {
		let e = this.task;
		return e ? U`
      <header part="header">
        <div class="row"><h2>${e.title || Z(e.taskName.split(".").pop() ?? e.taskName)}</h2>
          <span class="pill ${e.status}">${e.status.toLowerCase()}</span></div>
        ${e.description ? U`<div class="desc">${e.description}</div>` : G}
        <div class="meta">${e.parentWorkflowType ? Z(e.parentWorkflowType) + " · " : ""}opened
          <span title=${e.startTime}>${We(e.startTime)}</span>${e.completedBy ? U` · done by ${e.completedBy}${e.completedAs === "administrator" ? " (as administrator)" : ""}` : G}</div>
      </header>
      ${this.notice ? U`<div class="notice" role="status">${this.notice}</div>` : G}
      ${e.kind === "REVIEW_ACTIVITY" ? this.renderReview(e) : this.renderHuman(e)}
      ${this.error ? U`<div class="error" role="alert">${this.error}</div>` : G}
    ` : this.error ? U`<div class="error" role="alert">${this.error}</div>` : this.taskId ? U`<div class="empty" role="status">Loading…</div>` : U`<div class="empty">Choose a task.</div>`;
	}
};
function qt(e) {
	return e == null || e === "" ? "—" : typeof e == "boolean" ? e ? "Yes" : "No" : typeof e == "object" ? JSON.stringify(e) : String(e);
}
customElements.get("workflow-task-form") || customElements.define("workflow-task-form", Kt);
//#endregion
//#region node_modules/lit-html/directive.js
var Jt = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), Yt = class {
	constructor(e) {}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AT(e, t, n) {
		this._$Ct = e, this._$AM = t, this._$Ci = n;
	}
	_$AS(e, t) {
		return this.update(e, t);
	}
	update(e, t) {
		return this.render(...t);
	}
}, { I: Xt } = Nt, Zt = {}, Qt = (e, t = Zt) => e._$AH = t, $t = Jt(class extends Yt {
	constructor() {
		super(...arguments), this.key = G;
	}
	render(e, t) {
		return this.key = e, t;
	}
	update(e, [t, n]) {
		return t !== this.key && (Qt(e), this.key = t), n;
	}
}), en = class extends X {
	static {
		this.properties = {
			action: { type: String },
			workflowType: {
				type: String,
				attribute: "workflow-type"
			},
			schema: { attribute: !1 },
			heading: { type: String },
			submitLabel: {
				type: String,
				attribute: "submit-label"
			},
			auth: { attribute: !1 },
			busy: {
				state: !0,
				attribute: !1
			},
			error: {
				state: !0,
				attribute: !1
			},
			started: {
				state: !0,
				attribute: !1
			},
			generation: {
				state: !0,
				attribute: !1
			}
		};
	}
	constructor() {
		super(), this.action = "", this.heading = "", this.submitLabel = "Start", this.busy = !1, this.generation = 0;
	}
	static {
		this.styles = [A, M`
    :host { display: grid; gap: 10px; }
    h3 { margin: 0; font-size: 15px; }
    .result { font-size: 14px; color: var(--_success); }
    .result code { font-size: 12px; color: var(--_fg); }
    .error { color: var(--_error); font-size: 13px; }
  `];
	}
	async start(e) {
		this.busy = !0, this.error = void 0;
		try {
			let t = new URL(this.action, globalThis.location?.href), n = await k(t.origin, t.pathname + t.search, {
				method: "POST",
				body: this.workflowType ? {
					workflowType: this.workflowType,
					input: e
				} : e,
				auth: this.auth
			});
			this.started = n ?? {}, this.generation++, this.dispatchEvent(new CustomEvent("workflow-started", {
				detail: {
					values: e,
					response: n
				},
				bubbles: !0,
				composed: !0
			}));
		} catch (e) {
			this.error = e.message;
		} finally {
			this.busy = !1;
		}
	}
	render() {
		let e = this.started?.runId ?? this.started?.instanceId ?? this.started?.id ?? this.started?.workflowId;
		return U`
      ${this.heading ? U`<h3>${this.heading}</h3>` : G}
      ${$t(this.generation, U`<workflow-schema-form exportparts="form, field, submit" .schema=${this.schema}
          submit-label=${this.submitLabel} ?busy=${this.busy}
          @workflow-form-submit=${(e) => {
			e.stopPropagation(), this.start(e.detail.values);
		}}>
        </workflow-schema-form>`)}
      ${this.started ? U`<div class="result" part="result" role="status">Started${e ? U` <code>${String(e)}</code>` : G}.</div>` : G}
      ${this.error ? U`<div class="error" role="alert">${this.error}</div>` : G}`;
	}
};
customElements.get("workflow-start-form") || customElements.define("workflow-start-form", en);
//#endregion
export { $ as WorkflowClient, Rt as WorkflowSchemaForm, en as WorkflowStartForm, Kt as WorkflowTaskForm, Gt as WorkflowTaskInbox, Wt as actionable, Ie as bearer, Be as configureAuth, Le as devUser, Z as humanize, Q as schemaOf };

//# sourceMappingURL=workflow-ui.bundle.js.map