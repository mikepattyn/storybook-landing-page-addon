export interface LandingPageAddonOptions {
  /**
   * Path to the Angular component file (relative to Storybook config directory or absolute)
   * Example: '../src/app/components/landing-page/landing-page.component'
   */
  componentPath: string;
  /**
   * Title for the landing page story (default: 'Welcome')
   */
  storyTitle?: string;
  /**
   * Story ID for the landing page (default: 'welcome')
   */
  storyId?: string;
}
