# CreditoHipotecar.io - Project Knowledge Doc

## Project Overview
CreditoHipotecar.io is a modern, clean, and responsive web application designed to help users manage mortgage credits, property listings, and rental properties. Inspired by the design aesthetics of Cal.com and Notion.so, the application provides comprehensive tools for property management, amortization calculations, and rental tracking, featuring smooth micro-interactions and animations to enhance user experience.

## Design Philosophy
- Modern and clean interface inspired by Cal.com and Notion.so
- Smooth micro-interactions and animations
- Responsive design optimized for all devices
- Dark mode support
- Consistent and accessible user interface

## Tech Stack
- **Frontend Framework**: React with TypeScript
- **UI Components**: ShadCN UI (based on Radix UI)
- **Styling**: Tailwind CSS with custom UI components
- **Backend**: Supabase
- **Build Tool**: Vite
- **Package Manager**: npm/bun
- **State Management**: React Context
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL

## Project Structure
```
src/
├── components/         # Reusable UI components
│   ├── ui/            # Base UI components (buttons, inputs, etc.)
│   ├── properties/    # Property-related components
│   └── dashboard/     # Dashboard-specific components
├── context/           # React Context providers
├── hooks/             # Custom React hooks
├── integrations/      # External service integrations (Supabase)
├── lib/              # Utility functions and helpers
└── pages/            # Route-based page components
```

## Key Features

### 1. Property Management
- **Property Details**
  - Name and description (address, notes)
  - Price cost with currency selection (PEN/USD)
  - Dynamic currency conversion
  
- **Monthly Cost Breakdown**
  - Loan Protection Insurance (4 options)
  - Property Insurance
  - Other Monthly Expenses
  
- **First-Home Bonus System**
  - Automatic bonus calculation based on property value
  - Different brackets for traditional and sustainable properties
  - Admin-configurable bonus amounts

#### Bonus Brackets
##### Traditional Properties:
- Range 67,400-96,200: S/26,900
- Range 96,200-144,000: S/22,400
- Range 144,000-239,800: S/20,500
- Range 239,800-355,100: S/7,600

##### Sustainable Properties:
- Range 67,400-96,200: S/32,900
- Range 96,200-144,000: S/28,400
- Range 144,000-239,800: S/26,500
- Range 239,800-355,100: S/13,600

### 2. Amortization Tools
- **Input Parameters**
  - Down payment amount and percentage
  - Interest rate configuration
  - Flexible term selection (10-30 years)
  - Multiple instalment frequency options
  - Customizable first instalment date

- **Calculation Outputs**
  - Loan amount details
  - Down payment percentage
  - Total interest and insurance costs
  - Complete payment summary
  - Monthly instalment breakdown

### 3. Rental Management (Coming Soon)
- **Income Tracking**
  - Market rent price monitoring
  - Occupancy rate tracking
  - Annual rent increase calculations

- **Expense Management**
  - Maintenance and repairs
  - Property taxes
  - Insurance costs
  - Condo fees
  - Utility tracking

### 4. Dashboard
- Property portfolio overview
- Financial summaries
- Quick access to key features
- Performance metrics

## UI Components
The application uses ShadCN UI components, built on top of Radix UI and styled with Tailwind CSS:

### Core Components
- **Navigation Sidebar**
  - Collapsible on desktop and mobile
  - Sections:
    - Header with logo
    - Main navigation
    - Footer with AI Chat and profile
    
- **Tables**: Advanced data display with sorting
- **Forms**: Validated input components
- **Badges**: Status indicators
- **Dropdowns**: Menu and selection components
- **Modals**: Interactive dialogs
- **Cards**: Information display
- **Charts**: Data visualization

## Authentication & Authorization
- User authentication via Supabase
- Protected routes and resources
- Role-based access control
- Admin privileges for bonus management

## Admin Features
- Bonus bracket configuration
- Translation management
- UI label customization
- System configuration

## State Management
- React Context is used for global state management
- Key contexts include:
  - AuthContext: User authentication state
  - Theme context: UI theme preferences
  - Exchange rate context: Currency conversion rates

## Styling Guidelines
1. **Colors**
   - Brand color: HSL(41, 89%, 61%)
   - Accent colors for interactive elements
   - Consistent use of color variables

2. **Typography**
   - System font stack
   - Consistent text sizes using Tailwind classes
   - Responsive text scaling

3. **Components**
   - Consistent spacing using Tailwind's spacing scale
   - Responsive design patterns
   - Accessible focus states and interactions

## Development Workflow
1. **Branch Strategy**
   - Main branch for production
   - Feature branches for new development
   - Pull request workflow for code review

2. **Commit Conventions**
   - Semantic commit messages
   - Categories: feat, fix, docs, style, refactor, test, chore

3. **Code Style**
   - TypeScript for type safety
   - ESLint for code quality
   - Prettier for code formatting

## Environment Setup
1. Required dependencies:
   ```bash
   node >= 16.x
   npm or bun
   ```

2. Installation:
   ```bash
   npm install
   # or
   bun install
   ```

3. Development server:
   ```bash
   npm run dev
   # or
   bun dev
   ```

## Deployment
- Production builds are created using `npm run build`
- Static assets are optimized during build
- Environment variables are managed through `.env` files

## Future Roadmap
1. **Rental Management Module**
   - Complete rental property tracking
   - Tenant management features
   - Rental income analytics

2. **Enhanced Analytics**
   - Property performance metrics
   - Financial forecasting
   - Market analysis tools

3. **Mobile Optimization**
   - Progressive Web App (PWA) features
   - Mobile-specific UI enhancements

## Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
5. Follow the code style guidelines

## Support and Documentation
- Internal documentation in `/docs`
- Component documentation in component files
- API documentation in integration files

## Maintenance
- Regular dependency updates
- Security patches
- Performance monitoring
- Bug tracking and resolution

## Contact
For questions or support:
- Project maintainers
- Development team
- Support channels 