import { Component, OnInit } from '@angular/core';
import { BookingService } from '../../../core/services/booking.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FlightService } from '../../../core/services/flight.service';
import { PassengerService } from '../../../core/services/passenger.service';
import { SeatService } from '../../../core/services/seat.service';
import { Booking, Flight, Passenger, Seat } from '../../../models';

@Component({
  selector: 'app-my-bookings',
  templateUrl: './my-bookings.component.html',
  styleUrls: ['./my-bookings.component.css']
})
export class MyBookingsComponent implements OnInit {
  bookings: Booking[] = [];
  flightLabels: Record<string, string> = {};
  seatLabels: Record<string, string> = {};
  loading = true;
  cancellingId: string | null = null;
  downloadingTicketId: string | null = null;
  cancelTarget: Booking | null = null;

  constructor(
    private bookingService: BookingService,
    private flightService: FlightService,
    private seatService: SeatService,
    private passengerService: PassengerService,
    public auth: AuthService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void { this.loadBookings(); }

  loadBookings(): void {
    this.bookingService.getBookingsByUser(this.auth.getUserId()).subscribe({
      next: data => {
        this.bookings = data;
        this.loading = false;
        this.loadBookingDetails(data);
      },
      error: () => { this.loading = false; }
    });
  }

  openCancelConfirm(booking: Booking): void {
    this.cancelTarget = booking;
  }

  closeCancelConfirm(): void {
    if (this.cancellingId) return;
    this.cancelTarget = null;
  }

  confirmCancelBooking(): void {
    if (!this.cancelTarget) return;

    const bookingId = this.cancelTarget.bookingId;
    this.cancellingId = bookingId;
    this.bookingService.cancelBooking(bookingId).subscribe({
      next: () => {
        this.toast.success('Booking cancelled.');
        this.loadBookings();
        this.cancellingId = null;
        this.cancelTarget = null;
      },
      error: () => { this.cancellingId = null; }
    });
  }

  goToPayment(b: Booking): void {
    this.router.navigate(['/passenger/payment', b.bookingId], {
      state: { booking: b }
    });
  }

  downloadTicket(booking: Booking): void {
    this.downloadingTicketId = booking.bookingId;

    forkJoin({
      flight: this.flightService.getFlightById(booking.flightId).pipe(catchError(() => of(null))),
      seats: this.seatService.getSeatMap(booking.flightId).pipe(catchError(() => of([] as Seat[]))),
      passengers: this.passengerService.getPassengersByBooking(booking.bookingId).pipe(catchError(() => of([] as Passenger[]))),
    }).subscribe({
      next: ({ flight, seats, passengers }) => {
        const seat = seats.find(item => item.seatId === booking.seatId) || null;
        const passenger = passengers[0] || null;

        if (!flight || !seat || !passenger) {
          this.toast.warning('Ticket details are not available for this booking yet.');
          this.downloadingTicketId = null;
          return;
        }

        const blob = this.buildTicketPdf(booking, flight, seat, passenger);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `SkyBooker-${booking.pnrCode}.pdf`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.toast.success(`Ticket ${passenger.ticketNumber} downloaded.`);
        this.downloadingTicketId = null;
      },
      error: () => {
        this.toast.error('We could not generate this ticket right now.');
        this.downloadingTicketId = null;
      }
    });
  }

  getFlightLabel(booking: Booking): string {
    return this.flightLabels[booking.bookingId] || booking.flightId;
  }

  getSeatLabel(booking: Booking): string {
    return this.seatLabels[booking.bookingId] || booking.seatId;
  }

  private loadBookingDetails(bookings: Booking[]): void {
    if (!bookings.length) {
      this.flightLabels = {};
      this.seatLabels = {};
      return;
    }

    const uniqueFlightIds = [...new Set(bookings.map(booking => booking.flightId))];
    const flightRequests = uniqueFlightIds.reduce((acc, flightId) => {
      acc[flightId] = this.flightService.getFlightById(flightId).pipe(catchError(() => of(null)));
      return acc;
    }, {} as Record<string, Observable<Flight | null>>);

    const seatRequests = uniqueFlightIds.reduce((acc, flightId) => {
      acc[flightId] = this.seatService.getSeatMap(flightId).pipe(catchError(() => of([] as Seat[])));
      return acc;
    }, {} as Record<string, Observable<Seat[]>>);

    forkJoin({
      flights: forkJoin(flightRequests),
      seatMaps: forkJoin(seatRequests),
    }).subscribe({
      next: ({ flights, seatMaps }) => {
        const nextFlightLabels: Record<string, string> = {};
        const nextSeatLabels: Record<string, string> = {};

        bookings.forEach(booking => {
          const flight = flights[booking.flightId] as Flight | null;
          const seatMap = (seatMaps[booking.flightId] as Seat[]) || [];
          const seat = seatMap.find(item => item.seatId === booking.seatId) || null;

          nextFlightLabels[booking.bookingId] = flight?.flightNumber || booking.flightId;
          nextSeatLabels[booking.bookingId] = seat?.seatNumber || booking.seatId;
        });

        this.flightLabels = nextFlightLabels;
        this.seatLabels = nextSeatLabels;
      }
    });
  }

  private buildTicketPdf(booking: Booking, flight: Flight, seat: Seat, passenger: Passenger): Blob {
    const pageWidth = 842;
    const pageHeight = 595;
    const ticketX = 42;
    const ticketY = 118;
    const ticketWidth = 758;
    const ticketHeight = 322;
    const stubX = 606;
    const headerY = 366;
    const headerHeight = 74;
    const labelSize = 11;
    const valueSize = 16;

    const formatDate = (value?: string, options?: Intl.DateTimeFormatOptions): string => {
      if (!value) return '--';
      return new Intl.DateTimeFormat('en-IN', options || { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
    };

    const formatTime = (value?: string): string => {
      if (!value) return '--';
      return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
    };

    const sanitize = (value: string): string =>
      value
        .normalize('NFKD')
        .replace(/[^\x20-\x7E]/g, ' ')
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');

    const drawText = (
      x: number,
      y: number,
      text: string,
      size = 12,
      font = 'F1',
      color = '0.07 0.15 0.25'
    ): string => `BT /${font} ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm (${sanitize(text)}) Tj ET`;

    const drawCenteredText = (
      x: number,
      y: number,
      width: number,
      text: string,
      size = 12,
      font = 'F1',
      color = '1 1 1'
    ): string => {
      const approxWidth = text.length * size * 0.48;
      const startX = x + (width - approxWidth) / 2;
      return drawText(startX, y, text, size, font, color);
    };

    const drawBarcode = (x: number, y: number, height: number, width: number): string => {
      const bars = [2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 4, 1, 3, 2, 1, 2, 3, 4, 1, 3, 1, 2, 4];
      let cursor = x;
      const scale = width / bars.reduce((sum, bar) => sum + bar + 1, 0);
      const commands = ['q 0.06 0.09 0.16 rg'];

      bars.forEach(bar => {
        const barWidth = Math.max(1, bar * scale);
        commands.push(`${cursor.toFixed(2)} ${y.toFixed(2)} ${barWidth.toFixed(2)} ${height.toFixed(2)} re f`);
        cursor += barWidth + scale;
      });

      commands.push('Q');
      return commands.join('\n');
    };

    const departureDate = formatDate(flight.departureTime, { day: '2-digit', month: 'short' });
    const boardingTime = formatTime(flight.departureTime);
    const passengerName = `${passenger.firstName} ${passenger.lastName}`;
    const stubName = `${passenger.firstName} / ${passenger.lastName}`;

    const commands = [
      'q 0.95 0.97 1 rg 0 0 842 595 re f Q',
      'q 1 1 1 rg 0.88 0.92 0.97 RG 1.1 w 42 118 758 322 re B Q',
      'q 0.19 0.57 0.94 rg 42 366 758 74 re f Q',
      'q [3 8] 0 d 0.84 0.88 0.94 RG 606 118 m 606 440 l S Q',
      drawText(224, 401, 'X', 26, 'F2', '1 1 1'),
      drawText(562, 401, 'X', 26, 'F2', '1 1 1'),
      drawCenteredText(250, 401, 280, 'SKYBOOKER AIRLINES', 18, 'F2', '1 1 1'),
      drawCenteredText(616, 401, 154, 'BOARDING PASS', 17, 'F2', '1 1 1'),
      drawBarcode(62, 150, 170, 44),
      drawText(122, 336, 'PASSENGER', labelSize, 'F2', '0.34 0.47 0.65'),
      drawText(244, 336, passengerName, valueSize, 'F2'),
      drawText(122, 290, 'FROM', labelSize, 'F2', '0.34 0.47 0.65'),
      drawText(244, 290, flight.originAirportCode, valueSize, 'F2'),
      drawText(122, 244, 'DATE', labelSize, 'F2', '0.34 0.47 0.65'),
      drawText(244, 244, departureDate, valueSize, 'F2'),
      drawText(448, 336, 'FLIGHT', labelSize, 'F2', '0.34 0.47 0.65'),
      drawText(536, 336, flight.flightNumber, valueSize, 'F2'),
      drawText(448, 290, 'TO', labelSize, 'F2', '0.34 0.47 0.65'),
      drawText(536, 290, flight.destinationAirportCode, valueSize, 'F2'),
      drawText(448, 244, 'BOARDING', labelSize, 'F2', '0.34 0.47 0.65'),
      drawText(448, 220, 'TIME', labelSize, 'F2', '0.34 0.47 0.65'),
      drawText(536, 232, boardingTime, valueSize, 'F2'),
      drawText(122, 156, 'SEAT', 12, 'F2', '0.34 0.47 0.65'),
      drawText(122, 122, seat.seatNumber, 28, 'F2'),
      drawText(362, 156, 'PNR', 12, 'F2', '0.34 0.47 0.65'),
      drawText(362, 122, booking.pnrCode, 28, 'F2'),
      drawText(530, 156, 'FARE', 12, 'F2', '0.34 0.47 0.65'),
      drawText(530, 122, `INR ${booking.totalFare.toFixed(2)}`, 26, 'F2'),
      drawText(122, 70, 'PLEASE ARRIVE AT THE GATE AT LEAST 20 MINUTES BEFORE DEPARTURE.', 10, 'F2', '0.27 0.39 0.56'),
      drawText(628, 356, 'BOARDING PASS', 16, 'F2', '0.22 0.34 0.5'),
      drawText(628, 304, 'NAME', 10, 'F2', '0.34 0.47 0.65'),
      drawText(708, 304, stubName, 13, 'F2'),
      drawText(628, 266, 'FROM', 10, 'F2', '0.34 0.47 0.65'),
      drawText(708, 266, flight.originAirportCode, 13, 'F2'),
      drawText(628, 228, 'TO', 10, 'F2', '0.34 0.47 0.65'),
      drawText(708, 228, flight.destinationAirportCode, 13, 'F2'),
      drawText(628, 190, 'FLIGHT', 10, 'F2', '0.34 0.47 0.65'),
      drawText(708, 190, flight.flightNumber, 13, 'F2'),
      drawText(628, 152, 'DATE', 10, 'F2', '0.34 0.47 0.65'),
      drawText(708, 152, departureDate, 13, 'F2'),
      drawText(628, 114, 'SEAT', 10, 'F2', '0.34 0.47 0.65'),
      drawText(708, 114, seat.seatNumber, 13, 'F2'),
      drawBarcode(628, 36, 52, 145),
    ];

    const stream = commands.join('\n');
    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
      `3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>
endobj`,
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj',
      `6 0 obj
<< /Length ${stream.length} >>
stream
${stream}
endstream
endobj`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach(object => {
      offsets.push(pdf.length);
      pdf += `${object}\n`;
    });

    const xrefOffset = pdf.length;
    pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f 
`;

    offsets.slice(1).forEach(offset => {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });

    pdf += `trailer
<< /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${xrefOffset}
%%EOF`;

    return new Blob([pdf], { type: 'application/pdf' });
  }

  getStatusClass(status: string): string {
    const m: Record<string, string> = {
      PENDING: 'badge-warning', CONFIRMED: 'badge-success',
      CANCELLED: 'badge-danger', COMPLETED: 'badge-info'
    };
    return m[status] || 'badge-default';
  }
}
