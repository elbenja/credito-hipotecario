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
  
- **Property Insurance**
  - Auto: Automatically calculated at 0.0280% of property's value
  - Manual: User-defined insurance amount
  - Insurance rates managed through property_insurance_rates table
  - Real-time calculation for auto option
  
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

#### 2.1 Core Services and Organization

The amortization system is organized into the following structure:

```
src/
├── services/
│   └── amortization/
│       ├── calculations/
│       │   ├── loan.ts         # Core loan calculations
│       │   ├── scenarios.ts    # Scenario-specific calculations
│       │   └── cache.ts        # Calculation caching service
│       ├── types/
│       │   ├── common.ts       # Shared types and interfaces
│       │   └── scenarios.ts    # Scenario-specific types
│       └── hooks/
│           └── useLiveCalculation.ts  # Live calculation hook
└── store/
    └── amortization/
        └── store.ts            # Zustand state management
```

**Core Features:**
1. **Centralized Calculation Service**
   - Base loan calculations (loan amount, monthly payments)
   - Payment schedule generation
   - Support for 12 or 14 installments per year
   - Double payments in July and December for 14-installment scheme

2. **Scenario Management**
   - Regular: Standard amortization schedule
   - Accelerated: Extra payments reduce term
   - Lower Payment: Extra payments reduce monthly payment
   - New Rate: Interest rate changes with optional term adjustment

3. **State Management (Zustand)**
   - Property and loan details
   - Scenario states and selections
   - Calculation results
   - Error handling

4. **Caching Strategy**
   - In-memory cache for expensive calculations
   - TTL-based expiration (30 minutes default)
   - Maximum cache size (100 entries default)
   - Key generation based on property, loan values, and scenario

5. **Live Calculations**
   - Debounced updates (500ms default)
   - Automatic recalculation on value changes
   - Real-time UI updates

**Fixed Values:**
- Suggested term: 20 years
- Suggested down payment: 10%
- Default installments: 12 per year

**Calculation Rules:**
1. **Loan Amount**
   ```typescript
   loanAmount = (propertyCost - bonus) - downPayment
   ```

2. **Monthly Payment**
   ```typescript
   monthlyRate = (annualRate / 100) / installmentsPerYear
   totalPayments = termYears * installmentsPerYear
   
   if (monthlyRate === 0) {
     monthlyPayment = loanAmount / totalPayments
   } else {
     monthlyPayment = (loanAmount * monthlyRate * (1 + monthlyRate)^totalPayments) / 
                      ((1 + monthlyRate)^totalPayments - 1)
   }
   ```

3. **Extra Payments**
   - Can be one-time, monthly, or yearly
   - Reduce principal immediately
   - Recalculate remaining payments
   - Update total interest and term/payment based on scenario

4. **Rate Changes**
   - Can specify new interest rate and optional new term
   - Effective from specified date
   - Recalculate remaining payments with new rate
   - Maintain extra payments if any

**Data Persistence:**
- Scenarios stored in Supabase
- State persisted in local storage
- Cache in memory only

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

2. **Currency Formatting**
   - Standardized money representation across the application
   - Format: "[Symbol] [Amount with thousands separator and 2 decimal places]"
   - Examples:
     - PEN: "S/. 1,234.56"
     - USD: "$1,234.56"
   - Implementation details:
     - Centralized `formatCurrency` utility function
     - Handles both string and number inputs
     - Defaults to PEN if no currency specified
     - Always shows 2 decimal places
     - Uses comma as thousands separator
   - Used consistently in:
     - Form inputs
     - Payment summaries
     - Insurance calculations
     - Loan amounts
     - Monthly payments
   - Ensures professional and consistent monetary value display

3. **Badge Styling**
   - All badges use `rounded-md` instead of fully rounded corners
   - Consistent with the application's modern, clean design language
   - Applied to:
     - Status indicators
     - Down payment percentages
     - Feature tags (e.g., "Coming" in sidebar)
   - Maintains visual harmony with other UI elements that use `rounded-md`
   - Implemented through the base `badgeVariants` in the Badge component

4. **Colors**
   - Brand color: HSL(41, 89%, 61%)
   - Accent colors for interactive elements
   - Consistent use of color variables

5. **Typography**
   - System font stack
   - Consistent text sizes using Tailwind classes
   - Responsive text scaling

6. **Focus States**
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