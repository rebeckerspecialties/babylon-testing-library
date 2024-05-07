/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from 'jest';

const ignoreModules = ['@babylonjs'];

const config: Config = {
    clearMocks: true,
    collectCoverage: true,
    testEnvironment: 'jsdom',
    transformIgnorePatterns: [
        `/node_modules/(?!(${ignoreModules.join('|')})/)(.*)`,
    ],
    moduleFileExtensions: ['ts', 'js', 'html'],
};

export default config;
