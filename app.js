const STORAGE_KEY = "digital-allowance-v3";
const ADMIN_PIN = "ADMIN1234567890!@#$%^&*()";
const CLOUD_SYNC = {
  // Set this to your Firebase Realtime Database REST path, for example:
  // "https://your-project-id-default-rtdb.firebaseio.com/digital-allowance/state.json"
  stateUrl: "https://digital-allowance-default-rtdb.firebaseio.com/digital-allowance/state.json",
  // Optional fixed auth token if your database rules require it.
  authToken: "",
  // Recommended: Firebase Auth email/password to obtain a short-lived token automatically.
  // apiKey: from Firebase project settings.
  apiKey: "AIzaSyBkiVHqi3PyJJPJFoJxrPfAqrKp0moSiqI",
  authEmail: "imagineaidenllc@gmail.com",
  authPassword: "ADMIN!@#$%^&*()"
};

const el = {
  authSection: document.getElementById("authSection"),
  parentPortal: document.getElementById("parentPortal"),
  childPortal: document.getElementById("childPortal"),
  parentLoginForm: document.getElementById("parentLoginForm"),
  childLoginForm: document.getElementById("childLoginForm"),
  parentSignupForm: document.getElementById("parentSignupForm"),
  openParentSignupBtn: document.getElementById("openParentSignupBtn"),
  cancelParentSignupBtn: document.getElementById("cancelParentSignupBtn"),
  parentPin: document.getElementById("parentPin"),
  childPin: document.getElementById("childPin"),
  newParentPin: document.getElementById("newParentPin"),
  newParentPinConfirm: document.getElementById("newParentPinConfirm"),
  parentLogoutBtn: document.getElementById("parentLogoutBtn"),
  childLogoutBtn: document.getElementById("childLogoutBtn"),
  parentChildSelect: document.getElementById("parentChildSelect"),
  childCreateForm: document.getElementById("childCreateForm"),
  childName: document.getElementById("childName"),
  childNewPin: document.getElementById("childNewPin"),
  childList: document.getElementById("childList"),
  parentBalance: document.getElementById("parentBalance"),
  childPortalTitle: document.getElementById("childPortalTitle"),
  childBalance: document.getElementById("childBalance"),
  childLimitStatus: document.getElementById("childLimitStatus"),
  scheduleForm: document.getElementById("scheduleForm"),
  scheduleStart: document.getElementById("scheduleStart"),
  scheduleFrequency: document.getElementById("scheduleFrequency"),
  scheduleAmount: document.getElementById("scheduleAmount"),
  scheduleStatus: document.getElementById("scheduleStatus"),
  limitForm: document.getElementById("limitForm"),
  limitFrequency: document.getElementById("limitFrequency"),
  limitAmount: document.getElementById("limitAmount"),
  limitStatus: document.getElementById("limitStatus"),
  runDueNowBtn: document.getElementById("runDueNowBtn"),
  manualForm: document.getElementById("manualForm"),
  manualType: document.getElementById("manualType"),
  manualAmount: document.getElementById("manualAmount"),
  manualNote: document.getElementById("manualNote"),
  inventoryForm: document.getElementById("inventoryForm"),
  itemName: document.getElementById("itemName"),
  itemPrice: document.getElementById("itemPrice"),
  itemStock: document.getElementById("itemStock"),
  inventoryList: document.getElementById("inventoryList"),
  parentRequestTable: document.getElementById("parentRequestTable"),
  activityTable: document.getElementById("activityTable"),
  parentPurchaseTable: document.getElementById("parentPurchaseTable"),
  shopGrid: document.getElementById("shopGrid"),
  cartList: document.getElementById("cartList"),
  cartTotal: document.getElementById("cartTotal"),
  checkoutBtn: document.getElementById("checkoutBtn"),
  requestForm: document.getElementById("requestForm"),
  requestItem: document.getElementById("requestItem"),
  requestDetails: document.getElementById("requestDetails"),
  childRequestList: document.getElementById("childRequestList"),
  purchaseTable: document.getElementById("purchaseTable"),
  toast: document.getElementById("toast")
};

const initialState = {
  users: {
    parents: [],
    children: []
  },
  selectedParentChildId: ""
};

let state = loadState();
let currentRole = null;
let currentParentId = "";
let currentParentPin = "";
let currentChildId = "";
let isAdmin = false;
let cloudSaveTimer = null;
let cloudPollTimer = null;
let cloudAuthToken = "";
let cloudLastError = "";

render();
wireEvents();
initializeCloudSync();

function wireEvents() {
  el.openParentSignupBtn.addEventListener("click", () => {
    el.parentSignupForm.classList.remove("hidden");
  });

  el.cancelParentSignupBtn.addEventListener("click", () => {
    el.parentSignupForm.classList.add("hidden");
    el.newParentPin.value = "";
    el.newParentPinConfirm.value = "";
  });

  el.parentSignupForm.addEventListener("submit", onParentSignup);
  el.parentLoginForm.addEventListener("submit", onParentLogin);
  el.childLoginForm.addEventListener("submit", onChildLogin);
  el.parentLogoutBtn.addEventListener("click", logout);
  el.childLogoutBtn.addEventListener("click", logout);

  el.parentChildSelect.addEventListener("change", () => {
    state.selectedParentChildId = el.parentChildSelect.value;
    saveState();
    render();
  });

  el.childCreateForm.addEventListener("submit", onCreateChild);
  el.childList.addEventListener("click", onChildListAction);

  el.scheduleForm.addEventListener("submit", onSaveSchedule);
  el.limitForm.addEventListener("submit", onSaveSpendingLimit);
  el.runDueNowBtn.addEventListener("click", () => {
    const child = getSelectedChildForParent();
    if (!child) {
      showToast("Add or select a child first.");
      return;
    }

    const paidNow = runDueNowAndSkipUpcoming(child);
    if (!paidNow) {
      showToast("Set an allowance schedule first.");
    } else {
      showToast("Allowance paid now. Upcoming payout skipped.");
    }
    render();
  });

  el.manualForm.addEventListener("submit", onManualAdjustment);
  el.inventoryForm.addEventListener("submit", onAddInventoryItem);
  el.inventoryList.addEventListener("click", onInventoryAction);
  el.parentRequestTable.addEventListener("click", onParentRequestAction);
  el.parentPurchaseTable.addEventListener("click", onParentPurchaseAction);
  el.parentPortal.addEventListener("click", onAdminAction);
  el.shopGrid.addEventListener("click", onAddToCart);
  el.cartList.addEventListener("click", onCartAction);
  el.checkoutBtn.addEventListener("click", onCheckout);
  el.requestForm.addEventListener("submit", onRequestShopItem);
}

function onParentSignup(event) {
  event.preventDefault();
  const pin = el.newParentPin.value.trim();
  const pinConfirm = el.newParentPinConfirm.value.trim();

  if (pin.length < 4) {
    showToast("Parent PIN must be at least 4 characters.");
    return;
  }

  if (pin !== pinConfirm) {
    showToast("PIN confirmation does not match.");
    return;
  }

  if (isPinInUse(pin)) {
    showToast("That PIN is already in use.");
    return;
  }

  const parent = { id: crypto.randomUUID(), pin };
  state.users.parents.push(parent);

  currentRole = "parent";
  currentParentId = parent.id;
  currentParentPin = parent.pin;

  saveState();
  el.parentSignupForm.classList.add("hidden");
  el.newParentPin.value = "";
  el.newParentPinConfirm.value = "";
  showToast("Parent account created.");
  render();
}

