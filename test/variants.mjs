// The designs the checks run on: every scenario and a few edge cases.
import {readFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {applyScenario, setCapability} from "../js/compose.js";
import {importDescriptor} from "../js/descriptor.js";
import {defaults, newIntegration, newWorkflow, workflowsOf} from "../js/state.js";

const here = dirname(new URL(import.meta.url).pathname);
const scenario = (id, change = (s) => s) => () => change(applyScenario(defaults(), id));
export const variants = {
  custom: scenario("custom"),
  assistant: scenario("assistant"),
  approval: scenario("approval", (s) => {
    s.behavior.notifications.events = {runStarted: true, taskAssigned: true, runFinished: true};
    return s;
  }),
  documents: scenario("documents", (s) => {
    s.behavior.notifications.events.runStarted = true;
    return s;
  }),
  // Two new integrations: an assistant, and an approvals backend, sharing the commons services.
  twoIntegrations: scenario("assistant", (s) => {
    const second = newIntegration(s.architecture.integrations, {title: "Approvals", pkg: "approvals"});
    second.workflows.push(newWorkflow(s, "approval"));
    s.architecture.integrations.push(second);
    return setCapability(s, "tasks", true).state;
  }),
  // An existing integration imported from its descriptor, next to a new one.
  withExisting: scenario("assistant", (s) => {
    const {integration} = importDescriptor(readFileSync(join(here, "fixtures/workflow.def.json"), "utf8"), s.architecture.integrations);
    s.architecture.integrations.push(integration);
    return setCapability(s, "tasks", true).state;
  }),
  everything: () => {
    let s = applyScenario(defaults(), "documents");
    s = setCapability(s, "tasks", true).state;
    s.behavior.notifications.events = {runStarted: true, taskAssigned: true, runFinished: true};
    s.identity.idp = {...s.identity.idp, kind: "keycloak", audience: "portal"};
    s.db = "postgresql";
    s.deploy = "compose";
    const agent = workflowsOf(s).find((w) => w.kind === "agent");
    agent.activities = ["notifyUser", "notifyRole", "sendMessage", "askForm", "closeConversation", "requestUpload", "closeCase", "updateStatus"];
    agent.approval = {on: true, activity: "closeCase", userRoles: ["Officer"], adminRoles: ["Officer"]};
    agent.input.push({name: "type", label: "Type", type: "choice", options: ["Bug", "R&D"], required: true},
      {name: "from", label: "From", type: "string", required: false}, {name: "count", label: "Count", type: "integer", required: true});
    agent.startRoles = ["Applicant"];
    const flow = workflowsOf(s).find((w) => w.kind === "workflow");
    flow.startRoles = ["Applicant", "Officer"];
    flow.tasks.push({name: "pay", title: "Pay it", description: "Finance pays", roles: ["Officer", "Applicant"],
      fields: [{name: "costCentre", label: "Cost centre", type: "choice", options: ["OPS", "SALES"], required: true},
        {name: "amount", label: "Amount", type: "number", required: true}]});
    return s;
  }
};
