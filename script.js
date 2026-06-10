const USERNAME = "shazeus";
const profileUrl = `https://api.github.com/users/${USERNAME}`;
const reposUrl = `https://api.github.com/users/${USERNAME}/repos?sort=updated&per_page=100`;

const featuredNames = [
  "LambDownload",
  "ghspy",
  "qk-tool",
  "reposcan",
  "passforge",
  "pokemon-pack-simulator",
];

const state = {
  repos: [],
  filter: "all",
  search: "",
};

const elements = {
  avatar: document.querySelector("#avatar"),
  profileName: document.querySelector("#profile-name"),
  profileBio: document.querySelector("#profile-bio"),
  profileMeta: document.querySelector("#profile-meta"),
  statRepos: document.querySelector("#stat-repos"),
  statFollowers: document.querySelector("#stat-followers"),
  statUpdated: document.querySelector("#stat-updated"),
  sourceCount: document.querySelector("#source-count"),
  languageCount: document.querySelector("#language-count"),
  securityCount: document.querySelector("#security-count"),
  utilityCount: document.querySelector("#utility-count"),
  featuredStatus: document.querySelector("#featured-status"),
  featuredGrid: document.querySelector("#featured-grid"),
  repoStatus: document.querySelector("#repo-status"),
  repoList: document.querySelector("#repo-list"),
  filters: document.querySelectorAll(".filter"),
  searchInput: document.querySelector("#repo-search"),
  modal: document.querySelector("#project-modal"),
  modalPanel: document.querySelector(".modal-panel"),
  modalContent: document.querySelector("#modal-content"),
  modalClosers: document.querySelectorAll("[data-close-modal]"),
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value, style = "short") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", {
    month: style === "compact" ? "short" : "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function categoryForRepo(repo) {
  const haystack = `${repo.name} ${repo.description ?? ""}`.toLowerCase();

  if (repo.fork) return "fork";
  if (/(security|osint|scan|hash|pass|probe|recon|port|ip|shell|clip|audit|webprobe)/.test(haystack)) {
    return "security";
  }
  if (/(viz|data|repo|analytics|dependency|tree|log|kube)/.test(haystack)) {
    return "data";
  }
  if (/(pokemon|download|adobe|media|pages|portfolio)/.test(haystack)) {
    return "media";
  }
  return "utility";
}

function languageSet(repos) {
  return new Set(repos.map((repo) => repo.language).filter(Boolean));
}

function setProfile(profile, repos) {
  const displayName = profile.name || profile.login;
  const latestRepo = repos[0];

  elements.avatar.src = profile.avatar_url;
  elements.avatar.alt = `${displayName} GitHub profile picture`;
  elements.profileName.textContent = displayName;
  elements.profileBio.textContent =
    profile.bio || "CLI tools, security utilities, media workflows, and small developer systems.";
  elements.profileMeta.textContent = [profile.location, profile.html_url.replace("https://", "")]
    .filter(Boolean)
    .join(" / ");
  elements.statRepos.textContent = profile.public_repos;
  elements.statFollowers.textContent = profile.followers;
  elements.statUpdated.textContent = latestRepo ? formatDate(latestRepo.updated_at, "compact") : "--";
}

function setSignals(repos) {
  const sourceRepos = repos.filter((repo) => !repo.fork);
  const categories = sourceRepos.map(categoryForRepo);

  elements.sourceCount.textContent = sourceRepos.length;
  elements.languageCount.textContent = languageSet(sourceRepos).size;
  elements.securityCount.textContent = categories.filter((category) => category === "security").length;
  elements.utilityCount.textContent = categories.filter((category) => category === "utility").length;
}

function repoDescription(repo) {
  return repo.description || "Public repository without a written description yet.";
}

function repoInitial(repo) {
  return repo.name.slice(0, 1).toUpperCase();
}

function repoMeta(repo) {
  return [
    repo.language || "Code",
    `${repo.stargazers_count} stars`,
    `${repo.forks_count} forks`,
    `Updated ${formatDate(repo.updated_at, "compact")}`,
  ];
}

function findRepo(name) {
  return state.repos.find((repo) => repo.name === name);
}

function openProject(repo) {
  const homepage = repo.homepage && repo.homepage.trim();
  elements.modalContent.innerHTML = `
    <div class="modal-kicker">
      <span>${escapeHtml(categoryForRepo(repo))}</span>
      <span>${escapeHtml(repo.language || "Code")}</span>
      <span>${repo.fork ? "Fork" : "Source"}</span>
    </div>
    <h2 id="modal-title">${escapeHtml(repo.name)}</h2>
    <p class="modal-description">${escapeHtml(repoDescription(repo))}</p>
    <dl class="modal-grid">
      <div>
        <dt>Stars</dt>
        <dd>${repo.stargazers_count}</dd>
      </div>
      <div>
        <dt>Forks</dt>
        <dd>${repo.forks_count}</dd>
      </div>
      <div>
        <dt>Watchers</dt>
        <dd>${repo.watchers_count}</dd>
      </div>
      <div>
        <dt>Updated</dt>
        <dd>${formatDate(repo.updated_at, "compact")}</dd>
      </div>
    </dl>
    <div class="modal-actions">
      <a href="${repo.html_url}" target="_blank" rel="noreferrer">Open repository</a>
      ${homepage ? `<a href="${homepage}" target="_blank" rel="noreferrer">Open live page</a>` : ""}
      <a href="${repo.html_url}/archive/refs/heads/${repo.default_branch}.zip" target="_blank" rel="noreferrer">Download source</a>
    </div>
  `;

  elements.modal.hidden = false;
  document.body.classList.add("modal-open");
  elements.modalPanel.focus();
}

