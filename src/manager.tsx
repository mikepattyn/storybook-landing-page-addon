import { addons } from 'storybook/manager-api';
import { ADDON_ID } from './constants';

// Register the addon
addons.register(ADDON_ID, (api) => {
  // Inject CSS to hide the Default story from the sidebar
  const style = document.createElement('style');
  style.textContent = `
    /* Hide the Default story under Welcome */
    [data-nodetype="story"][data-itemid*="welcome--default"] {
      display: none !important;
    }
    /* Make Welcome parent clickable */
    [data-nodetype="component"][data-itemid="welcome"] {
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);

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
            const welcomeStory = Object.values(stories).find(
              (story: any) => story.title === 'Welcome' && story.name === 'Default'
            ) as any;
            if (welcomeStory && welcomeStory.id) {
              welcomeStoryId = welcomeStory.id;
            }
          }
        }

        // Method 2: Try getStoryIndex (newer API)
        if (!welcomeStoryId && typeof api.getStoryIndex === 'function') {
          const storyIndex = api.getStoryIndex();
          if (storyIndex && storyIndex.entries) {
            const welcomeStory = Object.values(storyIndex.entries).find(
              (story: any) => story.title === 'Welcome' && story.name === 'Default'
            ) as any;
            if (welcomeStory && welcomeStory.id) {
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
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(checkAndNavigate, 50);
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function(...args) {
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
