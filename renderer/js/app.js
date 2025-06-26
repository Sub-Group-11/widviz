// Global variables
let serverUrl = "http://localhost:5000"
let currentUser = null
let currentNote = null
let currentVideoId = null
let currentTranscript = null
let currentMonth = new Date().getMonth() + 1
let currentYear = new Date().getFullYear()

// DOM Elements - Authentication
const loginContainer = document.getElementById("login-container")
const forgotPasswordContainer = document.getElementById("forgot-password-container")
const otpContainer = document.getElementById("otp-container")
const resetPasswordContainer = document.getElementById("reset-password-container")
const mainContainer = document.getElementById("main-container")

// DOM Elements - Login/Signup
const tabBtns = document.querySelectorAll(".tab-btn")
const tabContents = document.querySelectorAll(".tab-content")
const loginForm = document.getElementById("login-form")
const signupForm = document.getElementById("signup-form")
const loginError = document.getElementById("login-error")
const signupError = document.getElementById("signup-error")
const forgotPasswordLink = document.getElementById("forgot-password-link")
const backToLoginLink = document.getElementById("back-to-login")

// DOM Elements - Forgot Password Flow
const forgotPasswordForm = document.getElementById("forgot-password-form")
const forgotError = document.getElementById("forgot-error")
const otpForm = document.getElementById("otp-form")
const otpError = document.getElementById("otp-error")
const resendOtpLink = document.getElementById("resend-otp")
const resetPasswordForm = document.getElementById("reset-password-form")
const resetError = document.getElementById("reset-error")

// DOM Elements - Main App
const usernameDisplay = document.getElementById("username-display")
const logoutBtn = document.getElementById("logout-btn")
const navLinks = document.querySelectorAll(".nav-link")
const pageContents = document.querySelectorAll(".page-content")
const getStartedBtn = document.getElementById("get-started-btn")

// DOM Elements - YouTube Summarizer
const videoSearch = document.getElementById("video-search")
const searchBtn = document.getElementById("search-btn")
const searchResults = document.getElementById("search-results")
const videosContainer = document.getElementById("videos-container")
const videoSummary = document.getElementById("video-summary")
const videoTitle = document.getElementById("video-title")
const summaryLoading = document.getElementById("summary-loading")
const summaryText = document.getElementById("summary-text")
const backToResultsBtn = document.getElementById("back-to-results")
const generateQuizBtn = document.getElementById("generate-quiz-btn")
const copySummaryBtn = document.getElementById("copy-summary-btn")
const exportSummaryBtn = document.getElementById("export-summary-btn")
const quizContainer = document.getElementById("quiz-container")
const quizQuestions = document.getElementById("quiz-questions")
const submitQuizBtn = document.getElementById("submit-quiz")
const quizResults = document.getElementById("quiz-results")
const backToSummaryBtn = document.getElementById("back-to-summary")

// DOM Elements - Notes
const notesList = document.getElementById("notes-list")
const addNoteBtn = document.getElementById("add-note-btn")
const noteTitle = document.getElementById("note-title")
const noteContent = document.getElementById("note-content")
const saveNoteBtn = document.getElementById("save-note-btn")
const exportNoteBtn = document.getElementById("export-note-btn")
const deleteNoteBtn = document.getElementById("delete-note-btn")

// DOM Elements - Goals
const currentMonthDisplay = document.getElementById("current-month-display")
const prevMonthBtn = document.getElementById("prev-month")
const nextMonthBtn = document.getElementById("next-month")
const calendarGrid = document.getElementById("calendar-grid")
const goalForm = document.getElementById("goal-form")
const addGoalForm = document.getElementById("add-goal-form")
const goalText = document.getElementById("goal-text")
const goalDate = document.getElementById("goal-date")
const cancelGoalBtn = document.getElementById("cancel-goal-btn")

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  // Get server URL from main process
  if (window.api) {
    window.api
      .getServerUrl()
      .then((result) => {
        serverUrl = result.url
        console.log("Server URL:", serverUrl)
        console.log("Local IP:", result.localIp)

        // Check if user is already logged in
        checkAuthStatus()
      })
      .catch((error) => {
        console.error("Error getting server URL:", error)
        // Still try to check auth status even if we can't get the server URL
        checkAuthStatus()
      })

    // Listen for server started event
    window.api.onServerStarted((data) => {
      serverUrl = data.url
      console.log("Server started at:", serverUrl)
      console.log("Local IP:", data.localIp)
    })
  } else {
    // Running in browser mode
    checkAuthStatus()
  }

  // Set up event listeners
  setupEventListeners()
})

