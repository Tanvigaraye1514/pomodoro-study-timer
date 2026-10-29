"use strict"

// ---------------------------------------------------------------------------
// Configuration and saved-data helpers
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS = {
  focus: 25,
  break: 5,
  longBreak: 15,
}

const STORAGE_KEYS = {
  settings: "pomo-settings",
  sessions: "pomo-daily-sessions",
  timer: "pomo-timer",
  intention: "pomo-intention",
}

const MODE_DETAILS = {
  focus: {
    label: "Focus session",
    title: "Time to focus",
    helper: "Quiet the noise. One task at a time.",
    pageColor: "#fff5f0",
  },
  break: {
    label: "Short break",
    title: "Take a breather",
    helper: "Step away, stretch, and reset.",
    pageColor: "#f2fbf8",
  },
  longBreak: {
    label: "Long break",
    title: "Recharge fully",
    helper: "You earned this. Come back refreshed.",
    pageColor: "#f5f2ff",
  },
}

function getTodayKey() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function isValidNumber(value, minimum, maximum) {
  return Number.isInteger(value) && value >= minimum && value <= maximum
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings))
    if (
      saved &&
      isValidNumber(saved.focus, 1, 120) &&
      isValidNumber(saved.break, 1, 60) &&
      isValidNumber(saved.longBreak, 1, 90)
    ) {
      return saved
    }
  } catch (error) {
    console.warn("Saved timer settings could not be read.", error)
  }

  return { ...DEFAULT_SETTINGS }
}

function loadDailySessions() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.sessions))
    if (
      saved &&
      saved.date === getTodayKey() &&
      Number.isInteger(saved.count) &&
      saved.count >= 0
    ) {
      return saved.count
    }
  } catch (error) {
    console.warn("Saved session count could not be read.", error)
  }

  return 0
}

function saveDailySessions() {
  localStorage.setItem(
    STORAGE_KEYS.sessions,
    JSON.stringify({
      date: getTodayKey(),
      count: state.completedSessions,
    }),
  )
}

function getDurationInSeconds(mode) {
  return state.settings[mode] * 60
}

// ---------------------------------------------------------------------------
// Application state
// ---------------------------------------------------------------------------

const state = {
  settings: loadSettings(),
  mode: "focus",
  remainingSeconds: 0,
  running: false,
  endTime: null,
  completedSessions: loadDailySessions(),
}

state.remainingSeconds = getDurationInSeconds("focus")

function restoreTimer() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.timer))
    const validModes = ["focus", "break", "longBreak"]

    if (
      !saved ||
      !validModes.includes(saved.mode) ||
      !Number.isFinite(saved.remainingSeconds) ||
      saved.remainingSeconds < 0
    ) {
      return
    }

    state.mode = saved.mode
    state.remainingSeconds = Math.round(saved.remainingSeconds)

    if (saved.running && Number.isFinite(saved.endTime)) {
      const secondsLeft = Math.ceil((saved.endTime - Date.now()) / 1000)
      if (secondsLeft > 0) {
        state.running = true
        state.endTime = saved.endTime
        state.remainingSeconds = secondsLeft
      }
    }
  } catch (error) {
    console.warn("Saved timer state could not be read.", error)
  }
}

function saveTimer() {
  localStorage.setItem(
    STORAGE_KEYS.timer,
    JSON.stringify({
      mode: state.mode,
      remainingSeconds: state.remainingSeconds,
      running: state.running,
      endTime: state.endTime,
    }),
  )
}

restoreTimer()

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------

const elements = {
  app: document.querySelector("#app"),
  modeLabel: document.querySelector("#mode-label"),
  modeTitle: document.querySelector("#mode-title"),
  modeHelper: document.querySelector("#mode-helper"),
  modeButtons: document.querySelectorAll("[data-mode]"),
  timeDisplay: document.querySelector("#time-display"),
  timerStatus: document.querySelector("#timer-status"),
  progressCircle: document.querySelector("#progress-circle"),
  startButton: document.querySelector("#start-button"),
  pauseButton: document.querySelector("#pause-button"),
  resetButton: document.querySelector("#reset-button"),
  skipButton: document.querySelector("#skip-button"),
  sessionCount: document.querySelector("#session-count"),
  sessionProgress: document.querySelector("#session-progress"),
  sessionHint: document.querySelector("#session-hint"),
  goalCount: document.querySelector("#goal-count"),
  goalProgress: document.querySelector("#goal-progress"),
  goalCopy: document.querySelector("#goal-copy"),
  intention: document.querySelector("#intention"),
  themeColor: document.querySelector('meta[name="theme-color"]'),
  settingsBackdrop: document.querySelector("#settings-backdrop"),
  settingsDialog: document.querySelector(".settings-modal"),
  openSettings: document.querySelector("#open-settings"),
  closeSettings: document.querySelector("#close-settings"),
  settingsForm: document.querySelector("#settings-form"),
  focusDuration: document.querySelector("#focus-duration"),
  breakDuration: document.querySelector("#break-duration"),
  longBreakDuration: document.querySelector("#long-break-duration"),
  formError: document.querySelector("#form-error"),
}

