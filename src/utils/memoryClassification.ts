/**
 * Main entry point for memory classification system
 * Delegates to specialized modules for different aspects of classification
 */

export { processContent } from './memory/classification';
export { splitIntoSegments } from './memory/segmentation';
export { calculateImportance } from './memory/importance';
export { CLASSIFICATION_PATTERNS } from './memory/patterns';
