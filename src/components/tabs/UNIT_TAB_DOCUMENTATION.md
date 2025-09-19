# Unit Tab Component Documentation

## Overview
The Unit Tab is a sophisticated, modular component system designed for content management and inter-unit connections within the aluminum fabrication management dashboard. It serves as the foundation for a flexible, drag-and-drop workspace where users can upload, process, and connect different types of content.

## Architecture

### Core Philosophy
The Unit component follows a **"Kinetic Context Framework"** design approach:
- **Contextual Adaptation**: UI adapts based on content type and connection state
- **Meaningful Motion**: Physics-based animations provide intuitive feedback
- **Transparent Interactions**: Clear visual feedback for all user actions
- **Modular Design**: Each Unit is self-contained but can connect with others

### Component Structure
```
Unit.jsx (1,231 lines)
├── Unit Component (Main)
├── ConnectedContainer Component (Wrapper for linked units)
└── Export: { Unit (default), ConnectedContainer }
```

## Features & Functionality

### 1. Content Type Support
The Unit component supports multiple content types with dynamic rendering:

#### Supported Types:
- **empty**: Initial state with upload interface
- **image**: Image preview with processing actions
- **text**: Text editor with formatting capabilities
- **pdf**: PDF viewer with navigation controls
- **table**: Data table display
- **xml**: XML content viewer
- **dwg**: CAD drawing placeholder
- **document**: General document viewer
- **file**: Generic file handler

#### Type Detection Logic:
```javascript
const detectInputType = useCallback((input) => {
  // File-based detection
  if (input && (input.constructor.name === 'FileList' || input.constructor.name === 'File' || input.type !== undefined)) {
    const file = input.constructor.name === 'FileList' ? input[0] : input;

    if (file.type.startsWith('image/')) return file.type.includes('svg') ? 'svg' : 'image';
    if (file.type === 'application/pdf') return 'pdf';
    if (file.name.endsWith('.xml') || file.type.includes('xml')) return 'xml';
    // ... additional type checks
  }

  // String-based detection
  if (typeof input === 'string') {
    if (input.trim().includes('\t') || input.includes(',')) return 'table';
    if (input.includes('<') && input.includes('>')) return 'xml';
    return 'text';
  }

  return 'empty';
}, []);
```

### 2. Voice-to-Text Integration
Advanced speech recognition capabilities using Web Speech API:

#### Implementation:
- **Browser Compatibility**: Automatic detection of speech recognition support
- **Real-time Transcription**: Voice input appends to existing text
- **Visual Feedback**: Microphone button with pulsing animation during recording
- **Error Handling**: Graceful fallback when speech recognition fails

#### Key Components:
```javascript
// Speech recognition setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
recognition.continuous = false;
recognition.interimResults = false;
recognition.lang = 'en-US';

// State management
const [isListening, setIsListening] = useState(false);
const [speechSupported, setSpeechSupported] = useState(false);
```

### 3. Inter-Unit Connection System
Sophisticated drag-and-drop system for connecting Units:

#### Connection Workflow:
1. **Dedicated Connection Button**: Link icon next to reset button
2. **Visual Arrow**: Dynamic SVG arrow during drag operation
3. **Auto-Connection**: Instant visual linking on drop
4. **Color Coordination**: Random color assignment for connection pairs
5. **Container Creation**: Optional wrapper for connected Units

#### Connection States:
- **idle**: No connections
- **connecting**: During drag operation
- **connected**: Units linked with shared color
- **in-container**: Units wrapped in ConnectedContainer

#### Key Functions:
```javascript
// Connection drag handlers
const handleConnectionDragStart = useCallback((e) => {
  // Initiates connection drag from dedicated button
});

const handleConnectionDragEnd = useCallback((e) => {
  // Completes connection and triggers visual updates
});

// Event-based communication
window.dispatchEvent(new CustomEvent('units-create-connected-container', {
  detail: { sourceUnitId, targetUnitId, connectionColor, positions }
}));
```

### 4. ConnectedContainer Component
Advanced wrapper for linked Units with enhanced visual design:

#### Features:
- **Glass-morphism Design**: Translucent background with backdrop blur
- **Pulsing Glow**: Animated border and shadow effects
- **Connection Bridge**: Visual line connecting Units
- **Header Information**: Unit IDs and connection status
- **Grid Layout**: 2-column responsive layout
- **Disconnect Controls**: Integrated disconnect functionality

