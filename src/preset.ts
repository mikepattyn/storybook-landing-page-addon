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
  // Remove .component.ts or .ts extension for import
  const componentPathWithoutExt = absoluteComponentPath
    .replace(/\.component\.ts$/, '')
    .replace(/\.ts$/, '');
  const importPath = relative(dirname(storyFilePath), componentPathWithoutExt).replace(/\\/g, '/');

  // Extract component class name from path (last segment)
  const pathSegments = componentPath.split('/');
  const fileName = pathSegments[pathSegments.length - 1] || 'landing-page.component';
  const componentName = fileName.replace(/\.component\.ts$/, '').replace(/\.ts$/, '');
  const componentClassName = componentName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('') + 'Component';

  // Generate the story file content
  const storyContent = `import type { Meta, StoryObj } from '@storybook/angular';
import { ${componentClassName} } from '${importPath}';

const meta: Meta<${componentClassName}> = {
  title: '${storyTitle}',
  component: ${componentClassName},
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<${componentClassName}>;

export const ${storyId}: Story = {};
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
  // In Storybook, addon options are passed through options.presets
  // We need to find our addon's options from the addons array
  let addonOptions: LandingPageAddonOptions | undefined;

  // Try to get options from the preset options
  if (options?.presets && Array.isArray(options.presets)) {
    for (const preset of options.presets) {
      if (preset.name === 'storybook-landing-page-addon' ||
          (typeof preset === 'object' && preset.name === 'storybook-landing-page-addon')) {
        addonOptions = preset.options;
        break;
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