function onParentLogin(event) {
  event.preventDefault();
  const enteredPin = el.parentPin.value.trim();
  if (enteredPin === ADMIN_PIN) {
    currentRole = "parent";
    currentParentId = "";
    currentParentPin = "";
    currentChildId = "";
    isAdmin = true;
    el.parentPin.value = "";
    render();
    return;
  }

  const parent = state.users.parents.find((entry) => entry.pin === enteredPin);
  if (!parent) {
    showToast("Parent PIN is incorrect.");
    return;
  }

  currentRole = "parent";
  currentParentId = parent.id;
  currentParentPin = parent.pin;
  currentChildId = "";
  isAdmin = false;

  const ownedChildren = getChildrenForParent(currentParentId);
  applyDueAllowanceForChildren(ownedChildren);
  if (!getSelectedChildForParent() && ownedChildren.length > 0) {
    state.selectedParentChildId = ownedChildren[0].id;
    saveState();
  }

  el.parentPin.value = "";
  render();
}

function onChildLogin(event) {
  event.preventDefault();
  const child = state.users.children.find((entry) => entry.pin === el.childPin.value.trim());
  if (!child) {
    showToast("Child PIN is incorrect.");
    return;
  }

  currentRole = "child";
  currentChildId = child.id;
  currentParentId = "";
  currentParentPin = "";

  applyDueAllowanceForChild(child);
  el.childPin.value = "";
  render();
}

function logout() {
  currentRole = null;
  currentParentId = "";
  currentParentPin = "";
  currentChildId = "";
  isAdmin = false;
  render();
}

function onCreateChild(event) {
  event.preventDefault();
  const name = el.childName.value.trim();
  const pin = el.childNewPin.value.trim();

  if (!name) {
    showToast("Enter a child name.");
    return;
  }

  if (pin.length < 4) {
    showToast("Child PIN must be at least 4 characters.");
    return;
  }

  const existingChild = state.users.children.find((entry) => entry.pin === pin);
  if (existingChild) {
    if (existingChild.ownerParentPin && existingChild.ownerParentPin !== currentParentPin) {
      showToast("That PIN is already in use.");
      return;
    }
    if (existingChild.ownerParentPin === currentParentPin) {
      showToast("A child with that PIN already exists in your account.");
      return;
    }

    existingChild.parentId = currentParentId;
    existingChild.ownerParentPin = currentParentPin;
    if (name) {
      existingChild.name = name;
    }
    if (!state.selectedParentChildId) {
      state.selectedParentChildId = existingChild.id;
    }
    el.childName.value = "";
    el.childNewPin.value = "";
    saveState();
    render();
    showToast("Existing child linked to your account.");
    return;
  }

  if (isPinInUse(pin)) {
    showToast("That PIN is already in use.");
    return;
  }

  if (!currentParentId) {
    showToast("Sign in as a parent first.");
    return;
  }

  const child = createChild(name, pin, 0, currentParentId, currentParentPin);
  state.users.children.push(child);

  if (!state.selectedParentChildId) {
    state.selectedParentChildId = child.id;
  }

  el.childName.value = "";
  el.childNewPin.value = "";

  saveState();
  render();
  showToast("Child added.");
}

function onChildListAction(event) {
  const button = event.target.closest("button[data-child-action]");
  if (!button) return;

  const action = button.dataset.childAction;
  const childId = button.dataset.childId;
  const child = state.users.children.find((entry) => entry.id === childId && isChildOwnedByCurrentParent(entry));
  if (!child) return;

  if (action === "rename") {
    const nameInput = document.querySelector(`input[data-child-name-id='${childId}']`);
    const nextName = nameInput ? nameInput.value.trim() : "";
    if (!nextName) {
      showToast("Enter a name before renaming.");
      return;
    }
    child.name = nextName;
    saveState();
    render();
    showToast("Child renamed.");
    return;
  }

  if (action === "delete") {
    const confirmed = window.confirm(`Delete ${child.name}?`);
    if (!confirmed) return;

    state.users.children = state.users.children.filter((entry) => entry.id !== childId);

    if (state.selectedParentChildId === childId) {
      state.selectedParentChildId = getChildrenForParent(currentParentId)[0]?.id || "";
    }

    if (currentRole === "child" && currentChildId === childId) {
      currentRole = null;
      currentChildId = "";
    }

    saveState();
    render();
    showToast("Child deleted.");
  }
}

function onSaveSchedule(event) {
  event.preventDefault();
  const child = getSelectedChildForParent();
  if (!child) {
    showToast("Add or select a child first.");
    return;
  }

  const start = el.scheduleStart.value;
  const frequency = el.scheduleFrequency.value;
  const amount = Number(el.scheduleAmount.value);

  if (!start || !Number.isFinite(amount) || amount < 1) {
    showToast("Enter a valid schedule start and amount.");
    return;
  }

  const startIso = new Date(start).toISOString();
  const oldStart = child.schedule.start;
  child.schedule.start = startIso;
  child.schedule.frequency = frequency;
  child.schedule.amount = Math.round(amount);

  if (!oldStart || oldStart !== startIso) {
    child.schedule.lastPaidAt = "";
    child.schedule.lastPayoutAt = "";
    child.schedule.lastPayoutType = "";
  }

  saveState();

  const paidRuns = applyDueAllowanceForChild(child);
  render();
  showToast(
    paidRuns > 0
      ? `Schedule saved and ${paidRuns} due payout${paidRuns > 1 ? "s" : ""} applied.`
      : "Allowance schedule saved."
  );
}

function onManualAdjustment(event) {
  event.preventDefault();
  const child = getSelectedChildForParent();
  if (!child) {
    showToast("Add or select a child first.");
    return;
  }

  const type = el.manualType.value;
  const amount = Math.round(Number(el.manualAmount.value));
  const note = el.manualNote.value.trim();

  if (!Number.isFinite(amount) || amount < 1 || !note) {
    showToast("Add a valid amount and note.");
    return;
  }

  const signed = type === "add" ? amount : -amount;
  if (child.balance + signed < 0) {
    showToast("Cannot reduce below zero coins.");
    return;
  }

  child.balance += signed;
  child.transactions.unshift({
    id: crypto.randomUUID(),
    type: "manual",
    amount: signed,
    details: note,
    date: new Date().toISOString()
  });

  el.manualAmount.value = "";
  el.manualNote.value = "";
  saveState();
  render();
  showToast("Manual balance update saved.");
}

function onSaveSpendingLimit(event) {
  event.preventDefault();
  const child = getSelectedChildForParent();
  if (!child) {
    showToast("Add or select a child first.");
    return;
  }

  const frequency = el.limitFrequency.value;
  const amount = Math.round(Number(el.limitAmount.value));
  if (!Number.isFinite(amount) || amount < 0) {
    showToast("Enter a valid spending limit amount.");
    return;
  }

  child.spendingLimit = { frequency, amount };
  saveState();
  render();
  showToast(amount === 0 ? "Spending limit disabled." : "Spending limit saved.");
}