// Check if user is already logged in
function checkAuthStatus() {
  const savedUser = localStorage.getItem("user")
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser)
      showMainApp()
    } catch (error) {
      console.error("Error parsing saved user:", error)
      localStorage.removeItem("user")
    }
  }
}

// Set up event listeners
function setupEventListeners() {
  // Tab switching
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab")

      // Update active tab button
      tabBtns.forEach((b) => b.classList.remove("active"))
      btn.classList.add("active")

      // Show selected tab content
      tabContents.forEach((content) => {
        content.classList.remove("active")
        if (content.id === `${tabId}-tab`) {
          content.classList.add("active")
        }
      })
    })
  })

  // Login form submission
  loginForm.addEventListener("submit", handleLogin)

  // Signup form submission
  signupForm.addEventListener("submit", handleSignup)

  // Forgot password link
  forgotPasswordLink.addEventListener("click", (e) => {
    e.preventDefault()
    loginContainer.classList.add("hidden")
    forgotPasswordContainer.classList.remove("hidden")
  })

  // Back to login link
  backToLoginLink.addEventListener("click", (e) => {
    e.preventDefault()
    forgotPasswordContainer.classList.add("hidden")
    loginContainer.classList.remove("hidden")
  })

  // Forgot password form submission
  forgotPasswordForm.addEventListener("submit", handleForgotPassword)

  // OTP form submission
  otpForm.addEventListener("submit", handleOtpValidation)

  // Resend OTP link
  resendOtpLink.addEventListener("click", (e) => {
    e.preventDefault()
    const email = localStorage.getItem("resetEmail")
    if (email) {
      handleForgotPassword(null, email)
    }
  })

  // Reset password form submission
  resetPasswordForm.addEventListener("submit", handleResetPassword)

  // Logout button
  logoutBtn.addEventListener("click", handleLogout)

  // Navigation links
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault()
      const pageId = link.getAttribute("data-page")

      // Update active nav link
      navLinks.forEach((l) => l.classList.remove("active"))
      link.classList.add("active")

      // Show selected page content
      pageContents.forEach((content) => {
        content.classList.add("hidden")
        if (content.id === `${pageId}-page`) {
          content.classList.remove("hidden")
        }
      })
    })
  })

  // Get started button
  getStartedBtn.addEventListener("click", () => {
    // Navigate to YouTube Summarizer page
    navLinks.forEach((l) => {
      if (l.getAttribute("data-page") === "summarizer") {
        l.click()
      }
    })
  })

  // YouTube Summarizer
  searchBtn.addEventListener("click", handleVideoSearch)
  backToResultsBtn.addEventListener("click", () => {
    videoSummary.classList.add("hidden")
    searchResults.classList.remove("hidden")
  })
  generateQuizBtn.addEventListener("click", handleGenerateQuiz)
  copySummaryBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(summaryText.innerText)
    showToast("Summary copied to clipboard")
  })
  exportSummaryBtn.addEventListener("click", () => {
    const blob = new Blob([summaryText.innerText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "video-summary.txt"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  })
  backToSummaryBtn.addEventListener("click", () => {
    quizContainer.classList.add("hidden")
    videoSummary.classList.remove("hidden")
  })
  submitQuizBtn.addEventListener("click", handleSubmitQuiz)

  // Notes
  addNoteBtn.addEventListener("click", handleAddNote)
  saveNoteBtn.addEventListener("click", handleSaveNote)
  exportNoteBtn.addEventListener("click", handleExportNote)
  deleteNoteBtn.addEventListener("click", handleDeleteNote)

  // Goals
  prevMonthBtn.addEventListener("click", () => {
    if (currentMonth === 1) {
      currentMonth = 12
      currentYear--
    } else {
      currentMonth--
    }
    loadGoalsCalendar()
  })
  nextMonthBtn.addEventListener("click", () => {
    if (currentMonth === 12) {
      currentMonth = 1
      currentYear++
    } else {
      currentMonth++
    }
    loadGoalsCalendar()
  })
  addGoalForm.addEventListener("submit", handleAddGoal)
  cancelGoalBtn.addEventListener("click", () => {
    goalForm.classList.add("hidden")
  })
}

// Authentication Functions
async function handleLogin(e) {
  if (e) e.preventDefault()

  const email = document.getElementById("login-email").value
  const password = document.getElementById("login-password").value

  try {
    loginError.textContent = ""
    loginError.style.color = "var(--danger-color)"

    const response = await fetch(`${serverUrl}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (data.success) {
      // Store user data
      currentUser = data.user
      localStorage.setItem("user", JSON.stringify(currentUser))

      // Show main app
      showMainApp()
    } else {
      loginError.textContent = data.message || "Authentication failed"
    }
  } catch (error) {
    loginError.textContent = "An error occurred. Please try again."
    console.error("Login error:", error)
  }
}

async function handleSignup(e) {
  e.preventDefault()

  const username = document.getElementById("signup-username").value
  const email = document.getElementById("signup-email").value
  const password = document.getElementById("signup-password").value

  try {
    signupError.textContent = ""

    const response = await fetch(`${serverUrl}/api/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password }),
    })

    const data = await response.json()

    if (data.success) {
      // Switch to login tab
      tabBtns[0].click()
      loginError.textContent = data.message
      loginError.style.color = "var(--success-color)"
    } else {
      signupError.textContent = data.message
    }
  } catch (error) {
    signupError.textContent = "An error occurred. Please try again."
    console.error("Signup error:", error)
  }
}

