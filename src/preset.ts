import { writeFile, mkdir } from 'fs/promises';
import { resolve, join, relative, dirname } from 'path';
import type { LandingPageAddonOptions } from './types';

/**
 * Generate a landing page story file from the user's Angular component
 */
async function generateLandingPageStory(
  componentPath: string,
  storyTitle: string,
  storyId: string,
  configDir: string
): Promise<string> {
  // Generate story file in .storybook/.generated directory
  const generatedDir = join(configDir, '.generated');
  await mkdir(generatedDir, { recursive: true });

  const storyFilePath = join(generatedDir, 'landing-page.stories.ts');

  // Resolve absolute path to component
  const absoluteComponentPath = resolve(configDir, componentPath);

  // Calculate relative path from generated story file to component
  // Remove only .ts extension for import (keep .component as it's part of the filename)
  const componentPathWithoutExt = absoluteComponentPath.replace(/\.ts$/, '');
  const importPath = relative(dirname(storyFilePath), componentPathWithoutExt).replace(/\\/g, '/');

  // Extract component class name from path (last segment)
  const pathSegments = componentPath.split('/');
  const fileName = pathSegments[pathSegments.length - 1] || 'landing-page.component';
  // Remove .component.ts, .component, or .ts extensions
  const componentName = fileName
    .replace(/\.component\.ts$/, '')
    .replace(/\.component$/, '')
    .replace(/\.ts$/, '');
  const componentClassName = componentName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('') + 'Component';

  // Convert storyTitle to a valid JavaScript identifier for the export name
  // This prevents creating a dropdown/parent - the story name matches the title
  const storyExportName = storyTitle
    .replace(/[^a-zA-Z0-9]/g, '') // Remove non-alphanumeric characters
    .replace(/^[0-9]/, '_$&') // Can't start with number
    || 'Welcome'; // Fallback

  // Generate the story file content
  // Use the storyTitle as both the title and story name to avoid hierarchy/dropdown
  const storyContent = `import type { Meta, StoryObj } from '@storybook/angular';
import { ${componentClassName} } from '${importPath}';

const meta: Meta<${componentClassName}> = {
  title: '${storyTitle}',
  component: ${componentClassName},
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<${componentClassName}>;

// Export with a name derived from title to avoid creating a dropdown/parent
// This makes "Welcome" directly clickable without children
export const ${storyExportName}: Story = {};
`;

  await writeFile(storyFilePath, storyContent, 'utf-8');

  // Return relative path from configDir for stories array
  return './.generated/landing-page.stories.ts';
}

/**
 * Storybook preset to add landing page story
 * This function is called by Storybook to modify the stories array
 */
export async function stories(entry: string[] = [], options: any) {
  // In Storybook, addon options can be passed through different paths
  // We need to find our addon's options from the addons array
  let addonOptions: LandingPageAddonOptions | undefined;

  // First, check if options are passed directly on the options object
  // (This is how Storybook passes preset-specific options)
  if (options?.componentPath) {
    addonOptions = {
      componentPath: options.componentPath,
      storyTitle: options.storyTitle,
      storyId: options.storyId,
    };
  }

  // Try to get options from the addons array (most common)
  if (!addonOptions && options?.addons && Array.isArray(options.addons)) {
    for (const addon of options.addons) {
      if (typeof addon === 'object' && addon.name === 'storybook-landing-page-addon') {
        addonOptions = addon.options;
        break;
      }
    }
  }

  // Try to get options from the preset options (handle both array and object)
  if (!addonOptions && options?.presets) {
    if (Array.isArray(options.presets)) {
      for (const preset of options.presets) {
        if (preset.name === 'storybook-landing-page-addon' ||
            (typeof preset === 'object' && preset.name === 'storybook-landing-page-addon')) {
          addonOptions = preset.options;
          break;
        }
      }
    } else if (typeof options.presets === 'object') {
      // Handle presets as an object (Map-like structure)
      for (const [key, preset] of Object.entries(options.presets)) {
        if (preset && typeof preset === 'object' && (preset as any).name === 'storybook-landing-page-addon') {
          addonOptions = (preset as any).options;
          break;
        }
      }
    }
  }

  // Also check direct options (fallback)
  if (!addonOptions && options?.options) {
    addonOptions = options.options as LandingPageAddonOptions;
  }

  if (!addonOptions?.componentPath) {
    // If no component path is provided, return original stories
    return entry;
  }

  const configDir = options?.configDir || process.cwd();
  const storyTitle = addonOptions.storyTitle || 'Welcome';
  const storyId = addonOptions.storyId || 'Default';

  // Generate the landing page story
  const landingPageStory = await generateLandingPageStory(
    addonOptions.componentPath,
    storyTitle,
    storyId,
    configDir
  );

  // Add the generated story to the beginning of the stories array
  return [landingPageStory, ...entry];
}