function onAddInventoryItem(event) {
  event.preventDefault();
  const child = getSelectedChildForParent();
  if (!child) {
    showToast("Add or select a child first.");
    return;
  }

  const name = el.itemName.value.trim();
  const price = Math.round(Number(el.itemPrice.value));
  const stock = Math.round(Number(el.itemStock.value));

  if (!name || !Number.isFinite(price) || price < 1 || !Number.isFinite(stock) || stock < 0) {
    showToast("Use valid item details.");
    return;
  }

  child.inventory.push({ id: crypto.randomUUID(), name, price, stock, ownerChildPin: child.pin });
  el.itemName.value = "";
  el.itemPrice.value = "";
  el.itemStock.value = "";

  saveState();
  render();
  showToast("Item added to this child's shop.");
}

function onInventoryAction(event) {
  const child = getSelectedChildForParent();
  if (!child) return;

  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const id = button.dataset.id;
  const item = child.inventory.find((entry) => entry.id === id && entry.ownerChildPin === child.pin);
  if (!item) return;

  if (action === "remove") {
    child.inventory = child.inventory.filter((entry) => !(entry.id === id && entry.ownerChildPin === child.pin));
    child.cart = child.cart.filter((entry) => entry.id !== id);
  }

  if (action === "restock") {
    const input = document.querySelector(`input[data-stock-input='${id}']`);
    const addBy = Math.round(Number(input ? input.value : 0));
    if (!Number.isFinite(addBy) || addBy < 1) {
      showToast("Enter a stock amount above 0.");
      return;
    }
    item.stock += addBy;
    if (input) input.value = "";
  }

  saveState();
  render();
}

function onRequestShopItem(event) {
  event.preventDefault();
  const child = getCurrentChild();
  if (!child) return;

  const item = el.requestItem.value.trim();
  const details = el.requestDetails.value.trim();
  if (!item) {
    showToast("Enter an item to request.");
    return;
  }

  const createdAt = new Date().toISOString();
  child.requests.unshift({
    id: crypto.randomUUID(),
    item,
    details,
    date: createdAt,
    status: "pending",
    parentResponse: "",
    resolvedAt: ""
  });

  child.transactions.unshift({
    id: crypto.randomUUID(),
    type: "request",
    amount: 0,
    details: `Requested shop item: ${item}`,
    date: createdAt
  });

  el.requestItem.value = "";
  el.requestDetails.value = "";
  saveState();
  render();
  showToast("Request sent to parent.");
}

function onParentRequestAction(event) {
  const button = event.target.closest("button[data-request-action]");
  if (!button) return;

  const action = button.dataset.requestAction;
  const childId = button.dataset.childId;
  const requestId = button.dataset.requestId;
  if (!childId || !requestId) return;
  if (action !== "approve" && action !== "decline") return;

  const child = state.users.children.find((entry) => entry.id === childId && isChildOwnedByCurrentParent(entry));
  if (!child) return;

  const request = child.requests.find((entry) => entry.id === requestId);
  if (!request || request.status !== "pending") return;

  const responseInput = document.querySelector(`input[data-request-note-id='${childId}-${requestId}']`);
  const responseText = responseInput ? responseInput.value.trim() : "";

  request.status = action === "approve" ? "approved" : "declined";
  request.parentResponse =
    responseText || (request.status === "approved" ? "Approved by parent." : "Declined by parent.");
  request.resolvedAt = new Date().toISOString();

  child.transactions.unshift({
    id: crypto.randomUUID(),
    type: "request-update",
    amount: 0,
    details: `Request ${request.status}: ${request.item}. ${request.parentResponse}`,
    date: request.resolvedAt
  });

  saveState();
  render();
  showToast(`Request ${request.status}.`);
}

function onParentPurchaseAction(event) {
  const button = event.target.closest("button[data-parent-action]");
  if (!button) return;

  const action = button.dataset.parentAction;
  const purchaseId = button.dataset.id;
  const childId = button.dataset.childId;
  if (action !== "undo" || !purchaseId || !childId) return;

  const reasonInput = document.querySelector(`input[data-undo-reason-id='${childId}-${purchaseId}']`);
  const reason = reasonInput ? reasonInput.value.trim() : "";
  if (!reason) {
    showToast("Enter why you are undoing this purchase.");
    return;
  }

  const success = undoPurchase(childId, purchaseId, reason, currentParentPin);
  if (!success) return;

  saveState();
  render();
  showToast("Purchase undone, refunded, and restocked.");
}

function onAddToCart(event) {
  const child = getCurrentChild();
  if (!child) return;

  const button = event.target.closest("button[data-add-id]");
  if (!button) return;
  const id = button.dataset.addId;
  const item = getChildInventory(child).find((entry) => entry.id === id);

  if (!item || item.stock <= 0) {
    showToast("This item is out of stock.");
    return;
  }

  const cartEntry = child.cart.find((entry) => entry.id === id);
  const qtyInCart = cartEntry ? cartEntry.qty : 0;

  if (qtyInCart >= item.stock) {
    showToast("No more stock available for this item.");
    return;
  }

  if (cartEntry) {
    cartEntry.qty += 1;
  } else {
    child.cart.push({ id: item.id, name: item.name, price: item.price, qty: 1 });
  }

  saveState();
  render();
}

function onCartAction(event) {
  const child = getCurrentChild();
  if (!child) return;

  const button = event.target.closest("button[data-cart-action]");
  if (!button) return;

  const action = button.dataset.cartAction;
  const id = button.dataset.id;
  const entry = child.cart.find((cartItem) => cartItem.id === id);
  if (!entry) return;

  if (action === "minus") {
    entry.qty -= 1;
    if (entry.qty <= 0) {
      child.cart = child.cart.filter((cartItem) => cartItem.id !== id);
    }
  }

  if (action === "plus") {
    const inventoryItem = getChildInventory(child).find((inv) => inv.id === id);
    if (!inventoryItem) return;
    if (entry.qty >= inventoryItem.stock) {
      showToast("Cannot exceed available stock.");
      return;
    }
    entry.qty += 1;
  }

  if (action === "remove") {
    child.cart = child.cart.filter((cartItem) => cartItem.id !== id);
  }

  saveState();
  render();
}

function onCheckout() {
  const child = getCurrentChild();
  if (!child) return;

  if (!child.cart.length) {
    showToast("Your cart is empty.");
    return;
  }

  let total = 0;

  for (const cartItem of child.cart) {
    const invItem = getChildInventory(child).find((item) => item.id === cartItem.id);
    if (!invItem || invItem.stock < cartItem.qty) {
      showToast(`Not enough stock for ${cartItem.name}.`);
      return;
    }
    total += cartItem.price * cartItem.qty;
  }

  if (child.balance < total) {
    showToast("Not enough coins for checkout.");
    return;
  }

  const limitInfo = getSpendingLimitInfo(child);
  if (limitInfo.enabled && total > limitInfo.remaining) {
    showToast(
      `Spending limit reached. Remaining this ${limitInfo.frequencyLabel.toLowerCase()}: ${limitInfo.remaining} coins.`
    );
    return;
  }

  const confirmed = window.confirm(`Checkout for ${total} coins?`);
  if (!confirmed) {
    return;
  }

  for (const cartItem of child.cart) {
    const invItem = getChildInventory(child).find((item) => item.id === cartItem.id);
    if (invItem) {
      invItem.stock -= cartItem.qty;
    }
  }

  const lineItems = child.cart.map((entry) => ({
    id: entry.id,
    name: entry.name,
    price: entry.price,
    qty: entry.qty
  }));
  const itemSummary = lineItems.map((entry) => `${entry.name} x${entry.qty}`).join(", ");
  const purchasedAt = new Date().toISOString();

  child.balance -= total;
  child.purchases.unshift({
    id: crypto.randomUUID(),
    items: itemSummary,
    lineItems,
    amount: total,
    date: purchasedAt,
    status: "completed",
    undoReason: "",
    undoneAt: ""
  });

  child.transactions.unshift({
    id: crypto.randomUUID(),
    type: "purchase",
    amount: -total,
    details: itemSummary,
    date: purchasedAt
  });

  child.cart = [];
  saveState();
  render();
  showToast("Checkout complete. Great shopping!");
}

