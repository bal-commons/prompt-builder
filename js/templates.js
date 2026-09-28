// Starting points. Each fills the app, the layout, the pages and the agent; everything stays editable.
// A page has `columns: [left, right]`; a single-column page shows both lists stacked, so switching loses nothing.

const page = (id, title, layout, ratio, left, right = [], collapsible = true) =>
  ({id, title, layout, ratio, collapsible, columns: [left, right]});

export const TEMPLATES = [
  {
    id: "blank",
    name: "Blank demo app",
    desc: "A generic request with a chat and an inbox. Rename everything.",
    build: () => ({
      app: {name: "My demo app", description: "Users open requests; an agent works each one with them until it is done.",
        object: "request", idPrefix: "REQ", roles: ["User", "Reviewer"], userRole: "User", adminRoles: ["Reviewer"],
        org: "myorg", pkg: "demo_app"},
      layout: {shell: "sidebar", collapsible: true},
      header: ["bell", "user-menu"],
      bell: {opens: "drawer"},
      pages: [
        page("home", "Requests", "split", 40, ["item-form", "item-list"], ["item-detail", "conversation"]),
        page("inbox", "Notifications", "single", 50, ["inbox"])
      ],
      custom: [],
      agent: {
        on: true, name: "assistant", displayName: "Assistant",
        purpose: "Works one request with the user from start to finish.",
        steps: [
          "When the request arrives: greet the user in the chat and ask what they need; notifyRole the Reviewer.",
          "When a MESSAGE arrives: answer it, and askForm when you need structured details.",
          "When the work is done: updateStatus to DONE, tell the user, and closeConversation."
        ],
        activities: ["notifyUser", "notifyRole", "sendMessage", "askForm", "closeConversation", "updateStatus"],
        approval: {on: false, activity: "updateStatus", userRoles: ["Reviewer"], adminRoles: []},
        model: "wso2"
      }
    })
  },
  {
    id: "approval",
    name: "Approval flow",
    desc: "An expense claim with receipts; the agent checks it and a manager approves the decision.",
    build: () => ({
      app: {name: "Expense approvals", description: "Employees submit expense claims with receipts; an agent checks them and prepares a decision a manager approves.",
        object: "expense claim", idPrefix: "EXP", roles: ["Employee", "Manager", "Finance"], userRole: "Employee",
        adminRoles: ["Finance"], org: "myorg", pkg: "expense_app"},
      layout: {shell: "sidebar", collapsible: true},
      header: ["bell", "user-menu"],
      bell: {opens: "inbox"},
      pages: [
        page("claims", "Claims", "split", 40, ["item-form", "item-list"], ["item-detail", "conversation"]),
        page("approvals", "Approvals", "single", 50, ["approvals"]),
        page("files", "Receipts", "split", 35, ["case-list"], ["file-viewer"]),
        page("inbox", "Notifications", "single", 50, ["inbox"])
      ],
      custom: [],
      agent: {
        on: true, name: "claims", displayName: "Claims assistant",
        purpose: "Checks one expense claim: collects receipts, asks for missing details and proposes a decision.",
        steps: [
          "When the claim arrives: thank the employee and requestUpload their receipts (application/pdf, image/*).",
          "When the UPLOAD arrives: check the amounts against the claim; askForm for anything missing.",
          "When the claim is complete: updateStatus to APPROVED or REJECTED with your reason (a Manager approves it first), then notifyUser the employee."
        ],
        activities: ["notifyUser", "notifyRole", "sendMessage", "askForm", "requestUpload", "closeCase", "updateStatus"],
        approval: {on: true, activity: "updateStatus", userRoles: ["Manager"], adminRoles: ["Finance"]},
        model: "wso2"
      }
    })
  },
  {
    id: "support",
    name: "Support desk",
    desc: "Tickets as chats in a wide two-column view, with an agent answering first.",
    build: () => ({
      app: {name: "Support desk", description: "Customers open tickets; an agent answers first and hands over to a human when needed.",
        object: "ticket", idPrefix: "TKT", roles: ["Customer", "Agent", "Supervisor"], userRole: "Customer",
        adminRoles: ["Agent", "Supervisor"], org: "myorg", pkg: "support_desk"},
      layout: {shell: "top", collapsible: false},
      header: ["bell", "user-menu"],
      bell: {opens: "drawer"},
      pages: [
        page("tickets", "Tickets", "split", 30, ["item-form", "conversation-list"], ["conversation"]),
        page("overview", "Overview", "split", 60, ["stats", "item-list"], ["kb", "inbox"], false)
      ],
      custom: [{id: "kb", name: "Knowledge base search", description: "A search box over help articles; shows the top 5 matches with a link.", api: true}],
      agent: {
        on: true, name: "support", displayName: "Support assistant",
        purpose: "Answers one ticket; hands over to a human Agent when it can't solve it.",
        steps: [
          "When the ticket arrives: greet the customer and ask for the details you need.",
          "When a MESSAGE arrives: answer if you can; otherwise notifyRole the Agent role (WARNING) and tell the customer a person will reply.",
          "When the customer confirms it is solved: updateStatus to SOLVED and closeConversation."
        ],
        activities: ["notifyRole", "sendMessage", "askForm", "closeConversation", "updateStatus"],
        approval: {on: false, activity: "updateStatus", userRoles: ["Supervisor"], adminRoles: []},
        model: "wso2"
      }
    })
  },
  {
    id: "tenant",
    name: "Tenant maintenance (example)",
    desc: "The durable-agent demo: photos, a contractor, a booked visit.",
    build: () => ({
      app: {name: "Tenant maintenance", description: "Tenants report problems; an agent coordinates contractors until the tenant confirms the fix.",
        object: "maintenance request", idPrefix: "MR", roles: ["Tenant", "Contractor", "PropertyManager"],
        userRole: "Tenant", adminRoles: ["PropertyManager"], org: "myorg", pkg: "tenant_app"},
      layout: {shell: "hub", collapsible: true},
      header: ["user-menu"],
      bell: {opens: "drawer"},
      pages: [page("requests", "Requests", "split", 40, ["item-form", "item-list"], ["item-detail", "conversation"])],
      custom: [],
      agent: {
        on: true, name: "coordinator", displayName: "Maintenance assistant",
        purpose: "Owns one maintenance request from report to resolution: collects photos, finds a contractor, books the visit and closes the request when the tenant confirms the fix.",
        steps: [
          "When the request arrives: greet the tenant and requestUpload a photo of the problem; notifyRole the PropertyManager.",
          "When the UPLOAD arrives: tell the tenant what happens next.",
          "When the tenant says it is fixed: closeCase, closeConversation, and notifyRole the PropertyManager (SUCCESS)."
        ],
        activities: ["notifyUser", "notifyRole", "sendMessage", "askForm", "closeConversation", "requestUpload", "closeCase", "updateStatus"],
        approval: {on: false, activity: "closeCase", userRoles: ["PropertyManager"], adminRoles: []},
        model: "wso2"
      }
    })
  }
];
