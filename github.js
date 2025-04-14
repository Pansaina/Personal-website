// GitHub API配置
const GITHUB_API = 'https://api.github.com';
const USERNAME = 'SeNa'; // GitHub用户名（注意：GitHub用户名是区分大小写的）
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

// GitHub API请求配置
const API_OPTIONS = {
    headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': GITHUB_TOKEN ? `Bearer ${GITHUB_TOKEN}` : '',
        'User-Agent': 'pansaina-portfolio'
    }
};

// 加载GitHub个人信息
async function loadGitHubProfile() {
    try {
        console.log('开始加载GitHub信息...');
        const apiUrl = `${GITHUB_API}/users/${USERNAME}`;
        console.log('请求URL:', apiUrl);
        
        showLoading('github-profile');
        const response = await fetch(apiUrl, {
            headers: API_OPTIONS.headers
        });
        
        console.log('API响应状态:', response.status);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP错误: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('获取到的GitHub数据:', data);
        
        if (data.message === "Not Found") {
            throw new Error('未找到GitHub用户，请检查用户名是否正确');
        }
        
        // 更新个人信息
        updateProfile(data);
        
        // 加载其他数据
        await Promise.all([
            loadStarCount(),
            loadTopRepositories(),
            loadLanguagesStats()
        ]);
        
    } catch (error) {
        console.error('加载GitHub信息失败:', error);
        showError('github-profile', error.message);
    }
}

// 更新个人资料信息
function updateProfile(data) {
    const avatar = document.getElementById('github-avatar');
    const name = document.getElementById('github-name');
    const bio = document.getElementById('github-bio');
    const followers = document.getElementById('followers');
    const repos = document.getElementById('repos');
    const link = document.getElementById('github-link');
    
    if (avatar) avatar.src = data.avatar_url || '';
    if (name) name.textContent = data.name || data.login;
    if (bio) bio.textContent = data.bio || '暂无简介';
    if (followers) followers.textContent = data.followers || 0;
    if (repos) repos.textContent = data.public_repos || 0;
    if (link) link.href = data.html_url;
}

// 加载仓库星标总数
async function loadStarCount() {
    try {
        const apiUrl = `${GITHUB_API}/users/${USERNAME}/repos?per_page=100`;
        const response = await fetch(apiUrl, {
            headers: API_OPTIONS.headers
        });
        
        if (!response.ok) {
            throw new Error('加载仓库信息失败');
        }
        
        const repos = await response.json();
        const starCount = repos.reduce((total, repo) => total + repo.stargazers_count, 0);
        document.getElementById('stars').textContent = starCount;
    } catch (error) {
        console.error('加载星标数失败:', error);
        document.getElementById('stars').textContent = '0';
    }
}

// 加载热门仓库
async function loadTopRepositories() {
    try {
        showLoading('repos-container');
        const apiUrl = `${GITHUB_API}/users/${USERNAME}/repos?sort=stars&per_page=6`;
        const response = await fetch(apiUrl, {
            headers: API_OPTIONS.headers
        });
        
        if (!response.ok) {
            throw new Error('加载仓库信息失败');
        }
        
        const repos = await response.json();
        const container = document.getElementById('repos-container');
        
        if (container) {
            container.innerHTML = '';
            repos.forEach(repo => {
                const card = createRepoCard(repo);
                container.appendChild(card);
            });
        }
    } catch (error) {
        console.error('加载仓库失败:', error);
        showError('repos-container', error.message);
    }
}

// 创建仓库卡片
function createRepoCard(repo) {
    const card = document.createElement('div');
    card.className = 'repo-card';
    
    card.innerHTML = `
        <h3>${repo.name}</h3>
        <p>${repo.description || '暂无描述'}</p>
        <div class="repo-stats">
            <span><i class="fas fa-star"></i> ${repo.stargazers_count}</span>
            <span><i class="fas fa-code-branch"></i> ${repo.forks_count}</span>
            <span><i class="fas fa-circle"></i> ${repo.language || 'N/A'}</span>
        </div>
    `;
    
    card.addEventListener('click', () => {
        window.open(repo.html_url, '_blank');
    });
    
    return card;
}

// 加载编程语言统计
async function loadLanguagesStats() {
    try {
        const apiUrl = `${GITHUB_API}/users/${USERNAME}/repos`;
        const response = await fetch(apiUrl, {
            headers: API_OPTIONS.headers
        });
        
        if (!response.ok) {
            throw new Error('加载语言统计失败');
        }
        
        const repos = await response.json();
        
        // 统计语言使用情况
        const languages = {};
        await Promise.all(repos.map(async repo => {
            if (repo.language) {
                languages[repo.language] = (languages[repo.language] || 0) + 1;
            }
        }));
        
        // 创建饼图
        const ctx = document.getElementById('languages-chart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(languages),
                datasets: [{
                    data: Object.values(languages),
                    backgroundColor: generateColors(Object.keys(languages).length),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    } catch (error) {
        console.error('加载语言统计失败:', error);
        showError('languages-chart', '加载语言统计失败');
    }
}

// 生成随机颜色
function generateColors(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(`hsl(${(i * 360) / count}, 70%, 50%)`);
    }
    return colors;
}

// 显示加载状态
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="loading-message">
                <i class="fas fa-spinner fa-spin"></i>
                <p>正在加载数据...</p>
            </div>
        `;
    }
}

// 显示错误信息
function showError(containerId, message = '加载失败，请稍后重试') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
                <button onclick="retryLoad('${containerId}')" class="retry-button">
                    <i class="fas fa-redo"></i> 重试
                </button>
            </div>
        `;
    }
}

// 重试加载
function retryLoad(containerId) {
    switch(containerId) {
        case 'github-profile':
            loadGitHubProfile();
            break;
        case 'repos-container':
            loadTopRepositories();
            break;
        case 'languages-chart':
            loadLanguagesStats();
            break;
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadGitHubProfile();
}); 