function undoPurchase(childId, purchaseId, reason, parentPin = "") {
  const child = state.users.children.find(
    (entry) => entry.id === childId && (!parentPin || entry.ownerParentPin === parentPin)
  );
  if (!child) {
    showToast("Child account not found.");
    return false;
  }

  const purchase = child.purchases.find((entry) => entry.id === purchaseId);
  if (!purchase) {
    showToast("Purchase could not be found.");
    return false;
  }

  if ((purchase.status || "completed") === "undone") {
    showToast("This purchase was already undone.");
    return false;
  }

  if (!Array.isArray(purchase.lineItems) || purchase.lineItems.length === 0) {
    showToast("This older purchase cannot be undone because item details are missing.");
    return false;
  }

  for (const lineItem of purchase.lineItems) {
    const existing = getChildInventory(child).find((item) => item.id === lineItem.id);
    if (existing) {
      existing.stock += lineItem.qty;
      continue;
    }

    child.inventory.push({
      id: lineItem.id || crypto.randomUUID(),
      name: lineItem.name,
      price: lineItem.price,
      stock: lineItem.qty,
      ownerChildPin: child.pin
    });
  }

  const refundAmount = Number(purchase.amount) || 0;
  child.balance += refundAmount;
  purchase.status = "undone";
  purchase.undoReason = reason;
  purchase.undoneAt = new Date().toISOString();

  child.transactions.unshift({
    id: crypto.randomUUID(),
    type: "refund",
    amount: refundAmount,
    details: `Parent undid purchase (${purchase.items}). Reason: ${reason}`,
    date: purchase.undoneAt
  });

  return true;
}

function runDueNowAndSkipUpcoming(child) {
  if (!child.schedule.start || child.schedule.amount < 1) {
    return false;
  }

  const nextDate = getNextScheduledDate(child);
  if (!nextDate || Number.isNaN(nextDate.getTime())) {
    return false;
  }

  const paidAt = new Date();
  child.balance += child.schedule.amount;
  child.transactions.unshift({
    id: crypto.randomUUID(),
    type: "allowance",
    amount: child.schedule.amount,
    details: `Run Due Now payout (skipped ${formatDateTime(nextDate)})`,
    date: paidAt.toISOString()
  });

  child.schedule.lastPaidAt = nextDate.toISOString();
  child.schedule.lastPayoutAt = paidAt.toISOString();
  child.schedule.lastPayoutType = "early";

  saveState();
  return true;
}

function applyDueAllowanceForAllChildren() {
  let runs = 0;
  for (const child of state.users.children) {
    runs += applyDueAllowanceForChild(child);
  }
  return runs;
}

function applyDueAllowanceForChildren(children) {
  let runs = 0;
  for (const child of children) {
    runs += applyDueAllowanceForChild(child);
  }
  return runs;
}

function applyDueAllowanceForChild(child) {
  const schedule = child.schedule;
  if (!schedule.start || schedule.amount < 1) {
    return 0;
  }

  const now = new Date();
  const startDate = new Date(schedule.start);
  if (Number.isNaN(startDate.getTime())) {
    return 0;
  }

  let dueDate = startDate;
  if (schedule.lastPaidAt) {
    const lastPaid = new Date(schedule.lastPaidAt);
    if (!Number.isNaN(lastPaid.getTime())) {
      dueDate = incrementDate(lastPaid, schedule.frequency);
    }
  }

  let runs = 0;
  const maxRuns = 200;

  while (dueDate <= now && runs < maxRuns) {
    if (dueDate.getTime() < startDate.getTime()) {
      dueDate = incrementDate(dueDate, schedule.frequency);
      continue;
    }

    child.balance += schedule.amount;
    child.transactions.unshift({
      id: crypto.randomUUID(),
      type: "allowance",
      amount: schedule.amount,
      details: `${capitalize(schedule.frequency)} allowance payout`,
      date: dueDate.toISOString()
    });
    schedule.lastPaidAt = dueDate.toISOString();
    schedule.lastPayoutAt = dueDate.toISOString();
    schedule.lastPayoutType = "scheduled";
    runs += 1;
    dueDate = incrementDate(dueDate, schedule.frequency);
  }

  if (runs > 0) {
    saveState();
  }

  return runs;
}

function incrementDate(date, frequency) {
  const next = new Date(date);
  if (frequency === "daily") {
    next.setDate(next.getDate() + 1);
    return next;
  }
  if (frequency === "biweekly") {
    next.setDate(next.getDate() + 14);
    return next;
  }
  if (frequency === "monthly") {
    next.setMonth(next.getMonth() + 1);
    return next;
  }
  next.setDate(next.getDate() + 7);
  return next;
}

function render() {
  const showParent = currentRole === "parent";
  const showChild = currentRole === "child";

  el.authSection.classList.toggle("hidden", showParent || showChild);
  el.parentPortal.classList.toggle("hidden", !showParent);
  el.childPortal.classList.toggle("hidden", !showChild);

  renderParentChildSelect();
  renderChildList();
  renderScheduleStatus();
  renderSpendingLimitStatus();
  renderInventory();
  renderParentRequests();
  renderParentActivity();
  renderParentPurchases();
  renderAdminPanel();
  renderChildPortal();
}

function renderParentChildSelect() {
  const children = getChildrenForParent(currentParentId);
  if (!children.length) {
    state.selectedParentChildId = "";
    el.parentChildSelect.innerHTML = `<option value="">No children yet</option>`;
    el.parentChildSelect.value = "";
    el.parentBalance.textContent = "0 Coins";
    return;
  }

  if (!children.some((child) => child.id === state.selectedParentChildId)) {
    state.selectedParentChildId = children[0].id;
    saveState();
  }

  el.parentChildSelect.innerHTML = children
    .map((child) => `<option value="${child.id}">${escapeHtml(child.name)}</option>`)
    .join("");
  el.parentChildSelect.value = state.selectedParentChildId;

  const selected = getSelectedChildForParent();
  const balance = selected ? selected.balance : 0;
  el.parentBalance.textContent = `${balance} Coin${balance === 1 ? "" : "s"}`;
}

function renderChildList() {
  const children = getChildrenForParent(currentParentId);
  if (!children.length) {
    el.childList.innerHTML = `<p class="note-text">No children added yet.</p>`;
    return;
  }

  el.childList.innerHTML = children
    .map((child) => {
      return `
      <div class="inventory-item">
        <div class="item-meta">
          <strong>${escapeHtml(child.name)}</strong>
          <span>Balance: ${child.balance} coins</span>
          <span>PIN: ${escapeHtml(child.pin)}</span>
        </div>
        <div class="item-actions">
          <input type="text" value="${escapeHtml(child.name)}" data-child-name-id="${child.id}" />
          <button type="button" class="secondary-btn" data-child-action="rename" data-child-id="${child.id}">Rename</button>
          <button type="button" data-child-action="delete" data-child-id="${child.id}">Delete</button>
        </div>
      </div>
      `;
    })
    .join("");
}