function closeProject() {
  elements.modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function renderFeatured() {
  const featured = featuredNames
    .map((name) => state.repos.find((repo) => repo.name.toLowerCase() === name.toLowerCase()))
    .filter(Boolean);

  elements.featuredStatus.className = "status-panel";
  elements.featuredStatus.innerHTML = "";
  elements.featuredGrid.innerHTML = "";

  if (!featured.length) {
    elements.featuredStatus.innerHTML = `
      <div class="empty-state">Featured repositories will appear here after GitHub returns project data.</div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();
  featured.forEach((repo) => {
    const card = document.createElement("article");
    card.className = "featured-card";
    card.dataset.initial = repoInitial(repo);
    card.dataset.project = repo.name;
    card.tabIndex = 0;
    card.innerHTML = `
      <div>
        <div class="repo-kicker">
          <span>${escapeHtml(repo.language || "Code")}</span>
          <span>${escapeHtml(categoryForRepo(repo))}</span>
        </div>
        <h3>${escapeHtml(repo.name)}</h3>
        <p>${escapeHtml(repoDescription(repo))}</p>
      </div>
      <button class="inspect-button" type="button" data-project="${escapeHtml(repo.name)}">
        <span>Inspect project</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 17 17 7M8 7h9v9" />
        </svg>
      </button>
    `;
    fragment.appendChild(card);
  });

  elements.featuredGrid.appendChild(fragment);
}

function visibleRepos() {
  const query = state.search.trim().toLowerCase();

  return state.repos.filter((repo) => {
    const category = categoryForRepo(repo);
    const matchesFilter = state.filter === "all" || category === state.filter;
    const matchesQuery =
      !query ||
      [repo.name, repo.description, repo.language, category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));

    return matchesFilter && matchesQuery;
  });
}

function renderRepoList() {
  const repos = visibleRepos();
  elements.repoList.innerHTML = "";

  if (!repos.length) {
    elements.repoStatus.textContent = "";
    elements.repoList.innerHTML = `
      <div class="empty-state">No repositories match this filter. Try a broader search or switch back to All.</div>
    `;
    return;
  }

  elements.repoStatus.textContent = `${repos.length} repositories shown`;

  const fragment = document.createDocumentFragment();
  repos.forEach((repo, index) => {
    const row = document.createElement("article");
    row.className = "repo-row";
    row.style.setProperty("--row-index", String(index));
    row.tabIndex = 0;
    row.dataset.project = repo.name;
    row.innerHTML = `
      <div>
        <h3>${escapeHtml(repo.name)}</h3>
        <div class="repo-meta">
          <span>${escapeHtml(categoryForRepo(repo))}</span>
          <span>${repo.fork ? "Fork" : "Source"}</span>
        </div>
      </div>
      <p>${escapeHtml(repoDescription(repo))}</p>
      <div class="repo-side">
        ${repoMeta(repo).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    `;
    fragment.appendChild(row);
  });

  elements.repoList.appendChild(fragment);
}

function setError(message) {
  elements.featuredStatus.className = "status-panel";
  elements.featuredStatus.innerHTML = `<div class="error-state">${escapeHtml(message)}</div>`;
  elements.repoStatus.textContent = "";
  elements.repoList.innerHTML = `<div class="error-state">Could not load repositories from GitHub.</div>`;
}

function wireFilters() {
  elements.filters.forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      elements.filters.forEach((item) => item.classList.toggle("active", item === button));
      renderRepoList();
    });
  });
}

function wireSearch() {
  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderRepoList();
  });
}

function wireProjectInspection() {
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-project]");
    if (!trigger) {
      return;
    }

    const repo = findRepo(trigger.dataset.project);
    if (repo) {
      openProject(repo);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.modal.hidden) {
      closeProject();
      return;
    }

    if ((event.key === "Enter" || event.key === " ") && event.target.matches(".repo-row, .featured-card")) {
      event.preventDefault();
      const repo = findRepo(event.target.dataset.project);
      if (repo) {
        openProject(repo);
      }
    }
  });

  elements.modalClosers.forEach((element) => {
    element.addEventListener("click", closeProject);
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

    state.repos = repos
      .filter((repo) => !repo.archived)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    setProfile(profile, state.repos);
    setSignals(state.repos);
    renderFeatured();
    renderRepoList();
  } catch (error) {
    setError("GitHub data is temporarily unavailable. Refresh the page in a moment.");
    console.error(error);
  }
}

wireFilters();
wireSearch();
wireProjectInspection();
loadGitHub();
