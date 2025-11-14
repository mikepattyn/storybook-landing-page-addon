import { addons } from 'storybook/manager-api';
import { ADDON_ID } from './constants';

// Register the addon
addons.register(ADDON_ID, (api) => {
  // Function to navigate to landing page if no story is selected
  const navigateToLandingPage = () => {
    const currentStory = api.getCurrentStoryData();
    
    // If no story is selected, navigate to the landing page
    if (!currentStory) {
      const storyIndex = api.getStoryIndex();
      
      if (storyIndex) {
        const stories = Object.values(storyIndex.entries);
        // Find the landing page story (it should be titled "Welcome" by default)
        // or fall back to the first story in the index
        const landingPageStory = stories.find(
          (story) => story.title === 'Welcome' || story.id.includes('welcome')
        ) || stories[0];
        
        if (landingPageStory) {
          // Navigate to the landing page story
          api.selectStory({
            storyId: landingPageStory.id,
            viewMode: 'story',
          });
        }
      }
    }
  };
  
  // Check immediately if story index is already available
  if (api.getStoryIndex()) {
    navigateToLandingPage();
  } else {
    // Otherwise wait for it to be ready
    api.once('storyIndexerReady', navigateToLandingPage);
  }
});
