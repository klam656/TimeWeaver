const { urlToJSON } = require("../helpers/icalToJSON");
const converter = require("../helpers/converter");
const onDisplay = require("../helpers/onDisplay");
const combine = require("../helpers/combine");
const { NO_CALENDAR_SELECTED } = require("../constants/strings");
const { selectCurrentWeek } = require("./selectCurrentWeek");
const { addManualModal, addIcalModal, formatModal } = require("./modals");
const CalendarStore = require("../store/CalendarStore").instance();
const { calendarCellSchema } = require("../schemas/calendar");

/** HTML Element Declarations */
const title = document.getElementById("calendar-title");
const icalName = document.getElementById("ical-name-input");
const icalInput = document.getElementById("ical-link-input");
const manualName = document.getElementById("manual-name-input");
const dynamicSection = document.getElementById("dynamic-tabs");

/** Mapping buttons to their onClick functions */
document
  .getElementById("add-calendar-modal-open")
  .addEventListener("click", addCalendar);
document
  .getElementById("view-combination-button")
  .addEventListener("click", viewCombinedCalendar);
document.getElementById("upload-ical").addEventListener("click", uploadIcal);
document
  .getElementById("upload-manual")
  .addEventListener("click", uploadManual);
document
  .getElementById("setup-new-calendar-manual")
  .addEventListener("click", () => {
    setupNewManual(CalendarStore.selectedCalList);
  });
document
  .getElementById("setup-new-calendar-ical")
  .addEventListener("click", () => {
    setupNewIcal(CalendarStore.selectedCalList);
  });

/** List of Occupied Calendar Cells */
let cellList = [];
/** Whether the user has opened the "add a new Manual Calendar" Modal before */
let hasInitializedManual = false;

/** Handles the Display of the Given Individual Calendar When Nav Element is Clicked */
function openCalendar(name) {
  title.textContent = name + "'s Calendar";

  const [userInfo] = CalendarStore.selectedCalList.filter(
    (x) => x.user === name,
  );

  onDisplay(userInfo.calendarJson, 1);
}

/**
 * Shows an empty calendar
 */
function resetCalendar() {
  title.textContent = NO_CALENDAR_SELECTED;
  onDisplay(JSON.stringify({ cells: [] }), 0);
}

function addCalendar() {
  formatModal.modal("show");
}

function uploadIcal() {
  formatModal.modal("hide");
  addIcalModal.modal("show");
}

function uploadManual() {
  formatModal.modal("hide");
  addManualModal.modal("show");
  initializeCellListeners();
}

/** Handles the Display of the Combined Calendar When Nav Element is Clicked */
function viewCombinedCalendar() {
  const calList = CalendarStore.selectedCalList;
  title.textContent = "Combined Calendar";
  let combination = { cells: [] };

  for (let cal in calList) {
    const obj = calList[cal];
    combination = combine(combination, JSON.parse(obj.calendarJson));
  }

  onDisplay(JSON.stringify(combination), calList.length);
}

/** Handles the setup of a new Calendar based on the Ical Link */
async function setupNewIcal(calList) {
  addIcalModal.modal("hide");

  const icalUrl = icalInput.value;
  const json = await urlToJSON(icalUrl);

  const actual = selectCurrentWeek(json);

  const formatted = actual.map((x) => {
    return {
      start: applyNewFormat(x.start),
      end: applyNewFormat(x.end),
    };
  });

  const userJson = converter(
    JSON.stringify({ events: formatted }),
    icalName.value,
  );

  CalendarStore.addCalendar(calList, {
    user: icalName.value,
    icalUrl: icalInput.value,
    calendarJson: userJson,
  });

  icalName.value = "";
  icalInput.value = "";
  updateCalList();
}

/** Converts Date Format used by Ical into Date Format used by the converter function */
function applyNewFormat(date) {
  const arr = date.split(" ");
  const output = `${arr[0]} ${arr[3]} ${arr[4]}`;
  return output;
}

/** Handles setup of a new Calendar based on the Manual Input */
function setupNewManual(calList) {
  addManualModal.modal("hide");

  const cells = cellList.map((cell) => {
    return calendarCellSchema.parse({
      id: cell,
      users: [manualName.value],
      numPeople: 1,
    });
  });

  cellList = [];

  CalendarStore.addCalendar(calList, {
    user: manualName.value,
    icalUrl: "",
    calendarJson: JSON.stringify({ cells: cells }),
  });
  manualName.value = "";

  updateCalList();
}

/** Updates the Top Navigation based on the current Calendar List */
function updateCalList() {
  const calList = CalendarStore.selectedCalList;

  // Remove all the calendar items
  $(dynamicSection).children(".calendar-select").remove();

  const referenceNode = dynamicSection.children[1];

  // Creates new entry in the top navigation for each calendar
  for (let i = 0; i < calList.length; i++) {
    const title = document.createElement("span");
    title.innerHTML = calList[i].user;

    const button = document.createElement("button");
    button.setAttribute("class", "calendar-select item focus-border");
    button.appendChild(title);
    button.addEventListener("click", function () {
      openCalendar(calList[i].user);
    });

    dynamicSection.insertBefore(button, referenceNode);
  }
}

/** Adds listeners to Item Cells that trigger when the cell is clicked (used for manual calendar addition) */
function initializeCellListeners() {
  cellList = [];

  const table = document.getElementById("calendar-table");
  const rows = table.getElementsByTagName("tr");
  for (const row of rows) {
    const rowCells = row.getElementsByTagName("td");

    for (const cell of rowCells) {
      // Classes are used for indicating whether a cell is selected or not
      cell.classList.remove("cellSelected");
      cell.style.backgroundColor = null;

      if (!hasInitializedManual) {
        cell.addEventListener("click", function () {
          setCell(cell);
          hasInitializedManual = true;
        });
      }
    }
  }
}

/** Dictates functionality of Manual Cell when it is clicked */
function setCell(cell) {
  const id = cell.id;

  if (cell.classList.contains("cellSelected")) {
    cell.classList.remove("cellSelected");
    cell.style.backgroundColor = null;
    cellList = cellList.filter((x) => x != id); // Convoluted way of removing the cell from the cellList array
  } else {
    cell.classList.add("cellSelected");
    cell.style.backgroundColor = "purple";
    cellList.push(id);
  }
}

module.exports = {
  updateCalList,
  setupNewIcal,
  setupNewManual,
  addCalendar,
  viewCombinedCalendar,
  uploadIcal,
  uploadManual,
  openCalendar,
  cellList,
  setCell,
  resetCalendar,
  initializeCellListeners,
};