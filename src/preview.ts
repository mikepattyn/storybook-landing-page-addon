/**
 * Preview configuration for the landing page addon
 * The landing page component is rendered through a generated story,
 * so no special decorators are needed here.
 */
import type { ProjectAnnotations, Renderer } from 'storybook/internal/types';

const preview: ProjectAnnotations<Renderer> = {
  // No decorators needed - the landing page is rendered via the generated story
};

export default preview;