async function handleForgotPassword(e, emailOverride) {
  if (e) e.preventDefault()

  const email = emailOverride || document.getElementById("forgot-email").value

  try {
    forgotError.textContent = ""

    const response = await fetch(`${serverUrl}/api/forgot_password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    })

    const data = await response.json()

    if (data.success) {
      // Store OTP and email for validation
      localStorage.setItem("resetEmail", email)
      localStorage.setItem("resetOtp", data.otp)

      // Show OTP validation form
      forgotPasswordContainer.classList.add("hidden")
      otpContainer.classList.remove("hidden")
    } else {
      forgotError.textContent = data.message
    }
  } catch (error) {
    forgotError.textContent = "An error occurred. Please try again."
    console.error("Forgot password error:", error)
  }
}

async function handleOtpValidation(e) {
  e.preventDefault()

  const providedOtp = document.getElementById("otp-input").value
  const email = localStorage.getItem("resetEmail")
  const otp = localStorage.getItem("resetOtp")

  try {
    otpError.textContent = ""

    const response = await fetch(`${serverUrl}/api/validate_otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, otp, provided_otp: providedOtp }),
    })

    const data = await response.json()

    if (data.success) {
      // Show reset password form
      otpContainer.classList.add("hidden")
      resetPasswordContainer.classList.remove("hidden")
    } else {
      otpError.textContent = data.message
    }
  } catch (error) {
    otpError.textContent = "An error occurred. Please try again."
    console.error("OTP validation error:", error)
  }
}

