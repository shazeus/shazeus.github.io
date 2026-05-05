const USERNAME = "shazeus";
const profileUrl = `https://api.github.com/users/${USERNAME}`;
const reposUrl = `https://api.github.com/users/${USERNAME}/repos?sort=updated&per_page=100`;

const state = {
  repos: [],
  filter: "all",
};

const elements = {
  avatar: document.querySelector("#avatar"),
  profileName: document.querySelector("#profile-name"),
  profileLogin: document.querySelector("#profile-login"),
  profileBio: document.querySelector("#profile-bio"),
  profileMeta: document.querySelector("#profile-meta"),
  statRepos: document.querySelector("#stat-repos"),
  statFollowers: document.querySelector("#stat-followers"),
  statFollowing: document.querySelector("#stat-following"),
  status: document.querySelector("#status"),
  grid: document.querySelector("#project-grid"),
  filters: document.querySelectorAll(".filter"),
};

function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setProfile(profile) {
  const displayName = profile.name || profile.login;
  elements.avatar.src = profile.avatar_url;
  elements.avatar.alt = `${displayName} GitHub avatar`;
  elements.profileName.textContent = displayName;
  elements.profileLogin.textContent = `@${profile.login}`;
  elements.profileBio.textContent = profile.bio || "Public GitHub projects, tools, and experiments.";

  const meta = [profile.location, profile.blog ? profile.blog.replace(/^https?:\/\//, "") : null]
    .filter(Boolean)
    .join(" / ");
  elements.profileMeta.textContent = meta || profile.html_url;
  elements.statRepos.textContent = profile.public_repos;
  elements.statFollowers.textContent = profile.followers;
  elements.statFollowing.textContent = profile.following;
}

function repoType(repo) {
  return repo.fork ? "fork" : "source";
}

function filteredRepos() {
  if (state.filter === "all") {
    return state.repos;
  }
  return state.repos.filter((repo) => repoType(repo) === state.filter);
}

function renderRepos() {
  const repos = filteredRepos();
  elements.grid.innerHTML = "";

  if (!repos.length) {
    elements.status.textContent = "No projects found for this filter.";
    return;
  }

  elements.status.textContent = "";
  const fragment = document.createDocumentFragment();

  repos.forEach((repo) => {
    const card = document.createElement("article");
    card.className = "project-card";
    const description = repo.description || "No description provided yet.";
    const language = repo.language || "Code";
    const homepage = repo.homepage && repo.homepage.trim();

    card.innerHTML = `
      <div class="project-top">
        <h3><a href="${repo.html_url}" target="_blank" rel="noreferrer">${escapeHtml(repo.name)}</a></h3>
        <span class="tag">${repo.fork ? "Fork" : "Source"}</span>
      </div>
      <p class="description">${escapeHtml(description)}</p>
      <div class="project-meta" aria-label="Repository metadata">
        <span class="language">${escapeHtml(language)}</span>
        <span>${repo.stargazers_count} stars</span>
        <span>${repo.forks_count} forks</span>
        <span>Updated ${formatDate(repo.updated_at)}</span>
      </div>
      <div class="project-links">
        <a href="${repo.html_url}" target="_blank" rel="noreferrer">Repository</a>
        ${homepage ? `<a href="${homepage}" target="_blank" rel="noreferrer">Live</a>` : ""}
      </div>
    `;
    fragment.appendChild(card);
  });

  elements.grid.appendChild(fragment);
}

function wireFilters() {
  elements.filters.forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      elements.filters.forEach((item) => item.classList.toggle("active", item === button));
      renderRepos();
    });
  });
}

async function loadGitHub() {
  try {
    const [profileResponse, reposResponse] = await Promise.all([
      fetch(profileUrl, { headers: { Accept: "application/vnd.github+json" } }),
      fetch(reposUrl, { headers: { Accept: "application/vnd.github+json" } }),
    ]);

    if (!profileResponse.ok || !reposResponse.ok) {
      throw new Error("GitHub API request failed");
    }

    const [profile, repos] = await Promise.all([
      profileResponse.json(),
      reposResponse.json(),
    ]);

    setProfile(profile);
    state.repos = repos
      .filter((repo) => !repo.archived)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    renderRepos();
  } catch (error) {
    elements.status.textContent = "Could not load GitHub projects. Try refreshing in a moment.";
    console.error(error);
  }
}

wireFilters();
loadGitHub();
