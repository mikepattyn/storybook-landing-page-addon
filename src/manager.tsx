import { addons } from 'storybook/manager-api';
import type { API_HashEntry } from 'storybook/internal/types';
import { ADDON_ID } from './constants';

// Register the addon
addons.register(ADDON_ID, (api) => {
  // Inject CSS to hide the Default story from the sidebar - do this FIRST
  const style = document.createElement('style');
  style.id = 'storybook-landing-page-addon-hide-default';
  style.textContent = `
    /* Hide the Default story under Welcome - target the actual ID */
    button#welcome--default,
    button[id="welcome--default"],
    #welcome--default,
    [id="welcome--default"],
    button[href*="welcome--default"] {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      overflow: hidden !important;
      opacity: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    /* Make Welcome parent clickable */
    [data-nodetype="component"][data-itemid="welcome"],
    [data-itemid="welcome"] {
      cursor: pointer;
    }
  `;
  // Insert at the beginning of head to ensure it loads early
  if (document.head.firstChild) {
    document.head.insertBefore(style, document.head.firstChild);
  } else {
    document.head.appendChild(style);
  }

  // Aggressive DOM manipulation - completely remove the element and its parent containers
  const hideDefaultStory = () => {
    // Target the specific ID - remove completely from DOM
    const defaultButton = document.getElementById('welcome--default');
    if (defaultButton) {
      // Find and remove parent containers (li, div, etc.)
      let current: HTMLElement | null = defaultButton as HTMLElement;
      while (current) {
        const parent: HTMLElement | null = current.parentElement;
        if (parent) {
          // Check if this parent only contains the default button or is a list item
          const siblings = Array.from(parent.children).filter((child) => child !== current);
          const hasOnlyDefault =
            siblings.length === 0 || (siblings.length === 1 && (siblings[0] as HTMLElement).id === 'welcome--default');

          // Remove the element itself
          current.remove();

          // If parent is a list item or container that only has the default, remove it too
          if (
            hasOnlyDefault &&
            (parent.tagName === 'LI' || parent.tagName === 'DIV' || parent.classList.contains('css-'))
          ) {
            current = parent;
            continue;
          }
        }
        break;
      }
    }

    // Also try by href attribute - remove completely with parent
    const buttonsByHref = document.querySelectorAll('button[href*="welcome--default"]');
    buttonsByHref.forEach((el) => {
      // Remove the button
      el.remove();
      // Also try to remove parent if it's a list item
      const parent = el.parentElement;
      if (parent && (parent.tagName === 'LI' || parent.classList.contains('css-'))) {
        // Check if parent only contains this button
        const siblings = Array.from(parent.children);
        if (siblings.length <= 1) {
          parent.remove();
        }
      }
    });

    // Also try to find by text content and remove with parent
    const allButtons = document.querySelectorAll('button, a');
    allButtons.forEach((el) => {
      const text = el.textContent?.trim().toLowerCase();
      const href = (el as HTMLElement).getAttribute('href') || '';
      const id = (el as HTMLElement).id || '';
      if (
        (text === 'default' && el.closest('[data-itemid*="welcome"]')) ||
        href.includes('welcome--default') ||
        id.includes('welcome--default')
      ) {
        el.remove();
        // Also remove parent if it's a container
        const parent = el.parentElement;
        if (parent && (parent.tagName === 'LI' || parent.classList.contains('css-'))) {
          const siblings = Array.from(parent.children);
          if (siblings.length <= 1) {
            parent.remove();
          }
        }
      }
    });

    // Find and remove any empty containers under Welcome
    const welcomeContainer = document.querySelector('[data-itemid="welcome"]');
    if (welcomeContainer) {
      // Find all children and check for empty or default-related items
      const allChildren = welcomeContainer.querySelectorAll('*');
      allChildren.forEach((child) => {
        const childId = (child as HTMLElement).id || '';
        const childHref = (child as HTMLElement).getAttribute('href') || '';
        const childText = child.textContent?.trim().toLowerCase();

        if (
          childId.includes('welcome--default') ||
          childHref.includes('welcome--default') ||
          (childText === 'default' && child.closest('[data-itemid*="welcome"]'))
        ) {
          child.remove();
          // Also remove parent if it becomes empty
          const parent = child.parentElement;
          if (parent && parent.children.length === 0) {
            parent.remove();
          }
        }
      });
    }

    // Also hide any empty list items or containers that might be placeholders
    const emptyItems = document.querySelectorAll('li:empty, div:empty, [class*="css-"]:empty');
    emptyItems.forEach((item) => {
      if (item.closest('[data-itemid*="welcome"]') && !item.closest('[data-itemid="welcome"]')) {
        item.remove();
      }
    });
  };

  // Run immediately
  hideDefaultStory();

  // Run at multiple intervals to catch late renders
  const intervals = [50, 100, 200, 500, 1000, 2000, 3000];
  intervals.forEach((delay) => {
    setTimeout(hideDefaultStory, delay);
  });

  // Watch for DOM changes with aggressive settings
  const observer = new MutationObserver((mutations) => {
    hideDefaultStory();
    // Also check all added nodes
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          // Element node
          const element = node as HTMLElement;
          if (element.id === 'welcome--default' || element.querySelector?.('#welcome--default')) {
            hideDefaultStory();
          }
        }
      });
    });
  });

  // Start observing immediately with aggressive settings
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['id', 'href'],
  });

  // Also observe the sidebar container specifically if it exists
  const sidebarObserver = new MutationObserver(hideDefaultStory);
  const sidebar = document.querySelector('[class*="sidebar"], [class*="Sidebar"]');
  if (sidebar) {
    sidebarObserver.observe(sidebar, { childList: true, subtree: true });
  }

  // Run continuously every 100ms for the first 5 seconds
  let checkCount = 0;
  const continuousCheck = setInterval(() => {
    hideDefaultStory();
    checkCount++;
    if (checkCount > 50) {
      // Stop after 5 seconds (50 * 100ms)
      clearInterval(continuousCheck);
    }
  }, 100);

  // Function to navigate to the Default story when Welcome parent is clicked
  const navigateToWelcomeStory = () => {
    // Wait for stories to be configured
    const checkAndNavigate = () => {
      try {
        // Get the current story data
        const currentStory = api.getCurrentStoryData();

        // Try to find the Welcome story using available API methods
        let welcomeStoryId = null;

        // Method 1: Try getStories (older API)
        if (typeof api.getStories === 'function') {
          const stories = api.getStories();
          if (stories) {
            const welcomeStory = (Object.values(stories) as API_HashEntry[]).find(
              (story) => 'title' in story && story.title === 'Welcome' && 'name' in story && story.name === 'Default',
            );
            if (welcomeStory && 'id' in welcomeStory && welcomeStory.id) {
              welcomeStoryId = welcomeStory.id;
            }
          }
        }

        // Method 2: Try getStoryIndex (newer API)
        if (!welcomeStoryId && typeof api.getStoryIndex === 'function') {
          const storyIndex = api.getStoryIndex();
          if (storyIndex && storyIndex.entries) {
            const welcomeStory = (Object.values(storyIndex.entries) as API_HashEntry[]).find(
              (story) => 'title' in story && story.title === 'Welcome' && 'name' in story && story.name === 'Default',
            );
            if (welcomeStory && 'id' in welcomeStory && welcomeStory.id) {
              welcomeStoryId = welcomeStory.id;
            }
          }
        }

        // If we found the story and we're not already on it, navigate to it
        if (welcomeStoryId && (!currentStory || currentStory.id !== welcomeStoryId)) {
          // Check if we're on the Welcome parent (no story selected or different story)
          const urlParams = new URLSearchParams(window.location.search);
          const path = urlParams.get('path') || '';

          // If path is empty or points to Welcome parent, navigate to Default story
          if (!path || path === '/story/welcome' || path.startsWith('/story/welcome--')) {
            if (path !== `/story/${welcomeStoryId}`) {
              api.selectStory(welcomeStoryId, undefined, {});
            }
          }
        }
      } catch (error) {
        // Silently handle errors - story might not be ready yet
        console.debug('[storybook-landing-page-addon] Navigation check:', error);
      }
    };

    // Listen for story changes and URL changes
    if (typeof api.on === 'function') {
      api.on('storyChanged', checkAndNavigate);
      api.on('storyIndexChanged', checkAndNavigate);
    }

    // Also check on initial load
    setTimeout(checkAndNavigate, 100);

    // Listen for URL changes (when Welcome parent is clicked)
    const originalPushState = history.pushState;
    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      setTimeout(checkAndNavigate, 50);
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      setTimeout(checkAndNavigate, 50);
    };

    // Also listen to popstate events
    window.addEventListener('popstate', () => {
      setTimeout(checkAndNavigate, 50);
    });
  };

  // Wait for API to be ready
  if (typeof api.once === 'function') {
    api.once('storiesConfigured', navigateToWelcomeStory);
  } else {
    // Fallback: try after a delay
    setTimeout(navigateToWelcomeStory, 1000);
  }
});
