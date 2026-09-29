import {diagnostics} from "./compose.js";
import {defaults} from "./state.js";
import {$, h} from "./ui/dom.js";
import {copy, renderOutput, starter, TABS} from "./ui/output.js";
import {reviewStep} from "./ui/review.js";
import {architectureStep, behaviorStep, capabilitiesStep, describeStep, identityStep, portalStep, STEPS} from "./ui/steps.js";
import {boot, change, onChange, openHash, restoreDraft, setView, store, undo} from "./ui/store.js";

// The builder's shell: the step bar, the current step (or every step in Advanced mode), the banner, the toast and
// the output panel. The steps and outputs live in js/ui/.

const BODIES = {describe: describeStep, architecture: architectureStep, capabilities: capabilitiesStep, behavior: behaviorStep,
  portal: portalStep, identity: identityStep, review: reviewStep};

function renderSteps() {
  const issues = diagnostics(store.state);
  const v = store.view;
  $("steps").replaceChildren(h("ol", {}, STEPS.map((step) => {
    const blockers = issues.filter((i) => i.step === step.id && i.level === "blocker").length;
    const current = v.mode === "guided" && v.step === step.n;
    return h("li", {}, h("button", {type: "button", class: "step-button" + (current ? " current" : "") + (step.n < v.step ? " done" : ""),
      "aria-current": current ? "step" : undefined, onclick: () => go(step.n)},
      h("span", {class: "step-num", "aria-hidden": "true"}, step.n < v.step && !blockers ? "✓" : String(step.n)),
      h("span", {class: "step-title"}, step.short),
      blockers ? h("span", {class: "step-issues", "aria-label": `${blockers} to fix`}, String(blockers)) : null));
  })));
}

function go(step) {
  setView({step, mode: "guided", pane: "configure"}, "view");
  requestAnimationFrame(() => $("step-heading")?.focus());
}

// Redraws the form and puts focus back on the same control, so a redraw after an edit doesn't lose the user's place.
function renderForm() {
  const form = $("form");
  const focusables = () => [...form.querySelectorAll("input, select, textarea, button, summary, a[href]")];
  const index = focusables().indexOf(document.activeElement);
  const open = [...form.querySelectorAll("details")].map((d) => d.open);
  const v = store.view;
  if (v.mode === "advanced") {
    form.replaceChildren(h("h2", {id: "step-heading", tabindex: "-1"}, "All settings"),
      h("p", {class: "note"}, "Every step on one page, over the same design. Switch back to Guided for the step-by-step flow."),
      ...STEPS.map((step) => h("section", {class: "adv-step"}, h("h2", {class: "adv-title"}, `${step.n}. ${step.title}`), ...BODIES[step.id]().filter(Boolean))));
    form.querySelectorAll("details.advanced").forEach((d) => { d.open = true; });
  } else {
    const step = STEPS.find((x) => x.n === v.step);
    const blockers = diagnostics(store.state).filter((i) => i.step === step.id && i.level === "blocker").length;
    form.replaceChildren(
      h("p", {class: "step-count"}, `Step ${step.n} of ${STEPS.length}`),
      h("h2", {id: "step-heading", tabindex: "-1"}, step.title),
      ...BODIES[step.id]().filter(Boolean),
      h("div", {class: "step-nav"},
        step.n > 1 ? h("button", {type: "button", onclick: () => go(step.n - 1)}, "Back") : h("span"),
        step.n < STEPS.length ? h("button", {type: "button", class: "primary", onclick: () => {
          if (blockers) setView({lastChange: {message: `Step ${step.n} has ${blockers} thing${blockers > 1 ? "s" : ""} to fix before generating; you can come back to ${blockers > 1 ? "them" : "it"}.`, canUndo: false, at: Date.now()}}, "toast");
          go(step.n + 1);
        }}, `Continue to ${STEPS[step.n].short}`) : null));
  }
  const details = [...form.querySelectorAll("details")];
  if (details.length === open.length) details.forEach((d, i) => { d.open = open[i] || (v.mode === "advanced" && d.classList.contains("advanced")); });
  if (index >= 0) focusables()[index]?.focus({preventScroll: true});
}