async function handleResetPassword(e) {
  e.preventDefault()

  const password = document.getElementById("new-password").value
  const confirmPassword = document.getElementById("confirm-password").value
  const email = localStorage.getItem("resetEmail")

  if (password !== confirmPassword) {
    resetError.textContent = "Passwords do not match."
    return
  }

  try {
    resetError.textContent = ""

    const response = await fetch(`${serverUrl}/api/reset_password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (data.success) {
      // Clear reset data
      localStorage.removeItem("resetEmail")
      localStorage.removeItem("resetOtp")

      // Show login form
      resetPasswordContainer.classList.add("hidden")
      loginContainer.classList.remove("hidden")

      // Show success message
      loginError.textContent = data.message
      loginError.style.color = "var(--success-color)"
    } else {
      resetError.textContent = data.message
    }
  } catch (error) {
    resetError.textContent = "An error occurred. Please try again."
    console.error("Reset password error:", error)
  }
}

function handleLogout() {
  // Clear user data
  currentUser = null
  localStorage.removeItem("user")

  // Show login form
  mainContainer.classList.add("hidden")
  loginContainer.classList.remove("hidden")

  // Reset forms
  loginForm.reset()
  signupForm.reset()
  loginError.textContent = ""
  signupError.textContent = ""
}

function showMainApp() {
  // Hide login container
  loginContainer.classList.add("hidden")
  forgotPasswordContainer.classList.add("hidden")
  otpContainer.classList.add("hidden")
  resetPasswordContainer.classList.add("hidden")

  // Show main container
  mainContainer.classList.remove("hidden")

  // Set username
  usernameDisplay.textContent = currentUser.username

  // Load initial data
  loadNotes()
  loadGoalsCalendar()
}

// YouTube Summarizer Functions
async function handleVideoSearch() {
  const query = videoSearch.value.trim()

  if (!query) {
    showToast("Please enter a search query or YouTube URL")
    return
  }

  // Check if it's a YouTube URL
  const youtubeRegex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
  const match = query.match(youtubeRegex)

  if (match) {
    // It's a YouTube URL, get the video ID
    const videoId = match[1]
    handleVideoSummary(videoId)
    return
  }

  // It's a search query
  try {
    videosContainer.innerHTML =
      '<div class="loading-indicator"><div class="spinner"></div><p>Searching videos...</p></div>'
    searchResults.classList.remove("hidden")

    const response = await fetch(`${serverUrl}/api/search_videos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    })

    const data = await response.json()

    if (data.success) {
      displaySearchResults(data.videos)
    } else {
      videosContainer.innerHTML = `<p class="error-message">${data.message}</p>`
    }
  } catch (error) {
    videosContainer.innerHTML = '<p class="error-message">An error occurred while searching videos.</p>'
    console.error("Video search error:", error)
  }
}

function displaySearchResults(videos) {
  if (videos.length === 0) {
    videosContainer.innerHTML = "<p>No videos found. Try a different search query.</p>"
    return
  }

  let html = ""

  videos.forEach((video) => {
    html += `
      <div class="video-card">
        <img src="${video.thumbnail}" alt="${video.title}" class="video-thumbnail">
        <div class="video-info">
          <h3>${video.title}</h3>
          <p>${video.channel_title}</p>
          <button class="btn btn-primary summarize-btn" data-id="${video.video_id}">Summarize</button>
        </div>
      </div>
    `
  })

  videosContainer.innerHTML = html

  // Add event listeners to summarize buttons
  document.querySelectorAll(".summarize-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const videoId = btn.getAttribute("data-id")
      handleVideoSummary(videoId)
    })
  })
}

async function handleVideoSummary(videoId) {
  // Show summary section
  searchResults.classList.add("hidden");
  videoSummary.classList.remove("hidden");
  summaryLoading.classList.remove("hidden");
  summaryText.innerHTML = "";

  try {
    const response = await fetch(`${serverUrl}/api/summarize_video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ video_id: videoId }),
    });

    const data = await response.json();

    if (data.success) {
      // Store all video data together
      currentVideoData = {
        id: videoId,
        transcript: data.transcript,
        summary: data.summary,
        timestamp: Date.now() // Add timestamp for freshness
      };

      // Display summary
      videoTitle.textContent = "Video Summary";
      summaryText.innerHTML = currentVideoData.summary;
      
      // Clear any previous quiz data
      quizQuestions.innerHTML = "";
      quizResults.classList.add("hidden");
    } else {
      summaryText.innerHTML = `<p class="error-message">${data.message}</p>`;
      currentVideoData = null; // Clear invalid data
    }
  } catch (error) {
    console.error("Video summarization error:", error);
    summaryText.innerHTML = '<p class="error-message">An error occurred while summarizing the video.</p>';
    currentVideoData = null; // Clear on error
  } finally {
    summaryLoading.classList.add("hidden");
    
    // Add cleanup for previous video data
    if (!currentVideoData) {
      currentTranscript = null;
      currentVideoId = null;
    }
  }
}

async function handleGenerateQuiz() {
  // Validate current video data
  if (!currentVideoData?.transcript) {
    showToast("Please summarize a video first");
    return;
  }

  // Show quiz container
  videoSummary.classList.add("hidden");
  quizContainer.classList.remove("hidden");
  quizQuestions.innerHTML = 
    '<div class="loading-indicator"><div class="spinner"></div><p>Generating quiz questions...</p></div>';
  quizResults.classList.add("hidden");

  try {
    const response = await fetch(`${serverUrl}/api/generate_quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        transcript: currentVideoData.transcript,
        video_id: currentVideoData.id  // Add video ID for validation
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Store quiz with video data
      currentVideoData.quiz = data.quiz;
      displayQuiz(data.quiz);
    } else {
      quizQuestions.innerHTML = `<p class="error-message">${data.message}</p>`;
      currentVideoData.quiz = null; // Clear invalid quiz
    }
  } catch (error) {
    console.error("Quiz generation error:", error);
    quizQuestions.innerHTML = '<p class="error-message">An error occurred while generating the quiz.</p>';
    currentVideoData.quiz = null;
  }
}