function renderScheduleStatus() {
  const child = getSelectedChildForParent();
  if (!child) {
    el.scheduleStatus.textContent = "Add a child to configure schedule.";
    el.scheduleStart.value = "";
    el.scheduleFrequency.value = "weekly";
    el.scheduleAmount.value = "";
    return;
  }

  const { start, frequency, amount, lastPaidAt, lastPayoutAt, lastPayoutType } = child.schedule;

  if (!start) {
    el.scheduleStatus.textContent = "No schedule set yet.";
    el.scheduleStart.value = "";
    el.scheduleFrequency.value = frequency;
    el.scheduleAmount.value = amount || "";
    return;
  }

  const startDate = new Date(start);
  const nextDate = getNextScheduledDate(child);

  let lastPayoutText = "not yet";
  if (lastPayoutAt) {
    if (lastPayoutType === "early") {
      lastPayoutText = `${formatDateTime(new Date(lastPayoutAt))} (ran early)`;
    } else {
      lastPayoutText = formatDateTime(new Date(lastPayoutAt));
    }
  } else if (lastPaidAt) {
    lastPayoutText = formatDateTime(new Date(lastPaidAt));
  }

  el.scheduleStatus.textContent = `Pays ${amount} coins ${frequency}. Start: ${formatDateTime(startDate)}. Next payout: ${
    nextDate ? formatDateTime(nextDate) : "n/a"
  }. Last payout: ${lastPayoutText}.`;

  el.scheduleStart.value = toDatetimeLocal(start);
  el.scheduleFrequency.value = frequency;
  el.scheduleAmount.value = amount;
}

function renderSpendingLimitStatus() {
  const child = getSelectedChildForParent();
  if (!child) {
    el.limitFrequency.value = "weekly";
    el.limitAmount.value = "0";
    el.limitStatus.textContent = "Add a child to configure spending limits.";
    return;
  }

  const limit = getChildSpendingLimit(child);
  el.limitFrequency.value = limit.frequency;
  el.limitAmount.value = String(limit.amount);

  const info = getSpendingLimitInfo(child);
  if (!info.enabled) {
    el.limitStatus.textContent = "No spending limit is active.";
    return;
  }

  el.limitStatus.textContent = `${info.limit} coins ${info.frequencyLabel.toLowerCase()}. Spent: ${info.spent} coins. Remaining: ${info.remaining} coins until ${formatDateTime(
    info.nextReset
  )}.`;
}

function getNextScheduledDate(child) {
  const { start, lastPaidAt, frequency } = child.schedule;
  if (!start) return null;

  let next = new Date(start);
  if (lastPaidAt) {
    next = incrementDate(new Date(lastPaidAt), frequency);
  }
  return next;
}

function renderInventory() {
  const child = getSelectedChildForParent();
  if (!child) {
    el.inventoryList.innerHTML = `<p class="note-text">Add or select a child first.</p>`;
    return;
  }

  if (!getChildInventory(child).length) {
    el.inventoryList.innerHTML = `<p class="note-text">No items in this child's shop yet.</p>`;
    return;
  }

  el.inventoryList.innerHTML = getChildInventory(child)
    .map(
      (item) => `
      <div class="inventory-item">
        <div class="item-meta">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${item.price} coins • ${item.stock} in stock</span>
        </div>
        <div class="item-actions">
          <input type="number" min="1" step="1" placeholder="+ stock" data-stock-input="${item.id}" />
          <button type="button" class="secondary-btn" data-action="restock" data-id="${item.id}">Restock</button>
          <button type="button" data-action="remove" data-id="${item.id}">Remove</button>
        </div>
      </div>
    `
    )
    .join("");
}

function renderParentActivity() {
  const rows = [];
  for (const child of getChildrenForParent(currentParentId)) {
    for (const entry of child.transactions) {
      rows.push({ childName: child.name, ...entry });
    }
  }

  rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (!rows.length) {
    el.activityTable.innerHTML = `<tr><td colspan="5" class="note-text">No activity yet.</td></tr>`;
    return;
  }

  el.activityTable.innerHTML = rows
    .map(
      (entry) => `
      <tr>
        <td>${formatDateTime(new Date(entry.date))}</td>
        <td>${escapeHtml(entry.childName)}</td>
        <td>${capitalize(entry.type)}</td>
        <td>${entry.amount > 0 ? "+" : ""}${entry.amount} coins</td>
        <td>${escapeHtml(entry.details || "")}</td>
      </tr>
    `
    )
    .join("");
}

function renderParentRequests() {
  const rows = [];
  for (const child of getChildrenForParent(currentParentId)) {
    for (const request of child.requests) {
      rows.push({ childId: child.id, childName: child.name, request });
    }
  }

  rows.sort((a, b) => new Date(b.request.date).getTime() - new Date(a.request.date).getTime());

  if (!rows.length) {
    el.parentRequestTable.innerHTML = `<tr><td colspan="6" class="note-text">No requests yet.</td></tr>`;
    return;
  }

  el.parentRequestTable.innerHTML = rows
    .map(({ childId, childName, request }) => {
      const statusLabel = capitalize(request.status || "pending");
      const canAct = (request.status || "pending") === "pending";
      const actionHtml = canAct
        ? `
          <div class="undo-row">
            <input type="text" class="reason-input" data-request-note-id="${childId}-${request.id}" placeholder="Parent note (optional)" />
            <button type="button" class="secondary-btn" data-request-action="approve" data-child-id="${childId}" data-request-id="${request.id}">Approve</button>
            <button type="button" data-request-action="decline" data-child-id="${childId}" data-request-id="${request.id}">Decline</button>
          </div>
        `
        : `<span class="note-text">${escapeHtml(request.parentResponse || "No response note")}</span>`;

      return `
        <tr>
          <td>${formatDateTime(new Date(request.date))}</td>
          <td>${escapeHtml(childName)}</td>
          <td>${escapeHtml(request.item)}</td>
          <td>${escapeHtml(request.details || "-")}</td>
          <td>${statusLabel}</td>
          <td>${actionHtml}</td>
        </tr>
      `;
    })
    .join("");
}

function renderParentPurchases() {
  const rows = [];
  for (const child of getChildrenForParent(currentParentId)) {
    for (const purchase of child.purchases) {
      rows.push({ childId: child.id, childName: child.name, purchase });
    }
  }

  rows.sort((a, b) => new Date(b.purchase.date).getTime() - new Date(a.purchase.date).getTime());

  if (!rows.length) {
    el.parentPurchaseTable.innerHTML = `<tr><td colspan="6" class="note-text">No purchases yet.</td></tr>`;
    return;
  }

  el.parentPurchaseTable.innerHTML = rows
    .map(({ childId, childName, purchase }) => {
      const status = purchase.status || "completed";
      const canUndo = status !== "undone";
      const reasonId = `${childId}-${purchase.id}`;
      const actionHtml = canUndo
        ? `
          <div class="undo-row">
            <input type="text" class="reason-input" data-undo-reason-id="${reasonId}" placeholder="Why undo?" />
            <button type="button" data-parent-action="undo" data-child-id="${childId}" data-id="${purchase.id}">Undo</button>
          </div>
        `
        : `<span class="note-text">Undone: ${escapeHtml(purchase.undoReason || "No reason provided")}</span>`;

      return `
        <tr>
          <td>${formatDateTime(new Date(purchase.date))}</td>
          <td>${escapeHtml(childName)}</td>
          <td>${escapeHtml(purchase.items)}</td>
          <td>${purchase.amount}</td>
          <td>${renderPurchaseStatus(purchase)}</td>
          <td>${actionHtml}</td>
        </tr>
      `;
    })
    .join("");
}

