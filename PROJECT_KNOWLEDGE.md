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

#### 2.1 Amortization Scenarios

The Amortization view is split into two main panels:

**Left Panel (40% width)**
- Property Information
  - Property name and details
  - Property value and currency
  - First-home and sustainable status
- Loan Details
  - Down payment (amount and percentage)
  - Interest rate with validation
  - Term selection (10-30 years)
  - Installments per year
  - First installment date
- Action Buttons
  - Update/Save changes
  - Cancel/Back to list

**Right Panel (60% width)**
- Four payment scenarios displayed as tabs:
  1. Regular
  2. Accelerated
  3. Lower Payment
  4. New Rate

**Each Scenario Tab Contains:**
1. Description
   - Regular: "Base mortgage with standard parameters"
   - Accelerated: "Extra payments reduce the term, installment remains constant"
   - Lower Payment: "Extra payments reduce the monthly payment, term remains the same"
   - New Rate: "Adjusts the interest rate (and optionally term) from a specified date"

2. Summary Metrics
   - Sum Interest & Insurances: Total cost of interest and insurance over the loan term
   - Months: Total duration of the mortgage in months
   - Monthly Pay: Regular installment amount

3. Payment Breakdown Graph
   - Type: Stacked area chart
   - X-axis: Years (0 to term)
   - Y-axis: Payment amount
   - Areas:
     - Principal (green)
     - Interest (red)
   - Features:
     - Interactive tooltips showing monthly breakdown
     - 5-year interval markers
     - Grid lines for better readability

4. Summary Statistics (below graph)
   - Total Interest: Cumulative interest over the loan term
   - Average Principal Payment: Mean principal portion of payments

**Mobile Responsiveness:**
- On mobile devices (<768px):
  - Left panel takes full width
  - Right panel becomes a slide-in panel
  - "View Payment Details" button to toggle panel visibility
  - Back button to return to loan details

**Interaction Flow:**
1. User selects a scenario tab
2. Summary metrics update instantly
3. Graph refreshes to show the selected payment strategy
4. For Accelerated/Lower Payment tabs:
   - Extra payment form appears
   - Table of scheduled extra payments
5. For New Rate tab:
   - Interest rate adjustment form
   - New term selection (optional)

**Data Updates:**
- All changes in the left panel (loan details) trigger recalculation of:
  - Loan amount
  - Monthly payments
  - Interest totals
  - Graph data points
- Each scenario maintains its own state for:
  - Extra payments (Accelerated/Lower)
  - Rate changes (New Rate)
  - Payment schedule

This layout provides a clear comparison between different payment strategies while maintaining all loan details easily accessible in the left panel.

#### 2.2 Loan Protection Insurance

##### Overview
The Loan Protection Insurance is calculated and managed at the amortization level rather than the property level, as it depends on the loan amount after down payment.

##### Insurance Types
Four options are available:
1. **Individual** (0.028% of loan amount)
2. **Joint** (0.052% of loan amount)
3. **None** (0)
4. **Custom** (user-defined amount)




##### Calculation Logic
- **Base Loan Amount** = Property Cost – Down Payment (minus applicable bonuses)
- **Monthly Insurance Cost:**
  - Individual: loan_amount * (0.028 / 100)
  - Joint: loan_amount * (0.052 / 100)
  - None: 0
  - Custom: User-specified amount

##### UI Implementation
- Located under "Basics" section in Amortization interface
- Insurance type selector (dropdown)
- Dynamic amount field:
  - Read-only for Individual/Joint (calculated)
  - Zero for None
  - Editable for Custom
- Real-time updates on type change or custom amount entry
- Integrated into monthly payment breakdown and total cost calculations

##### Data Management
- Insurance rates stored separately for easy updates
- Rates can be managed per year
- Calculations use current year's rates by default
- Monthly insurance cost included in:
  - Payment schedule
  - Total cost calculations
  - Summary statistics

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
The application uses ShadCN UI components, built on top of Radix UI and styled with Tailwind CSS. Following the [shadcn/ui documentation](https://ui.shadcn.com/docs), we embrace these key principles:

### Component Philosophy
- **Open Code**: Components are not imported from a package but copied into the project, allowing full customization
- **Composition**: All components share a common, predictable interface
- **Beautiful Defaults**: Carefully chosen default styles that work well together
- **Accessibility**: Built with accessibility in mind using Radix UI primitives
- **Customization**: Easy to modify using Tailwind CSS and CSS variables

### Documentation Reference
For component-specific implementation details, refer to:
- [Components](https://ui.shadcn.com/docs/components) - Official component documentation
- [Installation](https://ui.shadcn.com/docs/installation) - Setup and configuration
- [Typography](https://ui.shadcn.com/docs/dark-mode) - Text styling guidelines
- [Colors](https://ui.shadcn.com/docs/theming) - Color system and theming
- [CLI](https://ui.shadcn.com/docs/cli) - Component addition and updates

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

### Design Decisions
1. **Date Formatting**
   - Standard format across the application: "MMM d, yyyy" (e.g., "Feb 28, 2025")
   - Implemented through a centralized `formatDate` utility function
   - Used consistently in:
     - Form inputs
     - Calendar displays
     - Table data
     - Date pickers
   - Ensures clear and concise date representation while maintaining consistency

2. **Badge Styling**
   - All badges use `rounded-md` instead of fully rounded corners
   - Consistent with the application's modern, clean design language
   - Applied to:
     - Status indicators
     - Down payment percentages
     - Feature tags (e.g., "Coming" in sidebar)
   - Maintains visual harmony with other UI elements that use `rounded-md`
   - Implemented through the base `badgeVariants` in the Badge component

3. **Colors**
   - Brand color: HSL(41, 89%, 61%)
   - Accent colors for interactive elements
   - Consistent use of color variables

4. **Typography**
   - System font stack
   - Consistent text sizes using Tailwind classes
   - Responsive text scaling

5. **Focus States**
   - Clean 3px ring in brand color without offset for all focus states
   - Consistent focus styling across all interactive elements:
     - Form inputs
     - Textareas
     - Select dropdowns
     - Date pickers
     - Buttons
   - No ring offset to maintain a cleaner, more subtle UI
   - Applied through `.form-control-focus` utility class

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

3. **Focus States**
   - Clean 3px ring in brand color without offset for all focus states
   - Consistent focus styling across all interactive elements:
     - Form inputs
     - Textareas
     - Select dropdowns
     - Date pickers
     - Buttons
   - No ring offset to maintain a cleaner, more subtle UI
   - Applied through `.form-control-focus` utility class

4. **Components**
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