const circleRadius = 174
const circleCircumference = 2 * Math.PI * circleRadius
elements.progressCircle.style.strokeDasharray = circleCircumference

// ---------------------------------------------------------------------------
// Display updates
// ---------------------------------------------------------------------------

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function updateModeDisplay() {
  const details = MODE_DETAILS[state.mode]
  const modeClass = state.mode === "longBreak" ? "long-break" : state.mode

  elements.app.className = `app-shell ${modeClass}`
  elements.modeLabel.textContent = details.label
  elements.modeTitle.textContent = details.title
  elements.modeHelper.textContent = details.helper
  elements.themeColor.setAttribute("content", details.pageColor)

  elements.modeButtons.forEach(function (button) {
    button.classList.toggle("active", button.dataset.mode === state.mode)
  })
}

function updateTimerDisplay() {
  const formattedTime = formatTime(state.remainingSeconds)
  const totalDuration = getDurationInSeconds(state.mode)
  const progress = Math.min(
    1,
    Math.max(0, 1 - state.remainingSeconds / totalDuration),
  )

  elements.timeDisplay.textContent = formattedTime
  elements.timerStatus.textContent = state.running
    ? "stay with it"
    : "ready when you are"
  elements.progressCircle.style.strokeDashoffset =
    circleCircumference * (1 - progress)

  elements.startButton.disabled = state.running
  elements.pauseButton.disabled = !state.running
  document.title = `${formattedTime} · ${MODE_DETAILS[state.mode].label} | Pomo`
}

function createCheckIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6"></path>
    </svg>
  `
}

function updateSessionDisplay() {
  const count = state.completedSessions
  const sessionsInCurrentSet = count % 4
  const progressDots = elements.sessionProgress.querySelectorAll("span")

  elements.sessionCount.textContent = `${count} focus ${
    count === 1 ? "session" : "sessions"
  }`
  elements.sessionProgress.setAttribute(
    "aria-label",
    `${sessionsInCurrentSet} of 4 sessions`,
  )

  progressDots.forEach(function (dot, index) {
    const complete = index < sessionsInCurrentSet
    dot.classList.toggle("complete", complete)
    dot.innerHTML = complete ? createCheckIcon() : ""
  })

  elements.sessionHint.textContent =
    sessionsInCurrentSet === 0 && count > 0
      ? "Long break unlocked"
      : `${4 - sessionsInCurrentSet} until a long break`

  elements.goalCount.textContent = `${Math.min(count, 8)}/8`
  elements.goalProgress.style.width = `${Math.min(100, (count / 8) * 100)}%`
  elements.goalCopy.textContent =
    count >= 8 ? "Daily goal complete!" : `${8 - count} to hit today's goal`
}

function updateAllDisplays() {
  updateModeDisplay()
  updateTimerDisplay()
  updateSessionDisplay()
}

// ---------------------------------------------------------------------------
// Timer controls and automatic session switching
// ---------------------------------------------------------------------------

let audioContext = null
let lastDisplayedSecond = state.remainingSeconds

function prepareAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext

  if (AudioContextClass && !audioContext) {
    audioContext = new AudioContextClass()
  }

  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume()
  }
}


function playSessionSound() {
  // Always provide an alert, even if browser audio is unavailable.
  try {
    prepareAudio();

    if (audioContext && audioContext.state === "running") {
      const notes = [523.25, 659.25, 783.99];

      notes.forEach(function (frequency, index) {
        const delay = index * 0.18;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = frequency;

        gain.gain.setValueAtTime(
          0.0001,
          audioContext.currentTime + delay
        );
        gain.gain.exponentialRampToValueAtTime(
          0.18,
          audioContext.currentTime + delay + 0.02
        );
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          audioContext.currentTime + delay + 0.38
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(audioContext.currentTime + delay);
        oscillator.stop(audioContext.currentTime + delay + 0.4);
      });

      return;
    }
  } catch (error) {
    console.warn("Could not play session sound:", error);
  }

  window.alert("Your session has ended!");
}


function ensureCurrentDay() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.sessions))
    if (saved && saved.date !== getTodayKey()) {
      state.completedSessions = 0
      saveDailySessions()
      updateSessionDisplay()
    }
  } catch {
    state.completedSessions = 0
  }
}

function beginCurrentMode() {
  prepareAudio()

  if (state.remainingSeconds <= 0) {
    state.remainingSeconds = getDurationInSeconds(state.mode)
  }

  state.running = true
  state.endTime = Date.now() + state.remainingSeconds * 1000
  saveTimer()
  updateTimerDisplay()
}

function pauseTimer() {
  if (!state.running) {
    return
  }

  state.remainingSeconds = Math.max(
    0,
    Math.ceil((state.endTime - Date.now()) / 1000),
  )
  state.running = false
  state.endTime = null
  saveTimer()
  updateTimerDisplay()
}

