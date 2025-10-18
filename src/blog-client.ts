type BlogPageState =
  | ({
    page: 'index';
    posts: BlogClientPost[];
    categories: string[];
    tags: string[];
    generatedAt: string;
  })
  | ({
    page: 'post';
    post: BlogClientPost;
    relatedPosts: BlogClientPost[];
    generatedAt: string;
  });

interface BlogClientPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  updatedAt: string | null;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  authorName: string | null;
  tags: string[];
  categories: string[];
  readingTimeMinutes: number;
}

declare global {
  interface Window {
    __BLOG_DATA__?: BlogPageState;
  }
}

(function bootstrapBlogClient() {
  if (typeof window === 'undefined') return;
  const state = window.__BLOG_DATA__;
  if (!state) return;

  if (state.page === 'index') {
    initializeIndexInteractions(state);
  } else if (state.page === 'post') {
    initializePostInteractions();
  }
})();

function initializeIndexInteractions(state: Extract<BlogPageState, { page: 'index' }>) {
  const root = document.querySelector<HTMLElement>('[data-blog-posts]');
  if (!root) return;

  const searchInput = document.querySelector<HTMLInputElement>('[data-blog-search]');
  const categorySelect = document.querySelector<HTMLSelectElement>('[data-category-filter]');
  const clearFiltersButton = document.querySelector<HTMLButtonElement>('[data-clear-filters]');
  const loadMoreButton = document.querySelector<HTMLButtonElement>('[data-load-more]');
  const noResults = document.querySelector<HTMLElement>('[data-no-results]');
  const paginationStatus = document.querySelector<HTMLElement>('[data-pagination-status]');
  const sentinel = document.querySelector<HTMLElement>('[data-infinite-scroll-sentinel]');

  const INITIAL_BATCH = Math.min(9, state.posts.length || 9);
  const BATCH_SIZE = 6;

  const postMeta = new Map<string, BlogClientPost>();
  state.posts.forEach((post) => postMeta.set(post.slug, post));

  const entries = Array.from(root.querySelectorAll<HTMLElement>('article[data-post-slug]'));

  let currentLimit = INITIAL_BATCH;
  let activeQuery = '';
  let activeCategory = '';
  let filteredEntries: HTMLElement[] = entries.slice();

  applyFilters();
  bindEvents();

  function bindEvents() {
    searchInput?.addEventListener('input', handleSearchInput);
    categorySelect?.addEventListener('change', handleCategoryChange);
    clearFiltersButton?.addEventListener('click', handleClearFilters);
    loadMoreButton?.addEventListener('click', handleLoadMore);

    if (sentinel && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entriesList) => {
        for (const entry of entriesList) {
          if (entry.isIntersecting) {
            handleLoadMore();
            break;
          }
        }
      }, { rootMargin: '200px 0px' });

      observer.observe(sentinel);
    }
  }

  function handleSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    activeQuery = target.value.trim().toLowerCase();
    currentLimit = INITIAL_BATCH;
    applyFilters();
  }

  function handleCategoryChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    activeCategory = target.value;
    currentLimit = INITIAL_BATCH;
    applyFilters();
  }

  function handleClearFilters() {
    if (searchInput) searchInput.value = '';
    if (categorySelect) categorySelect.value = '';
    activeQuery = '';
    activeCategory = '';
    currentLimit = INITIAL_BATCH;
    applyFilters();
    searchInput?.focus({ preventScroll: true });
  }

  function handleLoadMore() {
    if (filteredEntries.length <= currentLimit) return;
    currentLimit += BATCH_SIZE;
    revealEntries();
  }

  function applyFilters() {
    filteredEntries = entries.filter((element) => {
      const slug = element.dataset.postSlug;
      if (!slug) return false;
      const post = postMeta.get(slug);
      if (!post) return false;

      if (activeCategory) {
        if (!post.categories.some((category) => compareStrings(category, activeCategory))) {
          return false;
        }
      }

      if (activeQuery) {
        const haystack = [
          post.title,
          post.excerpt,
          post.categories.join(' '),
          post.tags.join(' '),
        ].join(' ').toLowerCase();
        if (!haystack.includes(activeQuery)) {
          return false;
        }
      }

      return true;
    });

    currentLimit = Math.min(currentLimit, Math.max(filteredEntries.length, INITIAL_BATCH));
    revealEntries();
    updateStatus();
  }

  function revealEntries() {
    let visibleCount = 0;

    entries.forEach((element) => {
      if (!filteredEntries.includes(element) || visibleCount >= currentLimit) {
        element.setAttribute('hidden', 'true');
        element.setAttribute('tabindex', '-1');
      } else {
        element.removeAttribute('hidden');
        element.removeAttribute('tabindex');
        visibleCount += 1;
      }
    });

    const hasMore = filteredEntries.length > currentLimit;
    if (loadMoreButton) {
      loadMoreButton.toggleAttribute('hidden', !hasMore);
      loadMoreButton.toggleAttribute('aria-hidden', !hasMore);
    }

    if (noResults) {
      const shouldShowNoResults = filteredEntries.length === 0;
      noResults.toggleAttribute('hidden', !shouldShowNoResults);
      noResults.classList.toggle('hidden', !shouldShowNoResults);
    }
  }

  function updateStatus() {
    if (!paginationStatus) return;
    const total = filteredEntries.length;
    const visible = Math.min(currentLimit, total);
    if (total === 0) {
      paginationStatus.textContent = 'No posts match your search.';
    } else if (visible >= total) {
      paginationStatus.textContent = `Showing all ${total} journal entries.`;
    } else {
      paginationStatus.textContent = `Showing ${visible} of ${total} journal entries.`;
    }
  }
}

function initializePostInteractions() {
  const codeBlocks = document.querySelectorAll<HTMLElement>('.ir-code-block');
  codeBlocks.forEach((block) => {
    block.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        (event.currentTarget as HTMLElement).blur();
      }
    });
  });
}

function compareStrings(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}
