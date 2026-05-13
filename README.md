# ✈ SkyBooker – Angular Frontend

> **Search. Book. Fly. Effortlessly.**
> A complete Angular 17 frontend for the SkyBooker Airline Ticket Booking System.

---

## 📁 Project Structure

```
src/app/
├── core/
│   ├── guards/
│   │   └── auth.guard.ts          ← AuthGuard, RoleGuard, GuestGuard
│   ├── interceptors/
│   │   └── jwt.interceptor.ts     ← Attaches Bearer token + global error handling
│   └── services/
│       ├── auth.service.ts        ← Login, register, JWT storage, role helpers
│       ├── flight.service.ts      ← Flight search, CRUD, status update
│       ├── seat.service.ts        ← Seat map, hold, create, bulk create
│       ├── booking.service.ts     ← Create, get, cancel, confirm bookings
│       ├── passenger.service.ts   ← Create passenger, get manifest
│       ├── payment.service.ts     ← Initiate, process, revenue report
│       ├── notification.service.ts← Fetch, mark-read, unread count
│       ├── airline-airport.service.ts ← Airlines & airports CRUD
│       └── toast.service.ts       ← Global toast notifications
│
├── shared/
│   ├── components/
│   │   ├── navbar/                ← Responsive navbar with role-aware links
│   │   ├── footer/                ← Simple footer
│   │   ├── loading-spinner/       ← Reusable spinner with message
│   │   └── toast/                 ← Slide-in toast notifications
│   └── pipes/
│       └── status-filter.pipe.ts  ← Count bookings by status
│
├── models/
│   └── index.ts                   ← All TypeScript interfaces & types
│
├── pages/
│   ├── home/                      ← Landing page with hero & flight search
│   ├── auth/
│   │   ├── login/                 ← Email + password login
│   │   └── register/              ← Full registration form
│   ├── passenger/
│   │   ├── dashboard/             ← Stats, recent bookings, notifications
│   │   ├── flight-search/         ← Search & browse flights
│   │   ├── flight-details/        ← Full flight info card
│   │   ├── seat-map/              ← Interactive seat grid
│   │   ├── booking/               ← Create booking + fare summary
│   │   ├── passenger-details/     ← Add traveller info, get ticket
│   │   ├── payment/               ← Payment method + process flow
│   │   ├── my-bookings/           ← All bookings with cancel action
│   │   ├── retrieve-booking/      ← Public PNR lookup
│   │   └── notifications/        ← Notification list with mark-read
│   ├── staff/
│   │   ├── dashboard/             ← Flight stats & quick actions
│   │   ├── add-flight/            ← Create new flight form
│   │   ├── manage-flights/        ← Table with inline status update
│   │   ├── manage-seats/          ← Single & bulk seat creation
│   │   └── passenger-manifest/   ← Lookup passengers by booking ID
│   └── admin/
│       ├── dashboard/             ← Platform overview stats
│       ├── manage-airlines/       ← CRUD airlines, deactivate
│       ├── manage-airports/       ← CRUD airports with live search
│       └── payments-admin/        ← Filter payments, revenue report
│
├── app.module.ts                  ← All declarations, imports, providers
├── app-routing.module.ts          ← All routes with role guards
└── app.component.ts               ← Root shell (navbar + outlet + footer + toast)
```

---

## 🚀 Setup Instructions