function resetTimer() {
  state.running = false
  state.endTime = null
  state.remainingSeconds = getDurationInSeconds(state.mode)
  lastDisplayedSecond = state.remainingSeconds
  saveTimer()
  updateTimerDisplay()
}

function changeMode(newMode, shouldStart) {
  state.mode = newMode
  state.running = Boolean(shouldStart)
  state.remainingSeconds = getDurationInSeconds(newMode)
  state.endTime = shouldStart
    ? Date.now() + state.remainingSeconds * 1000
    : null
  lastDisplayedSecond = state.remainingSeconds
  saveTimer()
  updateAllDisplays()
}



function completeSession() {
  ensureCurrentDay();

  if (state.mode === "focus") {
    state.completedSessions += 1;
    saveDailySessions();
  }

  playSessionSound();

  if (state.mode === "focus") {
    const nextMode =
      state.completedSessions % 4 === 0
        ? "longBreak"
        : "break";

    changeMode(nextMode, true);
  } else {
    changeMode("focus", true);
  }
}


function skipSession() {
  const nextMode = state.mode === "focus" ? "break" : "focus"
  changeMode(nextMode, false)
}

function timerTick() {
  if (!state.running || !state.endTime) {
    return
  }

  const secondsLeft = Math.max(
    0,
    Math.ceil((state.endTime - Date.now()) / 1000),
  )

  if (secondsLeft !== lastDisplayedSecond) {
    state.remainingSeconds = secondsLeft
    lastDisplayedSecond = secondsLeft
    saveTimer()
    updateTimerDisplay()
  }

  if (secondsLeft === 0) {
    state.running = false
    state.endTime = null
    completeSession()
  }
}

// ---------------------------------------------------------------------------
// Settings dialog
// ---------------------------------------------------------------------------

function openSettingsDialog() {
  elements.focusDuration.value = state.settings.focus
  elements.breakDuration.value = state.settings.break
  elements.longBreakDuration.value = state.settings.longBreak
  elements.formError.textContent = ""
  elements.settingsBackdrop.classList.remove("hidden")
  document.body.style.overflow = "hidden"
  elements.focusDuration.focus()
}

function closeSettingsDialog() {
  elements.settingsBackdrop.classList.add("hidden")
  document.body.style.overflow = ""
  elements.openSettings.focus()
}

function saveSettings(event) {
  event.preventDefault()

  const focus = Number(elements.focusDuration.value)
  const shortBreak = Number(elements.breakDuration.value)
  const longBreak = Number(elements.longBreakDuration.value)

  if (
    !isValidNumber(focus, 1, 120) ||
    !isValidNumber(shortBreak, 1, 60) ||
    !isValidNumber(longBreak, 1, 90)
  ) {
    elements.formError.textContent =
      "Enter whole minutes within the allowed ranges."
    return
  }

  state.settings = {
    focus: focus,
    break: shortBreak,
    longBreak: longBreak,
  }

  localStorage.setItem(
    STORAGE_KEYS.settings,
    JSON.stringify(state.settings),
  )
  closeSettingsDialog()
  resetTimer()
}

// ---------------------------------------------------------------------------
// Event listeners and initial setup
// ---------------------------------------------------------------------------

elements.startButton.addEventListener("click", beginCurrentMode)
elements.pauseButton.addEventListener("click", pauseTimer)
elements.resetButton.addEventListener("click", resetTimer)
elements.skipButton.addEventListener("click", skipSession)

elements.modeButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    changeMode(button.dataset.mode, false)
  })
})

elements.openSettings.addEventListener("click", openSettingsDialog)
elements.closeSettings.addEventListener("click", closeSettingsDialog)
elements.settingsForm.addEventListener("submit", saveSettings)

elements.settingsBackdrop.addEventListener("mousedown", function (event) {
  if (event.target === elements.settingsBackdrop) {
    closeSettingsDialog()
  }
})

document.addEventListener("keydown", function (event) {
  const activeTag = document.activeElement.tagName
  const isTyping = activeTag === "INPUT" || activeTag === "TEXTAREA"
  const settingsOpen = !elements.settingsBackdrop.classList.contains("hidden")

  if (event.key === "Escape" && settingsOpen) {
    closeSettingsDialog()
    return
  }

  if (isTyping || settingsOpen) {
    return
  }

  if (event.code === "Space") {
    event.preventDefault()
    state.running ? pauseTimer() : beginCurrentMode()
  } else if (event.key.toLowerCase() === "r") {
    resetTimer()
  } else if (event.key.toLowerCase() === "s") {
    skipSession()
  }
})

elements.intention.value =
  localStorage.getItem(STORAGE_KEYS.intention) || ""

elements.intention.addEventListener("input", function () {
  localStorage.setItem(STORAGE_KEYS.intention, elements.intention.value)
})

ensureCurrentDay()
updateAllDisplays()
window.setInterval(timerTick, 250)
