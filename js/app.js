
const WORKOUTS_KEY = "fittrack_workouts";
const GOALS_KEY = "fittrack_goals";

function readData(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function safeText(value) {
  const span = document.createElement("span");
  span.textContent = String(value ?? "");
  return span.innerHTML;
}

function getWorkouts() {
  return readData(WORKOUTS_KEY);
}

function getGoals() {
  return readData(GOALS_KEY);
}

function showDate(value) {
  if (!value) return "—";
  const date = new Date(value + "T12:00:00");
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getMinutes() {
  return getWorkouts().reduce(
    (sum, workout) => sum + Number(workout.duration || 0), 0
  );
}

function goalProgress(goal) {
  const workouts = getWorkouts();

  if (goal.unit === "minutes") {
    return getMinutes() + Number(goal.manualProgress || 0);
  }

  if (goal.unit === "runs") {
    return workouts.filter(workout =>
      /run|track/i.test(workout.activity)
    ).length + Number(goal.manualProgress || 0);
  }

  return workouts.length + Number(goal.manualProgress || 0);
}

function goalCard(goal, showButtons = false) {
  const current = goalProgress(goal);
  const target = Number(goal.target);
  const percent = Math.min(100, Math.round(current / target * 100));

  return `
    <div class="${showButtons ? "" : "col-12 col-md-4"}">
      <div class="goal-card">
        <h3>${safeText(goal.name)}</h3>
        <p class="goal-meta">
          ${current} of ${target} ${safeText(goal.unit)} (${percent}%)
        </p>
        <div class="progress">
          <div class="progress-bar"
               style="width:${percent}%"
               role="progressbar"
               aria-valuenow="${percent}"
               aria-valuemin="0"
               aria-valuemax="100"></div>
        </div>
        ${showButtons ? `
          <div class="goal-actions">
            <button class="btn btn-sm btn-outline-dark goal-add"
                    data-id="${safeText(goal.id)}" type="button">
              + Add progress
            </button>
            <button class="btn btn-sm btn-outline-danger goal-delete"
                    data-id="${safeText(goal.id)}" type="button">
              Delete
            </button>
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

function renderHome() {
  const workouts = getWorkouts();
  const goals = getGoals();

  const totalWorkouts = document.getElementById("totalWorkouts");
  const totalMinutes = document.getElementById("totalMinutes");
  const totalGoals = document.getElementById("totalGoals");

  if (totalWorkouts) totalWorkouts.textContent = workouts.length;
  if (totalMinutes) totalMinutes.textContent = getMinutes();
  if (totalGoals) totalGoals.textContent = goals.length;

  const recent = document.getElementById("recentWorkouts");

  if (recent) {
    const sorted = [...workouts].sort((a, b) =>
      b.date.localeCompare(a.date)
    ).slice(0, 5);

    recent.innerHTML = sorted.length
      ? sorted.map(workout => `
          <tr>
            <td>${showDate(workout.date)}</td>
            <td>${safeText(workout.activity)}</td>
            <td>${Number(workout.duration)} min</td>
            <td>${safeText(workout.notes || "—")}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="4" class="empty-state">
           No workouts yet. Add your first workout!
         </td></tr>`;
  }

  const homeGoals = document.getElementById("homeGoals");

  if (homeGoals) {
    homeGoals.innerHTML = goals.length
      ? goals.slice(0, 3).map(goal => goalCard(goal)).join("")
      : `<div class="col-12"><p class="empty-state">
           No goals yet. Add a goal to get started.
         </p></div>`;
  }
}

function renderWorkoutHistory() {
  const history = document.getElementById("workoutHistory");
  if (!history) return;

  const workouts = [...getWorkouts()].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  history.innerHTML = workouts.length
    ? workouts.map(workout => `
        <tr>
          <td>${showDate(workout.date)}</td>
          <td>${safeText(workout.activity)}</td>
          <td>${Number(workout.duration)} min</td>
          <td>${safeText(workout.notes || "—")}</td>
          <td>
            <button class="btn btn-sm btn-outline-danger delete-workout"
                    data-id="${safeText(workout.id)}" type="button">
              Delete
            </button>
          </td>
        </tr>
      `).join("")
    : `<tr><td colspan="5" class="empty-state">
         No workouts saved yet.
       </td></tr>`;
}

function renderProgress() {
  const workouts = getWorkouts();

  const count = document.getElementById("progressWorkouts");
  const minutes = document.getElementById("progressMinutes");
  const favorite = document.getElementById("favoriteActivity");

  if (count) count.textContent = workouts.length;
  if (minutes) minutes.textContent = getMinutes();

  if (favorite) {
    const counts = {};

    workouts.forEach(workout => {
      counts[workout.activity] = (counts[workout.activity] || 0) + 1;
    });

    favorite.textContent = Object.keys(counts).sort(
      (a, b) => counts[b] - counts[a]
    )[0] || "—";
  }

  const chart = document.getElementById("weeklyChart");

  if (chart) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const weeks = [];

    for (let i = 3; i >= 0; i--) {
      const end = new Date(today);
      end.setDate(today.getDate() - i * 7);

      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      start.setHours(0, 0, 0, 0);

      const total = workouts.filter(workout => {
        const date = new Date(workout.date + "T12:00:00");
        return date >= start && date <= end;
      }).reduce((sum, workout) =>
        sum + Number(workout.duration || 0), 0
      );

      weeks.push({
        label: i === 0 ? "This week" : `${i} wk${i > 1 ? "s" : ""} ago`,
        minutes: total
      });
    }

    const max = Math.max(...weeks.map(week => week.minutes), 1);

    chart.innerHTML = workouts.length
      ? weeks.map(week => {
          const height = Math.max(4, Math.round(week.minutes / max * 145));

          return `
            <div class="chart-column">
              <span class="chart-value">${week.minutes} min</span>
              <div class="chart-bar"
                   style="height:${height}px"
                   role="img"
                   aria-label="${week.minutes} active minutes"></div>
              <span class="chart-label">${week.label}</span>
            </div>
          `;
        }).join("")
      : `<p class="empty-state">Add workouts to see your chart.</p>`;
  }

  const progressGoals = document.getElementById("progressGoals");

  if (progressGoals) {
    const goals = getGoals();

    progressGoals.innerHTML = goals.length
      ? goals.map(goal => goalCard(goal)).join("")
      : `<div class="col-12"><p class="empty-state">
           Add a goal to see your progress.
         </p></div>`;
  }
}

function renderGoals() {
  const list = document.getElementById("goalsList");
  if (!list) return;

  const goals = getGoals();

  list.innerHTML = goals.length
    ? goals.map(goal => goalCard(goal, true)).join("")
    : `<p class="empty-state">No goals yet. Add your first goal!</p>`;
}

function refreshPage() {
  renderHome();
  renderWorkoutHistory();
  renderProgress();
  renderGoals();
}

document.addEventListener("DOMContentLoaded", () => {
  const dateInput = document.getElementById("workoutDate");

  if (dateInput) {
    const today = new Date();
    const localDate = new Date(
      today.getTime() - today.getTimezoneOffset() * 60000
    );
    dateInput.value = localDate.toISOString().slice(0, 10);
  }

  const workoutForm = document.getElementById("workoutForm");

  if (workoutForm) {
    workoutForm.addEventListener("submit", event => {
      event.preventDefault();

      const activity = document.getElementById("activity").value;
      const date = document.getElementById("workoutDate").value;
      const duration = Number(document.getElementById("duration").value);
      const notes = document.getElementById("notes").value.trim();

      if (!activity || !date || !Number.isFinite(duration) || duration < 1) {
        return;
      }

      const workouts = getWorkouts();

      workouts.push({
        id: String(Date.now()) + Math.random().toString(16).slice(2),
        activity,
        date,
        duration,
        notes
      });

      saveData(WORKOUTS_KEY, workouts);
      workoutForm.reset();

      if (dateInput) {
        const today = new Date();
        const localDate = new Date(
          today.getTime() - today.getTimezoneOffset() * 60000
        );
        dateInput.value = localDate.toISOString().slice(0, 10);
      }

      document.getElementById("formMessage").textContent = "Workout saved!";
      refreshPage();
    });
  }

  const history = document.getElementById("workoutHistory");

  if (history) {
    history.addEventListener("click", event => {
      const button = event.target.closest(".delete-workout");
      if (!button) return;

      saveData(WORKOUTS_KEY, getWorkouts().filter(
        workout => workout.id !== button.dataset.id
      ));

      refreshPage();
    });
  }

  const clearButton = document.getElementById("clearWorkouts");

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      if (getWorkouts().length && confirm("Delete all saved workouts?")) {
        saveData(WORKOUTS_KEY, []);
        refreshPage();
      }
    });
  }

  const goalForm = document.getElementById("goalForm");

  if (goalForm) {
    goalForm.addEventListener("submit", event => {
      event.preventDefault();

      const name = document.getElementById("goalName").value.trim();
      const target = Number(document.getElementById("goalTarget").value);
      const unit = document.getElementById("goalUnit").value;

      if (!name || !Number.isFinite(target) || target < 1) return;

      const goals = getGoals();

      goals.push({
        id: String(Date.now()) + Math.random().toString(16).slice(2),
        name,
        target,
        unit,
        manualProgress: 0
      });

      saveData(GOALS_KEY, goals);
      goalForm.reset();
      document.getElementById("goalMessage").textContent = "Goal added!";
      refreshPage();
    });
  }

  const goalsList = document.getElementById("goalsList");

  if (goalsList) {
    goalsList.addEventListener("click", event => {
      const addButton = event.target.closest(".goal-add");
      const deleteButton = event.target.closest(".goal-delete");

      if (addButton) {
        const goals = getGoals();
        const goal = goals.find(item => item.id === addButton.dataset.id);

        if (goal) {
          goal.manualProgress = Number(goal.manualProgress || 0) + 1;
          saveData(GOALS_KEY, goals);
          refreshPage();
        }
      }

      if (deleteButton) {
        saveData(GOALS_KEY, getGoals().filter(
          goal => goal.id !== deleteButton.dataset.id
        ));

        refreshPage();
      }
    });
  }

  refreshPage();
});