#### Usage:
```javascript
<ConnectedContainer
  sourceUnit={{ id: 'unit1' }}
  targetUnit={{ id: 'unit2' }}
  connectionColor="rgb(59, 130, 246)"
  onDisconnect={handleDisconnect}
>
  <Unit id="unit1" isInConnectedContainer={true} />
  <Unit id="unit2" isInConnectedContainer={true} />
</ConnectedContainer>
```

## Technical Implementation

### State Management
```javascript
// Core content state
const [unitType, setUnitType] = useState('empty');
const [content, setContent] = useState(null);
const [fileUrl, setFileUrl] = useState(null);

// Connection management
const [isConnectedUnit, setIsConnectedUnit] = useState(false);
const [connectedToUnit, setConnectedToUnit] = useState(null);
const [connectionColor, setConnectionColor] = useState(null);

// Drag operation state
const [isDraggingConnection, setIsDraggingConnection] = useState(false);
const [dragStartPosition, setDragStartPosition] = useState(null);
const [dragCurrentPosition, setDragCurrentPosition] = useState(null);

// Voice input state
const [isListening, setIsListening] = useState(false);
const [speechSupported, setSpeechSupported] = useState(false);
const [textInputValue, setTextInputValue] = useState('');
```

### Event System
Global event-driven communication between Units:

#### Key Events:
- `unit-connection-drag-start`: Initiates connection drag
- `unit-connected`: Notifies target Unit of connection
- `units-create-connected-container`: Triggers container creation
- `unit-disconnected`: Handles disconnection cleanup

### Animation System
Extensive use of Framer Motion for smooth interactions:

#### Animation Types:
- **Content Transitions**: Smooth switching between content types
- **Connection Effects**: Dynamic arrow drawing and pulsing glows
- **State Changes**: Scale, opacity, and color transitions
- **Container Animations**: Layout shifts and container creation

#### Key Animation Patterns:
```javascript
// Arrow animation during drag
<motion.line
  initial={{ pathLength: 0, opacity: 0 }}
  animate={{ pathLength: 1, opacity: 1 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
/>

// Pulsing glow effect
animate={{
  boxShadow: [
    `0 0 30px ${connectionColor}80, 0 0 60px ${connectionColor}40`,
    `0 0 40px ${connectionColor}90, 0 0 80px ${connectionColor}60`,
    `0 0 30px ${connectionColor}80, 0 0 60px ${connectionColor}40`
  ]
}}
transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
```

## UI/UX Design Principles

### Visual Hierarchy
1. **Content First**: Primary focus on uploaded content
2. **Action Accessibility**: Clear, hover-responsive action buttons
3. **Status Indication**: Visual feedback for all states
4. **Connection Clarity**: Obvious visual relationships between Units

### Interaction Patterns
1. **Progressive Disclosure**: Actions reveal based on content type
2. **Contextual Menus**: Type-specific action buttons
3. **Visual Feedback**: Immediate response to user actions
4. **Error Prevention**: Clear affordances and constraints

### Color System
```javascript
// Connection colors (randomly assigned)
const colors = [
  'rgb(59, 130, 246)',   // blue
  'rgb(139, 92, 246)',   // purple
  'rgb(34, 197, 94)',    // green
  'rgb(251, 146, 60)',   // orange
  'rgb(236, 72, 153)',   // pink
  'rgb(14, 165, 233)'    // sky
];
```

### Responsive Design
- **Flexible Layout**: Adapts to content size and type
- **Touch-Friendly**: Adequate tap targets for mobile use
- **Scalable Icons**: Vector icons with responsive sizing
- **Breakpoint Awareness**: Layout adjustments for different screen sizes

## File Structure & Dependencies

### Core Dependencies
```json
{
  "framer-motion": "^12.23.12",
  "lucide-react": "latest",
  "react-pdf": "^5.3.2",
  "react": "^19.0.0"
}
```

### Import Structure
```javascript
// React core
import React, { useState, useCallback, useRef, useEffect } from 'react';

// Animation library
import { motion, AnimatePresence } from 'framer-motion';

// Icons (extensive set for all use cases)
import { Upload, FileText, Image, /* ... 30+ icons */ } from 'lucide-react';

// PDF handling
import { Document, Page, pdfjs } from 'react-pdf';
```

