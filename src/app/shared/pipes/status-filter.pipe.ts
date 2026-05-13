import { Pipe, PipeTransform } from '@angular/core';
import { Booking } from '../../models';

@Pipe({ name: 'statusFilter' })
export class StatusFilterPipe implements PipeTransform {
  transform(bookings: Booking[], status: string): number {
    return bookings.filter(b => b.status === status).length;
  }
}