function renderChildPortal() {
  const child = getCurrentChild();
  if (!child) {
    el.childPortalTitle.textContent = "Child Portal";
    el.childBalance.textContent = "0 Coins";
    el.childLimitStatus.textContent = "";
    el.shopGrid.innerHTML = `<p class="note-text">Sign in as a child to shop.</p>`;
    el.cartList.innerHTML = `<p class="note-text">No items in cart.</p>`;
    el.cartTotal.textContent = "Total: 0 Coins";
    el.childRequestList.innerHTML = `<p class="note-text">No requests yet.</p>`;
    el.purchaseTable.innerHTML = `<tr><td colspan="4" class="note-text">No purchases yet.</td></tr>`;
    return;
  }

  el.childPortalTitle.textContent = `${child.name}'s Portal`;
  el.childBalance.textContent = `${child.balance} Coin${child.balance === 1 ? "" : "s"}`;
  const limitInfo = getSpendingLimitInfo(child);
  el.childLimitStatus.textContent = limitInfo.enabled
    ? `Limit: ${limitInfo.limit} coins ${limitInfo.frequencyLabel.toLowerCase()}. Remaining: ${limitInfo.remaining} coins.`
    : "No spending limit set.";

  renderShop(child);
  renderCart(child);
  renderChildRequests(child);
  renderPurchases(child);
}

function renderAdminPanel() {
  const adminPanel = document.getElementById("adminPanel");
  const adminParentsTable = document.getElementById("adminParentsTable");
  const adminChildrenTable = document.getElementById("adminChildrenTable");
  if (!adminPanel || !adminParentsTable || !adminChildrenTable) return;

  adminPanel.classList.toggle("hidden", !isAdmin);
  if (!isAdmin) return;

  if (!state.users.parents.length) {
    adminParentsTable.innerHTML = `<tr><td colspan="3" class="note-text">No parents yet.</td></tr>`;
  } else {
    adminParentsTable.innerHTML = state.users.parents
      .map(
        (parent) => `
        <tr>
          <td>${parent.id}</td>
          <td>
            <input type="text" value="${escapeHtml(parent.pin)}" data-admin-parent-pin="${parent.id}" />
          </td>
          <td>
            <button type="button" class="secondary-btn" data-admin-action="save-parent" data-id="${parent.id}">
              Save
            </button>
          </td>
        </tr>
      `
      )
      .join("");
  }

  if (!state.users.children.length) {
    adminChildrenTable.innerHTML = `<tr><td colspan="6" class="note-text">No children yet.</td></tr>`;
  } else {
    adminChildrenTable.innerHTML = state.users.children
      .map(
        (child) => `
        <tr>
          <td>${child.id}</td>
          <td><input type="text" value="${escapeHtml(child.name)}" data-admin-child-name="${child.id}" /></td>
          <td><input type="text" value="${escapeHtml(child.pin)}" data-admin-child-pin="${child.id}" /></td>
          <td><input type="number" min="0" step="1" value="${child.balance}" data-admin-child-balance="${child.id}" /></td>
          <td>
            <input type="text" value="${escapeHtml(child.ownerParentPin || "")}" data-admin-child-owner="${child.id}" />
          </td>
          <td>
            <button type="button" class="secondary-btn" data-admin-action="save-child" data-id="${child.id}">
              Save
            </button>
          </td>
        </tr>
      `
      )
      .join("");
  }
}

function onAdminAction(event) {
  const button = event.target.closest("button[data-admin-action]");
  if (!button || !isAdmin) return;
  const action = button.dataset.adminAction;
  const id = button.dataset.id;
  if (!id) return;

  if (action === "save-parent") {
    const parent = state.users.parents.find((entry) => entry.id === id);
    if (!parent) return;
    const pinInput = document.querySelector(`input[data-admin-parent-pin='${id}']`);
    const nextPin = pinInput ? pinInput.value.trim() : "";
    if (nextPin.length < 4) {
      showToast("Parent PIN must be at least 4 characters.");
      return;
    }
    if (nextPin !== parent.pin && isPinInUse(nextPin)) {
      showToast("That PIN is already in use.");
      return;
    }
    const oldPin = parent.pin;
    parent.pin = nextPin;
    for (const child of state.users.children) {
      if (child.ownerParentPin === oldPin) {
        child.ownerParentPin = nextPin;
      }
    }
    saveState();
    render();
    showToast("Parent PIN updated.");
    return;
  }

  if (action === "save-child") {
    const child = state.users.children.find((entry) => entry.id === id);
    if (!child) return;
    const nameInput = document.querySelector(`input[data-admin-child-name='${id}']`);
    const pinInput = document.querySelector(`input[data-admin-child-pin='${id}']`);
    const balanceInput = document.querySelector(`input[data-admin-child-balance='${id}']`);
    const ownerInput = document.querySelector(`input[data-admin-child-owner='${id}']`);

    const nextName = nameInput ? nameInput.value.trim() : "";
    const nextPin = pinInput ? pinInput.value.trim() : "";
    const nextBalance = balanceInput ? Math.max(0, Math.round(Number(balanceInput.value))) : child.balance;
    const nextOwnerPin = ownerInput ? ownerInput.value.trim() : "";

    if (!nextName) {
      showToast("Child name is required.");
      return;
    }
    if (nextPin.length < 4) {
      showToast("Child PIN must be at least 4 characters.");
      return;
    }
    if (nextPin !== child.pin && isPinInUse(nextPin)) {
      showToast("That PIN is already in use.");
      return;
    }

    child.name = nextName;
    child.pin = nextPin;
    child.balance = Number.isFinite(nextBalance) ? nextBalance : child.balance;
    child.ownerParentPin = nextOwnerPin;

    // Ensure store items remain linked to the child's updated pin.
    for (const item of child.inventory || []) {
      item.ownerChildPin = child.pin;
    }

    saveState();
    render();
    showToast("Child updated.");
  }
}

function renderShop(child) {
  const availableItems = getChildInventory(child).filter((item) => item.stock > 0);
  if (!availableItems.length) {
    el.shopGrid.innerHTML = `<p class="note-text">The shop is empty right now.</p>`;
    return;
  }

  el.shopGrid.innerHTML = availableItems
    .map(
      (item) => {
        const inCart = child.cart.find((entry) => entry.id === item.id);
        const qtyText = inCart ? `In cart: ${inCart.qty}` : "";
        return `
        <div class="shop-item">
          <div class="item-meta">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${item.price} coins</span>
            <span>${item.stock} left</span>
            <span>${escapeHtml(qtyText)}</span>
          </div>
          <button type="button" data-add-id="${item.id}">Add To Cart</button>
        </div>
      `;
      }
    )
    .join("");
}

function renderCart(child) {
  if (!child.cart.length) {
    el.cartList.innerHTML = `<p class="note-text">No items in cart.</p>`;
    el.cartTotal.textContent = "Total: 0 Coins";
    return;
  }

  let total = 0;
  el.cartList.innerHTML = child.cart
    .map((entry) => {
      const itemTotal = entry.price * entry.qty;
      total += itemTotal;
      return `
      <div class="cart-item">
        <div class="item-meta">
          <strong>${escapeHtml(entry.name)}</strong>
          <span>${entry.price} coins each • Qty ${entry.qty}</span>
        </div>
        <div class="item-actions">
          <button type="button" class="secondary-btn" data-cart-action="minus" data-id="${entry.id}">-</button>
          <button type="button" class="secondary-btn" data-cart-action="plus" data-id="${entry.id}">+</button>
          <button type="button" data-cart-action="remove" data-id="${entry.id}">Remove</button>
        </div>
      </div>
    `;
    })
    .join("");

  el.cartTotal.textContent = `Total: ${total} Coins`;
}

