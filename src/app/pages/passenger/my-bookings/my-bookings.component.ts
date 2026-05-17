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
import { Booking, BookingRequest, FareSummaryResponse, Flight, Passenger, Seat } from '../../../models';

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
        this.bookings = data.filter(booking => this.shouldDisplayBooking(booking));
        this.loading = false;
        this.loadBookingDetails(this.bookings);
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

    const farePayload = this.buildFarePayload(booking);
    forkJoin({
      flight: this.flightService.getFlightById(booking.flightId).pipe(catchError(() => of(null))),
      seats: this.seatService.getSeatMap(booking.flightId).pipe(catchError(() => of([] as Seat[]))),
      passengers: this.passengerService.getPassengersByBooking(booking.bookingId).pipe(catchError(() => of([] as Passenger[]))),
      fareSummary: farePayload
        ? this.bookingService.calculateFare(farePayload).pipe(catchError(() => of(null as FareSummaryResponse | null)))
        : of(null as FareSummaryResponse | null),
    }).subscribe({
      next: ({ flight, seats, passengers, fareSummary }) => {
        const seatIds = this.getSeatIds(booking);
        const bookingSeats = seats.filter(item => seatIds.includes(item.seatId));
        const passenger = passengers[0] || null;

        if (!flight || bookingSeats.length === 0 || !passenger) {
          this.toast.warning('Ticket details are not available for this booking yet.');
          this.downloadingTicketId = null;
          return;
        }

        const pdf = this.buildTicketPdf(
          booking,
          flight,
          bookingSeats,
          passengers,
          this.normalizeFareSummary(fareSummary)
        );
        const url = URL.createObjectURL(pdf);
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
    return this.seatLabels[booking.bookingId] || this.getSeatIds(booking).join(', ');
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
          const seats = seatMap.filter(item => this.getSeatIds(booking).includes(item.seatId));

          nextFlightLabels[booking.bookingId] = flight?.flightNumber || booking.flightId;
          nextSeatLabels[booking.bookingId] = seats.map(seat => seat.seatNumber).filter(Boolean).join(', ')
            || this.getSeatIds(booking).join(', ');
        });

        this.flightLabels = nextFlightLabels;
        this.seatLabels = nextSeatLabels;
      }
    });
  }

  getStatusClass(status: string): string {
    const m: Record<string, string> = {
      PENDING: 'badge-warning', CONFIRMED: 'badge-success',
      CANCELLED: 'badge-danger', COMPLETED: 'badge-info'
    };
    return m[status] || 'badge-default';
  }

  private shouldDisplayBooking(booking: Booking): boolean {
    return booking.status === 'CONFIRMED' || booking.status === 'CANCELLED';
  }

  private getSeatIds(booking: Booking): string[] {
    if (booking.seatIds?.length) return booking.seatIds;
    const fallbackSeatId = String((booking as Booking & { seatId?: string }).seatId || '').trim();
    return fallbackSeatId ? [fallbackSeatId] : [];
  }

  private buildFarePayload(booking: Booking): BookingRequest | null {
    const seatIds = this.getSeatIds(booking);
    if (!booking.flightId || !seatIds.length) return null;

    return {
      userId: booking.userId || this.auth.getUserId(),
      flightId: booking.flightId,
      seatIds,
      tripType: booking.tripType,
      mealPreference: booking.mealPreference,
      luggageKg: booking.luggageKg,
      contactEmail: booking.contactEmail,
      contactPhone: booking.contactPhone,
    };
  }

  private normalizeFareSummary(fareSummary: Partial<FareSummaryResponse> | null): FareSummaryResponse | null {
    if (!fareSummary) return null;

    return {
      seatIds: fareSummary.seatIds || [],
      baseFare: Number(fareSummary.baseFare || 0),
      taxes: Number(fareSummary.taxes || 0),
      baggageCharge: Number(fareSummary.baggageCharge || 0),
      mealCharge: Number(fareSummary.mealCharge || 0),
      totalFare: Number(fareSummary.totalFare || 0),
      totalPassengers: Number(fareSummary.totalPassengers || 0),
    };
  }

  private buildTicketPdf(
    booking: Booking,
    flight: Flight,
    seats: Seat[],
    passengers: Passenger[],
    fareSummary: FareSummaryResponse | null
  ): Blob {
    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 36;
    const contentWidth = pageWidth - margin * 2;
    const routeCode = `${flight.originAirportCode || 'ORG'}-${flight.destinationAirportCode || 'DST'}`;
    const checkedBaggageLabel = `${booking.luggageKg || 0} KG`;
    const cabinBaggageLabel = '7 KG';
    const mealLabel = String(booking.mealPreference || 'STANDARD').replace(/_/g, ' ');
    const bookingDateLabel = this.formatTicketDate(booking.bookedAt, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const bookingTimeLabel = this.formatTicketTime(booking.bookedAt);
    const flightDateLabel = this.formatTicketDate(flight.departureTime, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const departureTimeLabel = this.formatTicketTime(flight.departureTime);
    const arrivalTimeLabel = this.formatTicketTime(flight.arrivalTime);
    const durationLabel = this.getDurationLabel(flight.departureTime, flight.arrivalTime);

    let y = pageHeight - margin;
    const commands: string[] = [
      'q 0.93 0.96 1 rg 0 0 595 842 re f Q',
      'q 1 1 1 rg 0.83 0.90 0.95 RG 1 w 24 24 547 794 re B Q',
    ];

    const addText = (
      x: number,
      baselineY: number,
      text: string,
      size = 12,
      font = 'F1',
      color = '0.09 0.20 0.31'
    ): void => {
      commands.push(`BT /${font} ${size} Tf ${color} rg 1 0 0 1 ${x} ${baselineY} Tm (${this.escapePdfText(text)}) Tj ET`);
    };

    const addCenteredText = (
      x: number,
      baselineY: number,
      width: number,
      text: string,
      size = 12,
      font = 'F1',
      color = '0.09 0.20 0.31'
    ): void => {
      const textWidth = text.length * size * 0.46;
      addText(x + Math.max(0, (width - textWidth) / 2), baselineY, text, size, font, color);
    };

    const addLine = (x1: number, y1: number, x2: number, y2: number, width = 1, color = '0.83 0.90 0.95'): void => {
      commands.push(`q ${color} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S Q`);
    };

    const addRect = (x: number, rectY: number, width: number, height: number, fill: string, stroke?: string): void => {
      const strokePart = stroke ? `${stroke} RG ` : '';
      const operator = stroke ? 'B' : 'f';
      commands.push(`q ${fill} rg ${strokePart}${x} ${rectY} ${width} ${height} re ${operator} Q`);
    };

    y -= 8;
    addText(margin, y, 'SkyBooker', 24, 'F2', '0.09 0.45 0.83');
    addText(margin, y - 18, 'E-Ticket Itinerary', 11, 'F1', '0.36 0.45 0.55');
    addRect(pageWidth - 195, y - 8, 159, 28, '0.93 0.98 0.94', '0.74 0.89 0.76');
    addText(pageWidth - 182, y + 2, 'Booking Confirmed', 15, 'F2', '0.19 0.56 0.25');
    addText(pageWidth - 195, y - 24, `Booking Date: ${bookingDateLabel}`, 10, 'F1', '0.42 0.51 0.62');
    addText(pageWidth - 86, y - 24, `Time: ${bookingTimeLabel}`, 10, 'F1', '0.42 0.51 0.62');
    y -= 44;
    addLine(margin, y, pageWidth - margin, y);

    y -= 28;
    addText(margin, y, `Dear Passenger, your flight booking for ${routeCode} is confirmed.`, 12, 'F1');
    y -= 18;
    addText(margin, y, `Flight ${flight.flightNumber || booking.flightId}`, 11, 'F2', '0.19 0.29 0.38');
    addText(margin + 130, y, `Booking ID ${booking.bookingId}`, 11, 'F1', '0.45 0.53 0.63');

    y -= 28;
    addRect(margin, y - 76, contentWidth, 76, '0.98 0.99 1', '0.86 0.91 0.95');
    addText(margin + 22, y - 18, flight.originAirportCode || 'ORG', 28, 'F2', '0.08 0.50 0.86');
    addText(margin + 22, y - 40, departureTimeLabel, 16, 'F2');
    addText(margin + 22, y - 58, flightDateLabel, 10, 'F1', '0.36 0.45 0.55');
    addCenteredText(margin + 175, y - 22, 140, durationLabel, 11, 'F1', '0.31 0.41 0.52');
    addLine(margin + 192, y - 40, margin + 302, y - 40, 1, '0.62 0.77 0.87');
    addText(margin + 308, y - 44, '>', 14, 'F2', '0.43 0.53 0.64');
    addText(pageWidth - margin - 95, y - 18, flight.destinationAirportCode || 'DST', 28, 'F2', '0.08 0.50 0.86');
    addText(pageWidth - margin - 78, y - 40, arrivalTimeLabel, 16, 'F2');
    addText(pageWidth - margin - 95, y - 58, flightDateLabel, 10, 'F1', '0.36 0.45 0.55');

    y -= 98;
    addRect(margin, y - 22, contentWidth, 22, '0.87 0.95 1', '0.77 0.88 0.96');
    addText(margin + 10, y - 15, `Passengers - ${passengers.length} Adult${passengers.length > 1 ? 's' : ''}`, 14, 'F2', '0.09 0.45 0.83');
    y -= 22;

    const headers = [
      { label: 'Passenger', width: 110 },
      { label: 'Airline', width: 72 },
      { label: 'Status', width: 62 },
      { label: 'Sector', width: 78 },
      { label: 'Airline PNR', width: 90 },
      { label: 'Ticket Number', width: 90 },
      { label: 'Seat No', width: 57 },
    ];

    let x = margin;
    headers.forEach(header => {
      addRect(x, y - 20, header.width, 20, '0.93 0.97 1', '0.85 0.91 0.95');
      addText(x + 4, y - 14, header.label, 9, 'F2', '0.16 0.30 0.45');
      x += header.width;
    });
    y -= 20;

    passengers.forEach((passenger, index) => {
      const row = [
        `${passenger.firstName} ${passenger.lastName}`,
        flight.flightNumber || booking.flightId,
        'Confirmed',
        routeCode,
        booking.pnrCode,
        passenger.ticketNumber || '--',
        this.getSeatNumberForPassenger(passenger, seats, index),
      ];

      let colX = margin;
      row.forEach((cell, cellIndex) => {
        const cellWidth = headers[cellIndex].width;
        addRect(colX, y - 20, cellWidth, 20, '1 1 1', '0.85 0.91 0.95');
        addText(colX + 4, y - 14, cell, 8.5, 'F1', '0.15 0.25 0.36');
        colX += cellWidth;
      });
      y -= 20;
    });

    y -= 26;
    addRect(margin, y - 22, contentWidth, 22, '0.87 0.95 1', '0.77 0.88 0.96');
    addText(margin + 10, y - 15, 'Fare Details', 14, 'F2', '0.09 0.45 0.83');
    addText(pageWidth - margin - 84, y - 15, 'Amount (INR)', 12, 'F2', '0.09 0.45 0.83');
    y -= 28;

    const fareRows = [
      ['Total Basic Fare', this.formatCurrency(booking.baseFare)],
      ['Taxes & Fees', this.formatCurrency(booking.taxes)],
      ['Baggage Charges', fareSummary ? this.formatCurrency(fareSummary.baggageCharge) : '--'],
      ['Meal Charges', fareSummary ? this.formatCurrency(fareSummary.mealCharge) : '--'],
      ['Meal Preference', mealLabel],
      ['Total Amount', this.formatCurrency(booking.totalFare)],
    ];

    fareRows.forEach(([label, value], index) => {
      const isTotal = index === fareRows.length - 1;
      addLine(margin, y - 4, pageWidth - margin, y - 4, 0.8, '0.86 0.91 0.95');
      addText(margin + 8, y - 18, label, isTotal ? 12 : 10.5, isTotal ? 'F2' : 'F1', isTotal ? '0.09 0.45 0.83' : '0.19 0.29 0.38');
      addText(pageWidth - margin - 90, y - 18, value, isTotal ? 12 : 10.5, isTotal ? 'F2' : 'F1', isTotal ? '0.09 0.45 0.83' : '0.19 0.29 0.38');
      y -= 24;
    });

    y -= 12;
    addLine(margin, y, pageWidth - margin, y);
    y -= 18;
    const footerLines = this.wrapText(
      `Please carry a valid government ID at the airport and report at least 2 hours before departure for a smooth boarding experience. Checked baggage allowance is ${checkedBaggageLabel} and cabin baggage allowance is ${cabinBaggageLabel}. Excess baggage may attract additional airline charges, and cabin bags should keep valuables, medicines, and travel documents easily accessible.`,
      100
    );
    footerLines.forEach((line, index) => addText(margin, y - (index * 14), line, 9, 'F1', '0.36 0.45 0.55'));

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

  private getSeatNumberForPassenger(passenger: Passenger, seats: Seat[], index: number): string {
    const matchingSeat = seats.find(seat => seat.seatId === passenger.seatId);
    return matchingSeat?.seatNumber || seats[index]?.seatNumber || passenger.seatId || '--';
  }

  private formatTicketDate(value?: string, options?: Intl.DateTimeFormatOptions): string {
    if (!value) return '--';
    return new Intl.DateTimeFormat('en-IN', options || {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }

  private formatTicketTime(value?: string): string {
    if (!value) return '--';
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(value));
  }

  private getDurationLabel(departureTime?: string, arrivalTime?: string): string {
    if (!departureTime || !arrivalTime) return '--';
    const durationMinutes = Math.max(0, Math.round((new Date(arrivalTime).getTime() - new Date(departureTime).getTime()) / 60000));
    return `${String(Math.floor(durationMinutes / 60)).padStart(2, '0')}h ${String(durationMinutes % 60).padStart(2, '0')}m`;
  }

  private formatCurrency(amount: number | undefined): string {
    return `INR ${Number(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  private wrapText(value: string, maxLength: number): string[] {
    const words = String(value || '').split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';

    words.forEach(word => {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > maxLength && current) {
        lines.push(current);
        current = word;
        return;
      }
      current = candidate;
    });

    if (current) lines.push(current);
    return lines;
  }

  private escapePdfText(value: string): string {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[^\x20-\x7E]/g, ' ')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }
}
