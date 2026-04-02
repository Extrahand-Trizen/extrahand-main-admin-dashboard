# ExtraHand Main Admin Dashboard

A comprehensive admin dashboard for managing the ExtraHand platform, built with Next.js 15, TypeScript, and Tailwind CSS.

## Features

- **User Management**: View, search, filter, ban, suspend, and manage platform users
- **Task Management**: Monitor tasks, applications, and task statuses
- **Support Management**: Handle support tickets and manage knowledge base articles
- **Role-Based Access Control**: Permission-based UI and feature access
- **Responsive Design**: Mobile-first design that works on all screen sizes
- **Real-time Updates**: React Query for efficient data fetching and caching
- **Error Handling**: Comprehensive error boundaries and user-friendly error states
- **Session Management**: Automatic token refresh and session timeout warnings

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom ExtraHand theme
- **UI Components**: shadcn/ui
- **Data Fetching**: React Query (TanStack Query)
- **Authentication**: JWT with automatic refresh
- **Notifications**: Sonner
- **Font**: Inter

## Prerequisites

- Node.js 20+ 
- npm or yarn
- Access to the ExtraHand Main Admin Service backend

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=https://extrahand-main-admin-service.apps.extrahand.in
```

For local development:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
web-apps/extrahand-main-admin-dashboard/
├── app/
│   ├── (dashboard)/          # Dashboard pages (protected)
│   │   ├── page.tsx         # Dashboard overview
│   │   ├── users/           # User management
│   │   ├── tasks/           # Task management
│   │   └── support/         # Support tickets & articles
│   ├── login/               # Login page
│   ├── layout.tsx           # Root layout
│   └── providers.tsx        # React Query provider
├── components/
│   ├── layout/              # Sidebar, Header
│   ├── ui/                  # shadcn/ui components
│   ├── ErrorBoundary.tsx    # Error boundary component
│   └── LoadingSkeleton.tsx # Loading skeleton components
├── lib/
│   ├── api/                 # API client functions
│   ├── hooks/               # Custom React hooks
│   └── utils.ts              # Utility functions
├── types/                   # TypeScript type definitions
└── public/                   # Static assets (logo, etc.)
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

### Docker Deployment (CapRover)

1. Ensure `Dockerfile` and `captain-definition` are in the root directory
2. Update `captain-definition` with your API URL
3. Deploy via CapRover dashboard or CLI

### Environment Variables for Production

Set the following in your deployment platform:
- `NEXT_PUBLIC_API_URL` - Backend API URL

## Permissions

The dashboard uses a permission-based access control system. Permissions are checked at both the UI and API levels:

- `user.list`, `user.view`, `user.edit`, `user.ban`, `user.suspend`
- `task.list`, `task.view`, `task.edit`, `task.delete`
- `support.ticket.list`, `support.ticket.view`, `support.ticket.update`
- `content.list`, `content.create`, `content.update`, `content.delete`
- `analytics.view`

Super Admins have access to all features regardless of permissions.

## Authentication

- Login with email and password
- JWT tokens stored in localStorage
- Automatic token refresh on 401 errors
- Session timeout warnings after 30 minutes of inactivity
- Hard cap of 8 hours for session duration

## UI/UX Features

- **ExtraHand Theme**: Amber/yellow color scheme matching brand
- **Inter Font**: Clean, modern typography
- **Responsive Design**: Mobile-first approach with breakpoints
- **Loading States**: Skeleton loaders for better UX
- **Error States**: User-friendly error messages and recovery options
- **Toast Notifications**: Non-intrusive feedback for user actions

## Development Guidelines

1. **Components**: Use shadcn/ui components when possible
2. **Styling**: Use Tailwind CSS utility classes
3. **Data Fetching**: Use React Query for all API calls
4. **Permissions**: Always check permissions before rendering UI
5. **Error Handling**: Use ErrorBoundary for component-level errors
6. **TypeScript**: Maintain strict type safety

## Troubleshooting

### Build Errors

- Ensure all environment variables are set
- Clear `.next` folder and rebuild: `rm -rf .next && npm run build`

### API Connection Issues

- Verify `NEXT_PUBLIC_API_URL` is correct
- Check CORS settings on backend
- Verify authentication tokens are valid

### Permission Issues

- Ensure user has correct role and permissions
- Check backend permission configuration
- Verify JWT token includes permission claims

## License

Proprietary - ExtraHand Platform

## Support

For issues or questions, contact the development team.