function renderPurchases(child) {
  if (!child.purchases.length) {
    el.purchaseTable.innerHTML = `<tr><td colspan="4" class="note-text">No purchases yet.</td></tr>`;
    return;
  }

  el.purchaseTable.innerHTML = child.purchases
    .map(
      (purchase) => `
      <tr>
        <td>${formatDateTime(new Date(purchase.date))}</td>
        <td>${escapeHtml(purchase.items)}</td>
        <td>${purchase.amount}</td>
        <td>${renderPurchaseStatus(purchase)}</td>
      </tr>
    `
    )
    .join("");
}

function renderChildRequests(child) {
  if (!child.requests.length) {
    el.childRequestList.innerHTML = `<p class="note-text">No requests yet.</p>`;
    return;
  }

  el.childRequestList.innerHTML = child.requests
    .map(
      (request) => `
      <div class="inventory-item">
        <div class="item-meta">
          <strong>${escapeHtml(request.item)}</strong>
          <span>Status: ${capitalize(request.status || "pending")}</span>
          <span>${escapeHtml(request.details || "No extra details")}</span>
          ${
            request.parentResponse
              ? `<span>Parent note: ${escapeHtml(request.parentResponse)}</span>`
              : `<span>Waiting for parent response</span>`
          }
        </div>
      </div>
    `
    )
    .join("");
}

function renderPurchaseStatus(purchase) {
  const status = purchase.status || "completed";
  if (status === "undone") {
    return `Undone (${formatDateTime(new Date(purchase.undoneAt || purchase.date))})`;
  }
  return "Completed";
}

function getSelectedChildForParent() {
  return (
    state.users.children.find(
      (child) => child.id === state.selectedParentChildId && child.ownerParentPin === currentParentPin
    ) || null
  );
}

function getCurrentChild() {
  if (currentRole !== "child") return null;
  return state.users.children.find((child) => child.id === currentChildId) || null;
}

function isPinInUse(pin) {
  if (state.users.parents.some((entry) => entry.pin === pin)) {
    return true;
  }
  if (state.users.children.some((entry) => entry.pin === pin)) {
    return true;
  }
  return false;
}

function createChild(name, pin, startingBalance = 0, parentId = "", ownerParentPin = "") {
  return {
    id: crypto.randomUUID(),
    name,
    pin,
    parentId,
    ownerParentPin,
    balance: startingBalance,
    inventory: [],
    schedule: emptySchedule(),
    spendingLimit: emptySpendingLimit(),
    requests: [],
    purchases: [],
    transactions: [],
    cart: []
  };
}

function emptySchedule() {
  return {
    start: "",
    frequency: "weekly",
    amount: 5,
    lastPaidAt: "",
    lastPayoutAt: "",
    lastPayoutType: ""
  };
}

function emptySpendingLimit() {
  return {
    frequency: "weekly",
    amount: 0
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  queueCloudSave();
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return structuredClone(initialState);
  }

  try {
    const parsed = JSON.parse(raw);
    const normalized = normalizeLoadedState(parsed);
    if (migrateInventoryOwnership(normalized)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    return structuredClone(initialState);
  }
}

function normalizeLoadedState(parsed) {
  const merged = {
    ...structuredClone(initialState),
    ...parsed,
    users: {
      parents: Array.isArray(parsed?.users?.parents) ? parsed.users.parents : [],
      children: Array.isArray(parsed?.users?.children) ? parsed.users.children : []
    }
  };

  merged.users.parents = merged.users.parents
    .map((parent) => ({ id: parent.id || crypto.randomUUID(), pin: String(parent.pin || "") }))
    .filter((parent) => parent.pin.length >= 4);

  const parentIdToPin = new Map(merged.users.parents.map((parent) => [parent.id, parent.pin]));
  merged.users.children = merged.users.children
    .map((child) => normalizeChild(child, parentIdToPin))
    .filter((child) => child.pin.length >= 4 && child.name);

  if (!merged.users.children.some((child) => child.id === merged.selectedParentChildId)) {
    merged.selectedParentChildId = merged.users.children[0]?.id || "";
  }

  return merged;
}

function buildCloudStateUrl() {
  const raw = CLOUD_SYNC.stateUrl.trim();
  if (!raw) return "";
  const token = (cloudAuthToken || CLOUD_SYNC.authToken || "").trim();
  if (!token) return raw;
  const joiner = raw.includes("?") ? "&" : "?";
  return `${raw}${joiner}auth=${encodeURIComponent(token)}`;
}

function queueCloudSave() {
  if (!buildCloudStateUrl()) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => {
    saveCloudState().catch(() => {});
  }, 400);
}

async function saveCloudState() {
  const response = await fetch(buildCloudStateUrl(), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state)
  });
  if (response.status === 401 || response.status === 403) {
    const authed = await authenticateCloudSync();
    if (!authed) return;
    await fetch(buildCloudStateUrl(), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state)
    });
  }
}

async function initializeCloudSync() {
  if (!CLOUD_SYNC.stateUrl.trim()) return;

  try {
    const authed = await authenticateCloudSync();
    if (!authed) {
      showToast(`Cloud auth failed: ${cloudLastError || "check email/password/apiKey"}`);
      return;
    }
    const response = await fetch(buildCloudStateUrl(), { method: "GET", cache: "no-store" });
    if (!response.ok) {
      cloudLastError = `HTTP ${response.status}`;
      showToast(`Cloud sync unavailable: ${cloudLastError}`);
      return;
    }

    const cloudState = await response.json();
    if (!cloudState || typeof cloudState !== "object") {
      await saveCloudState();
      return;
    }

    state = normalizeLoadedState(cloudState);
    if (migrateInventoryOwnership(state)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      saveState();
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    render();
    showToast("Cloud sync connected.");
    startCloudPolling();
  } catch {
    showToast(`Cloud sync unavailable: ${cloudLastError || "network or rules issue"}`);
  }
}

function startCloudPolling() {
  if (cloudPollTimer || !CLOUD_SYNC.stateUrl.trim()) return;
  cloudPollTimer = setInterval(() => {
    pullCloudState().catch(() => {});
  }, 5000);
}

async function pullCloudState() {
  if (!CLOUD_SYNC.stateUrl.trim()) return;

  let response = await fetch(buildCloudStateUrl(), { method: "GET", cache: "no-store" });
  if (response.status === 401 || response.status === 403) {
    const authed = await authenticateCloudSync();
    if (!authed) return;
    response = await fetch(buildCloudStateUrl(), { method: "GET", cache: "no-store" });
  }
  if (!response.ok) return;

  const cloudState = await response.json();
  if (!cloudState || typeof cloudState !== "object") return;

  const normalizedCloud = normalizeLoadedState(cloudState);
  const localText = JSON.stringify(state);
  const cloudText = JSON.stringify(normalizedCloud);
  if (localText === cloudText) return;

  state = normalizedCloud;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

async function authenticateCloudSync() {
  if (CLOUD_SYNC.authToken.trim()) return true;
  if (cloudAuthToken) return true;

  const apiKey = CLOUD_SYNC.apiKey.trim();
  const email = CLOUD_SYNC.authEmail.trim();
  const password = CLOUD_SYNC.authPassword;
  if (!apiKey || !email || !password) {
    cloudLastError = "Missing apiKey/email/password";
    return false;
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true
      })
    }
  );
  if (!response.ok) {
    try {
      const errorData = await response.json();
      cloudLastError = errorData?.error?.message || `Auth HTTP ${response.status}`;
    } catch {
      cloudLastError = `Auth HTTP ${response.status}`;
    }
    return false;
  }

  const data = await response.json();
  if (!data.idToken) {
    cloudLastError = "No idToken returned";
    return false;
  }
  cloudAuthToken = data.idToken;
  cloudLastError = "";
  return true;
}

