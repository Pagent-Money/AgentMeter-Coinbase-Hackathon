# AgentMeter Prototype

A Next.js prototype for AgentMeter - Metering & Billing your Agents with x402 enabled stablecoin micropayment.

## Features

- **Homepage with Banner**: Project branding and key value proposition
- **Agent Meter SDK Section**: Python SDK for Langchain compatibility with code examples
- **Business Portal Section**: Comprehensive platform overview with features and pricing
- **Responsive Design**: Modern, mobile-friendly interface
- **Header & Footer**: Navigation and branding elements

## Getting Started

### Prerequisites

- Node.js 16.0 or later
- npm or yarn

### Installation

1. Navigate to the prototype directory:
```bash
cd prototype
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
prototype/
├── components/          # Reusable React components
│   ├── Header.js       # Navigation header
│   └── Footer.js       # Site footer
├── pages/              # Next.js pages
│   ├── _app.js         # App wrapper
│   └── index.js        # Homepage
├── styles/             # CSS styles
│   └── globals.css     # Global styles
├── package.json        # Dependencies and scripts
└── next.config.js      # Next.js configuration
```

## Key Sections

### 1. Banner Section
- Project name: AgentMeter
- Headline: "Metering & Billing your Agents with x402 enabled stablecoin micropayment"

### 2. Agent Meter SDK
- Python SDK for Langchain compatibility
- Code examples with AM-Keys
- Integration guide for business portal setup

### 3. AgentMeter Business Portal
- Platform overview for agent producers
- Feature highlights including analytics, pricing, and auto-billing
- Call-to-action buttons for login/registration

## Technologies Used

- **Next.js 14**: React framework for production
- **React 18**: JavaScript library for building user interfaces
- **CSS3**: Modern styling with flexbox and grid layouts
- **Responsive Design**: Mobile-first approach

## License

This prototype is part of the AgentMeter project. 