function displayQuiz(questions) {
  if (questions.length === 0) {
    quizQuestions.innerHTML = "<p>No quiz questions could be generated from this video.</p>"
    return
  }

  let html = ""

  questions.forEach((question, index) => {
    html += `
      <div class="quiz-question" data-index="${index}">
        <h3>${index + 1}. ${question.question}</h3>
        <div class="quiz-options">
    `

    question.options.forEach((option, optIndex) => {
      html += `
        <label class="quiz-option">
          <input type="radio" name="question-${index}" value="${option.charAt(0)}">
          ${option}
        </label>
      `
    })

    html += `
        </div>
        <input type="hidden" class="correct-answer" value="${question.answer}">
      </div>
    `
  })

  quizQuestions.innerHTML = html

  // Add event listeners to quiz options
  document.querySelectorAll(".quiz-option").forEach((option) => {
    option.addEventListener("click", () => {
      // Deselect other options in the same question
      const questionIndex = option.closest(".quiz-question").getAttribute("data-index")
      document.querySelectorAll(`input[name="question-${questionIndex}"]`).forEach((input) => {
        input.closest(".quiz-option").classList.remove("selected")
      })

      // Select this option
      option.classList.add("selected")
    })
  })
}

function handleSubmitQuiz() {
  // Validate quiz data exists
  if (!currentVideoData?.quiz) {
    showToast("No quiz data available");
    return;
  }

  const questions = document.querySelectorAll(".quiz-question");
  let correctCount = 0;
  const totalCount = questions.length;

  questions.forEach((question, index) => {
    const selectedOption = question.querySelector('input[type="radio"]:checked');
    const rawCorrectAnswer = currentVideoData.quiz[index].answer.toLowerCase().trim();

    // Normalize correct answer format (a/b/c/d)
    let correctAnswer = rawCorrectAnswer.replace(/[^a-d]/gi, '').charAt(0) || 'a';
    
    // Handle numeric answers (1/2/3/4 -> a/b/c/d)
    const numberToLetter = { '1': 'a', '2': 'b', '3': 'c', '4': 'd' };
    correctAnswer = numberToLetter[correctAnswer] || correctAnswer;

    if (selectedOption) {
      // Normalize user's answer
      const userAnswer = selectedOption.value.toLowerCase().trim().charAt(0);
      
      if (userAnswer === correctAnswer) {
        correctCount++;
      }
    }
  });

  // Display results
  const percentage = Math.round((correctCount / totalCount) * 100);
  quizResults.innerHTML = `
    <h3>Quiz Results</h3>
    <p>You got ${correctCount} out of ${totalCount} questions correct (${percentage}%).</p>
  `;
  quizResults.classList.remove("hidden");
}

// Notes Functions
async function loadNotes() {
  if (!currentUser) return

  try {
    const response = await fetch(`${serverUrl}/api/notes?email=${currentUser.email}`)
    const data = await response.json()

    if (data.success) {
      displayNotes(data.notes)
    } else {
      notesList.innerHTML = `<p class="error-message">${data.message}</p>`
    }
  } catch (error) {
    notesList.innerHTML = '<p class="error-message">An error occurred while loading notes.</p>'
    console.error("Notes loading error:", error)
  }
}

function displayNotes(notes) {
  if (notes.length === 0) {
    notesList.innerHTML = '<p class="note-item">No notes yet. Click "New Note" to create one.</p>'
    return
  }

  let html = ""

  notes.forEach((note) => {
    const date = new Date(note.created_at).toLocaleDateString()
    const preview = note.content ? note.content.substring(0, 50) + "..." : "No content"

    html += `
      <div class="note-item" data-id="${note.id}">
        <h3>${note.title}</h3>
        <p>${preview}</p>
        <small>${date}</small>
      </div>
    `
  })

  notesList.innerHTML = html

  // Add event listeners to note items
  document.querySelectorAll(".note-item").forEach((item) => {
    item.addEventListener("click", () => {
      const noteId = item.getAttribute("data-id")
      selectNote(noteId, notes)
    })
  })
}

