/**
 * AoE Template Component
 *
 * Main wrapper component for area of effect templates.
 * Automatically selects the correct template component based on template type.
 * Features:
 * - Support for all template shapes (cone, sphere, cube, cylinder, line, ray)
 * - Render semi-transparent overlay
 * - Show size labels
 * - Snap to grid
 * - Highlight affected grid squares
 * - Highlight tokens inside template
 * - Draggable and rotatable
 * - Color customization
 */

import React from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Point2D } from '@/types/scene';
import { MeasurementTemplate, TemplateType } from '@/types/drawing';
import { Token } from '@/types/token';
import { ConeTemplate } from './ConeTemplate';
import { SphereTemplate } from './SphereTemplate';
import { CubeTemplate } from './CubeTemplate';
import { LineTemplate } from './LineTemplate';

// ===========================
// Types
// ===========================

export interface AoETemplateProps {
  /** Template data */
  template: MeasurementTemplate;
  /** Grid size in pixels */
  gridSize: number;
  /** Tokens on the map */
  tokens?: Token[];
  /** Whether the template is draggable */
  draggable?: boolean;
  /** Whether the template is rotatable */
  rotatable?: boolean;
  /** Whether to highlight affected grid squares */
  showGridHighlight?: boolean;
  /** Whether to highlight affected tokens */
  highlightTokens?: boolean;
  /** Whether to use grid distance calculation */
  useGridDistance?: boolean;
  /** Whether the template is selected */
  isSelected?: boolean;
  /** Click handler */
  onClick?: (template: MeasurementTemplate, event: ThreeEvent<MouseEvent>) => void;
  /** Drag handler */
  onDrag?: (template: MeasurementTemplate, position: Point2D) => void;
  /** Rotation handler */
  onRotate?: (template: MeasurementTemplate, direction: number) => void;
}

// ===========================
// Component
// ===========================

/**
 * AoETemplate - Main wrapper for all template types
 *
 * This component automatically renders the appropriate template component
 * based on the template type (cone, sphere, cube, line, etc.)
 */
export const AoETemplate: React.FC<AoETemplateProps> = (props) => {
  const { template } = props;

  // Select the appropriate template component based on type
  switch (template.templateType) {
    case TemplateType.CONE:
      return <ConeTemplate {...props} />;

    case TemplateType.SPHERE:
    case TemplateType.CYLINDER:
      // Sphere and Cylinder use the same visualization (circle/sphere)
      return <SphereTemplate {...props} />;

    case TemplateType.CUBE:
      return <CubeTemplate {...props} />;

    case TemplateType.LINE:
    case TemplateType.RAY:
      // Line and Ray use the same visualization
      return <LineTemplate {...props} />;

    default:
      console.warn(`Unknown template type: ${template.templateType}`);
      return null;
  }
};

// ===========================
// Template Group Component
// ===========================

export interface AoETemplateGroupProps {
  /** Array of templates to render */
  templates: MeasurementTemplate[];
  /** Grid size in pixels */
  gridSize: number;
  /** Tokens on the map */
  tokens?: Token[];
  /** Selected template ID */
  selectedTemplateId?: string | null;
  /** Whether templates are draggable */
  draggable?: boolean;
  /** Whether templates are rotatable */
  rotatable?: boolean;
  /** Whether to highlight affected grid squares */
  showGridHighlight?: boolean;
  /** Whether to highlight affected tokens */
  highlightTokens?: boolean;
  /** Template click handler */
  onTemplateClick?: (template: MeasurementTemplate, event: ThreeEvent<MouseEvent>) => void;
  /** Template drag handler */
  onTemplateDrag?: (template: MeasurementTemplate, position: Point2D) => void;
  /** Template rotation handler */
  onTemplateRotate?: (template: MeasurementTemplate, direction: number) => void;
}

/**
 * AoETemplateGroup - Renders multiple templates efficiently
 *
 * Use this component when you need to render multiple templates on the map.
 */
export const AoETemplateGroup: React.FC<AoETemplateGroupProps> = ({
  templates,
  gridSize,
  tokens = [],
  selectedTemplateId = null,
  draggable = true,
  rotatable = true,
  showGridHighlight = true,
  highlightTokens = true,
  onTemplateClick,
  onTemplateDrag,
  onTemplateRotate,
}) => {
  return (
    <group name="aoe-templates-layer">
      {templates.map((template) => {
        // Skip hidden templates (unless they're persistent)
        if (template.hidden && !template.persistent) {
          return null;
        }

        const isSelected = selectedTemplateId === template.id;

        return (
          <AoETemplate
            key={template.id}
            template={template}
            gridSize={gridSize}
            tokens={tokens}
            draggable={draggable && !template.locked}
            rotatable={rotatable && !template.locked}
            showGridHighlight={showGridHighlight}
            highlightTokens={highlightTokens}
            isSelected={isSelected}
            onClick={onTemplateClick}
            onDrag={onTemplateDrag}
            onRotate={onTemplateRotate}
          />
        );
      })}
    </group>
  );
};

export default AoETemplate;
