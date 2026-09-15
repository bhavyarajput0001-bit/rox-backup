# Rox Neural Orbital Interface

A sophisticated AI assistant powered by Next.js, Three.js, and advanced machine learning capabilities.

## Overview

Rox is a next-generation AI assistant that combines a holographic orbital interface with powerful cognitive processing capabilities. It offers real-time tool calls, memory management, and multi-modal interactions through an intuitive glassmorphism design with an amber/gold theme.

## Key Features

### 🎯 Core Experience
- **Holographic Orb Interface**: Interactive 3D orbital visualization with hand gesture controls
- **Real-time AI Chat**: Direct conversation with advanced reasoning and tool execution
- **Tool Call Visualization**: Live display of which tools are being used
- **Cognitive State Indicators**: Visual feedback on AI processing states

### 🔐 Authentication
- **JWT-based Authentication**: Secure session management with token handling
- **Google Sheets Integration**: User registration and data storage
- **Device Management**: Multi-device support and session synchronization

### 🎨 Modern Design
- **Glassmorphism UI**: Beautiful frosted glass effects with amber/gold palette
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Smooth Animations**: Fluid transitions and micro-interactions
- **Theming Support**: Amber/Gold, Lava Red, and Dark themes

### 🤖 AI Capabilities
- **Multi-Provider Support**: OpenAI, Anthropic, Omniroute, and FreeLLM
- **Tool Integration**: 100+ specialized tools including web search, file operations, and more
- **Memory System**: Persistent conversation history and learned lessons
- **Self-Improvement**: Continuous learning from interactions

## Architecture

### Frontend (`apps/web`)
- **Framework**: React + Vite + TypeScript
- **Visualization**: Three.js for the orbital interface
- **State Management**: Zustand for global state
- **Routing**: Next.js for client-side navigation

### Backend (`packages/server`)
- **Framework**: Next.js API routes
- **Authentication**: JWT token handling and validation
- **Brain Module**: `lib/brain/` with `createBrain()` for advanced reasoning
- **Memory Integration**: Persistent conversation storage and lesson learning

### Database
- **File-based Storage**: Simple JSON-based user and device management
- **Google Sheets Integration**: Advanced data sync and user registration

## Technology Stack

### Frontend
- **Next.js 16.3.5** - React framework
- **Three.js** - 3D graphics and orbital visualization
- **Tailwind CSS** - Rapid UI development with glassmorphism
- **Lucide React** - Icon library
- **Zustand** - State management

### Backend
- **Node.js >=20** - JavaScript runtime
- **TypeScript** - Type-safe development
- **PostgreSQL/MySQL** - Optional database for production
- **Google Sheets API** - Data integration

### AI & ML
- **OpenAI API** - GPT-4 integration
- **Anthropic API** - Claude integration
- **FreeLLM** - Open-source models
- **Custom Tools** - 100+ specialized tools

## Development

### Prerequisites
```bash
node >= 20
pnpm >= 9
```

### Installation
```bash
pnpm install
```

### Development
```bash
pnpm dev:web   # Start frontend
pnpm dev:server # Start backend
pnpm dev:apps  # Start both simultaneously
```

### Build
```bash
pnpm build:web
pnpm build:server
pnpm build:apps
```

### Linting
```bash
pnpm lint
pnpm typecheck
```

## Pages & Components

### Main Application Pages
1. **`app/login/page.tsx`** - User authentication with JWT token handling
2. **`app/dashboard/page.tsx`** - Main chat interface with tool visualization
3. **`app/settings/page.tsx`** - AI provider keys and theme configuration
4. **`app/devices/page.tsx`** - Connected device management

### Custom Components
- **`components/chat/ChatMessage.tsx`** - Individual message display with tool calls
- **`components/chat/ToolCallIndicator.tsx`** - Real-time tool execution visualization
- **`components/ui/CognitiveStateBadge.tsx`** - Visual cognitive state indicators
- **`components/settings/ApiKeyInput.tsx`** - Secure API key management
- **`components/devices/DeviceCard.tsx`** - Device information and controls

## Authentication Flow

1. **Login/Register**: Users authenticate with email/password
2. **JWT Token**: Secure session token generation and validation
3. **Device Registration**: Automatic device detection and registration
4. **Session Management**: Persistent authentication across devices
5. **Protected Routes**: Dashboard, Settings, and Devices require authentication

## API Routes

- **`app/api/auth/route.ts`** - User authentication and registration
- **`app/api/assistant/route.ts`** - AI chat and tool execution
- **`app/api/brain/route.ts`** - Advanced cognitive processing
- **`app/api/memory/route.ts`** - Conversation history and learning

## Deployment

### Local Development
```bash
pnpm dev:apps
```

### Production Build
```bash
pnpm build:apps
pnpm start
```

### CI/CD
See `.github/workflows/` for automated testing and deployment pipelines.

## Features Implementation Notes

### Glassmorphism Design
- **Backdrop Blur**: Modern frosted glass effects using Tailwind's backdrop-blur
- **Color Palette**: Amber/gold theme inspired by Rox's original design
- **Responsive Typography**: Adaptive text sizes for all device types

### Tool Call Visualization
- **Real-time Updates**: Live tool execution status indicators
- **Success/Error States**: Visual feedback for tool execution results
- **Tool Icons**: Contextual icons for different tool types

### Cognitive State Management
- **Visual Indicators**: Color-coded state badges for AI processing stages
- **State Transitions**: Smooth animations between different cognitive states
- **User Feedback**: Clear indication of AI processing progress

## Future Enhancements

- **Voice Control**: Expand voice interaction capabilities
- **Multi-modal Input**: Support for images, files, and other modalities
- **Advanced Analytics**: User behavior and interaction insights
- **Custom Workflows**: User-defined tool sequences and automation
- **Collaboration**: Multi-user sessions and shared workspaces

## License

MIT License - Free for personal and commercial use.

## Support

For support and issues, please refer to the project's GitHub repository and documentation.