function selectNote(noteId, notes) {
  // Find the note
  const note = notes.find((n) => n.id == noteId)

  if (!note) return

  // Store current note
  currentNote = note

  // Update note editor
  noteTitle.value = note.title
  noteContent.value = note.content || ""

  // Update active note
  document.querySelectorAll(".note-item").forEach((item) => {
    item.classList.remove("active")
    if (item.getAttribute("data-id") == noteId) {
      item.classList.add("active")
    }
  })

  // Show delete button
  deleteNoteBtn.style.display = "inline-block"
}

function handleAddNote() {
  // Clear current note
  currentNote = null

  // Clear note editor
  noteTitle.value = ""
  noteContent.value = ""

  // Remove active note
  document.querySelectorAll(".note-item").forEach((item) => {
    item.classList.remove("active")
  })

  // Hide delete button
  deleteNoteBtn.style.display = "none"
}

async function handleSaveNote() {
  if (!currentUser) return

  const title = noteTitle.value.trim()
  const content = noteContent.value.trim()

  if (!title) {
    showToast("Please enter a note title")
    return
  }

  try {
    let response

    if (currentNote) {
      // Update existing note
      response = await fetch(`${serverUrl}/api/notes/edit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: currentNote.id,
          title,
          content,
        }),
      })
    } else {
      // Create new note
      response = await fetch(`${serverUrl}/api/notes/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: currentUser.email,
          title,
          content,
        }),
      })
    }

    const data = await response.json()

    if (data.success) {
      showToast(currentNote ? "Note updated successfully" : "Note added successfully")
      loadNotes()
    } else {
      showToast(data.message)
    }
  } catch (error) {
    showToast("An error occurred while saving the note")
    console.error("Note saving error:", error)
  }
}

async function handleExportNote() {
  if (!currentNote) {
    showToast("Please select a note to export")
    return
  }

  try {
    const response = await fetch(`${serverUrl}/api/notes/export_pdf?id=${currentNote.id}&email=${currentUser.email}`)
    const data = await response.json()

    if (data.success) {
      // Convert base64 to blob
      const byteCharacters = atob(data.pdf)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: "application/pdf" })

      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = data.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } else {
      showToast(data.message)
    }
  } catch (error) {
    showToast("An error occurred while exporting the note")
    console.error("Note export error:", error)
  }
}

