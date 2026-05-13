import { Component } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  year = new Date().getFullYear();

  constructor(public auth: AuthService) {}

  get dashboardRoute(): string {
    if (this.auth.isPassenger()) return '/passenger/dashboard';
    if (this.auth.isStaff()) return '/staff/dashboard';
    if (this.auth.isAdmin()) return '/admin/dashboard';
    return '/';
  }

  logout(event: Event): void {
    event.preventDefault();
    this.auth.logout();
  }
}
