// 搜索功能
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
let searchIndex = null;

function fuzzyMatch(text, keyword) {
    text = text.toLowerCase();
    keyword = keyword.toLowerCase();
    let idx = 0;
    for (let i = 0; i < text.length && idx < keyword.length; i++) {
        if (text[i] === keyword[idx]) idx++;
    }
    return idx === keyword.length;
}

async function performSearch(keyword) {
    if (!keyword.trim()) {
        searchResults.classList.add('hidden');
        return;
    }
    
    if (!searchIndex) {
        try {
            const resp = await fetch('search.json');
            searchIndex = await resp.json();
        } catch (e) {
            searchIndex = [];
        }
    }
    
    const matches = searchIndex.filter(item => 
        fuzzyMatch(item.title, keyword)
    ).slice(0, 10);
    
    if (matches.length === 0) {
        searchResults.innerHTML = '<div class="px-4 py-3 text-sm text-slate-500">未找到匹配的文档</div>';
    } else {
        searchResults.innerHTML = matches.map(item => 
            '<a href="' + item.url + '" class="block px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">' +
                '<div class="text-sm font-medium text-slate-800">' + item.title + '</div>' +
                '<div class="text-xs text-slate-400 mt-0.5">' + item.url + '</div>' +
            '</a>'
        ).join('');
    }
    
    searchResults.classList.remove('hidden');
}

if (searchInput) {
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            performSearch(this.value);
        }
    });
    
    searchInput.addEventListener('blur', function() {
        setTimeout(() => searchResults.classList.add('hidden'), 200);
    });
    
    searchInput.addEventListener('focus', function() {
        if (searchInput.value.trim()) {
            performSearch(this.value);
        }
    });
}

// 移动端菜单切换
const btn = document.getElementById('mobile-menu-btn');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('mobile-overlay');

function toggleSidebar() {
    if (sidebar.classList.contains('hidden')) {
        sidebar.classList.remove('hidden');
        sidebar.classList.add('fixed', 'inset-y-0', 'left-0', 'shadow-2xl');
        overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('hidden');
        sidebar.classList.remove('fixed', 'inset-y-0', 'left-0', 'shadow-2xl');
        overlay.classList.add('hidden');
    }
}

if (btn) btn.addEventListener('click', toggleSidebar);
if (overlay) overlay.addEventListener('click', toggleSidebar);

// 图片单击预览
document.addEventListener('DOMContentLoaded', function() {
    const preview = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');
    
    if (!preview || !previewImg) return;
    
    document.querySelectorAll('article img').forEach(img => {
        img.style.cursor = 'zoom-in';
    });
    
    document.addEventListener('click', function(e) {
        const img = e.target.closest('article img');
        if (img) {
            previewImg.src = img.src;
            preview.classList.remove('hidden');
            preview.classList.add('flex');
            return;
        }
        
        if (e.target === preview || e.target === previewImg) {
            preview.classList.add('hidden');
            preview.classList.remove('flex');
        }
    });
});

// 目录功能
function generateToc() {
    const article = document.getElementById('article-content');
    const tocNav = document.getElementById('toc-nav');
    const toc = document.getElementById('toc');
    
    if (!article || !tocNav || !toc) return;
    
    const headings = article.querySelectorAll('h2');
    
    if (headings.length === 0) {
        toc.classList.add('hidden');
        return;
    }
    
    toc.classList.remove('hidden');
    
    headings.forEach((heading) => {
        const id = heading.id;
        if (!id) return;
        
        const link = document.createElement('a');
        link.href = '#' + id;
        link.textContent = heading.textContent;
        link.className = 'block py-1 pl-3 border-l-2 border-transparent hover:border-brand-500 transition-colors';
        link.addEventListener('click', function(e) {
            e.preventDefault();
            heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        tocNav.appendChild(link);
    });
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                tocNav.querySelectorAll('a').forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === '#' + id);
                });
            }
        });
    }, { rootMargin: '-80px 0px -80% 0px' });
    
    headings.forEach(heading => observer.observe(heading));
}

// 复制链接功能
function copyLink() {
    const copyBtn = document.getElementById('copy-link');
    if (!copyBtn) return;
    
    copyBtn.addEventListener('click', async function() {
        const title = document.querySelector('article h1')?.textContent || document.title;
        const url = window.location.href;
        const text = '[' + title + '](' + url + ')';
        
        try {
            await navigator.clipboard.writeText(text);
            const copyText = copyBtn.querySelector('.copy-text');
            const originalText = copyText.textContent;
            copyText.textContent = '已复制';
            copyBtn.classList.add('text-green-600');
            setTimeout(() => {
                copyText.textContent = originalText;
                copyBtn.classList.remove('text-green-600');
            }, 2000);
        } catch (err) {
            console.error('复制失败:', err);
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    generateToc();
    copyLink();
});
