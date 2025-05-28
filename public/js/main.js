async function fetchData(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Fetch error:", error);
    if (
      error instanceof TypeError &&
      error.message.includes("Failed to parse URL")
    ) {
      console.error(
        "Possible cause: The HTML file might be opened directly from your file system (e.g., file:/// or blob:). For the PHP backend to work, you need to run this application using a web server (like PHP's built-in server, Apache, or Nginx)."
      );
    }
    return null;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const classSelect = document.getElementById("class-select");
  const lessonPlanTableBody = document.querySelector(
    "#lesson-plan-table tbody"
  );
  const saveLessonPlanBtn = document.getElementById("save-lesson-plan-btn");
  const showSavedDataBtn = document.getElementById("show-saved-data-btn");
  const savedDataDisplay = document.getElementById("saved-data-display");
  const savedDataTableBody = document.querySelector("#saved-data-table tbody");
  const savedDataTitle = document.getElementById("saved-data-title");

  // Populate unique classes on page load
  const classes = await fetchData("./api/api.php?action=getClasses");
  if (classes) {
    classes.forEach((cls) => {
      const option = document.createElement("option");
      option.value = cls;
      option.textContent = cls;
      classSelect.appendChild(option);
    });
  }

  // Generate table rows initially (8 periods, 5 days)
  for (let i = 1; i <= 8; i++) {
    const row = document.createElement("tr");
    row.setAttribute("data-previous-day1-subject", ""); // Used for Day 1 propagation
    row.innerHTML = `<td>${i}</td><td><p class="table-row-subject-display">---</p></td><td><select class="table-subject-select" data-day="day1"><option value="">--Select Subject--</option></select></td><td><select class="table-subject-select" data-day="day2"><option value="">--Select Subject--</option></select></td><td><select class="table-subject-select" data-day="day3"><option value="">--Select Subject--</option></select></td><td><select class="table-subject-select" data-day="day4"><option value="">--Select Subject--</option></select></td><td><select class="table-subject-select" data-day="day5"><option value="">--Select Subject--</option></select></td><td class="table-teacher-name">---</td>`;
    lessonPlanTableBody.appendChild(row);
  }

  const tableSubjectSelects = document.querySelectorAll(
    ".table-subject-select"
  );
  const tableTeacherNames = document.querySelectorAll(".table-teacher-name");

  // Function to populate subject dropdowns
  function populateSubjectDropdowns(subjects) {
    tableSubjectSelects.forEach((select) => {
      select.innerHTML = '<option value="">--Select Subject--</option>';
      select.disabled = true; // Disable until a class is selected and subjects are loaded
    });
    if (subjects && subjects.length > 0) {
      subjects.forEach((subject) => {
        tableSubjectSelects.forEach((select) => {
          const option = document.createElement("option");
          option.value = subject;
          option.textContent = subject;
          select.appendChild(option);
        });
      });
      tableSubjectSelects.forEach((select) => (select.disabled = false));
    }
  }

  // Function to update subjects and teachers display for a given row
  async function updateRowDisplay(row, selectedClass) {
    const teacherCell = row.querySelector(".table-teacher-name");
    const mainSubjectDisplay = row.querySelector(".table-row-subject-display");
    const allSelectsInRow = row.querySelectorAll(".table-subject-select");
    const uniqueSubjectsInRow = new Set();
    const uniqueTeachersInRow = new Set();

    for (const selectElement of allSelectsInRow) {
      const selectedSubjectInDay = selectElement.value;
      if (selectedSubjectInDay && selectedClass) {
        uniqueSubjectsInRow.add(selectedSubjectInDay);
        const teacherInfo = await fetchData(
          `./api/api.php?action=getTeacher&class=${encodeURIComponent(
            selectedClass
          )}&subject=${encodeURIComponent(selectedSubjectInDay)}`
        );
        if (teacherInfo && teacherInfo.teacher) {
          uniqueTeachersInRow.add(teacherInfo.teacher);
        }
      }
    }
    mainSubjectDisplay.textContent =
      uniqueSubjectsInRow.size > 0
        ? Array.from(uniqueSubjectsInRow).join(", ")
        : "---";
    teacherCell.textContent =
      uniqueTeachersInRow.size > 0
        ? Array.from(uniqueTeachersInRow).join(", ")
        : "---";
  }

  // Handle class selection change
  classSelect.addEventListener("change", async () => {
    const selectedClass = classSelect.value;
    const selectedWeek = 8; // Hardcoded week

    // Reset all table teacher names and main subject displays
    tableTeacherNames.forEach((span) => (span.textContent = "---"));
    document
      .querySelectorAll(".table-row-subject-display")
      .forEach((p) => (p.textContent = "---"));

    // Clear all subject selections in the table and reset data-previous-day1-subject
    document.querySelectorAll("#lesson-plan-table tbody tr").forEach((row) => {
      row.dataset.previousDay1Subject = "";
      row.querySelectorAll(".table-subject-select").forEach((select) => {
        select.value = "";
      });
    });

    savedDataDisplay.style.display = "none"; // Hide saved data when class changes
    savedDataTableBody.innerHTML = ""; // Clear saved data table

    if (selectedClass) {
      // Fetch subjects for the selected class
      const classInfo = await fetchData(
        `./api/api.php?action=getSubjects&class=${encodeURIComponent(
          selectedClass
        )}`
      );
      if (classInfo && classInfo.subjects) {
        populateSubjectDropdowns(classInfo.subjects);
      } else {
        populateSubjectDropdowns([]);
      }

      // Fetch and populate timetable data for the selected class and hardcoded week 8
      const timetableData = await fetchData(
        `./api/api.php?action=getLessonPlan&class=${encodeURIComponent(
          selectedClass
        )}&week=${selectedWeek}` // Pass week
      );
      if (timetableData && timetableData.length > 0) {
        timetableData.forEach((dataRow) => {
          const period = dataRow.period;
          const rowElement = lessonPlanTableBody.querySelector(
            `tr:nth-child(${period})`
          );
          if (rowElement) {
            const daySelects = rowElement.querySelectorAll(
              ".table-subject-select"
            );
            const dayColumns = ["day1", "day2", "day3", "day4", "day5"];
            daySelects.forEach((select, index) => {
              const subjectForDay = dataRow[dayColumns[index]];
              if (subjectForDay) {
                select.value = subjectForDay;
              } else {
                select.value = "";
              }
            });
            // Set the main subject and teacher directly from fetched data (using 'subject' and 'teacher')
            rowElement.querySelector(".table-row-subject-display").textContent =
              dataRow.subject || "---"; // Now 'subject'
            rowElement.querySelector(".table-teacher-name").textContent =
              dataRow.teacher || "---"; // Now 'teacher'

            // Update data-previous-day1-subject for Day 1 propagation logic
            const firstDaySelectValue = rowElement.querySelector(
              '.table-subject-select[data-day="day1"]'
            ).value;
            rowElement.dataset.previousDay1Subject = firstDaySelectValue;
          }
        });
      }
      // If no timetable data is found, the table remains cleared, ready for new input.
    } else {
      populateSubjectDropdowns([]); // Clear if no class selected
    }
  });

  // Handle subject selection change in the table rows
  lessonPlanTableBody.addEventListener("change", async (event) => {
    if (event.target.classList.contains("table-subject-select")) {
      const selectedClass = classSelect.value;
      const changedSelect = event.target;
      const row = changedSelect.closest("tr");

      if (changedSelect.dataset.day === "day1") {
        // Check if the changed dropdown is Day 1
        const newDay1Subject = changedSelect.value;
        const previousDay1Subject = row.dataset.previousDay1Subject || "";
        const allSelectsInRow = row.querySelectorAll(".table-subject-select");

        for (let i = 1; i < allSelectsInRow.length; i++) {
          // Loop from Day 2 (index 1) to Day 5 (index 4)
          const daySelect = allSelectsInRow[i];
          if (
            daySelect.value === "" ||
            daySelect.value === previousDay1Subject
          ) {
            daySelect.value = newDay1Subject;
          }
        }
        row.dataset.previousDay1Subject = newDay1Subject;
      }
      await updateRowDisplay(row, selectedClass); // Recalculate and update derived subject/teacher
    }
  });

  // --- Save Lesson Plan Button Logic ---
  saveLessonPlanBtn.addEventListener("click", async () => {
    const selectedClass = classSelect.value;
    const selectedWeek = 8; // Hardcoded week for saving

    if (!selectedClass) {
      alert("Please select a class before saving the timetable!");
      return;
    }

    const timetableToSave = [];
    const rows = lessonPlanTableBody.querySelectorAll("tr");
    const dayColumns = ["day1", "day2", "day3", "day4", "day5"];

    for (const row of rows) {
      const period = parseInt(row.querySelector("td:first-child").textContent);
      const subjects = row.querySelector("td:nth-child(2)").textContent;
      const teachers = row.querySelector("td:last-child").textContent;
      const rowData = {
        class: selectedClass,
        week: selectedWeek, // Include week
        period: period,
        subjects: subjects,
        teachers: teachers,
      };

      // Get the derived subjects and teachers from the display cells (now using 'subject' and 'teacher' keys)
      rowData.subjects = row.querySelector(
        ".table-row-subject-display"
      ).textContent;
      rowData.teachers = row.querySelector(".table-teacher-name").textContent;

      row.querySelectorAll(".table-subject-select").forEach((select) => {
        rowData[select.dataset.day] = select.value || null; // Use null if no subject selected
      });
      timetableToSave.push(rowData);
    }

    const response = await fetch("./api/api.php?action=saveLessonPlan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(timetableToSave),
    });

    const result = await response.json();
    if (result.success) {
      alert(result.message);
    } else {
      alert("Error saving timetable: " + result.error);
      console.error("Save error details:", result.error);
    }
  });

  // --- Show Saved Data Button Logic ---
  showSavedDataBtn.addEventListener("click", async () => {
    const selectedClass = classSelect.value;
    const selectedWeek = 8; // Hardcoded week for fetching

    if (!selectedClass) {
      alert("Please select a class first!");
      return;
    }

    // Update title with class and week
    savedDataTitle.textContent = `Timetable for Class (${selectedClass}), Week No. ${selectedWeek}`;

    // Fetch data for the selected class and week
    const fetchedTimetableData = await fetchData(
      `./api/api.php?action=getLessonPlan&class=${encodeURIComponent(
        selectedClass
      )}&week=${selectedWeek}`
    ); // Pass week
    savedDataTableBody.innerHTML = "";

    if (!fetchedTimetableData || fetchedTimetableData.length === 0) {
      const noDataRow = document.createElement("tr");
      noDataRow.innerHTML = `<td colspan="8" class="text-center text-gray-500">No timetable data found for this class and week.</td>`;
      savedDataTableBody.appendChild(noDataRow);
    } else {
      // Use an object to store separate counters for each subject type
      const subjectInstanceCounters = {};

      for (const item of fetchedTimetableData) {
        const row = document.createElement("tr");

        // Prepare day cells with numbering unique to each subject
        const dayCells = ["day1", "day2", "day3", "day4", "day5"]
          .map((dayCol) => {
            let subject = item[dayCol] || "---";
            if (subject !== "---" && subject !== "") {
              // Initialize counter for this specific subject if it doesn't exist
              if (!subjectInstanceCounters[subject]) {
                subjectInstanceCounters[subject] = 0;
              }
              subjectInstanceCounters[subject]++; // Increment counter for this subject
              subject = `(${subjectInstanceCounters[subject]}) ${subject}`; // Format: (1) SubjectName
            }
            return `<td>${subject}</td>`;
          })
          .join("");

        // Use the stored 'subject' and 'teacher' directly from the lessons table
        row.innerHTML = `<td>${item.period}</td><td>${
          item.subject || "---"
        }</td>${dayCells}<td>${item.teacher || "---"}</td>`;
        savedDataTableBody.appendChild(row);
      }
    }
    savedDataDisplay.style.display = "block";
  });
});