function migrateLegacyState() {
  const legacyRaw = localStorage.getItem("digital-allowance-v1");
  if (!legacyRaw) {
    return structuredClone(initialState);
  }

  try {
    const legacy = JSON.parse(legacyRaw);
    const parentPin = legacy.users?.parent?.pin || "1234";
    const childPin = legacy.users?.child?.pin || "1111";
    const childName = legacy.users?.child?.name || "Kid";

    const migratedChild = createChild(childName, childPin, Math.max(0, Number(legacy.wallet?.balance || 0)));
    migratedChild.schedule = {
      ...emptySchedule(),
      ...(legacy.schedule || {})
    };
    migratedChild.purchases = Array.isArray(legacy.purchases)
      ? legacy.purchases.map((purchase) => ({
          ...purchase,
          status: purchase.status || "completed",
          undoReason: purchase.undoReason || "",
          undoneAt: purchase.undoneAt || "",
          lineItems: Array.isArray(purchase.lineItems) ? purchase.lineItems : []
        }))
      : [];
    migratedChild.transactions = Array.isArray(legacy.transactions) ? legacy.transactions : [];
    migratedChild.cart = Array.isArray(legacy.cart) ? legacy.cart : [];
    migratedChild.requests = [];
    migratedChild.inventory = Array.isArray(legacy.inventory)
      ? legacy.inventory.map((item) => ({
          ...item,
          ownerChildPin: childPin
        }))
      : [];

    return {
      users: {
        parents: [{ id: crypto.randomUUID(), pin: String(parentPin) }],
        children: [migratedChild]
      },
      selectedParentChildId: migratedChild.id
    };
  } catch {
    return structuredClone(initialState);
  }
}

function normalizeChild(child, parentIdToPin = new Map()) {
  const rawParentId = String(child.parentId || "");
  const rawOwnerPin = String(child.ownerParentPin || "");
  const fallbackOwnerPin = parentIdToPin.get(rawParentId) || "";
  return {
    id: child.id || crypto.randomUUID(),
    name: String(child.name || ""),
    pin: String(child.pin || ""),
    parentId: rawParentId,
    ownerParentPin: rawOwnerPin || fallbackOwnerPin,
    balance: Math.max(0, Number(child.balance || 0)),
    inventory: Array.isArray(child.inventory)
      ? child.inventory
          .map((item) => ({
            id: item.id || crypto.randomUUID(),
            name: String(item.name || ""),
            price: Math.max(1, Math.round(Number(item.price || 1))),
            stock: Math.max(0, Math.round(Number(item.stock || 0))),
            ownerChildPin: String(item.ownerChildPin || child.pin || "")
          }))
          .filter((item) => item.name)
      : [],
    schedule: {
      ...emptySchedule(),
      ...(child.schedule || {})
    },
    spendingLimit: {
      ...emptySpendingLimit(),
      ...(child.spendingLimit || {})
    },
    purchases: Array.isArray(child.purchases)
      ? child.purchases.map((purchase) => ({
          ...purchase,
          status: purchase.status || "completed",
          undoReason: purchase.undoReason || "",
          undoneAt: purchase.undoneAt || "",
          lineItems: Array.isArray(purchase.lineItems) ? purchase.lineItems : []
        }))
      : [],
    requests: Array.isArray(child.requests)
      ? child.requests.map((request) => ({
          id: request.id || crypto.randomUUID(),
          item: String(request.item || ""),
          details: String(request.details || ""),
          date: request.date || new Date().toISOString(),
          status: request.status || "pending",
          parentResponse: String(request.parentResponse || ""),
          resolvedAt: String(request.resolvedAt || "")
        }))
      : [],
    transactions: Array.isArray(child.transactions) ? child.transactions : [],
    cart: Array.isArray(child.cart) ? child.cart : []
  };
}

function getChildrenForParent(parentId) {
  if (!parentId) return [];
  const parent = state.users.parents.find((entry) => entry.id === parentId);
  if (!parent) return [];
  return state.users.children.filter((child) => child.ownerParentPin === parent.pin);
}

function isChildOwnedByCurrentParent(child) {
  return Boolean(currentParentPin) && child.ownerParentPin === currentParentPin;
}

function getChildInventory(child) {
  return (child.inventory || []).filter((item) => item.ownerChildPin === child.pin);
}

function migrateInventoryOwnership(targetState) {
  let changed = false;
  for (const child of targetState.users.children) {
    if (!Array.isArray(child.inventory)) continue;
    for (const item of child.inventory) {
      if (!item.ownerChildPin) {
        item.ownerChildPin = child.pin;
        changed = true;
      }
    }
  }
  return changed;
}

function getChildSpendingLimit(child) {
  return {
    ...emptySpendingLimit(),
    ...(child.spendingLimit || {})
  };
}

function getSpendingLimitInfo(child, now = new Date()) {
  const limit = getChildSpendingLimit(child);
  const amount = Math.max(0, Math.round(Number(limit.amount || 0)));
  const frequency = limit.frequency || "weekly";
  const frequencyLabel = frequency === "biweekly" ? "Every 2 Weeks" : capitalize(frequency);

  if (amount < 1) {
    return {
      enabled: false,
      limit: 0,
      spent: 0,
      remaining: Number.MAX_SAFE_INTEGER,
      frequency,
      frequencyLabel,
      nextReset: now
    };
  }

  const periodStart = getPeriodStart(now, frequency);
  const nextReset = incrementDate(periodStart, frequency);
  const spent = child.purchases.reduce((sum, purchase) => {
    if ((purchase.status || "completed") !== "completed") return sum;
    const purchasedAt = new Date(purchase.date);
    if (Number.isNaN(purchasedAt.getTime())) return sum;
    if (purchasedAt < periodStart || purchasedAt >= nextReset) return sum;
    return sum + Math.max(0, Number(purchase.amount || 0));
  }, 0);
  const remaining = Math.max(0, amount - spent);

  return {
    enabled: true,
    limit: amount,
    spent,
    remaining,
    frequency,
    frequencyLabel,
    nextReset
  };
}

function getPeriodStart(now, frequency) {
  const start = new Date(now);
  start.setSeconds(0, 0);

  if (frequency === "daily") {
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (frequency === "weekly") {
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (frequency === "biweekly") {
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    const epochWeekStart = new Date(1970, 0, 4);
    const elapsedWeeks = Math.floor((start.getTime() - epochWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
    if (elapsedWeeks % 2 !== 0) {
      start.setDate(start.getDate() - 7);
    }
    return start;
  }

  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => el.toast.classList.remove("show"), 2400);
}

function formatDateTime(date) {
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function toDatetimeLocal(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function escapeHtml(text) {
  const safeText = String(text ?? "");
  return safeText
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
