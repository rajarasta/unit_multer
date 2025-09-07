# unit-multer

**Dynamic TAB Component with Unitizer** - Advanced web application showcasing intelligent UI fusion technology and multi-grid layouts.

## 🚀 Features

### Dynamic Layout System
- **Multiple Grid Configurations**: 1x1, 2x2, 3x3, 3x2, 2x3, 4x4, 6x6
- **Real-time Layout Switching**: Instant grid reconfiguration
- **Responsive Design**: Built with Tailwind CSS

### 🔗 Unitizer Technology
- **Drag-and-Drop Fusion**: Connect units by dragging glowing connector buttons
- **Smart Content Combinations**: Intelligent merging of different content types
- **Multi-Level Fusion**: Support for 2-unit and 3-unit combinations
- **Visual Feedback**: Animated connectors with glow effects and hover states

### 🎨 Content Types
- **Picture**: CSS-generated landscape art with mountains and sun
- **Chat**: Simulated AI conversation interface
- **Table**: Dynamic data tables with product information
- **Drawing**: ASCII art technical diagrams

### ✨ Interactive Elements
- **Input Mode**: Customizable prompts with send functionality
- **Display Mode**: Rich content visualization after processing
- **Smooth Transitions**: Framer Motion-inspired animations
- **Croatian Interface**: Full localization support

## 🎯 Content Fusion Logic

The Unitizer intelligently combines different content types:

- **Picture + Chat + Table**: Comprehensive product reports with AI commentary
- **Picture + Drawing**: ASCII art overlaid on landscape backgrounds
- **Chat + Table**: Enhanced data tables with AI descriptions  
- **Picture + Chat**: Split-screen image analysis with code suggestions
- **Chat + Drawing**: Conversational technical diagrams
- **Table + Drawing**: Data visualization with technical schematics

## 🛠️ Technology Stack

- **HTML5** with semantic structure
- **Tailwind CSS** via CDN for utility-first styling
- **Vanilla JavaScript** for dynamic interactions
- **CSS3** animations and custom art generation
- **Google Fonts (Inter)** for modern typography
- **SVG Icons** for UI elements

## 🚀 Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rajarasta/unit_multer
   cd unit_multer
   ```

2. **Open the application**:
   ```bash
   # Simply open in any modern web browser
   open dynamic-tab-unitizer.html
   ```

3. **Experiment with layouts**:
   - Use sidebar buttons to switch between grid configurations
   - In 2x2 mode, click send buttons to activate display mode
   - Drag connector buttons between units to create fusions

## 🎮 How to Use

### Basic Interaction
1. **Layout Selection**: Choose from 7 different grid layouts using the right sidebar
2. **Content Input**: Enter prompts in input fields and click the send button
3. **Unit Fusion**: Drag glowing connector buttons from one unit to another

### Advanced Features
- **2-Unit Fusion**: Creates a side-by-side layout with remaining units
- **3-Unit Fusion**: Combines all units into a comprehensive single view
- **Smart Content**: System automatically generates appropriate combined content
- **Visual Feedback**: Connectors glow and pulse to indicate interaction possibilities

## 🎨 Design System

### Color Palette
- **Primary**: Indigo tones (`#6366f1`, `#4f46e5`)
- **Success**: Green highlights (`#10b981`)
- **Neutral**: Gray scale for backgrounds and text
- **Interactive**: Blue tones for hover states

### Animation Principles
- **Duration**: 200-400ms for interactions, 800ms for major transitions
- **Easing**: `ease-in-out` for natural movement
- **Visual Hierarchy**: Spotlight active elements, dim inactive ones
- **No Teleportation**: All changes smoothly animated

### Typography
- **Font**: Inter (Google Fonts)
- **Scale**: Responsive sizing from 0.5rem to 1.25rem
- **Weight**: 400-700 range for hierarchy

## 🌐 Browser Compatibility

- **Chrome/Chromium**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

## 📁 File Structure

```
unit_multer/
├── dynamic-tab-unitizer.html    # Complete standalone application
├── README.md                    # This documentation
└── .git/                       # Git repository
```

## 🎯 Use Cases

### Educational
- **UI/UX Demonstrations**: Show advanced interaction patterns
- **Web Development Teaching**: Example of modern CSS/JS techniques
- **Design System Examples**: Reference implementation for fusion UIs

### Professional
- **Prototype Development**: Rapid UI concept validation
- **Client Presentations**: Interactive demo for design proposals
- **Component Libraries**: Reference for advanced interaction patterns

## 🔧 Customization

### Adding New Content Types
```javascript
// In createDisplayUnitComponent function
case 'newType': 
  return `<div class="custom-content">Your HTML here</div>`;
```

### Modifying Fusion Logic
```javascript
// In createUnitizerComponent function
if (contentTypes.has('type1') && contentTypes.has('type2')) {
  fusedContentHTML = `Your combined content logic`;
}
```

### Styling Changes
- Modify CSS custom properties in the `<style>` section
- Adjust Tailwind classes throughout the HTML
- Customize animation durations and easing functions

## 🚀 Future Enhancements

- [ ] Save/Load layout configurations
- [ ] Export fusion results
- [ ] More content types (video, audio, charts)
- [ ] Real AI integration capabilities
- [ ] Mobile touch gesture support
- [ ] Accessibility improvements

## 📄 License

This project is open source under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -m 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Create a Pull Request

---

**unit-multer** - Showcasing the future of intelligent UI interaction patterns with fusion technology.