async function handleDeleteNote() {
  if (!currentNote) {
    showToast("Please select a note to delete")
    return
  }

  if (!confirm("Are you sure you want to delete this note?")) {
    return
  }

  try {
    const response = await fetch(`${serverUrl}/api/notes/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: currentNote.id,
      }),
    })

    const data = await response.json()

    if (data.success) {
      showToast("Note deleted successfully")
      currentNote = null
      noteTitle.value = ""
      noteContent.value = ""
      loadNotes()
    } else {
      showToast(data.message)
    }
  } catch (error) {
    showToast("An error occurred while deleting the note")
    console.error("Note deletion error:", error)
  }
}

// Goals Functions
async function loadGoalsCalendar() {
  if (!currentUser) return

  try {
    const response = await fetch(
      `${serverUrl}/api/goals?email=${currentUser.email}&month=${currentMonth}&year=${currentYear}`,
    )
    const data = await response.json()

    if (data.success) {
      displayCalendar(data.calendar_weeks, data.current_month_name, data.current_year)
    } else {
      calendarGrid.innerHTML = `<p class="error-message">${data.message}</p>`
    }
  } catch (error) {
    calendarGrid.innerHTML = '<p class="error-message">An error occurred while loading the calendar.</p>'
    console.error("Calendar loading error:", error)
  }
}

function displayCalendar(calendarWeeks, monthName, year) {
  currentMonthDisplay.textContent = `${monthName} ${year}`

  let html = ""

  calendarWeeks.forEach((week) => {
    week.forEach((day) => {
      const isToday = day.today ? "today" : ""
      const isOtherMonth = !day.in_current_month ? "other-month" : ""

      html += `
        <div class="calendar-day ${isToday} ${isOtherMonth}" data-date="${day.full_date}">
          <div class="day-number">${day.date}</div>
          <div class="day-goals">
      `

      if (day.goals && day.goals.length > 0) {
        day.goals.forEach((goal) => {
          const isCompleted = goal.status === "completed" ? "completed" : ""

          html += `
            <div class="goal-item ${isCompleted}" data-id="${goal.id}">
              <span>${goal.goal_text}</span>
              <div class="goal-actions">
                <button class="goal-btn complete-goal" title="Mark as completed">✓</button>
                <button class="goal-btn delete-goal" title="Delete goal">×</button>
              </div>
            </div>
          `
        })
      }

      html += `
          </div>
          <button class="btn btn-icon add-goal-btn" title="Add goal">+</button>
        </div>
      `
    })
  })

  calendarGrid.innerHTML = html

  // Add event listeners to goal buttons
  document.querySelectorAll(".complete-goal").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation()
      const goalId = btn.closest(".goal-item").getAttribute("data-id")
      handleCompleteGoal(goalId)
    })
  })

  document.querySelectorAll(".delete-goal").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation()
      const goalId = btn.closest(".goal-item").getAttribute("data-id")
      handleDeleteGoal(goalId)
    })
  })

  document.querySelectorAll(".add-goal-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation()
      const date = btn.closest(".calendar-day").getAttribute("data-date")
      showAddGoalForm(date)
    })
  })
}

function showAddGoalForm(date) {
  goalDate.value = date
  goalText.value = ""
  goalForm.classList.remove("hidden")
}

async function handleAddGoal(e) {
  e.preventDefault()

  if (!currentUser) return

  const text = goalText.value.trim()
  const date = goalDate.value

  if (!text) {
    showToast("Please enter a goal")
    return
  }

  try {
    const response = await fetch(`${serverUrl}/api/goals/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: currentUser.email,
        goal_text: text,
        goal_date: date,
      }),
    })

    const data = await response.json()

    if (data.success) {
      showToast("Goal added successfully")
      goalForm.classList.add("hidden")
      loadGoalsCalendar()
    } else {
      showToast(data.message)
    }
  } catch (error) {
    showToast("An error occurred while adding the goal")
    console.error("Goal adding error:", error)
  }
}

async function handleCompleteGoal(goalId) {
  try {
    const response = await fetch(`${serverUrl}/api/goals/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: goalId,
      }),
    })

    const data = await response.json()

    if (data.success) {
      showToast("Goal marked as completed")
      loadGoalsCalendar()
    } else {
      showToast(data.message)
    }
  } catch (error) {
    showToast("An error occurred while updating the goal")
    console.error("Goal completion error:", error)
  }
}

async function handleDeleteGoal(goalId) {
  if (!confirm("Are you sure you want to delete this goal?")) {
    return
  }

  try {
    const response = await fetch(`${serverUrl}/api/goals/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: goalId,
      }),
    })

    const data = await response.json()

    if (data.success) {
      showToast("Goal deleted successfully")
      loadGoalsCalendar()
    } else {
      showToast(data.message)
    }
  } catch (error) {
    showToast("An error occurred while deleting the goal")
    console.error("Goal deletion error:", error)
  }
}

// Utility Functions
function showToast(message) {
  const toast = document.createElement("div")
  toast.className = "toast"
  toast.textContent = message
  document.body.appendChild(toast)

  setTimeout(() => {
    toast.classList.add("show")
  }, 100)

  setTimeout(() => {
    toast.classList.remove("show")
    setTimeout(() => {
      document.body.removeChild(toast)
    }, 300)
  }, 3000)
}

const themeToggle = document.getElementById('themeToggle');
const themeStylesheet = document.getElementById('themeStylesheet');
const logoImage = document.querySelector('.logo');  // Select the logo img element

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  themeStylesheet.href = 'css/styles2.css';
  themeToggle.checked = true;
  logoImage.src = '../assets/logo2.png';  // Change logo for dark theme
} else {
  logoImage.src = '../assets/logo.png';   // Default logo for light theme
}

themeToggle.addEventListener('change', () => {
  if (themeToggle.checked) {
    themeStylesheet.href = 'css/styles2.css';
    localStorage.setItem('theme', 'dark');
    logoImage.src = '../assets/logo2.png';  // Change logo for dark theme
  } else {
    themeStylesheet.href = 'css/styles.css';
    localStorage.setItem('theme', 'light');
    logoImage.src = '../assets/logo.png';   // Change logo for light theme
  }
});


