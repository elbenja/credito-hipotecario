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
│       ├── hooks/
│       │   └── useLiveCalculation.ts  # Live calculation hook
│       └── services/
│           ├── goalSeek.ts     # GoalSeek service for payment calculation
│           └── fixedPayments.ts # FixedPayments service for accelerated scenarios
└── store/
    └── amortization/
        └── store.ts            # Zustand state management
```

**Data Model and Relationships:**

1. **Properties**
   - Contain basic property details (price_cost, property_insurance, first_home_bonus)
   - Each property can have multiple amortizations for different financing scenarios

2. **Amortizations**
   - Define the mortgage structure for a property
   - Parameters include: loan_amount, down_payment, interest, term_years, installments_per_year, loan_protection_insurance, first_installment_date
   - Formula: loan_amount = (price_cost – first_home_bonus – down_payment)
   - Each amortization has four scenarios for comparison
   - First installment date can be set in the past, but no more than 15 years before the current date
   - This allows for tracking historical amortization data and refinancing scenarios for existing loans

3. **Scenarios**
   - Four types per amortization: Regular, Accelerated, Lower Payment, New Rate
   - Each has a scenario_summary and multiple scenario_payments (monthly breakdown)

4. **Scenario Summaries**
   - total_interest_and_insurance: Sum of all interest and insurance payments
   - total_months: Duration of the loan
   - monthly_payment: Final monthly installment amount
   - break_even_point: Month where principal paid exceeds interest paid

5. **Scenario Payments**
   - Monthly breakdown of: payment_date, beginning_balance, monthly_payment, monthly_interest, property_insurance, monthly_loan_insurance, principal, ending_balance
   - Formula: principal = monthly_payment – (monthly_interest + property_insurance + monthly_loan_insurance)
   - Formula: ending_balance = beginning_balance – principal

**Core Features:**
1. **Centralized Calculation Service**
   - Base loan calculations (loan amount, monthly payments)
   - Payment schedule generation
   - Support for 12 or 14 installments per year
   - Double payments in July and December for 14-installment scheme

2. **Scenario Management**
   - Regular: Standard amortization schedule with fixed monthly payments
   - Accelerated: Extra payments reduce term while keeping base payment constant
   - Lower Payment: Extra payments reduce monthly payment while maintaining original term
   - New Rate: Interest rate changes with optional term adjustment (refinancing)

   To illustrate how the four scenarios function like four parallel timelines originating from the same starting point:
   1. **Regular** – This is the main timeline and baseline scenario. Before any adjustments, all four scenarios match the Regular scenario's payments and months.
   2. **Accelerated** – Forks from the Regular timeline whenever extra installments are applied. Each extra payment reduces the total number of months needed to finish paying off the mortgage (while the base monthly payment remains the same).
   3. **Lower Payment** – Forks from the Regular timeline whenever extra installments are applied. Each extra payment reduces the monthly payment amount for the remaining term (while the total number of months remains the same).
   4. **New Rate** – Forks from the Regular timeline (or its current balance) when a new refinancing rate is introduced. This can change both the total months remaining and the monthly payment to accommodate the updated interest rate and (optionally) new term.

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

**Core Services:**

1. **GoalSeek Service**
   - Purpose: Determines the exact monthly payment required to reach zero balance at loan end
   - Used in: Regular scenario, Lower Payment scenario, New Rate scenario
   - Inputs:
     - amount (loan_amount or remaining balance)
     - months (total or remaining months)
     - interest (annual interest rate)
     - property_insurance (fixed monthly amount)
     - loan_protection_insurance (percentage of beginning balance)
     - past_months (for partial usage in New Rate scenarios)
   - Returns:
     - base_installment: Monthly payment that zeros balance by end of term
     - total_months: For New Rate scenario, past_months + new_term_years * 12

2. **FixedPayments Service**
   - Purpose: Calculates how additional payments affect loan duration with fixed payments
   - Used in: Accelerated scenario
   - Inputs:
     - amount (remaining balance at extra installment time)
     - base_installment (from Regular scenario)
     - interest
     - property_insurance
     - loan_protection_insurance
     - past_months (if extra installment starts mid-loan)
   - Returns:
     - new_remaining_months: Updated count of months to finish loan
     - total_months: past_months + new_remaining_months

**Fixed Values:**
- Suggested term: 20 years
- Suggested down payment: 10%
- Default installments: 12 per year
- Suggested installments: 12 per year

**Calculation Rules:**
1. **Loan Amount**
   ```typescript
   loanAmount = (propertyCost - bonus) - downPayment
   ```

2. **Monthly Payment**
   ```typescript
   // Convert annual interest rate to effective monthly rate
   // This uses the Effective Annual Rate (EAR) conversion formula
   // instead of the nominal rate division
   annualRate = interestRate / 100  // Convert percentage to decimal
   monthlyRate = Math.pow(1 + annualRate, 1/12) - 1
   
   totalPayments = termYears * installmentsPerYear
   
   if (monthlyRate === 0) {
     monthlyPayment = loanAmount / totalPayments
   } else {
     monthlyPayment = (loanAmount * monthlyRate * (1 + monthlyRate)^totalPayments) / 
                      ((1 + monthlyRate)^totalPayments - 1)
   }
   ```

3. **14 Installments (Double) Payment Calculation**
   The Peruvian "Double" frequency payment scheme involves 12 monthly payments with double payments in July and December:
   - Regular months (10 months): Single payment amount
   - July and December: Double payment amount
   - Interest rate remains monthly 
   - Total yearly payments equivalent to 14 regular installments
   
   ```typescript
   // Example calculation for a loan of $100,000, 10% annual interest, 10-year term:
   // Regular monthly payment: $1,068.19016039371
   // July and December payment: $2,136.38032078742 (double)
   
   // The calculation ensures:
   // 1. Interest is computed monthly  
   // 2. Principal reduction accounts for double payments in July/December
   // 3. Loan balance reaches exactly $0 at the end of the term
   // 4. Total yearly payment equals 14 times the regular monthly amount
   ```

   **Important Clarification on Payment Structure:**
   - For the Simple option (12 installments per year):
     - The base installment and monthly payment are identical for all months
     - Same payment amount for January through December
     - Insurance costs (property insurance and loan protection) reduce the principal portion
   
   - For the Double option (14 installments per year):
     - The base installment is consistent throughout the year
     - Monthly payment equals base installment for all months EXCEPT July and December
     - In July and December: monthly payment = 2 × base installment
     - Insurance costs reduce the principal portion in all months
     - The `findCorrectMonthlyInstallment` method calculates the appropriate base installment that satisfies this relationship while ensuring the loan balance reaches zero by the end of the term

4. **Monthly Payment Breakdown**
   - beginning_balance: Debt at start of month
   - monthly_interest = beginning_balance × (monthlyRate)
   - monthly_loan_insurance = beginning_balance × (loan_protection_insurance_rate / 100)
   - property_insurance: Fixed monthly amount from property
   - For Simple option (12 installments):
     - monthly_payment = base_installment (constant throughout loan term)
     - principal = monthly_payment - monthly_interest - property_insurance - monthly_loan_insurance
   - For Double option (14 installments):
     - monthly_payment = base_installment (regular months)
     - monthly_payment = 2 × base_installment (July and December only)
     - principal = monthly_payment - monthly_interest - property_insurance - monthly_loan_insurance
   - Note: Insurance costs reduce the principal portion rather than increase the monthly payment
   - ending_balance = beginning_balance - principal

5. **Extra Payments**
   - Can be one-time, monthly, or yearly
   - Reduce principal immediately
   - Recalculate remaining payments
   - Update total interest and term/payment based on scenario

6. **Rate Changes (New Rate Refinancing)**
   - Can specify new interest rate and optional new term
   - Effective from specified date
   - Recalculate remaining payments with new rate
   - Maintain extra payments if any

**Data Persistence:**
- Scenarios stored in Supabase
- State persisted in local storage
- Cache in memory only

**User Flow:**
1. Create/select a Property (price_cost, property_insurance, first_home_bonus)
2. Define an Amortization (down_payment, interest, term_years, etc.)
3. System generates four Scenarios automatically
4. User can add extra payments or refinancing options
5. Compare results across scenarios (duration, total cost, monthly payment)
6. View detailed monthly payment breakdowns

#### 2.2 Loan Protection Insurance

##### Overview
The Loan Protection Insurance is calculated and managed at the amortization level rather than the property level, as it depends on the loan amount after down payment. Unlike property insurance (which is fixed), loan protection insurance is calculated as a percentage of the beginning balance of each month.

##### Loan Insurance Types
Four options are available:
1. **Individual** (0.028% of beginning balance)
2. **Joint** (0.052% of beginning balance)
3. **None** (0)
4. **Manual** (user-specified percentage)

##### Calculation Logic
- **Base Loan Amount** = Property Cost – Down Payment (minus applicable bonuses)
- **Monthly Insurance Cost:**
  - Individual: beginning_balance * (0.028 / 100)
  - Joint: beginning_balance * (0.052 / 100)
  - None: 0
  - Manual: beginning_balance * (user_specified_percentage / 100)

> Note: The loan protection insurance is recalculated each month based on the remaining loan balance, not a fixed amount based on the initial loan amount.

##### UI Implementation
- Located under "Basics" section in Amortization interface
- Insurance type selector (dropdown)
- Dynamic amount field:
  - Read-only for Individual/Joint (calculated)
  - Zero for None
  - Editable for Manual
- Real-time updates on type change or custom amount entry
- Integrated into monthly payment breakdown and total cost calculations

##### Data Management
- Insurance rates stored separately for easy updates
- Rates can be managed per year
- Calculations use current year's rates by default
- Monthly insurance cost included in:
  - Payment schedule (recalculated each month)
  - Total cost calculations
  - Summary statistics

#### 2.3 Special Scenario Features

##### Extra Installments
- Can be configured for Accelerated and Lower Payment scenarios
- Options:
  - One-time extra payment
  - Monthly additional payment
  - Yearly additional payment
- Parameters:
  - amount: The extra payment amount
  - frequency: one-time, monthly, yearly
  - start_date: When extra payments begin
  - starting_balance: Current loan balance when applying

##### Lower Payment Scenario: Dynamic Breakpoints and Recalculation
In the Lower Payment Scenario, extra installments are used to reduce the monthly payment—but only after the extra installment takes effect. Each extra installment creates a breakpoint, where the system recalculates a new base installment for the remaining months (up to the original loan end date) based on the new, lower remaining balance.

**How It Works:**
- **Breakpoints:**
  - When an extra installment is made, the amortization schedule is "broken" at that point.
  - **Before the Breakpoint:** All payments are made at the original base installment.
  - **At the Breakpoint:** The system recalculates the remaining balance.
  - **After the Breakpoint:** A new, lower base installment is computed for the remaining months using the GoalSeek service, ensuring that the loan is paid off exactly at the end of the original term.
- **Chronological Application:**
  - Each new breakpoint is applied in order. If a new extra installment is added later, it recalculates based on the current remaining balance.
  - If extra installments are added in an order that affects previous breakpoints, the entire sequence is re-computed chronologically.

**Example:**
1. **Initial Setup:**
   - Loan Amount: $390,360.00
   - Initial Monthly Payment: $3,028.02
   - Term: 240 months (from April 1, 2025, to March 1, 2045)
2. **Before the Breakpoint:**
   - From April 1, 2025, through December 2029, you consistently pay $3,028.02 monthly.
3. **Breakpoint Occurs:**
   - On January 1, 2030, you make an extra installment of $100,000.
   - Up to December 2029, all payments were $3,028.02.
   - On January 1, 2030, the remaining balance is recalculated, and the GoalSeek service is invoked.
4. **Recalculation:**
   - The GoalSeek service computes a new base installment for the remaining months (from January 2030 to March 2045) that will exactly pay off the new remaining balance.
   - In this example, the new base installment is recalculated to be $2,171.78.
5. **Multiple Breakpoints:**
   - You can add further extra installments later. Each extra installment acts as a new breakpoint.
   - Each breakpoint recalculates the new base installment based on the remaining balance at that time.
   - If an extra installment is applied before a previously set breakpoint, the calculations are adjusted so that all breakpoints accumulate in chronological order.

##### Refinancing Options
- Applied in the New Rate scenario
- Parameters:
  - new_interest_rate: Updated interest rate
  - new_term_years: Optional new loan duration
  - effective_date: When refinancing takes effect
  - starting_balance: Remaining balance at refinancing date

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
     - PEN: "S/ 1,234.56"
     - USD: "$1,234.56"
   - Implementation details:
     - Centralized `formatCurrency` utility function
     - Handles both string and number inputs
     - Defaults to PEN if no currency specified
     - Always shows 2 decimal places at input
     - Always limit to 0 decimal at display
     - Uses comma as thousands separator
   - Used consistently in:
     - Form inputs
     - Payment summaries
     - Insurance calculations
     - Loan amounts
     - Monthly payments
   - Ensures professional and consistent monetary value display

3. **Insurance Formatting**
   - Percentage values:
     - Always shows 4 decimal places
     - Used for insurance rate displays and calculations
   - Amount values:
     - Always shows 2 decimal places
     - Used for Manual Property Insurance amounts
   - Ensures precise and consistent insurance value representation

4. **Interest Rate Formatting**
   - Always shows 2 decimal places
   - Applied consistently across:
     - Input fields
     - Display values
     - Calculations
   - Maintains precision in interest rate representation

5. **Badge Styling**
   - All badges use `rounded-md` instead of fully rounded corners
   - Consistent with the application's modern, clean design language
   - Applied to:
     - Status indicators
     - Down payment percentages
     - Feature tags (e.g., "Coming" in sidebar)
   - Maintains visual harmony with other UI elements that use `rounded-md`
   - Implemented through the base `badgeVariants` in the Badge component

6. **Colors**
   - Brand color: HSL(41, 89%, 61%)
   - Accent colors for interactive elements
   - Consistent use of color variables

7. **Typography**
   - System font stack
   - Consistent text sizes using Tailwind classes
   - Responsive text scaling

8. **Focus States**
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
- Zustand is used for managing amortization state
  - Provides lightweight state management with minimal boilerplate
  - Handles complex amortization calculations and scenarios
  - Manages property details, loan values, and scenario selection
- Local storage persistence for user settings
  - Preserves theme preferences, language choices, and recent calculations
  - Implemented with Zustand persist middleware for amortization state
  - Automatic state rehydration on page reload
- Live Calculation Hook (`useScenarioCalculations`):
  - External, reusable hook implemented in the project's hooks directory
  - Provides real-time, debounced (500ms delay) amortization calculations
  - Designed for use across multiple pages (EditAmortization.tsx, extra-installments-section.tsx, TestExtraInstallments.tsx, NewAmortization.tsx)
  - Ensures consistent and efficient updates based on user input
  - Uses React Query for caching and state synchronization
  - Features automatic query invalidation when inputs change
  - Transparent error handling for failed calculations
  - **Real-time Scenario Recalculation**:
    - All amortization-related pages automatically recalculate scenarios whenever any input parameter changes
    - This includes changes to loan amount, interest rate, term years, installments per year, first installment date, insurance values, etc.
    - Each change triggers immediate recalculation of all four scenarios (Regular, Accelerated, Lower Payment, New Rate)
    - Both scenario summaries and detailed payment schedules update in real-time
    - Consistent calculation method across the entire application ensures reliable results

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