### Prerequisites
- **Node.js** v18+ ([nodejs.org](https://nodejs.org))
- **Angular CLI** v17+
- **Spring Boot backend** running on `http://localhost:8080`

### Step 1 – Install Angular CLI globally
```bash
npm install -g @angular/cli@17
```

### Step 2 – Create the Angular project
```bash
ng new skybooker --routing --style=css --skip-git
cd skybooker
```

### Step 3 – Replace generated files with provided source
Copy all files from this project into the `skybooker/` directory, preserving the folder structure shown above.

**Key files to place:**
```
src/styles.css                → global design system
src/index.html                → meta, title
src/main.ts                   → bootstrap
src/environments/environment.ts → API base URL
src/app/app.module.ts
src/app/app-routing.module.ts
src/app/app.component.ts
src/app/core/**
src/app/shared/**
src/app/models/index.ts
src/app/pages/**
```

### Step 4 – Install dependencies
```bash
npm install
```

### Step 5 – Start the development server
```bash
ng serve
```

Open → [http://localhost:4200](http://localhost:4200)

---

## ⚙️ Environment Configuration

Edit `src/environments/environment.ts` to change the API Gateway URL:

```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080'   // ← your Spring Boot gateway
};
```

---

## 🔐 Authentication Flow

1. **Register** at `/register` with role: `PASSENGER`, `AIRLINE_STAFF`, or `ADMIN`
2. **Login** at `/login` — JWT token is stored in `localStorage`
3. **JWT Interceptor** automatically attaches `Authorization: Bearer <token>` to every protected request
4. **Role Guards** redirect users to their appropriate dashboard:
   - `PASSENGER` → `/passenger/dashboard`
   - `AIRLINE_STAFF` → `/staff/dashboard`
   - `ADMIN` → `/admin/dashboard`

---

## 🧭 All Routes

| Path | Component | Access |
|------|-----------|--------|
| `/` | HomeComponent | Public |
| `/login` | LoginComponent | Public |
| `/register` | RegisterComponent | Public |
| `/retrieve-booking` | RetrieveBookingComponent | Public |
| `/passenger/dashboard` | PassengerDashboardComponent | PASSENGER |
| `/passenger/flights` | FlightSearchComponent | PASSENGER |
| `/passenger/flight/:id` | FlightDetailsComponent | PASSENGER |
| `/passenger/seats/:flightId` | SeatMapComponent | PASSENGER |
| `/passenger/booking` | BookingComponent | PASSENGER |
| `/passenger/passenger-details` | PassengerDetailsComponent | PASSENGER |
| `/passenger/payment` | PaymentComponent | PASSENGER |
| `/passenger/my-bookings` | MyBookingsComponent | PASSENGER |
| `/passenger/notifications` | NotificationsComponent | PASSENGER |
| `/staff/dashboard` | StaffDashboardComponent | AIRLINE_STAFF |
| `/staff/add-flight` | AddFlightComponent | AIRLINE_STAFF |
| `/staff/flights` | ManageFlightsComponent | AIRLINE_STAFF |
| `/staff/seats` | ManageSeatsComponent | AIRLINE_STAFF |
| `/staff/manifest` | PassengerManifestComponent | AIRLINE_STAFF |
| `/admin/dashboard` | AdminDashboardComponent | ADMIN |
| `/admin/airlines` | ManageAirlinesComponent | ADMIN |
| `/admin/airports` | ManageAirportsComponent | ADMIN |
| `/admin/payments` | PaymentsAdminComponent | ADMIN |

---

## 🧪 End-to-End Testing Walkthrough

### ✅ Test 1 – Register & Login

**Passenger flow:**
1. Go to `/register`
2. Fill: fullName, email, password (min 6), phone, role = `PASSENGER`, passportNumber, nationality
3. Submit → redirected to `/login`
4. Login → redirected to `/passenger/dashboard`

**Staff flow:**
1. Register with role = `AIRLINE_STAFF`
2. Login → redirected to `/staff/dashboard`

**Admin flow:**
1. Register with role = `ADMIN` (or create via DB seeding)
2. Login → redirected to `/admin/dashboard`

---

### ✅ Test 2 – Full Passenger Booking Journey

```
Search Flights → Select Flight → View Seat Map → Create Booking
→ Add Passenger Details → Pay → View in My Bookings
```

**Step-by-step:**

1. **Search Flights** at `/passenger/flights`
   - Enter: origin = `DEL`, destination = `BOM`, date = tomorrow
   - Click **Search** → results list appears

2. **Select Flight** → click any result card
   - Redirected to `/passenger/flight/:id`
   - See flight details: route, times, price, status

3. **View Seat Map** → click "View Seat Map"
   - Redirected to `/passenger/seats/:flightId`
   - Green seats = AVAILABLE, click one to select
   - See seat details panel, click **Continue to Booking**

4. **Create Booking** at `/passenger/booking?flightId=X&seatId=Y`
   - Fill: trip type, meal preference, luggage (0–50 kg), contact email & phone
   - See fare summary (base + 18% taxes)
   - Click **Confirm Booking**
   - **Success:** PNR code displayed, status = PENDING

5. **Add Passenger Details** → click "Add Passenger Details"
   - Fill: first/last name, DOB, gender, passport, nationality
   - Submit → **ticket number generated**

6. **Payment** → click "Proceed to Payment"
   - Select method: CARD / UPI / NET_BANKING / WALLET
   - Click **Initiate Payment** → transaction ID shown
   - Click **Pay ₹XXXX** (success) or **Fail** (to test failure)
   - **Success:** booking status updated to CONFIRMED

7. **My Bookings** at `/passenger/my-bookings`
   - See booking card with PNR, status badge, fare
   - PENDING bookings show "Pay Now" and "Cancel" buttons

---

### ✅ Test 3 – Staff Workflow

1. Login as AIRLINE_STAFF → `/staff/dashboard`

2. **Add Flight** at `/staff/add-flight`
   - Fill all fields: flightNumber, airlineId, origin/destination (3-letter IATA), departure/arrival (datetime-local), aircraft type, totalSeats, basePrice
   - Submit → redirected to `/staff/flights`

3. **Manage Flights** at `/staff/flights`
   - Table of all flights
   - Change status via dropdown: `ON_TIME | DELAYED | CANCELLED | DEPARTED | ARRIVED`

4. **Manage Seats** at `/staff/seats`
   - **Bulk tab:** Enter flightId, class, row range (e.g., 1–30), click column letters (A–F), set multiplier → Create
   - **Single tab:** Enter flightId + specific seat number like "12A"

5. **Passenger Manifest** at `/staff/manifest`
   - Enter booking ID → see all passengers table with ticket numbers

---

### ✅ Test 4 – Admin Workflow

1. Login as ADMIN → `/admin/dashboard`

2. **Manage Airlines** at `/admin/airlines`
   - Add: name = "Air India", iataCode = "AI", country = "India"
   - Edit existing airline
   - Deactivate (click Deactivate button)

3. **Manage Airports** at `/admin/airports`
   - Add: name, IATA code (3 letters), city, country
   - Live search via keyword input
   - Edit existing airport

4. **Payments** at `/admin/payments`
   - Filter by status: PENDING / SUCCESS / FAILED / REFUNDED
   - Revenue Report: set start & end datetime → get total revenue + transaction count

---

### ✅ Test 5 – Public PNR Lookup (No Login Needed)

1. Go to `/retrieve-booking`
2. Enter any valid PNR code (from a previous booking)
3. See booking details: flight, seat, status, fare, contact

---

### ✅ Test 6 – Notifications

1. Login as PASSENGER
2. Go to `/passenger/notifications`
3. Unread notifications shown with blue left border + dot
4. Click any notification → marked as read (border disappears)
5. "Mark all as read" button clears all at once
6. Navbar shows unread count badge

---

## 🛡️ CORS Configuration (Backend Note)

Your Spring Boot services must allow requests from `http://localhost:4200`.

Add to your API Gateway or each service:
```java
@CrossOrigin(origins = "http://localhost:4200")
```

Or globally in a `WebMvcConfigurer`:
```java
@Bean
public WebMvcConfigurer corsConfigurer() {
    return new WebMvcConfigurer() {
        @Override
        public void addCorsMappings(CorsRegistry registry) {
            registry.addMapping("/**")
                    .allowedOrigins("http://localhost:4200")
                    .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                    .allowedHeaders("*")
                    .allowCredentials(true);
        }
    };
}
```

---

## 🎨 Design System

| Token | Value | Usage |
|-------|-------|-------|
| `--navy-900` | `#070c1a` | Page background |
| `--navy-800` | `#0d1630` | Card background |
| `--navy-700` | `#132047` | Input background |
| `--cyan-400` | `#22d3ee` | Primary accent, prices |
| `--cyan-500` | `#06b6d4` | Buttons, focus rings |
| `--success` | `#10b981` | Available seats, confirmed |
| `--warning` | `#f59e0b` | Held seats, pending |
| `--danger` | `#ef4444` | Taken seats, cancelled |

**Fonts:**
- **Sora** – headings, airport codes, prices, branding
- **DM Sans** – body text, forms, navigation

---

## 🔧 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| CORS error in browser console | Add CORS config to Spring Boot (see above) |
| 401 Unauthorized on all requests | Check JWT is stored in localStorage after login |
| `titlecase` pipe not working | Ensure `CommonModule` is imported in AppModule |
| Route guard redirect loops | Verify `role` is stored exactly as `PASSENGER`, `AIRLINE_STAFF`, `ADMIN` |
| Seats not loading | Confirm the flight has seats via `POST /seats/bulk` in staff panel |
| Payment booking not confirming | Backend calls `PUT /bookings/{id}/confirm` after successful payment |

---

## 📦 Build for Production

```bash
ng build --configuration production
```

Output: `dist/skybooker/` — serve with nginx or any static host.

---

*Built with Angular 17 · TypeScript · Core CSS · No third-party UI libraries*
