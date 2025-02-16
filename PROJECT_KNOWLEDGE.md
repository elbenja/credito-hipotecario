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

#### 2.1 Mortgage Strategy Comparison

To give users more control over their mortgage payment strategy, we’ve added a dedicated comparison tool with four distinct options, each presented in a separate tab. This feature allows users to simulate how changes in extra payments or interest rates affect the overall cost, monthly installment, and total mortgage duration.

Overview
	•	Tab Names:
	1.	Regular – Base mortgage with standard parameters
	2.	Accelerated – Extra payments reduce the term while keeping the installment amount constant
	3.	Lower Payment – Extra payments lower the installment amount while maintaining the original term
	4.	New Rate – Adjusts the interest rate from a specified date
	•	Key Metrics (displayed for each tab):
	•	Sum Interest & Insurances: Total interest plus any insurance costs over the life of the loan
	•	Months: The total number of months until the mortgage is fully paid
	•	Monthly Pay: The resulting monthly installment (which may be reduced or remain constant, depending on the chosen strategy)
	•	Interactive Graph:
	•	A line chart that shows the remaining balance over time
	•	Visual indicators of where extra payments or interest rate changes are applied
	•	Helps users understand how each strategy affects the principal, interest, and overall payment timeline

User Flow
	1.	Select a Tab
Users click on one of the four tabs (Regular, Accelerated, Lower Payment, or New Rate) to explore different strategies.
	2.	Review Summary
At the top of each tab, a concise summary is displayed:
	•	Sum Interest & Insurances
	•	Months
	•	Monthly Pay
	3.	Analyze the Graph
A dynamic chart updates to show how the mortgage balance decreases over time under the selected strategy. For example, large extra payments will create visible “steps” in the amortization curve.
	4.	Adjust Parameters
	•	Accelerated / Lower Payment Tabs:
	•	Add one or more extra installments, specifying the amount, frequency (monthly or one-time), and start date.
	•	The table below the graph lists each extra installment for clarity.
	•	New Rate Tab:
	•	Set a new interest rate, the effective date, and optionally adjust the term.
	•	The chart and summary recalculate to show how this affects total costs and monthly installments.
	5.	Compare Outcomes
Users can switch between tabs to quickly compare how each strategy impacts the total interest, total months, and monthly payments.

Design Details
	•	Tabs
	•	Regular: Base scenario with no extra payments or rate changes.
	•	Accelerated:
	•	Users add extra payments that shorten the total duration.
	•	The monthly installment remains at its original amount.
	•	Lower Payment:
	•	Users add extra payments that lower the monthly installment.
	•	The total duration remains the same as the base term.
	•	New Rate:
	•	Users can specify a new interest rate and the date it becomes effective.
	•	The amortization schedule recalculates from that point forward.
	•	Extra Installment Table
	•	Displays a list of each extra payment, its amount, date, and whether it’s one-time or monthly.
	•	Users can add or remove rows dynamically.
	•	Graphical Representation
	•	The y-axis shows monetary values (remaining balance).
	•	The x-axis shows time in months (or years, depending on the user’s preference).
	•	Each significant change—like an extra payment or interest rate adjustment—creates a noticeable inflection point in the curve.

Example UI Flow 
	1.	Regular Tab
	•	Shows the base monthly payment (e.g., $691.44), total months (360), and total interest & insurance.
	•	A smooth curve illustrating principal decline over 30 years.
	2.	Accelerated Tab
	•	User adds extra installments (e.g., $500 monthly starting Feb 2025, $20,000 once in Mar 2025, etc.).
	•	The summary updates to reflect a shortened mortgage duration (e.g., 324 months instead of 360) while keeping the monthly pay the same.
	•	The graph shows multiple “steps” where the principal drops more sharply.
	3.	Lower Payment Tab
	•	Similar extra installments, but the term remains 360 months.
	•	The monthly payment decreases (e.g., from $691.44 to $550.00).
	•	The graph still shows “steps,” but the endpoint in months remains the same.
	4.	New Rate Tab
	•	Users enter a new interest rate (e.g., 7%), the new mortgage term in years and the date it becomes effective.
	•	Optionally adjust the term if desired.
	•	The summary updates the monthly pay and total interest accordingly, and the graph shows a change in slope after the specified date.

Implementation Notes
	•	Amortization Logic
	•	Each tab uses a variant of the standard amortization calculation, but with extra conditions for additional payments or a changed interest rate.
	•	State Management
	•	React Context or local state can store the mortgage parameters, extra installment data, and interest rate changes.
	•	Each tab triggers recalculations and re-renders the chart and summary.
	•	UI Components
	•	Tabs: Implemented using ShadCN UI’s Tabs component or a custom solution.
	•	Tables: A dynamic table for listing extra installments (editable rows).
	•	Chart: A line chart library (e.g., Recharts, Chart.js, or D3) that updates based on user input.

By providing these four distinct strategies in a tabbed layout, CreditoHipotecar.io gives users a clear, side-by-side comparison of how different mortgage approaches can affect total interest, monthly payments, and overall loan duration.


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