### PDF Configuration
```javascript
// PDF.js worker configuration
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.min.js',
  import.meta.url
).toString();
```

## API Integration Points

### Current Integrations
1. **Speech Recognition**: Browser Web Speech API
2. **File Handling**: Native File API with drag-and-drop
3. **PDF Processing**: PDF.js for document rendering

### Future Integration Opportunities
1. **AI Processing**: Ready for LLM integration via connection system
2. **Cloud Storage**: File upload/download capabilities
3. **Real-time Collaboration**: WebSocket support for multi-user editing
4. **Export Systems**: Multiple format export capabilities

## Development Guidelines

### Adding New Content Types
1. **Update Type Detection**: Add logic to `detectInputType()`
2. **Create Render Case**: Add new case in `renderContent()`
3. **Define Actions**: Add type-specific actions in `getActionsByType()`
4. **Add Icons**: Include relevant icons from Lucide React

### Extending Connection System
1. **Event Handling**: Use existing event system for communication
2. **State Management**: Follow established state patterns
3. **Visual Design**: Maintain consistent glow and animation patterns
4. **Container Integration**: Support ConnectedContainer workflow

### Performance Considerations
1. **Lazy Loading**: Content is only processed when needed
2. **Memory Management**: Proper cleanup of file URLs and event listeners
3. **Animation Optimization**: GPU-accelerated transforms
4. **Event Debouncing**: Prevents excessive re-renders during drag operations

### Error Handling Patterns
```javascript
// Speech recognition error handling
recognition.onerror = (event) => {
  console.error('Speech recognition error:', event.error);
  setIsListening(false);
};

// File processing error handling
const morphUnit = useCallback((input) => {
  try {
    const detectedType = detectInputType(input);
    // ... processing logic
  } catch (error) {
    console.error('Unit morphing error:', error);
    // Fallback to safe state
  }
}, []);
```

## Testing Considerations

### Unit Testing Focus Areas
1. **Type Detection**: Verify correct content type identification
2. **State Transitions**: Test state changes during content updates
3. **Event Handling**: Validate proper event emission and handling
4. **Connection Logic**: Test connection establishment and cleanup

### Integration Testing Scenarios
1. **Multi-Unit Connections**: Test complex connection networks
2. **Container Creation**: Verify proper ConnectedContainer behavior
3. **Drag-and-Drop**: Test various drag scenarios and edge cases
4. **Content Switching**: Test rapid content type changes

### Accessibility Testing
1. **Keyboard Navigation**: Ensure all actions are keyboard accessible
2. **Screen Reader**: Test with assistive technologies
3. **Color Contrast**: Verify sufficient contrast in all states
4. **Focus Management**: Proper focus handling during interactions

## Future Development Roadmap

### Phase 1: Enhanced Processing
- AI integration for content analysis
- Batch processing capabilities
- Content transformation tools

### Phase 2: Collaboration Features
- Real-time multi-user editing
- Version control for content changes
- Shared workspace management

### Phase 3: Advanced Connections
- Multi-unit connection networks
- Conditional connection logic
- Workflow automation

### Phase 4: Platform Integration
- Cloud storage connectivity
- Third-party service integrations
- Advanced export formats

## Troubleshooting Guide

### Common Issues
1. **Speech Recognition Not Working**: Check browser compatibility and permissions
2. **PDF Not Loading**: Verify PDF.js worker configuration
3. **Drag Operations Failing**: Check event propagation and preventDefault calls
4. **Connection Colors Not Syncing**: Verify event system communication

### Debug Tools
```javascript
// Enable debug mode for connection tracking
const DEBUG_CONNECTIONS = process.env.NODE_ENV === 'development';

if (DEBUG_CONNECTIONS) {
  console.log('Connection established:', { sourceUnitId, targetUnitId, connectionColor });
}
```

### Performance Monitoring
```javascript
// Monitor render performance
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    console.time('Unit render');
    return () => console.timeEnd('Unit render');
  }
}, [unitType, content]);
```

## Conclusion

The Unit Tab represents a sophisticated, modular approach to content management with advanced connection capabilities. Its design prioritizes user experience through meaningful animations, clear visual feedback, and intuitive interactions. The component is built for extensibility and future enhancement while maintaining robust core functionality.

For future development, focus on maintaining the established patterns while extending capabilities through the existing event system and state management approaches. The component's modular design allows for incremental improvements without disrupting core functionality.