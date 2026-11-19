const STORAGE_KEY = "schooltrack.assignments";

const form = document.querySelector("#assignment-form");
const titleInput = document.querySelector("#assignment-title");
const courseInput = document.querySelector("#assignment-course");
const dueDateInput = document.querySelector("#assignment-due");
const list = document.querySelector("#assignment-list");
const emptyState = document.querySelector("#empty-state");
const emptyTitle = document.querySelector("#empty-title");
const emptyCopy = document.querySelector("#empty-copy");
const listFooter = document.querySelector("#list-footer");
const formError = document.querySelector("#form-error");
const toast = document.querySelector("#toast");

let activeFilter = "all";
let toastTimeout;
let assignments = loadAssignments();

const today = new Date();
const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
}).format(today);
dueDateInput.min = formatDateValue(todayDate);

function isAssignment(value) {
  return value
    && typeof value.id === "string"
    && typeof value.title === "string"
    && typeof value.course === "string"
    && typeof value.completed === "boolean"
    && (typeof value.dueDate === "string" || value.dueDate === "");
}

function loadAssignments() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.every(isAssignment)) {
      showToast("Saved assignments could not be read because the stored data is invalid.");
      return [];
    }
    return parsed;
  } catch {
    showToast("Could not load saved assignments. Your browser storage may be unavailable.");
    return [];
  }
}

function saveAssignments() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
    return true;
  } catch {
    showToast("Your change could not be saved. Check that browser storage is available.");
    return false;
  }
}

function formatDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDueDateDetails(dueDate) {
  if (!dueDate) return { text: "No due date", className: "no-date" };

  const [year, month, day] = dueDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const difference = Math.round((dateOnly - todayDate) / 86_400_000);
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);

  if (difference < 0) return { text: `Overdue · ${formattedDate}`, className: "overdue" };
  if (difference === 0) return { text: "Due today", className: "due-today" };
  if (difference === 1) return { text: "Due tomorrow", className: "" };
  return { text: `Due ${formattedDate}`, className: "" };
}

function createIcon(markup) {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = markup;
  return icon;
}

function createAssignmentRow(assignment) {
  const row = document.createElement("article");
  row.className = `assignment-row${assignment.completed ? " is-completed" : ""}`;

  const checkButton = document.createElement("button");
  checkButton.className = "assignment-check";
  checkButton.type = "button";
  checkButton.setAttribute("aria-pressed", String(assignment.completed));
  checkButton.setAttribute(
    "aria-label",
    `${assignment.completed ? "Mark as not done" : "Mark as done"}: ${assignment.title}`,
  );
  if (assignment.completed) {
    checkButton.append(createIcon('<path d="m5 12 4 4L19 6"/>'));
  }
  checkButton.addEventListener("click", () => toggleAssignment(assignment.id));

  const info = document.createElement("div");
  info.className = "assignment-info";
  const name = document.createElement("p");
  name.className = "assignment-name";
  name.textContent = assignment.title;
  const course = document.createElement("p");
  course.className = "assignment-course";
  course.textContent = assignment.course;
  info.append(name, course);

  const due = document.createElement("span");
  const dueDetails = getDueDateDetails(assignment.dueDate);
  due.className = `due-label${dueDetails.className ? ` ${dueDetails.className}` : ""}`;
  due.append(createIcon('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M8 3.5v3M16 3.5v3M4 9.5h16"/>'));
  const dueText = document.createElement("span");
  dueText.textContent = dueDetails.text;
  due.append(dueText);

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", `Delete ${assignment.title}`);
  deleteButton.append(createIcon('<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/>'));
  deleteButton.addEventListener("click", () => deleteAssignment(assignment.id));

  row.append(checkButton, info, due, deleteButton);
  return row;
}

function getVisibleAssignments() {
  const filtered = assignments.filter((assignment) => {
    if (activeFilter === "active") return !assignment.completed;
    if (activeFilter === "completed") return assignment.completed;
    return true;
  });

  return filtered.sort((first, second) => {
    if (first.completed !== second.completed) return Number(first.completed) - Number(second.completed);
    if (first.dueDate && second.dueDate) return first.dueDate.localeCompare(second.dueDate);
    if (first.dueDate) return -1;
    if (second.dueDate) return 1;
    return 0;
  });
}

function render() {
  const visibleAssignments = getVisibleAssignments();
  const todoCount = assignments.filter((assignment) => !assignment.completed).length;
  const completedCount = assignments.length - todoCount;
  const hasVisibleAssignments = visibleAssignments.length > 0;

  document.querySelector("#total-count").textContent = assignments.length;
  document.querySelector("#todo-count").textContent = todoCount;
  document.querySelector("#completed-count").textContent = completedCount;
  document.querySelector("#nav-count").textContent = todoCount;
  document.querySelector("#list-total").textContent = visibleAssignments.length;
  document.querySelector("#progress-label").textContent = assignments.length
    ? `${Math.round((completedCount / assignments.length) * 100)}% of your list complete`
    : "A fresh start";
  document.querySelector("#remaining-label").textContent = todoCount
    ? `${todoCount} ${todoCount === 1 ? "assignment" : "assignments"} left`
    : assignments.length ? "All caught up!" : "";

  list.replaceChildren(...visibleAssignments.map(createAssignmentRow));
  list.hidden = !hasVisibleAssignments;
  emptyState.hidden = hasVisibleAssignments;
  listFooter.hidden = !assignments.length;

  if (!assignments.length) {
    emptyTitle.textContent = "Your to-do list is a blank canvas.";
    emptyCopy.textContent = "Add your first assignment and we’ll help you keep track of it.";
  } else if (!hasVisibleAssignments) {
    emptyTitle.textContent = activeFilter === "completed" ? "Nothing completed just yet." : "You’re all caught up!";
    emptyCopy.textContent = activeFilter === "completed"
      ? "Finish an assignment and check it off to see it here."
      : "No assignments left to do. Enjoy the breathing room.";
  }
}

function toggleAssignment(id) {
  const index = assignments.findIndex((assignment) => assignment.id === id);
  if (index === -1) return;

  assignments[index] = { ...assignments[index], completed: !assignments[index].completed };
  if (!saveAssignments()) {
    assignments[index] = { ...assignments[index], completed: !assignments[index].completed };
    return;
  }
  render();
}

function deleteAssignment(id) {
  const previous = assignments;
  assignments = assignments.filter((assignment) => assignment.id !== id);
  if (!saveAssignments()) {
    assignments = previous;
    return;
  }
  render();
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 4500);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  formError.classList.remove("visible");
  formError.textContent = "";

  const title = titleInput.value.trim();
  const course = courseInput.value.trim();
  const dueDate = dueDateInput.value;
  if (!title || !course) {
    formError.textContent = "Add an assignment name and class to continue.";
    formError.classList.add("visible");
    return;
  }

  const assignment = {
    id: crypto.randomUUID(),
    title,
    course,
    dueDate,
    completed: false,
  };
  assignments.unshift(assignment);
  if (!saveAssignments()) {
    assignments.shift();
    return;
  }

  activeFilter = "all";
  document.querySelectorAll(".filter-button").forEach((button) => {
    const selected = button.dataset.filter === activeFilter;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  form.reset();
  render();
  titleInput.focus();
});

document.querySelectorAll(".filter-button").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".filter-button").forEach((filterButton) => {
      const selected = filterButton === button;
      filterButton.classList.toggle("selected", selected);
      filterButton.setAttribute("aria-pressed", String(selected));
    });
    render();
  });
});

document.querySelector("#empty-add-button").addEventListener("click", () => titleInput.focus());

render();