function renderBanner() {
  const v = store.view;
  const banner = $("banner");
  if (v.draft) {
    banner.replaceChildren(h("div", {class: "banner info", role: "status"},
      h("span", {}, `You have a draft, “${v.draft.name}”, from ${new Date(v.draft.savedAt).toLocaleString()}.`),
      h("button", {type: "button", class: "primary", onclick: () => restoreDraft(true)}, "Restore it"),
      h("button", {type: "button", onclick: () => restoreDraft(false)}, "Start fresh")));
  } else if (v.notice) {
    banner.replaceChildren(h("div", {class: "banner info", role: "status"}, h("span", {}, v.notice),
      h("button", {type: "button", onclick: () => setView({notice: undefined}, "view")}, "Dismiss")));
  } else {
    banner.replaceChildren();
  }
}

let toastTimer;
function renderToast() {
  const last = store.view.lastChange;
  const toast = $("toast");
  if (!last || Date.now() - last.at > 8000) {
    toast.hidden = true;
    return;
  }
  toast.replaceChildren(h("span", {}, last.message),
    last.canUndo ? h("button", {type: "button", onclick: () => undo()}, "Undo") : null,
    h("button", {type: "button", class: "icon", "aria-label": "Dismiss", onclick: () => { toast.hidden = true; }}, "✕"));
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 8000);
}

function renderChrome() {
  const v = store.view;
  document.body.dataset.show = v.pane;
  document.body.dataset.wide = String(v.mode === "guided" && !!STEPS.find((x) => x.n === v.step)?.wide);
  for (const b of document.querySelectorAll("button[data-mode]")) b.setAttribute("aria-pressed", String(b.dataset.mode === v.mode));
  for (const b of document.querySelectorAll("button[data-pane]")) b.setAttribute("aria-pressed", String(b.dataset.pane === v.pane));
}

let outputTimer;
onChange((kind) => {
  if (kind === "toast") return renderToast();
  if (kind === "output") return renderOutput();
  renderChrome();
  renderSteps();
  renderBanner();
  if (kind !== "text") renderForm();
  renderToast();
  clearTimeout(outputTimer);
  if (kind === "text") outputTimer = setTimeout(renderOutput, 200);
  else renderOutput();
});

// Inline errors refresh when a field loses focus, not on every keystroke.
$("form").addEventListener("change", (e) => {
  if (e.target.matches("input[type=text], textarea, input[type=number]")) {
    requestAnimationFrame(() => { renderSteps(); renderForm(); });
  }
});

// ---------------------------------------------------------------- start

for (const [id] of TABS) {
  $(`tab-${id}`).addEventListener("click", () => setView({tab: id}, "output"));
}
// Arrow keys move between the output tabs.
$("tabs").addEventListener("keydown", (e) => {
  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
  const ids = TABS.map(([id]) => id);
  const next = ids[(ids.indexOf(store.view.tab) + (e.key === "ArrowRight" ? 1 : ids.length - 1)) % ids.length];
  setView({tab: next}, "output");
  $(`tab-${next}`).focus();
});
for (const b of document.querySelectorAll("button[data-mode]")) b.addEventListener("click", () => setView({mode: b.dataset.mode}, "view"));
for (const b of document.querySelectorAll("button[data-pane]")) b.addEventListener("click", () => setView({pane: b.dataset.pane}, "view"));
$("share").addEventListener("click", () => copy(location.href, "the share link"));
$("download").addEventListener("click", () => {
  const blockers = diagnostics(store.state).filter((i) => i.level === "blocker");
  if (blockers.length) {
    setView({step: STEPS.length, mode: "guided", pane: "configure", lastChange: {message: `Fix ${blockers.length} issue${blockers.length > 1 ? "s" : ""} before downloading; the review lists them.`, canUndo: false, at: Date.now()}}, "view");
    return;
  }
  starter();
});
$("reset").addEventListener("click", () => {
  change(() => defaults(), {structural: true, undo: "start over", message: "Started over with a blank design."});
  go(1);
});

window.addEventListener("hashchange", openHash);
boot();
renderChrome();
renderSteps();
renderBanner();
renderForm();
renderOutput();
