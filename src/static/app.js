document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginContainer = document.getElementById("login-container");
  const loginForm = document.getElementById("login-form");
  const loginToggle = document.getElementById("login-toggle");
  const cancelLogin = document.getElementById("cancel-login");
  const userStatus = document.getElementById("user-status");

  let sessionToken = localStorage.getItem("teacherToken");
  let teacherName = localStorage.getItem("teacherName");

  function authHeaders() {
    const headers = {};
    if (sessionToken) {
      headers["Authorization"] = `Bearer ${sessionToken}`;
    }
    return headers;
  }

  function updateAuthState() {
    const loggedIn = Boolean(sessionToken);
    userStatus.textContent = loggedIn
      ? `Logged in as ${teacherName}`
      : "Not logged in";
    loginToggle.textContent = loggedIn ? "Logout" : "👤 Teacher Login";
    signupForm.querySelector("button[type='submit']").disabled = !loggedIn;
  }

  function showMessage(text, type = "info") {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML =
        '<option value="">-- Select an activity --</option>';

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const isTeacher = Boolean(sessionToken);

        const participantsHTML = details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        isTeacher
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });

      updateAuthState();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    event.preventDefault();
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!sessionToken) {
      showMessage("Teacher login required to unregister students.", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!sessionToken) {
      showMessage("Teacher login required to sign up students.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: authHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  function toggleLoginContainer(show) {
    loginContainer.classList.toggle("hidden", !show);
  }

  loginToggle.addEventListener("click", async () => {
    if (sessionToken) {
      await logout();
      return;
    }
    toggleLoginContainer(true);
  });

  cancelLogin.addEventListener("click", () => {
    toggleLoginContainer(false);
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        sessionToken = result.token;
        teacherName = result.username;
        localStorage.setItem("teacherToken", sessionToken);
        localStorage.setItem("teacherName", teacherName);
        showMessage(`Logged in as ${teacherName}.`, "success");
        toggleLoginContainer(false);
        fetchActivities();
      } else {
        showMessage(result.detail || "Invalid login credentials.", "error");
      }
    } catch (error) {
      showMessage("Login failed. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  async function logout() {
    try {
      await fetch("/logout", {
        method: "POST",
        headers: authHeaders(),
      });
    } catch (error) {
      console.error("Error logging out:", error);
    }

    sessionToken = null;
    teacherName = null;
    localStorage.removeItem("teacherToken");
    localStorage.removeItem("teacherName");
    showMessage("Logged out.", "info");
    fetchActivities();
  }

  updateAuthState();
  fetchActivities();
});
